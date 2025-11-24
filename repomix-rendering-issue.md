This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: apps/web/src/lib/visualizer/core/MultiLayerCompositor.ts, apps/web/src/lib/visualizer/core/VisualizerManager.ts, apps/web/src/lib/visualizer/effects/MetaballsEffect.ts, apps/web/src/lib/visualizer/effects/ParticleNetworkEffect.ts, apps/web/src/components/midi/three-visualizer.tsx
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
apps/
  web/
    src/
      components/
        midi/
          three-visualizer.tsx
      lib/
        visualizer/
          core/
            MultiLayerCompositor.ts
            VisualizerManager.ts
          effects/
            MetaballsEffect.ts
            ParticleNetworkEffect.ts
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="apps/web/src/lib/visualizer/core/MultiLayerCompositor.ts">
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
    this.postProcessingComposer = new EffectComposer(this.renderer);
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
</file>

<file path="apps/web/src/lib/visualizer/effects/MetaballsEffect.ts">
import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData, MetaballConfig } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';


export class MetaballsEffect implements VisualEffect {
  id = 'metaballs';
  name = 'MIDI Metaballs';
  description = 'Fluid droplet-like spheres that respond to MIDI notes';
  enabled = true;
  parameters: MetaballConfig;

  private internalScene!: THREE.Scene;
  private internalCamera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private material!: THREE.ShaderMaterial;
  private mesh!: THREE.Mesh;
  private uniforms!: Record<string, THREE.IUniform>;

  // Camera animation state
  private baseCameraDistance = 3.0;
  private cameraOrbitRadius = 2.0;
  private cameraHeight = 1.0;
  private cameraSmoothing = 0.02;

  constructor(config: Partial<MetaballConfig> = {}) {
    this.parameters = {
      trailLength: 15,
      baseRadius: 0.25,
      smoothingFactor: 0.3,
      colorPalette: ['#CC66FF', '#33CCFF', '#FF9933'],
      animationSpeed: 0.8,
      noiseIntensity: 1.5,
      highlightColor: [0.8, 0.5, 1.0], // default purple
      ...config
    };
    
    this.setupUniforms();
  }


  private setupUniforms() {
    this.uniforms = {
      uTime: { value: 0.0 },
      uIntensity: { value: 1.0 },
      uResolution: { value: new THREE.Vector2(1024, 1024) },
      uCameraPos: { value: new THREE.Vector3(0.0, 0.0, 3.0) },
      uCameraTarget: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
      uBaseRadius: { value: this.parameters.baseRadius },
      uSmoothingFactor: { value: this.parameters.smoothingFactor },
      uNoiseIntensity: { value: this.parameters.noiseIntensity },
      uAnimationSpeed: { value: this.parameters.animationSpeed },
      uHighlightColor: { value: new THREE.Color(...this.parameters.highlightColor) },
    };
  }

