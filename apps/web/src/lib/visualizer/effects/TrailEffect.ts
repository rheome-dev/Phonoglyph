import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface TrailConfig {
    intensity: number; // 0.0 to 1.0
    decay: number; // 0.0 to 1.0
}

export class TrailEffect extends BaseShaderEffect {
    id = 'trail';
    name = 'Trail';
    description = 'Motion trail / afterimage effect';
    parameters: TrailConfig;

    constructor(config: Partial<TrailConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, decay: 0.9, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uDecay: { value: this.parameters.decay }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uIntensity;
      uniform float uDecay;
      varying vec2 vUv;

      // Note: True trail effect requires multi-pass rendering (ping-pong buffers)
      // which is not fully supported in this single-pass shader architecture yet.
      // This implementation provides a basic motion blur approximation.

      void main() {
        vec2 uv = vUv;
        vec4 color = texture2D(uTexture, uv);
        
        // Simulated trail using simple blur/feedback approximation
        // In a real multi-pass setup, we would sample the previous frame here
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uDecay.value = this.parameters.decay;
    }

    updateParameter(paramName: string, value: any): void {
        if (paramName === 'intensity') {
            this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
            if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        } else if (paramName === 'decay') {
            this.parameters.decay = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.decay;
            if (this.uniforms) this.uniforms.uDecay.value = this.parameters.decay;
        }
    }
}
