import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface BeamConfig {
    intensity: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
    width: number; // 0.1 to 1.0
    angle: number; // 0.0 to 360.0
    color: string; // Hex color
}

export class BeamEffect extends BaseShaderEffect {
    id = 'beam';
    name = 'Beam';
    description = 'Animated scanning light beam';
    parameters: BeamConfig;

    constructor(config: Partial<BeamConfig> = {}) {
        super();
        this.parameters = {
            intensity: 1.0,
            speed: 0.5,
            width: 0.5,
            angle: 0.0,
            color: '#661aff', // Default blue-purple
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uSpeed: { value: this.parameters.speed },
            uWidth: { value: this.parameters.width },
            uAngle: { value: (this.parameters.angle * Math.PI) / 180.0 },
            uColor: { value: new THREE.Color(this.parameters.color) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSpeed;
      uniform float uWidth;
      uniform float uAngle;
      uniform vec3 uColor;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;
      const float TWO_PI = 6.28318530718;

      // Random float generator
      float random(vec2 seed) {
        return fract(sin(dot(seed.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      vec3 Tonemap_tanh(vec3 x) {
        x = clamp(x, -40.0, 40.0);
        return (exp(x) - exp(-x)) / (exp(x) + exp(-x));
      }

      float luma(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      vec3 drawLine(vec2 uv, vec2 center, float scale, float angle) {
        float radAngle = -angle;
        
        float phase = fract(uTime * 0.5 * uSpeed + 0.5) * (3.0 * max(1.0, scale)) - (1.5 * max(1.0, scale));
        
        vec2 direction = vec2(cos(radAngle), sin(radAngle));
        vec2 centerToPoint = uv - center;
        
        float projection = dot(centerToPoint, direction);
        float distToLine = length(centerToPoint - projection * direction);
        
        float lineRadius = 0.5 * 0.25 * uWidth;
        float brightness = lineRadius / (1.0 - smoothstep(0.4, 0.0, distToLine + 0.02));
        
        float glowRadius = scale;
        float glow = smoothstep(glowRadius, 0.0, abs(projection - phase));
        
        return brightness * (1.0 - distToLine) * (1.0 - distToLine) * uColor * glow;
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        vec2 center = vec2(0.5);
        vec3 beam = drawLine(uv, center, 0.5, uAngle);
        
        beam *= uIntensity;
        
        // Dithering
        float dither = (random(gl_FragCoord.xy) - 0.5) / 255.0;
        
        vec3 blended = Tonemap_tanh(beam) + bg.rgb;
        blended += dither;
        
        gl_FragColor = vec4(blended, max(bg.a, luma(beam)));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uWidth.value = this.parameters.width;
        this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
        this.uniforms.uColor.value.set(this.parameters.color);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'width':
                this.parameters.width = typeof value === 'number' ? Math.max(0.1, Math.min(1.0, value)) : this.parameters.width;
                if (this.uniforms) this.uniforms.uWidth.value = this.parameters.width;
                break;
            case 'angle':
                this.parameters.angle = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.angle;
                if (this.uniforms) this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
                break;
            case 'color':
                this.parameters.color = value;
                if (this.uniforms) this.uniforms.uColor.value.set(this.parameters.color);
                break;
        }
    }
}
