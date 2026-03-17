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
  private renderer?: THREE.WebGLRenderer;

  private applyTexture(texture: THREE.Texture | null) {
    if (this.material.map === texture) return;
    const wasNull = this.material.map === null;
    const isNowNull = texture === null;

    this.material.map = texture;
    
    if (texture) {
      this.material.color.setHex(0xffffff);
      this.plane.visible = true;
      this.fitTextureToScreen(texture);
    } else {
      this.material.color.setHex(0x000000); // Back to black
    }
    
    if (wasNull !== isNowNull) {
      this.material.needsUpdate = true;
    }
  }
  private material: THREE.MeshBasicMaterial;

  private currentImageIndex: number = -1;
  private textureCache: Map<string, THREE.Texture> = new Map();
  private loadingImages: Set<string> = new Set();
  private wasTriggered: boolean = false;
  private previousTriggerValue: number = 0; // Track previous value for edge detection
  private lastTriggerFrame: number = -999; // Frame when we last triggered (for cooldown)
  private minFramesBetweenTriggers: number = 8; // Minimum ~133ms at 60fps between triggers
  private textureLoader = new THREE.TextureLoader();
  private aspectRatio: number = 1;
  private failureCount = 0;
  private pendingTextureResolvers: Map<string, ((texture: THREE.Texture) => void)[]> = new Map();
  // Cached Remotion environment (doesn't change at runtime)
  private isRemotionRendering: boolean = false;
  private isInRemotionContext: boolean = false;
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
    this.renderer = renderer;
    const remotionEnv = getRemotionEnvironment();
    this.isRemotionRendering = remotionEnv.isRendering;
    this.isInRemotionContext = remotionEnv.isRendering || remotionEnv.isStudio;

    slideshowLog.log('Initializing ImageSlideshowEffect', {
      effectId: this.id,
      imagesCount: this.parameters.images.length,
      sampleUrls: this.parameters.images.slice(0, 2).map(url => url.substring(0, 60) + '...')
    });

    if (this.isInRemotionContext) {
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

    // Trigger condition: Only fire on a clear rising edge (value jumped by more than threshold).
    // The "isAboveThreshold && !wasTriggered" path is intentionally removed — with a
    // momentum-accumulator input the base value hovers around 0.5, so "above threshold"
    // is always true and would cause spurious re-triggers after the cooldown expires.
    const isRisingEdge = valueDelta > threshold;
    const shouldTrigger = cooldownExpired && isRisingEdge;

    // DEBUG: Log state periodically or on triggers (Remotion only)
    if (this.isInRemotionContext && (this.frameCounter % 30 === 0 || shouldTrigger)) {
      console.log('[Slideshow Debug]', {
        frame: this.frameCounter,
        currentValue: currentValue.toFixed(4),
        valueDelta: valueDelta.toFixed(4),
        threshold,
        cooldownExpired,
        framesSinceLastTrigger,
        shouldTrigger,
        currentImageIndex: this.currentImageIndex,
        isRemotionRendering: this.isRemotionRendering,
      });
    }

    if (shouldTrigger && !this.isRemotionRendering) {
      // Live preview mode: advance slide immediately (non-blocking)
      this.advanceSlide();
      this.lastTriggerFrame = this.frameCounter;
      this.wasTriggered = true;
    } else if (shouldTrigger && this.isRemotionRendering) {
      // Remotion mode: track trigger state but don't advance (Lambda uses slideEvents)
      this.lastTriggerFrame = this.frameCounter;
      this.wasTriggered = true;
    } else if (currentValue <= threshold * 0.5 && this.wasTriggered) {
      this.wasTriggered = false;
    }

    // Update previous value for next frame
    this.previousTriggerValue = currentValue;

    // In Remotion mode, skip all expensive image loading/processing
    if (this.isRemotionRendering) {
      this.frameCounter++;
      return;
    }

    // Emergency backoff if we are hitting errors (e.g. 403s)
    if (Date.now() - this.lastErrorTime < this.errorCooldownMs) {
      return;
    }

    this.frameCounter++;

    // Opacity debug logging removed for performance

    // If images were added after init, load the first one immediately
    if (this.currentImageIndex === -1 && this.parameters.images.length > 0) {
      this.advanceSlide();
    }

    // If a texture load completed in the background, apply it now
    if (this.currentImageIndex >= 0) {
      const currentUrl = this.parameters.images[this.currentImageIndex];
      if (currentUrl) {
        const cachedTexture = this.textureCache.get(currentUrl);
        if (cachedTexture && this.material.map !== cachedTexture) {
          this.applyTexture(cachedTexture);
        }
      }
    }

    // Retry loading the CURRENT image if no texture is displayed.
    // Important: Do NOT call advanceSlide() here — that would skip ahead through
    // images every frame when a texture is loading, causing multiple advances per trigger.
    if (
      !this.material.map &&
      this.currentImageIndex >= 0 &&
      this.parameters.images.length > 0 &&
      this.failureCount < this.parameters.images.length * 2
    ) {
      const currentUrl = this.parameters.images[this.currentImageIndex];
      if (currentUrl && !this.textureCache.has(currentUrl) && !this.loadingImages.has(currentUrl)) {
        this.loadTexture(currentUrl).catch(() => {
          this.failureCount++;
        });
      }
    }

    // Update plane position and size if parameters changed
    this.updatePlaneGeometryAndPosition();

    // Safety: if a texture is present but the plane is somehow hidden, force it visible
    if (this.material.map && !this.plane.visible) {
      this.plane.visible = true;
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
          this.applyTexture(null);
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

    // Use cached Remotion environment (set in init)

    // STATELESS: Use slideEvents if available (Lambda mode)
    const slideEvents = this.parameters.slideEvents;

    if (slideEvents && slideEvents.length > 0) {
      // Count how many events have occurred by this time
      // Each event triggers one slide advance
      const eventsSoFar = slideEvents.filter(e => e.time <= absoluteTime).length;

      // Calculate which image should be shown (wrap around)
      const newIndex = eventsSoFar % this.parameters.images.length;

      // When index changes: update state and kick off texture load if not cached
      if (newIndex !== this.lastCalculatedIndex) {
        this.lastCalculatedIndex = newIndex;
        this.currentImageIndex = newIndex;

        if (this.isInRemotionContext) {
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
      }

      // EVERY FRAME: Apply texture for current index if it's now in cache.
      // This is critical for Lambda: loadTexture is async, so the texture won't be
      // in cache on the same frame the index changes. We check every frame so it gets
      // applied as soon as it loads (within one frame of the load completing).
      if (this.currentImageIndex >= 0) {
        const imageUrl = this.parameters.images[this.currentImageIndex];
        const texture = imageUrl ? this.textureCache.get(imageUrl) : undefined;
        if (texture && this.material.map !== texture) {
          this.applyTexture(texture);
        }
      }

      return;
    }

    // FALLBACK: No slideEvents - use legacy stateful approach for live preview
    // (This path should rarely be hit in Lambda as slideEvents should always be provided)
    if (this.isInRemotionContext && this.frameCounter % 60 === 0) {
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

  /**
   * Advance to the next slide. This method is NON-BLOCKING:
   * - Cache hit: swaps the texture synchronously (instant, same frame)
   * - Cache miss: advances the index immediately and starts a background load.
   *   The texture will be applied on the next frame when update() detects it in cache.
   * No trigger is ever blocked by a pending load.
   */
  private advanceSlide() {
    if (this.parameters.images.length === 0) return;

    const nextIndex = (this.currentImageIndex + 1) % this.parameters.images.length;

    // Guard: already on this index
    if (nextIndex === this.currentImageIndex && this.currentImageIndex !== -1) return;

    const imageUrl = this.parameters.images[nextIndex];

    // Always advance the index immediately so the trigger state machine progresses
    this.currentImageIndex = nextIndex;

    // Try synchronous cache hit — instant texture swap
    const cachedTexture = this.textureCache.get(imageUrl);
    if (cachedTexture) {
      this.applyTexture(cachedTexture);

      // Fire-and-forget preload / cleanup
      this.cleanupCache();
      this.loadNextTextures(nextIndex);
      return;
    }

    // Cache miss: start background load, don't block
    // The texture will be applied by the polling check in update()
    if (!this.loadingImages.has(imageUrl)) {
      this.loadTexture(imageUrl).then(() => {
        this.failureCount = 0;
        this.cleanupCache();
        this.loadNextTextures(nextIndex);
      }).catch(() => {
        this.failureCount++;
      });
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
    // Preload next 2 images to reduce concurrent network/decode pressure
    for (let i = 1; i <= 2; i++) {
      const idx = (currentIndex + i) % this.parameters.images.length;
      const url = this.parameters.images[idx];
      if (!this.textureCache.has(url) && !this.loadingImages.has(url)) {
        this.loadTexture(url).catch(() => { });
      }
    }
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
          // Browser path: fast off-main-thread decode + flip via ImageBitmap
          // imageOrientation 'flipY' flips the image during the off-thread decode,
          // so we set texture.flipY = false to avoid double-flipping
          const imageBitmap = await createImageBitmap(blob, { imageOrientation: 'flipY' });

          texture = new THREE.CanvasTexture(imageBitmap);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          texture.matrixAutoUpdate = true;
          texture.flipY = false;

          slideshowLog.log('Texture loaded via ImageBitmap:', {
            url: url.substring(0, 50),
            width: imageBitmap.width,
            height: imageBitmap.height,
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
        
        // Force GPU texture upload immediately to avoid lag on first render
        if (this.renderer) {
          this.renderer.initTexture(texture);
        }
        
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

        // Blacklist any URL that fails to load (not just 403/404).
        // This prevents repeated slow network-timeout retries on every frame
        // when a URL is unreachable (e.g. net::ERR_FAILED from Lambda).
        this.blacklistedUrls.add(url);

        // Provide more detailed error information
        let errorMessage = 'Texture load failed';
        if (err?.message) {
          errorMessage = err.message;
        } else if (err?.name === 'TypeError' && err?.message?.includes('Failed to fetch')) {
          errorMessage = `Network error (likely CORS or unreachable): ${url.substring(0, 100)}`;
        }

        slideshowLog.error('🖼️ Texture load failed (blacklisted):', errorMessage);
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

      // Pre-load all images that will be cycled through.
      // If there are more events than images, all images will appear at some point.
      // If fewer events than images, only the first N images are needed.
      const imagesToPreload = new Set<number>();
      imagesToPreload.add(this.currentImageIndex >= 0 ? this.currentImageIndex : 0);

      if (relevantEvents.length >= this.parameters.images.length) {
        // All images will be shown — preload everything
        for (let i = 0; i < this.parameters.images.length; i++) {
          imagesToPreload.add(i);
        }
      } else {
        // Only some images will be shown — preload exactly those indices
        for (let i = 0; i <= relevantEvents.length; i++) {
          imagesToPreload.add(i % this.parameters.images.length);
        }
      }

      slideshowLog.log('waitForImages: Pre-loading images for Lambda render', {
        duration,
        relevantEvents: relevantEvents.length,
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
          this.applyTexture(texture);
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
          this.applyTexture(texture);
        }
      }
    } catch (e) {
      slideshowLog.warn('waitForImages: Failed to load image, proceeding anyway', e);
    }
  }

  private cleanupCache() {
    // Keep current and next 2 images (matching preload count)
    const keepIndices = new Set<number>();
    keepIndices.add(this.currentImageIndex);
    for (let i = 1; i <= 2; i++) {
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
