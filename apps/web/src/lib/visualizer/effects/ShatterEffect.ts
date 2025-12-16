import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface ShatterConfig {
    intensity: number; // 0.0 to 1.0
    scale: number; // 0.1 to 5.0
    speed: number; // 0.0 to 2.0
}

export class ShatterEffect extends BaseShaderEffect {
    id = 'shatter';
    name = 'Shatter';
    description = 'Voronoi-based glass shatter distortion';
    parameters: ShatterConfig;

    constructor(config: Partial<ShatterConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, scale: 1.0, speed: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uScale: { value: this.parameters.scale },
            uSpeed: { value: this.parameters.speed }
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
      uniform float uSpeed;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      vec2 random2(vec2 p) {
        return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
      }

      mat2 rot(float a) {
        return mat2(cos(a), -sin(a), sin(a), cos(a));
      }

      vec2 voronoidNoise(vec2 st) {
        vec2 i_st = floor(st);
        vec2 f_st = fract(st);
        
        float m_dist = 15.0;
        vec2 m_point;
        
        for (int j = -1; j <= 1; j++ ) {
            for (int i = -1; i <= 1; i++ ) {
                vec2 neighbor = vec2(float(i), float(j));
                vec2 point = random2(i_st + neighbor);
                point = 0.5 + 0.5 * sin(5.0 + uTime * 0.2 * uSpeed + 6.2831 * point);
                
                vec2 diff = neighbor + point - f_st;
                float dist = length(diff);
                
                if( dist < m_dist ) {
                    m_dist = dist;
                    m_point = point;
                }
            }
        }
        return m_point;
      }

      vec2 voronoiFBM(vec2 st) {
        vec2 value = vec2(0.0);
        vec2 shift = vec2(100.0);
        float xp = sqrt(2.0);
        mat2 r = rot(0.5);
        
        for (int i = 0; i < 2; i++) {
            value += voronoidNoise(st);
            st = st * xp + shift;
            st = r * st;
        }
        return value / 2.0;
      }

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        vec2 st = (uv - 0.5) * vec2(aspectRatio, 1.0) * 10.0 * uScale;
        st = st * rot(0.1134 * 2.0 * PI);
        
        vec2 m_point = voronoiFBM(st);
        vec2 offset = (m_point * 0.2 * 0.5) - 0.05;
        
        gl_FragColor = texture2D(uTexture, uv + offset * uIntensity);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uSpeed.value = this.parameters.speed;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
        }
    }
}
