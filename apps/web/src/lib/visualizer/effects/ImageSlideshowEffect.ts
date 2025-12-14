import * as THREE from 'three';
import { VisualEffect } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';

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

  constructor(config?: any) {
    this.id = config?.id || `imageSlideshow_${Math.random().toString(36).substr(2, 9)}`;
    this.name = 'Image Slideshow';
    this.description = 'Advances images based on audio transients';
    this.enabled = true;
    this.parameters = {
      triggerValue: 0,
      threshold: 0.1, // Lower default threshold to catch more transients
      images: config?.images || [],
      opacity: 1.0,
      position: config?.position || { x: 0.5, y: 0.5 }, // Center by default
      size: config?.size || { width: 1.0, height: 1.0 }, // Full screen by default
      ...config
    };

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
      slideshowLog.log('Initializing ImageSlideshowEffect', {
        effectId: this.id,
        imagesCount: this.parameters.images.length,
        sampleUrls: this.parameters.images.slice(0, 2).map(url => url.substring(0, 60) + '...')
      });
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

      // Edge detection: trigger on significant positive change (transient/peak detection)
      const currentValue = this.parameters.triggerValue;
      const threshold = this.parameters.threshold;
      
      // Calculate the change in value
      const valueDelta = currentValue - this.previousTriggerValue;
      
      // Detect rising edge: value increased significantly (positive delta above threshold)
      // For transient detection, we want to trigger on rapid increases, not just crossing a static threshold
      const isRisingEdge = valueDelta > threshold && !this.wasTriggered;
      
      if (isRisingEdge) {
          this.advanceSlide();
          this.wasTriggered = true;
      } else if (valueDelta <= 0 || currentValue <= threshold) {
          // Reset trigger state when value stops increasing or drops below threshold
          // This allows the next increase to trigger again
          this.wasTriggered = false;
      }
      
      // Update previous value for next frame
      this.previousTriggerValue = currentValue;
      
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
      if (this.parameters.images.length === 0) {
        slideshowLog.warn('advanceSlide called but images array is empty');
        return;
      }

      // Prevent concurrent calls - if already advancing, skip
      if (this.isAdvancing) {
        return;
      }

      this.isAdvancing = true;

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
            } catch(e) {
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
            
            this.fitTextureToScreen(texture);

            // Preload next images & cleanup
            this.cleanupCache();
            this.loadNextTextures(nextIndex);
        } else {
          slideshowLog.error('advanceSlide: texture is null after load attempt');
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
              this.loadTexture(url).catch(() => {});
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
              
              // Decode using ImageBitmap API (faster, off main thread)
              const imageBitmap = await createImageBitmap(blob);
              
              // Resize if needed (max 2048px for performance)
              const { bitmap: resizedBitmap, wasResized, originalWidth, originalHeight } = await this.resizeImageIfNeeded(imageBitmap, 2048);
              
              // Create texture from ImageBitmap
              const texture = new THREE.CanvasTexture(resizedBitmap);
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.minFilter = THREE.LinearFilter;
              texture.magFilter = THREE.LinearFilter;
              texture.generateMipmaps = false;
              texture.matrixAutoUpdate = true;
              // flipY = false because we pre-flip the image in resizeImageIfNeeded()
              // via canvas transform. This ensures consistent orientation across browsers.
              texture.flipY = false;
              
              this.textureCache.set(url, texture);
              this.loadingImages.delete(url);
              
              slideshowLog.log('Texture loaded successfully:', {
                url: url.substring(0, 50),
                width: resizedBitmap.width,
                height: resizedBitmap.height,
                originalWidth,
                originalHeight,
                wasResized
              });

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
