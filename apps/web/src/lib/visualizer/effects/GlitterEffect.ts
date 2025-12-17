import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface GlitterConfig {
    intensity: number; // 0.0 to 2.0
    scale: number; // 0.1 to 2.0
    speed: number; // 0.0 to 2.0
}

export class GlitterEffect extends BaseShaderEffect {
    id = 'glitter';
    name = 'Glitter';
    description = 'Voronoi-based sparkle effect';
    parameters: GlitterConfig;

    constructor(config: Partial<GlitterConfig> = {}) {
        super();
        this.parameters = { intensity: 1.0, scale: 1.0, speed: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uScale: { value: this.parameters.scale },
            uSpeed: { value: this.parameters.speed }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uScale;
      uniform float uSpeed;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      float luma(vec4 color) {
        return dot(color.rgb, vec3(0.299, 0.587, 0.114));
      }

      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 18.5453);
      }

      vec3 hue(float h, float angle) {
        return vec3(0.5) + 0.5 * cos(h + 2.0 * PI * angle + vec3(0.0, 2.0, 4.0));
      }

      vec4 getStarLayer(vec2 baseUV) {
        vec2 scaleRatio = vec2(1080.0) * vec2(uResolution.x / uResolution.y, 1.0);
        vec2 pos = vec2(0.5);
        
        vec2 uv = (baseUV - pos) * scaleRatio * 0.25 * uScale * 0.01 + vec2(0.0);
        
        float time = uTime * 0.5 * uSpeed;
        vec2 i_uv = floor(uv);
        vec2 f_uv = fract(uv);
        
        vec3 d = vec3(1e10);
        vec2 closestPoint;
        
        for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
                vec2 tile_offset = vec2(float(x), float(y));
                vec2 o = hash(i_uv + tile_offset + vec2(time * 0.05));
                
                vec2 current_tile_offset = tile_offset + o - f_uv;
                float dist = dot(current_tile_offset, current_tile_offset);
                
                if (dist < d.x) {
                    d.y = d.x;
                    d.x = dist;
                    closestPoint = current_tile_offset;
                } else if (dist < d.y) {
                    d.y = dist;
                }
            }
        }
        
        d = sqrt(d);
        vec2 toCenter = closestPoint;
        
        vec2 closestPointOriginal = closestPoint / (0.25 * uScale * 0.01) / scaleRatio + baseUV;
        vec4 closestPointCol = texture2D(uTexture, closestPointOriginal);
        float closestPointR = luma(closestPointCol);
        
        float proximityFactor = d.y - d.x;
        
        float radialGradient = (1.0 - length(toCenter)) * closestPointR * 0.75;
        
        float crossShape = min(abs(toCenter.x), abs(toCenter.y));
        crossShape = 1.0 - smoothstep(-0.04, 0.04 * proximityFactor * closestPointR, crossShape);
        
        vec3 cross = mix(vec3(crossShape), vec3(crossShape) * hue(closestPointR, proximityFactor * 5.0), 0.25);
        vec3 bloom = vec3(smoothstep(0.0, 4.0, radialGradient * proximityFactor));
        
        vec3 rgb = mix(vec3(1.0), closestPointCol.rgb, 0.5);
        
        return vec4(rgb * (cross + bloom) * 10.0 * uIntensity, 1.0);
      }

      void main() {
        vec2 uv = vUv;
        vec4 color = texture2D(uTexture, uv);
        
        vec4 stars = getStarLayer(uv);
        
        color.rgb += stars.rgb;
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uSpeed.value = this.parameters.speed;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
        }
    }
}
