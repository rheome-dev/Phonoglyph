import * as THREE from 'three';
import { MultiLayerCompositor } from './MultiLayerCompositor';
import { Layer } from '@/types/video-composition';

/**
 * MediaLayerManager - Manages 2D canvas, video, and image layers for GPU compositing
 * 
 * This class bridges the gap between traditional web media elements (canvas, video, img)
 * and the GPU-based compositing system. It handles:
 * 
 * - Converting 2D canvas content to WebGL textures
 * - Streaming video frames to GPU textures
 * - Managing image assets as textures
 * - Applying audio-reactive transformations to media layers
 * - Efficient texture updates and memory management
 */

export interface MediaLayerConfig {
  id: string;
  type: 'canvas' | 'video' | 'image';
  source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | string;
  blendMode: string;
  opacity: number;
  zIndex: number;
  enabled: boolean;
  
  // Audio-reactive properties
  audioBindings?: {
    feature: string;
    property: 'opacity' | 'scale' | 'rotation' | 'position';
    inputRange: [number, number];
    outputRange: [number, number];
    blendMode: 'multiply' | 'add' | 'replace';
  }[];
  
  // Transform properties
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
}

export class MediaLayerManager {
  private compositor: MultiLayerCompositor;
  private renderer: THREE.WebGLRenderer;
  
  // Media layer storage
  private mediaLayers: Map<string, MediaLayerConfig> = new Map();
  private layerTextures: Map<string, THREE.Texture> = new Map();
  private layerMaterials: Map<string, THREE.ShaderMaterial> = new Map();
  private layerMeshes: Map<string, THREE.Mesh> = new Map();
  
  // Shared geometry for all media layers
  private quadGeometry: THREE.PlaneGeometry;
  private quadCamera: THREE.OrthographicCamera;
  
  // Update tracking
  private needsUpdate: Set<string> = new Set();
  
  constructor(compositor: MultiLayerCompositor, renderer: THREE.WebGLRenderer) {
    this.compositor = compositor;
    this.renderer = renderer;
    
    // Create shared geometry
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    console.log('🎬 MediaLayerManager initialized');
  }
  
  /**
   * Add a new media layer
   */
  public addMediaLayer(config: MediaLayerConfig): void {
    // Store configuration
    this.mediaLayers.set(config.id, config);
    
    // Create texture based on media type
    const texture = this.createTextureFromSource(config.source);
    this.layerTextures.set(config.id, texture);
    
    // Create shader material for this layer
    const material = this.createMediaLayerMaterial(config, texture);
    this.layerMaterials.set(config.id, material);
    
    // Create mesh
    const mesh = new THREE.Mesh(this.quadGeometry, material);
    this.layerMeshes.set(config.id, mesh);
    
    // Create scene for this layer
    const layerScene = new THREE.Scene();
    layerScene.add(mesh);
    
    // Add layer to compositor
    this.compositor.createLayer(config.id, layerScene, this.quadCamera, {
      blendMode: config.blendMode,
      opacity: config.opacity,
      zIndex: config.zIndex,
      enabled: config.enabled
    });
    
    console.log(`🎬 Added media layer: ${config.id} (${config.type})`);
  }
  
  /**
   * Remove a media layer
   */
  public removeMediaLayer(id: string): void {
    // Remove from compositor
    this.compositor.removeLayer(id);
    
    // Dispose resources
    const texture = this.layerTextures.get(id);
    if (texture) {
      texture.dispose();
      this.layerTextures.delete(id);
    }
    
    const material = this.layerMaterials.get(id);
    if (material) {
      material.dispose();
      this.layerMaterials.delete(id);
    }
    
    // Clean up references
    this.layerMeshes.delete(id);
    this.mediaLayers.delete(id);
    this.needsUpdate.delete(id);
    
    console.log(`🗑️ Removed media layer: ${id}`);
  }
  
  /**
   * Update media layer properties
   */
  public updateMediaLayer(id: string, updates: Partial<MediaLayerConfig>): void {
    const config = this.mediaLayers.get(id);
    if (!config) return;
    
    // Update configuration
    Object.assign(config, updates);
    
    // Update compositor layer properties
    this.compositor.updateLayer(id, {
      blendMode: config.blendMode,
      opacity: config.opacity,
      zIndex: config.zIndex,
      enabled: config.enabled
    });
    
    // Mark for material update
    this.needsUpdate.add(id);
  }
  
