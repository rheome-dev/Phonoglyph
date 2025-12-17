import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface VideoConfig {
    scale: number; // 0.1 to 2.0
    rotation: number; // 0.0 to 360.0
    posX: number; // 0.0 to 1.0
    posY: number; // 0.0 to 1.0
    opacity: number; // 0.0 to 1.0
}

export class VideoEffect extends BaseShaderEffect {
    id = 'video';
    name = 'Video Overlay';
    description = 'Video texture overlay (requires video source)';
    parameters: VideoConfig;

    constructor(config: Partial<VideoConfig> = {}) {
        super();
        this.parameters = {
            scale: 1.0,
            rotation: 0.0,
            posX: 0.5,
            posY: 0.5,
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uVideoTexture: { value: null }, // Needs to be bound externally
            uScale: { value: this.parameters.scale },
            uRotation: { value: (this.parameters.rotation * Math.PI) / 180.0 },
            uPosition: { value: new THREE.Vector2(this.parameters.posX, this.parameters.posY) },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform sampler2D uVideoTexture;
      uniform vec2 uResolution;
      uniform float uScale;
      uniform float uRotation;
      uniform vec2 uPosition;
      uniform float uOpacity;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      mat2 rot(float a) {
        return mat2(cos(a), -sin(a), sin(a), cos(a));
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        float screenAspect = uResolution.x / uResolution.y;
        
        // Assume video aspect is 16:9 for now as we can't easily get it in shader without uniform
        float videoAspect = 16.0 / 9.0; 
        
        vec2 centeredUV = uv - uPosition;
        centeredUV.x *= screenAspect;
        
        centeredUV /= uScale;
        centeredUV *= rot(uRotation);
        
        centeredUV.x /= videoAspect;
        centeredUV += 0.5;
        
        if(centeredUV.x < 0.0 || centeredUV.x > 1.0 || centeredUV.y < 0.0 || centeredUV.y > 1.0) {
            gl_FragColor = bg;
            return;
        }
        
        vec4 videoColor = texture2D(uVideoTexture, centeredUV);
        
        vec3 finalColor = mix(bg.rgb, videoColor.rgb, uOpacity * videoColor.a);
        
        gl_FragColor = vec4(finalColor, max(bg.a, uOpacity * videoColor.a));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uRotation.value = (this.parameters.rotation * Math.PI) / 180.0;
        this.uniforms.uPosition.value.set(this.parameters.posX, this.parameters.posY);
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'rotation':
                this.parameters.rotation = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.rotation;
                if (this.uniforms) this.uniforms.uRotation.value = (this.parameters.rotation * Math.PI) / 180.0;
                break;
            case 'posX':
                this.parameters.posX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.posX;
                if (this.uniforms) this.uniforms.uPosition.value.x = this.parameters.posX;
                break;
            case 'posY':
                this.parameters.posY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.posY;
                if (this.uniforms) this.uniforms.uPosition.value.y = this.parameters.posY;
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
