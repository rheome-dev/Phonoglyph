import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface ZoomBlurConfig {
    intensity: number; // 0.0 to 1.0
    centerX: number; // 0.0 to 1.0
    centerY: number; // 0.0 to 1.0
    samples: number; // 4 to 16
}

export class ZoomBlurEffect extends BaseShaderEffect {
    id = 'zoomBlur';
    name = 'Zoom Blur';
    description = 'Radial zoom blur from a center point';
    parameters: ZoomBlurConfig;

    constructor(config: Partial<ZoomBlurConfig> = {}) {
        super();
        this.parameters = {
            intensity: 0.4,
            centerX: 0.5,
            centerY: 0.5,
            samples: 8,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) },
            uSamples: { value: this.parameters.samples }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform vec2 uCenter;
      uniform float uSamples;

      varying vec2 vUv;

      // Exponential weight for radial sampling
      float getExponentialWeight(float t) {
        return exp(-t * 2.0);
      }

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        // Direction from center to current pixel
        vec2 dir = uv - uCenter;
        dir.x *= aspectRatio;
        
        float dist = length(dir);
        float amount = uIntensity * 0.04 * dist;
        
        vec4 color = vec4(0.0);
        float totalWeight = 0.0;
        
        int samples = int(uSamples);
        
        for (int i = 0; i < 16; i++) {
          if (i >= samples) break;
          
          float t = float(i) / float(samples);
          float weight = getExponentialWeight(t);
          vec2 offset = dir * t * amount;
          offset.x /= aspectRatio;
          
          color += texture2D(uTexture, uv + offset) * weight;
          totalWeight += weight;
        }
        
        gl_FragColor = color / totalWeight;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
        this.uniforms.uSamples.value = this.parameters.samples;
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
            case 'samples':
                this.parameters.samples = typeof value === 'number' ? Math.max(4, Math.min(16, Math.floor(value))) : this.parameters.samples;
                if (this.uniforms) this.uniforms.uSamples.value = this.parameters.samples;
                break;
        }
    }
}
