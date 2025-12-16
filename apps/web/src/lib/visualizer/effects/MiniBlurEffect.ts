import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface MiniBlurConfig {
  intensity: number; // 0.0 to 1.0
}

export class MiniBlurEffect extends BaseShaderEffect {
  id = 'miniBlur';
  name = 'Mini Blur';
  description = 'Fast lightweight blur';
  parameters: MiniBlurConfig;

  constructor(config: Partial<MiniBlurConfig> = {}) {
    super();
    this.parameters = { intensity: 0.5, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return { uIntensity: { value: this.parameters.intensity } };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      varying vec2 vUv;

      void main() {
        vec2 pixel = vec2(1.0) / uResolution;
        vec4 color = texture2D(uTexture, vUv) * 0.4;
        color += texture2D(uTexture, vUv + vec2(pixel.x, 0.0)) * 0.15;
        color += texture2D(uTexture, vUv - vec2(pixel.x, 0.0)) * 0.15;
        color += texture2D(uTexture, vUv + vec2(0.0, pixel.y)) * 0.15;
        color += texture2D(uTexture, vUv - vec2(0.0, pixel.y)) * 0.15;
        
        gl_FragColor = mix(texture2D(uTexture, vUv), color, uIntensity);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
  }

  updateParameter(paramName: string, value: any): void {
    if (paramName === 'intensity') {
      this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
      if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
    }
  }
}
