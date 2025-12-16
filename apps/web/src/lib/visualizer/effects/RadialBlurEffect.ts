import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface RadialBlurConfig {
    intensity: number; // 0.0 to 1.0
    centerX: number; // 0.0 to 1.0
    centerY: number; // 0.0 to 1.0
    angle: number; // 0.0 to 360.0 - rotation angle
}

export class RadialBlurEffect extends BaseShaderEffect {
    id = 'radialBlur';
    name = 'Radial Blur';
    description = 'Rotational blur around a center point';
    parameters: RadialBlurConfig;

    constructor(config: Partial<RadialBlurConfig> = {}) {
        super();
        this.parameters = {
            intensity: 0.4,
            centerX: 0.5,
            centerY: 0.5,
            angle: 10.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) },
            uAngle: { value: (this.parameters.angle * Math.PI) / 180.0 }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform vec2 uCenter;
      uniform float uAngle;

      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        // Calculate relative position to center
        vec2 toUv = uv - uCenter;
        toUv.x *= aspectRatio;
        
        float radius = length(toUv);
        float baseAngle = atan(toUv.y, toUv.x);
        
        vec4 color = vec4(0.0);
        float totalWeight = 1.0;
        color += texture2D(uTexture, uv);
        
        float angleStep = uAngle * uIntensity * 0.04;
        
        // Symmetric rotational sampling
        for (int i = 1; i <= 8; i++) {
          float weight = exp(-float(i) * 0.5);
          float step = float(i) * angleStep;
          
          // Rotate forward
          float a1 = baseAngle + step;
          vec2 rot1 = radius * vec2(cos(a1), sin(a1));
          rot1.x /= aspectRatio;
          vec2 uv1 = rot1 + uCenter;
          
          // Rotate backward
          float a2 = baseAngle - step;
          vec2 rot2 = radius * vec2(cos(a2), sin(a2));
          rot2.x /= aspectRatio;
          vec2 uv2 = rot2 + uCenter;
          
          color += texture2D(uTexture, uv1) * weight;
          color += texture2D(uTexture, uv2) * weight;
          totalWeight += 2.0 * weight;
        }
        
        gl_FragColor = color / totalWeight;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
        this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'centerX':
                this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
                if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
                break;
            case 'centerY':
                this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
                if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
                break;
            case 'angle':
                this.parameters.angle = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.angle;
                if (this.uniforms) this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
                break;
        }
    }
}
