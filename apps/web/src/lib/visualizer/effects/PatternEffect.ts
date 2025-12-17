import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface PatternConfig {
    patternType: number; // 0 to 9
    scale: number; // 0.1 to 5.0
    color: string; // Hex color
    opacity: number; // 0.0 to 1.0
}

export class PatternEffect extends BaseShaderEffect {
    id = 'pattern';
    name = 'Pattern';
    description = 'Procedural geometric patterns';
    parameters: PatternConfig;

    constructor(config: Partial<PatternConfig> = {}) {
        super();
        this.parameters = {
            patternType: 0,
            scale: 1.0,
            color: '#fa1ee3',
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uPatternType: { value: this.parameters.patternType },
            uScale: { value: this.parameters.scale },
            uColor: { value: new THREE.Color(this.parameters.color) },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform int uPatternType;
      uniform float uScale;
      uniform vec3 uColor;
      uniform float uOpacity;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      mat2 rotate2d(float _angle){
        return mat2(cos(_angle),-sin(_angle),
                    sin(_angle),cos(_angle));
      }

      float gridSDF(vec2 st, float tile) {
        vec2 grid = fract(st);
        vec2 distToEdge = min(grid, 1.0 - grid);
        float minDist = min(distToEdge.x, distToEdge.y);
        return minDist - tile * 0.5;
      }

      float stripeSDF(vec2 st, float tile) {
        float x = fract(st.x - uTime * 0.05);
        return abs(x - 0.5) - tile * 0.5;
      }

      float arrowsSDF(vec2 st, float tile) {
        vec2 grid = floor(st);
        vec2 cell = fract(st);
        float checker = mod(grid.x + grid.y, 2.0);
        float arrow = checker > 0.5 ? cell.x : cell.y;
        return abs(arrow - 0.5) - tile * 0.5;
      }

      float concentricCircleSDF(vec2 st, float tile) {
        float r = length(st);
        return abs(fract(r) - 0.5) - tile * 0.5;
      }

      float circleSDF(vec2 st, float tile) {
        vec2 cell = fract(st) - 0.5;
        float dist = length(cell);
        return dist - tile * 0.5;
      }

      float checkerboardSDF(vec2 st, float tile) {
        vec2 grid = floor(st);
        float checker = mod(grid.x + grid.y, 2.0);
        return checker > 0.5 ? -1.0 : 1.0;
      }

      float wavyLinesSDF(vec2 st, float tile) {
        float wave = sin(st.x * 6.28318 + st.y * 10.0) * 0.5 + 0.5;
        return abs(wave - 0.5) - tile * 0.5;
      }

      float hexagonalSDF(vec2 st, float tile) {
        const float sqrt3 = 1.732050808;
        st = abs(st);
        float d = dot(st, normalize(vec2(1.0, sqrt3))); 
        return max(d, st.x) - tile;
      }

      float diamondSDF(vec2 st, float tile) {
        vec2 cell = fract(st) - 0.5;
        float d = abs(cell.x) + abs(cell.y);
        return d - tile * 0.5;
      }

      float spiralSDF(vec2 st, float tile) {
        float r = length(st);
        float theta = atan(st.y, st.x);
        float spiral = fract((theta + r * 5.0) / 6.28318);
        return abs(spiral - 0.5) - tile * 0.5;
      }

      float getPatternSDF(vec2 st, float tile) {
        st.y -= uTime * 0.05;
        
        if (uPatternType == 0) return gridSDF(st, tile);
        if (uPatternType == 1) return stripeSDF(st, tile);
        if (uPatternType == 2) return circleSDF(st, tile);
        if (uPatternType == 3) return concentricCircleSDF(st, tile);
        if (uPatternType == 4) return arrowsSDF(st, tile);
        if (uPatternType == 5) return checkerboardSDF(st, tile);
        if (uPatternType == 6) return wavyLinesSDF(st, tile);
        if (uPatternType == 7) return hexagonalSDF(st, tile);
        if (uPatternType == 8) return diamondSDF(st, tile);
        if (uPatternType == 9) return spiralSDF(st, tile);
        return gridSDF(st, tile);
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        float aspectRatio = uResolution.x / uResolution.y;
        float res = max(uResolution.x, uResolution.y);
        float px = (1.0 / res);
        float py = px / aspectRatio;
        float scl = 20.0 * uScale;
        float minpx = min(px, py);
        
        float tile = (minpx + 0.1 / scl) * scl;
        tile = floor(tile / minpx + 0.5) * minpx;
        
        vec2 st = (uv - 0.5) * scl;
        st.x *= aspectRatio;
        
        float sdf = getPatternSDF(st, tile);
        
        float smoothRadius = minpx * scl;
        float pattern = 1.0 - smoothstep(-smoothRadius, smoothRadius, sdf);
        
        vec3 finalColor = uColor * pattern;
        
        vec3 blended = mix(bg.rgb, finalColor, pattern * uOpacity);
        
        gl_FragColor = vec4(blended, max(bg.a, pattern * uOpacity));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uPatternType.value = this.parameters.patternType;
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uColor.value.set(this.parameters.color);
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'patternType':
                this.parameters.patternType = typeof value === 'number' ? Math.max(0, Math.min(9, Math.floor(value))) : this.parameters.patternType;
                if (this.uniforms) this.uniforms.uPatternType.value = this.parameters.patternType;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
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
