import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { AudioTextureManager } from '../core/AudioTextureManager';

/**
 * TextureBasedEffect - Base class for GPU-optimized visual effects
 * 
 * This implements the modV optimization strategy:
 * - Uses texture-based audio feature access instead of individual uniforms
 * - Eliminates per-frame JavaScript parameter updates
 * - Enables complex audio-reactive shaders with minimal CPU overhead
 */

export interface TextureBasedEffectConfig {
  id: string;
  name: string;
  description: string;
  enabled?: boolean;
  parameters?: Record<string, any>;
}

export abstract class TextureBasedEffect implements VisualEffect {
  public id: string;
  public name: string;
  public description: string;
  public enabled: boolean;
  public parameters: Record<string, any>;
  
  protected scene!: THREE.Scene;
  protected camera!: THREE.Camera;
  protected renderer!: THREE.WebGLRenderer;
  protected audioTextureManager!: AudioTextureManager;
  
  // Shader components
  protected material!: THREE.ShaderMaterial;
  protected uniforms: Record<string, THREE.IUniform> = {};
  protected mesh!: THREE.Mesh;
  
  // Performance tracking
  private lastParameterUpdate: number = 0;
  private parameterUpdateInterval: number = 100; // Update parameters every 100ms max
  
  constructor(config: TextureBasedEffectConfig) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.enabled = config.enabled ?? true;
    this.parameters = config.parameters ?? {};
  }
  
  /**
   * Initialize the effect with audio texture support
   */
  public init(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // Get audio texture manager from renderer (should be attached by VisualizerManager)
    this.audioTextureManager = (renderer as any).audioTextureManager;
    
    if (!this.audioTextureManager) {
      console.warn(`⚠️ AudioTextureManager not found for effect ${this.name}. Falling back to uniform-based approach.`);
    }
    
    this.setupUniforms();
    this.createMaterial();
    this.createMesh();
    
    console.log(`✅ Initialized texture-based effect: ${this.name}`);
  }
  
  /**
   * Setup uniforms including audio texture uniforms
   */
  protected setupUniforms(): void {
    // Base uniforms that all effects need
    this.uniforms = {
      uTime: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(1024, 1024) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      ...this.getParameterUniforms(),
    };
    
    // Add audio texture uniforms if available
    if (this.audioTextureManager) {
      Object.assign(this.uniforms, this.audioTextureManager.getShaderUniforms());
    }
    
    // Add effect-specific uniforms
    Object.assign(this.uniforms, this.getCustomUniforms());
  }
  
  /**
   * Convert parameters to uniforms (for non-audio-reactive parameters)
   */
  protected getParameterUniforms(): Record<string, THREE.IUniform> {
    const uniforms: Record<string, THREE.IUniform> = {};
    
    for (const [key, value] of Object.entries(this.parameters)) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      
      if (typeof value === 'number') {
        uniforms[uniformKey] = { value };
      } else if (Array.isArray(value) && value.length === 3) {
        uniforms[uniformKey] = { value: new THREE.Color(...value) };
      } else if (Array.isArray(value) && value.length === 2) {
        uniforms[uniformKey] = { value: new THREE.Vector2(...value) };
      }
    }
    
    return uniforms;
  }
  
  /**
   * Get the complete shader code including audio texture functions
   */
  protected getShaderCode(): string {
    const audioShaderCode = this.audioTextureManager?.getShaderCode() ?? '';
    const customShaderCode = this.getCustomShaderCode();
    
    return `
      ${audioShaderCode}
      ${customShaderCode}
    `;
  }
  
  /**
   * Update effect - optimized to minimize CPU overhead
   */
  public update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
    if (!this.uniforms) return;
    
    // Update time (always needed for animations)
    this.uniforms.uTime.value += deltaTime;
    
    // Update audio texture manager time sync
    if (this.audioTextureManager) {
      // Time sync is handled by the AudioTextureManager, not per-effect
      // This eliminates the need for per-frame audio data processing
    }
    
    // Update non-audio parameters less frequently to reduce CPU overhead
    const now = performance.now();
    if (now - this.lastParameterUpdate > this.parameterUpdateInterval) {
      this.updateParameterUniforms();
      this.lastParameterUpdate = now;
    }
    
    // Custom update logic (should be minimal for texture-based effects)
    this.customUpdate(deltaTime, audioData, midiData);
  }
  
  /**
   * Update parameter uniforms (non-audio-reactive parameters only)
   */
  protected updateParameterUniforms(): void {
    for (const [key, value] of Object.entries(this.parameters)) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      
      if (this.uniforms[uniformKey]) {
        if (typeof value === 'number') {
          this.uniforms[uniformKey].value = value;
        } else if (Array.isArray(value) && value.length === 3) {
          this.uniforms[uniformKey].value.set(...value);
        } else if (Array.isArray(value) && value.length === 2) {
          this.uniforms[uniformKey].value.set(...value);
        }
      }
    }
  }
  
  /**
   * Update a specific parameter (called from external parameter mapping)
   */
  public updateParameter(paramName: string, value: any): void {
    // Update the parameter value
    this.parameters[paramName] = value;
    
    // For texture-based effects, we don't need to update uniforms immediately
    // The parameter will be updated on the next scheduled update cycle
    // This reduces the CPU overhead of frequent parameter changes
  }
  
  /**
   * Create the mesh for this effect
   */
  protected createMesh(): void {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
  }
  
  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
  }
  
  // Abstract methods that subclasses must implement
  
  /**
   * Get custom uniforms specific to this effect
   */
  protected abstract getCustomUniforms(): Record<string, THREE.IUniform>;
  
  /**
   * Get custom shader code specific to this effect
   */
  protected abstract getCustomShaderCode(): string;
  
  /**
   * Create the shader material for this effect
   */
  protected abstract createMaterial(): void;
  
  /**
   * Custom update logic (should be minimal for performance)
   */
  protected abstract customUpdate(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void;
}

/**
 * Helper function to create feature index constants for shaders
 */
export function createFeatureIndexConstants(audioTextureManager: AudioTextureManager, stemType: string): string {
  const features = ['rms', 'spectralCentroid', 'spectralRolloff', 'spectralFlatness'];
  
  let constants = `// Feature indices for ${stemType}\n`;
  
  features.forEach(feature => {
    const index = audioTextureManager.getFeatureIndex(stemType, feature);
    if (index >= 0) {
      const constantName = `${stemType.toUpperCase()}_${feature.toUpperCase()}`;
      constants += `#define ${constantName} ${index.toFixed(1)}\n`;
    }
  });
  
  return constants;
}

/**
 * Example usage in a concrete effect:
 * 
 * ```glsl
 * // In fragment shader:
 * void main() {
 *   // Sample drum RMS energy directly from texture
 *   float drumEnergy = sampleAudioFeature(DRUMS_RMS);
 *   
 *   // Sample bass spectral centroid with time offset
 *   float bassFreq = sampleAudioFeatureAtTime(BASS_SPECTRALCENTROID, -0.1);
 *   
 *   // Use features for visual effects
 *   vec3 color = mix(baseColor, highlightColor, drumEnergy);
 *   color *= (1.0 + bassFreq * 0.5);
 *   
 *   gl_FragColor = vec4(color, 1.0);
 * }
 * ```
 */