  init(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    // Create internal scene and camera for full-screen quad
    this.internalScene = new THREE.Scene();
    this.internalScene.background = null; // Transparent background for layer compositing
    console.log('🎨 MetaballsEffect: Scene created, background =', this.internalScene.background);
    this.internalCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // Set resolution uniform based on renderer size
    const size = renderer.getSize(new THREE.Vector2());
    this.uniforms.uResolution.value.set(size.x, size.y);
    this.createMaterial();
    this.createMesh();
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

      uniform float uTime;
      uniform float uIntensity;
      uniform vec2 uResolution;
      uniform vec3 uCameraPos;
      uniform vec3 uCameraTarget;
      uniform float uBaseRadius;
      uniform float uSmoothingFactor;
      uniform float uNoiseIntensity;
      uniform float uAnimationSpeed;
      uniform vec3 uHighlightColor;
      varying vec2 vUv;

      const int MAX_STEPS = 32;
      const float MIN_DIST = 0.0;
      const float MAX_DIST = 50.0;
      const float EPSILON = 0.002;

      // Gooey neon palette
      vec3 neon1 = vec3(0.7, 0.2, 1.0); // purple
      vec3 neon2 = vec3(0.2, 0.7, 1.0); // blue
      vec3 neon3 = vec3(0.9, 0.3, 0.8); // pink

      // 3D noise for organic movement
      vec3 random3(vec3 c) {
        float j = 4096.0 * sin(dot(c, vec3(17.0, 59.4, 15.0)));
        vec3 r;
        r.z = fract(512.0 * j);
        j *= 0.125;
        r.x = fract(512.0 * j);
        j *= 0.125;
        r.y = fract(512.0 * j);
        return r - 0.5;
      }
      float noise(vec3 p) {
        vec3 pi = floor(p);
        vec3 pf = p - pi;
        vec3 u = pf * pf * (3.0 - 2.0 * pf);
        return mix(mix(mix(dot(random3(pi + vec3(0, 0, 0)), pf - vec3(0, 0, 0)),
                          dot(random3(pi + vec3(1, 0, 0)), pf - vec3(1, 0, 0)), u.x),
                      mix(dot(random3(pi + vec3(0, 1, 0)), pf - vec3(0, 1, 0)),
                          dot(random3(pi + vec3(1, 1, 0)), pf - vec3(1, 1, 0)), u.x), u.y),
                  mix(mix(dot(random3(pi + vec3(0, 0, 1)), pf - vec3(0, 0, 1)),
                          dot(random3(pi + vec3(1, 0, 1)), pf - vec3(1, 0, 1)), u.x),
                      mix(dot(random3(pi + vec3(0, 1, 1)), pf - vec3(0, 1, 1)),
                          dot(random3(pi + vec3(1, 1, 1)), pf - vec3(1, 1, 1)), u.x), u.y), u.z);
      }
      float smin(float a, float b, float k) {
        float h = max(k - abs(a - b), 0.0) / k;
        return min(a, b) - h * h * h * k * (1.0 / 6.0);
      }
      float sphere(vec3 p, float s) {
        return length(p) - s;
      }
      float map(vec3 pos) {
        float t = uTime * uAnimationSpeed * 0.5;
        float intensity = 0.5 + uIntensity * 0.5;
        float noiseAmt = uNoiseIntensity * 0.05;
        vec3 sphere1Pos = vec3(sin(t) * 0.8, cos(t * 1.3) * 0.6, sin(t * 0.7) * 0.4);
        vec3 sphere2Pos = vec3(cos(t * 1.1) * 0.6, sin(t * 0.9) * 0.8, cos(t * 1.4) * 0.5);
        vec3 sphere3Pos = vec3(sin(t * 1.7) * 0.4, cos(t * 0.6) * 0.3, sin(t * 1.2) * 0.6);
        vec3 sphere4Pos = vec3(cos(t * 0.8) * 0.7, sin(t * 1.5) * 0.4, cos(t) * 0.3);
        sphere1Pos += vec3(sin(t * 2.3), cos(t * 1.9), sin(t * 2.7)) * noiseAmt;
        sphere2Pos += vec3(cos(t * 1.7), sin(t * 2.1), cos(t * 1.3)) * noiseAmt;
        sphere3Pos += vec3(sin(t * 3.1), cos(t * 2.5), sin(t * 1.8)) * noiseAmt;
        sphere4Pos += vec3(cos(t * 2.9), sin(t * 1.6), cos(t * 2.2)) * noiseAmt;
        float radius1 = uBaseRadius * 1.2 + intensity * 0.2;
        float radius2 = uBaseRadius * 1.0 + intensity * 0.15;
        float radius3 = uBaseRadius * 0.8 + intensity * 0.1;
        float radius4 = uBaseRadius * 0.6 + intensity * 0.1;
        float d1 = sphere(pos - sphere1Pos, radius1);
        float d2 = sphere(pos - sphere2Pos, radius2);
        float d3 = sphere(pos - sphere3Pos, radius3);
        float d4 = sphere(pos - sphere4Pos, radius4);
        float smoothness = uSmoothingFactor;
        float result = smin(d1, d2, smoothness);
        result = smin(result, d3, smoothness);
        result = smin(result, d4, smoothness);
        return result;
      }
      vec3 calcNormal(vec3 pos) {
        vec2 e = vec2(EPSILON, 0.0);
        return normalize(vec3(
          map(pos + e.xyy) - map(pos - e.xyy),
          map(pos + e.yxy) - map(pos - e.yxy),
          map(pos + e.yyx) - map(pos - e.yyx)
        ));
      }
      float rayMarch(vec3 ro, vec3 rd) {
        float dO = MIN_DIST;
        for (int i = 0; i < MAX_STEPS; i++) {
          vec3 p = ro + rd * dO;
          float dS = map(p);
          dO += dS;
          if (dO > MAX_DIST || abs(dS) < EPSILON) break;
        }
        return dO;
      }
      vec3 getNeonColor(vec3 pos, float fresnel, float edge, float core) {
        float mix1 = 0.5 + 0.5 * sin(pos.x * 2.0 + uTime * 0.7);
        float mix2 = 0.5 + 0.5 * cos(pos.y * 2.0 + uTime * 1.1);
        vec3 color = mix(neon1, neon2, mix1);
        color = mix(color, neon3, mix2 * fresnel);
        color += vec3(1.0, 0.7, 1.0) * pow(edge, 2.5) * 1.2;
        color += uHighlightColor * pow(core, 2.0) * 0.7;
        return color;
      }

      // Thickness approximation for more liquid look
      float getThickness(vec3 pos, vec3 normal) {
        // Sample SDF in both directions to estimate thickness
        float stepSize = 0.08;
        float t1 = abs(map(pos + normal * stepSize));
        float t2 = abs(map(pos - normal * stepSize));
        return 1.0 - clamp((t1 + t2) * 2.5, 0.0, 1.0); // 0 = thin, 1 = thick
      }

      // 3D value noise with trilinear interpolation
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + .1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float valueNoise3D(vec3 p) {
        vec3 pi = floor(p);
        vec3 pf = fract(p);
        // 8 corners of the cube
        float a000 = hash(pi + vec3(0,0,0));
        float a100 = hash(pi + vec3(1,0,0));
        float a010 = hash(pi + vec3(0,1,0));
        float a110 = hash(pi + vec3(1,1,0));
        float a001 = hash(pi + vec3(0,0,1));
        float a101 = hash(pi + vec3(1,0,1));
        float a011 = hash(pi + vec3(0,1,1));
        float a111 = hash(pi + vec3(1,1,1));
        // Trilinear interpolation
        float k0 = a000;
        float k1 = a100 - a000;
        float k2 = a010 - a000;
        float k3 = a001 - a000;
        float k4 = a000 - a100 - a010 + a110;
        float k5 = a000 - a010 - a001 + a011;
        float k6 = a000 - a100 - a001 + a101;
        float k7 = -a000 + a100 + a010 - a110 + a001 - a101 - a011 + a111;
        vec3 u = pf;
        return k0 + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z;
      }

      void main() {
        vec2 uv = (vUv - 0.5) * 2.0;
        
        // Apply aspect ratio correction to prevent stretching
        float aspectRatio = uResolution.x / uResolution.y;
        uv.x *= aspectRatio;
        
        vec3 cameraPos = uCameraPos;
        vec3 cameraTarget = uCameraTarget;
        vec3 cameraDir = normalize(cameraTarget - cameraPos);
        vec3 cameraRight = normalize(cross(cameraDir, vec3(0.0, 1.0, 0.0)));
        vec3 cameraUp = cross(cameraRight, cameraDir);
        vec3 rayDir = normalize(cameraDir + uv.x * cameraRight + uv.y * cameraUp);
        float dist = rayMarch(cameraPos, rayDir);
        if (dist >= MAX_DIST) {
          discard; // ensure no background writes
        }
        vec4 finalColor = vec4(0.0);
        {
          vec3 pos = cameraPos + rayDir * dist;
          vec3 normal = calcNormal(pos);
          float fresnel = pow(1.0 - max(0.0, dot(normal, -rayDir)), 2.5);
          float edge = smoothstep(0.0, 0.08, abs(map(pos)));
          float core = 1.0 - edge;
          float thickness = getThickness(pos, normal);
          // Water droplet color using value noise and reflection vector
          vec3 reflectDir = reflect(rayDir, normal);
          // Define unique offsets for each metaball
          vec3 offsets[4];
          offsets[0] = vec3(1.3, 2.1, 0.7);
          offsets[1] = vec3(-2.2, 0.5, 1.8);
          offsets[2] = vec3(0.9, -1.4, 2.3);
          offsets[3] = vec3(-1.7, 1.2, -2.5);
          vec3 colorSum = vec3(0.0);
          for (int i = 0; i < 4; i++) {
            vec3 metaballReflect = reflectDir + offsets[i];
            float noiseVal = valueNoise3D(metaballReflect * 2.0 + uTime * (1.0 + float(i) * 0.3));
            float modFactor = 0.8 + 0.2 * float(i); // unique per metaball
            colorSum += uHighlightColor * modFactor * noiseVal;
          }
          vec3 color = colorSum / 4.0;
          color = pow(color, vec3(7.0));
          // Add a subtle neon rim from before
          color = mix(color, getNeonColor(pos, fresnel, edge, core), 0.25 * fresnel);
          // Translucency and emission
          float alpha = 0.10 + 0.12 * thickness;
          alpha += 0.25 * fresnel;
          alpha += 0.10 * pow(core, 2.0);
          alpha = clamp(alpha, 0.0, 0.70);
          // Boost brightness significantly to simulate bloom effect
          color *= 3.5;
          // Add extra glow to mimic bloom
          color += vec3(0.15) * fresnel * fresnel;
          // Premultiplied alpha for correct additive blending over transparent background
          finalColor = vec4(color * alpha, alpha);
        }
        gl_FragColor = finalColor;
      }
    `;

    // Add shader compilation error checking
    try {
          this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true
    });
    } catch (error) {
      debugLog.error('❌ Shader compilation error:', error);
      // Fallback to basic material
      this.material = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.8
      }) as any;
    }
  }

  private createMesh() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    // Let compositor handle layering; avoid depth artifacts across transparent areas
    this.material.depthWrite = false;
    this.material.depthTest = false;
    this.internalScene.add(this.mesh);
    this.mesh.position.set(0, 0, 0);
    this.mesh.scale.set(2, 2, 1); // Fill viewport
  }

  public getScene(): THREE.Scene {
    return this.internalScene;
  }

  public getCamera(): THREE.Camera {
    return this.internalCamera;
  }

  updateParameter(paramName: string, value: any): void {
    // Immediately update uniforms when parameters change
    if (!this.uniforms) return;
    
    switch (paramName) {
      case 'animationSpeed':
        this.uniforms.uAnimationSpeed.value = value;
        break;
      case 'baseRadius':
        this.uniforms.uBaseRadius.value = value;
        break;
      case 'smoothingFactor':
        this.uniforms.uSmoothingFactor.value = value;
        break;
      case 'noiseIntensity':
        this.uniforms.uNoiseIntensity.value = value;
        break;
      case 'highlightColor':
        this.uniforms.uHighlightColor.value.set(...value);
        break;
    }
  }

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
    if (!this.uniforms) return;

    // Generic: sync all parameters to uniforms
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        this.uniforms[uniformKey].value = this.parameters[key as keyof MetaballConfig];
      }
    }

    // Update time
    this.uniforms.uTime.value += deltaTime * this.parameters.animationSpeed;

    // Calculate intensity based on both audio and MIDI activity
    const midiIntensity = Math.min(midiData.activeNotes.length / 3.0, 1.0);
    const audioIntensity = audioData.volume;
    // Ensure we always have a good base intensity so metaballs are visible
    this.uniforms.uIntensity.value = Math.max(0.8, (midiIntensity + audioIntensity) * 1.2);

    // Animate camera based on MIDI notes
    this.updateCameraAnimation(midiData, audioData);

    // Debug log to see if we're getting MIDI data
    if (midiData.activeNotes.length > 0) {
      // Removed console.log to reduce console noise
    }

    // Update shader resolution to match actual canvas size (not bounding box)
    if (this.uniforms.uResolution && this.renderer) {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.uniforms.uResolution.value.set(size.x, size.y);
    }

    // No conditional visibility logic here
  }

  private updateCameraAnimation(midiData: LiveMIDIData, audioData: AudioAnalysisData): void {
    const time = this.uniforms.uTime.value;
    
    // Base camera orbit animation
    let cameraAngle = time * 0.3;
    let cameraElevation = Math.sin(time * 0.2) * 0.3;
    let cameraDistance = this.baseCameraDistance;

    // MIDI-based camera effects
    if (midiData.activeNotes.length > 0) {
      // Use note pitches to influence camera position
      const avgPitch = midiData.activeNotes.reduce((sum, note) => sum + note.note, 0) / midiData.activeNotes.length;
      const normalizedPitch = (avgPitch - 60) / 48; // Normalize around middle C
      
      // Use note velocities for camera movement intensity
      const avgVelocity = midiData.activeNotes.reduce((sum, note) => sum + note.velocity, 0) / midiData.activeNotes.length / 127;
      
      // Pitch affects camera angle and height
      cameraAngle += normalizedPitch * 2.0; // Higher notes move camera clockwise
      cameraElevation += normalizedPitch * 0.8; // Higher notes raise camera
      
      // Velocity affects camera distance and orbit speed
      cameraDistance += avgVelocity * 1.5; // Louder notes move camera back
      cameraAngle += avgVelocity * Math.sin(time * 4.0) * 0.5; // Add velocity-based wobble
      
      // Multiple notes create more dynamic movement
      const noteCount = Math.min(midiData.activeNotes.length, 5);
      const complexity = noteCount / 5.0;
      cameraElevation += Math.sin(time * 3.0 + complexity * 2.0) * complexity * 0.3;
      
      // Add chord-based camera effects
      if (midiData.activeNotes.length >= 3) {
        // For chords, add orbital variation
        cameraAngle += Math.sin(time * 2.0) * 0.4;
        cameraDistance += Math.cos(time * 1.5) * 0.3;
      }
    }

    // Audio-based subtle effects
    const audioInfluence = audioData.volume * 0.3;
    cameraDistance += audioInfluence;
    cameraElevation += Math.sin(time * 5.0) * audioInfluence * 0.2;

    // Calculate new camera position
    const newCameraPos = new THREE.Vector3(
      Math.cos(cameraAngle) * cameraDistance,
      cameraElevation + this.cameraHeight,
      Math.sin(cameraAngle) * cameraDistance
    );

    // Smooth camera movement
    const currentPos = this.uniforms.uCameraPos.value;
    currentPos.lerp(newCameraPos, this.cameraSmoothing);

    // Keep camera target at the center (where metaballs are)
    const target = new THREE.Vector3(0, 0, 0);

    // Add subtle target movement based on intense MIDI activity
    if (midiData.activeNotes.length > 2) {
      const intensity = Math.min(midiData.activeNotes.length / 5.0, 1.0);
      target.x = Math.sin(time * 2.0) * intensity * 0.2;
      target.y = Math.cos(time * 1.5) * intensity * 0.1;
    }

    this.uniforms.uCameraTarget.value.copy(target);
  }

  destroy(): void {
    if (this.mesh) {
      this.internalScene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
  }
}
</file>

<file path="apps/web/src/components/midi/three-visualizer.tsx">
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Settings, Maximize, Download } from 'lucide-react';
import { cn, debugLog } from '@/lib/utils';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
import '@/lib/visualizer/effects/EffectDefinitions';
import { MIDIData, VisualizationSettings } from '@/types/midi';
import { VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualEffect, AspectRatioConfig } from '@/types/visualizer';
import { PortalModal } from '@/components/ui/portal-modal';
import { EffectCarousel } from '@/components/ui/effect-carousel';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DroppableParameter } from '@/components/ui/droppable-parameter';
import { getAspectRatioConfig, calculateCanvasSize } from '@/lib/visualizer/aspect-ratios';
import { Layer } from '@/types/video-composition';

interface ThreeVisualizerProps {
  midiData: MIDIData;
  settings: VisualizationSettings;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSettingsChange: (settings: VisualizationSettings) => void;
  onFpsUpdate?: (fps: number) => void;
  className?: string;
  selectedEffects: Record<string, boolean>;
  onSelectedEffectsChange: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  aspectRatio?: string; // Changed from 'mobile' | 'youtube' to string for modularity
  // Modal and mapping props
  openEffectModals: Record<string, boolean>;
  onCloseEffectModal: (effectId: string) => void;
  mappings: Record<string, { featureId: string | null; modulationAmount: number }>;
  featureNames: Record<string, string>;
  onMapFeature: (parameterId: string, featureId: string) => void;
  onUnmapFeature: (parameterId: string) => void;
  onModulationAmountChange?: (parameterId: string, amount: number) => void;
  activeSliderValues: Record<string, number>;
  setActiveSliderValues: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  visualizerRef?: React.RefObject<VisualizerManager> | ((instance: VisualizerManager | null) => void);
  layers: Layer[];
  selectedLayerId?: string | null;
  onLayerSelect?: (layerId: string) => void;
  onLayerUpdate?: (layerId: string, updates: Partial<Layer>) => void;
}

export function ThreeVisualizer({
  midiData,
  settings,
  currentTime,
  isPlaying,
  onPlayPause,
  onSettingsChange,
  onFpsUpdate,
  className,
  selectedEffects,
  onSelectedEffectsChange,
  aspectRatio = 'mobile',
  openEffectModals,
  onCloseEffectModal,
  mappings,
  featureNames,
  onMapFeature,
  onUnmapFeature,
  onModulationAmountChange,
  activeSliderValues,
  setActiveSliderValues,
  visualizerRef: externalVisualizerRef,
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate
}: ThreeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalVisualizerRef = useRef<VisualizerManager | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 711 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const effectInstancesRef = useRef<{ [id: string]: VisualEffect }>({});
  
  // Get aspect ratio configuration
  const aspectRatioConfig = getAspectRatioConfig(aspectRatio);
  
  // Resize observer for container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Calculate canvas size when container size or aspect ratio changes
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      const newCanvasSize = calculateCanvasSize(
        containerSize.width,
        containerSize.height,
        aspectRatioConfig
      );
      setCanvasSize(newCanvasSize);
    }
  }, [containerSize, aspectRatioConfig]);
  
  // Update visualizer when canvas size changes
  useEffect(() => {
    if (internalVisualizerRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
      const visualizer = internalVisualizerRef.current;
      visualizer.handleViewportResize(canvasSize.width, canvasSize.height);
      debugLog.log('🎨 Canvas resized to:', canvasSize.width, 'x', canvasSize.height, 'aspect:', canvasSize.width / canvasSize.height);
    }
  }, [canvasSize]);

  // Initialize visualizer
  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    try {
      debugLog.log('🎭 Initializing ThreeVisualizer with aspect ratio:', aspectRatio);
    
    const config: VisualizerConfig = {
      canvas: {
          width: canvasSize.width,
          height: canvasSize.height,
        pixelRatio: Math.min(window.devicePixelRatio, 2)
      },
        aspectRatio: aspectRatioConfig,
      performance: {
          targetFPS: 60,
          enableBloom: true,
          enableShadows: false
      },
      midi: {
        velocitySensitivity: 1.0,
        noteTrailDuration: 2.0,
        trackColorMapping: {}
      }
    };

      internalVisualizerRef.current = new VisualizerManager(canvasRef.current, config);
      

      
      // Enable selected effects
      Object.entries(selectedEffects).forEach(([effectId, enabled]) => {
        if (enabled) {
          internalVisualizerRef.current?.enableEffect(effectId);
        } else {
          internalVisualizerRef.current?.disableEffect(effectId);
        }
      });

      setIsInitialized(true);
      debugLog.log('✅ ThreeVisualizer initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      debugLog.error('❌ Failed to initialize ThreeVisualizer:', err);
    }
  }, [canvasSize, aspectRatioConfig]);

  // Dynamic scene synchronization
  useEffect(() => {
    if (!internalVisualizerRef.current) return;
    const manager = internalVisualizerRef.current;
    debugLog.log('[ThreeVisualizer] layers prop:', layers, layers.map(l => l.type));
    const effectLayers = layers.filter(l => l.type === 'effect');
    debugLog.log('[ThreeVisualizer] effectLayers:', effectLayers);
    const currentIds = Object.keys(effectInstancesRef.current);
    const newIds = effectLayers.map(l => l.id);

    // Remove effects not in layers
    for (const id of currentIds) {
      if (!newIds.includes(id)) {
        manager.removeEffect(id);
        delete effectInstancesRef.current[id];
        debugLog.log(`[ThreeVisualizer] Removed effect instance: ${id}`);
      }
    }

    // Add new effects from layers using registry system
    for (const layer of effectLayers) {
      if (!effectInstancesRef.current[layer.id]) {
        debugLog.log('[ThreeVisualizer] Creating effect for layer:', layer);
        const effect = EffectRegistry.createEffect(layer.effectType || 'metaballs', layer.settings);
        if (effect) {
          effectInstancesRef.current[layer.id] = effect;
          // Add effect with its internal ID (e.g., 'particleNetwork', 'metaballs')
          manager.addEffect(effect);
          debugLog.log(`[ThreeVisualizer] Added effect instance: ${layer.id} (${layer.effectType}) with effect ID: ${effect.id}`);
        } else {
          debugLog.warn(`[ThreeVisualizer] Failed to create effect: ${layer.effectType} for layer: ${layer.id}`);
        }
      }
    }

    // If no effect layers, remove all effects
    if (effectLayers.length === 0) {
      for (const id of Object.keys(effectInstancesRef.current)) {
        manager.removeEffect(id);
        delete effectInstancesRef.current[id];
        debugLog.log(`[ThreeVisualizer] Removed effect instance (all cleared): ${id}`);
      }
    }
  }, [layers, internalVisualizerRef.current]);

  // Expose visualizer ref to parent
  useEffect(() => {
    if (externalVisualizerRef && internalVisualizerRef.current) {
      if (typeof externalVisualizerRef === 'function') {
        externalVisualizerRef(internalVisualizerRef.current);
      } else if (externalVisualizerRef && 'current' in externalVisualizerRef) {
        (externalVisualizerRef as any).current = internalVisualizerRef.current;
      }
    }
  }, [externalVisualizerRef, isInitialized]);

  // Handle play/pause
  useEffect(() => {
    if (!internalVisualizerRef.current) return;

    if (isPlaying) {
      internalVisualizerRef.current.play();
    } else {
      internalVisualizerRef.current.pause();
    }
  }, [isPlaying]);

  // Update MIDI data
  useEffect(() => {
    if (!internalVisualizerRef.current || !midiData) return;
    
         const liveMidiData: LiveMIDIData = {
       currentTime,
       activeNotes: midiData.tracks.flatMap(track => 
         track.notes.filter(note => 
           note.start <= currentTime && note.start + note.duration >= currentTime
         ).map(note => ({
           note: note.pitch,
           velocity: note.velocity,
           track: track.id,
           startTime: note.start
         }))
       ),
       tempo: 120, // Default tempo
       totalNotes: midiData.tracks.reduce((sum, track) => sum + track.notes.length, 0),
       trackActivity: midiData.tracks.reduce((acc, track) => {
         acc[track.id] = track.notes.filter(note => 
           note.start <= currentTime && note.start + note.duration >= currentTime
         ).length > 0;
         return acc;
       }, {} as Record<string, boolean>)
     };
    
    internalVisualizerRef.current.updateMIDIData(liveMidiData);
  }, [midiData, currentTime]);

  // Update FPS
  useEffect(() => {
    if (!internalVisualizerRef.current || !onFpsUpdate) return;

    const interval = setInterval(() => {
      const fps = internalVisualizerRef.current?.getFPS() || 60;
      onFpsUpdate(fps);
    }, 1000);

    return () => clearInterval(interval);
  }, [onFpsUpdate]);

 

  // Handle effect parameter changes
  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    if (!internalVisualizerRef.current) return;
    
    internalVisualizerRef.current.updateEffectParameter(effectId, paramName, value);
    
    // Update active slider values
      const paramKey = `${effectId}-${paramName}`;
    setActiveSliderValues(prev => ({ ...prev, [paramKey]: value }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (internalVisualizerRef.current) {
        internalVisualizerRef.current.dispose();
      }
    };
  }, []);

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  // Helper: is the project truly empty (all layers are empty image lanes)?
  const allLayersEmpty = layers.length === 0 || layers.every(l => l.type === 'image' && !l.src);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center",
        className
      )}
      style={{
        minHeight: '200px',
        aspectRatio: `${aspectRatioConfig.width}/${aspectRatioConfig.height}`
      }}
    >
      {/* Canvas container with proper sizing */}
      <div 
        className="relative bg-stone-900 rounded-lg overflow-hidden shadow-lg"
        style={{
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          maxWidth: '100%',
          maxHeight: '100%',
          pointerEvents: 'auto', // Ensure overlays receive pointer events
          zIndex: 10 // Ensure overlays are above the canvas
        }}
        >
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-full h-full"
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            pointerEvents: 'none', // Only the canvas ignores pointer events
            zIndex: 1
          }}
        />
        {/* Show prompt if all layers are empty */}
        {allLayersEmpty && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-auto">
            <span className="text-white/60 text-sm font-mono text-center select-none">
              Add your first layer
            </span>
          </div>
        )}
        {/* Modals are now rendered within the full-width edit canvas */}
        {Object.entries(openEffectModals).map(([effectId, isOpen], index) => {
          if (!isOpen) return null;
          const effectInstance = internalVisualizerRef.current?.getAllEffects().find((e: any) => e.id === effectId);
          if (!effectInstance) return null;
          const sortedParams = Object.entries(effectInstance.parameters).sort(([, a], [, b]) => {
            if (typeof a === 'boolean' && typeof b !== 'boolean') return -1;
            if (typeof a !== 'boolean' && typeof b === 'boolean') return 1;
            return 0;
          });
          const initialPos = {
            x: 100 + (index * 50),
            y: 100 + (index * 50)
          };
          return (
            <PortalModal
              key={effectId}
              title={effectInstance.name.replace(' Effect', '')}
              isOpen={isOpen}
              onClose={() => onCloseEffectModal(effectId)}
              initialPosition={initialPos}
              bounds="#editor-bounds"
            >
              <div className="space-y-4">
                <div className="text-sm text-white/80 mb-4">{effectInstance.description}</div>
                {sortedParams.length === 0 ? (
                  <div className="text-white/60 text-xs font-mono text-center py-4">No configurable parameters.</div>
                ) : (
                  sortedParams.map(([paramName, value]) => {
                    if (typeof value === 'boolean') {
                      return (
                        <div key={paramName} className="flex items-center justify-between">
                          <Label className="text-white/80 text-xs font-mono">{paramName}</Label>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => handleParameterChange(effectId, paramName, checked)}
                          />
                        </div>
                      );
                    }
                    if (typeof value === 'number') {
                      const paramKey = `${effectId}-${paramName}`;
                      const mapping = mappings[paramKey];
                      const mappedFeatureId = mapping?.featureId || null;
                      const mappedFeatureName = mappedFeatureId ? featureNames[mappedFeatureId] : undefined;
                      const modulationAmount = mapping?.modulationAmount || 1.0;
                      return (
                        <DroppableParameter
                          key={paramKey}
                          parameterId={paramKey}
                          label={paramName}
                          mappedFeatureId={mappedFeatureId}
                          mappedFeatureName={mappedFeatureName}
                          modulationAmount={modulationAmount}
                          onFeatureDrop={onMapFeature}
                          onFeatureUnmap={onUnmapFeature}
                          onModulationAmountChange={onModulationAmountChange}
                          className="mb-2"
                          dropZoneStyle="inlayed"
                          showTagOnHover
                        >
                          <Slider
                            value={[activeSliderValues[paramKey] ?? value]}
                            onValueChange={([val]) => {
                              setActiveSliderValues(prev => ({ ...prev, [paramKey]: val }));
                              handleParameterChange(effectId, paramName, val);
                            }}
                            min={0}
                            max={getSliderMax(paramName)}
                            step={getSliderStep(paramName)}
                            className="w-full"
                          />
                        </DroppableParameter>
                      );
                    }
                    if ((paramName === 'highlightColor' || paramName === 'particleColor') && Array.isArray(value)) {
                      const displayName = paramName === 'highlightColor' ? 'Highlight Color' : 'Particle Color';
                      return (
                        <div key={paramName} className="space-y-2">
                          <Label className="text-white/90 text-sm font-medium flex items-center justify-between">
                            {displayName}
                            <span className="ml-2 w-6 h-6 rounded-full border border-white/40 inline-block" style={{ background: `rgb(${value.map((v) => Math.round(v * 255)).join(',')})` }} />
                          </Label>
                          <input
                            type="color"
                            value={`#${value.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`}
                            onChange={e => {
                              const hex = e.target.value;
                              const rgb = [
                                parseInt(hex.slice(1, 3), 16) / 255,
                                parseInt(hex.slice(3, 5), 16) / 255,
                                parseInt(hex.slice(5, 7), 16) / 255
                              ];
                              handleParameterChange(effectId, paramName, rgb);
                            }}
                            className="w-12 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                          />
                        </div>
                      );
                    }
                    return null;
                  })
                )}
                <div className="pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-white/80 text-xs font-mono">Effect Enabled</Label>
                    <Switch 
                      checked={selectedEffects[effectId]}
                      onCheckedChange={(checked) => {
                        onSelectedEffectsChange(prev => ({
                          ...prev,
                          [effectId]: checked
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </PortalModal>
          );
        })}
      </div>
    </div>
  );
}

