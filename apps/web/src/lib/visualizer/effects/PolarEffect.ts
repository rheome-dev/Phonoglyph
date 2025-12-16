import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface PolarConfig {
    intensity: number; // 0.0 to 1.0
    rotation: number; // 0.0 to 2.0
    centerX: number; // 0.0 to 1.0
    centerY: number; // 0.0 to 1.0
}

export class PolarEffect extends BaseShaderEffect {
    id = 'polar';
    name = 'Polar';
    description = 'Cartesian to polar coordinates transformation';
    parameters: PolarConfig;

    constructor(config: Partial<PolarConfig> = {}) {
        super();
        this.parameters = { intensity: 1.0, rotation: 0.0, centerX: 0.5, centerY: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uRotation: { value: this.parameters.rotation },
            uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uRotation;
      uniform vec2 uCenter;
      
      varying vec2 vUv;
      
      const float PI = 3.1415926;

      vec2 polar(vec2 uv, vec2 pos) {
        uv -= pos;
        
        float angle = atan(uv.y, uv.x);
        float radius = length(uv);
        
        float xCoord = mod((angle + 2.0 * PI) + (uTime * 0.05 * uRotation) + PI, 2.0 * PI) / (2.0 * PI);
        float yCoord = radius;
        
        return fract(vec2(yCoord, xCoord));
      }

      void main() {
        vec2 uv = vUv;
        vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
        
        vec2 pos = uCenter;
        
        vec2 polarCoord = polar(uv * aspectRatio, pos * aspectRatio);
        
        // Seam blending
        vec2 oppositePolar = vec2(polarCoord.x, polarCoord.y > 0.5 ? polarCoord.y - 0.5 : polarCoord.y + 0.5);
        
        vec4 color1 = texture2D(uTexture, polarCoord);
        vec4 color2 = texture2D(uTexture, oppositePolar);
        
        float seamBlend = 0.0;
        float blendWidth = 0.05;
        
        if (polarCoord.y < blendWidth || polarCoord.y > 1.0 - blendWidth) {
            if (polarCoord.y < blendWidth) {
                seamBlend = 1.0 - (polarCoord.y / blendWidth);
            } else {
                seamBlend = (polarCoord.y - (1.0 - blendWidth)) / blendWidth;
            }
            seamBlend = smoothstep(0.0, 1.0, seamBlend);
        }
        
        vec4 polarColor = mix(color1, color2, seamBlend);
        vec4 originalColor = texture2D(uTexture, uv);
        
        gl_FragColor = mix(originalColor, polarColor, uIntensity);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uRotation.value = this.parameters.rotation;
        this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'rotation':
                this.parameters.rotation = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.rotation;
                if (this.uniforms) this.uniforms.uRotation.value = this.parameters.rotation;
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
