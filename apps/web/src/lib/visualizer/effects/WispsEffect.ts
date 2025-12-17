import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface WispsConfig {
    speed: number; // 0.0 to 2.0
    scale: number; // 0.1 to 2.0
    intensity: number; // 0.0 to 2.0
    color: string; // Hex color
}

export class WispsEffect extends BaseShaderEffect {
    id = 'wisps';
    name = 'Wisps';
    description = 'Flowing smoke/wisp effect';
    parameters: WispsConfig;

    constructor(config: Partial<WispsConfig> = {}) {
        super();
        this.parameters = {
            speed: 0.5,
            scale: 1.0,
            intensity: 1.0,
            color: '#ffffff',
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uSpeed: { value: this.parameters.speed },
            uScale: { value: this.parameters.scale },
            uIntensity: { value: this.parameters.intensity },
            uColor: { value: new THREE.Color(this.parameters.color) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uSpeed;
      uniform float uScale;
      uniform float uIntensity;
      uniform vec3 uColor;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }

      float voronoi_additive(vec2 st, float radius, float scale) {
        vec2 i_st = floor(st);
        vec2 f_st = fract(st);
        
        float wander = uTime * 0.2 * uSpeed;
        float total_contribution = 0.0;
        
        for (int y = -2; y <= 2; y++) {
            for (int x = -2; x <= 2; x++) {
                vec2 neighbor = vec2(float(x), float(y));
                vec2 cell_id = i_st + neighbor;
                
                vec2 point = hash(cell_id);
                point = 0.5 + 0.5 * sin(5.0 + wander + 6.2831 * point); 
                
                vec2 starAbsPos = cell_id + point;
                vec2 diff = starAbsPos - st;
                float dist = length(diff);
                
                float contribution = radius / max(dist, radius * 0.1); 
                
                float shimmer_phase = dot(point, vec2(1.0)) * 10.0 + hash(cell_id).x * 5.0 + uTime * 0.5 * uSpeed;
                float shimmer = mix(1.0, (sin(shimmer_phase) + 1.0), 0.5);
                contribution *= shimmer;
                
                total_contribution += mix(contribution * contribution, contribution * 2.0, 0.25);
            }
        }
        return total_contribution;
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        float aspectRatio = uResolution.x / uResolution.y;
        
        vec2 st = (uv - 0.5) * vec2(aspectRatio, 1.0) * 20.0 * uScale;
        
        vec2 movementOffset = vec2(0.0, uTime * 0.5 * -0.05 * uSpeed);
        
        vec2 mouse1 = st + movementOffset;
        vec2 mouse2 = st + vec2(0.0, uTime * 0.5 * -0.05 * uSpeed) + vec2(10.0);
        
        float radius1 = 0.25;
        float radius2 = 0.25;
        
        float pass1 = voronoi_additive(mouse1, radius1, 38.0);
        float pass2 = voronoi_additive(mouse2, radius2, 48.0);
        
        pass1 *= 0.02;
        pass2 *= 0.04;
        
        vec3 wispColor = (pass1 + pass2) * uColor * uIntensity;
        
        vec3 finalColor = bg.rgb + wispColor;
        
        gl_FragColor = vec4(finalColor, max(bg.a, length(wispColor)));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uColor.value.set(this.parameters.color);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'color':
                this.parameters.color = value;
                if (this.uniforms) this.uniforms.uColor.value.set(this.parameters.color);
                break;
        }
    }
}
