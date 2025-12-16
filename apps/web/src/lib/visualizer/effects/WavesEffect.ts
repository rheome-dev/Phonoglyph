import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface WavesConfig {
    intensity: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
}

export class WavesEffect extends BaseShaderEffect {
    id = 'waves';
    name = 'Noise Waves';
    description = 'Perlin noise wave distortion';
    parameters: WavesConfig;

    constructor(config: Partial<WavesConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, speed: 1.0, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
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
      uniform float uSpeed;
      varying vec2 vUv;

      // Hashing function for Perlin Noise
      vec3 hash33(vec3 p3) {
        p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
        p3 += dot(p3, p3.yxz + 19.19);
        return -1.0 + 2.0 * fract(vec3(
            (p3.x + p3.y) * p3.z,
            (p3.x + p3.z) * p3.y,
            (p3.y + p3.z) * p3.x
        ));
      }

      // 3D Perlin Noise function
      float perlin_noise(vec3 p) {
        vec3 pi = floor(p);
        vec3 pf = p - pi;
        vec3 w = pf * pf * (3.0 - 2.0 * pf);
        
        float n000 = dot(pf - vec3(0.0, 0.0, 0.0), hash33(pi + vec3(0.0, 0.0, 0.0)));
        float n100 = dot(pf - vec3(1.0, 0.0, 0.0), hash33(pi + vec3(1.0, 0.0, 0.0)));
        float n010 = dot(pf - vec3(0.0, 1.0, 0.0), hash33(pi + vec3(0.0, 1.0, 0.0)));
        float n110 = dot(pf - vec3(1.0, 1.0, 0.0), hash33(pi + vec3(1.0, 1.0, 0.0)));
        float n001 = dot(pf - vec3(0.0, 0.0, 1.0), hash33(pi + vec3(0.0, 0.0, 1.0)));
        float n101 = dot(pf - vec3(1.0, 0.0, 1.0), hash33(pi + vec3(1.0, 0.0, 1.0)));
        float n011 = dot(pf - vec3(0.0, 1.0, 1.0), hash33(pi + vec3(0.0, 1.0, 1.0)));
        float n111 = dot(pf - vec3(1.0, 1.0, 1.0), hash33(pi + vec3(1.0, 1.0, 1.0)));
        
        float nx00 = mix(n000, n100, w.x);
        float nx01 = mix(n001, n101, w.x);
        float nx10 = mix(n010, n110, w.x);
        float nx11 = mix(n011, n111, w.x);
        
        float nxy0 = mix(nx00, nx10, w.y);
        float nxy1 = mix(nx01, nx11, w.y);
        
        float nxyz = mix(nxy0, nxy1, w.z);
        
        return nxyz;
      }

      void main() {
        vec2 uv = vUv;
        
        float time = uTime * 0.5 * uSpeed;
        
        // Calculate noise value
        float value = perlin_noise(vec3(uv * 5.0, time)) * uIntensity * 0.2;
        
        // Apply distortion to UVs
        vec2 distortedUV = uv + vec2(0.0, value);
        
        // Mirror UVs (from original shader logic)
        // distortedUV = vec2(1.0 - distortedUV.x, 1.0 - distortedUV.y);
        
        gl_FragColor = texture2D(uTexture, distortedUV);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uSpeed.value = this.parameters.speed;
    }

    updateParameter(paramName: string, value: any): void {
        if (paramName === 'intensity') {
            this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
            if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        } else if (paramName === 'speed') {
            this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
            if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
        }
    }
}
