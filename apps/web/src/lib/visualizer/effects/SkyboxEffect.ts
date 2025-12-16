import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface SkyboxConfig {
    fov: number; // 20.0 to 120.0
    rotationX: number; // 0.0 to 1.0
    rotationY: number; // 0.0 to 1.0
    zoom: number; // 0.5 to 2.0
}

export class SkyboxEffect extends BaseShaderEffect {
    id = 'skybox';
    name = 'Skybox Projection';
    description = 'Equirectangular 360 projection';
    parameters: SkyboxConfig;

    constructor(config: Partial<SkyboxConfig> = {}) {
        super();
        this.parameters = { fov: 90.0, rotationX: 0.5, rotationY: 0.5, zoom: 1.0, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uFov: { value: (this.parameters.fov * Math.PI) / 180.0 },
            uRotation: { value: new THREE.Vector2(this.parameters.rotationX, this.parameters.rotationY) },
            uZoom: { value: this.parameters.zoom }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uFov;
      uniform vec2 uRotation;
      uniform float uZoom;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265;

      vec3 getRayDirection(vec2 uv, vec2 mousePos, float aspect) {
        vec2 screenPos = (uv - 0.5) * 2.0;
        screenPos.x *= aspect;
        screenPos.y *= -1.0;
        
        float fov = uFov;
        
        vec3 rayDir = normalize(vec3(
            screenPos.x * tan(fov / 2.0),
            screenPos.y * tan(fov / 2.0),
            -1.0
        ));
        
        float rotX = (mousePos.y - 0.5) * PI;
        float rotY = (mousePos.x - 0.5) * PI * 2.0;
        
        mat3 rotateY = mat3(
            cos(rotY), 0.0, -sin(rotY),
            0.0, 1.0, 0.0,
            sin(rotY), 0.0, cos(rotY)
        );
        mat3 rotateX = mat3(
            1.0, 0.0, 0.0,
            0.0, cos(rotX), sin(rotX),
            0.0, -sin(rotX), cos(rotX)
        );
        
        return normalize(rotateX * rotateY * rayDir);
      }

      vec2 directionToUVHorizontal(vec3 dir) {
        float longitude = atan(dir.z, dir.x);
        float latitude = acos(dir.y);
        
        vec2 uv;
        uv.x = longitude / (2.0 * PI) + 0.5;
        uv.y = latitude / PI;
        uv.x += 0.25;
        return uv;
      }

      vec2 directionToUVVertical(vec3 dir) {
        float longitude = atan(dir.z, dir.y);
        float latitude = acos(dir.x);
        
        vec2 uv;
        uv.y = longitude / PI * -1.0;
        uv.x = (latitude / (2.0 * PI) + 0.5) * -1.0;
        uv.x = fract(uv.x + 0.25);
        return uv;
      }

      void main() {
        float aspect = uResolution.x / uResolution.y;
        vec2 mPos = uRotation;
        
        vec3 rayDir = getRayDirection(vUv, mPos, aspect);
        
        vec2 uvHorizontal = directionToUVHorizontal(rayDir);
        vec2 uvVertical = directionToUVVertical(rayDir);
        
        vec2 sphereUV = mix(uvHorizontal, uvVertical, 0.4);
        
        float fovCompensation = tan(uFov / 2.0);
        float compensatedScale = (2.0 * uZoom) * (1.0 / fovCompensation);
        
        sphereUV = (sphereUV - 0.5) * compensatedScale + 0.5;
        sphereUV += vec2(0.5, 0.0) * uTime * 0.005;
        
        vec2 finalUV = vec2(fract(sphereUV.x), sphereUV.y);
        
        gl_FragColor = texture2D(uTexture, finalUV);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uFov.value = (this.parameters.fov * Math.PI) / 180.0;
        this.uniforms.uRotation.value.set(this.parameters.rotationX, this.parameters.rotationY);
        this.uniforms.uZoom.value = this.parameters.zoom;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'fov':
                this.parameters.fov = typeof value === 'number' ? Math.max(20.0, Math.min(120.0, value)) : this.parameters.fov;
                if (this.uniforms) this.uniforms.uFov.value = (this.parameters.fov * Math.PI) / 180.0;
                break;
            case 'rotationX':
                this.parameters.rotationX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.rotationX;
                if (this.uniforms) this.uniforms.uRotation.value.x = this.parameters.rotationX;
                break;
            case 'rotationY':
                this.parameters.rotationY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.rotationY;
                if (this.uniforms) this.uniforms.uRotation.value.y = this.parameters.rotationY;
                break;
            case 'zoom':
                this.parameters.zoom = typeof value === 'number' ? Math.max(0.5, Math.min(2.0, value)) : this.parameters.zoom;
                if (this.uniforms) this.uniforms.uZoom.value = this.parameters.zoom;
                break;
        }
    }
}
