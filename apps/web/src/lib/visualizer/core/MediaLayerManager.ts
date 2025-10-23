import * as THREE from 'three';

export interface MediaLayerConfig {
  id: string;
  type: 'canvas' | 'video' | 'image';
  source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | string;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add' | 'subtract';
  opacity: number;
  zIndex: number;
  
  // Audio-reactive bindings
  audioBindings?: {
    feature: string;                    // 'drums-rms', 'bass-spectralCentroid'
    property: 'opacity' | 'scale' | 'rotation' | 'position';
    inputRange: [number, number];       // Audio feature range
    outputRange: [number, number];      // Visual property range
    blendMode: 'multiply' | 'add' | 'replace';
  }[];
  
  // Transform properties
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
}

export interface AudioFeatures {
  [key: string]: number;
}

export class MediaLayerManager {
  private mediaLayers: Map<string, MediaLayerConfig> = new Map();
  private layerMaterials: Map<string, THREE.ShaderMaterial> = new Map();
  private layerTextures: Map<string, THREE.Texture> = new Map();
  private layerMeshes: Map<string, THREE.Mesh> = new Map();
  
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera as THREE.OrthographicCamera;
    this.renderer = renderer;
  }
  
  /**
   * Add a media layer
   */
  public addMediaLayer(config: MediaLayerConfig): void {
    this.mediaLayers.set(config.id, config);
    
    // Create texture from media source
    const texture = this.createTextureFromSource(config.source, config.type);
    this.layerTextures.set(config.id, texture);
    
    // Create material with audio-reactive uniforms
    const material = this.createMaterial(config, texture);
    this.layerMaterials.set(config.id, material);
    
    // Create mesh
    const mesh = this.createMesh(config, material);
    this.layerMeshes.set(config.id, mesh);
    
    // Add to scene
    this.scene.add(mesh);
  }
  
  /**
   * Remove a media layer
   */
  public removeMediaLayer(id: string): void {
    const mesh = this.layerMeshes.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      this.layerMeshes.delete(id);
    }
    
    const material = this.layerMaterials.get(id);
    if (material) {
      material.dispose();
      this.layerMaterials.delete(id);
    }
    
    const texture = this.layerTextures.get(id);
    if (texture) {
      texture.dispose();
      this.layerTextures.delete(id);
    }
    
    this.mediaLayers.delete(id);
  }
  
  /**
   * Update media layer with audio features
   * @deprecated Legacy method - effects now receive modulated parameters through the mapping system
   */
  public updateWithAudioFeatures(audioFeatures: AudioFeatures): void {
    for (const [id, config] of this.mediaLayers) {
      if (!config.audioBindings) continue;
      
      const material = this.layerMaterials.get(id);
      if (!material) continue;
      
      for (const binding of config.audioBindings) {
        const featureValue = audioFeatures[binding.feature];
        if (featureValue === undefined) continue;
        
        const mappedValue = this.mapRange(
          featureValue,
          binding.inputRange[0], binding.inputRange[1],
          binding.outputRange[0], binding.outputRange[1]
        );
        
        // Apply to shader uniforms
        switch (binding.property) {
          case 'opacity':
            material.uniforms.uOpacity.value = mappedValue;
            break;
          case 'scale':
            material.uniforms.uScale.value.set(mappedValue, mappedValue);
            break;
          case 'rotation':
            material.uniforms.uRotation.value = mappedValue;
            break;
          case 'position':
            material.uniforms.uPosition.value.set(
              config.position.x + mappedValue,
              config.position.y + mappedValue
            );
            break;
        }
      }
    }
  }
  
  /**
   * Update textures (for video elements)
   */
  public updateTextures(): void {
    for (const [id, texture] of this.layerTextures) {
      if (texture instanceof THREE.VideoTexture) {
        texture.needsUpdate = true;
      }
    }
  }
  
  /**
   * Create texture from media source
   */
  private createTextureFromSource(
    source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | string,
    type: string
  ): THREE.Texture {
    switch (type) {
      case 'video':
        if (typeof source === 'string') {
          const video = document.createElement('video');
          video.src = source;
          video.loop = true;
          video.muted = true;
          video.play();
          return new THREE.VideoTexture(video);
        } else if (source instanceof HTMLVideoElement) {
          return new THREE.VideoTexture(source);
        }
        break;
        
      case 'image':
        if (typeof source === 'string') {
          return new THREE.TextureLoader().load(source);
        } else if (source instanceof HTMLImageElement) {
          return new THREE.Texture(source);
        }
        break;
        
      case 'canvas':
        if (source instanceof HTMLCanvasElement) {
          return new THREE.CanvasTexture(source);
        }
        break;
    }
    
    // Fallback to a default texture
    return new THREE.Texture();
  }
  
  /**
   * Create material with audio-reactive uniforms
   */
  private createMaterial(config: MediaLayerConfig, texture: THREE.Texture): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: `
        uniform vec2 uPosition;
        uniform vec2 uScale;
        uniform float uRotation;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          
          vec3 pos = position;
          
          // Apply scale
          pos.xy *= uScale;
          
          // Apply rotation
          float c = cos(uRotation);
          float s = sin(uRotation);
          mat2 rotationMatrix = mat2(c, -s, s, c);
          pos.xy = rotationMatrix * pos.xy;
          
          // Apply position
          pos.xy += uPosition;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uOpacity;
        varying vec2 vUv;
        
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          gl_FragColor = vec4(texel.rgb, texel.a * uOpacity);
        }
      `,
      uniforms: {
        tDiffuse: new THREE.Uniform(texture),
        uOpacity: new THREE.Uniform(config.opacity),
        uPosition: new THREE.Uniform(new THREE.Vector2(config.position.x, config.position.y)),
        uScale: new THREE.Uniform(new THREE.Vector2(config.scale.x, config.scale.y)),
        uRotation: new THREE.Uniform(config.rotation)
      },
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
  }
  
  /**
   * Create mesh for media layer
   */
  private createMesh(config: MediaLayerConfig, material: THREE.ShaderMaterial): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set initial transform
    mesh.position.set(config.position.x, config.position.y, -config.zIndex);
    mesh.scale.set(config.scale.x, config.scale.y, 1);
    mesh.rotation.z = config.rotation;
    
    return mesh;
  }
  
  /**
   * Map value from one range to another
   */
  private mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }
  
  /**
   * Get media layer by ID
   */
  public getMediaLayer(id: string): MediaLayerConfig | undefined {
    return this.mediaLayers.get(id);
  }
  
  /**
   * Get all media layer IDs
   */
  public getMediaLayerIds(): string[] {
    return [...this.mediaLayers.keys()];
  }
  
  /**
   * Update layer configuration
   */
  public updateLayerConfig(id: string, updates: Partial<MediaLayerConfig>): void {
    const config = this.mediaLayers.get(id);
    if (!config) return;
    
    Object.assign(config, updates);
    
    // Update material uniforms
    const material = this.layerMaterials.get(id);
    if (material) {
      if (updates.opacity !== undefined) {
        material.uniforms.uOpacity.value = updates.opacity;
      }
      if (updates.position !== undefined) {
        material.uniforms.uPosition.value.set(updates.position.x, updates.position.y);
      }
      if (updates.scale !== undefined) {
        material.uniforms.uScale.value.set(updates.scale.x, updates.scale.y);
      }
      if (updates.rotation !== undefined) {
        material.uniforms.uRotation.value = updates.rotation;
      }
    }
    
    // Update mesh transform
    const mesh = this.layerMeshes.get(id);
    if (mesh) {
      if (updates.position !== undefined) {
        mesh.position.set(updates.position.x, updates.position.y, -config.zIndex);
      }
      if (updates.scale !== undefined) {
        mesh.scale.set(updates.scale.x, updates.scale.y, 1);
      }
      if (updates.rotation !== undefined) {
        mesh.rotation.z = updates.rotation;
      }
      if (updates.zIndex !== undefined) {
        mesh.position.z = -updates.zIndex;
      }
    }
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    for (const [id] of this.mediaLayers) {
      this.removeMediaLayer(id);
    }
    
    this.mediaLayers.clear();
    this.layerMaterials.clear();
    this.layerTextures.clear();
    this.layerMeshes.clear();
  }
} 