import * as THREE from 'three';
import { VisualEffect } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';
import { getRemotionEnvironment } from 'remotion';

// Use standard debugLog for ImageSlideshowEffect to allow suppression
const slideshowLog = {
  log: (...args: any[]) => debugLog.log('🖼️', ...args),
  warn: (...args: any[]) => debugLog.warn('🖼️', ...args),
  error: (...args: any[]) => debugLog.error('🖼️', ...args),
};

export class ImageSlideshowEffect implements VisualEffect {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  parameters: {
    triggerValue: number; // Mapped input (0-1)
    threshold: number;
    images: string[]; // List of image URLs
    opacity: number;
    position: { x: number; y: number }; // Normalized position (0-1), 0,0 = top-left
    size: { width: number; height: number }; // Normalized size (0-1), fraction of screen
    // STATELESS: Pre-computed slide events for deterministic Lambda rendering
    slideEvents: { time: number; intensity: number }[];
  };

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private plane!: THREE.Mesh; // Initialized in updatePlaneGeometryAndPosition
  private material: THREE.MeshBasicMaterial;

  private currentImageIndex: number = -1;
  private textureCache: Map<string, THREE.Texture> = new Map();
  private loadingImages: Set<string> = new Set();
  private wasTriggered: boolean = false;
  private previousTriggerValue: number = 0; // Track previous value for edge detection
  private lastTriggerFrame: number = -999; // Frame when we last triggered (for cooldown)
  private minFramesBetweenTriggers: number = 6; // Minimum ~100ms at 60fps between triggers
  private textureLoader = new THREE.TextureLoader();
  private aspectRatio: number = 1;
  private failureCount = 0;
  private isAdvancing: boolean = false; // Prevent concurrent advanceSlide calls
  private pendingTextureResolvers: Map<string, ((texture: THREE.Texture) => void)[]> = new Map();
  private frameCounter: number = 0; // For periodic debug logging
  private lastErrorTime: number = 0;
  private errorCooldownMs: number = 2000; // 2 seconds cooldown
  private isNetworkThrottled: boolean = false; // Hard stop on 403 errors
  private consecutiveErrors: number = 0; // Track consecutive 403 errors
  private blacklistedUrls: Set<string> = new Set(); // URLs that returned 403/404

  // STATELESS: Track last calculated index to avoid redundant texture loads
  private lastCalculatedIndex: number = -1;

