import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface BulgeConfig {
  intensity: number; // 0.0 to 2.0
  centerX: number; // 0.0 to 1.0
  centerY: number; // 0.0 to 1.0
  radius: number; // 0.1 to 1.0
}

export class BulgeEffect extends BaseShaderEffect {
  id = 'bulge';
  name = 'Bulge';
  description = 'Bulge/pinch distortion effect';
  parameters: BulgeConfig;

  constructor(config: Partial<BulgeConfig> = {}) {
    super();
    this.parameters = { intensity: 0.5, centerX: 0.5, centerY: 0.5, radius: 0.4, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) },
      uRadius: { value: this.parameters.radius }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform vec2 uCenter;
      uniform float uRadius;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        vec2 center = uCenter;
        vec2 tc = uv - center;
        tc.x *= aspectRatio;
        
        float dist = length(tc);
        if (dist < uRadius) {
          float percent = 1.0 - (dist / uRadius);
          percent = percent * percent;
          tc *= 1.0 - uIntensity * percent * 0.5;
        }
        
        tc.x /= aspectRatio;
        gl_FragColor = texture2D(uTexture, tc + center);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
    this.uniforms.uRadius.value = this.parameters.radius;
  }

  updateParameter(paramName: string, value: any): void {
    switch (paramName) {
      case 'intensity':
        this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
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
      case 'radius':
        this.parameters.radius = typeof value === 'number' ? Math.max(0.1, Math.min(1.0, value)) : this.parameters.radius;
        if (this.uniforms) this.uniforms.uRadius.value = this.parameters.radius;
        break;
    }
  }
}
