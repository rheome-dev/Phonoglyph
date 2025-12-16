import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface LensDistortionConfig {
    distortion: number; // 0.0 to 1.0 - controls lens radius/strength
    type: number; // 0 = Spherical, 1 = Disc, 2 = Fisheye
    chromaticAberration: number; // 0.0 to 1.0
}

export class LensDistortionEffect extends BaseShaderEffect {
    id = 'lensDistortion';
    name = 'Lens Distortion';
    description = 'Lens barrel/pincushion distortion with chromatic aberration';
    parameters: LensDistortionConfig;

    constructor(config: Partial<LensDistortionConfig> = {}) {
        super();
        this.parameters = { distortion: 0.5, type: 0, chromaticAberration: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uDistortion: { value: this.parameters.distortion },
            uType: { value: this.parameters.type },
            uChromaticAberration: { value: this.parameters.chromaticAberration }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uDistortion;
      uniform float uType;
      uniform float uChromaticAberration;
      
      varying vec2 vUv;
      
      const float PI = 3.1415926;
      const float STEPS = 8.0;

      // Spherical Distortion
      vec2 sphericalTransformation(vec2 uv, vec2 center, float radius, float tau) {
        vec2 tc = uv - center;
        float s = length(tc);
        if (s > radius) return uv;
        
        float z = sqrt(radius * radius - s * s);
        float alpha = (1.0 - (1.0 / tau)) * asin(s / radius);
        
        // Avoid division by zero
        if (s > 0.001) {
            tc = tc / s * radius * sin(alpha);
        }
        return center + tc;
      }

      // Disc Distortion
      vec2 discTransformation(vec2 uv, vec2 center, float radius, float scale) {
        vec2 tc = uv - center;
        float s = length(tc);
        if (s > radius) return uv;
        
        float r = s / radius;
        if (r > 0.0) {
            r = pow(r, scale);
            tc = tc * r;
        }
        return center + tc;
      }

      // Fisheye Distortion
      vec2 fisheyeTransformation(vec2 uv, vec2 center, float radius) {
        vec2 tc = uv - center;
        tc /= radius;
        float dist = length(tc) * 0.15;
        
        if (dist < 1.0) {
            float theta = atan(tc.y, tc.x);
            float r = dist * 2.0 * PI;
            float z = sqrt(1.0 - r * r) + 0.25;
            float rDist = atan(r, z) / PI;
            float newDist = mix(dist, rDist, 5.0);
            tc.x = newDist * cos(theta);
            tc.y = newDist * sin(theta);
        }
        tc *= radius;
        return center + tc;
      }

      vec3 chromaticAbberation(vec2 st, float amount) {
        float aspectRatio = uResolution.x / uResolution.y;
        vec2 center = vec2(0.5);
        vec2 dir = st - center;
        float dist = length(dir);
        
        vec2 aberrated = amount * dir * dist * 0.1;
        
        vec4 red = vec4(0.0);
        vec4 blue = vec4(0.0);
        vec4 green = vec4(0.0);
        
        float invSteps = 1.0 / STEPS;
        
        for(float i = 1.0; i <= STEPS; i++) {
            red += texture2D(uTexture, st - aberrated * i * invSteps) * invSteps;
            blue += texture2D(uTexture, st + aberrated * i * invSteps) * invSteps;
        }
        
        green = texture2D(uTexture, st);
        
        return vec3(red.r, green.g, blue.b);
      }

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        // Aspect corrected coordinates
        vec2 aspectUV = uv;
        aspectUV.x *= aspectRatio;
        vec2 center = vec2(0.5 * aspectRatio, 0.5);
        
        float radius = 0.8 * uResolution.x / max(uResolution.x, uResolution.y) * 0.5;
        float strength = 1.0 + uDistortion * 4.0;
        
        vec2 distortedUV = aspectUV;
        
        if (uType < 0.5) {
            distortedUV = sphericalTransformation(aspectUV, center, radius, strength);
        } else if (uType < 1.5) {
            distortedUV = discTransformation(aspectUV, center, radius, strength);
        } else {
            distortedUV = fisheyeTransformation(aspectUV, center, radius);
        }
        
        // Convert back to normalized UV
        distortedUV.x /= aspectRatio;
        
        // Mask
        float dist = distance(aspectUV, center);
        float mask = 1.0 - smoothstep(radius - 0.01, radius, dist);
        
        vec4 original = texture2D(uTexture, uv);
        vec3 distortedColor = chromaticAbberation(distortedUV, uChromaticAberration);
        
        gl_FragColor = mix(original, vec4(distortedColor, 1.0), mask);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uDistortion.value = this.parameters.distortion;
        this.uniforms.uType.value = this.parameters.type;
        this.uniforms.uChromaticAberration.value = this.parameters.chromaticAberration;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'distortion':
                this.parameters.distortion = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.distortion;
                if (this.uniforms) this.uniforms.uDistortion.value = this.parameters.distortion;
                break;
            case 'type':
                this.parameters.type = typeof value === 'number' ? Math.floor(Math.max(0, Math.min(2, value))) : this.parameters.type;
                if (this.uniforms) this.uniforms.uType.value = this.parameters.type;
                break;
            case 'chromaticAberration':
                this.parameters.chromaticAberration = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.chromaticAberration;
                if (this.uniforms) this.uniforms.uChromaticAberration.value = this.parameters.chromaticAberration;
                break;
        }
    }
}