  /**
   * Update media layer with audio features
   */
  public updateWithAudioFeatures(audioFeatures: Record<string, number>): void {
    for (const [id, config] of this.mediaLayers) {
      if (!config.audioBindings || config.audioBindings.length === 0) continue;
      
      let hasChanges = false;
      const material = this.layerMaterials.get(id);
      if (!material) continue;
      
      // Apply audio bindings
      for (const binding of config.audioBindings) {
        const featureValue = audioFeatures[binding.feature];
        if (featureValue === undefined) continue;
        
        // Map feature value to output range
        const mappedValue = this.mapRange(
          featureValue,
          binding.inputRange[0],
          binding.inputRange[1],
          binding.outputRange[0],
          binding.outputRange[1]
        );
        
        // Apply to material uniforms based on property
        switch (binding.property) {
          case 'opacity':
            if (binding.blendMode === 'multiply') {
              material.uniforms.uOpacity.value *= mappedValue;
            } else if (binding.blendMode === 'add') {
              material.uniforms.uOpacity.value += mappedValue;
            } else {
              material.uniforms.uOpacity.value = mappedValue;
            }
            hasChanges = true;
            break;
            
          case 'scale':
            if (binding.blendMode === 'multiply') {
              material.uniforms.uScale.value.multiplyScalar(mappedValue);
            } else if (binding.blendMode === 'add') {
              material.uniforms.uScale.value.addScalar(mappedValue);
            } else {
              material.uniforms.uScale.value.set(mappedValue, mappedValue);
            }
            hasChanges = true;
            break;
            
          case 'rotation':
            if (binding.blendMode === 'add') {
              material.uniforms.uRotation.value += mappedValue;
            } else {
              material.uniforms.uRotation.value = mappedValue;
            }
            hasChanges = true;
            break;
            
          case 'position':
            if (binding.blendMode === 'add') {
              material.uniforms.uPosition.value.addScalar(mappedValue);
            } else {
              material.uniforms.uPosition.value.set(mappedValue, mappedValue);
            }
            hasChanges = true;
            break;
        }
      }
      
      if (hasChanges) {
        this.needsUpdate.add(id);
      }
    }
  }
  
  /**
   * Update all media textures (call this every frame)
   */
  public updateTextures(): void {
    for (const [id, config] of this.mediaLayers) {
      const texture = this.layerTextures.get(id);
      if (!texture) continue;
      
      // Update texture based on media type
      if (config.type === 'canvas' && config.source instanceof HTMLCanvasElement) {
        // Canvas textures need to be updated every frame if content changes
        texture.needsUpdate = true;
      } else if (config.type === 'video' && config.source instanceof HTMLVideoElement) {
        // Video textures need to be updated every frame
        if (config.source.readyState >= config.source.HAVE_CURRENT_DATA) {
          texture.needsUpdate = true;
        }
      }
      // Image textures typically don't need frequent updates
    }
    
    // Update materials that need updates
    for (const id of this.needsUpdate) {
      this.updateMaterialUniforms(id);
    }
    this.needsUpdate.clear();
  }
  
  /**
   * Create texture from media source
   */
  private createTextureFromSource(source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | string): THREE.Texture {
    let texture: THREE.Texture;
    
    if (typeof source === 'string') {
      // Load image from URL
      texture = new THREE.TextureLoader().load(source);
    } else if (source instanceof HTMLCanvasElement) {
      // Canvas texture
      texture = new THREE.CanvasTexture(source);
    } else if (source instanceof HTMLVideoElement) {
      // Video texture
      texture = new THREE.VideoTexture(source);
    } else if (source instanceof HTMLImageElement) {
      // Image texture
      texture = new THREE.Texture(source);
      texture.needsUpdate = true;
    } else {
      throw new Error('Unsupported media source type');
    }
    
    // Configure texture
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    return texture;
  }
  
  /**
   * Create shader material for media layer
   */
  private createMediaLayerMaterial(config: MediaLayerConfig, texture: THREE.Texture): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uOpacity: { value: config.opacity },
        uPosition: { value: new THREE.Vector2(config.position.x, config.position.y) },
        uScale: { value: new THREE.Vector2(config.scale.x, config.scale.y) },
        uRotation: { value: config.rotation },
        uTime: { value: 0.0 }
      },
      vertexShader: `
        uniform vec2 uPosition;
        uniform vec2 uScale;
        uniform float uRotation;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          
          // Apply transformations
          vec3 pos = position;
          
          // Scale
          pos.xy *= uScale;
          
          // Rotation
          float c = cos(uRotation);
          float s = sin(uRotation);
          mat2 rotationMatrix = mat2(c, -s, s, c);
          pos.xy = rotationMatrix * pos.xy;
          
          // Position
          pos.xy += uPosition;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uOpacity;
        varying vec2 vUv;
        
        void main() {
          vec4 texel = texture2D(uTexture, vUv);
          gl_FragColor = vec4(texel.rgb, texel.a * uOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }
  
  /**
   * Update material uniforms
   */
  private updateMaterialUniforms(id: string): void {
    const config = this.mediaLayers.get(id);
    const material = this.layerMaterials.get(id);
    
    if (!config || !material) return;
    
    // Update uniforms from config
    material.uniforms.uOpacity.value = config.opacity;
    material.uniforms.uPosition.value.set(config.position.x, config.position.y);
    material.uniforms.uScale.value.set(config.scale.x, config.scale.y);
    material.uniforms.uRotation.value = config.rotation;
  }
  
  /**
   * Map value from input range to output range
   */
  private mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }
  
  /**
   * Get all media layer IDs
   */
  public getLayerIds(): string[] {
    return Array.from(this.mediaLayers.keys());
  }
  
  /**
   * Get media layer configuration
   */
  public getLayerConfig(id: string): MediaLayerConfig | undefined {
    return this.mediaLayers.get(id);
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Dispose textures
    for (const texture of this.layerTextures.values()) {
      texture.dispose();
    }
    
    // Dispose materials
    for (const material of this.layerMaterials.values()) {
      material.dispose();
    }
    
    // Dispose geometry
    this.quadGeometry.dispose();
    
    // Clear collections
    this.mediaLayers.clear();
    this.layerTextures.clear();
    this.layerMaterials.clear();
    this.layerMeshes.clear();
    this.needsUpdate.clear();
    
    console.log('🗑️ MediaLayerManager disposed');
  }
}
