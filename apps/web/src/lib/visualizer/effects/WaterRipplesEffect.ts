import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface WaterRipplesConfig {
    intensity: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
}

export class WaterRipplesEffect extends BaseShaderEffect {
    id = 'waterRipples';
    name = 'Water Ripples';
    description = 'Water surface ripple simulation';
    parameters: WaterRipplesConfig;

    constructor(config: Partial<WaterRipplesConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, speed: 1.0, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
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
      uniform float uSpeed;
      varying vec2 vUv;

      // Note: True water ripple simulation requires multi-pass physics simulation
      // (ping-pong buffers) which is not fully supported in this single-pass 
      // shader architecture yet. This implementation provides a visual approximation.

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        vec2 center = vec2(0.5);
        vec2 tc = uv - center;
        tc.x *= aspectRatio;
        float dist = length(tc);
        
        float time = uTime * uSpeed;
        
        // Simple ripple approximation
        float ripple = sin(dist * 20.0 - time * 5.0) * 0.01 * uIntensity;
        
        // Attenuate ripple with distance
        ripple *= max(0.0, 1.0 - dist * 2.0);
        
        vec2 offset = normalize(tc) * ripple;
        
        vec4 color = texture2D(uTexture, uv + offset);
        
        // Add simple specular highlight
        float highlight = max(0.0, ripple * 100.0);
        color.rgb += vec3(highlight) * 0.2;
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uSpeed.value = this.parameters.speed;
    }

    updateParameter(paramName: string, value: any): void {
        if (paramName === 'intensity') {
            this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
            if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        } else if (paramName === 'speed') {
            this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
            if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
        }
    }
}
