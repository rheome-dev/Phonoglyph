import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
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
  private tempRenderTarget: THREE.WebGLRenderTarget;
  private accumulationTargets: Map<string, THREE.WebGLRenderTarget> = new Map();
  
  // Shared geometry for full-screen rendering
  private quadGeometry: THREE.PlaneGeometry;
  private quadCamera: THREE.OrthographicCamera;
  
  // Blend mode shaders
  private blendShaders: Map<string, string> = new Map();

  // Cached ShaderMaterial per blend mode — created once, reused every frame
  // Prevents shader program accumulation under SwiftShader (Lambda/swangle) which
  // causes gl.createShader() to return null when the program cache overflows.
  private blendMaterials: Map<string, THREE.ShaderMaterial> = new Map();

  // Post-processing
  private postProcessingComposer!: EffectComposer;
  private texturePass!: TexturePass;
  private fxaaPass?: ShaderPass;
  
  constructor(renderer: THREE.WebGLRenderer, config: CompositorConfig) {
    this.renderer = renderer;
    this.config = {
      enableAntialiasing: true,
      pixelRatio: window.devicePixelRatio || 1,
      ...config
    };
    
    // Ensure transparent clearing for all off-screen targets
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);

    this.mainRenderTarget = this.createRenderTarget();
    this.tempRenderTarget = this.createRenderTarget();
    
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
    const renderTarget = this.createRenderTarget();
    
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
   * Create a render target with standard configuration
   */
  private createRenderTarget(): THREE.WebGLRenderTarget {
    const RTClass: any = THREE.WebGLRenderTarget;
    return new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
        samples: this.config.enableAntialiasing !== false ? 4 : 0
      }
    );
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
    
    const accTarget = this.accumulationTargets.get(id);
    if (accTarget) {
      accTarget.dispose();
      this.accumulationTargets.delete(id);
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
    // IMPORTANT: For layers that depend on accumulated textures from layers below
    // (e.g., bloom, ASCII filter), we must refresh their accumulation targets
    // AFTER the prior layers have been rendered, so they read current-frame data
    // instead of stale previous-frame data.
    let renderedLayers = 0;
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;

      // If this layer has an accumulation target (it reads from layers below),
      // refresh it now using the freshly-rendered prior layers' render targets
      if (this.accumulationTargets.has(layerId)) {
        this.refreshAccumulationTarget(layerId);
      }

      this.renderer.setRenderTarget(layer.renderTarget);
      // Clear color/depth/stencil with transparent background
      this.renderer.clear(true, true, true);
      this.renderer.render(layer.scene, layer.camera);
      renderedLayers++;
    }
    
    if (renderedLayers === 0) {
      console.warn('⚠️ [MultiLayerCompositor] No layers rendered!');
    }
    
    // Step 2: Composite layers using GPU shaders
    this.compositeLayersToMain();
    
    // Step 3: Post-processing chain and final output
    // Update the texture pass input to the composited target
    this.texturePass.map = this.mainRenderTarget.texture;
    
    // Save autoClear state and disable it temporarily
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    
    this.renderer.setRenderTarget(null);
    
    // CRITICAL: Clear canvas with transparency before post-processing renders
    this.renderer.clear(true, true, true);
    
    this.postProcessingComposer.render();
    
    // Restore autoClear state
    this.renderer.autoClear = autoClear;
  }
  
  /**
   * Composite all layers to main render target
   */
  private compositeLayersToMain(): void {
    // 1. Save the renderer's current autoClear state
    const autoClear = this.renderer.autoClear;
    // 2. CRITICAL: Disable auto clearing for the compositing process
    this.renderer.autoClear = false;

    this.renderer.setRenderTarget(this.mainRenderTarget);
    
    // 3. Perform a single, manual clear at the very beginning
    this.renderer.clear(true, true, true);
    
    // 4. Composite layers in order. Now, each render will draw ON TOP of the previous one.
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;
      
      this.renderLayerWithBlending(layer);
    }

    // 5. Restore the original autoClear state for other rendering operations
    this.renderer.autoClear = autoClear;
  }
  
  /**
   * Render a single layer with blending
   */
  private renderLayerWithBlending(layer: LayerRenderTarget): void {
    // Reuse the pre-compiled ShaderMaterial for this blend mode — never allocate a new
    // program per frame. Creating a new ShaderMaterial every call causes GL program handle
    // accumulation under SwiftShader (Lambda/swangle), eventually causing gl.createShader()
    // to return null and crashing with "parameter 1 is not of type 'WebGLShader'".
    const material = this.blendMaterials.get(layer.blendMode)
      ?? this.blendMaterials.get('normal')!;

    // Update uniforms for this layer — no allocation
    material.uniforms.tDiffuse.value = layer.renderTarget.texture;
    material.uniforms.opacity.value  = layer.opacity;
    material.needsUpdate = false;

    const mesh = new THREE.Mesh(this.quadGeometry, material);
    const scene = new THREE.Scene();
    scene.background = null;
    scene.add(mesh);

    this.renderer.render(scene, this.quadCamera);

    // Do NOT dispose material — it is owned by blendMaterials cache, disposed in dispose()
    // Only detach the mesh to release the scene reference
    scene.remove(mesh);
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
    
    // CRITICAL: Prevent EffectComposer from clearing our transparent background
    this.postProcessingComposer.renderToScreen = true;
    
    // Feed the composited texture into the composer
    this.texturePass = new TexturePass(this.mainRenderTarget.texture);
    
    // Configure TexturePass material for alpha transparency
    if (this.texturePass.material) {
      this.texturePass.material.transparent = true;
      this.texturePass.material.blending = THREE.NormalBlending;
      this.texturePass.material.depthTest = false;
      this.texturePass.material.depthWrite = false;
    }
    
    this.postProcessingComposer.addPass(this.texturePass);

    // FXAA to reduce aliasing on lines and sprite edges
    // CRITICAL FIX: Create alpha-preserving version of FXAAShader
    const AlphaPreservingFXAAShader = {
      uniforms: THREE.UniformsUtils.clone(FXAAShader.uniforms), // Properly clone uniforms as THREE.Uniform objects
      vertexShader: FXAAShader.vertexShader,
      fragmentShader: FXAAShader.fragmentShader.replace(
        // The original shader discards alpha. Find this line:
        'gl_FragColor = vec4( rgb, luma );',
        // And replace it with a version that preserves the original alpha:
        'gl_FragColor = vec4( rgb, texture2D( tDiffuse, vUv ).a );'
      )
    };
    
    // Use the alpha-preserving shader
    this.fxaaPass = new ShaderPass(AlphaPreservingFXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    this.fxaaPass.uniforms['resolution'].value.set(1 / (this.config.width * pixelRatio), 1 / (this.config.height * pixelRatio));
    
    // Critical: Configure FXAA pass material to preserve alpha
    if (this.fxaaPass.material) {
      this.fxaaPass.material.transparent = true;
      this.fxaaPass.material.blending = THREE.NormalBlending;
      this.fxaaPass.material.depthTest = false;
      this.fxaaPass.material.depthWrite = false;
    }
    
    this.postProcessingComposer.addPass(this.fxaaPass);
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

    // Pre-compile one ShaderMaterial per blend mode so renderLayerWithBlending()
    // can reuse them every frame instead of allocating a new program each call.
    const blendingMap: Record<string, THREE.Blending> = {
      normal:   THREE.NormalBlending,
      multiply: THREE.MultiplyBlending,
      screen:   THREE.CustomBlending,
      overlay:  THREE.NormalBlending,
      add:      THREE.AdditiveBlending,
      subtract: THREE.NormalBlending,
    };
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    for (const [mode, fragmentShader] of this.blendShaders) {
      this.blendMaterials.set(mode, new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          tDiffuse: new THREE.Uniform(null),
          opacity:  new THREE.Uniform(1.0),
        },
        transparent:       true,
        blending:          blendingMap[mode] ?? THREE.NormalBlending,
        depthTest:         false,
        depthWrite:        false,
        premultipliedAlpha: true,
        toneMapped:        false,
      }));
    }
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
   * Refresh an accumulation target using the freshly-rendered layer render targets.
   * Called during render() AFTER prior layers have been rendered to their render targets,
   * ensuring the accumulation uses current-frame data instead of stale previous-frame data.
   * This fixes bloom/filter effects showing one-frame-behind content in Lambda renders.
   */
  private refreshAccumulationTarget(layerId: string): void {
    const targetIndex = this.layerOrder.indexOf(layerId);
    if (targetIndex <= 0) return;

    const accumulationTarget = this.accumulationTargets.get(layerId);
    if (!accumulationTarget) return;

    const previousRenderTarget = this.renderer.getRenderTarget();
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    this.renderer.setRenderTarget(accumulationTarget);
    this.renderer.clear(true, true, true);

    for (let i = 0; i < targetIndex; i++) {
      const prevLayerId = this.layerOrder[i];
      const layer = this.layers.get(prevLayerId);
      if (!layer || !layer.enabled) continue;
      this.renderLayerWithBlending(layer);
    }

    this.renderer.setRenderTarget(previousRenderTarget);
    this.renderer.autoClear = autoClear;
  }

  /**
   * Get the accumulated texture from all layers before a specific layer
   * This composites all layers up to (but not including) the target layer
   *
   * FIXED: Uses a unique render target for each requesting layer ID.
   * This prevents feedback loops where multiple layers sharing 'tempRenderTarget'
   * overwrite each other's input textures within the same frame.
   */
  public getAccumulatedTextureBeforeLayer(layerId: string): THREE.Texture | null {
    const targetIndex = this.layerOrder.indexOf(layerId);
    if (targetIndex === -1 || targetIndex === 0) {
      // Layer not found or it's the first layer, return null (no previous layers)
      return null;
    }

    let accumulationTarget = this.accumulationTargets.get(layerId);
    if (!accumulationTarget) {
      accumulationTarget = this.createRenderTarget();
      this.accumulationTargets.set(layerId, accumulationTarget);
    }

    const previousRenderTarget = this.renderer.getRenderTarget();
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    this.renderer.setRenderTarget(accumulationTarget);
    this.renderer.clear(true, true, true);

    for (let i = 0; i < targetIndex; i++) {
      const prevLayerId = this.layerOrder[i];
      const layer = this.layers.get(prevLayerId);
      if (!layer || !layer.enabled) continue;
      this.renderLayerWithBlending(layer);
    }

    this.renderer.setRenderTarget(previousRenderTarget);
    this.renderer.autoClear = autoClear;

    return accumulationTarget.texture;
  }
  
  /**
   * Resize render targets
   */
  public resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    
    // Resize all render targets
    this.mainRenderTarget.setSize(width, height);
    this.tempRenderTarget.setSize(width, height);
    for (const target of this.accumulationTargets.values()) {
      target.setSize(width, height);
    }
    
    // Resize layer render targets
    for (const layer of this.layers.values()) {
      layer.renderTarget.setSize(width, height);
    }

    // Resize post-processing
    if (this.postProcessingComposer) {
      this.postProcessingComposer.setSize(width, height);
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
    this.tempRenderTarget.dispose();
    
    for (const layer of this.layers.values()) {
      layer.renderTarget.dispose();
    }
    
    for (const target of this.accumulationTargets.values()) {
      target.dispose();
    }
    this.accumulationTargets.clear();
    
    this.quadGeometry.dispose();

    for (const mat of this.blendMaterials.values()) {
      mat.dispose();
    }
    this.blendMaterials.clear();

    this.layers.clear();
    this.layerOrder = [];
  }
} 