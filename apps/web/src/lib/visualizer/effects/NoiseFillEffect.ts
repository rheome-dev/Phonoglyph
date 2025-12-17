import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface NoiseFillConfig {
    color1: string; // Hex color
    color2: string; // Hex color
    scale: number; // 0.1 to 2.0
    speed: number; // 0.0 to 2.0
    opacity: number; // 0.0 to 1.0
}

export class NoiseFillEffect extends BaseShaderEffect {
    id = 'noiseFill';
    name = 'Noise Fill';
    description = 'Procedural BCC noise pattern';
    parameters: NoiseFillConfig;

    constructor(config: Partial<NoiseFillConfig> = {}) {
        super();
        this.parameters = {
            color1: '#ffd198', // Yellow-Orange
            color2: '#9600e6', // Purple
            scale: 1.0,
            speed: 0.5,
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uColor1: { value: new THREE.Color(this.parameters.color1) },
            uColor2: { value: new THREE.Color(this.parameters.color2) },
            uScale: { value: this.parameters.scale },
            uSpeed: { value: this.parameters.speed },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uScale;
      uniform float uSpeed;
      uniform float uOpacity;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;
      const float TAU = 6.28318530718;

      vec4 permute(vec4 t) {
        return t * (t * 34.0 + 133.0);
      }

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

      vec4 bccNoiseDerivatives_XYBeforeZ(vec3 X) {
        mat3 orthonormalMap = mat3(
            0.788675134594813, -0.211324865405187, -0.577350269189626,
            -0.211324865405187, 0.788675134594813, -0.577350269189626,
            0.577350269189626, 0.577350269189626, 0.577350269189626);
        X = orthonormalMap * X;
        vec4 result = bccNoiseDerivativesPart(X) + bccNoiseDerivativesPart(X + 144.5);
        return vec4(result.xyz * orthonormalMap, result.w);
      }

      vec3 anchoredPal(float t, vec3 col1, vec3 col2) {
        vec3 mid = 0.5 * (col1 + col2);
        vec3 axisAmp = 0.5 * (col2 - col1);
        vec3 base = mid + axisAmp * cos(TAU * t);
        
        vec3 axis = length(axisAmp) > 0.0001 ? normalize(axisAmp) : vec3(1.0, 0.0, 0.0);
        vec3 ref = abs(axis.x) > 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 tangent1 = normalize(cross(axis, ref));
        vec3 tangent2 = normalize(cross(axis, tangent1));

        float richness = 0.24 * length(axisAmp) + 0.02;
        vec3 ripple = tangent1 * sin(TAU * (t * 2.0 + 0.123)) + tangent2 * sin(TAU * (t * 3.0 + 0.437));
        
        vec3 col = base + (richness * 0.5) * ripple;
        col = 1.0 / (1.0 + exp(-col * 4.0 + 0.25) * 7.5);
        return col;
      }

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        vec2 aspect = vec2(aspectRatio, 1.0);
        
        vec2 st = (uv - 0.5) * aspect * mix(1.0, 14.0, uScale);
        
        vec2 drift = vec2(0.0, uTime * 0.0125 * uSpeed);
        
        vec4 noise = bccNoiseDerivatives_XYBeforeZ(vec3(st * vec2(0.47, 1.0 - 0.47) * 0.7 - drift, uTime * 0.02 * uSpeed));
        float noiseVal = mix(0.5, noise.w * 0.5 + 0.5, 1.24);
        
        vec3 noiseColor = anchoredPal(noiseVal, uColor1, uColor2);
        
        vec4 bg = texture2D(uTexture, uv);
        
        vec3 finalColor = mix(bg.rgb, noiseColor, uOpacity);
        
        gl_FragColor = vec4(finalColor, max(bg.a, uOpacity));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uColor1.value.set(this.parameters.color1);
        this.uniforms.uColor2.value.set(this.parameters.color2);
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'color1':
                this.parameters.color1 = value;
                if (this.uniforms) this.uniforms.uColor1.value.set(this.parameters.color1);
                break;
            case 'color2':
                this.parameters.color2 = value;
                if (this.uniforms) this.uniforms.uColor2.value.set(this.parameters.color2);
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
