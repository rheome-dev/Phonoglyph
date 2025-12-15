import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface GlitchConfig {
    blockSize: number; // 0.0 to 1.0 - size of glitch blocks
    offset: number; // 0.0 to 1.0 - strength of horizontal offset
    chromatic: number; // 0.0 to 1.0 - chromatic aberration strength
    frequency: number; // 0.0 to 1.0 - how often glitches occur
}

export class GlitchEffect extends BaseShaderEffect {
    id = 'glitch';
    name = 'Digital Glitch';
    description = 'VHS-style digital glitch with block corruption and chromatic aberration';
    parameters: GlitchConfig;

    constructor(config: Partial<GlitchConfig> = {}) {
        super();
        this.parameters = {
            blockSize: 0.5,
            offset: 0.5,
            chromatic: 0.5,
            frequency: 0.5,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uBlockSize: { value: this.parameters.blockSize },
            uOffset: { value: this.parameters.offset },
            uChromatic: { value: this.parameters.chromatic },
            uFrequency: { value: this.parameters.frequency }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      precision highp int;

      uniform sampler2D uTexture;
      uniform float uTime;
      uniform float uBlockSize;
      uniform float uOffset;
      uniform float uChromatic;
      uniform float uFrequency;

      varying vec2 vUv;

      // PCG hash for randomness
      uvec2 pcg2d(uvec2 v) {
        v = v * 1664525u + 1013904223u;
        v.x += v.y * v.y * 1664525u + 1013904223u;
        v.y += v.x * v.x * 1664525u + 1013904223u;
        v ^= v >> 16;
        v.x += v.y * v.y * 1664525u + 1013904223u;
        v.y += v.x * v.x * 1664525u + 1013904223u;
        return v;
      }

      float randFibo(vec2 p) {
        uvec2 v = floatBitsToUint(p);
        v = pcg2d(v);
        uint r = v.x ^ v.y;
        return float(r) / float(0xffffffffu);
      }

      void main() {
        vec2 uv = vUv;
        
        // Time-based randomness (alternating every 2 seconds)
        float timeRand1 = randFibo(vec2(floor(uTime * 0.5) * 2.0 + 0.001, 0.5));
        float timeRand2 = randFibo(vec2(floor(uTime * 0.5) * 2.0 + 1.001, 0.5));
        
        // Glitch line size
        float sizeX = uBlockSize * 0.2 * timeRand1;
        float sizeY = uBlockSize * 0.2 * timeRand2;
        
        float floorY = floor(uv.y / sizeY) + 0.005;
        float floorX = floor(uv.x / sizeX) + 0.005;
        
        float phase = 0.0;
        float chromab = uChromatic * 0.75;
        float offset = 0.0;
        
        // Block tearing/corruption
        vec2 blockSize = vec2(50.0, 50.0) * (1.0 - uBlockSize);
        vec2 blockUV = floor(uv * blockSize) / blockSize;
        float blockRand = randFibo(blockUV);
        float blockTimeRand = timeRand1;
        
        // Block noise (80% of blocks affected at full frequency)
        float blockNoise = mix(
          1.0,
          step(0.8, randFibo(vec2(blockTimeRand, blockRand))),
          0.8 * uFrequency
        );
        
        float offsetX = uOffset * 0.5 * blockNoise;
        float offsetY = 0.0;
        
        // Line tearing
        float randY = randFibo(vec2(sin(floorY + offset + phase), 0.5));
        float randX = randFibo(vec2(cos(floorX + offset + phase), 0.5));
        
        float glitchModX = max(0.005, sign(randY - 0.5 - (1.0 - uFrequency * 2.0) / 2.0));
        float glitchModY = max(0.005, sign(randX - 0.5 - (1.0 - uFrequency * 2.0) / 2.0));
        
        float randOffX = randFibo(vec2(floorY + offset * glitchModX + phase, 0.7));
        float randOffY = randFibo(vec2(floorX + offset * glitchModY + phase, 0.9));
        
        float offX = (randOffX * offsetX - offsetX / 2.0) / 5.0;
        float offY = (randOffY * offsetY - offsetY / 2.0) / 5.0;
        
        offX = clamp(offX, -1.0, 1.0);
        offY = clamp(offY, -1.0, 1.0);
        
        uv.x = mix(uv.x, uv.x + offX * 2.0, glitchModX);
        uv.y = mix(uv.y, uv.y + offY * 2.0, glitchModY);
        
        // Sinusoidal wave distortion
        float waveFreq = 30.0;
        float waveAmp = 0.005 * 0.2;
        float timeOffset = uTime * 0.05;
        
        float sinY = sin(uv.y * waveFreq * (1.0 - uFrequency) * 2.0 + timeOffset);
        float rogue = smoothstep(0.0, 2.0, sinY - 0.5) * 0.2 * 0.2;
        
        float sinWaveX = sin(uv.y * waveFreq + uTime);
        float sinWaveY = sin(uv.x * waveFreq + uTime);
        
        uv.x += sinWaveX * waveAmp + rogue;
        uv.y += sinWaveY * waveAmp;
        
        float waveX = sinWaveX * waveAmp + rogue * chromab * 0.2;
        
        uv = clamp(uv, vec2(0.005), vec2(0.995));
        
        // Chromatic aberration
        vec4 color = texture2D(uTexture, uv);
        
        vec2 redOffset = vec2(
          clamp(uv.x + (glitchModX * -offX * chromab - waveX), 0.005, 0.995),
          clamp(uv.y + (glitchModX * -offY * chromab), 0.005, 0.995)
        );
        
        vec2 blueOffset = vec2(
          clamp(uv.x + (glitchModX * offX * chromab + waveX), 0.005, 0.995),
          clamp(uv.y + (glitchModX * offY * chromab), 0.005, 0.995)
        );
        
        color.r = texture2D(uTexture, redOffset).r;
        color.b = texture2D(uTexture, blueOffset).b;
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uBlockSize.value = this.parameters.blockSize;
        this.uniforms.uOffset.value = this.parameters.offset;
        this.uniforms.uChromatic.value = this.parameters.chromatic;
        this.uniforms.uFrequency.value = this.parameters.frequency;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'blockSize':
                this.parameters.blockSize = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.blockSize;
                if (this.uniforms) this.uniforms.uBlockSize.value = this.parameters.blockSize;
                break;
            case 'offset':
                this.parameters.offset = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.offset;
                if (this.uniforms) this.uniforms.uOffset.value = this.parameters.offset;
                break;
            case 'chromatic':
                this.parameters.chromatic = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.chromatic;
                if (this.uniforms) this.uniforms.uChromatic.value = this.parameters.chromatic;
                break;
            case 'frequency':
                this.parameters.frequency = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.frequency;
                if (this.uniforms) this.uniforms.uFrequency.value = this.parameters.frequency;
                break;
        }
    }
}
