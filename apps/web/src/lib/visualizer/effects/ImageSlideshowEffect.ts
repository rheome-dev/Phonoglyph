import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';

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
  private textureLoader = new THREE.TextureLoader();
  private aspectRatio: number = 1;
  private failureCount = 0;

  constructor(config?: any) {
    this.id = config?.id || `imageSlideshow_${Math.random().toString(36).substr(2, 9)}`;
    this.name = 'Image Slideshow';
    this.description = 'Advances images based on audio transients';
    this.enabled = true;
    this.parameters = {
      triggerValue: 0,
      threshold: 0.5,
      images: config?.images || [],
      opacity: 1.0,
      scale: 1.0,
      ...config
    };

    this.textureLoader.setCrossOrigin('anonymous');

    this.scene = new THREE.Scene();
    
    // Use Orthographic camera to easily fill the screen
    this.aspectRatio = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -this.aspectRatio, this.aspectRatio, 
      1, -1, 
      0.1, 100
    );
    this.camera.position.z = 1;

    this.material = new THREE.MeshBasicMaterial({ 
        color: 0x000000, // Prevent bright white flash before textures load
        transparent: true, 
        opacity: this.parameters.opacity,
        side: THREE.DoubleSide,
        map: null
    });
    
    // Create plane that fills the view (2x2 in orthographic space with height 1)
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(2 * this.aspectRatio, 2), this.material);
    this.scene.add(this.plane);
  }

  init(renderer: THREE.WebGLRenderer): void {
      debugLog.log('🖼️ Initializing ImageSlideshowEffect', {
        effectId: this.id,
        imagesCount: this.parameters.images.length,
        sampleUrls: this.parameters.images.slice(0, 2).map(url => url.substring(0, 60) + '...')
      });
      if (this.parameters.images.length > 0) {
          debugLog.log('🖼️ Images available at init, calling advanceSlide()');
          this.advanceSlide();
      } else {
          debugLog.warn('🖼️ No images available at init time');
      }
  }

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
      if (!this.enabled) return;

      // If images were added after init, load the first one immediately
      if (this.currentImageIndex === -1 && this.parameters.images.length > 0) {
          debugLog.log('🖼️ Update: currentImageIndex is -1, images available, calling advanceSlide()');
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
          debugLog.log('🖼️ Update: No texture map, attempting to load:', {
            currentIndex: this.currentImageIndex,
            nextIndex,
            url: targetUrl.substring(0, 60),
            failureCount: this.failureCount
          });
          this.advanceSlide();
        } else {
          debugLog.log('🖼️ Update: Image already loading, skipping');
        }
      } else if (!this.material.map && this.parameters.images.length === 0) {
        debugLog.warn('🖼️ Update: No texture map and no images available');
      } else if (!this.material.map && this.failureCount >= this.parameters.images.length * 2) {
        debugLog.error('🖼️ Update: Too many failures, giving up:', {
          failureCount: this.failureCount,
          imageCount: this.parameters.images.length
        });
      }

      // Check trigger
      const isTriggered = this.parameters.triggerValue > this.parameters.threshold;
      
      if (isTriggered && !this.wasTriggered) {
          this.advanceSlide();
      }
      this.wasTriggered = isTriggered;

      // Update visual params
      this.material.opacity = this.parameters.opacity;
      
      // Handle manual scale changes if needed, though usually we want to fill screen
      // If scale parameter is meant to zoom the image:
      if (this.parameters.scale !== 1.0) {
          // We could apply scale to the plane
           // this.plane.scale.setScalar(this.parameters.scale);
           // But fitTextureToScreen handles basic fit.
      }
  }

  updateParameter(paramName: string, value: any): void {
    // Handle images array updates - this is called when a collection is selected
    if (paramName === 'images' && Array.isArray(value)) {
      debugLog.log('🖼️ updateParameter called with images:', { 
        valueLength: value.length,
        valueSample: value.slice(0, 2).map((url: any) => typeof url === 'string' ? url.substring(0, 80) : String(url))
      });
      
      // Filter out empty or invalid URLs - accept any non-empty string that looks like a URL
      const validUrls = value.filter((url: any) => {
        if (typeof url !== 'string') {
          debugLog.warn('🖼️ Invalid URL type:', typeof url, url);
          return false;
        }
        const trimmed = url.trim();
        if (trimmed.length === 0) {
          debugLog.warn('🖼️ Empty URL string');
          return false;
        }
        // Accept http/https URLs or data URLs
        const isValid = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:');
        if (!isValid) {
          debugLog.warn('🖼️ URL does not start with http/https/data:', trimmed.substring(0, 50));
        }
        return isValid;
      });
      
      const oldLength = this.parameters.images.length;
      const newLength = validUrls.length;
      const imagesChanged = oldLength !== newLength || 
        JSON.stringify(this.parameters.images) !== JSON.stringify(validUrls);
      
      debugLog.log('🖼️ Images validation result:', { 
        oldCount: oldLength, 
        newCount: newLength,
        validUrls: validUrls.length,
        invalidUrls: value.length - validUrls.length,
        imagesChanged,
        sampleUrls: validUrls.slice(0, 3).map((url: string) => url.substring(0, 60) + '...')
      });
      
      if (imagesChanged) {
        if (validUrls.length === 0) {
          debugLog.warn('🖼️ No valid image URLs provided after filtering');
          debugLog.warn('🖼️ Original value:', value);
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
        debugLog.log('🖼️ Loading first image from new collection, calling advanceSlide()');
        this.advanceSlide();
      } else {
        debugLog.log('🖼️ Images array unchanged, skipping update');
      }
    } else if (paramName === 'opacity') {
      this.parameters.opacity = value;
      this.material.opacity = value;
    } else if (paramName === 'scale') {
      this.parameters.scale = value;
    } else if (paramName === 'threshold') {
      this.parameters.threshold = value;
    } else if (paramName === 'triggerValue') {
      this.parameters.triggerValue = value;
    }
  }

  resize(width: number, height: number) {
      this.aspectRatio = width / height;
      
      this.camera.left = -this.aspectRatio;
      this.camera.right = this.aspectRatio;
      this.camera.top = 1;
      this.camera.bottom = -1;
      this.camera.updateProjectionMatrix();
      
      // Resize plane geometry to match new aspect ratio
      this.plane.geometry.dispose();
      this.plane.geometry = new THREE.PlaneGeometry(2 * this.aspectRatio, 2);
      
      // Re-fit current texture if exists
      if (this.material.map) {
          this.fitTextureToScreen(this.material.map);
      }
  }

  private async advanceSlide() {
      if (this.parameters.images.length === 0) {
        debugLog.warn('🖼️ advanceSlide called but images array is empty');
        return;
      }

      const nextIndex = (this.currentImageIndex + 1) % this.parameters.images.length;
      const imageUrl = this.parameters.images[nextIndex];
      
      debugLog.log('🖼️ Advancing slide:', { 
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
              debugLog.error("🖼️ Failed to load image for slideshow", imageUrl.substring(0, 60), e);
              this.currentImageIndex = nextIndex;
              this.failureCount++;
              return;
          }
      }

      if (texture) {
          this.currentImageIndex = nextIndex;
          this.material.map = texture;
          this.material.color.setHex(0xffffff); // Reset tint so texture displays normally
          this.material.needsUpdate = true;
          
          debugLog.log('🖼️ Slide advanced successfully:', {
            index: nextIndex,
            hasTexture: !!texture,
            textureSize: texture.image ? `${texture.image.width}x${texture.image.height}` : 'unknown'
          });
          
          this.fitTextureToScreen(texture);

          // Preload next images & cleanup
          this.cleanupCache();
          this.loadNextTextures(nextIndex);
      } else {
        debugLog.error('🖼️ advanceSlide: texture is null after load attempt');
      }
  }

  private fitTextureToScreen(texture: THREE.Texture) {
     if (!texture.image) return;
     
     // "Cover" style fitting:
     // We want the image to cover the 2*aspect x 2 plane.
     // The plane UVs are 0..1.
     // We need to transform UVs to crop the image.
     
     const imageAspect = texture.image.width / texture.image.height;
     const screenAspect = this.aspectRatio; // width / height (camera space width is 2*aspect, height is 2)
     
     texture.matrixAutoUpdate = false;
     texture.center.set(0.5, 0.5);
     
     if (imageAspect > screenAspect) {
         // Image is wider than screen (relative to height)
         // We need to scale UVs horizontally (x)
         // scale = imageAspect / screenAspect
         texture.repeat.set(screenAspect / imageAspect, 1);
     } else {
         // Image is taller than screen (relative to width)
         // We need to scale UVs vertically (y)
         texture.repeat.set(1, imageAspect / screenAspect);
     }
  }

  private loadNextTextures(currentIndex: number) {
      // Load next 2 images
      for (let i = 1; i <= 2; i++) {
          const idx = (currentIndex + i) % this.parameters.images.length;
          const url = this.parameters.images[idx];
          if (!this.textureCache.has(url) && !this.loadingImages.has(url)) {
              this.loadTexture(url).catch(e => debugLog.error("Preload failed", e));
          }
      }
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
      if (this.loadingImages.has(url)) {
        debugLog.warn('🖼️ Already loading texture:', url.substring(0, 50));
        return Promise.reject('Already loading');
      }
      this.loadingImages.add(url);
      debugLog.log('🖼️ Loading texture:', url.substring(0, 80));
      return new Promise((resolve, reject) => {
          this.textureLoader.load(
            url, 
            (texture) => {
                this.textureCache.set(url, texture);
                this.loadingImages.delete(url);
                // Ensure texture works with resizing
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                debugLog.log('🖼️ Texture loaded successfully:', {
                  url: url.substring(0, 50),
                  width: texture.image?.width,
                  height: texture.image?.height
                });
                resolve(texture);
            }, 
            undefined, 
            (err) => {
                this.loadingImages.delete(url);
                debugLog.error('🖼️ Texture load failed:', url.substring(0, 80), err);
                reject(err);
            }
          );
      });
  }

  private cleanupCache() {
      // Keep current and next 2 images
      const keepIndices = new Set<number>();
      keepIndices.add(this.currentImageIndex);
      keepIndices.add((this.currentImageIndex + 1) % this.parameters.images.length);
      keepIndices.add((this.currentImageIndex + 2) % this.parameters.images.length);

      // Map URLs to keep
      const keepUrls = new Set<string>();
      keepIndices.forEach(idx => keepUrls.add(this.parameters.images[idx]));

      for (const [url, texture] of this.textureCache) {
          if (!keepUrls.has(url)) {
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
  }
}

