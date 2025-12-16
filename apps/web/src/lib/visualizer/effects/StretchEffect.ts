import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface StretchConfig {
    intensity: number; // 0.0 to 1.0
    angle: number; // 0.0 to 360.0
    centerX: number; // 0.0 to 1.0
    centerY: number; // 0.0 to 1.0
}

export class StretchEffect extends BaseShaderEffect {
    id = 'stretch';
    name = 'Stretch';
    description = 'Directional stretch/compression distortion';
    parameters: StretchConfig;

    constructor(config: Partial<StretchConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, angle: 0.0, centerX: 0.5, centerY: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uAngle: { value: (this.parameters.angle * Math.PI) / 180.0 },
            uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uAngle;
      uniform vec2 uCenter;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      vec2 rotate(vec2 v, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
      }

      vec3 chromatic_aberration(vec3 color, vec2 uv, float amount) {
        vec2 offset = normalize(uv - 0.5) * amount;
        vec4 left = texture2D(uTexture, uv - offset);
        vec4 right = texture2D(uTexture, uv + offset);
        color.r = left.r;
        color.b = right.b;
        return color;
      }

      void main() {
        vec2 uv = vUv;
        
        float angle = uAngle;
        float stretchX = 4.0 * uIntensity;
        float stretchY = 4.0 * uIntensity;
        
        vec2 pos = uCenter;
        vec2 offset = uv - pos;
        
        vec2 rotatedOffset = rotate(offset, -angle);
        vec2 stretchedOffset = rotatedOffset;
        
        if (rotatedOffset.x > 0.0) {
            float stretchIntensity = rotatedOffset.x;
            
            stretchedOffset.x = rotatedOffset.x / (1.0 + stretchX * stretchIntensity);
            stretchedOffset.y = rotatedOffset.y / (1.0 + stretchY * stretchIntensity * stretchIntensity);
        }
        
        vec2 finalOffset = rotate(stretchedOffset, angle);
        vec2 st = pos + finalOffset;
        
        vec4 color = texture2D(uTexture, st);
        
        // Chromatic Aberration
        float dist = length(st - uv);
        color.rgb = chromatic_aberration(color.rgb, st, dist * 0.05 * uIntensity);
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
        this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'angle':
                this.parameters.angle = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.angle;
                if (this.uniforms) this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
                break;
            case 'centerX':
                this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
                if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
                break;
            case 'centerY':
                this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
                if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
                break;
        }
    }
}
