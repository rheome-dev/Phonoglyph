import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface LightTrailConfig {
    intensity: number; // 0.0 to 1.0
    trailLength: number; // 0.0 to 1.0
    color: string; // Hex color
}

export class LightTrailEffect extends BaseShaderEffect {
    id = 'lightTrail';
    name = 'Light Trail';
    description = 'Mouse/Touch light trail effect';
    parameters: LightTrailConfig;

    private mouseHistory: THREE.Vector2[] = [];
    private readonly MAX_HISTORY = 20;

    constructor(config: Partial<LightTrailConfig> = {}) {
        super();
        this.parameters = {
            intensity: 1.0,
            trailLength: 0.8,
            color: '#0082f7',
            ...config
        };

        // Initialize history
        for (let i = 0; i < this.MAX_HISTORY; i++) {
            this.mouseHistory.push(new THREE.Vector2(0.5, 0.5));
        }
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uTrailLength: { value: this.parameters.trailLength },
            uColor: { value: new THREE.Color(this.parameters.color) },
            uMouseHistory: { value: this.mouseHistory } // Array of vec2
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uTrailLength;
      uniform vec3 uColor;
      uniform vec2 uMouseHistory[20]; // Fixed size array
      
      varying vec2 vUv;
      
      float segment(vec2 p, vec2 a, vec2 b, float r) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h) - r;
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        float aspectRatio = uResolution.x / uResolution.y;
        vec2 p = uv;
        p.x *= aspectRatio;
        
        vec3 trail = vec3(0.0);
        
        for(int i = 0; i < 19; i++) {
            vec2 p1 = uMouseHistory[i];
            vec2 p2 = uMouseHistory[i+1];
            
            p1.x *= aspectRatio;
            p2.x *= aspectRatio;
            
            float dist = segment(p, p1, p2, 0.005 * uIntensity);
            
            // Fade based on index (older points are later in array or earlier? 
            // Assuming 0 is newest for this logic, need to verify update order)
            float fade = 1.0 - float(i) / 19.0;
            fade *= uTrailLength;
            
            float glow = 0.02 / (abs(dist) + 0.001);
            trail += uColor * glow * fade * 0.5;
        }
        
        // Composite
        vec3 finalColor = bg.rgb + trail;
        
        gl_FragColor = vec4(finalColor, bg.a);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uTrailLength.value = this.parameters.trailLength;
        this.uniforms.uColor.value.set(this.parameters.color);
        // uMouseHistory is updated by reference, but we need to ensure the uniform value is set
        this.uniforms.uMouseHistory.value = this.mouseHistory;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'trailLength':
                this.parameters.trailLength = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.trailLength;
                if (this.uniforms) this.uniforms.uTrailLength.value = this.parameters.trailLength;
                break;
            case 'color':
                this.parameters.color = value;
                if (this.uniforms) this.uniforms.uColor.value.set(this.parameters.color);
                break;
        }
    }

    // Custom method to update mouse history - needs to be called by the visualizer loop
    updateMousePosition(x: number, y: number) {
        // Shift history
        for (let i = this.MAX_HISTORY - 1; i > 0; i--) {
            this.mouseHistory[i].copy(this.mouseHistory[i - 1]);
        }
        this.mouseHistory[0].set(x, y);
    }
}