// Custom hook to force re-render
const useForceUpdate = () => {
  const [, setValue] = useState(0);
  return () => setValue(value => value + 1); 
};

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 z-50">
      <Card className="bg-red-800/80 text-white p-4 max-w-md">
      <h3 className="text-lg font-semibold">An Error Occurred</h3>
      <p className="text-sm">{message}</p>
      <Button onClick={() => window.location.reload()} variant="secondary" className="mt-4">
        Refresh Page
      </Button>
      </Card>
    </div>
  );
}

function MainContent({ children, onMouseEnter, onMouseLeave }: { children: React.ReactNode, onMouseEnter: () => void, onMouseLeave: () => void }) {
  return (
    <div 
      className="relative aspect-[9/16] max-w-sm mx-auto bg-stone-900 rounded-lg overflow-hidden shadow-2xl" // removed border
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

function Canvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
}

// Utility: getSliderMax for effect parameter sliders
function getSliderMax(paramName: string) {
  switch (paramName) {
    case 'animationSpeed': return 5.0;
    case 'noiseIntensity': return 2.0;
    case 'glowIntensity': return 2.0;
    case 'strength': return 2.0;
    case 'radius': return 2.0;
    case 'threshold': return 1.0;
    case 'particleLifetime': return 10;
    case 'particleSize': return 50;
    case 'glowSoftness': return 5;
    case 'particleSpawning': return 1.0;
    case 'spawnThreshold': return 1.0;
    case 'audioSpawnThreshold': return 1.0;
    case 'audioSpawnRate': return 1.0;
    case 'audioSpawnCooldown': return 1.0;
    case 'audioParticleSize': return 50;
    case 'audioSpawnIntensity': return 2.0;
    case 'connectionDistance': return 5.0;
    case 'maxParticles': return 200;
    case 'connectionOpacity': return 1.0;
    default: return 1;
  }
}

// Utility: getSliderStep for effect parameter sliders
function getSliderStep(paramName: string) {
  switch (paramName) {
    case 'animationSpeed': return 0.05;
    case 'noiseIntensity': return 0.1;
    case 'glowIntensity': return 0.1;
    case 'strength': return 0.1;
    case 'radius': return 0.05;
    case 'threshold': return 0.01;
    case 'glowSoftness': return 0.1;
    case 'particleSpawning': return 0.01;
    case 'spawnThreshold': return 0.01;
    case 'audioSpawnThreshold': return 0.01;
    case 'audioSpawnRate': return 0.01;
    case 'audioSpawnCooldown': return 0.01;
    case 'audioParticleSize': return 0.1;
    case 'audioSpawnIntensity': return 0.01;
    default: return 0.01;
  }
}
</file>

<file path="apps/web/src/lib/visualizer/core/VisualizerManager.ts">
import * as THREE from 'three';
import { VisualEffect, VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualizerControls } from '@/types/visualizer';
import { MultiLayerCompositor } from './MultiLayerCompositor';
import { VisualizationPreset } from '@/types/stem-visualization';
import { debugLog } from '@/lib/utils';
import { AudioTextureManager, AudioFeatureData } from './AudioTextureManager';
import { MediaLayerManager } from './MediaLayerManager';

export class VisualizerManager {
  private static instanceCounter = 0;
  private instanceId: number;
  
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private animationId: number | null = null;
  private clock: THREE.Clock;
  
  private effects: Map<string, VisualEffect> = new Map();
  private isPlaying = false;
  private lastTime = 0;
  
  // Audio analysis
  private audioContext: AudioContext | null = null;
  private audioSources: AudioBufferSourceNode[] = [];
  private currentAudioBuffer: AudioBuffer | null = null;
  
  // Layered compositor
  private multiLayerCompositor!: MultiLayerCompositor;
  
  // GPU compositing system
  private audioTextureManager: AudioTextureManager | null = null;
  private mediaLayerManager: MediaLayerManager | null = null;
  
  // Performance monitoring
  private frameCount = 0;
  private fps = 60;
  private lastFPSUpdate = 0;
  private consecutiveSlowFrames = 0;
  private maxSlowFrames = 10; // Emergency pause after 10 consecutive slow frames
  
  // Visualization parameters
  private visualParams = {
    globalScale: 1.0,
    rotationSpeed: 0.0,
    colorIntensity: 1.0,
    emissionIntensity: 1.0,
    positionOffset: 0.0,
    heightScale: 1.0,
    hueRotation: 0.0,
    brightness: 1.0,
    complexity: 0.5,
    particleSize: 1.0,
    opacity: 1.0,
    animationSpeed: 1.0,
    particleCount: 5000
  };
  
  constructor(canvas: HTMLCanvasElement, config: VisualizerConfig) {
    debugLog.log('🎭 VisualizerManager constructor called');
    this.instanceId = ++VisualizerManager.instanceCounter;
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    
    this.initScene(config);
    this.setupEventListeners();
    this.initCompositor(config);
    this.initAudioTextureManager();
    this.initMediaLayerManager();
    debugLog.log('🎭 VisualizerManager constructor complete');
  }
  
  private initScene(config: VisualizerConfig) {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent background for proper layer compositing
    this.scene.fog = new THREE.Fog(0x000000, 10, 50);
    
      // Camera setup - use aspect ratio from config if available, otherwise use 1:1
  const initialAspectRatio = config.aspectRatio 
    ? config.aspectRatio.width / config.aspectRatio.height 
    : 1; // Default to square aspect ratio
  
  this.camera = new THREE.PerspectiveCamera(
    75,
    initialAspectRatio,
    0.1,
    1000
  );
    this.camera.position.set(0, 0, 5);
    
    // Renderer setup with error handling and fallbacks
    try {
      // First, check if canvas already has a context to avoid conflicts
      const existingContext = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      if (existingContext) {
        debugLog.log('🔄 Found existing WebGL context, will attempt to reuse');
      }
      
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'default', // Changed from high-performance to reduce resource usage
        failIfMajorPerformanceCaveat: false // Allow software rendering
      });
      
      debugLog.log('✅ WebGL Renderer created successfully');
      debugLog.log('🔧 WebGL Context:', this.renderer.getContext());
    } catch (error) {
      debugLog.error('❌ Primary WebGL renderer failed:', error);
      
      // Try minimal fallback settings
      try {
        debugLog.log('🔄 Attempting fallback renderer with minimal settings...');
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: false,
          alpha: true,
          powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: false
        });
        debugLog.log('✅ Fallback renderer created successfully');
      } catch (fallbackError) {
        debugLog.error('❌ Fallback renderer also failed:', fallbackError);
        throw new Error('WebGL is not available. Please refresh the page and try again. If the problem persists, try closing other browser tabs or restarting your browser.');
      }
    }
    
    this.renderer.setSize(config.canvas.width, config.canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.canvas.pixelRatio || 2));
    this.renderer.setClearColor(0x000000, 0); // Transparent background for layer compositing
    
    const clearColor = this.renderer.getClearColor(new THREE.Color());
    const clearAlpha = this.renderer.getClearAlpha();
    console.log('🎮 VisualizerManager: Renderer clear color =', clearColor.getHex().toString(16), 'alpha =', clearAlpha);
    
    debugLog.log('🎮 Renderer configured with size:', config.canvas.width, 'x', config.canvas.height);
    
    // Performance optimizations for 30fps
    this.renderer.setAnimationLoop(null); // Use manual RAF control
    this.renderer.info.autoReset = false; // Manual reset for performance monitoring
    
    // Enable tone mapping for better color reproduction
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Disable shadows for better performance
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private initCompositor(config: VisualizerConfig) {
    this.multiLayerCompositor = new MultiLayerCompositor(this.renderer, {
      width: config.canvas.width,
      height: config.canvas.height,
      enableBloom: config.performance?.enableBloom ?? true,
      enableAntialiasing: true,
      pixelRatio: Math.min(window.devicePixelRatio, config.canvas.pixelRatio || 2)
    });
    // Add base scene as background layer
    this.multiLayerCompositor.createLayer('base', this.scene, this.camera, { zIndex: -1, enabled: true });
  }

  private initAudioTextureManager() {
    this.audioTextureManager = new AudioTextureManager();
    debugLog.log('🎵 AudioTextureManager initialized');
  }

  private initMediaLayerManager() {
    this.mediaLayerManager = new MediaLayerManager(this.scene, this.camera, this.renderer);
    debugLog.log('🎬 MediaLayerManager initialized');
  }
  
  private async initAudioAnalyzer() {
    if (!this.audioContext) {
      debugLog.log('🎵 Creating AudioContext after user interaction...');
      this.audioContext = new AudioContext();
      // Resume the context to ensure it's active
      await this.audioContext.resume();
    }
    
    try {
      // This method is no longer used as AudioAnalyzer is removed.
      // Keeping it for now to avoid breaking existing calls, but it will be removed.
      debugLog.log('🎵 Audio analyzer initialization (placeholder)');
    } catch (error) {
      debugLog.error('❌ Failed to initialize audio analyzer:', error);
    }
  }
  
  private setupEventListeners() {
    // Handle window resize
    const handleResize = () => {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      
      // Use the new responsive resize method
      this.handleViewportResize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Handle visibility change (pause when not visible)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isPlaying) {
        this.pause();
      }
    });
    
    // Handle WebGL context lost/restored
    this.canvas.addEventListener('webglcontextlost', (event) => {
      debugLog.warn('⚠️ WebGL context lost!');
      event.preventDefault();
      this.pause(); // Stop rendering
    });
    
    this.canvas.addEventListener('webglcontextrestored', () => {
      debugLog.log('✅ WebGL context restored, reinitializing...');
      // Context restoration would require reinitializing all GPU resources
      // For now, we'll just log and suggest a page refresh
      debugLog.log('🔄 Please refresh the page to restore full functionality');
    });
  }
  
  // Effect management
  public addEffect(effect: VisualEffect) {
    try {
      debugLog.log(`🎨 Adding effect: ${effect.name} (${effect.id})`);
      effect.init(this.renderer);
      this.effects.set(effect.id, effect);
      // Register a layer for this effect
      this.multiLayerCompositor.createLayer(effect.id, effect.getScene(), effect.getCamera(), {
        zIndex: this.effects.size,
        enabled: effect.enabled
      });
      
      debugLog.log(`✅ Added effect: ${effect.name}. Total effects: ${this.effects.size}`);
    } catch (error) {
      debugLog.error(`❌ Failed to add effect ${effect.name}:`, error);
    }
  }
  
  public addEffectWithId(effect: VisualEffect, customId: string) {
    try {
      debugLog.log(`🎨 Adding effect with custom ID: ${effect.name} (${customId})`);
      // Don't call init again - effect is already initialized by addEffect()
      // Just add the reference with the custom ID
      this.effects.set(customId, effect);
      
      debugLog.log(`✅ Added effect reference with custom ID: ${effect.name} (${customId}). Total effects: ${this.effects.size}`);
    } catch (error) {
      debugLog.error(`❌ Failed to add effect ${effect.name} with custom ID ${customId}:`, error);
    }
  }
  
  public removeEffect(effectId: string) {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.destroy();
      this.effects.delete(effectId);
      this.multiLayerCompositor.removeLayer(effectId);
      debugLog.log(`✅ Removed effect and compositor layer: ${effect.name}. Remaining effects: ${this.effects.size}`);
    }
  }
  
  getEffect(effectId: string): VisualEffect | undefined {
    return this.effects.get(effectId);
  }
  
  getAllEffects(): VisualEffect[] {
    return Array.from(this.effects.values());
  }
  
  enableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = true;
      this.multiLayerCompositor.updateLayer(effectId, { enabled: true });
      debugLog.log(`✅ Enabled effect: ${effect.name} (${effectId})`);
    } else {
      debugLog.warn(`⚠️ Effect not found: ${effectId}`);
    }
  }
  
  disableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = false;
      this.multiLayerCompositor.updateLayer(effectId, { enabled: false });
      debugLog.log(`❌ Disabled effect: ${effect.name} (${effectId})`);
    }
  }
  
  // Legacy show/hide helpers removed; layers are toggled via compositor
  
  // Playback control
  play(): void {
    debugLog.log(`🎬 Play() called. Current state: isPlaying=${this.isPlaying}, effects=${this.effects.size}`);
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.clock.start();
      this.animate();
      debugLog.log(`🎬 Animation started`);
      
      // Start audio playback
      this.audioSources.forEach((source, index) => {
        try {
          source.start(0);
          debugLog.log(`🎵 Started audio source ${index}`);
        } catch (error) {
          debugLog.warn(`⚠️ Audio source ${index} already playing or ended`);
        }
      });
    }
  }
  
  pause(): void {
    this.isPlaying = false;
    this.clock.stop();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Stop audio playback
    this.audioSources.forEach((source, index) => {
      try {
        source.stop();
        debugLog.log(`🎵 Stopped audio source ${index}`);
      } catch (error) {
        debugLog.warn(`⚠️ Audio source ${index} already stopped`);
      }
    });
  }
  
  stop(): void {
    this.pause();
    this.clock.elapsedTime = 0;
  }
  
  private animate = () => {
    if (!this.isPlaying) return;
    
    this.animationId = requestAnimationFrame(this.animate);
    
    // IMPLEMENT 30FPS CAP - Much more reasonable for audio-visual sync
    const now = performance.now();
    const elapsed = now - this.lastTime;
    const targetFrameTime = 1000 / 30; // 33.33ms for 30fps
    
    if (elapsed < targetFrameTime) {
      return; // Skip this frame to maintain 30fps cap
    }
    
    // Only skip frames if we're severely behind (emergency performance protection)
    const frameTime = elapsed;
    if (frameTime > 100) { // If frame takes more than 100ms (10fps), skip next frame
      this.consecutiveSlowFrames++;
      
      // Emergency pause if too many consecutive slow frames
      if (this.consecutiveSlowFrames >= this.maxSlowFrames) {
        debugLog.error(`🚨 Emergency pause: ${this.maxSlowFrames} consecutive slow frames detected. Pausing to prevent browser freeze.`);
        this.pause();
        // Suggest recovery action
        setTimeout(() => {
          debugLog.log('💡 Tip: Try refreshing the page or closing other browser tabs to improve performance.');
        }, 1000);
        return;
      }
      
      this.lastTime = now;
      return;
    } else {
      this.consecutiveSlowFrames = 0; // Reset counter on good frame
    }
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta time to prevent large jumps
    const currentTime = now;
    
    // Update FPS counter
    this.frameCount++;
    if (currentTime - this.lastFPSUpdate > 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
      this.frameCount = 0;
      this.lastFPSUpdate = currentTime;
    }
    
    // Performance monitoring - check memory usage
    if (this.frameCount % 300 === 0) { // Every 10 seconds at 30fps
      const memInfo = this.getMemoryUsage();
      if (memInfo.geometries > 100 || memInfo.textures > 50) {
        debugLog.warn(`⚠️ High memory usage detected: ${memInfo.geometries} geometries, ${memInfo.textures} textures`);
      }
    }
    
    // Update all enabled effects with improved performance
    let activeEffectCount = 0;
    const maxEffectsPerFrame = 3; // Reduced back to 3 for 30fps
    let updatedEffects = 0;
    
    this.effects.forEach(effect => {
      if (effect.enabled && updatedEffects < maxEffectsPerFrame) {
        activeEffectCount++;
        updatedEffects++;
        
        try {
          // Use real data if available, otherwise fallback to mock data
          const audioData: AudioAnalysisData = this.currentAudioData || this.createMockAudioData();
          const midiData: LiveMIDIData = this.currentMidiData || this.createMockMidiData();
          
          effect.update(deltaTime, audioData, midiData);
        } catch (error) {
          debugLog.error(`❌ Effect ${effect.id} update failed:`, error);
          // Disable problematic effect to prevent further issues
          effect.enabled = false;
        }
      } else if (effect.enabled) {
        activeEffectCount++; // Count but don't update this frame
      }
    });
    
    // Update GPU audio texture system
    if (this.audioTextureManager && this.currentAudioData) {
      // Convert audio analysis to GPU texture format using existing structure
      const audioFeatureData: AudioFeatureData = {
        features: {
          'main': [this.currentAudioData.volume, this.currentAudioData.bass, this.currentAudioData.mid, this.currentAudioData.treble]
        },
        duration: 0, // Will be set when real audio is loaded
        sampleRate: 44100,
        stemTypes: ['main']
      };
      
      // Update audio texture with current time
      this.audioTextureManager.updateTime(currentTime / 1000, audioFeatureData.duration);
    }
    
    // Update media layer textures (for video elements)
    if (this.mediaLayerManager) {
      this.mediaLayerManager.updateTextures();
    }
    
    // Render all layers via compositor
    this.multiLayerCompositor.render();
    
    this.lastTime = currentTime;
  };
  
  // Mock data generators (will be replaced with real data)
  private createMockAudioData(): AudioAnalysisData {
    const frequencies = new Array(256);
    const timeData = new Array(256);
    
    // Generate more realistic frequency data
    for (let i = 0; i < 256; i++) {
      frequencies[i] = Math.sin(this.clock.elapsedTime * 2 + i * 0.1) * 0.5 + 0.5;
      timeData[i] = Math.cos(this.clock.elapsedTime * 3 + i * 0.05) * 0.3 + 0.3;
    }
    
    return {
      frequencies,
      timeData,
      volume: (Math.sin(this.clock.elapsedTime * 1.5) + 1) * 0.5,
      bass: (Math.sin(this.clock.elapsedTime * 0.8) + 1) * 0.5,
      mid: (Math.sin(this.clock.elapsedTime * 1.2) + 1) * 0.5,
      treble: (Math.sin(this.clock.elapsedTime * 2.0) + 1) * 0.5
    };
  }
  
  private createMockMidiData(): LiveMIDIData {
    return {
      activeNotes: [],
      currentTime: this.clock.elapsedTime,
      tempo: 120,
      totalNotes: 0,
      trackActivity: {}
    };
  }
  
  // Update methods for real data
  updateMIDIData(midiData: LiveMIDIData): void {
    // Store MIDI data to be used in next animation frame
    this.currentMidiData = midiData;
    debugLog.log('🎵 MIDI data received:', midiData);
  }

  updateAudioData(audioData: AudioAnalysisData): void {
    // Store audio data to be used in next animation frame
    this.currentAudioData = audioData;
    debugLog.log('🎵 Audio data received:', audioData);
  }
  
  
  updateEffectParameter(effectId: string, paramName: string, value: any): void {
    const effect = this.effects.get(effectId);
    if (effect && effect.parameters.hasOwnProperty(paramName)) {
      const oldValue = (effect.parameters as any)[paramName];
      (effect.parameters as any)[paramName] = value;
      
      // REMOVED VERBOSE LOGGING - Only log significant changes or errors
      // If the effect has an updateParameter method, call it for immediate updates
      if (typeof (effect as any).updateParameter === 'function') {
        (effect as any).updateParameter(paramName, value);
      }
    } else {
      // Only log errors, not every parameter update
      if (!effect) {
        debugLog.warn(`⚠️ Effect ${effectId} not found`);
      } else if (!effect.parameters.hasOwnProperty(paramName)) {
        debugLog.warn(`⚠️ Parameter ${paramName} not found in effect ${effectId}`);
      }
    }
  }
  
  private currentMidiData?: LiveMIDIData;
  private currentAudioData?: AudioAnalysisData;
  
  // Performance monitoring
  getFPS(): number {
    return this.fps;
  }
  
  getMemoryUsage(): { geometries: number; textures: number; programs: number } {
    return {
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      programs: this.renderer.info.programs?.length || 0
    };
  }
  
  // Cleanup
  dispose(): void {
    debugLog.log(`🗑️ VisualizerManager.dispose() called. Effects: ${this.effects.size}`);
    this.stop();
    
    // Dispose compositor
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.dispose();
    }
    
    // Dispose all effects
    debugLog.log(`🗑️ Disposing ${this.effects.size} effects`);
    this.effects.forEach(effect => effect.destroy());
    this.effects.clear();
    debugLog.log(`🗑️ Effects cleared. Remaining: ${this.effects.size}`);
    
    // Dispose Three.js resources
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof Array) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.renderer.dispose();
  }

  public async loadAudioBuffer(buffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    try {
      // Log buffer info for debugging
      debugLog.log('Audio buffer length:', buffer.byteLength);
      debugLog.log('First 16 bytes:', Array.from(new Uint8Array(buffer.slice(0, 16))));
      this.currentAudioBuffer = await this.audioContext.decodeAudioData(buffer);
      // Create audio source for playback
      const audioSource = this.audioContext.createBufferSource();
      audioSource.buffer = this.currentAudioBuffer;
      audioSource.connect(this.audioContext.destination);
      // Store the source for control
      if (!this.audioSources) {
        this.audioSources = [];
      }
      this.audioSources.push(audioSource);
      // Remove any call to audioAnalyzer/analyzeStem
    } catch (error) {
      debugLog.error('❌ Failed to load audio buffer:', error);
      throw error;
    }
  }

  // Parameter setters
  public setGlobalScale(value: number) {
    this.visualParams.globalScale = value;
    this.effects.forEach(effect => {
      if ('setScale' in effect) {
        (effect as any).setScale(value);
      }
    });
  }

  public setRotationSpeed(value: number) {
    this.visualParams.rotationSpeed = value;
    this.effects.forEach(effect => {
      if ('setRotationSpeed' in effect) {
        (effect as any).setRotationSpeed(value);
      }
    });
  }

  public setColorIntensity(value: number) {
    this.visualParams.colorIntensity = value;
    this.effects.forEach(effect => {
      if ('setColorIntensity' in effect) {
        (effect as any).setColorIntensity(value);
      }
    });
  }

  public setEmissionIntensity(value: number) {
    this.visualParams.emissionIntensity = value;
    this.effects.forEach(effect => {
      if ('setEmissionIntensity' in effect) {
        (effect as any).setEmissionIntensity(value);
      }
    });
  }

  public setPositionOffset(value: number) {
    this.visualParams.positionOffset = value;
    this.effects.forEach(effect => {
      if ('setPositionOffset' in effect) {
        (effect as any).setPositionOffset(value);
      }
    });
  }

  public setHeightScale(value: number) {
    this.visualParams.heightScale = value;
    this.effects.forEach(effect => {
      if ('setHeightScale' in effect) {
        (effect as any).setHeightScale(value);
      }
    });
  }

  public setHueRotation(value: number) {
    this.visualParams.hueRotation = value;
    this.effects.forEach(effect => {
      if ('setHueRotation' in effect) {
        (effect as any).setHueRotation(value);
      }
    });
  }

  public setBrightness(value: number) {
    this.visualParams.brightness = value;
    this.effects.forEach(effect => {
      if ('setBrightness' in effect) {
        (effect as any).setBrightness(value);
      }
    });
  }

  public setComplexity(value: number) {
    this.visualParams.complexity = value;
    this.effects.forEach(effect => {
      if ('setComplexity' in effect) {
        (effect as any).setComplexity(value);
      }
    });
  }

  public setParticleSize(value: number) {
    this.visualParams.particleSize = value;
    this.effects.forEach(effect => {
      if ('setParticleSize' in effect) {
        (effect as any).setParticleSize(value);
      }
    });
  }

  public setOpacity(value: number) {
    this.visualParams.opacity = value;
    this.effects.forEach(effect => {
      if ('setOpacity' in effect) {
        (effect as any).setOpacity(value);
      }
    });
  }

  public setAnimationSpeed(value: number) {
    this.visualParams.animationSpeed = value;
    this.effects.forEach(effect => {
      if ('setAnimationSpeed' in effect) {
        (effect as any).setAnimationSpeed(value);
      }
    });
  }

  public setParticleCount(value: number) {
    this.visualParams.particleCount = value;
    this.effects.forEach(effect => {
      if ('setParticleCount' in effect) {
        (effect as any).setParticleCount(value);
      }
    });
  }

  public updateSettings(settings: Record<string, number>) {
    Object.entries(settings).forEach(([key, value]) => {
      switch (key) {
        case 'globalIntensity':
          this.setColorIntensity(value);
          this.setEmissionIntensity(value);
          break;
        case 'smoothingFactor':
          // Apply to all effects that support smoothing
          this.effects.forEach(effect => {
            if ('setSmoothingFactor' in effect) {
              (effect as any).setSmoothingFactor(value);
            }
          });
          break;
        case 'responsiveness':
          // Apply to all effects that support responsiveness
          this.effects.forEach(effect => {
            if ('setResponsiveness' in effect) {
              (effect as any).setResponsiveness(value);
            }
          });
          break;
      }
    });
  }

  // Method to handle responsive resizing (no letterboxing, always fill canvas)
  public handleViewportResize(canvasWidth: number, canvasHeight: number) {
    this.renderer.setSize(canvasWidth, canvasHeight);
    this.camera.aspect = canvasWidth / canvasHeight;
    this.camera.updateProjectionMatrix();
    
    // Update resolution uniforms for all effects
    this.effects.forEach(effect => {
      if ('uniforms' in effect && (effect as any).uniforms?.uResolution) {
        (effect as any).uniforms.uResolution.value.set(canvasWidth, canvasHeight);
      }
    });
    // Resize compositor targets
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.resize(canvasWidth, canvasHeight);
    }
    debugLog.log('🎨 Responsive resize:', canvasWidth, canvasHeight, 'aspect:', this.camera.aspect);
  }

  // 2D Composition Layer for future video/image integration
  public createCompositionLayer() {
    // Create an orthographic camera for 2D composition
    const aspectRatio = this.camera.aspect;
    const frustumSize = 2;
    const orthographicCamera = new THREE.OrthographicCamera(
      frustumSize * aspectRatio / -2,
      frustumSize * aspectRatio / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    orthographicCamera.position.set(0, 0, 1);
    orthographicCamera.lookAt(0, 0, 0);

    // Create a composition scene for 2D elements
    const compositionScene = new THREE.Scene();
    
    return {
      scene: compositionScene,
      camera: orthographicCamera,
      addVideoLayer: (video: HTMLVideoElement, position: {x: number, y: number}, scale: {x: number, y: number}) => {
        const texture = new THREE.VideoTexture(video);
        const plane = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(plane, material);
        
        // Position in 2D space (orthographic camera)
        mesh.position.set(position.x, position.y, 0);
        mesh.scale.set(scale.x, scale.y, 1);
        
        compositionScene.add(mesh);
        return mesh;
      },
      addImageLayer: (image: HTMLImageElement, position: {x: number, y: number}, scale: {x: number, y: number}) => {
        const texture = new THREE.TextureLoader().load(image.src);
        const plane = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(plane, material);
        
        // Position in 2D space (orthographic camera)
        mesh.position.set(position.x, position.y, 0);
        mesh.scale.set(scale.x, scale.y, 1);
        
        compositionScene.add(mesh);
        return mesh;
      }
    };
  }

  // GPU Compositing System Access Methods
  
  public getAudioTextureManager(): AudioTextureManager | null {
    return this.audioTextureManager;
  }

  public getMediaLayerManager(): MediaLayerManager | null {
    return this.mediaLayerManager;
  }

  // GPU compositing always on via MultiLayerCompositor

  public loadAudioAnalysisForGPU(analysisData: AudioFeatureData): void {
    if (this.audioTextureManager) {
      this.audioTextureManager.loadAudioAnalysis(analysisData);
      debugLog.log('🎵 Audio analysis loaded into GPU textures');
    }
  }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/ParticleNetworkEffect.ts">
import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  note: number;
  noteVelocity: number;
  track: string;
  // Add audio feature data for audio-triggered particles
  audioFeature?: string;
  audioValue?: number;
  spawnType: 'midi' | 'audio';
}

