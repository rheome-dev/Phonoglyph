import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface RippleConfig {
  intensity: number; // 0.0 to 1.0
  frequency: number; // 1.0 to 20.0
  speed: number; // 0.0 to 2.0
  centerX: number; // 0.0 to 1.0
  centerY: number; // 0.0 to 1.0
}

export class RippleEffect extends BaseShaderEffect {
  id = 'ripple';
  name = 'Ripple';
  description = 'Concentric ripple distortion';
  parameters: RippleConfig;

  constructor(config: Partial<RippleConfig> = {}) {
    super();
    this.parameters = { intensity: 0.05, frequency: 10.0, speed: 1.0, centerX: 0.5, centerY: 0.5, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uFrequency: { value: this.parameters.frequency },
      uSpeed: { value: this.parameters.speed },
      uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uFrequency;
      uniform float uSpeed;
      uniform vec2 uCenter;
      uniform float uTime;
      
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        vec2 tc = uv - uCenter;
        tc.x *= aspectRatio;
        
        float dist = length(tc);
        float angle = atan(tc.y, tc.x);
        
        float radius = dist;
        radius += sin(dist * uFrequency - uTime * uSpeed) * uIntensity * 0.05;
        
        tc = vec2(cos(angle), sin(angle)) * radius;
        tc.x /= aspectRatio;
        
        gl_FragColor = texture2D(uTexture, tc + uCenter);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uFrequency.value = this.parameters.frequency;
    this.uniforms.uSpeed.value = this.parameters.speed;
    this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
  }

  updateParameter(paramName: string, value: any): void {
    switch (paramName) {
      case 'intensity':
        this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
        if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        break;
      case 'frequency':
        this.parameters.frequency = typeof value === 'number' ? Math.max(1.0, Math.min(20.0, value)) : this.parameters.frequency;
        if (this.uniforms) this.uniforms.uFrequency.value = this.parameters.frequency;
        break;
      case 'speed':
        this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
        if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
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
