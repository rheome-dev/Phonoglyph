import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface ReflectiveSurfaceConfig {
    intensity: number; // 0.0 to 1.0
    blur: number; // 0.0 to 1.0
    threshold: number; // 0.0 to 1.0 (yPos)
}

export class ReflectiveSurfaceEffect extends BaseShaderEffect {
    id = 'reflectiveSurface';
    name = 'Reflective Surface';
    description = 'Floor reflection effect';
    parameters: ReflectiveSurfaceConfig;

    constructor(config: Partial<ReflectiveSurfaceConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, blur: 0.5, threshold: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uBlur: { value: this.parameters.blur },
            uThreshold: { value: this.parameters.threshold }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uBlur;
      uniform float uThreshold;
      
      varying vec2 vUv;

      // Simple box blur approximation
      vec4 blurTexture(sampler2D tex, vec2 uv, float radius) {
        vec4 color = vec4(0.0);
        float total = 0.0;
        vec2 texel = 1.0 / uResolution;
        
        for (float x = -2.0; x <= 2.0; x += 1.0) {
            for (float y = -2.0; y <= 2.0; y += 1.0) {
                vec2 offset = vec2(x, y) * radius;
                color += texture2D(tex, uv + offset * texel);
                total += 1.0;
            }
        }
        return color / total;
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        float yPos = uThreshold;
        
        // If above the threshold, show original
        if (uv.y > yPos) {
            gl_FragColor = bg;
            return;
        }
        
        // Calculate reflected coordinate
        float reflectedY = yPos + (yPos - uv.y);
        vec2 reflectedUv = vec2(uv.x, reflectedY);
        
        // Sample reflected color with blur
        vec4 reflectedColor = blurTexture(uTexture, reflectedUv, uBlur * 4.0);
        
        // Darken and fade
        reflectedColor.rgb = mix(vec3(0.0), reflectedColor.rgb, uIntensity);
        
        // Fade out as we go further down from the reflection line
        float dist = (yPos - uv.y) * 2.0;
        float fade = 1.0 - smoothstep(0.0, 1.0, dist);
        
        reflectedColor.rgb *= fade;
        
        gl_FragColor = vec4(reflectedColor.rgb, 1.0);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uBlur.value = this.parameters.blur;
        this.uniforms.uThreshold.value = this.parameters.threshold;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'blur':
                this.parameters.blur = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.blur;
                if (this.uniforms) this.uniforms.uBlur.value = this.parameters.blur;
                break;
            case 'threshold':
                this.parameters.threshold = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.threshold;
                if (this.uniforms) this.uniforms.uThreshold.value = this.parameters.threshold;
                break;
        }
    }
}
