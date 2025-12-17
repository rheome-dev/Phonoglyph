import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface CircleConfig {
    radius: number; // 0.0 to 1.0
    feather: number; // 0.0 to 1.0
    centerX: number; // 0.0 to 1.0
    centerY: number; // 0.0 to 1.0
    color: string; // Hex color
    opacity: number; // 0.0 to 1.0
}

export class CircleEffect extends BaseShaderEffect {
    id = 'circle';
    name = 'Circle';
    description = 'Circular mask overlay';
    parameters: CircleConfig;

    constructor(config: Partial<CircleConfig> = {}) {
        super();
        this.parameters = {
            radius: 0.25,
            feather: 0.1,
            centerX: 0.5,
            centerY: 0.5,
            color: '#661aff',
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uRadius: { value: this.parameters.radius },
            uFeather: { value: this.parameters.feather },
            uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) },
            uColor: { value: new THREE.Color(this.parameters.color) },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uRadius;
      uniform float uFeather;
      uniform vec2 uCenter;
      uniform vec3 uColor;
      uniform float uOpacity;
      
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
        
        vec2 center = uCenter;
        vec2 pos = uv * aspectRatio;
        vec2 centerPos = center * aspectRatio;
        
        float dist = distance(pos, centerPos);
        
        float edge = uRadius;
        float feather = uFeather * 0.5;
        
        float mask = 1.0 - smoothstep(edge - feather, edge + feather, dist);
        
        vec3 finalColor = mix(bg.rgb, uColor, mask * uOpacity);
        
        gl_FragColor = vec4(finalColor, bg.a);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uRadius.value = this.parameters.radius;
        this.uniforms.uFeather.value = this.parameters.feather;
        this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
        this.uniforms.uColor.value.set(this.parameters.color);
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'radius':
                this.parameters.radius = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.radius;
                if (this.uniforms) this.uniforms.uRadius.value = this.parameters.radius;
                break;
            case 'feather':
                this.parameters.feather = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.feather;
                if (this.uniforms) this.uniforms.uFeather.value = this.parameters.feather;
                break;
            case 'centerX':
                this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
                if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
                break;
            case 'centerY':
                this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
                if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
                break;
            case 'color':
                this.parameters.color = value;
                if (this.uniforms) this.uniforms.uColor.value.set(this.parameters.color);
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
