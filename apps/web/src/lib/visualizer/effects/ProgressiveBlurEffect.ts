import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface ProgressiveBlurConfig {
  intensity: number; // 0.0 to 1.0
  centerX: number; // 0.0 to 1.0
  centerY: number; // 0.0 to 1.0
}

export class ProgressiveBlurEffect extends BaseShaderEffect {
  id = 'progressiveBlur';
  name = 'Progressive Blur';
  description = 'Blur that increases with distance from center';
  parameters: ProgressiveBlurConfig;

  constructor(config: Partial<ProgressiveBlurConfig> = {}) {
    super();
    this.parameters = { intensity: 0.6, centerX: 0.5, centerY: 0.5, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform vec2 uCenter;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        float dist = length((uv - uCenter) * vec2(aspectRatio, 1.0));
        float blurAmount = dist * uIntensity * 0.02;
        
        vec4 color = vec4(0.0);
        vec2 pixelSize = vec2(1.0) / uResolution;
        
        int samples = int(mix(1.0, 9.0, dist * uIntensity));
        float total = 0.0;
        
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            vec2 offset = vec2(float(x), float(y)) * pixelSize * blurAmount;
            color += texture2D(uTexture, uv + offset);
            total += 1.0;
          }
        }
        
        gl_FragColor = color / total;
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
  }

  updateParameter(paramName: string, value: any): void {
    switch (paramName) {
      case 'intensity':
        this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
        if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        break;
      case 'centerX':
        this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
        if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
        break;
      case 'centerY':
        this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
        if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
        break;
    }
  }
}
