import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface NoiseConfig {
    intensity: number; // 0.0 to 1.0
    scale: number; // 0.1 to 5.0
    speed: number; // 0.0 to 2.0
}

export class NoiseEffect extends BaseShaderEffect {
    id = 'noise';
    name = 'BCC Noise';
    description = 'Body-Centered Cubic noise distortion';
    parameters: NoiseConfig;

    constructor(config: Partial<NoiseConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, scale: 1.0, speed: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uScale: { value: this.parameters.scale },
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
      uniform float uScale;
      uniform float uSpeed;
      
      varying vec2 vUv;

      // Hashing function
      vec4 permute(vec4 t) {
        return t * (t * 34.0 + 133.0);
      }

      // Gradient generation
      vec3 grad(float hash) {
        vec3 cube = mod(floor(hash / vec3(1.0, 2.0, 4.0)), 2.0) * 2.0 - 1.0;
        vec3 cuboct = cube;
        
        float index0 = step(0.0, 1.0 - floor(hash / 16.0));
        float index1 = step(0.0, floor(hash / 16.0) - 1.0);
        
        cuboct.x *= 1.0 - index0;
        cuboct.y *= 1.0 - index1;
        cuboct.z *= 1.0 - (1.0 - index0 - index1);
        
        float type = mod(floor(hash / 8.0), 2.0);
        vec3 rhomb = (1.0 - type) * cube + type * (cuboct + cross(cube, cuboct));
        
        vec3 grad = cuboct * 1.22474487139 + rhomb;
        grad *= (1.0 - 0.042942436724648037 * type) * 3.5946317686139184;
        
        return grad;
      }

      // BCC Noise Part
      vec4 bccNoiseDerivativesPart(vec3 X) {
        vec3 b = floor(X);
        vec4 i4 = vec4(X - b, 2.5);
        
        vec3 v1 = b + floor(dot(i4, vec4(.25)));
        vec3 v2 = b + vec3(1, 0, 0) + vec3(-1, 1, 1) * floor(dot(i4, vec4(-.25, .25, .25, .35)));
        vec3 v3 = b + vec3(0, 1, 0) + vec3(1, -1, 1) * floor(dot(i4, vec4(.25, -.25, .25, .35)));
        vec3 v4 = b + vec3(0, 0, 1) + vec3(1, 1, -1) * floor(dot(i4, vec4(.25, .25, -.25, .35)));
        
        vec4 hashes = permute(mod(vec4(v1.x, v2.x, v3.x, v4.x), 289.0));
        hashes = permute(mod(hashes + vec4(v1.y, v2.y, v3.y, v4.y), 289.0));
        hashes = mod(permute(mod(hashes + vec4(v1.z, v2.z, v3.z, v4.z), 289.0)), 48.0);
        
        vec3 d1 = X - v1; vec3 d2 = X - v2; vec3 d3 = X - v3; vec3 d4 = X - v4;
        
        vec4 a = max(0.75 - vec4(dot(d1, d1), dot(d2, d2), dot(d3, d3), dot(d4, d4)), 0.0);
        vec4 aa = a * a; vec4 aaaa = aa * aa;
        
        vec3 g1 = grad(hashes.x); vec3 g2 = grad(hashes.y);
        vec3 g3 = grad(hashes.z); vec3 g4 = grad(hashes.w);
        
        vec4 extrapolations = vec4(dot(d1, g1), dot(d2, g2), dot(d3, g3), dot(d4, g4));
        
        vec3 derivative = -8.0 * mat4x3(d1, d2, d3, d4) * (aa * a * extrapolations)
                        + mat4x3(g1, g2, g3, g4) * aaaa;
                        
        return vec4(derivative, dot(aaaa, extrapolations));
      }

      // BCC Noise
      vec4 bccNoiseDerivatives_XYBeforeZ(vec3 X) {
        mat3 orthonormalMap = mat3(
            0.788675134594813, -0.211324865405187, -0.577350269189626,
            -0.211324865405187, 0.788675134594813, -0.577350269189626,
            0.577350269189626, 0.577350269189626, 0.577350269189626
        );
        X = orthonormalMap * X;
        vec4 result = bccNoiseDerivativesPart(X) + bccNoiseDerivativesPart(X + 144.5);
        return vec4(result.xyz * orthonormalMap, result.w);
      }

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        vec2 st = (uv - 0.5) * vec2(aspectRatio, 1.0);
        st *= 12.0 * uScale;
        
        vec4 noise = bccNoiseDerivatives_XYBeforeZ(vec3(st, uTime * 0.1 * uSpeed));
        vec2 offset = noise.xy * 0.1 * uIntensity;
        
        gl_FragColor = texture2D(uTexture, uv + offset);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uSpeed.value = this.parameters.speed;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
        }
    }
}
