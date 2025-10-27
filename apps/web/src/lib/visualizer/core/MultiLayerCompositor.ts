import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { TexturePass } from 'three/examples/jsm/postprocessing/TexturePass.js';

export interface LayerRenderTarget {
  id: string;
  renderTarget: THREE.WebGLRenderTarget;
  scene: THREE.Scene;
  camera: THREE.Camera;
  enabled: boolean;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add' | 'subtract';
  opacity: number;
  zIndex: number;
  material?: THREE.ShaderMaterial;
}

export interface CompositorConfig {
  width: number;
  height: number;
  enableBloom?: boolean;
  enableAntialiasing?: boolean;
  pixelRatio?: number;
}

export class MultiLayerCompositor {
  private renderer: THREE.WebGLRenderer;
  private config: CompositorConfig;
  
  // Layer management
  private layers: Map<string, LayerRenderTarget> = new Map();
  private layerOrder: string[] = [];
  
  // Render targets
  private mainRenderTarget: THREE.WebGLRenderTarget;
  private bloomRenderTarget: THREE.WebGLRenderTarget;
  private tempRenderTarget: THREE.WebGLRenderTarget;
  
  // Shared geometry for full-screen rendering
  private quadGeometry: THREE.PlaneGeometry;
  private quadCamera: THREE.OrthographicCamera;
  
  // Blend mode shaders
  private blendShaders: Map<string, string> = new Map();

  // Post-processing
  private postProcessingComposer!: EffectComposer;
  private texturePass!: TexturePass;
  private bloomPass?: UnrealBloomPass;
  private fxaaPass?: ShaderPass;
  
  constructor(renderer: THREE.WebGLRenderer, config: CompositorConfig) {
    this.renderer = renderer;
    this.config = {
      enableBloom: false,
      enableAntialiasing: true,
      pixelRatio: window.devicePixelRatio || 1,
      ...config
    };
    
    // Ensure transparent clearing for all off-screen targets
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);

    // Create render targets (use multisample if available for better AA)
    const isWebGL2 = (this.renderer.getContext() as WebGL2RenderingContext | WebGLRenderingContext).constructor.name.includes('WebGL2');
    const RTClass: any = (isWebGL2 && (THREE as any).WebGLMultisampleRenderTarget)
      ? (THREE as any).WebGLMultisampleRenderTarget
      : THREE.WebGLRenderTarget;

