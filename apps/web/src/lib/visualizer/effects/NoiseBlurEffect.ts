import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface NoiseBlurConfig {
  intensity: number; // 0.0 to 1.0
  scale: number; // 0.1 to 5.0
}

export class NoiseBlurEffect extends BaseShaderEffect {
  id = 'noiseBlur';
  name = 'Noise Blur';
  description = 'Noise-driven directional blur';
  parameters: NoiseBlurConfig;

  constructor(config: Partial<NoiseBlurConfig> = {}) {
    super();
    this.parameters = { intensity: 0.5, scale: 1.5, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uScale: { value: this.parameters.scale }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uScale;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      vec2 noiseDir(vec2 p) {
        float angle = hash(p + uTime * 0.025) * 6.283185;
        return vec2(cos(angle), sin(angle));
      }

      void main() {
        vec2 uv = vUv;
        vec2 noiseP = uv * uScale * 5.0;
        vec2 blurDir = noiseDir(noiseP);
        
        vec4 color = vec4(0.0);
        float blurAmount = uIntensity * 0.01;
        
        for (int i = -4; i <= 4; i++) {
          float t = float(i) / 4.0;
          vec2 offset = blurDir * t * blurAmount;
          color += texture2D(uTexture, uv + offset) / 9.0;
        }
        
        gl_FragColor = color;
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uScale.value = this.parameters.scale;
  }

  updateParameter(paramName: string, value: any): void {
    if (paramName === 'intensity') {
      this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
      if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
    } else if (paramName === 'scale') {
      this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.scale;
      if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
    }
  }
}
