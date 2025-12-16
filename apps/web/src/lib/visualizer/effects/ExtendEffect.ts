import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface ExtendConfig {
    intensity: number; // 0.0 to 1.0, maps to scale
    angle1: number; // 0.0 to 360.0
    angle2: number; // 0.0 to 360.0
}

export class ExtendEffect extends BaseShaderEffect {
    id = 'extend';
    name = 'Extend';
    description = 'Intersection-based linear stretch distortion';
    parameters: ExtendConfig;

    constructor(config: Partial<ExtendConfig> = {}) {
        super();
        this.parameters = {
            intensity: 0.5,
            angle1: 90.0,
            angle2: 180.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uAngle1: { value: (this.parameters.angle1 * Math.PI) / 180.0 },
            uAngle2: { value: (this.parameters.angle2 * Math.PI) / 180.0 }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uAngle1;
      uniform float uAngle2;
      
      varying vec2 vUv;
      
      const float PI = 3.1415926;

      float pointLineSide(vec2 A, vec2 B, vec2 P) {
        vec2 d = B - A;
        vec2 AP = P - A;
        return d.y * AP.x - d.x * AP.y;
      }

      void main() {
        vec2 uv = vUv;
        
        // Map intensity to scale (0.0 to 0.25)
        float scale = uIntensity * 0.25;
        float aspectRatio = uResolution.x / uResolution.y;
        
        vec2 aspectCorrection = vec2(aspectRatio - 1.0, 0.0);
        vec2 pos = vec2(0.5, 0.5) + aspectCorrection * (aspectRatio < 1.0 ? 0.1 : 0.05);

        // Line 1 (A-B)
        vec2 pointA = pos + vec2(0.1 * sin(uAngle1), 0.1 * cos(uAngle1));
        vec2 pointB = pos - vec2(0.1 * sin(uAngle1), 0.1 * cos(uAngle1));

        // Line 2 (C-D)
        vec2 pointC = uv + vec2(0.1 * sin(uAngle2), 0.1 * cos(uAngle2));
        vec2 pointD = uv - vec2(0.1 * sin(uAngle2), 0.1 * cos(uAngle2));

        // Intersection
        float m1 = (pointB.y - pointA.y) / (pointB.x - pointA.x + 0.0000001);
        float c1 = pointA.y - m1 * pointA.x;
        
        float m2 = (pointD.y - pointC.y) / (pointD.x - pointC.x + 0.0000001);
        float c2 = pointC.y - m2 * pointC.x;
        
        float intersectX = (c1 - c2) / (m2 - m1);
        float intersectY = intersectX * m1 + c1;
        
        vec2 offset = vec2(intersectX, intersectY);

        // Stretch Direction
        vec2 stretchDir = vec2(cos(-uAngle2), sin(-uAngle2));
        vec2 perpStretchDir = vec2(-stretchDir.y, stretchDir.x);

        float distToLine = 1.0 - distance(uv, offset);
        float insideStretch = distToLine > (1.0 - scale) ? 1.0 : 0.0;

        float stretchOffsetDir = pointLineSide(pointA, pointB, uv) > 0.0 ? -1.0 : 1.0;
        
        uv += mix(perpStretchDir * scale * stretchOffsetDir, vec2(0.0), insideStretch);
        uv = mix(uv, offset, insideStretch);
        
        gl_FragColor = texture2D(uTexture, uv);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uAngle1.value = (this.parameters.angle1 * Math.PI) / 180.0;
        this.uniforms.uAngle2.value = (this.parameters.angle2 * Math.PI) / 180.0;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'angle1':
                this.parameters.angle1 = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.angle1;
                if (this.uniforms) this.uniforms.uAngle1.value = (this.parameters.angle1 * Math.PI) / 180.0;
                break;
            case 'angle2':
                this.parameters.angle2 = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.angle2;
                if (this.uniforms) this.uniforms.uAngle2.value = (this.parameters.angle2 * Math.PI) / 180.0;
                break;
        }
    }
}
