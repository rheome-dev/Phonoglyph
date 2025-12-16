import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface SineWavesConfig {
    intensity: number; // 0.0 to 1.0
    frequency: number; // 1.0 to 50.0
    speed: number; // 0.0 to 2.0
    waveX: boolean;
    waveY: boolean;
}

export class SineWavesEffect extends BaseShaderEffect {
    id = 'sineWaves';
    name = 'Sine Waves';
    description = 'Sinusoidal wave distortion';
    parameters: SineWavesConfig;

    constructor(config: Partial<SineWavesConfig> = {}) {
        super();
        this.parameters = {
            intensity: 0.5,
            frequency: 20.0,
            speed: 0.5,
            waveX: true,
            waveY: true,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uFrequency: { value: this.parameters.frequency },
            uSpeed: { value: this.parameters.speed },
            uWaveX: { value: this.parameters.waveX ? 1.0 : 0.0 },
            uWaveY: { value: this.parameters.waveY ? 1.0 : 0.0 }
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
      uniform float uWaveX;
      uniform float uWaveY;
      
      varying vec2 vUv;
      
      const float PI = 3.141592;

      void main() {
        vec2 uv = vUv;
        
        // Convert UV coordinates from [0, 1] to [-1, 1] range
        vec2 waveCoord = uv * 2.0 - 1.0; 
        
        float thirdPI = PI * 0.3333;
        float time = uTime * 0.25 * uSpeed;
        float amp = 0.3 * uIntensity;

        // Wave X (Horizontal displacement) based on vertical position
        float waveXVal = sin((waveCoord.y + 0.5) * uFrequency + (time * thirdPI)) * amp; 
        
        // Wave Y (Vertical displacement) based on horizontal position
        float waveYVal = sin((waveCoord.x - 0.5) * uFrequency + (time * thirdPI)) * amp;
        
        // Apply displacement
        waveCoord.xy += vec2(
            mix(0.0, waveXVal, uWaveX), 
            mix(0.0, waveYVal, uWaveY)
        );
        
        // Convert distorted coordinates back to UV range [0, 1]
        vec2 finalUV = waveCoord * 0.5 + 0.5;
        
        gl_FragColor = texture2D(uTexture, finalUV);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uFrequency.value = this.parameters.frequency;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uWaveX.value = this.parameters.waveX ? 1.0 : 0.0;
        this.uniforms.uWaveY.value = this.parameters.waveY ? 1.0 : 0.0;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'frequency':
                this.parameters.frequency = typeof value === 'number' ? Math.max(1.0, Math.min(50.0, value)) : this.parameters.frequency;
                if (this.uniforms) this.uniforms.uFrequency.value = this.parameters.frequency;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'waveX':
                this.parameters.waveX = !!value;
                if (this.uniforms) this.uniforms.uWaveX.value = this.parameters.waveX ? 1.0 : 0.0;
                break;
            case 'waveY':
                this.parameters.waveY = !!value;
                if (this.uniforms) this.uniforms.uWaveY.value = this.parameters.waveY ? 1.0 : 0.0;
                break;
        }
    }
}
