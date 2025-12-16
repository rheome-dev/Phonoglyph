import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface BlurConfig {
    intensity: number; // 0.0 to 1.0 - blur strength
    radius: number; // 0.1 to 10.0 - blur radius
    quality: number; // 0.1 to 1.0 - sample quality (affects kernel size)
}

export class BlurEffect extends BaseShaderEffect {
    id = 'blur';
    name = 'Gaussian Blur';
    description = 'Smooth Gaussian blur with configurable intensity';
    parameters: BlurConfig;

    constructor(config: Partial<BlurConfig> = {}) {
        super();
        this.parameters = {
            intensity: 0.5,
            radius: 5.0,
            quality: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uRadius: { value: this.parameters.radius },
            uQuality: { value: this.parameters.quality }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uRadius;
      uniform float uQuality;

      varying vec2 vUv;

      // Gaussian weights for 9-tap kernel
      float getGaussianWeight(int index) {
        if (index == 0) return 0.06643724;
        if (index == 1) return 0.06461716;
        if (index == 2) return 0.06112521;
        if (index == 3) return 0.05623791;
        if (index == 4) return 0.05032389;
        return 0.0;
      }

      vec4 gaussianBlur(vec2 uv, vec2 direction) {
        vec4 color = vec4(0.0);
        float totalWeight = 0.0;
        
        int samples = int(9.0 * uQuality);
        float amount = uRadius * uIntensity * 0.001;
        
        // Center sample
        color += texture2D(uTexture, uv) * getGaussianWeight(0);
        totalWeight += getGaussianWeight(0);
        
        // Symmetric sampling
        for (int i = 1; i < 5; i++) {
          float weight = getGaussianWeight(i);
          float offset = float(i) * amount;
          
          color += texture2D(uTexture, uv + direction * offset) * weight;
          color += texture2D(uTexture, uv - direction * offset) * weight;
          totalWeight += 2.0 * weight;
        }
        
        return color / totalWeight;
      }

      void main() {
        vec2 uv = vUv;
        
        // Two-pass approximation (horizontal then average with vertical)
        vec2 pixelSize = vec2(1.0) / uResolution;
        vec4 horizontal = gaussianBlur(uv, vec2(pixelSize.x, 0.0));
        vec4 vertical = gaussianBlur(uv, vec2(0.0, pixelSize.y));
        
        // Blend both passes
        gl_FragColor = mix(horizontal, vertical, 0.5) * uIntensity + texture2D(uTexture, uv) * (1.0 - uIntensity);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uRadius.value = this.parameters.radius;
        this.uniforms.uQuality.value = this.parameters.quality;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'radius':
                this.parameters.radius = typeof value === 'number' ? Math.max(0.1, Math.min(10.0, value)) : this.parameters.radius;
                if (this.uniforms) this.uniforms.uRadius.value = this.parameters.radius;
                break;
            case 'quality':
                this.parameters.quality = typeof value === 'number' ? Math.max(0.1, Math.min(1.0, value)) : this.parameters.quality;
                if (this.uniforms) this.uniforms.uQuality.value = this.parameters.quality;
                break;
        }
    }
}
