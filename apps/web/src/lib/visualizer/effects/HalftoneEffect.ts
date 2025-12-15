import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface HalftoneConfig {
    dotSize: number; // 0.1 to 2.0 - size of halftone dots
    angle: number; // 0.0 to 360.0 - rotation angle for dot grid
    shape: 'circle' | 'square'; // dot shape
    smoothness: number; // 0.0 to 1.0 - edge smoothing amount
}

export class HalftoneEffect extends BaseShaderEffect {
    id = 'halftone';
    name = 'Halftone';
    description = 'CMYK halftone printing effect with configurable dots';
    parameters: HalftoneConfig;

    constructor(config: Partial<HalftoneConfig> = {}) {
        super();
        this.parameters = {
            dotSize: 0.75,
            angle: 0.0,
            shape: 'circle',
            smoothness: 0.75,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uDotSize: { value: this.parameters.dotSize },
            uAngle: { value: this.parameters.angle },
            uShape: { value: this.parameters.shape === 'circle' ? 1.0 : 0.0 },
            uSmoothness: { value: this.parameters.smoothness }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision mediump float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uDotSize;
      uniform float uAngle;
      uniform float uShape;
      uniform float uSmoothness;

      varying vec2 vUv;

      float luma(vec4 color) {
        return dot(color.rgb, vec3(0.299, 0.587, 0.114));
      }

      vec3 CMYKtoRGB(vec4 cmyk) {
        float c = cmyk.x;
        float m = cmyk.y;
        float y = cmyk.z;
        float k = cmyk.w;
        
        float invK = 1.0 - k;
        float r = 1.0 - min(1.0, c * invK + k);
        float g = 1.0 - min(1.0, m * invK + k);
        float b = 1.0 - min(1.0, y * invK + k);
        
        return clamp(vec3(r, g, b), 0.0, 1.0);
      }

      vec4 RGBtoCMYK(vec3 rgb) {
        float r = rgb.r;
        float g = rgb.g;
        float b = rgb.b;
        
        float k = min(1.0 - r, min(1.0 - g, 1.0 - b));
        vec3 cmy = vec3(0.0);
        float invK = 1.0 - k;
        
        if (invK != 0.0) {
          cmy.x = (1.0 - r - k) / invK;
          cmy.y = (1.0 - g - k) / invK;
          cmy.z = (1.0 - b - k) / invK;
        }
        return clamp(vec4(cmy, k), 0.0, 1.0);
      }

      float aastep(float threshold, float value) {
        float afwidth = uSmoothness * 200.0 * (1.0 / uResolution.x);
        float minval = threshold - afwidth;
        float maxval = threshold + afwidth;
        return smoothstep(minval, maxval, value);
      }

      vec2 rotate2D(vec2 st, float degrees) {
        float c = cos(radians(degrees));
        float s = sin(radians(degrees));
        return mat2(c, -s, s, c) * st;
      }

      float halftone(vec2 st, float col, float angle) {
        float aspectRatio = uResolution.x / uResolution.y;
        float aspectCorrection = mix(aspectRatio, 1.0 / aspectRatio, 0.5);
        
        st -= vec2(0.5, 0.5);
        st *= vec2(aspectRatio, 1.0);
        
        vec2 r_st = uDotSize * 200.0 * rotate2D(st, angle - uAngle);
        r_st /= aspectCorrection;
        
        st = (2.0 * fract(r_st) - 1.0) * 0.82;
        
        return aastep(0.0, sqrt(col) - length(st));
      }

      void main() {
        vec4 clipColor = texture2D(uTexture, vUv);
        
        if (clipColor.a == 0.0) {
          gl_FragColor = vec4(0.0);
          return;
        }
        
        vec2 uv = vUv;
        vec4 color = texture2D(uTexture, uv);
        
        vec4 cmyk = RGBtoCMYK(color.rgb);
        
        float k = halftone(uv, cmyk.w, 45.0);
        float c = halftone(uv, cmyk.x, 15.0);
        float m = halftone(uv, cmyk.y, 75.0);
        float y = halftone(uv, cmyk.z, 0.0);
        
        vec4 halftoneColor = vec4(CMYKtoRGB(vec4(c, m, y, k)), 1.0);
        halftoneColor *= color.a;
        
        color = mix(color, halftoneColor, 1.0);
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uDotSize.value = this.parameters.dotSize;
        this.uniforms.uAngle.value = this.parameters.angle;
        this.uniforms.uShape.value = this.parameters.shape === 'circle' ? 1.0 : 0.0;
        this.uniforms.uSmoothness.value = this.parameters.smoothness;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'dotSize':
                this.parameters.dotSize = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.dotSize;
                if (this.uniforms) this.uniforms.uDotSize.value = this.parameters.dotSize;
                break;
            case 'angle':
                this.parameters.angle = typeof value === 'number' ? value % 360 : this.parameters.angle;
                if (this.uniforms) this.uniforms.uAngle.value = this.parameters.angle;
                break;
            case 'shape':
                this.parameters.shape = value === 'circle' || value === 'square' ? value : this.parameters.shape;
                if (this.uniforms) this.uniforms.uShape.value = this.parameters.shape === 'circle' ? 1.0 : 0.0;
                break;
            case 'smoothness':
                this.parameters.smoothness = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.smoothness;
                if (this.uniforms) this.uniforms.uSmoothness.value = this.parameters.smoothness;
                break;
        }
    }
}
