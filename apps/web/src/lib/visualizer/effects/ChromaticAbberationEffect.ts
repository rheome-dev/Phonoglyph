import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface ChromaticAbberationConfig {
    amount: number; // 0.0 to 1.0 - strength of the aberration
    direction: number; // 0.0 to 360.0 - direction angle in degrees
}

export class ChromaticAbberationEffect extends BaseShaderEffect {
    id = 'chromaticAbberation';
    name = 'Chromatic Abberation';
    description = 'RGB color channel offset for lens distortion effect';
    parameters: ChromaticAbberationConfig;

    constructor(config: Partial<ChromaticAbberationConfig> = {}) {
        super();
        this.parameters = {
            amount: 0.2,
            direction: 0.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uAmount: { value: this.parameters.amount },
            uDirection: { value: this.parameters.direction }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uAmount;
      uniform float uDirection;

      varying vec2 vUv;

      const float PI = 3.1415926;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        // Center of aberration (fixed at center)
        vec2 pos = vec2(0.5, 0.5);
        
        // Rotation angle from direction parameter (convert degrees to radians)
        float angle = (uDirection + uTime * 0.05) * PI / 180.0;
        vec2 rotation = vec2(sin(angle), cos(angle));
        
        vec4 color = texture2D(uTexture, uv);
        
        // Aberration vector calculation
        // Scale by amount parameter and radial distance from center
        vec2 aberrated = uAmount * rotation * 0.03 * distance(uv, pos);
        
        float amt = length(aberrated);
        
        // Early exit if aberration is negligible
        if (amt < 0.001) {
          gl_FragColor = color;
          return;
        }
        
        // Sample with offsets for RGB channels
        vec4 left = texture2D(uTexture, uv - aberrated);  // Red channel
        vec4 right = texture2D(uTexture, uv + aberrated); // Blue channel
        
        // Combine channels
        color.r = left.r;
        color.b = right.b;
        
        // Max alpha from all samples to prevent edge transparency
        color.a = max(max(left.a, color.a), right.a);
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uAmount.value = this.parameters.amount;
        this.uniforms.uDirection.value = this.parameters.direction;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'amount':
                this.parameters.amount = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.amount;
                if (this.uniforms) this.uniforms.uAmount.value = this.parameters.amount;
                break;
            case 'direction':
                this.parameters.direction = typeof value === 'number' ? value % 360 : this.parameters.direction;
                if (this.uniforms) this.uniforms.uDirection.value = this.parameters.direction;
                break;
        }
    }
}
