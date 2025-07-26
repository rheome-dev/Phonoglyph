import * as THREE from 'three';
import { TextureBasedEffect, createFeatureIndexConstants } from './TextureBasedEffect';
import { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';

/**
 * TextureBasedMetaballsEffect - GPU-optimized metaballs using texture-based audio access
 * 
 * This demonstrates the performance benefits of the texture-based approach:
 * - All audio features accessed directly in shader via texture sampling
 * - No per-frame JavaScript parameter updates
 * - Complex multi-stem audio reactivity with minimal CPU overhead
 * - Smooth interpolation handled by GPU texture filtering
 */

export interface MetaballConfig {
  baseRadius: number;
  smoothingFactor: number;
  noiseIntensity: number;
  animationSpeed: number;
  highlightColor: [number, number, number];
  audioReactivity: number;
  multiStemBlending: boolean;
}

export class TextureBasedMetaballsEffect extends TextureBasedEffect {
  private metaballConfig: MetaballConfig;
  
  constructor(config: Partial<MetaballConfig> = {}) {
    const defaultConfig: MetaballConfig = {
      baseRadius: 0.3,
      smoothingFactor: 0.1,
      noiseIntensity: 0.2,
      animationSpeed: 1.0,
      highlightColor: [1.0, 0.8, 0.4],
      audioReactivity: 1.0,
      multiStemBlending: true
    };
    
    super({
      id: 'texture-metaballs',
      name: 'GPU Metaballs',
      description: 'High-performance metaballs with texture-based audio reactivity',
      enabled: true,
      parameters: { ...defaultConfig, ...config }
    });
    
    this.metaballConfig = this.parameters as MetaballConfig;
  }
  
  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      // Metaball-specific uniforms (non-audio-reactive)
      uCameraPos: { value: new THREE.Vector3(0.0, 0.0, 3.0) },
      uCameraTarget: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
      
      // Configuration uniforms
      uBaseRadius: { value: this.metaballConfig.baseRadius },
      uSmoothingFactor: { value: this.metaballConfig.smoothingFactor },
      uNoiseIntensity: { value: this.metaballConfig.noiseIntensity },
      uAnimationSpeed: { value: this.metaballConfig.animationSpeed },
      uHighlightColor: { value: new THREE.Color(...this.metaballConfig.highlightColor) },
      uAudioReactivity: { value: this.metaballConfig.audioReactivity },
      uMultiStemBlending: { value: this.metaballConfig.multiStemBlending ? 1.0 : 0.0 }
    };
  }
  
  protected getCustomShaderCode(): string {
    // Generate feature index constants for all stem types
    const featureConstants = this.audioTextureManager ? [
      createFeatureIndexConstants(this.audioTextureManager, 'drums'),
      createFeatureIndexConstants(this.audioTextureManager, 'bass'),
      createFeatureIndexConstants(this.audioTextureManager, 'vocals'),
      createFeatureIndexConstants(this.audioTextureManager, 'melody'),
      createFeatureIndexConstants(this.audioTextureManager, 'master')
    ].join('\n') : '';
    
    return `
      ${featureConstants}
      
      // Metaball-specific uniforms
      uniform vec3 uCameraPos;
      uniform vec3 uCameraTarget;
      uniform float uBaseRadius;
      uniform float uSmoothingFactor;
      uniform float uNoiseIntensity;
      uniform float uAnimationSpeed;
      uniform vec3 uHighlightColor;
      uniform float uAudioReactivity;
      uniform float uMultiStemBlending;
      
      // Noise function for organic movement
      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      }
      
      // Smooth noise for organic shapes
      float smoothNoise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        return mix(
          mix(mix(noise(i), noise(i + vec3(1,0,0)), f.x),
              mix(noise(i + vec3(0,1,0)), noise(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(noise(i + vec3(0,0,1)), noise(i + vec3(1,0,1)), f.x),
              mix(noise(i + vec3(0,1,1)), noise(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      
      // Get audio-reactive radius for a metaball
      float getAudioReactiveRadius(vec3 pos, float baseRadius) {
        float radius = baseRadius;
        
        if (uAudioReactivity > 0.0) {
          // Sample multiple audio features for rich reactivity
          float drumEnergy = sampleAudioFeature(DRUMS_RMS);
          float bassEnergy = sampleAudioFeature(BASS_RMS);
          float vocalBrightness = sampleAudioFeature(VOCALS_SPECTRALCENTROID) / 8000.0;
          float melodyComplexity = sampleAudioFeature(MELODY_SPECTRALROLLOFF) / 16000.0;
          
          // Create different reactivity patterns based on position
          float positionHash = fract(sin(dot(pos.xy, vec2(12.9898, 78.233))) * 43758.5453);
          
          if (positionHash < 0.25) {
            // Drum-reactive metaballs
            radius *= (1.0 + drumEnergy * uAudioReactivity);
          } else if (positionHash < 0.5) {
            // Bass-reactive metaballs
            radius *= (1.0 + bassEnergy * uAudioReactivity * 0.8);
          } else if (positionHash < 0.75) {
            // Vocal-reactive metaballs
            radius *= (1.0 + vocalBrightness * uAudioReactivity * 0.6);
          } else {
            // Melody-reactive metaballs
            radius *= (1.0 + melodyComplexity * uAudioReactivity * 0.7);
          }
          
          // Multi-stem blending for complex interactions
          if (uMultiStemBlending > 0.5) {
            float blendedEnergy = (drumEnergy + bassEnergy + vocalBrightness + melodyComplexity) * 0.25;
            radius *= (1.0 + blendedEnergy * uAudioReactivity * 0.3);
          }
        }
        
        return radius;
      }
      
      // Get audio-reactive color
      vec3 getAudioReactiveColor(vec3 pos, vec3 baseColor) {
        if (uAudioReactivity <= 0.0) return baseColor;
        
        // Sample audio features for color modulation
        float drumImpact = sampleAudioFeature(DRUMS_RMS);
        float bassDepth = sampleAudioFeature(BASS_SPECTRALCENTROID) / 8000.0;
        float vocalPresence = sampleAudioFeature(VOCALS_RMS);
        float melodyBrightness = sampleAudioFeature(MELODY_SPECTRALCENTROID) / 8000.0;
        
        // Create position-based color variations
        float posHash = fract(sin(dot(pos.xz, vec2(45.164, 91.029))) * 43758.5453);
        
        vec3 color = baseColor;
        
        // Drum impact creates red flashes
        color.r += drumImpact * uAudioReactivity * 0.5;
        
        // Bass depth creates blue undertones
        color.b += bassDepth * uAudioReactivity * 0.4;
        
        // Vocal presence creates warm highlights
        color.rg += vocalPresence * uAudioReactivity * 0.3;
        
        // Melody brightness creates overall luminosity
        color *= (1.0 + melodyBrightness * uAudioReactivity * 0.2);
        
        return clamp(color, 0.0, 1.0);
      }
      
      // Metaball distance function with audio reactivity
      float metaballDistance(vec3 pos) {
        float time = uTime * uAnimationSpeed;
        float minDist = 1000.0;
        
        // Create multiple metaballs with different movement patterns
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          
          // Base position with organic movement
          vec3 ballPos = vec3(
            sin(time * 0.7 + fi * 2.1) * 1.5,
            cos(time * 0.5 + fi * 1.7) * 1.2,
            sin(time * 0.3 + fi * 2.3) * 0.8
          );
          
          // Add noise for organic deformation
          vec3 noiseOffset = vec3(
            smoothNoise(ballPos * 2.0 + time * 0.5) - 0.5,
            smoothNoise(ballPos * 2.0 + time * 0.3 + 100.0) - 0.5,
            smoothNoise(ballPos * 2.0 + time * 0.4 + 200.0) - 0.5
          ) * uNoiseIntensity;
          
          ballPos += noiseOffset;
          
          // Audio-reactive radius
          float radius = getAudioReactiveRadius(ballPos, uBaseRadius);
          
          // Distance to this metaball
          float dist = length(pos - ballPos) - radius;
          minDist = min(minDist, dist);
        }
        
        return minDist;
      }
      
      // Main fragment shader
      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        uv = uv * 2.0 - 1.0;
        uv.x *= uResolution.x / uResolution.y;
        
        // Ray setup
        vec3 rayOrigin = uCameraPos;
        vec3 rayDir = normalize(vec3(uv, -1.0));
        
        vec3 color = vec3(0.0);
        float alpha = 0.0;
        
        // Raymarching
        float t = 0.0;
        for (int i = 0; i < 64; i++) {
          vec3 pos = rayOrigin + rayDir * t;
          float dist = metaballDistance(pos);
          
          if (dist < 0.01) {
            // Hit surface - calculate color
            vec3 baseColor = uHighlightColor;
            color = getAudioReactiveColor(pos, baseColor);
            alpha = 1.0;
            break;
          }
          
          if (t > 10.0) break;
          
          t += dist * 0.5;
        }
        
        // Smooth blending based on distance
        if (alpha > 0.0) {
          float edge = smoothstep(0.0, 0.02, metaballDistance(rayOrigin + rayDir * t));
          alpha *= (1.0 - edge);
        }
        
        gl_FragColor = vec4(color, alpha * 0.8);
      }
    `;
  }
  
  protected createMaterial(): void {
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = this.getShaderCode();
    
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true
    });
  }
  
  protected customUpdate(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
    // Minimal custom update logic
    // Most audio reactivity is handled directly in the shader via texture sampling
    
    // Only update camera animation based on MIDI (non-audio-reactive)
    if (midiData.activeNotes.length > 0) {
      const noteIntensity = Math.min(midiData.activeNotes.length / 5.0, 1.0);
      const time = this.uniforms.uTime.value;
      
      // Subtle camera movement based on MIDI activity
      this.uniforms.uCameraPos.value.set(
        Math.sin(time * 0.3) * noteIntensity * 0.5,
        Math.cos(time * 0.2) * noteIntensity * 0.3,
        3.0 + noteIntensity * 0.5
      );
    }
  }
}
