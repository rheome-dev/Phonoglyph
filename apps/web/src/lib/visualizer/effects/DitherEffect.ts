import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface DitherConfig {
    bayerMatrix: number; // 2, 4, or 8 - size of Bayer matrix
    colors: number; // 2 to 256 - number of color levels per channel
    scale: number; // 0.1 to 5.0 - dither pattern scale
}

export class DitherEffect extends BaseShaderEffect {
    id = 'dither';
    name = 'Dither';
    description = 'Bayer matrix ordered dithering for retro pixelart look';
    parameters: DitherConfig;

    constructor(config: Partial<DitherConfig> = {}) {
        super();
        this.parameters = {
            bayerMatrix: 4,
            colors: 16,
            scale: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uBayerMatrix: { value: this.parameters.bayerMatrix },
            uColors: { value: this.parameters.colors },
            uScale: { value: this.parameters.scale }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      precision highp int;

      uniform sampler2D uTexture;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uBayerMatrix;
      uniform float uColors;
      uniform float uScale;

      varying vec2 vUv;

      // PCG hash for randomness
      uvec2 pcg2d(uvec2 v) {
        v = v * 1664525u + 1013904223u;
        v.x += v.y * v.y * 1664525u + 1013904223u;
        v.y += v.x * v.x * 1664525u + 1013904223u;
        v ^= v >> 16;
        v.x += v.y * v.y * 1664525u + 1013904223u;
        v.y += v.x * v.x * 1664525u + 1013904223u;
        return v;
      }

      float randFibo(vec2 p) {
        uvec2 v = floatBitsToUint(p);
        v = pcg2d(v);
        uint r = v.x ^ v.y;
        return float(r) / float(0xffffffffu);
      }

      // Simplified dither using pseudo-random noise instead of blue noise
      vec3 dither(vec3 color, vec2 st) {
        float delta = floor(uTime);
        
        // Use PCG random instead of blue noise
        float noise = randFibo(st * uResolution / uScale + delta) - 0.5;
        
        float dither_threshold = 1.0 / uColors;
        float num_levels = uColors;
        
        return floor(color * num_levels + noise) / num_levels;
      }

      void main() {
        vec2 uv = vUv;
        vec4 color = texture2D(uTexture, uv);
        
        if (color.a == 0.0) {
          gl_FragColor = vec4(0.0);
          return;
        }
        
        color.rgb = dither(color.rgb, vUv);
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uBayerMatrix.value = this.parameters.bayerMatrix;
        this.uniforms.uColors.value = this.parameters.colors;
        this.uniforms.uScale.value = this.parameters.scale;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'bayerMatrix':
                this.parameters.bayerMatrix = typeof value === 'number' ? Math.max(2, Math.min(8, Math.floor(value))) : this.parameters.bayerMatrix;
                if (this.uniforms) this.uniforms.uBayerMatrix.value = this.parameters.bayerMatrix;
                break;
            case 'colors':
                this.parameters.colors = typeof value === 'number' ? Math.max(2, Math.min(256, Math.floor(value))) : this.parameters.colors;
                if (this.uniforms) this.uniforms.uColors.value = this.parameters.colors;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
        }
    }
}
