import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface PosterizeConfig {
    levels: number; // 2 to 256 - number of color levels per channel
    gamma: number; // 0.1 to 3.0 - gamma correction
}

export class PosterizeEffect extends BaseShaderEffect {
    id = 'posterize';
    name = 'Posterize';
    description = 'Reduces color levels for a poster art effect';
    parameters: PosterizeConfig;

    constructor(config: Partial<PosterizeConfig> = {}) {
        super();
        this.parameters = {
            levels: 8,
            gamma: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uLevels: { value: this.parameters.levels },
            uGamma: { value: this.parameters.gamma }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision mediump float;

      uniform sampler2D uTexture;
      uniform float uLevels;
      uniform float uGamma;

      varying vec2 vUv;

      void main() {
        vec4 color = texture2D(uTexture, vUv);
        
        if (color.a == 0.0) {
          gl_FragColor = vec4(0.0);
          return;
        }
        
        // Apply gamma correction before posterization
        vec3 corrected = pow(color.rgb, vec3(uGamma));
        
        // Posterize by quantizing to discrete levels
        vec3 posterized = floor(corrected * uLevels) / uLevels;
        
        // Apply inverse gamma
        posterized = pow(posterized, vec3(1.0 / uGamma));
        
        gl_FragColor = vec4(posterized, color.a);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uLevels.value = this.parameters.levels;
        this.uniforms.uGamma.value = this.parameters.gamma;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'levels':
                this.parameters.levels = typeof value === 'number' ? Math.max(2, Math.min(256, Math.floor(value))) : this.parameters.levels;
                if (this.uniforms) this.uniforms.uLevels.value = this.parameters.levels;
                break;
            case 'gamma':
                this.parameters.gamma = typeof value === 'number' ? Math.max(0.1, Math.min(3.0, value)) : this.parameters.gamma;
                if (this.uniforms) this.uniforms.uGamma.value = this.parameters.gamma;
                break;
        }
    }
}