export class ParticleNetworkEffect implements VisualEffect {
  id = 'particleNetwork';
  name = 'MIDI & Audio Particle Network';
  description = 'Glowing particle network that responds to MIDI notes and audio features';
  enabled = true;
  parameters = {
    maxParticles: 50,
    connectionDistance: 2.5,
    particleLifetime: 3.0,
    glowIntensity: 0.6,
    glowSoftness: 3.0,
    particleColor: [1.0, 1.0, 1.0],
    particleSize: 15.0,
    particleSpawning: 0.0, // Modulation destination for particle spawning (0-1)
    spawnThreshold: 0.5, // Threshold for when modulation signal spawns particles
    connectionOpacity: 0.8, // Opacity multiplier for connection lines
  };

  private internalScene!: THREE.Scene;
  private internalCamera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particleSystem!: THREE.Points;
  private connectionLines!: THREE.LineSegments;
  private material!: THREE.ShaderMaterial;
  private uniforms!: Record<string, THREE.IUniform>;
  
  private particles: Particle[] = [];
  private geometry!: THREE.BufferGeometry;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private lives!: Float32Array;
  
  // Connection data
  private connectionGeometry!: THREE.BufferGeometry;
  private connectionMaterial!: THREE.LineBasicMaterial;
  private connectionPositions!: Float32Array;
  private connectionColors!: Float32Array;
  private maxConnections: number = 500; // Limit connections
  private activeConnections: number = 0;
  
