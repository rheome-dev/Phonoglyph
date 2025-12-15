import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface PixelateConfig {
    pixelSize: number; // 0.01 to 1.0 - size of pixels relative to screen
    shape: 'square' | 'circle'; // shape of the pixels
}

export class PixelateEffect extends BaseShaderEffect {
    id = 'pixelate';
    name = 'Pixelate';
    description = 'Mosaic pixelation effect with configurable pixel size';
    parameters: PixelateConfig;

    constructor(config: Partial<PixelateConfig> = {}) {
        super();
        this.parameters = {
            pixelSize: 0.5,
            shape: 'square',
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uPixelSize: { value: this.parameters.pixelSize },
            uShape: { value: this.parameters.shape === 'circle' ? 1.0 : 0.0 }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision mediump float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uPixelSize;
      uniform float uShape;

      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        vec2 pos = vec2(0.5, 0.5);
        
        // Grid size calculation
        float gridSize = (uPixelSize + 0.01) * 0.083;
        float baseGrid = 1.0 / gridSize;
        
        // Aspect ratio correction
        float aspectCorrection = mix(aspectRatio, 1.0 / aspectRatio, 0.5);
        vec2 cellSize = vec2(1.0 / (baseGrid * aspectRatio), 1.0 / baseGrid) * aspectCorrection;
        
        // Coordinate quantization
        vec2 offsetUv = uv - pos;
        vec2 cell = floor(offsetUv / cellSize);
        vec2 cellCenter = (cell + 0.5) * cellSize;
        vec2 pixelatedCoord = cellCenter + pos;
        
        // Sample at cell center
        vec4 color = texture2D(uTexture, pixelatedCoord);
        
        // Cell edge smoothing for circle shape
        if (uShape > 0.5) {
          vec2 relativePos = mod(offsetUv, cellSize) / cellSize - 0.5;
          float dist = length(relativePos);
          float edgeSmoothing = 0.02;
          float alpha = 1.0 - smoothstep(0.5 - edgeSmoothing, 0.5, dist);
          color.rgb = mix(vec3(0.0), color.rgb, alpha);
        }
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uPixelSize.value = this.parameters.pixelSize;
        this.uniforms.uShape.value = this.parameters.shape === 'circle' ? 1.0 : 0.0;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'pixelSize':
                this.parameters.pixelSize = typeof value === 'number' ? Math.max(0.01, Math.min(1.0, value)) : this.parameters.pixelSize;
                if (this.uniforms) this.uniforms.uPixelSize.value = this.parameters.pixelSize;
                break;
            case 'shape':
                this.parameters.shape = value === 'circle' || value === 'square' ? value : this.parameters.shape;
                if (this.uniforms) this.uniforms.uShape.value = this.parameters.shape === 'circle' ? 1.0 : 0.0;
                break;
        }
    }
}