  constructor(config?: any) {
    this.id = config?.id || `imageSlideshow_${Math.random().toString(36).substr(2, 9)}`;
    this.name = 'Image Slideshow';
    this.description = 'Advances images based on audio transients';
    this.enabled = true;
    this.parameters = {
      triggerValue: 0,
      threshold: config?.threshold ?? 0.1, // Lower default threshold to catch more transients
      // Enforce minimum threshold of 0.01 to prevent edge case where threshold=0
      // breaks the trigger state machine (wasTriggered can never reset when threshold is 0)
      images: config?.images || [],
      opacity: 1.0,
      position: config?.position || { x: 0.5, y: 0.5 }, // Center by default
      size: config?.size || { width: 1.0, height: 1.0 }, // Full screen by default
      slideEvents: config?.slideEvents || [], // STATELESS: pre-computed transients for Lambda
      ...config
    };

    // Enforce minimum threshold to prevent broken state machine
    this.parameters.threshold = Math.max(0.01, this.parameters.threshold);

    this.textureLoader.setCrossOrigin('anonymous');

    this.scene = new THREE.Scene();

    // Use Orthographic camera to easily fill the screen
    this.aspectRatio = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1;
    this.camera = new THREE.OrthographicCamera(
      -this.aspectRatio, this.aspectRatio,
      1, -1,
      0.1, 100
    );
    this.camera.position.z = 10; // Move camera back to ensure plane is clearly visible

    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff, // Base white to multiply correctly with texture
      transparent: true,
      opacity: this.parameters.opacity,
      side: THREE.DoubleSide,
      map: null
    });

    // Create plane - will be positioned and sized based on parameters
    this.createPlane();
    this.plane.frustumCulled = false; // Disable culling to prevent disappearance
    this.plane.visible = false; // Start hidden until texture loads
    this.scene.add(this.plane);
  }

  /**
   * Create the plane mesh with initial geometry
   */
  private createPlane() {
    // Convert normalized position (0-1) to Three.js world coordinates
    const worldX = (this.parameters.position.x * 2 - 1) * this.aspectRatio;
    const worldY = 1 - this.parameters.position.y * 2;
    const worldWidth = this.parameters.size.width * 2 * this.aspectRatio;
    const worldHeight = this.parameters.size.height * 2;

    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(worldWidth, worldHeight), this.material);
    this.plane.position.set(worldX, worldY, 0);
  }

  init(renderer: THREE.WebGLRenderer): void {
    const remotionEnv = getRemotionEnvironment();
    const isInRemotionContext = remotionEnv.isRendering || remotionEnv.isStudio;

    slideshowLog.log('Initializing ImageSlideshowEffect', {
      effectId: this.id,
      imagesCount: this.parameters.images.length,
      sampleUrls: this.parameters.images.slice(0, 2).map(url => url.substring(0, 60) + '...')
    });

    if (isInRemotionContext) {
      console.log('[Slideshow Remotion] INIT', {
        effectId: this.id,
        imagesCount: this.parameters.images.length,
        threshold: this.parameters.threshold,
        isStudio: remotionEnv.isStudio,
        isRendering: remotionEnv.isRendering,
        sampleUrls: this.parameters.images.slice(0, 2).map(url => url.substring(0, 60) + '...')
      });
    }

    if (this.parameters.images.length > 0) {
      slideshowLog.log('Images available at init, calling advanceSlide()');
      this.advanceSlide();
    } else {
      slideshowLog.warn('No images available at init time');
    }
  }

  update(deltaTime: number): void {
    if (!this.enabled) return;

    // Check Remotion context FIRST - before any trigger logic
    const remotionEnv = getRemotionEnvironment();
    const isRemotionRendering = remotionEnv.isRendering;
    const isInRemotionContext = isRemotionRendering || remotionEnv.isStudio;

    // STRICT CHECK: If network is throttled due to 403s, stop all operations
    if (this.isNetworkThrottled) {
      return;
    }

    // Trigger detection: Use cooldown-based approach for audio-reactive slideshow
    // This handles cases where drums-peaks produces sustained rising values
    const currentValue = this.parameters.triggerValue;
    const threshold = this.parameters.threshold;

    // Calculate the change in value
    const valueDelta = currentValue - this.previousTriggerValue;

    // Cooldown check: don't trigger too frequently
    const framesSinceLastTrigger = this.frameCounter - this.lastTriggerFrame;
    const cooldownExpired = framesSinceLastTrigger >= this.minFramesBetweenTriggers;

    // Trigger conditions:
    // 1. Value jumped significantly (rising edge) - catches sharp transients
    // 2. OR value is above half threshold and we haven't triggered recently - catches sustained peaks
    const isRisingEdge = valueDelta > threshold;
    const isAboveThreshold = currentValue > threshold * 0.5; // Lower threshold for sustained trigger
    const shouldTrigger = cooldownExpired && (isRisingEdge || (isAboveThreshold && !this.wasTriggered));

    // DEBUG: Log state periodically or on triggers
    if (isInRemotionContext && (this.frameCounter % 30 === 0 || shouldTrigger)) {
      console.log('[Slideshow Debug]', {
        frame: this.frameCounter,
        currentValue: currentValue.toFixed(4),
        valueDelta: valueDelta.toFixed(4),
        threshold,
        cooldownExpired,
        framesSinceLastTrigger,
        shouldTrigger,
        currentImageIndex: this.currentImageIndex,
        isRemotionRendering,
      });
    }

    // CRITICAL FIX: In Remotion rendering mode, do NOT call advanceSlide()
    // because network loading doesn't work reliably in Lambda. Just track state.
    // The effect renders its current texture only - no advancing during render.
    if (shouldTrigger && !isRemotionRendering) {
      if (isInRemotionContext) {
        console.log('[Slideshow] TRIGGER - would advance slide (but blocked in Remotion render)', {
          frame: this.frameCounter,
          currentIndex: this.currentImageIndex,
          reason: isRisingEdge ? 'rising_edge' : 'sustained_peak',
        });
      }
      // Only advance in non-Remotion (live preview) mode
      this.advanceSlide();
      this.lastTriggerFrame = this.frameCounter;
      this.wasTriggered = true;
    } else if (shouldTrigger && isRemotionRendering) {
      // In Remotion mode: just log that we would trigger but can't
      if (isInRemotionContext) {
        console.log('[Slideshow] BLOCKED TRIGGER in Remotion render mode', {
          frame: this.frameCounter,
          currentIndex: this.currentImageIndex,
        });
      }
      // Still track that we "triggered" to prevent rapid re-triggering
      this.lastTriggerFrame = this.frameCounter;
      this.wasTriggered = true;
    } else if (currentValue <= threshold * 0.5 && this.wasTriggered) {
      // Reset wasTriggered when value drops below half threshold - enables next trigger
      // Using threshold * 0.5 ensures reset happens before the next potential trigger point
      if (isInRemotionContext && this.frameCounter % 30 === 0) {
        console.log('[Slideshow Debug] RESET wasTriggered (value dropped below threshold*0.5)', {
          frame: this.frameCounter,
          currentValue: currentValue.toFixed(4),
          threshold,
          threshold05: (threshold * 0.5).toFixed(4),
        });
      }
      this.wasTriggered = false;
    }

    // Update previous value for next frame
    this.previousTriggerValue = currentValue;

    // In Remotion mode, skip all expensive image loading/processing
    // The effect renders its current texture only - no advancing, no loading
    if (isRemotionRendering) {
      this.frameCounter++;
      return;
    }

    // Emergency backoff if we are hitting errors (e.g. 403s)
    if (Date.now() - this.lastErrorTime < this.errorCooldownMs) {
      return;
    }

    this.frameCounter++;

    // Debug opacity state every 60 frames (~1 second at 60fps)
    if (this.frameCounter % 60 === 0) {
      slideshowLog.log('📊 Opacity state check:', {
        effectId: this.id,
        parametersOpacity: this.parameters.opacity,
        materialOpacity: this.material.opacity,
        materialTransparent: this.material.transparent,
        hasMap: !!this.material.map,
        frameCounter: this.frameCounter
      });
    }

    // If images were added after init, load the first one immediately
    if (this.currentImageIndex === -1 && this.parameters.images.length > 0) {
      slideshowLog.log('Update: currentImageIndex is -1, images available, calling advanceSlide()');
      this.advanceSlide();
    }

    // Retry loading if no texture is displayed but images are available
    if (
      !this.material.map &&
      this.parameters.images.length > 0 &&
      this.failureCount < this.parameters.images.length * 2
    ) {
      const nextIndex = (this.currentImageIndex + 1) % this.parameters.images.length;
      const targetUrl = this.parameters.images[nextIndex];
      if (!this.loadingImages.has(targetUrl)) {
        slideshowLog.log('Update: No texture map, attempting to load:', {
          currentIndex: this.currentImageIndex,
          nextIndex,
          url: targetUrl.substring(0, 60),
          failureCount: this.failureCount
        });
        this.advanceSlide();
      }
    }

    // Update plane position and size if parameters changed
    this.updatePlaneGeometryAndPosition();

    // Safety: if a texture is present but the plane is somehow hidden, force it visible
    if (this.material.map && !this.plane.visible) {
      this.plane.visible = true;
      slideshowLog.log('Plane visibility auto-enabled in update because a texture is present');
    }
  }

  /**
   * Update plane geometry and position based on position/size parameters
   * Position and size are normalized (0-1), converted to Three.js world coordinates
   */
  private updatePlaneGeometryAndPosition() {
    // Convert normalized position (0-1) to Three.js world coordinates
    // X: 0 = left edge (-aspectRatio), 1 = right edge (aspectRatio)
    const worldX = (this.parameters.position.x * 2 - 1) * this.aspectRatio;
    // Y: 0 = top edge (1), 1 = bottom edge (-1) - flip Y for Three.js
    const worldY = 1 - this.parameters.position.y * 2;

    // Convert normalized size (0-1) to Three.js world size
    const worldWidth = this.parameters.size.width * 2 * this.aspectRatio;
    const worldHeight = this.parameters.size.height * 2;

    // Update plane position
    this.plane.position.set(worldX, worldY, 0);

    // Update plane geometry if size changed
    const currentWidth = (this.plane.geometry as THREE.PlaneGeometry).parameters.width;
    const currentHeight = (this.plane.geometry as THREE.PlaneGeometry).parameters.height;

    if (Math.abs(currentWidth - worldWidth) > 0.001 || Math.abs(currentHeight - worldHeight) > 0.001) {
      this.plane.geometry.dispose();
      this.plane.geometry = new THREE.PlaneGeometry(worldWidth, worldHeight);
    }
  }

  updateParameter(paramName: string, value: any): void {
    // Handle images array updates - this is called when a collection is selected
    if (paramName === 'images' && Array.isArray(value)) {
      slideshowLog.log('updateParameter called with images:', {
        valueLength: value.length,
        valueSample: value.slice(0, 2).map((url: any) => typeof url === 'string' ? url.substring(0, 80) : String(url))
      });

      // Filter out empty or invalid URLs - accept any non-empty string that looks like a URL
      const validUrls = value.filter((url: any) => {
        if (typeof url !== 'string') {
          slideshowLog.warn('Invalid URL type:', typeof url, url);
          return false;
        }
        const trimmed = url.trim();
        if (trimmed.length === 0) {
          slideshowLog.warn('Empty URL string');
          return false;
        }
        // Accept http/https URLs or data URLs
        const isValid = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:');
        if (!isValid) {
          slideshowLog.warn('URL does not start with http/https/data:', trimmed.substring(0, 50));
        }
        return isValid;
      });

      const oldLength = this.parameters.images.length;
      const newLength = validUrls.length;
      const imagesChanged = oldLength !== newLength ||
        JSON.stringify(this.parameters.images) !== JSON.stringify(validUrls);

      slideshowLog.log('Images validation result:', {
        oldCount: oldLength,
        newCount: newLength,
        validUrls: validUrls.length,
        invalidUrls: value.length - validUrls.length,
        imagesChanged,
        sampleUrls: validUrls.slice(0, 3).map((url: string) => url.substring(0, 60) + '...')
      });

      if (imagesChanged) {
        if (validUrls.length === 0) {
          slideshowLog.warn('No valid image URLs provided after filtering');
          slideshowLog.warn('Original value:', value);
          return;
        }

        // Update the parameter with only valid URLs
        this.parameters.images = validUrls;

        // Reset state for new collection
        this.currentImageIndex = -1;
        this.failureCount = 0;

        // Clear texture cache since URLs may have changed
        this.textureCache.forEach(t => t.dispose());
        this.textureCache.clear();
        this.loadingImages.clear();
        // Clear blacklist so refreshed URLs can be loaded
        this.blacklistedUrls.clear();

        // Clear current texture
        if (this.material.map) {
          this.material.map = null;
          this.material.color.setHex(0x000000); // Back to black
          this.material.needsUpdate = true;
        }

        // Load first image immediately
        slideshowLog.log('Loading first image from new collection, calling advanceSlide()');
        this.advanceSlide();
      } else {
        slideshowLog.log('Images array unchanged, skipping update');
      }
    } else if (paramName === 'opacity') {
      const oldOpacity = this.parameters.opacity;
      this.parameters.opacity = typeof value === 'number' ? value : parseFloat(value);
      this.material.opacity = this.parameters.opacity;
      slideshowLog.log('🔄 Opacity updated via updateParameter:', {
        effectId: this.id,
        oldValue: oldOpacity,
        newValue: this.parameters.opacity,
        materialOpacity: this.material.opacity,
        valueType: typeof value,
        rawValue: value
      });
    } else if (paramName === 'position') {
      if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
        this.parameters.position = {
          x: typeof value.x === 'number' ? value.x : parseFloat(value.x),
          y: typeof value.y === 'number' ? value.y : parseFloat(value.y)
        };
        this.updatePlaneGeometryAndPosition();
      }
    } else if (paramName === 'size') {
      if (value && typeof value === 'object' && 'width' in value && 'height' in value) {
        this.parameters.size = {
          width: typeof value.width === 'number' ? value.width : parseFloat(value.width),
          height: typeof value.height === 'number' ? value.height : parseFloat(value.height)
        };
        this.updatePlaneGeometryAndPosition();
      }
    } else if (paramName === 'threshold') {
      this.parameters.threshold = value;
      this.previousTriggerValue = this.parameters.triggerValue;
      this.wasTriggered = false;
    } else if (paramName === 'triggerValue') {
      const newValue = typeof value === 'number' ? value : parseFloat(value);
      this.parameters.triggerValue = newValue;
    } else if (paramName === 'slideEvents') {
      // STATELESS: Receive pre-computed slide events from audio transients
      if (Array.isArray(value)) {
        this.parameters.slideEvents = value as { time: number; intensity: number }[];
        slideshowLog.log('slideEvents updated:', {
          count: this.parameters.slideEvents.length,
          sample: this.parameters.slideEvents.slice(0, 3)
        });
      }
    }
  }

  /**
   * STATELESS: Update method that receives absolute time for deterministic Lambda rendering.
   * This computes the current slide index based on slideEvents, eliminating stateful edge detection.
   * @param absoluteTime - Absolute time in seconds (frame / fps)
   */
  updateWithTime(absoluteTime: number): void {
    if (!this.enabled) return;
    if (this.parameters.images.length === 0) return;

    const remotionEnv = getRemotionEnvironment();
    const isInRemotionContext = remotionEnv.isRendering || remotionEnv.isStudio;

    // STATELESS: Use slideEvents if available (Lambda mode)
    const slideEvents = this.parameters.slideEvents;

    if (slideEvents && slideEvents.length > 0) {
      // Count how many events have occurred by this time
      // Each event triggers one slide advance
      const eventsSoFar = slideEvents.filter(e => e.time <= absoluteTime).length;

      // Calculate which image should be shown (wrap around)
      const newIndex = eventsSoFar % this.parameters.images.length;

      // Only update if the index changed (avoid redundant texture loads)
      if (newIndex !== this.lastCalculatedIndex) {
        this.lastCalculatedIndex = newIndex;
        this.currentImageIndex = newIndex;

        if (isInRemotionContext) {
          console.log(`[Slideshow Stateless] time=${absoluteTime.toFixed(2)}s, events=${eventsSoFar}, index=${newIndex}`);
        }

        // Load the texture if not already cached
        const imageUrl = this.parameters.images[newIndex];
        if (imageUrl && !this.textureCache.has(imageUrl)) {
          // In Lambda, try to load - if it fails, we'll show what's cached
          this.loadTexture(imageUrl).catch(() => {
            // Silently fail - keep showing previous texture
          });
        }

        // Apply cached texture if available
        const texture = this.textureCache.get(imageUrl);
        if (texture) {
          this.material.map = texture;
          this.material.color.setHex(0xffffff);
          this.material.needsUpdate = true;
          this.plane.visible = true;
          this.fitTextureToScreen(texture);
        }
      }

      return;
    }

    // FALLBACK: No slideEvents - use legacy stateful approach for live preview
    // (This path should rarely be hit in Lambda as slideEvents should always be provided)
    if (isInRemotionContext && this.frameCounter % 60 === 0) {
      console.log('[Slideshow] WARNING: No slideEvents, falling back to stateful mode');
    }
  }

  resize(width: number, height: number) {
    this.aspectRatio = width / height;

    this.camera.left = -this.aspectRatio;
    this.camera.right = this.aspectRatio;
    this.camera.top = 1;
    this.camera.bottom = -1;
    this.camera.updateProjectionMatrix();

    // Update plane geometry and position based on new aspect ratio
    this.updatePlaneGeometryAndPosition();

    if (this.material.map) {
      this.fitTextureToScreen(this.material.map);
    }
  }

  private async advanceSlide() {
    const remotionEnv = getRemotionEnvironment();
    const isInRemotionContext = remotionEnv.isRendering || remotionEnv.isStudio;

    if (this.parameters.images.length === 0) {
      slideshowLog.warn('advanceSlide called but images array is empty');
      if (isInRemotionContext) {
        console.log('[Slideshow Remotion] advanceSlide BLOCKED: no images');
      }
      return;
    }

    // Prevent concurrent calls - if already advancing, skip
    if (this.isAdvancing) {
      if (isInRemotionContext) {
        console.log('[Slideshow Remotion] advanceSlide BLOCKED: already advancing (async load in progress)');
      }
      return;
    }

    this.isAdvancing = true;
    if (isInRemotionContext) {
      console.log('[Slideshow Remotion] advanceSlide STARTING', {
        currentIndex: this.currentImageIndex,
        nextIndex: (this.currentImageIndex + 1) % this.parameters.images.length,
      });
    }

    try {
      const nextIndex = (this.currentImageIndex + 1) % this.parameters.images.length;

      // If we're already on this index (shouldn't happen, but guard against it)
      if (nextIndex === this.currentImageIndex && this.currentImageIndex !== -1) {
        slideshowLog.log('Already on target index, skipping advance');
        this.isAdvancing = false;
        return;
      }

      const imageUrl = this.parameters.images[nextIndex];

      slideshowLog.log('Advancing slide:', {
        currentIndex: this.currentImageIndex,
        nextIndex,
        url: imageUrl.substring(0, 60)
      });

      // Try to get from cache
      let texture = this.textureCache.get(imageUrl);

      if (!texture) {
        try {
          texture = await this.loadTexture(imageUrl);
          this.failureCount = 0;
        } catch (e) {
          slideshowLog.error("Failed to load image for slideshow", imageUrl.substring(0, 60), e);
          this.currentImageIndex = nextIndex;
          this.failureCount++;
          this.isAdvancing = false;
          return;
        }
      }

      if (texture) {
        this.currentImageIndex = nextIndex;
        this.material.map = texture;
        this.material.color.setHex(0xffffff);
        this.material.needsUpdate = true;
        this.plane.visible = true; // Make sure plane is visible now

        slideshowLog.log('Slide advanced successfully:', {
          index: nextIndex,
          hasTexture: !!texture,
          textureSize: texture.image ? `${texture.image.width}x${texture.image.height}` : 'unknown'
        });

        if (isInRemotionContext) {
          console.log('[Slideshow Remotion] advanceSlide SUCCESS', {
            newIndex: nextIndex,
            textureSize: texture.image ? `${texture.image.width}x${texture.image.height}` : 'unknown',
          });
        }

        this.fitTextureToScreen(texture);

        // Preload next images & cleanup
        this.cleanupCache();
        this.loadNextTextures(nextIndex);
      } else {
        slideshowLog.error('advanceSlide: texture is null after load attempt');
        if (isInRemotionContext) {
          console.log('[Slideshow Remotion] advanceSlide FAILED: texture is null');
        }
      }
    } finally {
      this.isAdvancing = false;
    }
  }

  private fitTextureToScreen(texture: THREE.Texture) {
    if (!texture.image) return;

    const imageAspect = texture.image.width / texture.image.height;
    const screenAspect = this.aspectRatio;

    // Reset texture matrix to identity before applying transformations
    texture.matrixAutoUpdate = true;
    texture.matrix.identity();
    texture.center.set(0.5, 0.5);
    texture.offset.set(0, 0);

    if (imageAspect > screenAspect) {
      // Image is wider than screen
      texture.repeat.set(screenAspect / imageAspect, 1);
    } else {
      // Image is taller than screen
      texture.repeat.set(1, imageAspect / screenAspect);
    }
  }

  private loadNextTextures(currentIndex: number) {
    // Preload next 5 images for better responsiveness
    for (let i = 1; i <= 5; i++) {
      const idx = (currentIndex + i) % this.parameters.images.length;
      const url = this.parameters.images[idx];
      if (!this.textureCache.has(url) && !this.loadingImages.has(url)) {
        this.loadTexture(url).catch(() => { });
      }
    }
  }

  /**
   * Process image: resize if needed AND flip vertically for correct Three.js orientation.
   * We always process through canvas to ensure consistent orientation regardless of
   * browser ImageBitmap implementation differences.
   */
  private async resizeImageIfNeeded(imageBitmap: ImageBitmap, maxDimension: number = 2048): Promise<{ bitmap: ImageBitmap; wasResized: boolean; originalWidth: number; originalHeight: number }> {
    const originalWidth = imageBitmap.width;
    const originalHeight = imageBitmap.height;

    // Check if resizing is needed
    const needsResize = imageBitmap.width > maxDimension || imageBitmap.height > maxDimension;

    // Calculate target dimensions
    let width = imageBitmap.width;
    let height = imageBitmap.height;

    if (needsResize) {
      const scale = Math.min(maxDimension / imageBitmap.width, maxDimension / imageBitmap.height);
      width = Math.floor(imageBitmap.width * scale);
      height = Math.floor(imageBitmap.height * scale);
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      slideshowLog.warn('Could not get 2d context for processing, using original');
      return { bitmap: imageBitmap, wasResized: false, originalWidth, originalHeight };
    }

    // Flip vertically for correct WebGL/Three.js texture orientation
    // This ensures consistent behavior regardless of browser ImageBitmap handling
    ctx.translate(0, height);
    ctx.scale(1, -1);
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    const processedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
    const processedBitmap = await createImageBitmap(processedBlob);

    // Close original to free memory
    imageBitmap.close();

    return { bitmap: processedBitmap, wasResized: needsResize, originalWidth, originalHeight };
  }

  /**
   * Load image from blob and return as HTMLImageElement.
   * Uses the native Image constructor which is available in both browser and Node.js
   * environments when running with Three.js/Remotion.
   */
  private async loadImageFromBlobAsElement(blob: Blob): Promise<HTMLImageElement> {
    // Convert blob to base64 data URL
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = this.arrayBufferToBase64(arrayBuffer);
    const mimeType = blob.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Create image element using the global Image constructor
    // This is available in browser and in Node.js when running with canvas support
    const img = new (globalThis.Image || Image || HTMLImageElement)();

    return new Promise((resolve, reject) => {
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error('Failed to load image from blob'));
      };
      img.src = dataUrl;
    });
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // Use btoa in browser, but in Node.js we need a different approach
    if (typeof window !== 'undefined') {
      return btoa(binary);
    } else {
      // Node.js environment - use Buffer
      return Buffer.from(binary, 'binary').toString('base64');
    }
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    // Check if URL is blacklisted (403/404)
    if (this.blacklistedUrls.has(url)) {
      return Promise.reject(new Error("URL is blacklisted (403/404)"));
    }

    // STRICT CHECK: If throttled, reject immediately to save network
    if (this.isNetworkThrottled) {
      return Promise.reject(new Error("Network throttled due to previous 403s"));
    }

    // If we already have this texture cached, return it immediately
    const cached = this.textureCache.get(url);
    if (cached) {
      return Promise.resolve(cached);
    }

    // If a load is already in progress for this URL, attach to the same result
    if (this.loadingImages.has(url)) {
      slideshowLog.log('Texture already loading, attaching listener:', url.substring(0, 80));
      return new Promise((resolve) => {
        const existing = this.pendingTextureResolvers.get(url) || [];
        existing.push(resolve);
        this.pendingTextureResolvers.set(url, existing);
      });
    }

    this.loadingImages.add(url);
    slideshowLog.log('Loading texture:', url.substring(0, 80));

    return new Promise(async (resolve, reject) => {
      try {
        // Fetch image data
        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 403 || response.status === 404) {
            // Add to blacklist to prevent future attempts
            this.blacklistedUrls.add(url);

            if (response.status === 403) {
              this.consecutiveErrors++;

              // If we hit 3 consecutive 403s, stop trying for 5 seconds
              if (this.consecutiveErrors >= 3) {
                this.isNetworkThrottled = true;
                slideshowLog.warn("⛔ [ImageSlideshow] Too many 403s. Pausing loading for 5s.");
                setTimeout(() => {
                  this.isNetworkThrottled = false;
                  this.consecutiveErrors = 0;
                }, 5000);
              }
            }

            const msg = `⛔ ${response.status} Forbidden: URL Blacklisted. ${url.substring(0, 30)}...`;
            slideshowLog.warn(msg);
            throw new Error(msg);
          } else {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
          }
        }

        // On success, reset error counter
        this.consecutiveErrors = 0;

        const blob = await response.blob();

        let texture: THREE.Texture;

        // Use createImageBitmap in browser (fast, off-main-thread decoding)
        // Fall back to HTMLImageElement for Remotion/Node.js where createImageBitmap is unavailable
        const canUseBitmap = typeof createImageBitmap === 'function';

        if (canUseBitmap) {
          // Browser path: fast off-main-thread decode via ImageBitmap
          const imageBitmap = await createImageBitmap(blob);
          const { bitmap: processedBitmap, wasResized, originalWidth, originalHeight } = await this.resizeImageIfNeeded(imageBitmap, 2048);

          texture = new THREE.CanvasTexture(processedBitmap);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          texture.matrixAutoUpdate = true;
          // flipY = false because we pre-flip in resizeImageIfNeeded() via canvas transform
          texture.flipY = false;

          slideshowLog.log('Texture loaded via ImageBitmap:', {
            url: url.substring(0, 50),
            width: processedBitmap.width,
            height: processedBitmap.height,
            originalWidth,
            originalHeight,
            wasResized,
          });
        } else {
          // Remotion/Node.js path: HTMLImageElement with base64 data URL
          const img = await this.loadImageFromBlobAsElement(blob);

          texture = new THREE.Texture(img);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          texture.matrixAutoUpdate = true;
          texture.flipY = true;
          texture.needsUpdate = true;

          slideshowLog.log('Texture loaded via HTMLImageElement:', {
            url: url.substring(0, 50),
            width: img.width,
            height: img.height,
          });
        }

        this.textureCache.set(url, texture);
        this.loadingImages.delete(url);

        // Resolve primary caller
        resolve(texture);

        // Resolve any queued callers waiting on this URL
        const pending = this.pendingTextureResolvers.get(url);
        if (pending && pending.length > 0) {
          pending.forEach(fn => {
            try {
              fn(texture);
            } catch (e) {
              slideshowLog.error('Error resolving pending texture listener:', e);
            }
          });
          this.pendingTextureResolvers.delete(url);
        }
      } catch (err: any) {
        this.loadingImages.delete(url);
        this.pendingTextureResolvers.delete(url);

        // Trigger cooldown on error to prevent flooding
        this.lastErrorTime = Date.now();

        // Provide more detailed error information
        let errorMessage = 'Texture load failed';
        if (err?.message) {
          errorMessage = err.message;
        } else if (err?.name === 'TypeError' && err?.message?.includes('Failed to fetch')) {
          // This is likely a CORS error or network issue
          errorMessage = `Network error (likely CORS or expired URL): ${url.substring(0, 100)}...`;
        }

        slideshowLog.error('🖼️ Texture load failed:', errorMessage);
        slideshowLog.error('Failed URL:', url.substring(0, 100));

        reject(err);
      }
    });
  }

  /**
   * Public method to wait for essential images to load.
   * Used by Remotion to delay rendering until assets are ready.
   * @param duration - Optional total render duration in seconds. If provided, pre-loads
   *                   all images that will be shown during the render for Lambda compatibility.
   */
  public async waitForImages(duration?: number): Promise<void> {
    if (this.parameters.images.length === 0) return;

    const remotionEnv = getRemotionEnvironment();
    const isInRemotionContext = remotionEnv.isRendering || remotionEnv.isStudio;

    // STATELESS: In Lambda, pre-load all images that will be needed based on slideEvents and duration
    if (isInRemotionContext && this.parameters.slideEvents.length > 0 && duration) {
      const slideEvents = this.parameters.slideEvents;

      // Find how many slides will be shown during this render
      const relevantEvents = slideEvents.filter(e => e.time <= duration);
      const maxSlideIndex = relevantEvents.length % this.parameters.images.length;

      // Pre-load current + next few images that will be shown
      const imagesToPreload = new Set<number>();
      imagesToPreload.add(this.currentImageIndex >= 0 ? this.currentImageIndex : 0);

      // Pre-load up to maxSlideIndex + buffer
      const maxPreload = Math.min(maxSlideIndex + 5, this.parameters.images.length);
      for (let i = 0; i < maxPreload; i++) {
        imagesToPreload.add(i);
      }

      slideshowLog.log('waitForImages: Pre-loading images for Lambda render', {
        duration,
        relevantEvents: relevantEvents.length,
        maxSlideIndex,
        imagesToPreload: Array.from(imagesToPreload)
      });

      // Load all needed images in parallel
      const loadPromises = Array.from(imagesToPreload).map(async (idx) => {
        const url = this.parameters.images[idx];
        if (url && !this.textureCache.has(url)) {
          try {
            await this.loadTexture(url);
          } catch (e) {
            // Continue loading other images even if one fails
            slideshowLog.warn(`waitForImages: Failed to preload image ${idx}`, e);
          }
        }
      });

      await Promise.all(loadPromises);

      // Apply first image if not already applied
      const firstIndex = this.currentImageIndex >= 0 ? this.currentImageIndex : 0;
      const firstUrl = this.parameters.images[firstIndex];
      if (firstUrl) {
        const texture = this.textureCache.get(firstUrl);
        if (texture) {
          this.currentImageIndex = firstIndex;
          this.material.map = texture;
          this.material.color.setHex(0xffffff);
          this.material.needsUpdate = true;
          this.plane.visible = true;
          this.fitTextureToScreen(texture);
        }
      }

      return;
    }

    // LEGACY: Single image load for live preview
    // Determine which images we need.
    // If we have a current index, we need that one.
    // If not, we need the first one.
    const targetIndex = this.currentImageIndex >= 0 ? this.currentImageIndex : 0;
    const url = this.parameters.images[targetIndex];

    if (!url) return;

    // If already cached, we're good
    if (this.textureCache.has(url)) return;

    // Otherwise, try to load it
    try {
      slideshowLog.log('waitForImages: Waiting for', url.substring(0, 50));
      await this.loadTexture(url);

      // Also ensure it's applied to the material if it's the current target
      if (this.currentImageIndex === -1 || this.currentImageIndex === targetIndex) {
        const texture = this.textureCache.get(url);
        if (texture) {
          this.currentImageIndex = targetIndex;
          this.material.map = texture;
          this.material.color.setHex(0xffffff);
          this.material.needsUpdate = true;
          this.plane.visible = true;
          this.fitTextureToScreen(texture);
        }
      }
    } catch (e) {
      slideshowLog.warn('waitForImages: Failed to load image, proceeding anyway', e);
    }
  }

  private cleanupCache() {
    // Keep current and next 5 images (matching preload count)
    const keepIndices = new Set<number>();
    keepIndices.add(this.currentImageIndex);
    for (let i = 1; i <= 5; i++) {
      keepIndices.add((this.currentImageIndex + i) % this.parameters.images.length);
    }

    const keepUrls = new Set<string>();
    keepIndices.forEach(idx => {
      if (this.parameters.images[idx]) keepUrls.add(this.parameters.images[idx]);
    });

    // Don't dispose the texture currently in use by the material
    const currentMap = this.material.map;

    for (const [url, texture] of this.textureCache) {
      if (!keepUrls.has(url) && texture !== currentMap) {
        texture.dispose();
        this.textureCache.delete(url);
      }
    }
  }

  getScene(): THREE.Scene { return this.scene; }
  getCamera(): THREE.Camera { return this.camera; }

  destroy(): void {
    this.plane.geometry.dispose();
    this.material.dispose();
    this.textureCache.forEach(t => t.dispose());
    this.textureCache.clear();
    this.loadingImages.clear();
  }
}
