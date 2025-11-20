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
      debugLog.log('🖼️ Initializing ImageSlideshowEffect');
      // Initial load
      if (this.parameters.images.length > 0) {
          this.loadNextTextures(0);
          // Load first image immediately
          this.loadTexture(this.parameters.images[0]).then(texture => {
              this.material.map = texture;
              this.material.needsUpdate = true;
              this.currentImageIndex = 0;
              this.fitTextureToScreen(texture);
          }).catch(err => {
              debugLog.error('Failed to load first image for slideshow', err);
          });
      }
  }

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
      if (!this.enabled) return;

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
      if (this.parameters.images.length === 0) return;

      const nextIndex = (this.currentImageIndex + 1) % this.parameters.images.length;
      const imageUrl = this.parameters.images[nextIndex];

      // Try to get from cache
      let texture = this.textureCache.get(imageUrl);
      
      if (!texture) {
          // Not in cache, try to load immediately
          try {
            texture = await this.loadTexture(imageUrl);
          } catch(e) {
              debugLog.error("Failed to load image for slideshow", imageUrl, e);
              return;
          }
      }

      if (texture) {
          this.currentImageIndex = nextIndex;
          this.material.map = texture;
          this.material.needsUpdate = true;
          
          this.fitTextureToScreen(texture);

          // Preload next images & cleanup
          this.cleanupCache();
          this.loadNextTextures(nextIndex);
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
      this.loadingImages.add(url);
      return new Promise((resolve, reject) => {
          this.textureLoader.load(url, (texture) => {
              this.textureCache.set(url, texture);
              this.loadingImages.delete(url);
              // Ensure texture works with resizing
              texture.minFilter = THREE.LinearFilter;
              texture.magFilter = THREE.LinearFilter;
              resolve(texture);
          }, undefined, (err) => {
              this.loadingImages.delete(url);
              reject(err);
          });
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

