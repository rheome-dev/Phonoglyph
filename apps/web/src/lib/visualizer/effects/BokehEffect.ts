import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface BokehConfig {
  intensity: number; // 0.0 to 1.0
  focalDepth: number; // 0.0 to 1.0
  aperture: number; // 0.1 to 2.0
}

export class BokehEffect extends BaseShaderEffect {
  id = 'bokeh';
  name = 'Bokeh Blur';
  description = 'Depth-of-field bokeh blur effect';
  parameters: BokehConfig;

  constructor(config: Partial<BokehConfig> = {}) {
    super();
    this.parameters = {
      intensity: 0.5,
      focalDepth: 0.5,
      aperture: 0.8,
      ...config
    };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uFocalDepth: { value: this.parameters.focalDepth },
      uAperture: { value: this.parameters.aperture }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uFocalDepth;
      uniform float uAperture;

      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        // Simple depth estimation from center distance
        float depth = length((uv - 0.5) * vec2(aspectRatio, 1.0));
        float blur = abs(depth - uFocalDepth) * uAperture;
        blur *= uIntensity;
        
        vec4 color = vec4(0.0);
        float totalWeight = 0.0;
        
        // Hexagonal bokeh sampling pattern
        for (int angle = 0; angle < 6; angle++) {
          float theta = float(angle) * 1.047197551; // 60 degrees
          for (int ring = 1; ring <= 3; ring++) {
            float r = float(ring) * blur * 0.01;
            vec2 offset = r * vec2(cos(theta), sin(theta));
            color += texture2D(uTexture, uv + offset);
            totalWeight += 1.0;
          }
        }
        
        color += texture2D(uTexture, uv);
        totalWeight += 1.0;
        
        gl_FragColor = color / totalWeight;
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uFocalDepth.value = this.parameters.focalDepth;
    this.uniforms.uAperture.value = this.parameters.aperture;
  }

  updateParameter(paramName: string, value: any): void {
    switch (paramName) {
      case 'intensity':
        this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
        if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        break;
      case 'focalDepth':
        this.parameters.focalDepth = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.focalDepth;
        if (this.uniforms) this.uniforms.uFocalDepth.value = this.parameters.focalDepth;
        break;
      case 'aperture':
        this.parameters.aperture = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.aperture;
        if (this.uniforms) this.uniforms.uAperture.value = this.parameters.aperture;
        break;
    }
  }
}
