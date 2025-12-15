import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface CRTConfig {
    curvature: number; // 0.0 to 1.0 - screen curvature amount
    scanlines: number; // 0.0 to 1.0 - scanline intensity
    vignetteIntensity: number; // 0.0 to 1.0 - edge darkening
    noise: number; // 0.0 to 1.0 - noise/interference amount
}

export class CRTEffect extends BaseShaderEffect {
    id = 'crt';
    name = 'CRT Monitor';
    description = 'Vintage CRT monitor effect with phosphors, scanlines, and curvature';
    parameters: CRTConfig;

    constructor(config: Partial<CRTConfig> = {}) {
        super();
        this.parameters = {
            curvature: 0.0,
            scanlines: 0.5,
            vignetteIntensity: 0.5,
            noise: 0.5,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uCurvature: { value: this.parameters.curvature },
            uScanlines: { value: this.parameters.scanlines },
            uVignetteIntensity: { value: this.parameters.vignetteIntensity },
            uNoise: { value: this.parameters.noise }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;

      uniform sampler2D uTexture;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uCurvature;
      uniform float uScanlines;
      uniform float uVignetteIntensity;
      uniform float uNoise;

      varying vec2 vUv;

      vec3 styleCRT(vec2 curvedUV) {
        float size = max(3.0 / 1080.0, 0.028 * (1.0 - uScanlines));
        float aspectRatio = uResolution.x / uResolution.y;
        float aspectCorrection = mix(aspectRatio, 1.0 / aspectRatio, 0.5);
        
        vec2 cellSize = vec2(size / aspectRatio, size) * aspectCorrection;
        
        // Staggered shadow mask pattern
        vec2 staggeredUV = curvedUV;
        if (mod(floor(curvedUV.x / cellSize.x), 2.0) > 0.5) {
          staggeredUV.y += 0.5 * cellSize.y;
        }
        
        vec2 cellCoords = floor(staggeredUV / cellSize) * cellSize;
        
        vec2 unstaggerOffset = vec2(0.0);
        if (mod(floor(curvedUV.x / cellSize.x), 2.0) > 0.5) {
          unstaggerOffset.y = -0.5 * cellSize.y;
        }
        
        vec2 sampleCoord = cellCoords + 0.5 * cellSize + unstaggerOffset;
        
        // 3x3 box blur for glow
        vec3 blurColor = vec3(0.0);
        float blurFactor = 1.0 / 9.0;
        for (int dx = -1; dx <= 1; dx++) {
          for (int dy = -1; dy <= 1; dy++) {
            vec2 offset = vec2(float(dx), float(dy)) * cellSize * uNoise;
            blurColor += texture2D(uTexture, sampleCoord + offset).rgb * blurFactor;
          }
        }
        
        // RGB phosphor simulation
        vec3 finalColor = vec3(0.0);
        vec2 staggeredCellPos = mod(staggeredUV, cellSize) / cellSize;
        
        float segmentWidth = 0.5;
        float distCoord = staggeredCellPos.x;
        
        float distRed = abs(distCoord - segmentWidth * 0.5);
        float distGreen = abs(distCoord - segmentWidth * 1.0);
        float distBlue = abs(distCoord - segmentWidth * 1.5);
        
        distRed = min(distRed, 1.0 - distRed);
        distGreen = min(distGreen, 1.0 - distGreen);
        distBlue = min(distBlue, 1.0 - distBlue);
        
        float softness = 0.75 * segmentWidth;
        
        float redFactor = smoothstep(softness, 0.0, distRed * 1.05);
        float greenFactor = smoothstep(softness, 0.0, distGreen * 1.1);
        float blueFactor = smoothstep(softness, 0.0, distBlue * 0.9);
        
        finalColor.r = redFactor * blurColor.r * (3.0 * uNoise);
        finalColor.g = greenFactor * blurColor.g * (3.0 * uNoise);
        finalColor.b = blueFactor * blurColor.b * (3.0 * uNoise);
        
        // Scanline darkening
        float edgeWidth = 0.05;
        vec2 edgeDistance = abs(staggeredCellPos - 0.5);
        float edgeFactor = smoothstep(0.45 - edgeWidth, 0.5, max(edgeDistance.x, edgeDistance.y));
        edgeFactor = ((1.0 - edgeFactor) + 0.2);
        finalColor = finalColor * edgeFactor;
        
        // Color depth reduction
        finalColor = floor(finalColor * 16.0) / 16.0;
        
        // Flicker
        float flicker = 1.0 + 0.03 * cos(sampleCoord.x / 60.0 + uTime * 20.0);
        finalColor *= mix(1.0, flicker, uNoise);
        
        return finalColor;
      }

      void main() {
        vec4 color = texture2D(uTexture, vUv);

        if (color.a <= 0.001) {
          gl_FragColor = vec4(0.0);
          return;
        }

        vec3 finalColor = styleCRT(vUv);
        vec4 col = mix(color, vec4(finalColor, color.a), 1.0);
        
        // Vignette
        vec2 center = vUv - 0.5;
        float vignette = 1.0 - dot(center, center) * uVignetteIntensity;
        col.rgb *= vignette;
        
        gl_FragColor = col;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uCurvature.value = this.parameters.curvature;
        this.uniforms.uScanlines.value = this.parameters.scanlines;
        this.uniforms.uVignetteIntensity.value = this.parameters.vignetteIntensity;
        this.uniforms.uNoise.value = this.parameters.noise;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'curvature':
                this.parameters.curvature = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.curvature;
                if (this.uniforms) this.uniforms.uCurvature.value = this.parameters.curvature;
                break;
            case 'scanlines':
                this.parameters.scanlines = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.scanlines;
                if (this.uniforms) this.uniforms.uScanlines.value = this.parameters.scanlines;
                break;
            case 'vignetteIntensity':
                this.parameters.vignetteIntensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.vignetteIntensity;
                if (this.uniforms) this.uniforms.uVignetteIntensity.value = this.parameters.vignetteIntensity;
                break;
            case 'noise':
                this.parameters.noise = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.noise;
                if (this.uniforms) this.uniforms.uNoise.value = this.parameters.noise;
                break;
        }
    }
}
