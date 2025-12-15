import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface GrainConfig {
    amount: number; // 0.0 to 1.0 - intensity of grain
    size: number; // 0.1 to 5.0 - size of grain particles
    colorized: boolean; // false = monochrome, true = colored grain
    luminance: boolean; // if true, grain is more visible in darker areas
}

export class GrainEffect extends BaseShaderEffect {
    id = 'grain';
    name = 'Film Grain';
    description = 'Adds film grain noise for vintage or cinematic look';
    parameters: GrainConfig;

    constructor(config: Partial<GrainConfig> = {}) {
        super();
        this.parameters = {
            amount: 0.5,
            size: 1.0,
            colorized: false,
            luminance: false,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uAmount: { value: this.parameters.amount },
            uSize: { value: this.parameters.size },
            uColorized: { value: this.parameters.colorized ? 1.0 : 0.0 },
            uLuminance: { value: this.parameters.luminance ? 1.0 : 0.0 }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      precision highp int;

      uniform sampler2D uTexture;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uAmount;
      uniform float uSize;
      uniform float uColorized;
      uniform float uLuminance;

      varying vec2 vUv;

      // PCG 2D Hash for pseudorandom number generation
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

      void main() {
        vec2 uv = vUv;
        vec4 color = texture2D(uTexture, uv);

        if (color.a <= 0.001) {
          gl_FragColor = vec4(0.0);
          return;
        }
        
        vec2 st = uv * uResolution / uSize;
        
        // Time delta for grain animation
        float delta = fract(floor(uTime) / 20.0);
        
        vec3 grainRGB;
        
        if (uColorized > 0.5) {
          // Colored grain (RGB channels independent)
          grainRGB = vec3(
            randFibo(st + vec2(1.0, 2.0) + delta),
            randFibo(st + vec2(2.0, 3.0) + delta),
            randFibo(st + vec2(3.0, 4.0) + delta)
          );
        } else {
          // Monochrome grain
          grainRGB = vec3(randFibo(st + vec2(delta)));
        }
        
        // Apply luminance-based grain (more visible in darker areas)
        if (uLuminance > 0.5) {
          float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          grainRGB *= (1.0 - lum);
        }
        
        // Additive blend
        vec3 blended = grainRGB + color.rgb;
        
        // Mix based on amount parameter
        color.rgb = mix(color.rgb, blended, uAmount);
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uAmount.value = this.parameters.amount;
        this.uniforms.uSize.value = this.parameters.size;
        this.uniforms.uColorized.value = this.parameters.colorized ? 1.0 : 0.0;
        this.uniforms.uLuminance.value = this.parameters.luminance ? 1.0 : 0.0;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'amount':
                this.parameters.amount = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.amount;
                if (this.uniforms) this.uniforms.uAmount.value = this.parameters.amount;
                break;
            case 'size':
                this.parameters.size = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.size;
                if (this.uniforms) this.uniforms.uSize.value = this.parameters.size;
                break;
            case 'colorized':
                this.parameters.colorized = typeof value === 'boolean' ? value : this.parameters.colorized;
                if (this.uniforms) this.uniforms.uColorized.value = this.parameters.colorized ? 1.0 : 0.0;
                break;
            case 'luminance':
                this.parameters.luminance = typeof value === 'boolean' ? value : this.parameters.luminance;
                if (this.uniforms) this.uniforms.uLuminance.value = this.parameters.luminance ? 1.0 : 0.0;
                break;
        }
    }
}
