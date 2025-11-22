import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';

// Always log ImageSlideshowEffect logs for debugging (bypass debugLog conditional)
const slideshowLog = {
  log: (...args: any[]) => console.log('🖼️', ...args),
  warn: (...args: any[]) => console.warn('🖼️', ...args),
  error: (...args: any[]) => console.error('🖼️', ...args),
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
    scale: number;
  };

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private plane: THREE.Mesh;
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
      scale: 1.0,
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
    
    // Create plane that fills the view (2x2 in orthographic space with height 1)
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(2 * this.aspectRatio, 2), this.material);
    this.plane.frustumCulled = false; // Disable culling to prevent disappearance
    this.plane.visible = false; // Start hidden until texture loads
    this.scene.add(this.plane);
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

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
      if (!this.enabled) return;

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
      this.material.opacity = this.parameters.opacity;

      // Safety: if a texture is present but the plane is somehow hidden, force it visible
      if (this.material.map && !this.plane.visible) {
        this.plane.visible = true;
        slideshowLog.log('Plane visibility auto-enabled in update because a texture is present');
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
      this.parameters.opacity = value;
      this.material.opacity = value;
    } else if (paramName === 'scale') {
      this.parameters.scale = value;
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
      
      this.plane.geometry.dispose();
      this.plane.geometry = new THREE.PlaneGeometry(2 * this.aspectRatio, 2);
      
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
     
     // Fix: Allow auto update for repeat/center/offset to work
     texture.matrixAutoUpdate = true; 
     texture.center.set(0.5, 0.5);
     
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
   * Resize image if it exceeds max dimension (for performance with high-res images)
   */
  private async resizeImageIfNeeded(imageBitmap: ImageBitmap, maxDimension: number = 2048): Promise<{ bitmap: ImageBitmap; wasResized: boolean; originalWidth: number; originalHeight: number }> {
      const originalWidth = imageBitmap.width;
      const originalHeight = imageBitmap.height;
      
      if (imageBitmap.width <= maxDimension && imageBitmap.height <= maxDimension) {
          return { bitmap: imageBitmap, wasResized: false, originalWidth, originalHeight };
      }
      
      const scale = Math.min(maxDimension / imageBitmap.width, maxDimension / imageBitmap.height);
      const width = Math.floor(imageBitmap.width * scale);
      const height = Math.floor(imageBitmap.height * scale);
      
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
          slideshowLog.warn('Could not get 2d context for resizing, using original');
          return { bitmap: imageBitmap, wasResized: false, originalWidth, originalHeight };
      }
      
      ctx.drawImage(imageBitmap, 0, 0, width, height);
      const resizedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
      const resizedBitmap = await createImageBitmap(resizedBlob);
      
      // Close original to free memory
      imageBitmap.close();
      
      return { bitmap: resizedBitmap, wasResized: true, originalWidth, originalHeight };
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
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
                  throw new Error(`Failed to fetch image: ${response.statusText}`);
              }
              
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
          } catch (err) {
              this.loadingImages.delete(url);
              this.pendingTextureResolvers.delete(url);
              slideshowLog.error('Texture load failed:', url.substring(0, 80), err);
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
