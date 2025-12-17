import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface BloomConfig {
  intensity: number; // 0.0 to 2.0
  threshold: number; // 0.0 to 1.0
  radius: number; // 0.0 to 2.0
}

export class BloomEffect extends BaseShaderEffect {
  id = 'bloom';
  name = 'Bloom';
  description = 'High-quality bloom effect';
  parameters: BloomConfig;

  constructor(config: Partial<BloomConfig> = {}) {
    super();
    this.parameters = { intensity: 1.0, threshold: 0.5, radius: 1.0, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uThreshold: { value: this.parameters.threshold },
      uRadius: { value: this.parameters.radius }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uThreshold;
      uniform float uRadius;
      
      varying vec2 vUv;

      float luma(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      void main() {
        vec4 color = texture2D(uTexture, vUv);
        vec3 bloom = vec3(0.0);
        
        // Single-pass bloom approximation
        // We sample a few points around the pixel to simulate a blur
        // This is less expensive than a full multi-pass Gaussian blur but effective for a single shader
        
        float totalWeight = 0.0;
        vec2 texelSize = 1.0 / uResolution;
        
        // 9-tap box/gaussian hybrid blur
        for(float x = -2.0; x <= 2.0; x += 1.0) {
            for(float y = -2.0; y <= 2.0; y += 1.0) {
                vec2 offset = vec2(x, y) * uRadius * 2.0;
                vec4 sampleColor = texture2D(uTexture, vUv + offset * texelSize);
                
                // Thresholding
                float brightness = luma(sampleColor.rgb);
                float contribution = smoothstep(uThreshold, uThreshold + 0.1, brightness);
                
                // Weight decreases with distance
                float weight = 1.0 / (1.0 + length(vec2(x, y)));
                
                bloom += sampleColor.rgb * contribution * weight;
                totalWeight += weight;
            }
        }
        
        bloom /= totalWeight;
        
        // Composite
        gl_FragColor = vec4(color.rgb + bloom * uIntensity, color.a);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uThreshold.value = this.parameters.threshold;
    this.uniforms.uRadius.value = this.parameters.radius;
  }

  updateParameter(paramName: string, value: any): void {
    switch (paramName) {
      case 'intensity':
        this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
        if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        break;
      case 'threshold':
        this.parameters.threshold = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.threshold;
        if (this.uniforms) this.uniforms.uThreshold.value = this.parameters.threshold;
        break;
      case 'radius':
        this.parameters.radius = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.radius;
        if (this.uniforms) this.uniforms.uRadius.value = this.parameters.radius;
        break;
    }
  }
}