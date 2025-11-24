import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { MultiLayerCompositor } from '../core/MultiLayerCompositor';
import { debugLog } from '@/lib/utils';

export interface BloomFilterConfig {
  intensity: number; // 0-2
  threshold: number; // 0-1
  softness: number;  // 0-1 soft knee for threshold
  radius: number;    // 0-1 normalized blur radius
  sourceTexture?: THREE.Texture;
}

/**
 * BloomFilterEffect
 * Screen-space post-processing filter that samples layers beneath it via the MultiLayerCompositor.
 * Implemented similarly to AsciiFilterEffect so it plays nicely with the layer stack + parameter mapping UI.
 */
export class BloomFilterEffect implements VisualEffect {
  id = 'bloomFilter';
  name: string;
  description: string;
  enabled: boolean;
  parameters: BloomFilterConfig;

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material!: THREE.ShaderMaterial;
  private mesh!: THREE.Mesh;
  private renderer!: THREE.WebGLRenderer;
  private uniforms!: Record<string, THREE.IUniform>;
  private compositor?: MultiLayerCompositor;
  private layerId?: string;
  private fallbackTexture: THREE.DataTexture;
  private logFrame = 0;

  constructor(config: Partial<BloomFilterConfig> = {}) {
    this.name = 'Bloom Filter';
    this.description = 'Adds cinematic bloom to everything below this layer.';
    this.enabled = true;

    const { sourceTexture, ...rest } = config;
    this.parameters = {
      intensity: 0.75,
      threshold: 0.55,
      softness: 0.35,
      radius: 0.35,
      sourceTexture,
      ...rest
    };

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Transparent fallback texture avoids shader warnings while compositor sources warm up.
    this.fallbackTexture = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 0]),
      1,
      1,
      THREE.RGBAFormat
    );
    this.fallbackTexture.needsUpdate = true;
  }

  public setCompositor(compositor: MultiLayerCompositor, layerId: string) {
    debugLog.log('🔗 [Bloom Filter] setCompositor called', { layerId });
    this.compositor = compositor;
    this.layerId = layerId;
  }

  init(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    this.setupUniforms();
    this.createMaterial();
    this.createMesh();
    debugLog.log('✅ Bloom Filter initialized');
  }

  private setupUniforms() {
    const size = this.renderer
      ? this.renderer.getSize(new THREE.Vector2())
      : new THREE.Vector2(1024, 1024);

    this.uniforms = {
      uTexture: { value: this.parameters.sourceTexture || this.fallbackTexture },
      uResolution: { value: new THREE.Vector2(size.x, size.y) },
      uIntensity: { value: this.parameters.intensity },
      uThreshold: { value: this.parameters.threshold },
      uSoftness: { value: this.parameters.softness },
      uRadius: { value: this.parameters.radius }
    };
  }

  private createMaterial() {
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uThreshold;
      uniform float uSoftness;
      uniform float uRadius;

      varying vec2 vUv;

      float luminance(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      void main() {
        vec4 base = texture2D(uTexture, vUv);
        if (base.a <= 0.001) {
          gl_FragColor = base;
          return;
        }

        float knee = max(0.0001, uSoftness);
        float bright = luminance(base.rgb);
        float mask = smoothstep(uThreshold - knee, uThreshold + knee, bright);

        vec2 texel = vec2(uRadius) / uResolution;
        vec3 bloom = vec3(0.0);
        float total = 0.0;

        // 9-tap blur kernel (cross + diagonals)
        vec2 offsets[9];
        offsets[0] = vec2(0.0, 0.0);
        offsets[1] = vec2(1.0, 0.0);
        offsets[2] = vec2(-1.0, 0.0);
        offsets[3] = vec2(0.0, 1.0);
        offsets[4] = vec2(0.0, -1.0);
        offsets[5] = vec2(1.0, 1.0);
        offsets[6] = vec2(-1.0, 1.0);
        offsets[7] = vec2(1.0, -1.0);
        offsets[8] = vec2(-1.0, -1.0);

        float weights[9];
        weights[0] = 0.28;
        weights[1] = weights[2] = weights[3] = weights[4] = 0.12;
        weights[5] = weights[6] = weights[7] = weights[8] = 0.06;

        for (int i = 0; i < 9; i++) {
          vec2 offset = offsets[i] * texel;
          vec4 sampleColor = texture2D(uTexture, vUv + offset);
          bloom += sampleColor.rgb * weights[i];
          total += weights[i];
        }

        bloom /= max(total, 0.0001);
        bloom *= mask * uIntensity;

        vec3 color = base.rgb + bloom;
        gl_FragColor = vec4(color, base.a);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
  }

  private createMesh() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
  }

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
    if (!this.uniforms) return;

    // Slight live boost to feel responsive to audio energy.
    const midiEnergy = Math.min(1, midiData.activeNotes.length / 8);
    const audioEnergy = Math.min(1, audioData.volume ?? 0);
    const dynamicBoost = 1 + (audioEnergy * 0.25) + (midiEnergy * 0.15);
    this.uniforms.uIntensity.value = this.parameters.intensity * dynamicBoost;

    this.uniforms.uThreshold.value = this.parameters.threshold;
    this.uniforms.uSoftness.value = this.parameters.softness;
    this.uniforms.uRadius.value = this.parameters.radius;

    if (this.renderer) {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.uniforms.uResolution.value.set(size.x, size.y);
    }

    this.updateSourceTexture();
  }

  private updateSourceTexture() {
    if (!this.uniforms?.uTexture) return;

    this.logFrame++;
    const shouldLog = this.logFrame % 120 === 0;

    let texture: THREE.Texture | null = null;
    if (this.compositor && this.layerId) {
      texture = this.compositor.getAccumulatedTextureBeforeLayer(this.layerId);
      if (shouldLog) {
        debugLog.log('🔦 [Bloom Filter] compositor texture', {
          layerId: this.layerId,
          hasTexture: !!texture
        });
      }
    }

    if (!texture) {
      texture = this.parameters.sourceTexture || this.fallbackTexture;
      if (shouldLog) {
        debugLog.log('🔦 [Bloom Filter] using fallback texture');
      }
    }

    if (this.uniforms.uTexture.value !== texture) {
      this.uniforms.uTexture.value = texture;
    }
  }

  updateParameter(paramName: string, value: any): void {
    if (!this.uniforms) return;

    switch (paramName) {
      case 'intensity': {
        const clamped = Math.min(2, Math.max(0, Number(value)));
        this.parameters.intensity = clamped;
        this.uniforms.uIntensity.value = clamped;
        break;
      }
      case 'threshold': {
        const clamped = Math.min(1, Math.max(0, Number(value)));
        this.parameters.threshold = clamped;
        this.uniforms.uThreshold.value = clamped;
        break;
      }
      case 'softness': {
        const clamped = Math.min(1, Math.max(0.01, Number(value)));
        this.parameters.softness = clamped;
        this.uniforms.uSoftness.value = clamped;
        break;
      }
      case 'radius': {
        const clamped = Math.min(1, Math.max(0.05, Number(value)));
        this.parameters.radius = clamped;
        this.uniforms.uRadius.value = clamped;
        break;
      }
      case 'sourceTexture': {
        this.parameters.sourceTexture = value;
        this.uniforms.uTexture.value = value || this.fallbackTexture;
        break;
      }
    }
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.Camera {
    return this.camera;
  }

  resize(width: number, height: number): void {
    if (this.uniforms?.uResolution) {
      this.uniforms.uResolution.value.set(width, height);
    }
  }

  destroy(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }
    this.material?.dispose();
    this.fallbackTexture?.dispose();
  }
}