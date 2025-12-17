import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface ReplicateConfig {
    spacing: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
    rotation: number; // 0.0 to 360.0
    opacity: number; // 0.0 to 1.0
}

export class ReplicateEffect extends BaseShaderEffect {
    id = 'replicate';
    name = 'Replicate';
    description = 'Trail and aberration effect';
    parameters: ReplicateConfig;

    constructor(config: Partial<ReplicateConfig> = {}) {
        super();
        this.parameters = {
            spacing: 0.35,
            speed: 0.5,
            rotation: 0.0,
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uSpacing: { value: this.parameters.spacing },
            uSpeed: { value: this.parameters.speed },
            uRotation: { value: (this.parameters.rotation * Math.PI) / 180.0 },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uSpacing;
      uniform float uSpeed;
      uniform float uRotation;
      uniform float uOpacity;
      
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        float repeatSpacing = uSpacing * mix(1.0, aspectRatio, 0.5);
        float time = (uTime * 0.025 * uSpeed) / (repeatSpacing + 0.001);
        
        vec4 col = vec4(0.0);
        
        const int MAX_REPEATS = 16;
        
        for (int i = 0; i < MAX_REPEATS; ++i) {
            float fi = float(i);
            float offset = repeatSpacing * (fi - 0.5 * 16.0 + fract(time));
            
            vec2 aberrated = vec2(offset * sin(uRotation), offset * cos(uRotation));
            
            vec4 sampleCol = texture2D(uTexture, uv + aberrated);
            col += sampleCol * (1.0 - col.a) * uOpacity;
        }
        
        // Blend with original based on opacity if needed, but the effect is additive/composite
        // The loop accumulates color. If opacity is low, we might want to blend with original.
        // For now, we output the accumulated result.
        
        gl_FragColor = col;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uSpacing.value = this.parameters.spacing;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uRotation.value = (this.parameters.rotation * Math.PI) / 180.0;
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'spacing':
                this.parameters.spacing = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.spacing;
                if (this.uniforms) this.uniforms.uSpacing.value = this.parameters.spacing;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'rotation':
                this.parameters.rotation = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.rotation;
                if (this.uniforms) this.uniforms.uRotation.value = (this.parameters.rotation * Math.PI) / 180.0;
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
