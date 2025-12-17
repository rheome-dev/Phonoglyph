import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface GradientFillConfig {
    color1: string; // Hex color
    color2: string; // Hex color
    angle: number; // 0.0 to 360.0
    speed: number; // 0.0 to 2.0
    opacity: number; // 0.0 to 1.0
}

export class GradientFillEffect extends BaseShaderEffect {
    id = 'gradientFill';
    name = 'Gradient Fill';
    description = 'Procedural linear gradient with OKLab mixing';
    parameters: GradientFillConfig;

    constructor(config: Partial<GradientFillConfig> = {}) {
        super();
        this.parameters = {
            color1: '#000000',
            color2: '#ffffff',
            angle: 0.0,
            speed: 0.0,
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uColor1: { value: new THREE.Color(this.parameters.color1) },
            uColor2: { value: new THREE.Color(this.parameters.color2) },
            uAngle: { value: (this.parameters.angle * Math.PI) / 180.0 },
            uSpeed: { value: this.parameters.speed },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uAngle;
      uniform float uSpeed;
      uniform float uOpacity;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      vec2 rotate(vec2 coord, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return vec2(
            coord.x * c - coord.y * s,
            coord.x * s + coord.y * c
        );
      }

      float rand(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      vec3 oklab_mix(vec3 lin1, vec3 lin2, float a) {
        const mat3 kCONEtoLMS = mat3(
            0.4121656120, 0.2118591070, 0.0883097947,
            0.5362752080, 0.6807189584, 0.2818474174,
            0.0514575653, 0.1074065790, 0.6302613616);
        const mat3 kLMStoCONE = mat3(
            4.0767245293, -1.2681437731, -0.0041119885,
            -3.3072168827, 2.6093323231, -0.7034763098,
            0.2307590544, -0.3411344290, 1.7068625689);
            
        vec3 lms1 = pow( kCONEtoLMS * lin1, vec3(1.0/3.0) );
        vec3 lms2 = pow( kCONEtoLMS * lin2, vec3(1.0/3.0) );
        
        vec3 lms = mix( lms1, lms2, a );
        lms *= 1.0 + 0.025 * a * (1.0 - a);
        
        return kLMStoCONE * (lms * lms * lms);
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        vec2 center = vec2(0.5);
        vec2 p = uv - center;
        p = rotate(p, uAngle);
        p += center;
        
        float position = p.x;
        position -= uTime * 0.1 * uSpeed;
        
        float cycle = floor(position);
        bool reverse = int(cycle) % 2 == 0;
        float t = reverse ? 1.0 - fract(position) : fract(position);
        
        vec3 col1 = pow(uColor1, vec3(2.2)); // Linearize
        vec3 col2 = pow(uColor2, vec3(2.2));
        
        vec3 gradient = oklab_mix(col1, col2, t);
        gradient = pow(gradient, vec3(1.0/2.2)); // sRGB
        
        float dither = rand(gl_FragCoord.xy) * 0.005;
        gradient += dither;
        
        vec3 finalColor = mix(bg.rgb, gradient, uOpacity);
        
        gl_FragColor = vec4(finalColor, max(bg.a, uOpacity));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uColor1.value.set(this.parameters.color1);
        this.uniforms.uColor2.value.set(this.parameters.color2);
        this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'color1':
                this.parameters.color1 = value;
                if (this.uniforms) this.uniforms.uColor1.value.set(this.parameters.color1);
                break;
            case 'color2':
                this.parameters.color2 = value;
                if (this.uniforms) this.uniforms.uColor2.value.set(this.parameters.color2);
                break;
            case 'angle':
                this.parameters.angle = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.angle;
                if (this.uniforms) this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
