import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface WaterCausticsConfig {
    intensity: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
    refraction: number; // 0.0 to 1.0
    color: string; // Hex color
}

export class WaterCausticsEffect extends BaseShaderEffect {
    id = 'waterCaustics';
    name = 'Water Caustics';
    description = 'Water surface caustics simulation';
    parameters: WaterCausticsConfig;

    constructor(config: Partial<WaterCausticsConfig> = {}) {
        super();
        this.parameters = {
            intensity: 0.8,
            speed: 0.5,
            refraction: 0.5,
            color: '#99b3e6', // Light blue
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uSpeed: { value: this.parameters.speed },
            uRefraction: { value: this.parameters.refraction },
            uColor: { value: new THREE.Color(this.parameters.color) }
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
      uniform float uRefraction;
      uniform vec3 uColor;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

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

      vec4 getNoise(vec3 p) {
        vec4 noise = bccNoiseDerivatives_XYBeforeZ(p);
        return mix(noise, (noise + 0.5) * 0.5, 0.25);
      }

      void main() {
        vec2 uv = vUv;
        vec2 aspect = vec2(uResolution.x/uResolution.y, 1.0);
        
        vec2 pos = (uv - 0.5) * aspect * 16.0 * 0.5;
        
        float refraction = mix(0.25, 1.3, uRefraction);
        vec3 p = vec3(pos, uTime * 0.05 * uSpeed);
        
        vec4 noise = getNoise(p);
        vec4 baseNoise = noise;
        vec4 balanceNoise = getNoise(p - vec3(baseNoise.xyz / 32.0) * refraction);
        noise = getNoise(p - vec3(balanceNoise.xyz / 16.0) * refraction);
        
        float balancer = (0.5 + 0.5 * balanceNoise.w);
        float normalized = pow(0.5 + 0.5 * noise.w, 2.0);
        float value = mix(0.0, normalized + 0.2 * (1.0 - normalized), balancer);
        
        vec3 causticColor = uColor * value * uIntensity;
        
        // Distortion
        vec4 color = texture2D(uTexture, uv + baseNoise.xy * 0.01 * 0.25);
        
        // Composite
        gl_FragColor = vec4(color.rgb + causticColor, color.a);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uRefraction.value = this.parameters.refraction;
        this.uniforms.uColor.value.set(this.parameters.color);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'refraction':
                this.parameters.refraction = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.refraction;
                if (this.uniforms) this.uniforms.uRefraction.value = this.parameters.refraction;
                break;
            case 'color':
                this.parameters.color = value;
                if (this.uniforms) this.uniforms.uColor.value.set(this.parameters.color);
                break;
        }
    }
}
