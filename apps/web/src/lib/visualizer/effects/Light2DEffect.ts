import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface Light2DConfig {
    intensity: number; // 0.0 to 1.0
    lightX: number; // 0.0 to 1.0
    lightY: number; // 0.0 to 1.0
    color: string; // Hex color
}

export class Light2DEffect extends BaseShaderEffect {
    id = 'light2d';
    name = '2D Light';
    description = 'Screen-space 2D point light with shadows';
    parameters: Light2DConfig;

    constructor(config: Partial<Light2DConfig> = {}) {
        super();
        this.parameters = {
            intensity: 0.5,
            lightX: 0.5,
            lightY: 0.5,
            color: '#fa1ee3', // Default pink/purple from shader
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uLightPos: { value: new THREE.Vector2(this.parameters.lightX, this.parameters.lightY) },
            uLightColor: { value: new THREE.Color(this.parameters.color) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform vec2 uLightPos;
      uniform vec3 uLightColor;
      
      varying vec2 vUv;
      
      const float PI2 = 6.28318530718;

      // Random float generator (White noise replacement for Blue Noise)
      float random(vec2 seed) {
        return fract(sin(dot(seed.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      vec3 Tonemap_tanh(vec3 x) {
        x = clamp(x, -40.0, 40.0);
        return (exp(x) - exp(-x)) / (exp(x) + exp(-x));
      }

      void main() {
        vec4 sceneColor = texture2D(uTexture, vUv);
        
        vec2 aspectRatio = uResolution / min(uResolution.x, uResolution.y);
        vec2 uv = vUv * aspectRatio;
        vec2 pos = uLightPos * aspectRatio;
        
        vec2 lightDir = normalize(pos - uv);
        float lightDist = length(pos - uv);
        
        bool hitObject = false;
        vec2 marchPos = uv;
        float rayDist = 0.0;
        
        // Jittering
        float noise = random(uv + uTime);
        vec2 rayDirOffset = vec2(cos(noise * PI2), sin(noise * PI2));
        vec2 offset = rayDirOffset * 0.005; // Reduced diffusion
        vec2 step = (lightDir + offset) * 0.01;
        
        vec3 prevColor = vec3(0.0);
        
        // Ray March Loop
        for(int i = 0; i < 64; i++) {
            float marchDist = length(marchPos - uv);
            marchPos += step * mix(marchDist, 1.0, 0.4);
            
            vec4 texColor = texture2D(uTexture, marchPos / aspectRatio);
            rayDist = marchDist / lightDist;
            
            vec3 color = texColor.rgb;
            float colorDiff = length(color - prevColor);
            
            if (colorDiff > 0.25 && !hitObject) {
                hitObject = true;
                prevColor = color;
                if(marchDist < lightDist) {
                    break;
                }
            }
        }
        
        // Lighting Calculation
        rayDist = mix(rayDist * lightDist, rayDist, 0.75);
        
        vec3 lightContribution = mix(uLightColor, sceneColor.rgb * uLightColor, 1.0 - rayDist);
        lightContribution *= uIntensity * 2.0;
        
        vec3 finalColor = Tonemap_tanh(sceneColor.rgb + lightContribution * (1.0 - rayDist));
        
        // Dithering
        float dither = (random(gl_FragCoord.xy) - 0.5) / 255.0;
        finalColor += dither;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uLightPos.value.set(this.parameters.lightX, this.parameters.lightY);
        this.uniforms.uLightColor.value.set(this.parameters.color);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'lightX':
                this.parameters.lightX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.lightX;
                if (this.uniforms) this.uniforms.uLightPos.value.x = this.parameters.lightX;
                break;
            case 'lightY':
                this.parameters.lightY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.lightY;
                if (this.uniforms) this.uniforms.uLightPos.value.y = this.parameters.lightY;
                break;
            case 'color':
                this.parameters.color = value;
                if (this.uniforms) this.uniforms.uLightColor.value.set(this.parameters.color);
                break;
        }
    }
}
