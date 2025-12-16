import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface FogConfig {
  density: number; // 0.0 to 1.0
  speed: number; // 0.0 to 2.0
  color: number[]; // [r, g, b]
}

export class FogEffect extends BaseShaderEffect {
  id = 'fog';
  name = 'Fog';
  description = 'Animated fog effect with noise';
  parameters: FogConfig;

  constructor(config: Partial<FogConfig> = {}) {
    super();
    this.parameters = { density: 0.3, speed: 0.5, color: [1.0, 1.0, 1.0], ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uDensity: { value: this.parameters.density },
      uSpeed: { value: this.parameters.speed },
      uFogColor: { value: new THREE.Color(this.parameters.color[0], this.parameters.color[1], this.parameters.color[2]) }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uDensity;
      uniform float uSpeed;
      uniform vec3 uFogColor;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = vUv;
        vec2 p = uv * 3.0 - vec2(uTime * uSpeed * 0.05, 0.0);
        float fogAmount = fbm(p) * uDensity;
        
        vec4 texColor = texture2D(uTexture, uv);
        gl_FragColor = mix(texColor, vec4(uFogColor, 1.0), fogAmount);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uDensity.value = this.parameters.density;
    this.uniforms.uSpeed.value = this.parameters.speed;
    this.uniforms.uFogColor.value.setRGB(this.parameters.color[0], this.parameters.color[1], this.parameters.color[2]);
  }

  updateParameter(paramName: string, value: any): void {
    switch (paramName) {
      case 'density':
        this.parameters.density = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.density;
        if (this.uniforms) this.uniforms.uDensity.value = this.parameters.density;
        break;
      case 'speed':
        this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
        if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
        break;
      case 'color':
        if (Array.isArray(value) && value.length === 3) {
          this.parameters.color = value;
          if (this.uniforms) this.uniforms.uFogColor.value.setRGB(value[0], value[1], value[2]);
        }
        break;
    }
  }
}
