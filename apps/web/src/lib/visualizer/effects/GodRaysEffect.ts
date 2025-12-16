import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface GodRaysConfig {
    intensity: number; // 0.0 to 1.0
    decay: number; // 0.9 to 1.0
    density: number; // 0.0 to 1.0
    weight: number; // 0.0 to 1.0
    lightX: number; // 0.0 to 1.0
    lightY: number; // 0.0 to 1.0
}

export class GodRaysEffect extends BaseShaderEffect {
    id = 'godRays';
    name = 'God Rays';
    description = 'Volumetric light scattering';
    parameters: GodRaysConfig;

    constructor(config: Partial<GodRaysConfig> = {}) {
        super();
        this.parameters = {
            intensity: 1.0,
            decay: 0.96,
            density: 0.5,
            weight: 0.4,
            lightX: 0.5,
            lightY: 0.5,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uDecay: { value: this.parameters.decay },
            uDensity: { value: this.parameters.density },
            uWeight: { value: this.parameters.weight },
            uLightPos: { value: new THREE.Vector2(this.parameters.lightX, this.parameters.lightY) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uDecay;
      uniform float uDensity;
      uniform float uWeight;
      uniform vec2 uLightPos;
      
      varying vec2 vUv;
      
      const int MAX_ITERATIONS = 50;

      float luma(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      float interleavedGradientNoise(vec2 st) {
        return fract(52.9829189 * fract(0.06711056 * st.x + 0.00583715 * st.y));
      }

      void main() {
        vec2 uv = vUv;
        vec4 color = texture2D(uTexture, uv);
        
        // Thresholding to get bright areas
        float lum = luma(color.rgb);
        vec3 brightColor = color.rgb * smoothstep(0.4, 0.6, lum);
        
        // Raymarching
        vec2 lightPos = uLightPos;
        vec2 deltaTextCoord = (uv - lightPos);
        
        float density = uDensity * 1.0;
        deltaTextCoord *= 1.0 / float(MAX_ITERATIONS) * density;
        
        float illuminationDecay = 1.0;
        vec3 accumulatedRays = vec3(0.0);
        
        vec2 textCoo = uv;
        
        // Jitter
        float noise = interleavedGradientNoise(gl_FragCoord.xy);
        textCoo -= deltaTextCoord * noise;
        
        for(int i=0; i < MAX_ITERATIONS; i++) {
            textCoo -= deltaTextCoord;
            vec3 sampleColor = texture2D(uTexture, textCoo).rgb;
            
            // Apply threshold to sample
            float sampleLum = luma(sampleColor);
            sampleColor *= smoothstep(0.4, 0.6, sampleLum);
            
            sampleColor *= illuminationDecay * uWeight;
            accumulatedRays += sampleColor;
            illuminationDecay *= uDecay;
        }
        
        accumulatedRays *= uIntensity;
        
        // Composite
        gl_FragColor = vec4(color.rgb + accumulatedRays, color.a);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uDecay.value = this.parameters.decay;
        this.uniforms.uDensity.value = this.parameters.density;
        this.uniforms.uWeight.value = this.parameters.weight;
        this.uniforms.uLightPos.value.set(this.parameters.lightX, this.parameters.lightY);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'decay':
                this.parameters.decay = typeof value === 'number' ? Math.max(0.8, Math.min(1.0, value)) : this.parameters.decay;
                if (this.uniforms) this.uniforms.uDecay.value = this.parameters.decay;
                break;
            case 'density':
                this.parameters.density = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.density;
                if (this.uniforms) this.uniforms.uDensity.value = this.parameters.density;
                break;
            case 'weight':
                this.parameters.weight = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.weight;
                if (this.uniforms) this.uniforms.uWeight.value = this.parameters.weight;
                break;
            case 'lightX':
                this.parameters.lightX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.lightX;
                if (this.uniforms) this.uniforms.uLightPos.value.x = this.parameters.lightX;
                break;
            case 'lightY':
                this.parameters.lightY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.lightY;
                if (this.uniforms) this.uniforms.uLightPos.value.y = this.parameters.lightY;
                break;
        }
    }
}
