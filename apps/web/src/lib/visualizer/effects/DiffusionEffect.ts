import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface DiffusionConfig {
  intensity: number; // 0.0 to 1.0
  size: number; // 0.1 to 5.0
}

export class DiffusionEffect extends BaseShaderEffect {
  id = 'diffusion';
  name = 'Diffusion';
  description = 'Soft diffusion glow effect';
  parameters: DiffusionConfig;

  constructor(config: Partial<DiffusionConfig> = {}) {
    super();
    this.parameters = { intensity: 0.5, size: 1.5, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uSize: { value: this.parameters.size }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uSize;
      varying vec2 vUv;

      void main() {
        vec4 color = vec4(0.0);
        vec2 pixelSize = vec2(1.0) / uResolution;
        float radius = uSize * 0.005;
        
        // Soft box blur with falloff
        for (float x = -2.0; x <= 2.0; x++) {
          for (float y = -2.0; y <= 2.0; y++) {
            vec2 offset = vec2(x, y) * pixelSize * radius;
            float weight = 1.0 / (1.0 + length(vec2(x, y)));
            color += texture2D(uTexture, vUv + offset) * weight;
          }
        }
       

 color /= 9.0;
        
        gl_FragColor = mix(texture2D(uTexture, vUv), color, uIntensity);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uSize.value = this.parameters.size;
  }

  updateParameter(paramName: string, value: any): void {
    if (paramName === 'intensity') {
      this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
      if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
    } else if (paramName === 'size') {
      this.parameters.size = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.size;
      if (this.uniforms) this.uniforms.uSize.value = this.parameters.size;
    }
  }
}
