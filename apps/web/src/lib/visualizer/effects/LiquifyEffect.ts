import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface LiquifyConfig {
    intensity: number; // 0.0 to 1.0
    frequency: number; // 1.0 to 10.0
    speed: number; // 0.0 to 2.0
}

export class LiquifyEffect extends BaseShaderEffect {
    id = 'liquify';
    name = 'Liquify';
    description = 'Sine-based liquid distortion effect';
    parameters: LiquifyConfig;

    constructor(config: Partial<LiquifyConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, frequency: 1.0, speed: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uFrequency: { value: this.parameters.frequency },
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
      uniform float uFrequency;
      uniform float uSpeed;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265;

      mat2 rot(float a) {
        return mat2(cos(a), -sin(a), sin(a), cos(a));
      }

      vec2 liquify(vec2 st) {
        float aspectRatio = uResolution.x / uResolution.y;
        vec2 center = vec2(0.5);
        
        // Normalize coordinates
        st -= center;
        st.x *= aspectRatio;
        
        // Wave parameters
        float freq = 5.0 * uFrequency;
        float t = uTime * 0.025 * uSpeed;
        float amplitude = 0.1 * uIntensity;
        
        // Iterative rotation and sine wave application
        for (float i = 1.0; i <= 5.0; i++) {
            st = st * rot(i / 5.0 * PI * 2.0);
            float ff = i * freq;
            st.x += amplitude * cos(ff * st.y + t);
            st.y += amplitude * sin(ff * st.x + t);
        }
        
        // Restore coordinates
        st.x /= aspectRatio;
        st += center;
        
        return st;
      }

      void main() {
        vec2 uv = vUv;
        vec2 liquifiedUV = liquify(uv);
        
        // Chromatic Aberration
        vec2 normalizedUv = normalize(liquifiedUV - uv);
        float distanceUv = length(liquifiedUV - uv);
        float chromAbb = 0.02 * uIntensity;
        
        vec2 offsetR = liquifiedUV + chromAbb * normalizedUv * distanceUv;
        vec2 offsetG = liquifiedUV;
        vec2 offsetB = liquifiedUV - chromAbb * normalizedUv * distanceUv;
        
        vec4 colorR = texture2D(uTexture, offsetR);
        vec4 colorG = texture2D(uTexture, offsetG);
        vec4 colorB = texture2D(uTexture, offsetB);
        
        gl_FragColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uFrequency.value = this.parameters.frequency;
        this.uniforms.uSpeed.value = this.parameters.speed;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'frequency':
                this.parameters.frequency = typeof value === 'number' ? Math.max(0.1, Math.min(10.0, value)) : this.parameters.frequency;
                if (this.uniforms) this.uniforms.uFrequency.value = this.parameters.frequency;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
        }
    }
}
