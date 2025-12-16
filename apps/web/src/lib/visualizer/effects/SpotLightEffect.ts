import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface SpotLightConfig {
    intensity: number; // 0.0 to 2.0
    radius: number; // 0.0 to 1.0
    lightX: number; // 0.0 to 1.0
    lightY: number; // 0.0 to 1.0
    color: string; // Hex color
}

export class SpotLightEffect extends BaseShaderEffect {
    id = 'spotLight';
    name = 'Spot Light';
    description = 'Screen-space spotlight with bump mapping';
    parameters: SpotLightConfig;

    constructor(config: Partial<SpotLightConfig> = {}) {
        super();
        this.parameters = {
            intensity: 1.5,
            radius: 0.5,
            lightX: 0.5,
            lightY: 0.5,
            color: '#fa1ee3',
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uRadius: { value: this.parameters.radius },
            uLightPos: { value: new THREE.Vector2(this.parameters.lightX, this.parameters.lightY) },
            uColor: { value: new THREE.Color(this.parameters.color) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uRadius;
      uniform vec2 uLightPos;
      uniform vec3 uColor;
      
      varying vec2 vUv;
      
      float luma(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      float getHeight(vec2 uv) {
        return luma(texture2D(uTexture, uv).rgb);
      }

      vec4 computeNormal(vec2 uv) {
        vec2 ste = 1.0 / uResolution;
        float height = getHeight(uv);
        vec2 dxy = height - vec2(getHeight(uv + vec2(ste.x, 0.0)), getHeight(uv + vec2(0.0, ste.y)));
        return vec4(normalize(vec3(dxy * 5.0 / ste, 2.0)), height);
      }

      vec3 Tonemap_tanh(vec3 x) {
        x = clamp(x, -40.0, 40.0);
        return (exp(x) - exp(-x)) / (exp(x) + exp(-x));
      }

      void main() {
        vec2 uv = vUv;
        vec4 color = texture2D(uTexture, uv);
        vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
        
        vec2 pos = uLightPos;
        
        float dist = distance(uv * aspectRatio, pos * aspectRatio) / (uRadius + 0.001);
        float spot = max(0.0, max(0.0, (1.0 - dist)) * max(0.0, (1.0 - dist)));
        
        vec3 normal = computeNormal(uv).rgb * luma(color.rgb);
        
        vec2 lightDir = normalize(pos * aspectRatio - uv * aspectRatio);
        float diff = max(dot(normal, vec3(lightDir, 0.5)), 0.0);
        
        vec3 lightColor = uColor;
        
        vec3 base = color.rgb * lightColor * spot * uIntensity;
        vec3 diffuse = base * diff;
        
        // Specular
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        vec3 reflectDir = reflect(-vec3(lightDir, 0.0), normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 16.0);
        vec3 specular = lightColor * spec * spot * uIntensity;
        
        vec3 finalColor = color.rgb * 0.5 + diffuse + specular;
        finalColor = Tonemap_tanh(finalColor);
        
        gl_FragColor = vec4(finalColor, color.a);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uRadius.value = this.parameters.radius;
        this.uniforms.uLightPos.value.set(this.parameters.lightX, this.parameters.lightY);
        this.uniforms.uColor.value.set(this.parameters.color);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'radius':
                this.parameters.radius = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.radius;
                if (this.uniforms) this.uniforms.uRadius.value = this.parameters.radius;
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
                if (this.uniforms) this.uniforms.uColor.value.set(this.parameters.color);
                break;
        }
    }
}
