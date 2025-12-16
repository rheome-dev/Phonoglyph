import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface FlowfieldConfig {
    intensity: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
    scale: number; // 0.1 to 5.0
}

export class FlowfieldEffect extends BaseShaderEffect {
    id = 'flowfield';
    name = 'Flowfield';
    description = 'Fluid flow distortion using Perlin noise';
    parameters: FlowfieldConfig;

    constructor(config: Partial<FlowfieldConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, speed: 0.5, scale: 1.0, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uSpeed: { value: this.parameters.speed },
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
      uniform float uSpeed;
      uniform float uScale;
      
      varying vec2 vUv;
      
      const float PI = 3.1415926;
      const float MAX_ITERATIONS = 16.0;

      // 3D Hash function
      vec3 hash33(vec3 p3) {
        p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
        p3 += dot(p3, p3.yxz + 19.19);
        return -1.0 + 2.0 * fract(vec3(
          (p3.x + p3.y) * p3.z,
          (p3.x + p3.z) * p3.y,
          (p3.y + p3.z) * p3.x
        ));
      }

      // 3D Perlin Noise
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

      vec2 flow(in vec2 st) {
        float aspectRatio = uResolution.x / uResolution.y;
        float sprd = (0.5000 + 0.01) / ((aspectRatio + 1.) / 2.) * uScale;
        float amt = 0.5000 * 0.01 * uIntensity;
        
        if(amt <= 0.0) return st;
        
        float freq = 5.0 * sprd;
        float t = uTime * uSpeed * 0.05;
        float degrees = 360.0 * 3.0;
        float radians = degrees * PI / 180.0;

        for (float i = 0.0; i < MAX_ITERATIONS; i++) {
          vec2 scaled = (st - 0.5) * vec2(aspectRatio, 1.0) + 0.5;
          float perlin = perlin_noise(vec3((scaled - 0.5) * freq, t)) - 0.5;
          float ang = perlin * radians;
          st += vec2(cos(ang), sin(ang)) * amt;
          st = clamp(st, 0.0, 1.0);
        }
        return st;
      }

      void main() {
        vec2 uv = vUv;
        vec2 flowUv = flow(uv);
        gl_FragColor = texture2D(uTexture, flowUv);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uScale.value = this.parameters.scale;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
        }
    }
}