  // Performance optimization: skip frames
  private frameSkipCounter = 0;
  private frameSkipInterval = 2; // Update every 3rd frame for 30fps -> 10fps updates

  private instancedMesh!: THREE.InstancedMesh;
  private instanceColors!: Float32Array;
  private instanceLives!: Float32Array;
  private instanceSizes!: Float32Array;
  private dummyMatrix: THREE.Matrix4 = new THREE.Matrix4();

  // Audio spawning state
  private lastAudioSpawnTime: number = 0;
  private lastManualSpawnTime: number = 0;
  private currentAudioData: AudioAnalysisData | null = null;


  constructor() {
    this.setupUniforms();
  }

  

  private screenToWorld(screenX: number, screenY: number): THREE.Vector3 {
    // Convert screen px to NDC
    if (!this.renderer || !this.internalCamera) return new THREE.Vector3();
    const size = this.renderer.getSize(new THREE.Vector2());
    const ndcX = (screenX / size.x) * 2 - 1;
    const ndcY = -((screenY / size.y) * 2 - 1);
    // Project to world at z=0
    const vector = new THREE.Vector3(ndcX, ndcY, 0.0);
    vector.unproject(this.internalCamera);
    return vector;
  }


  private setupUniforms() {
    this.uniforms = {
      uTime: { value: 0.0 },
      uIntensity: { value: 1.0 },
      uGlowIntensity: { value: 1.0 }, // Reset to a reasonable default
      uGlowSoftness: { value: this.parameters.glowSoftness },
      uSizeMultiplier: { value: 1.0 } // Size control uniform
    };
  }

