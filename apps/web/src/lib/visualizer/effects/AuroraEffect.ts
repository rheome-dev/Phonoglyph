import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface AuroraConfig {
    intensity: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
    color1: string; // Hex color
    color2: string; // Hex color
}

export class AuroraEffect extends BaseShaderEffect {
    id = 'aurora';
    name = 'Aurora';
    description = 'Procedural Aurora Borealis effect';
    parameters: AuroraConfig;

    constructor(config: Partial<AuroraConfig> = {}) {
        super();
        this.parameters = {
            intensity: 0.8,
            speed: 0.5,
            color1: '#00ff00',
            color2: '#8f00ff',
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uSpeed: { value: this.parameters.speed },
            uColor1: { value: new THREE.Color(this.parameters.color1) },
            uColor2: { value: new THREE.Color(this.parameters.color2) }
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
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      
      varying vec2 vUv;
      
      const float TAU = 6.28318530718;
      const float ITERATIONS = 20.0; // Reduced for performance

      vec3 pal(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
        return a + b * cos(TAU * (c * t + d));
      }

      vec2 turb(vec2 pos, float t) {
        mat2 rot = mat2(0.6, -0.8, 0.8, 0.6);
        float freq = 5.0;
        float amp = 0.5;
        for(float i = 0.0; i < 4.0; i++) {
            vec2 s = sin(freq * (pos * rot) + i * t);
            pos += amp * rot[0] * s / freq;
            rot *= mat2(0.6, -0.8, 0.8, 0.6);
            freq *= 1.4;
        }
        return pos;
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
        vec2 pos = (uv * aspect - vec2(0.5) * aspect);
        
        float t = uTime * 0.2 * uSpeed;
        
        vec3 pp = vec3(0.0);
        vec3 bloom = vec3(0.0);
        
        vec2 prevPos = turb(pos, t - 1.0/ITERATIONS);
        
        for(float i = 1.0; i < ITERATIONS + 1.0; i++) {
            float iter = i / ITERATIONS;
            vec2 st = turb(pos, t + iter * 0.1);
            
            float d = length(st) - 0.22; // SDF Circle
            float pd = distance(st, prevPos);
            prevPos = st;
            
            float dynamicBlur = pd * 2.0;
            float ds = smoothstep(0.0, 0.05 + dynamicBlur, abs(d));
            
            vec3 color = mix(uColor1, uColor2, iter);
            
            pp += (ds - 1.0) * color;
            bloom += (1.0 / max(abs(d) + dynamicBlur, 0.001)) * color;
        }
        
        pp *= 1.0 / ITERATIONS;
        bloom = bloom / (bloom + 20.0);
        
        vec3 aurora = (-pp + bloom * 0.5) * uIntensity * 2.0;
        
        // Additive blend
        vec3 finalColor = bg.rgb + aurora;
        
        gl_FragColor = vec4(finalColor, bg.a);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uColor1.value.set(this.parameters.color1);
        this.uniforms.uColor2.value.set(this.parameters.color2);
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
            case 'color1':
                this.parameters.color1 = value;
                if (this.uniforms) this.uniforms.uColor1.value.set(this.parameters.color1);
                break;
            case 'color2':
                this.parameters.color2 = value;
                if (this.uniforms) this.uniforms.uColor2.value.set(this.parameters.color2);
                break;
        }
    }
}
