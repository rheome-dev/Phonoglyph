import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { MultiLayerCompositor } from '../core/MultiLayerCompositor';

export class BloomEffect implements VisualEffect {
  id = 'bloom';
  name = 'Bloom Post-Processing';
  description = 'Global bloom effect for all visualizations';
  enabled = true;
  parameters = {
    threshold: 0.25,  // Increased threshold to make bloom less sensitive
    strength: 0.1,    // Reduced strength for a softer glow
    radius: 0.4,      // Tighter radius for the glow
    exposure: 0.8     // Keep exposure neutral
  };

  private scene!: THREE.Scene;
  private camera!: THREE.Camera;
  private renderer!: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private finalPass!: ShaderPass;

  private renderPass!: RenderPass;

  // Multi-layer compositor integration
  private multiLayerCompositor: MultiLayerCompositor | null = null;
  private useMultiLayerCompositing: boolean = false; // Disabled by default for now

  constructor() {
    console.log('✨ BloomEffect constructor called');
  }

  init(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    console.log('✨ BloomEffect.init() called');
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    if (this.useMultiLayerCompositing) {
      this.setupMultiLayerCompositor();
    } else {
      this.setupComposer();
    }

    console.log('✨ Bloom effect initialized');
  }

  private setupMultiLayerCompositor(): void {
    const canvas = this.renderer.domElement;

    this.multiLayerCompositor = new MultiLayerCompositor(this.renderer, {
      width: canvas.width,
      height: canvas.height,
      enableBloom: true,
      enableAntialiasing: true,
      pixelRatio: window.devicePixelRatio || 1
    });

    // Create main 3D effects layer
    this.multiLayerCompositor.createLayer('main-3d', this.scene, this.camera, {
      blendMode: 'normal',
      opacity: 1.0,
      zIndex: 100,
      enabled: true
    });

    console.log('🎨 Multi-layer compositor setup complete');
  }

  private setupComposer() {
    // Create effect composer
    this.composer = new EffectComposer(this.renderer);

    // Add render pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Add bloom pass
    const size = this.renderer.getSize(new THREE.Vector2());
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      this.parameters.strength,
      this.parameters.radius,
      this.parameters.threshold
    );
    this.composer.addPass(this.bloomPass);

    // Create final pass for exposure control
    const finalPassShader = {
      uniforms: {
        tDiffuse: { value: null },
        uExposure: { value: this.parameters.exposure }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uExposure;
        varying vec2 vUv;
        
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // Apply exposure
          color.rgb *= uExposure;
          
          // Gamma correction
          color.rgb = pow(color.rgb, vec3(1.0 / 2.2));
          
          gl_FragColor = color;
        }
      `
    };

    this.finalPass = new ShaderPass(finalPassShader);
    this.composer.addPass(this.finalPass);

    console.log('🎭 Bloom composer setup complete');
  }

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
    // Keep bloom parameters more static for consistent white glow
    const intensity = Math.max(0.3, Math.min(midiData.activeNotes.length / 5.0, 1.0));

    // Update bloom pass if available (traditional composer mode)
    if (this.bloomPass) {
      // Much more subtle dynamic bloom - less variation to avoid color shifts
      this.bloomPass.strength = this.parameters.strength * (0.9 + intensity * 0.1);

      // Keep threshold more stable
      this.bloomPass.threshold = this.parameters.threshold * (1.0 + intensity * 0.1);
    }

    // Update final pass if available
    if (this.finalPass && this.finalPass.uniforms && this.finalPass.uniforms.uExposure) {
      // Keep exposure stable for consistent white color
      this.finalPass.uniforms.uExposure.value = this.parameters.exposure;
    }

    // For multi-layer compositor mode, we might need different update logic
    // The compositor handles bloom internally, so we don't need to update passes here
  }

  // Custom render method to replace the normal renderer.render call
  render(): void {
    if (this.useMultiLayerCompositing && this.multiLayerCompositor) {
      // Use GPU-based multi-layer compositing
      this.multiLayerCompositor.render();
    } else if (this.composer) {
      // Fallback to traditional composer
      this.composer.render();
    }
  }

  // Method to handle window resize
  handleResize(width: number, height: number): void {
    if (this.useMultiLayerCompositing && this.multiLayerCompositor) {
      this.multiLayerCompositor.resize(width, height);
    } else if (this.composer) {
      this.composer.setSize(width, height);
      this.bloomPass.setSize(width, height);
    }
  }

  destroy(): void {
    console.log('🧹 BloomEffect.destroy() called');

    // Dispose of multi-layer compositor
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.dispose();
      this.multiLayerCompositor = null;
    }

    // Dispose of composer and passes
    if (this.composer) {
      this.composer.dispose();
    }
  }

  /**
   * Add a new layer to the compositor
   */
  public addLayer(
    id: string,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options?: {
      blendMode?: string;
      opacity?: number;
      zIndex?: number;
      enabled?: boolean;
    }
  ): void {
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.createLayer(id, scene, camera, options);
    }
  }

  /**
   * Remove a layer from the compositor
   */
  public removeLayer(id: string): void {
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.removeLayer(id);
    }
  }

  /**
   * Update layer properties
   */
  public updateLayer(id: string, properties: any): void {
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.updateLayer(id, properties);
    }
  }

  /**
   * Enable multi-layer compositing (for testing)
   */
  public enableMultiLayerCompositing(): void {
    if (!this.useMultiLayerCompositing) {
      this.useMultiLayerCompositing = true;
      this.setupMultiLayerCompositor();
      console.log('🎨 Multi-layer compositing enabled');
    }
  }

  /**
   * Check if multi-layer compositing is enabled
   */
  public isMultiLayerCompositingEnabled(): boolean {
    return this.useMultiLayerCompositing && this.multiLayerCompositor !== null;
  }
} 