  init(renderer: THREE.WebGLRenderer): void {
    debugLog.log('🌟 ParticleNetworkEffect.init() called');
    this.renderer = renderer;
    // Create internal scene and a perspective camera for 3D effect
    this.internalScene = new THREE.Scene();
    this.internalScene.background = null; // Transparent background for layer compositing
    console.log('✨ ParticleNetworkEffect: Scene created, background =', this.internalScene.background);
    const size = this.renderer.getSize(new THREE.Vector2());
    const aspect = size.x / size.y || 1;
    this.internalCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.internalCamera.position.set(0, 0, 5);
    
    this.createParticleSystem();
    this.createConnectionSystem();
    
    // Initialize size multiplier based on current particleSize parameter
    if (this.uniforms) {
      this.uniforms.uSizeMultiplier.value = this.parameters.particleSize;
    }
    
    debugLog.log('🌟 Particle Network initialized');
  }
  
  private createParticleSystem() {
    // Plane that will always face the camera (we'll orient in updateBuffers)
    const quad = new THREE.PlaneGeometry(1, 1);

    // Custom shader material for billboard
    const vertexShader = `
      attribute vec3 instanceColor;
      attribute float instanceLife;
      attribute float instanceSize;
      varying vec3 vColor;
      varying float vLife;
      varying float vSize;
      varying vec2 vUv;
      
      void main() {
        vColor = instanceColor;
        vLife  = instanceLife;
        vSize  = instanceSize;
        vUv    = uv;
        
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform float uGlowIntensity;
      uniform float uGlowSoftness; // softness control, not exponent
      varying vec3 vColor;
      varying float vLife;
      varying vec2 vUv;
      
      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center) * 2.0; // 0.0 center → 1.0 edge
        if (dist > 1.0) discard;

        // Solid core ensures visibility
        float core = 1.0 - smoothstep(0.0, 0.2, dist);

        // Smooth glow falloff using exp
        float glow = exp(-pow(dist, uGlowSoftness));
        
        float alpha = (core + glow * uGlowIntensity) * vLife;
        vec3 finalColor = vColor * (1.0 + glow * uGlowIntensity * 0.5 + core * 0.2);

        // Premultiplied alpha for additive blending
        gl_FragColor = vec4(finalColor * alpha, alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      premultipliedAlpha: true,
      vertexColors: true
    });

    const maxParticles = this.parameters.maxParticles;
    this.instancedMesh = new THREE.InstancedMesh(quad, this.material, maxParticles);

    // Per-instance dynamic attributes
    this.instanceColors = new Float32Array(maxParticles * 3);
    this.instanceLives  = new Float32Array(maxParticles);
    this.instanceSizes  = new Float32Array(maxParticles);

    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.geometry.setAttribute(
      'instanceColor',
      new THREE.InstancedBufferAttribute(this.instanceColors, 3, false)
    );
    this.instancedMesh.geometry.setAttribute(
      'instanceLife',
      new THREE.InstancedBufferAttribute(this.instanceLives, 1, false)
    );
    this.instancedMesh.geometry.setAttribute(
      'instanceSize',
      new THREE.InstancedBufferAttribute(this.instanceSizes, 1, false)
    );

    // Initialize with a few default particles to make the effect visible
    this.initializeDefaultParticles();

    this.internalScene.add(this.instancedMesh);
  }

  private initializeDefaultParticles() {
    // Add a few default particles to ensure the system renders
    for (let i = 0; i < 5; i++) {
      const particle = this.createParticle(60 + i, 64, 'default');
      this.particles.push(particle);
    }
    this.updateBuffers();
  }
  
  private getRandomSpawnPosition(): THREE.Vector3 {
    // Spawn across entire viewport in world coordinates
    const x = (Math.random() - 0.5) * 4; // -2 to +2 in world space
    const y = (Math.random() - 0.5) * 4; // -2 to +2 in world space
    const z = 0;
    return new THREE.Vector3(x, y, z);
  }
  
  private createParticle(note: number, velocity: number, track: string, spawnType: 'midi' | 'audio' = 'midi', audioFeature?: string, audioValue?: number): Particle {
    // Spawn inside current viewport bounds
    const position = this.getRandomSpawnPosition();
    
    // Give them a random direction to drift in
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02
    );
    
    // Calculate size based on spawn type
    let size: number;
    if (spawnType === 'audio' && audioValue !== undefined) {
      // Audio particles: size based on audio value
      size = this.parameters.particleSize * (0.5 + audioValue * 1.5);
    } else {
      // MIDI particles: size based on velocity
      size = 3.0 + (velocity / 127) * 5.0;
    }
    
    return {
      position,
      velocity: vel,
      life: 1.0,
      maxLife: this.parameters.particleLifetime,
      size,
      note,
      noteVelocity: velocity,
      track,
      audioFeature,
      audioValue,
      spawnType
    };
  }
  
  private getNoteColor(note: number, velocity: number, spawnType: 'midi' | 'audio' = 'midi', audioValue?: number): THREE.Color {
    const baseColor = new THREE.Color(
      this.parameters.particleColor[0],
      this.parameters.particleColor[1], 
      this.parameters.particleColor[2]
    );
    
    if (spawnType === 'audio' && audioValue !== undefined) {
      // Audio particles: vary hue based on audio value
      const hue = (audioValue * 0.3) % 1.0;
      const audioColor = new THREE.Color().setHSL(hue, 0.7, 0.6);
      return audioColor.lerp(baseColor, 0.5);
    } else {
      // MIDI particles: note-based color
      const hue = (note % 12) / 12;
      const saturation = 0.4 + (velocity / 127) * 0.3;
      const lightness = 0.5 + (velocity / 127) * 0.2;
      
      const noteColor = new THREE.Color();
      noteColor.setHSL(hue, saturation, lightness);
      return noteColor.lerp(baseColor, 0.3);
    }
  }
  
  private updateParticles(deltaTime: number, midiData: LiveMIDIData, audioData?: AudioAnalysisData) {
    // Add new particles for active MIDI notes
    midiData.activeNotes.forEach(noteData => {
      if (this.particles.length < this.parameters.maxParticles) {
        // Check if we already have a recent particle for this note
        const hasRecentParticle = this.particles.some(p => 
          p.note === noteData.note && p.life > 0.8 && p.spawnType === 'midi'
        );
        
        if (!hasRecentParticle) {
          const particle = this.createParticle(noteData.note, noteData.velocity, noteData.track, 'midi');
          this.particles.push(particle);
        }
      }
    });
    
    // Spawn particles based on particleSpawning parameter (manual or audio-modulated)
    if (this.parameters.particleSpawning >= this.parameters.spawnThreshold) {
      this.spawnManualParticles(deltaTime);
    }
    
    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update life
      particle.life -= deltaTime / particle.maxLife;
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Update physics
      particle.velocity.multiplyScalar(0.98); // Damping
      
      // Apply velocity
      particle.position.add(particle.velocity);
    }
    
    this.updateBuffers();
    this.updateConnections();
  }
  
  
  private spawnManualParticles(deltaTime: number) {
    const currentTime = performance.now() / 1000;
    
    // Check cooldown for manual spawning
    if (currentTime - this.lastManualSpawnTime < 0.1) { // 100ms cooldown for manual testing
      return;
    }
    
    // Calculate spawn probability based on how much particleSpawning exceeds threshold
    const excessAmount = this.parameters.particleSpawning - this.parameters.spawnThreshold;
    const spawnProbability = Math.min(excessAmount * 2.0, 0.5); // Max 50% chance per frame
    
    if (Math.random() < spawnProbability && this.particles.length < this.parameters.maxParticles) {
      // Create manual test particle
      const particle = this.createParticle(
        60, // Default note
        Math.floor(this.parameters.particleSpawning * 127), // Use slider value as velocity
        'manual',
        'audio', // Use audio spawn type for visual distinction
        'manual',
        this.parameters.particleSpawning
      );
      
      this.particles.push(particle);
      this.lastManualSpawnTime = currentTime;
    }
  }
  
  
  private updateBuffers() {
    const cameraQuat = this.internalCamera.quaternion;

    // Update per-instance data
    let index = 0;
    this.particles.forEach((particle) => {
      if (index >= this.parameters.maxParticles) return;
      // Compose matrix facing camera
      const baseFactor = 0.02; // world units per size unit
      // Clamp scale so full visible range reached at ~60% of slider (slider max ~50)
      const scaleMult = Math.min(this.parameters.particleSize, 30); // stop growing after 60%
      const scaleValue = particle.size * baseFactor * scaleMult;
      const scale = new THREE.Vector3(scaleValue, scaleValue, 1);
      this.dummyMatrix.compose(particle.position, cameraQuat, scale);
      this.instancedMesh.setMatrixAt(index, this.dummyMatrix);

      // Color
      const color = this.getNoteColor(particle.note, particle.noteVelocity, particle.spawnType, particle.audioValue);
      this.instanceColors[index * 3] = color.r;
      this.instanceColors[index * 3 + 1] = color.g;
      this.instanceColors[index * 3 + 2] = color.b;

      // Life & size
      this.instanceLives[index] = particle.life;
      this.instanceSizes[index] = particle.size;

      index++;
    });

    this.instancedMesh.count = index;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    (this.instancedMesh.geometry.getAttribute('instanceColor') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.instancedMesh.geometry.getAttribute('instanceLife') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.instancedMesh.geometry.getAttribute('instanceSize') as THREE.InstancedBufferAttribute).needsUpdate = true;
  }
  
  private createConnectionSystem() {
    // Create connection line system using LineSegments for multiple disconnected lines
    this.connectionGeometry = new THREE.BufferGeometry();
    this.connectionPositions = new Float32Array(this.maxConnections * 6); // 2 points per line, 3 coords each
    this.connectionColors = new Float32Array(this.maxConnections * 6); // 2 colors per line, 3 channels each
    
    this.connectionGeometry.setAttribute('position', new THREE.BufferAttribute(this.connectionPositions, 3));
    this.connectionGeometry.setAttribute('color', new THREE.BufferAttribute(this.connectionColors, 3));
    
    this.connectionMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false
    });
    
    this.connectionLines = new THREE.LineSegments(this.connectionGeometry, this.connectionMaterial);
    this.internalScene.add(this.connectionLines);
  }

  private updateConnections() {
    let connectionIndex = 0;
    
    for (let i = 0; i < this.particles.length - 1 && connectionIndex < this.maxConnections; i++) {
      for (let j = i + 1; j < this.particles.length && connectionIndex < this.maxConnections; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const distance = p1.position.distanceTo(p2.position);
        
        if (distance < this.parameters.connectionDistance) {
          // Improved strength calculation - less aggressive falloff
          const distanceFactor = 1.0 - (distance / this.parameters.connectionDistance);
          const lifeFactor = Math.min(p1.life, p2.life);
          // Normalize velocity contribution (0.5 to 1.0 range instead of multiplying)
          const velocityFactor = 0.5 + ((p1.noteVelocity + p2.noteVelocity) / 508);
          const strength = distanceFactor * lifeFactor * velocityFactor * this.parameters.connectionOpacity;
          
          const color = new THREE.Color().lerpColors(
            this.getNoteColor(p1.note, p1.noteVelocity, p1.spawnType, p1.audioValue),
            this.getNoteColor(p2.note, p2.noteVelocity, p2.spawnType, p2.audioValue),
            0.5
          );
          
          // Set positions for this line segment (2 points)
          const baseIndex = connectionIndex * 6;
          this.connectionPositions[baseIndex] = p1.position.x;
          this.connectionPositions[baseIndex + 1] = p1.position.y;
          this.connectionPositions[baseIndex + 2] = p1.position.z;
          this.connectionPositions[baseIndex + 3] = p2.position.x;
          this.connectionPositions[baseIndex + 4] = p2.position.y;
          this.connectionPositions[baseIndex + 5] = p2.position.z;
          
          // Set colors for this line segment (2 vertices)
          this.connectionColors[baseIndex] = color.r * strength;
          this.connectionColors[baseIndex + 1] = color.g * strength;
          this.connectionColors[baseIndex + 2] = color.b * strength;
          this.connectionColors[baseIndex + 3] = color.r * strength;
          this.connectionColors[baseIndex + 4] = color.g * strength;
          this.connectionColors[baseIndex + 5] = color.b * strength;
          
          connectionIndex++;
        }
      }
    }
    
    // Set the draw range to only render active connections
    this.connectionGeometry.setDrawRange(0, connectionIndex * 2); // 2 vertices per connection
    this.connectionGeometry.attributes.position.needsUpdate = true;
    this.connectionGeometry.attributes.color.needsUpdate = true;
    this.activeConnections = connectionIndex;
  }
  
  updateParameter(paramName: string, value: any): void {
    // Immediately update parameters for real-time control
    switch (paramName) {
      case 'maxParticles':
        // This affects the next particle creation cycle
        break;
      case 'connectionDistance':
        // This affects connection calculations in updateConnections
        break;
      case 'particleLifetime':
        // This affects particle creation
        break;
      case 'glowIntensity':
        if (this.uniforms) this.uniforms.uGlowIntensity.value = value;
        break;
      case 'glowSoftness':
        this.parameters.glowSoftness = value;
        if (this.uniforms) this.uniforms.uGlowSoftness.value = value;
        break;
      case 'particleColor':
        // This affects particle color generation
        break;
      case 'particleSize':
        this.parameters.particleSize = value;
        break;
      case 'particleSpawning':
        this.parameters.particleSpawning = value;
        break;
      case 'spawnThreshold':
        this.parameters.spawnThreshold = value;
        break;
      case 'connectionOpacity':
        this.parameters.connectionOpacity = value;
        break;
    }
  }

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
    if (!this.uniforms) {
      debugLog.warn('⚠️ Uniforms not initialized in ParticleNetworkEffect.update()');
      return;
    }

    // Store current audio data for particle spawning
    this.currentAudioData = audioData;

    // Generic: sync all parameters to uniforms
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        this.uniforms[uniformKey].value = this.parameters[key as keyof typeof this.parameters];
      }
    }

    // Always update time and uniforms for smooth animation
    this.uniforms.uTime.value += deltaTime;
    this.uniforms.uIntensity.value = Math.max(0.5, Math.min(midiData.activeNotes.length / 3.0, 2.0));
    this.uniforms.uGlowIntensity.value = this.parameters.glowIntensity;
    
    // Ensure the instanced mesh is visible
    if (this.instancedMesh) {
      this.instancedMesh.visible = true;
    }
    
    // Skip heavy particle updates every few frames for performance
    this.frameSkipCounter++;
    if (this.frameSkipCounter >= this.frameSkipInterval) {
      this.frameSkipCounter = 0;
      this.updateParticles(deltaTime * this.frameSkipInterval, midiData, audioData);
    }
  }

  public getScene(): THREE.Scene {
    return this.internalScene;
  }

  public getCamera(): THREE.Camera {
    return this.internalCamera;
  }

  destroy(): void {
    if (this.instancedMesh) {
      this.internalScene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      this.material.dispose();
    }
    
    if (this.connectionLines) {
      this.internalScene.remove(this.connectionLines);
      this.connectionGeometry.dispose();
      this.connectionMaterial.dispose();
    }
  }
}
</file>

</files>