    this.mainRenderTarget = new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false
      }
    );
    if ('samples' in this.mainRenderTarget) {
      (this.mainRenderTarget as any).samples = 4;
    }
    
    this.bloomRenderTarget = new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false
      }
    );
    if ('samples' in this.bloomRenderTarget) {
      (this.bloomRenderTarget as any).samples = 4;
    }
    
    this.tempRenderTarget = new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false
      }
    );
    if ('samples' in this.tempRenderTarget) {
      (this.tempRenderTarget as any).samples = 4;
    }
    
    // Create shared geometry and camera
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Initialize blend mode shaders
    this.initializeBlendShaders();

    // Initialize post-processing (bloom, etc.)
    this.initializePostProcessing();
  }
  
  /**
   * Create a new layer
   */
  public createLayer(
    id: string,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: Partial<Omit<LayerRenderTarget, 'id' | 'scene' | 'camera'>> = {}
  ): LayerRenderTarget {
    console.log(`🎬 Creating layer "${id}", scene.background =`, scene.background);
    
    const isWebGL2 = (this.renderer.getContext() as WebGL2RenderingContext | WebGLRenderingContext).constructor.name.includes('WebGL2');
    const RTClass: any = (isWebGL2 && (THREE as any).WebGLMultisampleRenderTarget)
      ? (THREE as any).WebGLMultisampleRenderTarget
      : THREE.WebGLRenderTarget;

    const renderTarget = new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false
      }
    );
    if ('samples' in renderTarget) {
      (renderTarget as any).samples = 4;
    }
    
    const layer: LayerRenderTarget = {
      id,
      renderTarget,
      scene,
      camera,
      enabled: true,
      blendMode: 'normal',
      opacity: 1.0,
      zIndex: 0,
      ...options
    };
    
    this.layers.set(id, layer);
    this.layerOrder.push(id);
    this.sortLayers();
    
    return layer;
  }
  
  /**
   * Remove a layer
   */
  public removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.renderTarget.dispose();
      this.layers.delete(id);
      this.layerOrder = this.layerOrder.filter(layerId => layerId !== id);
    }
  }
  
  /**
   * Update layer properties
   */
  public updateLayer(id: string, updates: Partial<LayerRenderTarget>): void {
    const layer = this.layers.get(id);
    if (layer) {
      Object.assign(layer, updates);
      if (updates.zIndex !== undefined) {
        this.sortLayers();
      }
    }
  }
  
  /**
   * Sort layers by z-index
   */
  private sortLayers(): void {
    this.layerOrder.sort((a, b) => {
      const layerA = this.layers.get(a);
      const layerB = this.layers.get(b);
      return (layerA?.zIndex || 0) - (layerB?.zIndex || 0);
    });
  }
  
  /**
   * Main render method
   */
  public render(): void {
    // Step 1: Render each layer to its render target
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;
      
      const clearColor = this.renderer.getClearColor(new THREE.Color());
      const clearAlpha = this.renderer.getClearAlpha();
      console.log(`🎨 Rendering layer "${layerId}", clearColor:`, clearColor.getHex().toString(16), `clearAlpha: ${clearAlpha}, scene.background:`, layer.scene.background);
      
      this.renderer.setRenderTarget(layer.renderTarget);
      // Clear color/depth/stencil with transparent background
      this.renderer.clear(true, true, true);
      this.renderer.render(layer.scene, layer.camera);
    }
    
    // Step 2: Composite layers using GPU shaders
    this.compositeLayersToMain();
    
    // Step 3: Post-processing chain and final output
    // Update the texture pass input to the composited target
    this.texturePass.map = this.mainRenderTarget.texture;
    this.renderer.setRenderTarget(null);
    this.postProcessingComposer.render();
  }
  
  /**
   * Composite all layers to main render target
   */
  private compositeLayersToMain(): void {
    this.renderer.setRenderTarget(this.mainRenderTarget);
    
    const clearColor = this.renderer.getClearColor(new THREE.Color());
    const clearAlpha = this.renderer.getClearAlpha();
    console.log('🎬 Compositing to main RT, clearColor:', clearColor.getHex().toString(16), 'clearAlpha:', clearAlpha);
    
    // Clear to transparent before compositing
    this.renderer.clear(true, true, true);
    
    // Composite layers in order
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;
      
      console.log(`🔗 Compositing layer "${layerId}" with blend mode: ${layer.blendMode}`);
      this.renderLayerWithBlending(layer);
    }
  }
  
  /**
   * Render a single layer with blending
   */
  private renderLayerWithBlending(layer: LayerRenderTarget): void {
    const blendShader = this.getBlendModeShader(layer.blendMode);
    
    // Determine THREE.js blending mode based on layer blend mode
    let blendMode: THREE.Blending = THREE.NormalBlending;
    if (layer.blendMode === 'add') {
      blendMode = THREE.AdditiveBlending as THREE.Blending;
    } else if (layer.blendMode === 'multiply') {
      blendMode = THREE.MultiplyBlending as THREE.Blending;
    } else if (layer.blendMode === 'screen') {
      blendMode = THREE.CustomBlending as THREE.Blending;
    }
    
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: blendShader,
      uniforms: {
        tDiffuse: new THREE.Uniform(layer.renderTarget.texture),
        opacity: new THREE.Uniform(layer.opacity)
      },
      transparent: true,
      blending: blendMode,
      depthTest: false,
      depthWrite: false,
      premultipliedAlpha: false
    });
    
    const mesh = new THREE.Mesh(this.quadGeometry, material);
    const scene = new THREE.Scene();
    scene.background = null; // Ensure transparent background
    scene.add(mesh);
    
    this.renderer.render(scene, this.quadCamera);
    
    // Cleanup
    material.dispose();
    mesh.geometry.dispose();
  }
  
  // Initialize post-processing chain
  private initializePostProcessing(): void {
    // Create EffectComposer with alpha support
    const renderTarget = new THREE.WebGLRenderTarget(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
        stencilBuffer: false,
        depthBuffer: false
      }
    );
    
    this.postProcessingComposer = new EffectComposer(this.renderer, renderTarget);
    
    // Feed the composited texture into the composer
    this.texturePass = new TexturePass(this.mainRenderTarget.texture);
    this.postProcessingComposer.addPass(this.texturePass);

    if (this.config.enableBloom) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.config.width, this.config.height),
        0.6, // strength (tuned up for visible glow)
        0.8, // radius
        0.25 // threshold
      );
      this.postProcessingComposer.addPass(this.bloomPass);
    }

    // FXAA to reduce aliasing on lines and sprite edges
    this.fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    (this.fxaaPass.uniforms as any).resolution.value.set(1 / (this.config.width * pixelRatio), 1 / (this.config.height * pixelRatio));
    this.postProcessingComposer.addPass(this.fxaaPass);
    
    console.log('🎬 EffectComposer initialized with alpha support');
  }
  
  /**
   * Initialize blend mode shaders
   */
  private initializeBlendShaders(): void {
    this.blendShaders.set('normal', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texel.rgb, texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('multiply', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texel.rgb * texel.rgb, texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('screen', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(1.0 - (1.0 - texel.rgb) * (1.0 - texel.rgb), texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('overlay', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 base = vec3(0.5);
        vec3 overlay = mix(
          2.0 * base * texel.rgb, 
          1.0 - 2.0 * (1.0 - base) * (1.0 - texel.rgb), 
          step(0.5, base)
        );
        gl_FragColor = vec4(overlay, texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('add', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texel.rgb + texel.rgb, texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('subtract', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(max(texel.rgb - texel.rgb, 0.0), texel.a * opacity);
      }
    `);
  }
  
  /**
   * Get blend mode shader
   */
  private getBlendModeShader(blendMode: string): string {
    return this.blendShaders.get(blendMode) || this.blendShaders.get('normal')!;
  }
  
  /**
   * Get layer by ID
   */
  public getLayer(id: string): LayerRenderTarget | undefined {
    return this.layers.get(id);
  }
  
  /**
   * Get all layer IDs
   */
  public getLayerIds(): string[] {
    return [...this.layerOrder];
  }
  
  /**
   * Resize render targets
   */
  public resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    
    // Resize all render targets
    this.mainRenderTarget.setSize(width, height);
    this.bloomRenderTarget.setSize(width, height);
    this.tempRenderTarget.setSize(width, height);
    
    // Resize layer render targets
    for (const layer of this.layers.values()) {
      layer.renderTarget.setSize(width, height);
    }

    // Resize post-processing
    if (this.postProcessingComposer) {
      this.postProcessingComposer.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.setSize(width, height);
    }
    if (this.fxaaPass) {
      const pixelRatio = this.renderer.getPixelRatio();
      (this.fxaaPass.uniforms as any).resolution.value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
    }
  }
  
  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.mainRenderTarget.dispose();
    this.bloomRenderTarget.dispose();
    this.tempRenderTarget.dispose();
    
    for (const layer of this.layers.values()) {
      layer.renderTarget.dispose();
    }
    
    this.quadGeometry.dispose();
    this.layers.clear();
    this.layerOrder = [];
  }
} 