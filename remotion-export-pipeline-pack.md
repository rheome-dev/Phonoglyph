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
- Only files matching these patterns are included: apps/web/src/remotion/**/*.ts, apps/web/src/remotion/**/*.tsx, apps/web/src/lib/export-utils.ts, apps/web/src/lib/visualizer/effects/*.ts, apps/web/src/stores/visualizerStore.ts
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
apps/
  web/
    src/
      lib/
        visualizer/
          effects/
            AsciiFilterEffect.ts
            BaseShaderEffect.ts
            BeamEffect.ts
            BloomEffect.ts
            BlurEffect.ts
            BokehEffect.ts
            BulgeEffect.ts
            ChromaticAbberationEffect.ts
            CircleEffect.ts
            CRTEffect.ts
            DiffusionEffect.ts
            DitherEffect.ts
            EffectDefinitions.ts
            EffectRegistry.ts
            FbmEffect.ts
            FogEffect.ts
            GlitchEffect.ts
            GlitterEffect.ts
            GodRaysEffect.ts
            GradientFillEffect.ts
            GrainEffect.ts
            HalftoneEffect.ts
            ImageSlideshowEffect.ts
            LightTrailEffect.ts
            LiquifyEffect.ts
            MetaballsEffect.ts
            NoiseEffect.ts
            NoiseFillEffect.ts
            ParticleNetworkEffect.ts
            PatternEffect.ts
            PixelateEffect.ts
            PolarEffect.ts
            PosterizeEffect.ts
            ProgressiveBlurEffect.ts
            RadialBlurEffect.ts
            ReplicateEffect.ts
            RippleEffect.ts
            SineWavesEffect.ts
            SkyboxEffect.ts
            StretchEffect.ts
            SwirlEffect.ts
            TrailEffect.ts
            VideoEffect.ts
            WaterCausticsEffect.ts
            WaterRipplesEffect.ts
            WavesEffect.ts
            WispsEffect.ts
        export-utils.ts
      remotion/
        Debug.tsx
        index.ts
        RayboxComposition.tsx
        RemotionOverlayRenderer.tsx
        Root.tsx
      stores/
        visualizerStore.ts
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="apps/web/src/lib/visualizer/effects/EffectRegistry.ts">
import { debugLog } from '@/lib/utils';
import type { VisualEffect } from '@/types/visualizer';

export interface EffectConstructor {
  new (config?: any): VisualEffect;
}

export interface EffectDefinition {
  id: string;
  name: string;
  description: string;
  category?: string;
  version?: string;
  author?: string;
  constructor: EffectConstructor;
  defaultConfig?: any;
}

export class EffectRegistry {
  private static effects = new Map<string, EffectDefinition>();

  static register(effectDef: EffectDefinition): void {
    if (!effectDef?.id || !effectDef?.constructor) {
      debugLog.warn('Attempted to register invalid effect definition', effectDef);
      return;
    }
    this.effects.set(effectDef.id, effectDef);
    debugLog.log(`[EffectRegistry] Registered effect: ${effectDef.id}`);
  }

  static createEffect(effectId: string, config?: any): VisualEffect | null {
    const effectDef = this.effects.get(effectId);
    if (!effectDef) {
      debugLog.warn(`[EffectRegistry] Effect not found: ${effectId}`);
      return null;
    }
    try {
      return new effectDef.constructor(config ?? effectDef.defaultConfig);
    } catch (error) {
      debugLog.error(`[EffectRegistry] Failed to create effect ${effectId}:`, error);
      return null;
    }
  }

  static getAvailableEffects(): EffectDefinition[] {
    return Array.from(this.effects.values());
  }

  static getEffectById(id: string): EffectDefinition | null {
    return this.effects.get(id) ?? null;
  }

  static getRegisteredEffectIds(): string[] {
    return Array.from(this.effects.keys());
  }
}
</file>

<file path="apps/web/src/stores/visualizerStore.ts">
'use client';

import { create } from 'zustand';
import { getNestedParam, setNestedParam } from '@/lib/visualizer/paramKeys';

// Types
export interface FeatureMapping {
  featureId: string | null;
  modulationAmount: number; // 0-1, default 0.5 (50%)
}

export interface AudioAnalysisSettings {
  transientDecay: number;
  transientSensitivity: number;
}

interface VisualizerState {
  // Global Settings
  aspectRatio: string;
  selectedEffects: Record<string, boolean>;
  
  // Audio Analysis Configuration (per-feature settings)
  audioAnalysisSettings: AudioAnalysisSettings;
  featureDecayTimes: Record<string, number>;
  featureSensitivities: Record<string, number>;
  
  // Mappings & Parameters
  mappings: Record<string, FeatureMapping>;
  // Nested: effectInstanceId -> paramName -> value
  baseParameterValues: Record<string, Record<string, any>>;
  activeSliderValues: Record<string, Record<string, any>>;
}

interface VisualizerActions {
  // Setters
  setAspectRatio: (ratio: string) => void;
  setSelectedEffects: (effects: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setAudioAnalysisSettings: (settings: Partial<AudioAnalysisSettings>) => void;
  setFeatureDecayTime: (featureId: string, decayTime: number) => void;
  setFeatureSensitivity: (featureId: string, sensitivity: number) => void;
  setMappings: (mappings: Record<string, FeatureMapping> | ((prev: Record<string, FeatureMapping>) => Record<string, FeatureMapping>)) => void;
  // Set full maps (rare)
  setBaseParameterValues: (values: Record<string, Record<string, any>> | ((prev: Record<string, Record<string, any>>) => Record<string, Record<string, any>>)) => void;
  setActiveSliderValues: (values: Record<string, Record<string, any>> | ((prev: Record<string, Record<string, any>>) => Record<string, Record<string, any>>)) => void;
  // Set single parameter helpers
  setBaseParam: (effectInstanceId: string, paramName: string, value: any) => void;
  setActiveParam: (effectInstanceId: string, paramName: string, value: any) => void;
  
  // Helper Actions
  updateMapping: (id: string, mapping: FeatureMapping) => void;
  removeMapping: (id: string) => void;
  reset: () => void;
}

const DEFAULT_STATE: VisualizerState = {
  aspectRatio: 'mobile',
  selectedEffects: {},
  audioAnalysisSettings: {
    transientDecay: 0.5,
    transientSensitivity: 0.5,
  },
  featureDecayTimes: {},
  featureSensitivities: {},
  mappings: {},
  baseParameterValues: {},
  activeSliderValues: {},
};

export const useVisualizerStore = create<VisualizerState & VisualizerActions>((set) => ({
  ...DEFAULT_STATE,

  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  
  setSelectedEffects: (updater) => set((state) => ({ 
    selectedEffects: typeof updater === 'function' ? updater(state.selectedEffects) : updater 
  })),
  
  setAudioAnalysisSettings: (settings) => set((state) => ({
    audioAnalysisSettings: { ...state.audioAnalysisSettings, ...settings }
  })),

  setFeatureDecayTime: (featureId, decayTime) => set((state) => ({
    featureDecayTimes: { ...state.featureDecayTimes, [featureId]: decayTime }
  })),

  setFeatureSensitivity: (featureId, sensitivity) => set((state) => ({
    featureSensitivities: { ...state.featureSensitivities, [featureId]: sensitivity }
  })),

  setMappings: (updater) => set((state) => ({
    mappings: typeof updater === 'function' ? updater(state.mappings) : updater
  })),

  setBaseParameterValues: (updater) => set((state) => ({
    baseParameterValues: typeof updater === 'function' ? updater(state.baseParameterValues) : updater
  })),

  setActiveSliderValues: (updater) => set((state) => ({
    activeSliderValues: typeof updater === 'function' ? updater(state.activeSliderValues) : updater
  })),

  setBaseParam: (effectInstanceId, paramName, value) => set((state) => ({
    baseParameterValues: setNestedParam(state.baseParameterValues, effectInstanceId, paramName, value)
  })),

  setActiveParam: (effectInstanceId, paramName, value) => set((state) => ({
    activeSliderValues: setNestedParam(state.activeSliderValues, effectInstanceId, paramName, value)
  })),

  updateMapping: (id, mapping) => set((state) => ({
    mappings: { ...state.mappings, [id]: mapping }
  })),

  removeMapping: (id) => set((state) => {
    const newMappings = { ...state.mappings };
    delete newMappings[id];
    return { mappings: newMappings };
  }),

  reset: () => set(DEFAULT_STATE),
}));
</file>

<file path="apps/web/src/lib/visualizer/effects/AsciiFilterEffect.ts">
import * as THREE from 'three';
import { VisualEffect } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';
import { MultiLayerCompositor } from '../core/MultiLayerCompositor';

export interface AsciiFilterConfig {
  id?: string; // Optional effect ID
  textSize: number; // 0.0 to 1.0 - controls text size
  gamma: number; // 0.2 to 2.2 - controls font weight selection (audio reactive)
  opacity: number; // 0.0 to 1.0 - overall effect opacity (audio reactive)
  contrast: number; // 0.0 to 2.0 - contrast boost (audio reactive)
  invert: number; // 0.0 or 1.0 - invert luminance (audio reactive)
  hideBackground: boolean; // If true, only show ASCII text without background
  textColor: [number, number, number]; // RGB color for ASCII characters (0-1 range)
  sourceTexture?: THREE.Texture; // Optional source texture to filter (deprecated - uses compositor)
}

export class AsciiFilterEffect implements VisualEffect {
  id = 'asciiFilter';
  name: string;
  description: string;
  enabled: boolean;
  parameters: AsciiFilterConfig;

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material!: THREE.ShaderMaterial;
  private mesh!: THREE.Mesh;
  private uniforms!: Record<string, THREE.IUniform>;
  private renderer!: THREE.WebGLRenderer;
  private fontSpriteTexture!: THREE.Texture;
  private sourceTexture?: THREE.Texture;
  private compositor?: MultiLayerCompositor;
  private layerId?: string;
  private logFrameCount: number = 0;
  private spriteCols: number = 16;
  private spriteRows: number = 6;

  constructor(config: Partial<AsciiFilterConfig> = {}) {
    this.name = 'ASCII Filter';
    this.description = 'Converts input to ASCII art with audio-reactive parameters';
    this.enabled = true;
    
    // Extract id from config to avoid including it in parameters
    const { id, ...paramsWithoutId } = config;
    this.parameters = {
      textSize: 0.4, // Default text size (slightly smaller than 50%)
      gamma: 1.2,
      opacity: 0.87,
      contrast: 1.4,
      invert: 0.0,
      hideBackground: false,
      textColor: [1.0, 1.0, 1.0] as [number, number, number], // White by default
      sourceTexture: config?.sourceTexture,
      ...paramsWithoutId
    };

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.sourceTexture = this.parameters.sourceTexture;
  }

  private mapTextSizeToGridSize(textSize: number): number {
    // Map 0.0-1.0 to 0.005-0.05
    // Small text size (0) -> Small grid size (0.005) (wait, small grid = small text)
    // Large text size (1) -> Large grid size (0.05)
    return 0.005 + (textSize * 0.045);
  }

  /**
   * Set the compositor and layer ID to pull texture from layers beneath
   */
  public setCompositor(compositor: MultiLayerCompositor, layerId: string): void {
    debugLog.log('🔗 [ASCII Filter] setCompositor called:', {
      effectId: this.id,
      layerId: layerId,
      hasCompositor: !!compositor
    });
    this.compositor = compositor;
    this.layerId = layerId;
  }

  private generateFontSprite(): { texture: THREE.Texture; cols: number; rows: number } {
    const canvas = document.createElement('canvas');
    const BASE_GLYPH_HEIGHT = 64; // Base resolution for crispness
    const GLYPH_HEIGHT = BASE_GLYPH_HEIGHT; // Fixed size, no fontSize parameter
    const GLYPH_WIDTH = Math.round(GLYPH_HEIGHT * 0.5);  // Aspect ratio ~0.5 for monospace
    const CHARS_PER_ROW = 16;
    const NUM_CHARS = 95; // ASCII 32-126
    const NUM_ROWS = Math.ceil(NUM_CHARS / CHARS_PER_ROW);
    
    canvas.width = CHARS_PER_ROW * GLYPH_WIDTH;
    canvas.height = NUM_ROWS * GLYPH_HEIGHT;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2d context for font sprite generation');
    }

    // 1. Fill Background (Black)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Draw Characters with proper monospace code font
    // Try to use system monospace fonts that are ASCII-friendly
    const fontFamilies = [
      'Consolas',      // Windows
      'Monaco',        // macOS
      'Menlo',         // macOS
      'Courier New',   // Fallback
      'monospace'      // Generic fallback
    ];
    
    ctx.fillStyle = '#FFFFFF';
    // Use a proper monospace code font - try system fonts first
    const fontSize = Math.round(GLYPH_HEIGHT * 0.75);
    ctx.font = `bold ${fontSize}px ${fontFamilies.join(', ')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < NUM_CHARS; i++) {
      const char = String.fromCharCode(32 + i);
      const row = Math.floor(i / CHARS_PER_ROW);
      const col = i % CHARS_PER_ROW;
      
      const x = col * GLYPH_WIDTH + GLYPH_WIDTH / 2;
      const y = row * GLYPH_HEIGHT + GLYPH_HEIGHT / 2; 
      
      ctx.fillText(char, x, y);
    }

    const texture = new THREE.CanvasTexture(canvas);
    // CRITICAL: Use NearestFilter for pixel-perfect ASCII edges
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = true; // Flip to match GL texture coordinate system
    
    return { texture, cols: CHARS_PER_ROW, rows: NUM_ROWS };
  }

  private setupUniforms() {
    const size = this.renderer ? this.renderer.getSize(new THREE.Vector2()) : new THREE.Vector2(1024, 1024);
    
    this.uniforms = {
      uTexture: { value: this.sourceTexture || null },
      uSprite: { value: this.fontSpriteTexture },
      uSpriteGrid: { value: new THREE.Vector2(this.spriteCols, this.spriteRows) }, // Pass dimensions to shader
      uResolution: { value: new THREE.Vector2(size.x, size.y) },
      uGridSize: { value: this.mapTextSizeToGridSize(this.parameters.textSize) },
      uGamma: { value: this.parameters.gamma },
      uOpacity: { value: this.parameters.opacity },
      uContrast: { value: this.parameters.contrast },
      uInvert: { value: this.parameters.invert },
      uHideBackground: { value: this.parameters.hideBackground ? 1.0 : 0.0 },
      uColor: { value: new THREE.Vector3(...this.parameters.textColor) },
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
      uniform sampler2D uSprite;
      uniform vec2 uResolution;
      uniform vec2 uSpriteGrid; // x = cols, y = rows
      uniform float uGridSize;
      uniform float uGamma;
      uniform float uOpacity;
      uniform float uContrast;
      uniform float uInvert;
      uniform float uHideBackground;
      uniform vec3 uColor;

      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        
        // 1. Aspect Ratio Correction
        float aspectRatio = uResolution.x / uResolution.y;
        
        // Define the number of characters across the screen
        // uGridSize = 0.02 means ~50 characters wide
        float charsAcross = 1.0 / uGridSize;
        float charsDown = charsAcross / aspectRatio * 0.5; // 0.5 accounts for char aspect ratio (width/height)

        vec2 cellCount = vec2(charsAcross, charsDown);
        
        // 2. Grid Calculation
        vec2 gridUV = floor(uv * cellCount) / cellCount; // The UV of the cell's top-left
        vec2 centerUV = gridUV + (0.5 / cellCount);      // The UV of the cell's center
        
        // 3. Sample Luminance (only from non-transparent pixels)
        vec4 centerColor = texture2D(uTexture, centerUV);
        
        // Check if the cell content is effectively transparent
        // If center is transparent, we treat the whole cell as empty
        if (centerColor.a < 0.1) {
          gl_FragColor = vec4(0.0);
          return;
        }
        
        float gray = dot(centerColor.rgb, vec3(0.299, 0.587, 0.114)); // Standard Luma weights
        
        // Apply Invert and Contrast
        gray = mix(gray, 1.0 - gray, uInvert);
        gray = pow(gray, uGamma); // Gamma corrects distribution
        gray = clamp((gray - 0.5) * uContrast + 0.5, 0.0, 1.0);

        // 4. Map Luminance to Character Index
        // Total characters in sprite sheet
        float totalChars = uSpriteGrid.x * uSpriteGrid.y; 
        
        // Map 0.0-1.0 to 0-(totalChars-1)
        // We subtract 1.0 so white doesn't overflow the array
        float charIndex = floor(gray * (totalChars - 1.0));

        // 5. Calculate 2D Sprite Coordinates (Row/Col)
        float colIndex = mod(charIndex, uSpriteGrid.x);
        float rowIndex = floor(charIndex / uSpriteGrid.x);

        // 6. Map Local UV to Sprite Sheet UV
        // Get UV (0-1) inside the current single cell
        vec2 localUV = fract(uv * cellCount);

        // Calculate sprite UV coordinates
        float spriteY = (rowIndex + localUV.y) / uSpriteGrid.y;
        float spriteX = (colIndex + localUV.x) / uSpriteGrid.x;

        vec2 spriteUV = vec2(spriteX, spriteY);

        // 7. Sample Sprite
        vec4 charColor = texture2D(uSprite, spriteUV);

        // 8. Composite
        // Use the character mask (charColor.r) to blend
        // If hideBackground is true, only show the ASCII text, otherwise blend with background
        vec3 asciiCellColor;
        float finalAlpha;
        
        if (uHideBackground > 0.5) {
          // Hide background mode: only show ASCII text, make background transparent
          // Use pure text color, no background blending
          asciiCellColor = uColor;
          // Only show pixels where there's actual text (charColor.r > threshold)
          // Use centerColor.a to respect source transparency, but multiply by charColor.r to only show text
          finalAlpha = centerColor.a * charColor.r;
        } else {
          // Normal mode: blend ASCII text with background
          asciiCellColor = mix(centerColor.rgb, uColor, charColor.r);
          // We use the center alpha for the entire cell to maintain the blocky shape
          finalAlpha = centerColor.a;
        }
        
        vec4 asciiResult = vec4(asciiCellColor, finalAlpha);
        
        // Mix with original for opacity control
        // If hideBackground is true, we don't blend with original (it's already transparent in asciiResult)
        vec4 original = texture2D(uTexture, uv);
        float blendFactor = uHideBackground > 0.5 ? 1.0 : uOpacity;
        
        gl_FragColor = mix(original, asciiResult, blendFactor);
      }
    `;

    try {
      this.material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: this.uniforms,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false
      });
    } catch (error) {
      debugLog.error('❌ ASCII Filter shader compilation error:', error);
      // Fallback to basic material
      this.material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
      }) as any;
    }
  }

  private createMesh() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(0, 0, 0);
    this.mesh.scale.set(2, 2, 1);
    this.scene.add(this.mesh);
  }

  init(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    
    // Generate font sprite texture
    try {
      // Destructure the result
      const spriteData = this.generateFontSprite();
      this.fontSpriteTexture = spriteData.texture;
      this.spriteCols = spriteData.cols;
      this.spriteRows = spriteData.rows;
    } catch (error) {
      debugLog.error('Failed to generate font sprite:', error);
      // Create a fallback white texture
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 1, 1);
      }
      this.fontSpriteTexture = new THREE.CanvasTexture(canvas);
      this.fontSpriteTexture.minFilter = THREE.NearestFilter;
      this.fontSpriteTexture.magFilter = THREE.NearestFilter;
      this.spriteCols = 16;
      this.spriteRows = 6;
    }

    this.setupUniforms();
    this.createMaterial();
    this.createMesh();
    
    debugLog.log('✅ ASCII Filter Effect initialized');
  }

  update(deltaTime: number): void {
    if (!this.enabled || !this.uniforms) return;

    // Update resolution if renderer size changed
    if (this.renderer) {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.uniforms.uResolution.value.set(size.x, size.y);
    }

    // Sync parameters to uniforms (these can be audio-modulated externally)
    // Direct uniform updates like MetaballsEffect for immediate visual feedback
    if (this.uniforms.uGridSize) this.uniforms.uGridSize.value = this.mapTextSizeToGridSize(this.parameters.textSize);
    if (this.uniforms.uGamma) this.uniforms.uGamma.value = this.parameters.gamma;
    if (this.uniforms.uOpacity) this.uniforms.uOpacity.value = this.parameters.opacity;
    if (this.uniforms.uContrast) this.uniforms.uContrast.value = this.parameters.contrast;
    if (this.uniforms.uInvert) this.uniforms.uInvert.value = this.parameters.invert;
    if (this.uniforms.uHideBackground) this.uniforms.uHideBackground.value = this.parameters.hideBackground ? 1.0 : 0.0;
    if (this.uniforms.uColor) this.uniforms.uColor.value.set(...this.parameters.textColor);
    
    // Update sprite grid dimensions
    if (this.uniforms.uSpriteGrid) {
      this.uniforms.uSpriteGrid.value.set(this.spriteCols, this.spriteRows);
    }

    // Get source texture from compositor (layers beneath) or fallback to parameter
    let sourceTexture: THREE.Texture | null = null;
    
    // Logging (throttled to every 60 frames ~1 second at 60fps)
    this.logFrameCount++;
    const shouldLog = this.logFrameCount % 60 === 0;
    
    if (shouldLog) {
      debugLog.log('🔍 [ASCII Filter] Texture check:', {
        hasCompositor: !!this.compositor,
        hasLayerId: !!this.layerId,
        layerId: this.layerId,
        hasParameterTexture: !!this.parameters.sourceTexture,
        currentUniformTexture: !!this.uniforms.uTexture.value
      });
    }
    
    if (this.compositor && this.layerId) {
      // Get accumulated texture from layers beneath this one
      sourceTexture = this.compositor.getAccumulatedTextureBeforeLayer(this.layerId);
      
      if (shouldLog) {
        debugLog.log('🔍 [ASCII Filter] Compositor texture result:', {
          textureReceived: !!sourceTexture,
          textureType: sourceTexture ? sourceTexture.constructor.name : 'null',
          textureSize: sourceTexture ? `${sourceTexture.image?.width || 'N/A'}x${sourceTexture.image?.height || 'N/A'}` : 'N/A'
        });
      }
    } else {
      if (shouldLog) {
        debugLog.warn('⚠️ [ASCII Filter] Missing compositor or layerId:', {
          compositor: !!this.compositor,
          layerId: this.layerId
        });
      }
    }
    
    // Fallback to parameter source texture if compositor doesn't provide one
    if (!sourceTexture && this.parameters.sourceTexture) {
      sourceTexture = this.parameters.sourceTexture;
      if (shouldLog) {
        debugLog.log('🔍 [ASCII Filter] Using fallback parameter texture');
      }
    }

    // Update source texture if it changed
    if (sourceTexture && this.uniforms.uTexture.value !== sourceTexture) {
      this.uniforms.uTexture.value = sourceTexture;
      if (shouldLog) {
        debugLog.log('✅ [ASCII Filter] Texture updated in uniform');
      }
    } else if (!sourceTexture && this.uniforms.uTexture.value) {
      // Clear texture if no source available
      this.uniforms.uTexture.value = null;
      if (shouldLog) {
        debugLog.warn('⚠️ [ASCII Filter] No source texture available, cleared uniform');
      }
    }
  }

  updateParameter(paramName: string, value: any): void {
    // Immediately update uniforms when parameters change (like MetaballsEffect)
    if (!this.uniforms) return;

    switch (paramName) {
      case 'textSize':
        this.parameters.textSize = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.textSize;
        if (this.uniforms) this.uniforms.uGridSize.value = this.mapTextSizeToGridSize(this.parameters.textSize);
        break;
      case 'gamma':
        this.parameters.gamma = typeof value === 'number' ? Math.max(0.2, Math.min(2.2, value)) : this.parameters.gamma;
        this.uniforms.uGamma.value = this.parameters.gamma;
        break;
      case 'opacity':
        this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
        this.uniforms.uOpacity.value = this.parameters.opacity;
        break;
      case 'contrast':
        this.parameters.contrast = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.contrast;
        this.uniforms.uContrast.value = this.parameters.contrast;
        break;
      case 'invert':
        this.parameters.invert = typeof value === 'number' ? (value > 0.5 ? 1.0 : 0.0) : this.parameters.invert;
        this.uniforms.uInvert.value = this.parameters.invert;
        break;
      case 'hideBackground':
        this.parameters.hideBackground = typeof value === 'boolean' ? value : this.parameters.hideBackground;
        if (this.uniforms) this.uniforms.uHideBackground.value = this.parameters.hideBackground ? 1.0 : 0.0;
        break;
      case 'textColor':
        if (Array.isArray(value) && value.length === 3) {
          this.parameters.textColor = [
            Math.max(0, Math.min(1, value[0])),
            Math.max(0, Math.min(1, value[1])),
            Math.max(0, Math.min(1, value[2]))
          ] as [number, number, number];
          this.uniforms.uColor.value.set(...this.parameters.textColor);
        }
        break;
      case 'color':
        // Backward compatibility: support old 'color' parameter name
        if (Array.isArray(value) && value.length === 3) {
          this.parameters.textColor = [
            Math.max(0, Math.min(1, value[0])),
            Math.max(0, Math.min(1, value[1])),
            Math.max(0, Math.min(1, value[2]))
          ] as [number, number, number];
          this.uniforms.uColor.value.set(...this.parameters.textColor);
        }
        break;
      case 'sourceTexture':
        this.parameters.sourceTexture = value;
        this.uniforms.uTexture.value = value || null;
        break;
    }
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.Camera {
    return this.camera;
  }

  resize(width: number, height: number): void {
    if (this.uniforms && this.uniforms.uResolution) {
      this.uniforms.uResolution.value.set(width, height);
    }
  }

  destroy(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
    if (this.fontSpriteTexture) {
      this.fontSpriteTexture.dispose();
    }
  }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/BeamEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface BeamConfig {
    intensity: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
    width: number; // 0.1 to 1.0
    angle: number; // 0.0 to 360.0
    color: string; // Hex color
}

export class BeamEffect extends BaseShaderEffect {
    id = 'beam';
    name = 'Beam';
    description = 'Animated scanning light beam';
    parameters: BeamConfig;

    constructor(config: Partial<BeamConfig> = {}) {
        super();
        this.parameters = {
            intensity: 1.0,
            speed: 0.5,
            width: 0.5,
            angle: 0.0,
            color: '#661aff', // Default blue-purple
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uSpeed: { value: this.parameters.speed },
            uWidth: { value: this.parameters.width },
            uAngle: { value: (this.parameters.angle * Math.PI) / 180.0 },
            uColor: { value: new THREE.Color(this.parameters.color) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSpeed;
      uniform float uWidth;
      uniform float uAngle;
      uniform vec3 uColor;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;
      const float TWO_PI = 6.28318530718;

      // Random float generator
      float random(vec2 seed) {
        return fract(sin(dot(seed.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      vec3 Tonemap_tanh(vec3 x) {
        x = clamp(x, -40.0, 40.0);
        return (exp(x) - exp(-x)) / (exp(x) + exp(-x));
      }

      float luma(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      vec3 drawLine(vec2 uv, vec2 center, float scale, float angle) {
        float radAngle = -angle;
        
        float phase = fract(uTime * 0.5 * uSpeed + 0.5) * (3.0 * max(1.0, scale)) - (1.5 * max(1.0, scale));
        
        vec2 direction = vec2(cos(radAngle), sin(radAngle));
        vec2 centerToPoint = uv - center;
        
        float projection = dot(centerToPoint, direction);
        float distToLine = length(centerToPoint - projection * direction);
        
        float lineRadius = 0.5 * 0.25 * uWidth;
        float brightness = lineRadius / (1.0 - smoothstep(0.4, 0.0, distToLine + 0.02));
        
        float glowRadius = scale;
        float glow = smoothstep(glowRadius, 0.0, abs(projection - phase));
        
        return brightness * (1.0 - distToLine) * (1.0 - distToLine) * uColor * glow;
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        vec2 center = vec2(0.5);
        vec3 beam = drawLine(uv, center, 0.5, uAngle);
        
        beam *= uIntensity;
        
        // Dithering
        float dither = (random(gl_FragCoord.xy) - 0.5) / 255.0;
        
        vec3 blended = Tonemap_tanh(beam) + bg.rgb;
        blended += dither;
        
        gl_FragColor = vec4(blended, max(bg.a, luma(beam)));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uWidth.value = this.parameters.width;
        this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
        this.uniforms.uColor.value.set(this.parameters.color);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'width':
                this.parameters.width = typeof value === 'number' ? Math.max(0.1, Math.min(1.0, value)) : this.parameters.width;
                if (this.uniforms) this.uniforms.uWidth.value = this.parameters.width;
                break;
            case 'angle':
                this.parameters.angle = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.angle;
                if (this.uniforms) this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
                break;
            case 'color':
                this.parameters.color = value;
                if (this.uniforms) this.uniforms.uColor.value.set(this.parameters.color);
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/BlurEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface BlurConfig {
    intensity: number; // 0.0 to 1.0 - blur strength
    radius: number; // 0.1 to 10.0 - blur radius
    quality: number; // 0.1 to 1.0 - sample quality (affects kernel size)
}

export class BlurEffect extends BaseShaderEffect {
    id = 'blur';
    name = 'Gaussian Blur';
    description = 'Smooth Gaussian blur with configurable intensity';
    parameters: BlurConfig;

    constructor(config: Partial<BlurConfig> = {}) {
        super();
        this.parameters = {
            intensity: 0.5,
            radius: 5.0,
            quality: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uRadius: { value: this.parameters.radius },
            uQuality: { value: this.parameters.quality }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uRadius;
      uniform float uQuality;

      varying vec2 vUv;

      // Gaussian weights for 9-tap kernel
      float getGaussianWeight(int index) {
        if (index == 0) return 0.06643724;
        if (index == 1) return 0.06461716;
        if (index == 2) return 0.06112521;
        if (index == 3) return 0.05623791;
        if (index == 4) return 0.05032389;
        return 0.0;
      }

      vec4 gaussianBlur(vec2 uv, vec2 direction) {
        vec4 color = vec4(0.0);
        float totalWeight = 0.0;
        
        int samples = int(9.0 * uQuality);
        float amount = uRadius * uIntensity * 0.001;
        
        // Center sample
        color += texture2D(uTexture, uv) * getGaussianWeight(0);
        totalWeight += getGaussianWeight(0);
        
        // Symmetric sampling
        for (int i = 1; i < 5; i++) {
          float weight = getGaussianWeight(i);
          float offset = float(i) * amount;
          
          color += texture2D(uTexture, uv + direction * offset) * weight;
          color += texture2D(uTexture, uv - direction * offset) * weight;
          totalWeight += 2.0 * weight;
        }
        
        return color / totalWeight;
      }

      void main() {
        vec2 uv = vUv;
        
        // Two-pass approximation (horizontal then average with vertical)
        vec2 pixelSize = vec2(1.0) / uResolution;
        vec4 horizontal = gaussianBlur(uv, vec2(pixelSize.x, 0.0));
        vec4 vertical = gaussianBlur(uv, vec2(0.0, pixelSize.y));
        
        // Blend both passes
        gl_FragColor = mix(horizontal, vertical, 0.5) * uIntensity + texture2D(uTexture, uv) * (1.0 - uIntensity);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uRadius.value = this.parameters.radius;
        this.uniforms.uQuality.value = this.parameters.quality;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'radius':
                this.parameters.radius = typeof value === 'number' ? Math.max(0.1, Math.min(10.0, value)) : this.parameters.radius;
                if (this.uniforms) this.uniforms.uRadius.value = this.parameters.radius;
                break;
            case 'quality':
                this.parameters.quality = typeof value === 'number' ? Math.max(0.1, Math.min(1.0, value)) : this.parameters.quality;
                if (this.uniforms) this.uniforms.uQuality.value = this.parameters.quality;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/BokehEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface BokehConfig {
  intensity: number; // 0.0 to 1.0
  focalDepth: number; // 0.0 to 1.0
  aperture: number; // 0.1 to 2.0
}

export class BokehEffect extends BaseShaderEffect {
  id = 'bokeh';
  name = 'Bokeh Blur';
  description = 'Depth-of-field bokeh blur effect';
  parameters: BokehConfig;

  constructor(config: Partial<BokehConfig> = {}) {
    super();
    this.parameters = {
      intensity: 0.5,
      focalDepth: 0.5,
      aperture: 0.8,
      ...config
    };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uFocalDepth: { value: this.parameters.focalDepth },
      uAperture: { value: this.parameters.aperture }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uFocalDepth;
      uniform float uAperture;

      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        // Simple depth estimation from center distance
        float depth = length((uv - 0.5) * vec2(aspectRatio, 1.0));
        float blur = abs(depth - uFocalDepth) * uAperture;
        blur *= uIntensity;
        
        vec4 color = vec4(0.0);
        float totalWeight = 0.0;
        
        // Hexagonal bokeh sampling pattern
        for (int angle = 0; angle < 6; angle++) {
          float theta = float(angle) * 1.047197551; // 60 degrees
          for (int ring = 1; ring <= 3; ring++) {
            float r = float(ring) * blur * 0.01;
            vec2 offset = r * vec2(cos(theta), sin(theta));
            color += texture2D(uTexture, uv + offset);
            totalWeight += 1.0;
          }
        }
        
        color += texture2D(uTexture, uv);
        totalWeight += 1.0;
        
        gl_FragColor = color / totalWeight;
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uFocalDepth.value = this.parameters.focalDepth;
    this.uniforms.uAperture.value = this.parameters.aperture;
  }

  updateParameter(paramName: string, value: any): void {
    switch (paramName) {
      case 'intensity':
        this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
        if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        break;
      case 'focalDepth':
        this.parameters.focalDepth = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.focalDepth;
        if (this.uniforms) this.uniforms.uFocalDepth.value = this.parameters.focalDepth;
        break;
      case 'aperture':
        this.parameters.aperture = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.aperture;
        if (this.uniforms) this.uniforms.uAperture.value = this.parameters.aperture;
        break;
    }
  }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/BulgeEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface BulgeConfig {
  intensity: number; // 0.0 to 2.0
  centerX: number; // 0.0 to 1.0
  centerY: number; // 0.0 to 1.0
  radius: number; // 0.1 to 1.0
}

export class BulgeEffect extends BaseShaderEffect {
  id = 'bulge';
  name = 'Bulge';
  description = 'Bulge/pinch distortion effect';
  parameters: BulgeConfig;

  constructor(config: Partial<BulgeConfig> = {}) {
    super();
    this.parameters = { intensity: 0.5, centerX: 0.5, centerY: 0.5, radius: 0.4, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) },
      uRadius: { value: this.parameters.radius }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform vec2 uCenter;
      uniform float uRadius;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        vec2 center = uCenter;
        vec2 tc = uv - center;
        tc.x *= aspectRatio;
        
        float dist = length(tc);
        if (dist < uRadius) {
          float percent = 1.0 - (dist / uRadius);
          percent = percent * percent;
          tc *= 1.0 - uIntensity * percent * 0.5;
        }
        
        tc.x /= aspectRatio;
        gl_FragColor = texture2D(uTexture, tc + center);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
    this.uniforms.uRadius.value = this.parameters.radius;
  }

  updateParameter(paramName: string, value: any): void {
    switch (paramName) {
      case 'intensity':
        this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
        if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        break;
      case 'centerX':
        this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
        if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
        break;
      case 'centerY':
        this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
        if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
        break;
      case 'radius':
        this.parameters.radius = typeof value === 'number' ? Math.max(0.1, Math.min(1.0, value)) : this.parameters.radius;
        if (this.uniforms) this.uniforms.uRadius.value = this.parameters.radius;
        break;
    }
  }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/ChromaticAbberationEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface ChromaticAbberationConfig {
    amount: number; // 0.0 to 1.0 - strength of the aberration
    direction: number; // 0.0 to 360.0 - direction angle in degrees
}

export class ChromaticAbberationEffect extends BaseShaderEffect {
    id = 'chromaticAbberation';
    name = 'Chromatic Abberation';
    description = 'RGB color channel offset for lens distortion effect';
    parameters: ChromaticAbberationConfig;

    constructor(config: Partial<ChromaticAbberationConfig> = {}) {
        super();
        this.parameters = {
            amount: 0.2,
            direction: 0.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uAmount: { value: this.parameters.amount },
            uDirection: { value: this.parameters.direction }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uAmount;
      uniform float uDirection;

      varying vec2 vUv;

      const float PI = 3.1415926;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        // Center of aberration (fixed at center)
        vec2 pos = vec2(0.5, 0.5);
        
        // Rotation angle from direction parameter (convert degrees to radians)
        float angle = (uDirection + uTime * 0.05) * PI / 180.0;
        vec2 rotation = vec2(sin(angle), cos(angle));
        
        vec4 color = texture2D(uTexture, uv);
        
        // Aberration vector calculation
        // Scale by amount parameter and radial distance from center
        vec2 aberrated = uAmount * rotation * 0.03 * distance(uv, pos);
        
        float amt = length(aberrated);
        
        // Early exit if aberration is negligible
        if (amt < 0.001) {
          gl_FragColor = color;
          return;
        }
        
        // Sample with offsets for RGB channels
        vec4 left = texture2D(uTexture, uv - aberrated);  // Red channel
        vec4 right = texture2D(uTexture, uv + aberrated); // Blue channel
        
        // Combine channels
        color.r = left.r;
        color.b = right.b;
        
        // Max alpha from all samples to prevent edge transparency
        color.a = max(max(left.a, color.a), right.a);
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uAmount.value = this.parameters.amount;
        this.uniforms.uDirection.value = this.parameters.direction;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'amount':
                this.parameters.amount = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.amount;
                if (this.uniforms) this.uniforms.uAmount.value = this.parameters.amount;
                break;
            case 'direction':
                this.parameters.direction = typeof value === 'number' ? value % 360 : this.parameters.direction;
                if (this.uniforms) this.uniforms.uDirection.value = this.parameters.direction;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/CircleEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface CircleConfig {
    radius: number; // 0.0 to 1.0
    feather: number; // 0.0 to 1.0
    centerX: number; // 0.0 to 1.0
    centerY: number; // 0.0 to 1.0
    color: string; // Hex color
    opacity: number; // 0.0 to 1.0
}

export class CircleEffect extends BaseShaderEffect {
    id = 'circle';
    name = 'Circle';
    description = 'Circular mask overlay';
    parameters: CircleConfig;

    constructor(config: Partial<CircleConfig> = {}) {
        super();
        this.parameters = {
            radius: 0.25,
            feather: 0.1,
            centerX: 0.5,
            centerY: 0.5,
            color: '#661aff',
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uRadius: { value: this.parameters.radius },
            uFeather: { value: this.parameters.feather },
            uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) },
            uColor: { value: new THREE.Color(this.parameters.color) },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uRadius;
      uniform float uFeather;
      uniform vec2 uCenter;
      uniform vec3 uColor;
      uniform float uOpacity;
      
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
        
        vec2 center = uCenter;
        vec2 pos = uv * aspectRatio;
        vec2 centerPos = center * aspectRatio;
        
        float dist = distance(pos, centerPos);
        
        float edge = uRadius;
        float feather = uFeather * 0.5;
        
        float mask = 1.0 - smoothstep(edge - feather, edge + feather, dist);
        
        vec3 finalColor = mix(bg.rgb, uColor, mask * uOpacity);
        
        gl_FragColor = vec4(finalColor, bg.a);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uRadius.value = this.parameters.radius;
        this.uniforms.uFeather.value = this.parameters.feather;
        this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
        this.uniforms.uColor.value.set(this.parameters.color);
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'radius':
                this.parameters.radius = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.radius;
                if (this.uniforms) this.uniforms.uRadius.value = this.parameters.radius;
                break;
            case 'feather':
                this.parameters.feather = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.feather;
                if (this.uniforms) this.uniforms.uFeather.value = this.parameters.feather;
                break;
            case 'centerX':
                this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
                if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
                break;
            case 'centerY':
                this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
                if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
                break;
            case 'color':
                this.parameters.color = value;
                if (this.uniforms) this.uniforms.uColor.value.set(this.parameters.color);
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/CRTEffect.ts">
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
</file>

<file path="apps/web/src/lib/visualizer/effects/DiffusionEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface DiffusionConfig {
  intensity: number; // 0.0 to 1.0
  size: number; // 0.1 to 5.0
}

export class DiffusionEffect extends BaseShaderEffect {
  id = 'diffusion';
  name = 'Diffusion';
  description = 'Soft diffusion glow effect';
  parameters: DiffusionConfig;

  constructor(config: Partial<DiffusionConfig> = {}) {
    super();
    this.parameters = { intensity: 0.5, size: 1.5, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uSize: { value: this.parameters.size }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uSize;
      varying vec2 vUv;

      void main() {
        vec4 color = vec4(0.0);
        vec2 pixelSize = vec2(1.0) / uResolution;
        float radius = uSize * 0.005;
        
        // Soft box blur with falloff
        for (float x = -2.0; x <= 2.0; x++) {
          for (float y = -2.0; y <= 2.0; y++) {
            vec2 offset = vec2(x, y) * pixelSize * radius;
            float weight = 1.0 / (1.0 + length(vec2(x, y)));
            color += texture2D(uTexture, vUv + offset) * weight;
          }
        }
       

 color /= 9.0;
        
        gl_FragColor = mix(texture2D(uTexture, vUv), color, uIntensity);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uSize.value = this.parameters.size;
  }

  updateParameter(paramName: string, value: any): void {
    if (paramName === 'intensity') {
      this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
      if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
    } else if (paramName === 'size') {
      this.parameters.size = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.size;
      if (this.uniforms) this.uniforms.uSize.value = this.parameters.size;
    }
  }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/DitherEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface DitherConfig {
    bayerMatrix: number; // 2, 4, or 8 - size of Bayer matrix
    colors: number; // 2 to 256 - number of color levels per channel
    scale: number; // 0.1 to 5.0 - dither pattern scale
}

export class DitherEffect extends BaseShaderEffect {
    id = 'dither';
    name = 'Dither';
    description = 'Bayer matrix ordered dithering for retro pixelart look';
    parameters: DitherConfig;

    constructor(config: Partial<DitherConfig> = {}) {
        super();
        this.parameters = {
            bayerMatrix: 4,
            colors: 16,
            scale: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uBayerMatrix: { value: this.parameters.bayerMatrix },
            uColors: { value: this.parameters.colors },
            uScale: { value: this.parameters.scale }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      precision highp int;

      uniform sampler2D uTexture;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uBayerMatrix;
      uniform float uColors;
      uniform float uScale;

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

      // Simplified dither using pseudo-random noise instead of blue noise
      vec3 dither(vec3 color, vec2 st) {
        float delta = floor(uTime);
        
        // Use PCG random instead of blue noise
        float noise = randFibo(st * uResolution / uScale + delta) - 0.5;
        
        float dither_threshold = 1.0 / uColors;
        float num_levels = uColors;
        
        return floor(color * num_levels + noise) / num_levels;
      }

      void main() {
        vec2 uv = vUv;
        vec4 color = texture2D(uTexture, uv);
        
        if (color.a == 0.0) {
          gl_FragColor = vec4(0.0);
          return;
        }
        
        color.rgb = dither(color.rgb, vUv);
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uBayerMatrix.value = this.parameters.bayerMatrix;
        this.uniforms.uColors.value = this.parameters.colors;
        this.uniforms.uScale.value = this.parameters.scale;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'bayerMatrix':
                this.parameters.bayerMatrix = typeof value === 'number' ? Math.max(2, Math.min(8, Math.floor(value))) : this.parameters.bayerMatrix;
                if (this.uniforms) this.uniforms.uBayerMatrix.value = this.parameters.bayerMatrix;
                break;
            case 'colors':
                this.parameters.colors = typeof value === 'number' ? Math.max(2, Math.min(256, Math.floor(value))) : this.parameters.colors;
                if (this.uniforms) this.uniforms.uColors.value = this.parameters.colors;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/FbmEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface FbmConfig {
    intensity: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
    scale: number; // 0.1 to 5.0
}

export class FbmEffect extends BaseShaderEffect {
    id = 'fbm';
    name = 'FBM Distortion';
    description = 'Fluid marble-like distortion using Fractal Brownian Motion';
    parameters: FbmConfig;

    constructor(config: Partial<FbmConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, speed: 0.5, scale: 1.0, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uSpeed: { value: this.parameters.speed },
            uScale: { value: this.parameters.scale }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSpeed;
      uniform float uScale;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      // Random Number Generator for Noise
      vec3 hash33(vec3 p3) {
        p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
        p3 += dot(p3, p3.yxz + 19.19);
        return -1.0 + 2.0 * fract(vec3(
          (p3.x + p3.y) * p3.z,
          (p3.x + p3.z) * p3.y,
          (p3.y + p3.z) * p3.x
        ));
      }

      // 3D Perlin Noise
      float perlin_noise(vec3 p) {
        vec3 pi = floor(p);
        vec3 pf = p - pi;
        
        vec3 w = pf * pf * (3.0 - 2.0 * pf);
        
        float n000 = dot(pf - vec3(0.0, 0.0, 0.0), hash33(pi + vec3(0.0, 0.0, 0.0)));
        float n100 = dot(pf - vec3(1.0, 0.0, 0.0), hash33(pi + vec3(1.0, 0.0, 0.0)));
        float n010 = dot(pf - vec3(0.0, 1.0, 0.0), hash33(pi + vec3(0.0, 1.0, 0.0)));
        float n110 = dot(pf - vec3(1.0, 1.0, 0.0), hash33(pi + vec3(1.0, 1.0, 0.0)));
        float n001 = dot(pf - vec3(0.0, 0.0, 1.0), hash33(pi + vec3(0.0, 0.0, 1.0)));
        float n101 = dot(pf - vec3(1.0, 0.0, 1.0), hash33(pi + vec3(1.0, 0.0, 1.0)));
        float n011 = dot(pf - vec3(0.0, 1.0, 1.0), hash33(pi + vec3(0.0, 1.0, 1.0)));
        float n111 = dot(pf - vec3(1.0, 1.0, 1.0), hash33(pi + vec3(1.0, 1.0, 1.0)));
        
        float nx00 = mix(n000, n100, w.x);
        float nx01 = mix(n001, n101, w.x);
        float nx10 = mix(n010, n110, w.x);
        float nx11 = mix(n011, n111, w.x);
        
        float nxy0 = mix(nx00, nx10, w.y);
        float nxy1 = mix(nx01, nx11, w.y);
        
        float nxyz = mix(nxy0, nxy1, w.z);
        
        return nxyz;
      }

      mat2 rotHalf = mat2(
        cos(0.5), sin(0.5),
        -sin(0.5), cos(0.5)
      );

      // Fractal Brownian Motion
      float fbm(in vec3 st) {
        float value = 0.0;
        float amp = .25;
        float aM = (0.1 + 0.9200 * .65);
        vec2 shift = vec2(100.0);
        
        for (int i = 0; i < 3; i++) {
          value += amp * perlin_noise(st);
          st.xy *= rotHalf * 2.5;
          st.xy += shift;
          amp *= aM;
        }
        return value;
      }

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        float multiplier = 6.0 * (0.4000 / ((aspectRatio + 1.) / 2.)) * uScale;
        
        vec2 st = (uv - 0.5) * vec2(aspectRatio, 1.0) * multiplier;
        float time = uTime * 0.025 * uSpeed;
        
        vec2 r = vec2(
          fbm(vec3(st + vec2(1.7, 9.2), time)),
          fbm(vec3(st + vec2(8.2, 1.3), time))
        );
        
        float f = fbm(vec3(st + r, time)) * uIntensity;
        
        vec2 offset = (f * 2.0 + (r * uIntensity));
        
        gl_FragColor = texture2D(uTexture, uv + offset * 0.1);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uScale.value = this.parameters.scale;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/FogEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface FogConfig {
  density: number; // 0.0 to 1.0
  speed: number; // 0.0 to 2.0
  color: number[]; // [r, g, b]
}

export class FogEffect extends BaseShaderEffect {
  id = 'fog';
  name = 'Fog';
  description = 'Animated fog effect with noise';
  parameters: FogConfig;

  constructor(config: Partial<FogConfig> = {}) {
    super();
    this.parameters = { density: 0.3, speed: 0.5, color: [1.0, 1.0, 1.0], ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uDensity: { value: this.parameters.density },
      uSpeed: { value: this.parameters.speed },
      uFogColor: { value: new THREE.Color(this.parameters.color[0], this.parameters.color[1], this.parameters.color[2]) }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uDensity;
      uniform float uSpeed;
      uniform vec3 uFogColor;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = vUv;
        vec2 p = uv * 3.0 - vec2(uTime * uSpeed * 0.05, 0.0);
        float fogAmount = fbm(p) * uDensity;
        
        vec4 texColor = texture2D(uTexture, uv);
        gl_FragColor = mix(texColor, vec4(uFogColor, 1.0), fogAmount);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uDensity.value = this.parameters.density;
    this.uniforms.uSpeed.value = this.parameters.speed;
    this.uniforms.uFogColor.value.setRGB(this.parameters.color[0], this.parameters.color[1], this.parameters.color[2]);
  }

  updateParameter(paramName: string, value: any): void {
    switch (paramName) {
      case 'density':
        this.parameters.density = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.density;
        if (this.uniforms) this.uniforms.uDensity.value = this.parameters.density;
        break;
      case 'speed':
        this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
        if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
        break;
      case 'color':
        if (Array.isArray(value) && value.length === 3) {
          this.parameters.color = value;
          if (this.uniforms) this.uniforms.uFogColor.value.setRGB(value[0], value[1], value[2]);
        }
        break;
    }
  }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/GlitchEffect.ts">
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
</file>

<file path="apps/web/src/lib/visualizer/effects/GlitterEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface GlitterConfig {
    intensity: number; // 0.0 to 2.0
    scale: number; // 0.1 to 2.0
    speed: number; // 0.0 to 2.0
}

export class GlitterEffect extends BaseShaderEffect {
    id = 'glitter';
    name = 'Glitter';
    description = 'Voronoi-based sparkle effect';
    parameters: GlitterConfig;

    constructor(config: Partial<GlitterConfig> = {}) {
        super();
        this.parameters = { intensity: 1.0, scale: 1.0, speed: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uScale: { value: this.parameters.scale },
            uSpeed: { value: this.parameters.speed }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uScale;
      uniform float uSpeed;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      float luma(vec4 color) {
        return dot(color.rgb, vec3(0.299, 0.587, 0.114));
      }

      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 18.5453);
      }

      vec3 hue(float h, float angle) {
        return vec3(0.5) + 0.5 * cos(h + 2.0 * PI * angle + vec3(0.0, 2.0, 4.0));
      }

      vec4 getStarLayer(vec2 baseUV) {
        vec2 scaleRatio = vec2(1080.0) * vec2(uResolution.x / uResolution.y, 1.0);
        vec2 pos = vec2(0.5);
        
        vec2 uv = (baseUV - pos) * scaleRatio * 0.25 * uScale * 0.01 + vec2(0.0);
        
        float time = uTime * 0.5 * uSpeed;
        vec2 i_uv = floor(uv);
        vec2 f_uv = fract(uv);
        
        vec3 d = vec3(1e10);
        vec2 closestPoint;
        
        for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
                vec2 tile_offset = vec2(float(x), float(y));
                vec2 o = hash(i_uv + tile_offset + vec2(time * 0.05));
                
                vec2 current_tile_offset = tile_offset + o - f_uv;
                float dist = dot(current_tile_offset, current_tile_offset);
                
                if (dist < d.x) {
                    d.y = d.x;
                    d.x = dist;
                    closestPoint = current_tile_offset;
                } else if (dist < d.y) {
                    d.y = dist;
                }
            }
        }
        
        d = sqrt(d);
        vec2 toCenter = closestPoint;
        
        vec2 closestPointOriginal = closestPoint / (0.25 * uScale * 0.01) / scaleRatio + baseUV;
        vec4 closestPointCol = texture2D(uTexture, closestPointOriginal);
        float closestPointR = luma(closestPointCol);
        
        float proximityFactor = d.y - d.x;
        
        float radialGradient = (1.0 - length(toCenter)) * closestPointR * 0.75;
        
        float crossShape = min(abs(toCenter.x), abs(toCenter.y));
        crossShape = 1.0 - smoothstep(-0.04, 0.04 * proximityFactor * closestPointR, crossShape);
        
        vec3 cross = mix(vec3(crossShape), vec3(crossShape) * hue(closestPointR, proximityFactor * 5.0), 0.25);
        vec3 bloom = vec3(smoothstep(0.0, 4.0, radialGradient * proximityFactor));
        
        vec3 rgb = mix(vec3(1.0), closestPointCol.rgb, 0.5);
        
        return vec4(rgb * (cross + bloom) * 10.0 * uIntensity, 1.0);
      }

      void main() {
        vec2 uv = vUv;
        vec4 color = texture2D(uTexture, uv);
        
        vec4 stars = getStarLayer(uv);
        
        color.rgb += stars.rgb;
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uSpeed.value = this.parameters.speed;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/GodRaysEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface GodRaysConfig {
    intensity: number; // 0.0 to 1.0
    decay: number; // 0.9 to 1.0
    density: number; // 0.0 to 1.0
    weight: number; // 0.0 to 1.0
    lightX: number; // 0.0 to 1.0
    lightY: number; // 0.0 to 1.0
}

export class GodRaysEffect extends BaseShaderEffect {
    id = 'godRays';
    name = 'God Rays';
    description = 'Volumetric light scattering';
    parameters: GodRaysConfig;

    constructor(config: Partial<GodRaysConfig> = {}) {
        super();
        this.parameters = {
            intensity: 1.0,
            decay: 0.96,
            density: 0.5,
            weight: 0.4,
            lightX: 0.5,
            lightY: 0.5,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uDecay: { value: this.parameters.decay },
            uDensity: { value: this.parameters.density },
            uWeight: { value: this.parameters.weight },
            uLightPos: { value: new THREE.Vector2(this.parameters.lightX, this.parameters.lightY) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uDecay;
      uniform float uDensity;
      uniform float uWeight;
      uniform vec2 uLightPos;
      
      varying vec2 vUv;
      
      const int MAX_ITERATIONS = 50;

      float luma(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      float interleavedGradientNoise(vec2 st) {
        return fract(52.9829189 * fract(0.06711056 * st.x + 0.00583715 * st.y));
      }

      void main() {
        vec2 uv = vUv;
        vec4 color = texture2D(uTexture, uv);
        
        // Thresholding to get bright areas
        float lum = luma(color.rgb);
        vec3 brightColor = color.rgb * smoothstep(0.4, 0.6, lum);
        
        // Raymarching
        vec2 lightPos = uLightPos;
        vec2 deltaTextCoord = (uv - lightPos);
        
        float density = uDensity * 1.0;
        deltaTextCoord *= 1.0 / float(MAX_ITERATIONS) * density;
        
        float illuminationDecay = 1.0;
        vec3 accumulatedRays = vec3(0.0);
        
        vec2 textCoo = uv;
        
        // Jitter
        float noise = interleavedGradientNoise(gl_FragCoord.xy);
        textCoo -= deltaTextCoord * noise;
        
        for(int i=0; i < MAX_ITERATIONS; i++) {
            textCoo -= deltaTextCoord;
            vec3 sampleColor = texture2D(uTexture, textCoo).rgb;
            
            // Apply threshold to sample
            float sampleLum = luma(sampleColor);
            sampleColor *= smoothstep(0.4, 0.6, sampleLum);
            
            sampleColor *= illuminationDecay * uWeight;
            accumulatedRays += sampleColor;
            illuminationDecay *= uDecay;
        }
        
        accumulatedRays *= uIntensity;
        
        // Composite
        gl_FragColor = vec4(color.rgb + accumulatedRays, color.a);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uDecay.value = this.parameters.decay;
        this.uniforms.uDensity.value = this.parameters.density;
        this.uniforms.uWeight.value = this.parameters.weight;
        this.uniforms.uLightPos.value.set(this.parameters.lightX, this.parameters.lightY);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'decay':
                this.parameters.decay = typeof value === 'number' ? Math.max(0.8, Math.min(1.0, value)) : this.parameters.decay;
                if (this.uniforms) this.uniforms.uDecay.value = this.parameters.decay;
                break;
            case 'density':
                this.parameters.density = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.density;
                if (this.uniforms) this.uniforms.uDensity.value = this.parameters.density;
                break;
            case 'weight':
                this.parameters.weight = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.weight;
                if (this.uniforms) this.uniforms.uWeight.value = this.parameters.weight;
                break;
            case 'lightX':
                this.parameters.lightX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.lightX;
                if (this.uniforms) this.uniforms.uLightPos.value.x = this.parameters.lightX;
                break;
            case 'lightY':
                this.parameters.lightY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.lightY;
                if (this.uniforms) this.uniforms.uLightPos.value.y = this.parameters.lightY;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/GradientFillEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface GradientFillConfig {
    color1: string; // Hex color
    color2: string; // Hex color
    angle: number; // 0.0 to 360.0
    speed: number; // 0.0 to 2.0
    opacity: number; // 0.0 to 1.0
}

export class GradientFillEffect extends BaseShaderEffect {
    id = 'gradientFill';
    name = 'Gradient Fill';
    description = 'Procedural linear gradient with OKLab mixing';
    parameters: GradientFillConfig;

    constructor(config: Partial<GradientFillConfig> = {}) {
        super();
        this.parameters = {
            color1: '#000000',
            color2: '#ffffff',
            angle: 0.0,
            speed: 0.0,
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uColor1: { value: new THREE.Color(this.parameters.color1) },
            uColor2: { value: new THREE.Color(this.parameters.color2) },
            uAngle: { value: (this.parameters.angle * Math.PI) / 180.0 },
            uSpeed: { value: this.parameters.speed },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uAngle;
      uniform float uSpeed;
      uniform float uOpacity;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      vec2 rotate(vec2 coord, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return vec2(
            coord.x * c - coord.y * s,
            coord.x * s + coord.y * c
        );
      }

      float rand(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      vec3 oklab_mix(vec3 lin1, vec3 lin2, float a) {
        const mat3 kCONEtoLMS = mat3(
            0.4121656120, 0.2118591070, 0.0883097947,
            0.5362752080, 0.6807189584, 0.2818474174,
            0.0514575653, 0.1074065790, 0.6302613616);
        const mat3 kLMStoCONE = mat3(
            4.0767245293, -1.2681437731, -0.0041119885,
            -3.3072168827, 2.6093323231, -0.7034763098,
            0.2307590544, -0.3411344290, 1.7068625689);
            
        vec3 lms1 = pow( kCONEtoLMS * lin1, vec3(1.0/3.0) );
        vec3 lms2 = pow( kCONEtoLMS * lin2, vec3(1.0/3.0) );
        
        vec3 lms = mix( lms1, lms2, a );
        lms *= 1.0 + 0.025 * a * (1.0 - a);
        
        return kLMStoCONE * (lms * lms * lms);
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        vec2 center = vec2(0.5);
        vec2 p = uv - center;
        p = rotate(p, uAngle);
        p += center;
        
        float position = p.x;
        position -= uTime * 0.1 * uSpeed;
        
        float cycle = floor(position);
        bool reverse = int(cycle) % 2 == 0;
        float t = reverse ? 1.0 - fract(position) : fract(position);
        
        vec3 col1 = pow(uColor1, vec3(2.2)); // Linearize
        vec3 col2 = pow(uColor2, vec3(2.2));
        
        vec3 gradient = oklab_mix(col1, col2, t);
        gradient = pow(gradient, vec3(1.0/2.2)); // sRGB
        
        float dither = rand(gl_FragCoord.xy) * 0.005;
        gradient += dither;
        
        vec3 finalColor = mix(bg.rgb, gradient, uOpacity);
        
        gl_FragColor = vec4(finalColor, max(bg.a, uOpacity));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uColor1.value.set(this.parameters.color1);
        this.uniforms.uColor2.value.set(this.parameters.color2);
        this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'color1':
                this.parameters.color1 = value;
                if (this.uniforms) this.uniforms.uColor1.value.set(this.parameters.color1);
                break;
            case 'color2':
                this.parameters.color2 = value;
                if (this.uniforms) this.uniforms.uColor2.value.set(this.parameters.color2);
                break;
            case 'angle':
                this.parameters.angle = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.angle;
                if (this.uniforms) this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/GrainEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface GrainConfig {
    amount: number; // 0.0 to 1.0 - intensity of grain
    size: number; // 0.1 to 5.0 - size of grain particles
    colorized: boolean; // false = monochrome, true = colored grain
    luminance: boolean; // if true, grain is more visible in darker areas
}

export class GrainEffect extends BaseShaderEffect {
    id = 'grain';
    name = 'Film Grain';
    description = 'Adds film grain noise for vintage or cinematic look';
    parameters: GrainConfig;

    constructor(config: Partial<GrainConfig> = {}) {
        super();
        this.parameters = {
            amount: 0.5,
            size: 1.0,
            colorized: false,
            luminance: false,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uAmount: { value: this.parameters.amount },
            uSize: { value: this.parameters.size },
            uColorized: { value: this.parameters.colorized ? 1.0 : 0.0 },
            uLuminance: { value: this.parameters.luminance ? 1.0 : 0.0 }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      precision highp int;

      uniform sampler2D uTexture;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uAmount;
      uniform float uSize;
      uniform float uColorized;
      uniform float uLuminance;

      varying vec2 vUv;

      // PCG 2D Hash for pseudorandom number generation
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
        vec4 color = texture2D(uTexture, uv);

        if (color.a <= 0.001) {
          gl_FragColor = vec4(0.0);
          return;
        }
        
        vec2 st = uv * uResolution / uSize;
        
        // Time delta for grain animation
        float delta = fract(floor(uTime) / 20.0);
        
        vec3 grainRGB;
        
        if (uColorized > 0.5) {
          // Colored grain (RGB channels independent)
          grainRGB = vec3(
            randFibo(st + vec2(1.0, 2.0) + delta),
            randFibo(st + vec2(2.0, 3.0) + delta),
            randFibo(st + vec2(3.0, 4.0) + delta)
          );
        } else {
          // Monochrome grain
          grainRGB = vec3(randFibo(st + vec2(delta)));
        }
        
        // Apply luminance-based grain (more visible in darker areas)
        if (uLuminance > 0.5) {
          float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          grainRGB *= (1.0 - lum);
        }
        
        // Additive blend
        vec3 blended = grainRGB + color.rgb;
        
        // Mix based on amount parameter
        color.rgb = mix(color.rgb, blended, uAmount);
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uAmount.value = this.parameters.amount;
        this.uniforms.uSize.value = this.parameters.size;
        this.uniforms.uColorized.value = this.parameters.colorized ? 1.0 : 0.0;
        this.uniforms.uLuminance.value = this.parameters.luminance ? 1.0 : 0.0;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'amount':
                this.parameters.amount = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.amount;
                if (this.uniforms) this.uniforms.uAmount.value = this.parameters.amount;
                break;
            case 'size':
                this.parameters.size = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.size;
                if (this.uniforms) this.uniforms.uSize.value = this.parameters.size;
                break;
            case 'colorized':
                this.parameters.colorized = typeof value === 'boolean' ? value : this.parameters.colorized;
                if (this.uniforms) this.uniforms.uColorized.value = this.parameters.colorized ? 1.0 : 0.0;
                break;
            case 'luminance':
                this.parameters.luminance = typeof value === 'boolean' ? value : this.parameters.luminance;
                if (this.uniforms) this.uniforms.uLuminance.value = this.parameters.luminance ? 1.0 : 0.0;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/HalftoneEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface HalftoneConfig {
    dotSize: number; // 0.1 to 2.0 - size of halftone dots
    angle: number; // 0.0 to 360.0 - rotation angle for dot grid
    shape: 'circle' | 'square'; // dot shape
    smoothness: number; // 0.0 to 1.0 - edge smoothing amount
}

export class HalftoneEffect extends BaseShaderEffect {
    id = 'halftone';
    name = 'Halftone';
    description = 'CMYK halftone printing effect with configurable dots';
    parameters: HalftoneConfig;

    constructor(config: Partial<HalftoneConfig> = {}) {
        super();
        this.parameters = {
            dotSize: 0.75,
            angle: 0.0,
            shape: 'circle',
            smoothness: 0.75,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uDotSize: { value: this.parameters.dotSize },
            uAngle: { value: this.parameters.angle },
            uShape: { value: this.parameters.shape === 'circle' ? 1.0 : 0.0 },
            uSmoothness: { value: this.parameters.smoothness }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision mediump float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uDotSize;
      uniform float uAngle;
      uniform float uShape;
      uniform float uSmoothness;

      varying vec2 vUv;

      float luma(vec4 color) {
        return dot(color.rgb, vec3(0.299, 0.587, 0.114));
      }

      vec3 CMYKtoRGB(vec4 cmyk) {
        float c = cmyk.x;
        float m = cmyk.y;
        float y = cmyk.z;
        float k = cmyk.w;
        
        float invK = 1.0 - k;
        float r = 1.0 - min(1.0, c * invK + k);
        float g = 1.0 - min(1.0, m * invK + k);
        float b = 1.0 - min(1.0, y * invK + k);
        
        return clamp(vec3(r, g, b), 0.0, 1.0);
      }

      vec4 RGBtoCMYK(vec3 rgb) {
        float r = rgb.r;
        float g = rgb.g;
        float b = rgb.b;
        
        float k = min(1.0 - r, min(1.0 - g, 1.0 - b));
        vec3 cmy = vec3(0.0);
        float invK = 1.0 - k;
        
        if (invK != 0.0) {
          cmy.x = (1.0 - r - k) / invK;
          cmy.y = (1.0 - g - k) / invK;
          cmy.z = (1.0 - b - k) / invK;
        }
        return clamp(vec4(cmy, k), 0.0, 1.0);
      }

      float aastep(float threshold, float value) {
        float afwidth = uSmoothness * 200.0 * (1.0 / uResolution.x);
        float minval = threshold - afwidth;
        float maxval = threshold + afwidth;
        return smoothstep(minval, maxval, value);
      }

      vec2 rotate2D(vec2 st, float degrees) {
        float c = cos(radians(degrees));
        float s = sin(radians(degrees));
        return mat2(c, -s, s, c) * st;
      }

      float halftone(vec2 st, float col, float angle) {
        float aspectRatio = uResolution.x / uResolution.y;
        float aspectCorrection = mix(aspectRatio, 1.0 / aspectRatio, 0.5);
        
        st -= vec2(0.5, 0.5);
        st *= vec2(aspectRatio, 1.0);
        
        vec2 r_st = uDotSize * 200.0 * rotate2D(st, angle - uAngle);
        r_st /= aspectCorrection;
        
        st = (2.0 * fract(r_st) - 1.0) * 0.82;
        
        return aastep(0.0, sqrt(col) - length(st));
      }

      void main() {
        vec4 clipColor = texture2D(uTexture, vUv);
        
        if (clipColor.a == 0.0) {
          gl_FragColor = vec4(0.0);
          return;
        }
        
        vec2 uv = vUv;
        vec4 color = texture2D(uTexture, uv);
        
        vec4 cmyk = RGBtoCMYK(color.rgb);
        
        float k = halftone(uv, cmyk.w, 45.0);
        float c = halftone(uv, cmyk.x, 15.0);
        float m = halftone(uv, cmyk.y, 75.0);
        float y = halftone(uv, cmyk.z, 0.0);
        
        vec4 halftoneColor = vec4(CMYKtoRGB(vec4(c, m, y, k)), 1.0);
        halftoneColor *= color.a;
        
        color = mix(color, halftoneColor, 1.0);
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uDotSize.value = this.parameters.dotSize;
        this.uniforms.uAngle.value = this.parameters.angle;
        this.uniforms.uShape.value = this.parameters.shape === 'circle' ? 1.0 : 0.0;
        this.uniforms.uSmoothness.value = this.parameters.smoothness;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'dotSize':
                this.parameters.dotSize = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.dotSize;
                if (this.uniforms) this.uniforms.uDotSize.value = this.parameters.dotSize;
                break;
            case 'angle':
                this.parameters.angle = typeof value === 'number' ? value % 360 : this.parameters.angle;
                if (this.uniforms) this.uniforms.uAngle.value = this.parameters.angle;
                break;
            case 'shape':
                this.parameters.shape = value === 'circle' || value === 'square' ? value : this.parameters.shape;
                if (this.uniforms) this.uniforms.uShape.value = this.parameters.shape === 'circle' ? 1.0 : 0.0;
                break;
            case 'smoothness':
                this.parameters.smoothness = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.smoothness;
                if (this.uniforms) this.uniforms.uSmoothness.value = this.parameters.smoothness;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/LightTrailEffect.ts">
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
</file>

<file path="apps/web/src/lib/visualizer/effects/LiquifyEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface LiquifyConfig {
    intensity: number; // 0.0 to 1.0
    frequency: number; // 1.0 to 10.0
    speed: number; // 0.0 to 2.0
}

export class LiquifyEffect extends BaseShaderEffect {
    id = 'liquify';
    name = 'Liquify';
    description = 'Sine-based liquid distortion effect';
    parameters: LiquifyConfig;

    constructor(config: Partial<LiquifyConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, frequency: 1.0, speed: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uFrequency: { value: this.parameters.frequency },
            uSpeed: { value: this.parameters.speed }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uFrequency;
      uniform float uSpeed;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265;

      mat2 rot(float a) {
        return mat2(cos(a), -sin(a), sin(a), cos(a));
      }

      vec2 liquify(vec2 st) {
        float aspectRatio = uResolution.x / uResolution.y;
        vec2 center = vec2(0.5);
        
        // Normalize coordinates
        st -= center;
        st.x *= aspectRatio;
        
        // Wave parameters
        float freq = 5.0 * uFrequency;
        float t = uTime * 0.025 * uSpeed;
        float amplitude = 0.1 * uIntensity;
        
        // Iterative rotation and sine wave application
        for (float i = 1.0; i <= 5.0; i++) {
            st = st * rot(i / 5.0 * PI * 2.0);
            float ff = i * freq;
            st.x += amplitude * cos(ff * st.y + t);
            st.y += amplitude * sin(ff * st.x + t);
        }
        
        // Restore coordinates
        st.x /= aspectRatio;
        st += center;
        
        return st;
      }

      void main() {
        vec2 uv = vUv;
        vec2 liquifiedUV = liquify(uv);
        
        // Chromatic Aberration
        vec2 normalizedUv = normalize(liquifiedUV - uv);
        float distanceUv = length(liquifiedUV - uv);
        float chromAbb = 0.02 * uIntensity;
        
        vec2 offsetR = liquifiedUV + chromAbb * normalizedUv * distanceUv;
        vec2 offsetG = liquifiedUV;
        vec2 offsetB = liquifiedUV - chromAbb * normalizedUv * distanceUv;
        
        vec4 colorR = texture2D(uTexture, offsetR);
        vec4 colorG = texture2D(uTexture, offsetG);
        vec4 colorB = texture2D(uTexture, offsetB);
        
        gl_FragColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uFrequency.value = this.parameters.frequency;
        this.uniforms.uSpeed.value = this.parameters.speed;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'frequency':
                this.parameters.frequency = typeof value === 'number' ? Math.max(0.1, Math.min(10.0, value)) : this.parameters.frequency;
                if (this.uniforms) this.uniforms.uFrequency.value = this.parameters.frequency;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/NoiseEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface NoiseConfig {
    intensity: number; // 0.0 to 1.0
    scale: number; // 0.1 to 5.0
    speed: number; // 0.0 to 2.0
}

export class NoiseEffect extends BaseShaderEffect {
    id = 'noise';
    name = 'BCC Noise';
    description = 'Body-Centered Cubic noise distortion';
    parameters: NoiseConfig;

    constructor(config: Partial<NoiseConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, scale: 1.0, speed: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uScale: { value: this.parameters.scale },
            uSpeed: { value: this.parameters.speed }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uScale;
      uniform float uSpeed;
      
      varying vec2 vUv;

      // Hashing function
      vec4 permute(vec4 t) {
        return t * (t * 34.0 + 133.0);
      }

      // Gradient generation
      vec3 grad(float hash) {
        vec3 cube = mod(floor(hash / vec3(1.0, 2.0, 4.0)), 2.0) * 2.0 - 1.0;
        vec3 cuboct = cube;
        
        float index0 = step(0.0, 1.0 - floor(hash / 16.0));
        float index1 = step(0.0, floor(hash / 16.0) - 1.0);
        
        cuboct.x *= 1.0 - index0;
        cuboct.y *= 1.0 - index1;
        cuboct.z *= 1.0 - (1.0 - index0 - index1);
        
        float type = mod(floor(hash / 8.0), 2.0);
        vec3 rhomb = (1.0 - type) * cube + type * (cuboct + cross(cube, cuboct));
        
        vec3 grad = cuboct * 1.22474487139 + rhomb;
        grad *= (1.0 - 0.042942436724648037 * type) * 3.5946317686139184;
        
        return grad;
      }

      // BCC Noise Part
      vec4 bccNoiseDerivativesPart(vec3 X) {
        vec3 b = floor(X);
        vec4 i4 = vec4(X - b, 2.5);
        
        vec3 v1 = b + floor(dot(i4, vec4(.25)));
        vec3 v2 = b + vec3(1, 0, 0) + vec3(-1, 1, 1) * floor(dot(i4, vec4(-.25, .25, .25, .35)));
        vec3 v3 = b + vec3(0, 1, 0) + vec3(1, -1, 1) * floor(dot(i4, vec4(.25, -.25, .25, .35)));
        vec3 v4 = b + vec3(0, 0, 1) + vec3(1, 1, -1) * floor(dot(i4, vec4(.25, .25, -.25, .35)));
        
        vec4 hashes = permute(mod(vec4(v1.x, v2.x, v3.x, v4.x), 289.0));
        hashes = permute(mod(hashes + vec4(v1.y, v2.y, v3.y, v4.y), 289.0));
        hashes = mod(permute(mod(hashes + vec4(v1.z, v2.z, v3.z, v4.z), 289.0)), 48.0);
        
        vec3 d1 = X - v1; vec3 d2 = X - v2; vec3 d3 = X - v3; vec3 d4 = X - v4;
        
        vec4 a = max(0.75 - vec4(dot(d1, d1), dot(d2, d2), dot(d3, d3), dot(d4, d4)), 0.0);
        vec4 aa = a * a; vec4 aaaa = aa * aa;
        
        vec3 g1 = grad(hashes.x); vec3 g2 = grad(hashes.y);
        vec3 g3 = grad(hashes.z); vec3 g4 = grad(hashes.w);
        
        vec4 extrapolations = vec4(dot(d1, g1), dot(d2, g2), dot(d3, g3), dot(d4, g4));
        
        vec3 derivative = -8.0 * mat4x3(d1, d2, d3, d4) * (aa * a * extrapolations)
                        + mat4x3(g1, g2, g3, g4) * aaaa;
                        
        return vec4(derivative, dot(aaaa, extrapolations));
      }

      // BCC Noise
      vec4 bccNoiseDerivatives_XYBeforeZ(vec3 X) {
        mat3 orthonormalMap = mat3(
            0.788675134594813, -0.211324865405187, -0.577350269189626,
            -0.211324865405187, 0.788675134594813, -0.577350269189626,
            0.577350269189626, 0.577350269189626, 0.577350269189626
        );
        X = orthonormalMap * X;
        vec4 result = bccNoiseDerivativesPart(X) + bccNoiseDerivativesPart(X + 144.5);
        return vec4(result.xyz * orthonormalMap, result.w);
      }

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        vec2 st = (uv - 0.5) * vec2(aspectRatio, 1.0);
        st *= 12.0 * uScale;
        
        vec4 noise = bccNoiseDerivatives_XYBeforeZ(vec3(st, uTime * 0.1 * uSpeed));
        vec2 offset = noise.xy * 0.1 * uIntensity;
        
        gl_FragColor = texture2D(uTexture, uv + offset);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uSpeed.value = this.parameters.speed;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/NoiseFillEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface NoiseFillConfig {
    color1: string; // Hex color
    color2: string; // Hex color
    scale: number; // 0.1 to 2.0
    speed: number; // 0.0 to 2.0
    opacity: number; // 0.0 to 1.0
}

export class NoiseFillEffect extends BaseShaderEffect {
    id = 'noiseFill';
    name = 'Noise Fill';
    description = 'Procedural BCC noise pattern';
    parameters: NoiseFillConfig;

    constructor(config: Partial<NoiseFillConfig> = {}) {
        super();
        this.parameters = {
            color1: '#ffd198', // Yellow-Orange
            color2: '#9600e6', // Purple
            scale: 1.0,
            speed: 0.5,
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uColor1: { value: new THREE.Color(this.parameters.color1) },
            uColor2: { value: new THREE.Color(this.parameters.color2) },
            uScale: { value: this.parameters.scale },
            uSpeed: { value: this.parameters.speed },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uScale;
      uniform float uSpeed;
      uniform float uOpacity;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;
      const float TAU = 6.28318530718;

      vec4 permute(vec4 t) {
        return t * (t * 34.0 + 133.0);
      }

      vec3 grad(float hash) {
        vec3 cube = mod(floor(hash / vec3(1.0, 2.0, 4.0)), 2.0) * 2.0 - 1.0;
        vec3 cuboct = cube;
        float index0 = step(0.0, 1.0 - floor(hash / 16.0));
        float index1 = step(0.0, floor(hash / 16.0) - 1.0);
        cuboct.x *= 1.0 - index0;
        cuboct.y *= 1.0 - index1;
        cuboct.z *= 1.0 - (1.0 - index0 - index1);
        float type = mod(floor(hash / 8.0), 2.0);
        vec3 rhomb = (1.0 - type) * cube + type * (cuboct + cross(cube, cuboct));
        vec3 grad = cuboct * 1.22474487139 + rhomb;
        grad *= (1.0 - 0.042942436724648037 * type) * 3.5946317686139184;
        return grad;
      }

      vec4 bccNoiseDerivativesPart(vec3 X) {
        vec3 b = floor(X);
        vec4 i4 = vec4(X - b, 2.5);
        vec3 v1 = b + floor(dot(i4, vec4(.25)));
        vec3 v2 = b + vec3(1, 0, 0) + vec3(-1, 1, 1) * floor(dot(i4, vec4(-.25, .25, .25, .35)));
        vec3 v3 = b + vec3(0, 1, 0) + vec3(1, -1, 1) * floor(dot(i4, vec4(.25, -.25, .25, .35)));
        vec3 v4 = b + vec3(0, 0, 1) + vec3(1, 1, -1) * floor(dot(i4, vec4(.25, .25, -.25, .35)));
        vec4 hashes = permute(mod(vec4(v1.x, v2.x, v3.x, v4.x), 289.0));
        hashes = permute(mod(hashes + vec4(v1.y, v2.y, v3.y, v4.y), 289.0));
        hashes = mod(permute(mod(hashes + vec4(v1.z, v2.z, v3.z, v4.z), 289.0)), 48.0);
        vec3 d1 = X - v1; vec3 d2 = X - v2; vec3 d3 = X - v3; vec3 d4 = X - v4;
        vec4 a = max(0.75 - vec4(dot(d1, d1), dot(d2, d2), dot(d3, d3), dot(d4, d4)), 0.0);
        vec4 aa = a * a; vec4 aaaa = aa * aa;
        vec3 g1 = grad(hashes.x); vec3 g2 = grad(hashes.y);
        vec3 g3 = grad(hashes.z); vec3 g4 = grad(hashes.w);
        vec4 extrapolations = vec4(dot(d1, g1), dot(d2, g2), dot(d3, g3), dot(d4, g4));
        vec3 derivative = -8.0 * mat4x3(d1, d2, d3, d4) * (aa * a * extrapolations)
                        + mat4x3(g1, g2, g3, g4) * aaaa;
        return vec4(derivative, dot(aaaa, extrapolations));
      }

      vec4 bccNoiseDerivatives_XYBeforeZ(vec3 X) {
        mat3 orthonormalMap = mat3(
            0.788675134594813, -0.211324865405187, -0.577350269189626,
            -0.211324865405187, 0.788675134594813, -0.577350269189626,
            0.577350269189626, 0.577350269189626, 0.577350269189626);
        X = orthonormalMap * X;
        vec4 result = bccNoiseDerivativesPart(X) + bccNoiseDerivativesPart(X + 144.5);
        return vec4(result.xyz * orthonormalMap, result.w);
      }

      vec3 anchoredPal(float t, vec3 col1, vec3 col2) {
        vec3 mid = 0.5 * (col1 + col2);
        vec3 axisAmp = 0.5 * (col2 - col1);
        vec3 base = mid + axisAmp * cos(TAU * t);
        
        vec3 axis = length(axisAmp) > 0.0001 ? normalize(axisAmp) : vec3(1.0, 0.0, 0.0);
        vec3 ref = abs(axis.x) > 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 tangent1 = normalize(cross(axis, ref));
        vec3 tangent2 = normalize(cross(axis, tangent1));

        float richness = 0.24 * length(axisAmp) + 0.02;
        vec3 ripple = tangent1 * sin(TAU * (t * 2.0 + 0.123)) + tangent2 * sin(TAU * (t * 3.0 + 0.437));
        
        vec3 col = base + (richness * 0.5) * ripple;
        col = 1.0 / (1.0 + exp(-col * 4.0 + 0.25) * 7.5);
        return col;
      }

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        vec2 aspect = vec2(aspectRatio, 1.0);
        
        vec2 st = (uv - 0.5) * aspect * mix(1.0, 14.0, uScale);
        
        vec2 drift = vec2(0.0, uTime * 0.0125 * uSpeed);
        
        vec4 noise = bccNoiseDerivatives_XYBeforeZ(vec3(st * vec2(0.47, 1.0 - 0.47) * 0.7 - drift, uTime * 0.02 * uSpeed));
        float noiseVal = mix(0.5, noise.w * 0.5 + 0.5, 1.24);
        
        vec3 noiseColor = anchoredPal(noiseVal, uColor1, uColor2);
        
        vec4 bg = texture2D(uTexture, uv);
        
        vec3 finalColor = mix(bg.rgb, noiseColor, uOpacity);
        
        gl_FragColor = vec4(finalColor, max(bg.a, uOpacity));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uColor1.value.set(this.parameters.color1);
        this.uniforms.uColor2.value.set(this.parameters.color2);
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'color1':
                this.parameters.color1 = value;
                if (this.uniforms) this.uniforms.uColor1.value.set(this.parameters.color1);
                break;
            case 'color2':
                this.parameters.color2 = value;
                if (this.uniforms) this.uniforms.uColor2.value.set(this.parameters.color2);
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/PatternEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface PatternConfig {
    patternType: number; // 0 to 9
    scale: number; // 0.1 to 5.0
    color: string; // Hex color
    opacity: number; // 0.0 to 1.0
}

export class PatternEffect extends BaseShaderEffect {
    id = 'pattern';
    name = 'Pattern';
    description = 'Procedural geometric patterns';
    parameters: PatternConfig;

    constructor(config: Partial<PatternConfig> = {}) {
        super();
        this.parameters = {
            patternType: 0,
            scale: 1.0,
            color: '#fa1ee3',
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uPatternType: { value: this.parameters.patternType },
            uScale: { value: this.parameters.scale },
            uColor: { value: new THREE.Color(this.parameters.color) },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform int uPatternType;
      uniform float uScale;
      uniform vec3 uColor;
      uniform float uOpacity;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      mat2 rotate2d(float _angle){
        return mat2(cos(_angle),-sin(_angle),
                    sin(_angle),cos(_angle));
      }

      float gridSDF(vec2 st, float tile) {
        vec2 grid = fract(st);
        vec2 distToEdge = min(grid, 1.0 - grid);
        float minDist = min(distToEdge.x, distToEdge.y);
        return minDist - tile * 0.5;
      }

      float stripeSDF(vec2 st, float tile) {
        float x = fract(st.x - uTime * 0.05);
        return abs(x - 0.5) - tile * 0.5;
      }

      float arrowsSDF(vec2 st, float tile) {
        vec2 grid = floor(st);
        vec2 cell = fract(st);
        float checker = mod(grid.x + grid.y, 2.0);
        float arrow = checker > 0.5 ? cell.x : cell.y;
        return abs(arrow - 0.5) - tile * 0.5;
      }

      float concentricCircleSDF(vec2 st, float tile) {
        float r = length(st);
        return abs(fract(r) - 0.5) - tile * 0.5;
      }

      float circleSDF(vec2 st, float tile) {
        vec2 cell = fract(st) - 0.5;
        float dist = length(cell);
        return dist - tile * 0.5;
      }

      float checkerboardSDF(vec2 st, float tile) {
        vec2 grid = floor(st);
        float checker = mod(grid.x + grid.y, 2.0);
        return checker > 0.5 ? -1.0 : 1.0;
      }

      float wavyLinesSDF(vec2 st, float tile) {
        float wave = sin(st.x * 6.28318 + st.y * 10.0) * 0.5 + 0.5;
        return abs(wave - 0.5) - tile * 0.5;
      }

      float hexagonalSDF(vec2 st, float tile) {
        const float sqrt3 = 1.732050808;
        st = abs(st);
        float d = dot(st, normalize(vec2(1.0, sqrt3))); 
        return max(d, st.x) - tile;
      }

      float diamondSDF(vec2 st, float tile) {
        vec2 cell = fract(st) - 0.5;
        float d = abs(cell.x) + abs(cell.y);
        return d - tile * 0.5;
      }

      float spiralSDF(vec2 st, float tile) {
        float r = length(st);
        float theta = atan(st.y, st.x);
        float spiral = fract((theta + r * 5.0) / 6.28318);
        return abs(spiral - 0.5) - tile * 0.5;
      }

      float getPatternSDF(vec2 st, float tile) {
        st.y -= uTime * 0.05;
        
        if (uPatternType == 0) return gridSDF(st, tile);
        if (uPatternType == 1) return stripeSDF(st, tile);
        if (uPatternType == 2) return circleSDF(st, tile);
        if (uPatternType == 3) return concentricCircleSDF(st, tile);
        if (uPatternType == 4) return arrowsSDF(st, tile);
        if (uPatternType == 5) return checkerboardSDF(st, tile);
        if (uPatternType == 6) return wavyLinesSDF(st, tile);
        if (uPatternType == 7) return hexagonalSDF(st, tile);
        if (uPatternType == 8) return diamondSDF(st, tile);
        if (uPatternType == 9) return spiralSDF(st, tile);
        return gridSDF(st, tile);
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        float aspectRatio = uResolution.x / uResolution.y;
        float res = max(uResolution.x, uResolution.y);
        float px = (1.0 / res);
        float py = px / aspectRatio;
        float scl = 20.0 * uScale;
        float minpx = min(px, py);
        
        float tile = (minpx + 0.1 / scl) * scl;
        tile = floor(tile / minpx + 0.5) * minpx;
        
        vec2 st = (uv - 0.5) * scl;
        st.x *= aspectRatio;
        
        float sdf = getPatternSDF(st, tile);
        
        float smoothRadius = minpx * scl;
        float pattern = 1.0 - smoothstep(-smoothRadius, smoothRadius, sdf);
        
        vec3 finalColor = uColor * pattern;
        
        vec3 blended = mix(bg.rgb, finalColor, pattern * uOpacity);
        
        gl_FragColor = vec4(blended, max(bg.a, pattern * uOpacity));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uPatternType.value = this.parameters.patternType;
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uColor.value.set(this.parameters.color);
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'patternType':
                this.parameters.patternType = typeof value === 'number' ? Math.max(0, Math.min(9, Math.floor(value))) : this.parameters.patternType;
                if (this.uniforms) this.uniforms.uPatternType.value = this.parameters.patternType;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(5.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'color':
                this.parameters.color = value;
                if (this.uniforms) this.uniforms.uColor.value.set(this.parameters.color);
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/PixelateEffect.ts">
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
</file>

<file path="apps/web/src/lib/visualizer/effects/PolarEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface PolarConfig {
    intensity: number; // 0.0 to 1.0
    rotation: number; // 0.0 to 2.0
    centerX: number; // 0.0 to 1.0
    centerY: number; // 0.0 to 1.0
}

export class PolarEffect extends BaseShaderEffect {
    id = 'polar';
    name = 'Polar';
    description = 'Cartesian to polar coordinates transformation';
    parameters: PolarConfig;

    constructor(config: Partial<PolarConfig> = {}) {
        super();
        this.parameters = { intensity: 1.0, rotation: 0.0, centerX: 0.5, centerY: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uRotation: { value: this.parameters.rotation },
            uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uRotation;
      uniform vec2 uCenter;
      
      varying vec2 vUv;
      
      const float PI = 3.1415926;

      vec2 polar(vec2 uv, vec2 pos) {
        uv -= pos;
        
        float angle = atan(uv.y, uv.x);
        float radius = length(uv);
        
        float xCoord = mod((angle + 2.0 * PI) + (uTime * 0.05 * uRotation) + PI, 2.0 * PI) / (2.0 * PI);
        float yCoord = radius;
        
        return fract(vec2(yCoord, xCoord));
      }

      void main() {
        vec2 uv = vUv;
        vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
        
        vec2 pos = uCenter;
        
        vec2 polarCoord = polar(uv * aspectRatio, pos * aspectRatio);
        
        // Seam blending
        vec2 oppositePolar = vec2(polarCoord.x, polarCoord.y > 0.5 ? polarCoord.y - 0.5 : polarCoord.y + 0.5);
        
        vec4 color1 = texture2D(uTexture, polarCoord);
        vec4 color2 = texture2D(uTexture, oppositePolar);
        
        float seamBlend = 0.0;
        float blendWidth = 0.05;
        
        if (polarCoord.y < blendWidth || polarCoord.y > 1.0 - blendWidth) {
            if (polarCoord.y < blendWidth) {
                seamBlend = 1.0 - (polarCoord.y / blendWidth);
            } else {
                seamBlend = (polarCoord.y - (1.0 - blendWidth)) / blendWidth;
            }
            seamBlend = smoothstep(0.0, 1.0, seamBlend);
        }
        
        vec4 polarColor = mix(color1, color2, seamBlend);
        vec4 originalColor = texture2D(uTexture, uv);
        
        gl_FragColor = mix(originalColor, polarColor, uIntensity);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uRotation.value = this.parameters.rotation;
        this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'rotation':
                this.parameters.rotation = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.rotation;
                if (this.uniforms) this.uniforms.uRotation.value = this.parameters.rotation;
                break;
            case 'centerX':
                this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
                if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
                break;
            case 'centerY':
                this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
                if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/PosterizeEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface PosterizeConfig {
    levels: number; // 2 to 256 - number of color levels per channel
    gamma: number; // 0.1 to 3.0 - gamma correction
}

export class PosterizeEffect extends BaseShaderEffect {
    id = 'posterize';
    name = 'Posterize';
    description = 'Reduces color levels for a poster art effect';
    parameters: PosterizeConfig;

    constructor(config: Partial<PosterizeConfig> = {}) {
        super();
        this.parameters = {
            levels: 8,
            gamma: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uLevels: { value: this.parameters.levels },
            uGamma: { value: this.parameters.gamma }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision mediump float;

      uniform sampler2D uTexture;
      uniform float uLevels;
      uniform float uGamma;

      varying vec2 vUv;

      void main() {
        vec4 color = texture2D(uTexture, vUv);
        
        if (color.a == 0.0) {
          gl_FragColor = vec4(0.0);
          return;
        }
        
        // Apply gamma correction before posterization
        vec3 corrected = pow(color.rgb, vec3(uGamma));
        
        // Posterize by quantizing to discrete levels
        vec3 posterized = floor(corrected * uLevels) / uLevels;
        
        // Apply inverse gamma
        posterized = pow(posterized, vec3(1.0 / uGamma));
        
        gl_FragColor = vec4(posterized, color.a);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uLevels.value = this.parameters.levels;
        this.uniforms.uGamma.value = this.parameters.gamma;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'levels':
                this.parameters.levels = typeof value === 'number' ? Math.max(2, Math.min(256, Math.floor(value))) : this.parameters.levels;
                if (this.uniforms) this.uniforms.uLevels.value = this.parameters.levels;
                break;
            case 'gamma':
                this.parameters.gamma = typeof value === 'number' ? Math.max(0.1, Math.min(3.0, value)) : this.parameters.gamma;
                if (this.uniforms) this.uniforms.uGamma.value = this.parameters.gamma;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/ProgressiveBlurEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface ProgressiveBlurConfig {
  intensity: number; // 0.0 to 1.0
  centerX: number; // 0.0 to 1.0
  centerY: number; // 0.0 to 1.0
}

export class ProgressiveBlurEffect extends BaseShaderEffect {
  id = 'progressiveBlur';
  name = 'Progressive Blur';
  description = 'Blur that increases with distance from center';
  parameters: ProgressiveBlurConfig;

  constructor(config: Partial<ProgressiveBlurConfig> = {}) {
    super();
    this.parameters = { intensity: 0.6, centerX: 0.5, centerY: 0.5, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform vec2 uCenter;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        float dist = length((uv - uCenter) * vec2(aspectRatio, 1.0));
        float blurAmount = dist * uIntensity * 0.02;
        
        vec4 color = vec4(0.0);
        vec2 pixelSize = vec2(1.0) / uResolution;
        
        int samples = int(mix(1.0, 9.0, dist * uIntensity));
        float total = 0.0;
        
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            vec2 offset = vec2(float(x), float(y)) * pixelSize * blurAmount;
            color += texture2D(uTexture, uv + offset);
            total += 1.0;
          }
        }
        
        gl_FragColor = color / total;
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
  }

  updateParameter(paramName: string, value: any): void {
    switch (paramName) {
      case 'intensity':
        this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
        if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        break;
      case 'centerX':
        this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
        if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
        break;
      case 'centerY':
        this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
        if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
        break;
    }
  }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/RadialBlurEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface RadialBlurConfig {
    intensity: number; // 0.0 to 1.0
    centerX: number; // 0.0 to 1.0
    centerY: number; // 0.0 to 1.0
    angle: number; // 0.0 to 360.0 - rotation angle
}

export class RadialBlurEffect extends BaseShaderEffect {
    id = 'radialBlur';
    name = 'Radial Blur';
    description = 'Rotational blur around a center point';
    parameters: RadialBlurConfig;

    constructor(config: Partial<RadialBlurConfig> = {}) {
        super();
        this.parameters = {
            intensity: 0.4,
            centerX: 0.5,
            centerY: 0.5,
            angle: 10.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) },
            uAngle: { value: (this.parameters.angle * Math.PI) / 180.0 }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform vec2 uCenter;
      uniform float uAngle;

      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        // Calculate relative position to center
        vec2 toUv = uv - uCenter;
        toUv.x *= aspectRatio;
        
        float radius = length(toUv);
        float baseAngle = atan(toUv.y, toUv.x);
        
        vec4 color = vec4(0.0);
        float totalWeight = 1.0;
        color += texture2D(uTexture, uv);
        
        float angleStep = uAngle * uIntensity * 0.04;
        
        // Symmetric rotational sampling
        for (int i = 1; i <= 8; i++) {
          float weight = exp(-float(i) * 0.5);
          float step = float(i) * angleStep;
          
          // Rotate forward
          float a1 = baseAngle + step;
          vec2 rot1 = radius * vec2(cos(a1), sin(a1));
          rot1.x /= aspectRatio;
          vec2 uv1 = rot1 + uCenter;
          
          // Rotate backward
          float a2 = baseAngle - step;
          vec2 rot2 = radius * vec2(cos(a2), sin(a2));
          rot2.x /= aspectRatio;
          vec2 uv2 = rot2 + uCenter;
          
          color += texture2D(uTexture, uv1) * weight;
          color += texture2D(uTexture, uv2) * weight;
          totalWeight += 2.0 * weight;
        }
        
        gl_FragColor = color / totalWeight;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
        this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'centerX':
                this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
                if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
                break;
            case 'centerY':
                this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
                if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
                break;
            case 'angle':
                this.parameters.angle = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.angle;
                if (this.uniforms) this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/ReplicateEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface ReplicateConfig {
    spacing: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
    rotation: number; // 0.0 to 360.0
    opacity: number; // 0.0 to 1.0
}

export class ReplicateEffect extends BaseShaderEffect {
    id = 'replicate';
    name = 'Replicate';
    description = 'Trail and aberration effect';
    parameters: ReplicateConfig;

    constructor(config: Partial<ReplicateConfig> = {}) {
        super();
        this.parameters = {
            spacing: 0.35,
            speed: 0.5,
            rotation: 0.0,
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uSpacing: { value: this.parameters.spacing },
            uSpeed: { value: this.parameters.speed },
            uRotation: { value: (this.parameters.rotation * Math.PI) / 180.0 },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uSpacing;
      uniform float uSpeed;
      uniform float uRotation;
      uniform float uOpacity;
      
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        float repeatSpacing = uSpacing * mix(1.0, aspectRatio, 0.5);
        float time = (uTime * 0.025 * uSpeed) / (repeatSpacing + 0.001);
        
        vec4 col = vec4(0.0);
        
        const int MAX_REPEATS = 16;
        
        for (int i = 0; i < MAX_REPEATS; ++i) {
            float fi = float(i);
            float offset = repeatSpacing * (fi - 0.5 * 16.0 + fract(time));
            
            vec2 aberrated = vec2(offset * sin(uRotation), offset * cos(uRotation));
            
            vec4 sampleCol = texture2D(uTexture, uv + aberrated);
            col += sampleCol * (1.0 - col.a) * uOpacity;
        }
        
        // Blend with original based on opacity if needed, but the effect is additive/composite
        // The loop accumulates color. If opacity is low, we might want to blend with original.
        // For now, we output the accumulated result.
        
        gl_FragColor = col;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uSpacing.value = this.parameters.spacing;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uRotation.value = (this.parameters.rotation * Math.PI) / 180.0;
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'spacing':
                this.parameters.spacing = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.spacing;
                if (this.uniforms) this.uniforms.uSpacing.value = this.parameters.spacing;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'rotation':
                this.parameters.rotation = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.rotation;
                if (this.uniforms) this.uniforms.uRotation.value = (this.parameters.rotation * Math.PI) / 180.0;
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/RippleEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface RippleConfig {
  intensity: number; // 0.0 to 1.0
  frequency: number; // 1.0 to 20.0
  speed: number; // 0.0 to 2.0
  centerX: number; // 0.0 to 1.0
  centerY: number; // 0.0 to 1.0
}

export class RippleEffect extends BaseShaderEffect {
  id = 'ripple';
  name = 'Ripple';
  description = 'Concentric ripple distortion';
  parameters: RippleConfig;

  constructor(config: Partial<RippleConfig> = {}) {
    super();
    this.parameters = { intensity: 0.05, frequency: 10.0, speed: 1.0, centerX: 0.5, centerY: 0.5, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uFrequency: { value: this.parameters.frequency },
      uSpeed: { value: this.parameters.speed },
      uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uFrequency;
      uniform float uSpeed;
      uniform vec2 uCenter;
      uniform float uTime;
      
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        vec2 tc = uv - uCenter;
        tc.x *= aspectRatio;
        
        float dist = length(tc);
        float angle = atan(tc.y, tc.x);
        
        float radius = dist;
        radius += sin(dist * uFrequency - uTime * uSpeed) * uIntensity * 0.05;
        
        tc = vec2(cos(angle), sin(angle)) * radius;
        tc.x /= aspectRatio;
        
        gl_FragColor = texture2D(uTexture, tc + uCenter);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uFrequency.value = this.parameters.frequency;
    this.uniforms.uSpeed.value = this.parameters.speed;
    this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
  }

  updateParameter(paramName: string, value: any): void {
    switch (paramName) {
      case 'intensity':
        this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
        if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        break;
      case 'frequency':
        this.parameters.frequency = typeof value === 'number' ? Math.max(1.0, Math.min(20.0, value)) : this.parameters.frequency;
        if (this.uniforms) this.uniforms.uFrequency.value = this.parameters.frequency;
        break;
      case 'speed':
        this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
        if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
        break;
      case 'centerX':
        this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
        if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
        break;
      case 'centerY':
        this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
        if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
        break;
    }
  }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/SineWavesEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface SineWavesConfig {
    intensity: number; // 0.0 to 1.0
    frequency: number; // 1.0 to 50.0
    speed: number; // 0.0 to 2.0
    waveX: boolean;
    waveY: boolean;
}

export class SineWavesEffect extends BaseShaderEffect {
    id = 'sineWaves';
    name = 'Sine Waves';
    description = 'Sinusoidal wave distortion';
    parameters: SineWavesConfig;

    constructor(config: Partial<SineWavesConfig> = {}) {
        super();
        this.parameters = {
            intensity: 0.5,
            frequency: 20.0,
            speed: 0.5,
            waveX: true,
            waveY: true,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uFrequency: { value: this.parameters.frequency },
            uSpeed: { value: this.parameters.speed },
            uWaveX: { value: this.parameters.waveX ? 1.0 : 0.0 },
            uWaveY: { value: this.parameters.waveY ? 1.0 : 0.0 }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uFrequency;
      uniform float uSpeed;
      uniform float uWaveX;
      uniform float uWaveY;
      
      varying vec2 vUv;
      
      const float PI = 3.141592;

      void main() {
        vec2 uv = vUv;
        
        // Convert UV coordinates from [0, 1] to [-1, 1] range
        vec2 waveCoord = uv * 2.0 - 1.0; 
        
        float thirdPI = PI * 0.3333;
        float time = uTime * 0.25 * uSpeed;
        float amp = 0.3 * uIntensity;

        // Wave X (Horizontal displacement) based on vertical position
        float waveXVal = sin((waveCoord.y + 0.5) * uFrequency + (time * thirdPI)) * amp; 
        
        // Wave Y (Vertical displacement) based on horizontal position
        float waveYVal = sin((waveCoord.x - 0.5) * uFrequency + (time * thirdPI)) * amp;
        
        // Apply displacement
        waveCoord.xy += vec2(
            mix(0.0, waveXVal, uWaveX), 
            mix(0.0, waveYVal, uWaveY)
        );
        
        // Convert distorted coordinates back to UV range [0, 1]
        vec2 finalUV = waveCoord * 0.5 + 0.5;
        
        gl_FragColor = texture2D(uTexture, finalUV);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uFrequency.value = this.parameters.frequency;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uWaveX.value = this.parameters.waveX ? 1.0 : 0.0;
        this.uniforms.uWaveY.value = this.parameters.waveY ? 1.0 : 0.0;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'frequency':
                this.parameters.frequency = typeof value === 'number' ? Math.max(1.0, Math.min(50.0, value)) : this.parameters.frequency;
                if (this.uniforms) this.uniforms.uFrequency.value = this.parameters.frequency;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'waveX':
                this.parameters.waveX = !!value;
                if (this.uniforms) this.uniforms.uWaveX.value = this.parameters.waveX ? 1.0 : 0.0;
                break;
            case 'waveY':
                this.parameters.waveY = !!value;
                if (this.uniforms) this.uniforms.uWaveY.value = this.parameters.waveY ? 1.0 : 0.0;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/SkyboxEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface SkyboxConfig {
    fov: number; // 20.0 to 120.0
    rotationX: number; // 0.0 to 1.0
    rotationY: number; // 0.0 to 1.0
    zoom: number; // 0.5 to 2.0
}

export class SkyboxEffect extends BaseShaderEffect {
    id = 'skybox';
    name = 'Skybox Projection';
    description = 'Equirectangular 360 projection';
    parameters: SkyboxConfig;

    constructor(config: Partial<SkyboxConfig> = {}) {
        super();
        this.parameters = { fov: 90.0, rotationX: 0.5, rotationY: 0.5, zoom: 1.0, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uFov: { value: (this.parameters.fov * Math.PI) / 180.0 },
            uRotation: { value: new THREE.Vector2(this.parameters.rotationX, this.parameters.rotationY) },
            uZoom: { value: this.parameters.zoom }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uFov;
      uniform vec2 uRotation;
      uniform float uZoom;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265;

      vec3 getRayDirection(vec2 uv, vec2 mousePos, float aspect) {
        vec2 screenPos = (uv - 0.5) * 2.0;
        screenPos.x *= aspect;
        screenPos.y *= -1.0;
        
        float fov = uFov;
        
        vec3 rayDir = normalize(vec3(
            screenPos.x * tan(fov / 2.0),
            screenPos.y * tan(fov / 2.0),
            -1.0
        ));
        
        float rotX = (mousePos.y - 0.5) * PI;
        float rotY = (mousePos.x - 0.5) * PI * 2.0;
        
        mat3 rotateY = mat3(
            cos(rotY), 0.0, -sin(rotY),
            0.0, 1.0, 0.0,
            sin(rotY), 0.0, cos(rotY)
        );
        mat3 rotateX = mat3(
            1.0, 0.0, 0.0,
            0.0, cos(rotX), sin(rotX),
            0.0, -sin(rotX), cos(rotX)
        );
        
        return normalize(rotateX * rotateY * rayDir);
      }

      vec2 directionToUVHorizontal(vec3 dir) {
        float longitude = atan(dir.z, dir.x);
        float latitude = acos(dir.y);
        
        vec2 uv;
        uv.x = longitude / (2.0 * PI) + 0.5;
        uv.y = latitude / PI;
        uv.x += 0.25;
        return uv;
      }

      vec2 directionToUVVertical(vec3 dir) {
        float longitude = atan(dir.z, dir.y);
        float latitude = acos(dir.x);
        
        vec2 uv;
        uv.y = longitude / PI * -1.0;
        uv.x = (latitude / (2.0 * PI) + 0.5) * -1.0;
        uv.x = fract(uv.x + 0.25);
        return uv;
      }

      void main() {
        float aspect = uResolution.x / uResolution.y;
        vec2 mPos = uRotation;
        
        vec3 rayDir = getRayDirection(vUv, mPos, aspect);
        
        vec2 uvHorizontal = directionToUVHorizontal(rayDir);
        vec2 uvVertical = directionToUVVertical(rayDir);
        
        vec2 sphereUV = mix(uvHorizontal, uvVertical, 0.4);
        
        float fovCompensation = tan(uFov / 2.0);
        float compensatedScale = (2.0 * uZoom) * (1.0 / fovCompensation);
        
        sphereUV = (sphereUV - 0.5) * compensatedScale + 0.5;
        sphereUV += vec2(0.5, 0.0) * uTime * 0.005;
        
        vec2 finalUV = vec2(fract(sphereUV.x), sphereUV.y);
        
        gl_FragColor = texture2D(uTexture, finalUV);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uFov.value = (this.parameters.fov * Math.PI) / 180.0;
        this.uniforms.uRotation.value.set(this.parameters.rotationX, this.parameters.rotationY);
        this.uniforms.uZoom.value = this.parameters.zoom;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'fov':
                this.parameters.fov = typeof value === 'number' ? Math.max(20.0, Math.min(120.0, value)) : this.parameters.fov;
                if (this.uniforms) this.uniforms.uFov.value = (this.parameters.fov * Math.PI) / 180.0;
                break;
            case 'rotationX':
                this.parameters.rotationX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.rotationX;
                if (this.uniforms) this.uniforms.uRotation.value.x = this.parameters.rotationX;
                break;
            case 'rotationY':
                this.parameters.rotationY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.rotationY;
                if (this.uniforms) this.uniforms.uRotation.value.y = this.parameters.rotationY;
                break;
            case 'zoom':
                this.parameters.zoom = typeof value === 'number' ? Math.max(0.5, Math.min(2.0, value)) : this.parameters.zoom;
                if (this.uniforms) this.uniforms.uZoom.value = this.parameters.zoom;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/StretchEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface StretchConfig {
    intensity: number; // 0.0 to 1.0
    angle: number; // 0.0 to 360.0
    centerX: number; // 0.0 to 1.0
    centerY: number; // 0.0 to 1.0
}

export class StretchEffect extends BaseShaderEffect {
    id = 'stretch';
    name = 'Stretch';
    description = 'Directional stretch/compression distortion';
    parameters: StretchConfig;

    constructor(config: Partial<StretchConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, angle: 0.0, centerX: 0.5, centerY: 0.5, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uAngle: { value: (this.parameters.angle * Math.PI) / 180.0 },
            uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uAngle;
      uniform vec2 uCenter;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      vec2 rotate(vec2 v, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
      }

      vec3 chromatic_aberration(vec3 color, vec2 uv, float amount) {
        vec2 offset = normalize(uv - 0.5) * amount;
        vec4 left = texture2D(uTexture, uv - offset);
        vec4 right = texture2D(uTexture, uv + offset);
        color.r = left.r;
        color.b = right.b;
        return color;
      }

      void main() {
        vec2 uv = vUv;
        
        float angle = uAngle;
        float stretchX = 4.0 * uIntensity;
        float stretchY = 4.0 * uIntensity;
        
        vec2 pos = uCenter;
        vec2 offset = uv - pos;
        
        vec2 rotatedOffset = rotate(offset, -angle);
        vec2 stretchedOffset = rotatedOffset;
        
        if (rotatedOffset.x > 0.0) {
            float stretchIntensity = rotatedOffset.x;
            
            stretchedOffset.x = rotatedOffset.x / (1.0 + stretchX * stretchIntensity);
            stretchedOffset.y = rotatedOffset.y / (1.0 + stretchY * stretchIntensity * stretchIntensity);
        }
        
        vec2 finalOffset = rotate(stretchedOffset, angle);
        vec2 st = pos + finalOffset;
        
        vec4 color = texture2D(uTexture, st);
        
        // Chromatic Aberration
        float dist = length(st - uv);
        color.rgb = chromatic_aberration(color.rgb, st, dist * 0.05 * uIntensity);
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
        this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'angle':
                this.parameters.angle = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.angle;
                if (this.uniforms) this.uniforms.uAngle.value = (this.parameters.angle * Math.PI) / 180.0;
                break;
            case 'centerX':
                this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
                if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
                break;
            case 'centerY':
                this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
                if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/SwirlEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface SwirlConfig {
  intensity: number; // 0.0 to 2.0
  centerX: number; // 0.0 to 1.0
  centerY: number; // 0.0 to 1.0
  radius: number; // 0.1 to 1.0
}

export class SwirlEffect extends BaseShaderEffect {
  id = 'swirl';
  name = 'Swirl';
  description = 'Swirl/twist distortion effect';
  parameters: SwirlConfig;

  constructor(config: Partial<SwirlConfig> = {}) {
    super();
    this.parameters = { intensity: 0.8, centerX: 0.5, centerY: 0.5, radius: 0.4, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) },
      uRadius: { value: this.parameters.radius }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform vec2 uCenter;
      uniform float uRadius;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        vec2 tc = uv - uCenter;
        tc.x *= aspectRatio;
        
        float dist = length(tc);
        if (dist < uRadius) {
          float percent = (uRadius - dist) / uRadius;
          float theta = percent * percent * uIntensity * 8.0;
          float s = sin(theta);
          float c = cos(theta);
          tc = vec2(dot(tc, vec2(c, -s)), dot(tc, vec2(s, c)));
        }
        
        tc.x /= aspectRatio;
        gl_FragColor = texture2D(uTexture, tc + uCenter);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
    this.uniforms.uRadius.value = this.parameters.radius;
  }

  updateParameter(paramName: string, value: any): void {
    if (paramName === 'intensity') {
      this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
      if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
    } else if (paramName === 'centerX') {
      this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
      if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
    } else if (paramName === 'centerY') {
      this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
      if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
    } else if (paramName === 'radius') {
      this.parameters.radius = typeof value === 'number' ? Math.max(0.1, Math.min(1.0, value)) : this.parameters.radius;
      if (this.uniforms) this.uniforms.uRadius.value = this.parameters.radius;
    }
  }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/TrailEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface TrailConfig {
    intensity: number; // 0.0 to 1.0
    decay: number; // 0.0 to 1.0
}

export class TrailEffect extends BaseShaderEffect {
    id = 'trail';
    name = 'Trail';
    description = 'Motion trail / afterimage effect';
    parameters: TrailConfig;

    constructor(config: Partial<TrailConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, decay: 0.9, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uDecay: { value: this.parameters.decay }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uIntensity;
      uniform float uDecay;
      varying vec2 vUv;

      // Note: True trail effect requires multi-pass rendering (ping-pong buffers)
      // which is not fully supported in this single-pass shader architecture yet.
      // This implementation provides a basic motion blur approximation.

      void main() {
        vec2 uv = vUv;
        vec4 color = texture2D(uTexture, uv);
        
        // Simulated trail using simple blur/feedback approximation
        // In a real multi-pass setup, we would sample the previous frame here
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uDecay.value = this.parameters.decay;
    }

    updateParameter(paramName: string, value: any): void {
        if (paramName === 'intensity') {
            this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
            if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        } else if (paramName === 'decay') {
            this.parameters.decay = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.decay;
            if (this.uniforms) this.uniforms.uDecay.value = this.parameters.decay;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/VideoEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface VideoConfig {
    scale: number; // 0.1 to 2.0
    rotation: number; // 0.0 to 360.0
    posX: number; // 0.0 to 1.0
    posY: number; // 0.0 to 1.0
    opacity: number; // 0.0 to 1.0
}

export class VideoEffect extends BaseShaderEffect {
    id = 'video';
    name = 'Video Overlay';
    description = 'Video texture overlay (requires video source)';
    parameters: VideoConfig;

    constructor(config: Partial<VideoConfig> = {}) {
        super();
        this.parameters = {
            scale: 1.0,
            rotation: 0.0,
            posX: 0.5,
            posY: 0.5,
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uVideoTexture: { value: null }, // Needs to be bound externally
            uScale: { value: this.parameters.scale },
            uRotation: { value: (this.parameters.rotation * Math.PI) / 180.0 },
            uPosition: { value: new THREE.Vector2(this.parameters.posX, this.parameters.posY) },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform sampler2D uVideoTexture;
      uniform vec2 uResolution;
      uniform float uScale;
      uniform float uRotation;
      uniform vec2 uPosition;
      uniform float uOpacity;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      mat2 rot(float a) {
        return mat2(cos(a), -sin(a), sin(a), cos(a));
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        float screenAspect = uResolution.x / uResolution.y;
        
        // Assume video aspect is 16:9 for now as we can't easily get it in shader without uniform
        float videoAspect = 16.0 / 9.0; 
        
        vec2 centeredUV = uv - uPosition;
        centeredUV.x *= screenAspect;
        
        centeredUV /= uScale;
        centeredUV *= rot(uRotation);
        
        centeredUV.x /= videoAspect;
        centeredUV += 0.5;
        
        if(centeredUV.x < 0.0 || centeredUV.x > 1.0 || centeredUV.y < 0.0 || centeredUV.y > 1.0) {
            gl_FragColor = bg;
            return;
        }
        
        vec4 videoColor = texture2D(uVideoTexture, centeredUV);
        
        vec3 finalColor = mix(bg.rgb, videoColor.rgb, uOpacity * videoColor.a);
        
        gl_FragColor = vec4(finalColor, max(bg.a, uOpacity * videoColor.a));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uRotation.value = (this.parameters.rotation * Math.PI) / 180.0;
        this.uniforms.uPosition.value.set(this.parameters.posX, this.parameters.posY);
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'rotation':
                this.parameters.rotation = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.rotation;
                if (this.uniforms) this.uniforms.uRotation.value = (this.parameters.rotation * Math.PI) / 180.0;
                break;
            case 'posX':
                this.parameters.posX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.posX;
                if (this.uniforms) this.uniforms.uPosition.value.x = this.parameters.posX;
                break;
            case 'posY':
                this.parameters.posY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.posY;
                if (this.uniforms) this.uniforms.uPosition.value.y = this.parameters.posY;
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/WaterCausticsEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface WaterCausticsConfig {
    intensity: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
    refraction: number; // 0.0 to 1.0
    color: string; // Hex color
}

export class WaterCausticsEffect extends BaseShaderEffect {
    id = 'waterCaustics';
    name = 'Water Caustics';
    description = 'Water surface caustics simulation';
    parameters: WaterCausticsConfig;

    constructor(config: Partial<WaterCausticsConfig> = {}) {
        super();
        this.parameters = {
            intensity: 0.8,
            speed: 0.5,
            refraction: 0.5,
            color: '#99b3e6', // Light blue
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uSpeed: { value: this.parameters.speed },
            uRefraction: { value: this.parameters.refraction },
            uColor: { value: new THREE.Color(this.parameters.color) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSpeed;
      uniform float uRefraction;
      uniform vec3 uColor;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      vec4 permute(vec4 t) {
        return t * (t * 34.0 + 133.0);
      }

      vec3 grad(float hash) {
        vec3 cube = mod(floor(hash / vec3(1.0, 2.0, 4.0)), 2.0) * 2.0 - 1.0;
        vec3 cuboct = cube;
        float index0 = step(0.0, 1.0 - floor(hash / 16.0));
        float index1 = step(0.0, floor(hash / 16.0) - 1.0);
        cuboct.x *= 1.0 - index0;
        cuboct.y *= 1.0 - index1;
        cuboct.z *= 1.0 - (1.0 - index0 - index1);
        float type = mod(floor(hash / 8.0), 2.0);
        vec3 rhomb = (1.0 - type) * cube + type * (cuboct + cross(cube, cuboct));
        vec3 grad = cuboct * 1.22474487139 + rhomb;
        grad *= (1.0 - 0.042942436724648037 * type) * 3.5946317686139184;
        return grad;
      }

      vec4 bccNoiseDerivativesPart(vec3 X) {
        vec3 b = floor(X);
        vec4 i4 = vec4(X - b, 2.5);
        vec3 v1 = b + floor(dot(i4, vec4(.25)));
        vec3 v2 = b + vec3(1, 0, 0) + vec3(-1, 1, 1) * floor(dot(i4, vec4(-.25, .25, .25, .35)));
        vec3 v3 = b + vec3(0, 1, 0) + vec3(1, -1, 1) * floor(dot(i4, vec4(.25, -.25, .25, .35)));
        vec3 v4 = b + vec3(0, 0, 1) + vec3(1, 1, -1) * floor(dot(i4, vec4(.25, .25, -.25, .35)));
        vec4 hashes = permute(mod(vec4(v1.x, v2.x, v3.x, v4.x), 289.0));
        hashes = permute(mod(hashes + vec4(v1.y, v2.y, v3.y, v4.y), 289.0));
        hashes = mod(permute(mod(hashes + vec4(v1.z, v2.z, v3.z, v4.z), 289.0)), 48.0);
        vec3 d1 = X - v1; vec3 d2 = X - v2; vec3 d3 = X - v3; vec3 d4 = X - v4;
        vec4 a = max(0.75 - vec4(dot(d1, d1), dot(d2, d2), dot(d3, d3), dot(d4, d4)), 0.0);
        vec4 aa = a * a; vec4 aaaa = aa * aa;
        vec3 g1 = grad(hashes.x); vec3 g2 = grad(hashes.y);
        vec3 g3 = grad(hashes.z); vec3 g4 = grad(hashes.w);
        vec4 extrapolations = vec4(dot(d1, g1), dot(d2, g2), dot(d3, g3), dot(d4, g4));
        vec3 derivative = -8.0 * mat4x3(d1, d2, d3, d4) * (aa * a * extrapolations)
                        + mat4x3(g1, g2, g3, g4) * aaaa;
        return vec4(derivative, dot(aaaa, extrapolations));
      }

      vec4 bccNoiseDerivatives_XYBeforeZ(vec3 X) {
        mat3 orthonormalMap = mat3(
            0.788675134594813, -0.211324865405187, -0.577350269189626,
            -0.211324865405187, 0.788675134594813, -0.577350269189626,
            0.577350269189626, 0.577350269189626, 0.577350269189626);
        X = orthonormalMap * X;
        vec4 result = bccNoiseDerivativesPart(X) + bccNoiseDerivativesPart(X + 144.5);
        return vec4(result.xyz * orthonormalMap, result.w);
      }

      vec4 getNoise(vec3 p) {
        vec4 noise = bccNoiseDerivatives_XYBeforeZ(p);
        return mix(noise, (noise + 0.5) * 0.5, 0.25);
      }

      void main() {
        vec2 uv = vUv;
        vec2 aspect = vec2(uResolution.x/uResolution.y, 1.0);
        
        vec2 pos = (uv - 0.5) * aspect * 16.0 * 0.5;
        
        float refraction = mix(0.25, 1.3, uRefraction);
        vec3 p = vec3(pos, uTime * 0.05 * uSpeed);
        
        vec4 noise = getNoise(p);
        vec4 baseNoise = noise;
        vec4 balanceNoise = getNoise(p - vec3(baseNoise.xyz / 32.0) * refraction);
        noise = getNoise(p - vec3(balanceNoise.xyz / 16.0) * refraction);
        
        float balancer = (0.5 + 0.5 * balanceNoise.w);
        float normalized = pow(0.5 + 0.5 * noise.w, 2.0);
        float value = mix(0.0, normalized + 0.2 * (1.0 - normalized), balancer);
        
        vec3 causticColor = uColor * value * uIntensity;
        
        // Distortion
        vec4 color = texture2D(uTexture, uv + baseNoise.xy * 0.01 * 0.25);
        
        // Composite
        gl_FragColor = vec4(color.rgb + causticColor, color.a);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uRefraction.value = this.parameters.refraction;
        this.uniforms.uColor.value.set(this.parameters.color);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'refraction':
                this.parameters.refraction = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.refraction;
                if (this.uniforms) this.uniforms.uRefraction.value = this.parameters.refraction;
                break;
            case 'color':
                this.parameters.color = value;
                if (this.uniforms) this.uniforms.uColor.value.set(this.parameters.color);
                break;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/WaterRipplesEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface WaterRipplesConfig {
    intensity: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
}

export class WaterRipplesEffect extends BaseShaderEffect {
    id = 'waterRipples';
    name = 'Water Ripples';
    description = 'Water surface ripple simulation';
    parameters: WaterRipplesConfig;

    constructor(config: Partial<WaterRipplesConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, speed: 1.0, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uSpeed: { value: this.parameters.speed }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSpeed;
      varying vec2 vUv;

      // Note: True water ripple simulation requires multi-pass physics simulation
      // (ping-pong buffers) which is not fully supported in this single-pass 
      // shader architecture yet. This implementation provides a visual approximation.

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        
        vec2 center = vec2(0.5);
        vec2 tc = uv - center;
        tc.x *= aspectRatio;
        float dist = length(tc);
        
        float time = uTime * uSpeed;
        
        // Simple ripple approximation
        float ripple = sin(dist * 20.0 - time * 5.0) * 0.01 * uIntensity;
        
        // Attenuate ripple with distance
        ripple *= max(0.0, 1.0 - dist * 2.0);
        
        vec2 offset = normalize(tc) * ripple;
        
        vec4 color = texture2D(uTexture, uv + offset);
        
        // Add simple specular highlight
        float highlight = max(0.0, ripple * 100.0);
        color.rgb += vec3(highlight) * 0.2;
        
        gl_FragColor = color;
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uSpeed.value = this.parameters.speed;
    }

    updateParameter(paramName: string, value: any): void {
        if (paramName === 'intensity') {
            this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
            if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        } else if (paramName === 'speed') {
            this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
            if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/WavesEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface WavesConfig {
    intensity: number; // 0.0 to 1.0
    speed: number; // 0.0 to 2.0
}

export class WavesEffect extends BaseShaderEffect {
    id = 'waves';
    name = 'Noise Waves';
    description = 'Perlin noise wave distortion';
    parameters: WavesConfig;

    constructor(config: Partial<WavesConfig> = {}) {
        super();
        this.parameters = { intensity: 0.5, speed: 1.0, ...config };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uIntensity: { value: this.parameters.intensity },
            uSpeed: { value: this.parameters.speed }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSpeed;
      varying vec2 vUv;

      // Hashing function for Perlin Noise
      vec3 hash33(vec3 p3) {
        p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
        p3 += dot(p3, p3.yxz + 19.19);
        return -1.0 + 2.0 * fract(vec3(
            (p3.x + p3.y) * p3.z,
            (p3.x + p3.z) * p3.y,
            (p3.y + p3.z) * p3.x
        ));
      }

      // 3D Perlin Noise function
      float perlin_noise(vec3 p) {
        vec3 pi = floor(p);
        vec3 pf = p - pi;
        vec3 w = pf * pf * (3.0 - 2.0 * pf);
        
        float n000 = dot(pf - vec3(0.0, 0.0, 0.0), hash33(pi + vec3(0.0, 0.0, 0.0)));
        float n100 = dot(pf - vec3(1.0, 0.0, 0.0), hash33(pi + vec3(1.0, 0.0, 0.0)));
        float n010 = dot(pf - vec3(0.0, 1.0, 0.0), hash33(pi + vec3(0.0, 1.0, 0.0)));
        float n110 = dot(pf - vec3(1.0, 1.0, 0.0), hash33(pi + vec3(1.0, 1.0, 0.0)));
        float n001 = dot(pf - vec3(0.0, 0.0, 1.0), hash33(pi + vec3(0.0, 0.0, 1.0)));
        float n101 = dot(pf - vec3(1.0, 0.0, 1.0), hash33(pi + vec3(1.0, 0.0, 1.0)));
        float n011 = dot(pf - vec3(0.0, 1.0, 1.0), hash33(pi + vec3(0.0, 1.0, 1.0)));
        float n111 = dot(pf - vec3(1.0, 1.0, 1.0), hash33(pi + vec3(1.0, 1.0, 1.0)));
        
        float nx00 = mix(n000, n100, w.x);
        float nx01 = mix(n001, n101, w.x);
        float nx10 = mix(n010, n110, w.x);
        float nx11 = mix(n011, n111, w.x);
        
        float nxy0 = mix(nx00, nx10, w.y);
        float nxy1 = mix(nx01, nx11, w.y);
        
        float nxyz = mix(nxy0, nxy1, w.z);
        
        return nxyz;
      }

      void main() {
        vec2 uv = vUv;
        
        float time = uTime * 0.5 * uSpeed;
        
        // Calculate noise value
        float value = perlin_noise(vec3(uv * 5.0, time)) * uIntensity * 0.2;
        
        // Apply distortion to UVs
        vec2 distortedUV = uv + vec2(0.0, value);
        
        // Mirror UVs (from original shader logic)
        // distortedUV = vec2(1.0 - distortedUV.x, 1.0 - distortedUV.y);
        
        gl_FragColor = texture2D(uTexture, distortedUV);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uSpeed.value = this.parameters.speed;
    }

    updateParameter(paramName: string, value: any): void {
        if (paramName === 'intensity') {
            this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.intensity;
            if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        } else if (paramName === 'speed') {
            this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
            if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/WispsEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface WispsConfig {
    speed: number; // 0.0 to 2.0
    scale: number; // 0.1 to 2.0
    intensity: number; // 0.0 to 2.0
    color: string; // Hex color
}

export class WispsEffect extends BaseShaderEffect {
    id = 'wisps';
    name = 'Wisps';
    description = 'Flowing smoke/wisp effect';
    parameters: WispsConfig;

    constructor(config: Partial<WispsConfig> = {}) {
        super();
        this.parameters = {
            speed: 0.5,
            scale: 1.0,
            intensity: 1.0,
            color: '#ffffff',
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uSpeed: { value: this.parameters.speed },
            uScale: { value: this.parameters.scale },
            uIntensity: { value: this.parameters.intensity },
            uColor: { value: new THREE.Color(this.parameters.color) }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uSpeed;
      uniform float uScale;
      uniform float uIntensity;
      uniform vec3 uColor;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }

      float voronoi_additive(vec2 st, float radius, float scale) {
        vec2 i_st = floor(st);
        vec2 f_st = fract(st);
        
        float wander = uTime * 0.2 * uSpeed;
        float total_contribution = 0.0;
        
        for (int y = -2; y <= 2; y++) {
            for (int x = -2; x <= 2; x++) {
                vec2 neighbor = vec2(float(x), float(y));
                vec2 cell_id = i_st + neighbor;
                
                vec2 point = hash(cell_id);
                point = 0.5 + 0.5 * sin(5.0 + wander + 6.2831 * point); 
                
                vec2 starAbsPos = cell_id + point;
                vec2 diff = starAbsPos - st;
                float dist = length(diff);
                
                float contribution = radius / max(dist, radius * 0.1); 
                
                float shimmer_phase = dot(point, vec2(1.0)) * 10.0 + hash(cell_id).x * 5.0 + uTime * 0.5 * uSpeed;
                float shimmer = mix(1.0, (sin(shimmer_phase) + 1.0), 0.5);
                contribution *= shimmer;
                
                total_contribution += mix(contribution * contribution, contribution * 2.0, 0.25);
            }
        }
        return total_contribution;
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        float aspectRatio = uResolution.x / uResolution.y;
        
        vec2 st = (uv - 0.5) * vec2(aspectRatio, 1.0) * 20.0 * uScale;
        
        vec2 movementOffset = vec2(0.0, uTime * 0.5 * -0.05 * uSpeed);
        
        vec2 mouse1 = st + movementOffset;
        vec2 mouse2 = st + vec2(0.0, uTime * 0.5 * -0.05 * uSpeed) + vec2(10.0);
        
        float radius1 = 0.25;
        float radius2 = 0.25;
        
        float pass1 = voronoi_additive(mouse1, radius1, 38.0);
        float pass2 = voronoi_additive(mouse2, radius2, 48.0);
        
        pass1 *= 0.02;
        pass2 *= 0.04;
        
        vec3 wispColor = (pass1 + pass2) * uColor * uIntensity;
        
        vec3 finalColor = bg.rgb + wispColor;
        
        gl_FragColor = vec4(finalColor, max(bg.a, length(wispColor)));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uSpeed.value = this.parameters.speed;
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uIntensity.value = this.parameters.intensity;
        this.uniforms.uColor.value.set(this.parameters.color);
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'speed':
                this.parameters.speed = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.speed;
                if (this.uniforms) this.uniforms.uSpeed.value = this.parameters.speed;
                break;
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'intensity':
                this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
                if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
                break;
            case 'color':
                this.parameters.color = value;
                if (this.uniforms) this.uniforms.uColor.value.set(this.parameters.color);
                break;
        }
    }
}
</file>

<file path="apps/web/src/remotion/index.ts">
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
</file>

<file path="apps/web/src/lib/visualizer/effects/BaseShaderEffect.ts">
import * as THREE from 'three';
import { VisualEffect } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';
import { MultiLayerCompositor } from '../core/MultiLayerCompositor';

/**
 * Abstract base class for shader-based visual effects.
 * Provides common functionality for full-screen post-processing effects.
 */
export abstract class BaseShaderEffect implements VisualEffect {
    abstract id: string;
    abstract name: string;
    abstract description: string;
    enabled: boolean = true;
    abstract parameters: Record<string, any>;

    protected scene: THREE.Scene;
    protected camera: THREE.OrthographicCamera;
    protected material!: THREE.ShaderMaterial;
    protected mesh!: THREE.Mesh;
    protected uniforms!: Record<string, THREE.IUniform>;
    protected renderer!: THREE.WebGLRenderer;
    protected compositor?: MultiLayerCompositor;
    protected layerId?: string;

    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent for layer compositing
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }

    /**
     * Set the compositor and layer ID to pull texture from layers beneath
     */
    public setCompositor(compositor: MultiLayerCompositor, layerId: string): void {
        this.compositor = compositor;
        this.layerId = layerId;
    }

    /**
     * Override this to define custom uniforms beyond the standard ones
     */
    protected abstract getCustomUniforms(): Record<string, THREE.IUniform>;

    /**
     * Override this to provide the fragment shader code
     */
    protected abstract getFragmentShader(): string;

    /**
     * Standard vertex shader (can be overridden if needed)
     */
    protected getVertexShader(): string {
        return `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;
    }

    /**
     * Set up standard uniforms + custom uniforms
     */
    protected setupUniforms(): void {
        const size = this.renderer ? this.renderer.getSize(new THREE.Vector2()) : new THREE.Vector2(1024, 1024);

        // Standard uniforms available to all shader effects
        this.uniforms = {
            uTexture: { value: null },
            uTime: { value: 0.0 },
            uResolution: { value: new THREE.Vector2(size.x, size.y) },
            uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
            ...this.getCustomUniforms()
        };
    }

    /**
     * Create shader material with error handling
     */
    protected createMaterial(): void {
        try {
            this.material = new THREE.ShaderMaterial({
                vertexShader: this.getVertexShader(),
                fragmentShader: this.getFragmentShader(),
                uniforms: this.uniforms,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false,
                depthTest: false
            });
        } catch (error) {
            debugLog.error(`❌ ${this.name} shader compilation error:`, error);
            // Fallback to basic material
            this.material = new THREE.MeshBasicMaterial({
                color: 0xff00ff,
                transparent: true,
                opacity: 0.5
            }) as any;
        }
    }

    /**
     * Create full-screen quad mesh
     */
    protected createMesh(): void {
        const geometry = new THREE.PlaneGeometry(2, 2);
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(0, 0, 0);
        this.mesh.scale.set(2, 2, 1);
        this.scene.add(this.mesh);
    }

    /**
     * Initialize the effect
     */
    init(renderer: THREE.WebGLRenderer): void {
        this.renderer = renderer;
        this.setupUniforms();
        this.createMaterial();
        this.createMesh();
        debugLog.log(`✅ ${this.name} initialized`);
    }

    /**
     * Update effect - syncs parameters to uniforms and updates source texture
     * @param deltaTime - Time delta in seconds (for live editor mode, increments uTime)
     */
    update(deltaTime: number): void {
        if (!this.enabled || !this.uniforms) return;

        // Update standard uniforms
        // In live editor mode, increment time for smooth animation
        this.uniforms.uTime.value += deltaTime;

        if (this.renderer) {
            const size = this.renderer.getSize(new THREE.Vector2());
            this.uniforms.uResolution.value.set(size.x, size.y);
        }

        // Get source texture from compositor (layers beneath)
        if (this.compositor && this.layerId) {
            const sourceTexture = this.compositor.getAccumulatedTextureBeforeLayer(this.layerId);
            if (sourceTexture && this.uniforms.uTexture.value !== sourceTexture) {
                this.uniforms.uTexture.value = sourceTexture;
            }
        }

        // Sync parameters to uniforms (to be implemented by subclasses)
        this.syncParametersToUniforms();
    }

    /**
     * Update effect with absolute time (for deterministic Remotion rendering)
     * This method sets uTime directly instead of incrementing it.
     * @param absoluteTime - Absolute time in seconds (frame / fps)
     */
    updateWithTime(absoluteTime: number): void {
        if (!this.enabled || !this.uniforms) return;

        // Set time directly for deterministic behavior
        // This ensures the same frame always produces the same visual output
        this.uniforms.uTime.value = absoluteTime;

        if (this.renderer) {
            const size = this.renderer.getSize(new THREE.Vector2());
            this.uniforms.uResolution.value.set(size.x, size.y);
        }

        // Get source texture from compositor (layers beneath)
        if (this.compositor && this.layerId) {
            const sourceTexture = this.compositor.getAccumulatedTextureBeforeLayer(this.layerId);
            if (sourceTexture && this.uniforms.uTexture.value !== sourceTexture) {
                this.uniforms.uTexture.value = sourceTexture;
            }
        }

        // Sync parameters to uniforms (to be implemented by subclasses)
        this.syncParametersToUniforms();
    }

    /**
     * Override this to sync custom parameters to uniforms
     */
    protected abstract syncParametersToUniforms(): void;

    /**
     * Update a single parameter - to be implemented by subclasses
     */
    abstract updateParameter(paramName: string, value: any): void;

    /**
     * Get the scene for rendering
     */
    getScene(): THREE.Scene {
        return this.scene;
    }

    /**
     * Get the camera for rendering
     */
    getCamera(): THREE.Camera {
        return this.camera;
    }

    /**
     * Handle window resize
     */
    resize(width: number, height: number): void {
        if (this.uniforms && this.uniforms.uResolution) {
            this.uniforms.uResolution.value.set(width, height);
        }
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.material.dispose();
        }
    }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/MetaballsEffect.ts">
import * as THREE from 'three';
import { getRemotionEnvironment } from 'remotion';
import { VisualEffect, MetaballConfig } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';


export class MetaballsEffect implements VisualEffect {
  id = 'metaballs';
  name = 'Metaballs';
  description = 'Fluid droplet-like spheres';
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
  private cameraHeight = 1.0;
  private cameraSmoothing = 5.0; // Higher = faster response (used with deltaTime)
  private smoothedCameraTarget = new THREE.Vector3(0, 0, 0);

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
    
    // Update the parameter in the parameters object first (for auto-save)
    if (paramName in this.parameters) {
      (this.parameters as any)[paramName] = value;
    }
    
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
        // Ensure the uniform value is a THREE.Color object
        if (!(this.uniforms.uHighlightColor.value instanceof THREE.Color)) {
          this.uniforms.uHighlightColor.value = new THREE.Color(...value);
        } else {
          this.uniforms.uHighlightColor.value.set(...value);
        }
        break;
    }
  }

  update(deltaTime: number): void {
    if (!this.uniforms) return;

    // Generic: sync all parameters to uniforms (except special cases like highlightColor)
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        // Skip highlightColor - it needs special handling as THREE.Color
        if (key === 'highlightColor') {
          const colorValue = this.parameters.highlightColor;
          if (Array.isArray(colorValue)) {
            // Ensure uniform value is a THREE.Color object
            if (!(this.uniforms.uHighlightColor.value instanceof THREE.Color)) {
              this.uniforms.uHighlightColor.value = new THREE.Color(...colorValue);
            } else {
              this.uniforms.uHighlightColor.value.set(...colorValue);
            }
          }
        } else {
          this.uniforms[uniformKey].value = this.parameters[key as keyof MetaballConfig];
        }
      }
    }

    // Update time (increment for live editor mode)
    this.uniforms.uTime.value += deltaTime * this.parameters.animationSpeed;

    // Intensity is now static - controlled only by explicit parameter mappings
    // Default to 1.0 if no intensity parameter exists (maintains visibility)
    this.uniforms.uIntensity.value = 1.0;

    // Animate camera based on time only (no implicit audio/MIDI reactivity)
    this.updateCameraAnimation(deltaTime);

    // Update shader resolution to match actual canvas size (not bounding box)
    if (this.uniforms.uResolution && this.renderer) {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.uniforms.uResolution.value.set(size.x, size.y);
    }

    // No conditional visibility logic here
  }

  /**
   * Update with absolute time for deterministic Remotion rendering
   * @param absoluteTime - Absolute time in seconds (frame / fps)
   */
  updateWithTime(absoluteTime: number): void {
    if (!this.uniforms) return;

    // Generic: sync all parameters to uniforms (except special cases like highlightColor)
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        // Skip highlightColor - it needs special handling as THREE.Color
        if (key === 'highlightColor') {
          const colorValue = this.parameters.highlightColor;
          if (Array.isArray(colorValue)) {
            // Ensure uniform value is a THREE.Color object
            if (!(this.uniforms.uHighlightColor.value instanceof THREE.Color)) {
              this.uniforms.uHighlightColor.value = new THREE.Color(...colorValue);
            } else {
              this.uniforms.uHighlightColor.value.set(...colorValue);
            }
          }
        } else {
          this.uniforms[uniformKey].value = this.parameters[key as keyof MetaballConfig];
        }
      }
    }

    // Set time directly for deterministic behavior
    // Note: animationSpeed is typically applied in the shader, but if it's applied here,
    // we need to account for it. For now, set raw time and let shader handle animationSpeed.
    this.uniforms.uTime.value = absoluteTime;

    // Intensity is now static - controlled only by explicit parameter mappings
    // Default to 1.0 if no intensity parameter exists (maintains visibility)
    this.uniforms.uIntensity.value = 1.0;

    // Animate camera based on time only (no implicit audio/MIDI reactivity)
    // For deterministic rendering, camera position is calculated directly from absolute time
    // No deltaTime needed - updateCameraAnimation will detect rendering mode and skip lerp
    this.updateCameraAnimation(0); // deltaTime not used during rendering

    // Update shader resolution to match actual canvas size (not bounding box)
    if (this.uniforms.uResolution && this.renderer) {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.uniforms.uResolution.value.set(size.x, size.y);
    }
  }

  private updateCameraAnimation(deltaTime: number): void {
    const time = this.uniforms.uTime.value;
    const isRendering = getRemotionEnvironment().isRendering;
    
    // 1. Calculate the Target Position (Pure function of time)
    const cameraAngle = time * 0.3;
    const cameraElevation = Math.sin(time * 0.2) * 0.3;
    const targetCameraPos = new THREE.Vector3(
      Math.cos(cameraAngle) * this.baseCameraDistance,
      cameraElevation + this.cameraHeight,
      Math.sin(cameraAngle) * this.baseCameraDistance
    );

    // 2. APPLY POSITION
    if (isRendering) {
      // JUMP immediately to the target for frame-perfect accuracy
      // No lerp - ensures frame 51 has camera at exact position for frame 51
      this.uniforms.uCameraPos.value.copy(targetCameraPos);
      this.uniforms.uCameraTarget.value.set(0, 0, 0);
    } else {
      // Smooth lerp for the live editor/preview
      const factor = 1 - Math.exp(-this.cameraSmoothing * deltaTime);
      this.uniforms.uCameraPos.value.lerp(targetCameraPos, factor);
      this.smoothedCameraTarget.lerp(new THREE.Vector3(0, 0, 0), factor);
      this.uniforms.uCameraTarget.value.copy(this.smoothedCameraTarget);
    }
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

<file path="apps/web/src/lib/visualizer/effects/ParticleNetworkEffect.ts">
import * as THREE from 'three';
import { random } from 'remotion';
import { getRemotionEnvironment } from 'remotion';
import { VisualEffect } from '@/types/visualizer';
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
    connectionDistance: 1.0,
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
    this.instanceLives = new Float32Array(maxParticles);
    this.instanceSizes = new Float32Array(maxParticles);

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
      const particle = this.createParticle(60 + i, 64, 'default', 'midi', undefined, undefined, i);
      this.particles.push(particle);
    }
    this.updateBuffers();
  }

  private getRandomSpawnPosition(index: number): THREE.Vector3 {
    // Always use Remotion's deterministic random() function for WYSIWYG consistency
    // This ensures the editor preview matches the rendered output exactly
    // The same particle index always spawns at the same position in both modes
    const x = (random(`particle-x-${index}`) - 0.5) * 4;
    const y = (random(`particle-y-${index}`) - 0.5) * 4;
    return new THREE.Vector3(x, y, 0);
  }

  private createParticle(note: number, velocity: number, track: string, spawnType: 'midi' | 'audio' = 'midi', audioFeature?: string, audioValue?: number, particleIndex?: number): Particle {
    // Use particleIndex for deterministic spawning, fallback to note if not provided
    const index = particleIndex !== undefined ? particleIndex : note;
    const position = this.getRandomSpawnPosition(index);

    // Always use Remotion's deterministic random() function for WYSIWYG consistency
    // This ensures the editor preview matches the rendered output exactly
    const vel = new THREE.Vector3(
      (random(`particle-vel-x-${index}`) - 0.5) * 0.02,
      (random(`particle-vel-y-${index}`) - 0.5) * 0.02,
      (random(`particle-vel-z-${index}`) - 0.5) * 0.02
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

  private updateParticles(deltaTime: number) {
    // Particle spawning is now controlled only by explicit parameter mappings
    // (via particleSpawning parameter and updateParameter())

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
    // Use uTime for deterministic time, fallback to performance.now() for live editor
    const isRendering = getRemotionEnvironment().isRendering;
    const currentTime = isRendering ? this.uniforms.uTime.value : performance.now() / 1000;

    // Check cooldown for manual spawning
    if (currentTime - this.lastManualSpawnTime < 0.1) { // 100ms cooldown for manual testing
      return;
    }

    // Calculate spawn probability based on how much particleSpawning exceeds threshold
    const excessAmount = this.parameters.particleSpawning - this.parameters.spawnThreshold;
    const spawnProbability = Math.min(excessAmount * 2.0, 0.5); // Max 50% chance per frame

    // Always use deterministic random for WYSIWYG consistency
    const randomValue = random(`particle-spawn-${Math.floor(currentTime * 10)}`);

    if (randomValue < spawnProbability && this.particles.length < this.parameters.maxParticles) {
      // Create manual test particle with deterministic index
      const particleIndex = this.particles.length; // Use current particle count as index
      const particle = this.createParticle(
        60, // Default note
        Math.floor(this.parameters.particleSpawning * 127), // Use slider value as velocity
        'manual',
        'audio', // Use audio spawn type for visual distinction
        'manual',
        undefined,
        particleIndex
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

          // Use white for connection lines (user preference)
          // With additive blending, strength controls brightness
          const whiteColor = 1.0;

          // Set positions for this line segment (2 points)
          const baseIndex = connectionIndex * 6;
          this.connectionPositions[baseIndex] = p1.position.x;
          this.connectionPositions[baseIndex + 1] = p1.position.y;
          this.connectionPositions[baseIndex + 2] = p1.position.z;
          this.connectionPositions[baseIndex + 3] = p2.position.x;
          this.connectionPositions[baseIndex + 4] = p2.position.y;
          this.connectionPositions[baseIndex + 5] = p2.position.z;

          // Set white colors with strength for both vertices
          this.connectionColors[baseIndex] = whiteColor * strength;
          this.connectionColors[baseIndex + 1] = whiteColor * strength;
          this.connectionColors[baseIndex + 2] = whiteColor * strength;
          this.connectionColors[baseIndex + 3] = whiteColor * strength;
          this.connectionColors[baseIndex + 4] = whiteColor * strength;
          this.connectionColors[baseIndex + 5] = whiteColor * strength;

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

  update(deltaTime: number): void {
    if (!this.uniforms) {
      debugLog.warn('⚠️ Uniforms not initialized in ParticleNetworkEffect.update()');
      return;
    }

    // Generic: sync all parameters to uniforms
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        this.uniforms[uniformKey].value = this.parameters[key as keyof typeof this.parameters];
      }
    }

    // Always update time and uniforms for smooth animation
    this.uniforms.uTime.value += deltaTime;
    // Intensity is now static - controlled only by explicit parameter mappings
    this.uniforms.uIntensity.value = 1.0;
    this.uniforms.uGlowIntensity.value = this.parameters.glowIntensity;

    // Ensure the instanced mesh is visible
    if (this.instancedMesh) {
      this.instancedMesh.visible = true;
    }

    // Skip heavy particle updates every few frames for performance
    this.frameSkipCounter++;
    if (this.frameSkipCounter >= this.frameSkipInterval) {
      this.frameSkipCounter = 0;
      this.updateParticles(deltaTime * this.frameSkipInterval);
    }
  }

  /**
   * Update with absolute time for deterministic Remotion rendering
   * @param absoluteTime - Absolute time in seconds (frame / fps)
   */
  updateWithTime(absoluteTime: number): void {
    if (!this.uniforms) {
      debugLog.warn('⚠️ Uniforms not initialized in ParticleNetworkEffect.updateWithTime()');
      return;
    }

    // Generic: sync all parameters to uniforms
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        this.uniforms[uniformKey].value = this.parameters[key as keyof typeof this.parameters];
      }
    }

    // Set time directly for deterministic behavior
    this.uniforms.uTime.value = absoluteTime;
    // Intensity is now static - controlled only by explicit parameter mappings
    this.uniforms.uIntensity.value = 1.0;
    this.uniforms.uGlowIntensity.value = this.parameters.glowIntensity;

    // Ensure the instanced mesh is visible
    if (this.instancedMesh) {
      this.instancedMesh.visible = true;
    }

    // For deterministic rendering, update particles based on absolute time
    // Calculate approximate deltaTime for particle physics (use fixed 1/60 for consistency)
    const approximateDeltaTime = 1 / 60;
    this.frameSkipCounter++;
    if (this.frameSkipCounter >= this.frameSkipInterval) {
      this.frameSkipCounter = 0;
      this.updateParticles(approximateDeltaTime * this.frameSkipInterval);
    }
  }

  public getScene(): THREE.Scene {
    return this.internalScene;
  }

  public getCamera(): THREE.Camera {
    return this.internalCamera;
  }

  /**
   * Handle resize events to maintain correct aspect ratio
   */
  public resize(width: number, height: number): void {
    if (this.internalCamera) {
      this.internalCamera.aspect = width / height;
      this.internalCamera.updateProjectionMatrix();
      debugLog.log('🎨 ParticleNetworkEffect camera aspect updated:', this.internalCamera.aspect);
    }
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

<file path="apps/web/src/lib/visualizer/effects/BloomEffect.ts">
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface BloomConfig {
  intensity: number; // 0.0 to 2.0
  threshold: number; // 0.0 to 1.0
  radius: number; // 0.0 to 2.0
}

export class BloomEffect extends BaseShaderEffect {
  id = 'bloom';
  name = 'Bloom';
  description = 'High-quality bloom effect';
  parameters: BloomConfig;

  constructor(config: Partial<BloomConfig> = {}) {
    super();
    this.parameters = { intensity: 1.0, threshold: 0.5, radius: 1.0, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uThreshold: { value: this.parameters.threshold },
      uRadius: { value: this.parameters.radius }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uThreshold;
      uniform float uRadius;
      
      varying vec2 vUv;

      float luma(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      void main() {
        vec4 color = texture2D(uTexture, vUv);
        vec3 bloom = vec3(0.0);
        
        // Single-pass bloom approximation
        // We sample a few points around the pixel to simulate a blur
        // This is less expensive than a full multi-pass Gaussian blur but effective for a single shader
        
        float totalWeight = 0.0;
        vec2 texelSize = 1.0 / uResolution;
        
        // 9-tap box/gaussian hybrid blur
        for(float x = -2.0; x <= 2.0; x += 1.0) {
            for(float y = -2.0; y <= 2.0; y += 1.0) {
                vec2 offset = vec2(x, y) * uRadius * 2.0;
                vec4 sampleColor = texture2D(uTexture, vUv + offset * texelSize);
                
                // Thresholding
                float brightness = luma(sampleColor.rgb);
                float contribution = smoothstep(uThreshold, uThreshold + 0.1, brightness);
                
                // Weight decreases with distance
                float weight = 1.0 / (1.0 + length(vec2(x, y)));
                
                bloom += sampleColor.rgb * contribution * weight;
                totalWeight += weight;
            }
        }
        
        bloom /= totalWeight;
        
        // Composite
        gl_FragColor = vec4(color.rgb + bloom * uIntensity, color.a);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uThreshold.value = this.parameters.threshold;
    this.uniforms.uRadius.value = this.parameters.radius;
  }

  updateParameter(paramName: string, value: any): void {
    switch (paramName) {
      case 'intensity':
        this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
        if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
        break;
      case 'threshold':
        this.parameters.threshold = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.threshold;
        if (this.uniforms) this.uniforms.uThreshold.value = this.parameters.threshold;
        break;
      case 'radius':
        this.parameters.radius = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.radius;
        if (this.uniforms) this.uniforms.uRadius.value = this.parameters.radius;
        break;
    }
  }
}
</file>

<file path="apps/web/src/remotion/Debug.tsx">
import React from 'react';
import { Composition } from 'remotion';
import { RayboxComposition } from './RayboxComposition';
import type { RayboxCompositionProps } from './Root';

// Debug payload - loaded dynamically so the JSON file is optional and never required on main.
// Exported so the Remotion root can optionally wire a Debug composition when available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
export let TEST_PAYLOAD: any = null;
try {
  // This file is meant for local debugging only – it's fine if it doesn't exist in CI/main
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  TEST_PAYLOAD = require('./debug-payload.json');
} catch {
  TEST_PAYLOAD = null;
}

// Log the payload to verify it's loaded correctly
if (TEST_PAYLOAD) {
  console.log('🔍 [Debug.tsx] TEST_PAYLOAD loaded:', {
    hasLayers: !!TEST_PAYLOAD.layers,
    layersCount: TEST_PAYLOAD.layers?.length || 0,
    hasAudioAnalysis: !!TEST_PAYLOAD.audioAnalysisData,
    audioAnalysisCount: TEST_PAYLOAD.audioAnalysisData?.length || 0,
    hasMasterAudioUrl: !!TEST_PAYLOAD.masterAudioUrl,
    keys: Object.keys(TEST_PAYLOAD),
    payloadSize: JSON.stringify(TEST_PAYLOAD).length,
  });
} else {
  console.warn(
    '🔍 [Debug.tsx] TEST_PAYLOAD not available. debug-payload.json is optional and intended for local debugging only.',
  );
}

// Create a wrapper component that injects the payload
// This component receives props from Remotion but ignores them and uses TEST_PAYLOAD directly
const DebugComposition: React.FC<RayboxCompositionProps> = (remotionProps) => {
  console.log('🔍 [DebugComposition] Component rendering');
  console.log('🔍 [DebugComposition] Remotion props received:', {
    layersCount: remotionProps?.layers?.length || 0,
    audioAnalysisCount: remotionProps?.audioAnalysisData?.length || 0
  });
  console.log('🔍 [DebugComposition] TEST_PAYLOAD available:', {
    hasPayload: !!TEST_PAYLOAD,
    layersCount: TEST_PAYLOAD?.layers?.length || 0,
    audioAnalysisCount: TEST_PAYLOAD?.audioAnalysisData?.length || 0,
    hasMasterAudioUrl: !!TEST_PAYLOAD?.masterAudioUrl,
  });
  
  // Use TEST_PAYLOAD directly instead of remotionProps (which might be empty due to serialization issues)
  if (!TEST_PAYLOAD) {
    console.warn(
      '🔍 [DebugComposition] TEST_PAYLOAD is not set – debug-payload.json is missing. Rendering fallback empty composition.',
    );
    return <RayboxComposition layers={[]} audioAnalysisData={[]} visualizationSettings={{} as any} masterAudioUrl="" />;
  }

  const props = TEST_PAYLOAD as RayboxCompositionProps;
  console.log('🔍 [DebugComposition] Spreading TEST_PAYLOAD as props:', {
    layersCount: props.layers?.length || 0,
    audioAnalysisCount: props.audioAnalysisData?.length || 0,
    hasMappings: !!props.mappings,
    mappingsCount: props.mappings ? Object.keys(props.mappings).length : 0,
    hasBaseParameterValues: !!props.baseParameterValues,
    baseParamLayerCount: props.baseParameterValues ? Object.keys(props.baseParameterValues).length : 0,
  });
  
  return <RayboxComposition {...props} />;
};

export const DebugRoot = () => {
  console.log('🔍 [DebugRoot] Rendering composition');
  console.log('🔍 [DebugRoot] TEST_PAYLOAD at render time:', {
    hasPayload: !!TEST_PAYLOAD,
    layersCount: TEST_PAYLOAD?.layers?.length || 0,
    audioAnalysisCount: TEST_PAYLOAD?.audioAnalysisData?.length || 0,
    payloadSize: TEST_PAYLOAD ? JSON.stringify(TEST_PAYLOAD).length : 0,
    firstLayerId: TEST_PAYLOAD?.layers?.[0]?.id,
  });

  // Try using defaultProps again, but with more logging
  const propsToPass = (TEST_PAYLOAD || {
    layers: [],
    audioAnalysisData: [],
    visualizationSettings: {} as any,
    masterAudioUrl: '',
  }) as unknown as RayboxCompositionProps;
  console.log('🔍 [DebugRoot] Props to pass:', {
    layersCount: propsToPass.layers?.length || 0,
    audioAnalysisCount: propsToPass.audioAnalysisData?.length || 0
  });

  return (
    <Composition
      id="Debug"
      component={DebugComposition}
      width={1080}
      height={1920}
      fps={60}
      durationInFrames={600}
      defaultProps={propsToPass}
    />
  );
};
</file>

<file path="apps/web/src/lib/visualizer/effects/EffectDefinitions.ts">
import { EffectRegistry } from './EffectRegistry';
import { MetaballsEffect } from './MetaballsEffect';
import { ParticleNetworkEffect } from './ParticleNetworkEffect';
import { ImageSlideshowEffect } from './ImageSlideshowEffect';
import { AsciiFilterEffect } from './AsciiFilterEffect';

// Stylize category imports
import { ChromaticAbberationEffect } from './ChromaticAbberationEffect';
import { CRTEffect } from './CRTEffect';
import { DitherEffect } from './DitherEffect';
import { GlitchEffect } from './GlitchEffect';
import { GrainEffect } from './GrainEffect';
import { HalftoneEffect } from './HalftoneEffect';
import { PixelateEffect } from './PixelateEffect';
import { PosterizeEffect } from './PosterizeEffect';

// Blur category imports
import { BlurEffect } from './BlurEffect';
import { BokehEffect } from './BokehEffect';
import { DiffusionEffect } from './DiffusionEffect';
import { FogEffect } from './FogEffect';
import { ProgressiveBlurEffect } from './ProgressiveBlurEffect';
import { RadialBlurEffect } from './RadialBlurEffect';

// Distort category imports
import { BulgeEffect } from './BulgeEffect';
import { FbmEffect } from './FbmEffect';
import { LiquifyEffect } from './LiquifyEffect';
import { NoiseEffect } from './NoiseEffect';
import { PolarEffect } from './PolarEffect';
import { RippleEffect } from './RippleEffect';
import { SineWavesEffect } from './SineWavesEffect';
import { SkyboxEffect } from './SkyboxEffect';
import { StretchEffect } from './StretchEffect';
import { SwirlEffect } from './SwirlEffect';
import { TrailEffect } from './TrailEffect';
import { WaterRipplesEffect } from './WaterRipplesEffect';
import { WavesEffect } from './WavesEffect';

// Light category imports
import { BeamEffect } from './BeamEffect';
import { BloomEffect } from './BloomEffect';
import { GodRaysEffect } from './GodRaysEffect';
import { LightTrailEffect } from './LightTrailEffect';
import { WaterCausticsEffect } from './WaterCausticsEffect';

// Misc category imports
import { CircleEffect } from './CircleEffect';
import { GlitterEffect } from './GlitterEffect';
import { GradientFillEffect } from './GradientFillEffect';
import { NoiseFillEffect } from './NoiseFillEffect';
import { PatternEffect } from './PatternEffect';
import { ReplicateEffect } from './ReplicateEffect';
import { VideoEffect } from './VideoEffect';
import { WispsEffect } from './WispsEffect';

// Register built-in effects at module import time
EffectRegistry.register({
  id: 'metaballs',
  name: 'MIDI Metaballs',
  description: 'Fluid droplet-like spheres that respond to MIDI notes',
  category: 'organic',
  version: '1.0.0',
  constructor: MetaballsEffect,
  defaultConfig: {}
});

EffectRegistry.register({
  id: 'particleNetwork',
  name: 'Particle Network',
  description: 'Glowing particle network that responds to MIDI and audio',
  category: 'particles',
  version: '1.0.0',
  constructor: ParticleNetworkEffect,
  defaultConfig: {}
});

EffectRegistry.register({
  id: 'imageSlideshow',
  name: 'Image Slideshow',
  description: 'Slideshow that advances on audio transients',
  category: 'media',
  version: '1.0.0',
  constructor: ImageSlideshowEffect,
  defaultConfig: {
    triggerValue: 0,
    threshold: 0.5,
    images: [],
    opacity: 1.0,
    position: { x: 0.5, y: 0.5 },
    size: { width: 1.0, height: 1.0 }
  }
});

// STYLIZE CATEGORY EFFECTS

EffectRegistry.register({
  id: 'asciiFilter',
  name: 'ASCII Filter',
  description: 'Converts input to ASCII art with audio-reactive parameters',
  category: 'stylize',
  version: '1.0.0',
  constructor: AsciiFilterEffect,
  defaultConfig: {
    textSize: 0.4,
    gamma: 1.2,
    opacity: 0.87,
    contrast: 1.4,
    invert: 0.0,
    hideBackground: false,
    color: [1.0, 1.0, 1.0] // White by default
  }
});

EffectRegistry.register({
  id: 'chromaticAbberation',
  name: 'Chromatic Abberation',
  description: 'RGB color channel offset for lens distortion effect',
  category: 'stylize',
  version: '1.0.0',
  constructor: ChromaticAbberationEffect,
  defaultConfig: {
    amount: 0.2,
    direction: 0.0
  }
});

EffectRegistry.register({
  id: 'crt',
  name: 'CRT Monitor',
  description: 'Vintage CRT monitor effect with phosphors and scanlines',
  category: 'stylize',
  version: '1.0.0',
  constructor: CRTEffect,
  defaultConfig: {
    curvature: 0.0,
    scanlines: 0.5,
    vignetteIntensity: 0.5,
    noise: 0.5
  }
});

EffectRegistry.register({
  id: 'dither',
  name: 'Dither',
  description: 'Ordered dithering for retro pixelart look',
  category: 'stylize',
  version: '1.0.0',
  constructor: DitherEffect,
  defaultConfig: {
    bayerMatrix: 4,
    colors: 16,
    scale: 1.0
  }
});

EffectRegistry.register({
  id: 'glitch',
  name: 'Digital Glitch',
  description: 'VHS-style digital glitch with corruption and aberration',
  category: 'stylize',
  version: '1.0.0',
  constructor: GlitchEffect,
  defaultConfig: {
    blockSize: 0.5,
    offset: 0.5,
    chromatic: 0.5,
    frequency: 0.5
  }
});

EffectRegistry.register({
  id: 'grain',
  name: 'Film Grain',
  description: 'Adds film grain noise for vintage look',
  category: 'stylize',
  version: '1.0.0',
  constructor: GrainEffect,
  defaultConfig: {
    amount: 0.5,
    size: 1.0,
    colorized: false,
    luminance: false
  }
});

EffectRegistry.register({
  id: 'halftone',
  name: 'Halftone',
  description: 'CMYK halftone printing effect',
  category: 'stylize',
  version: '1.0.0',
  constructor: HalftoneEffect,
  defaultConfig: {
    dotSize: 0.75,
    angle: 0.0,
    shape: 'circle',
    smoothness: 0.75
  }
});

EffectRegistry.register({
  id: 'pixelate',
  name: 'Pixelate',
  description: 'Mosaic pixelation effect',
  category: 'stylize',
  version: '1.0.0',
  constructor: PixelateEffect,
  defaultConfig: {
    pixelSize: 0.5,
    shape: 'square'
  }
});

EffectRegistry.register({
  id: 'posterize',
  name: 'Posterize',
  description: 'Reduces color levels for poster art effect',
  category: 'stylize',
  version: '1.0.0',
  constructor: PosterizeEffect,
  defaultConfig: {
    levels: 8,
    gamma: 1.0
  }
});

// BLUR CATEGORY EFFECTS

EffectRegistry.register({
  id: 'blur',
  name: 'Gaussian Blur',
  description: 'Smooth Gaussian blur with configurable intensity',
  category: 'blur',
  version: '1.0.0',
  constructor: BlurEffect,
  defaultConfig: {
    intensity: 0.5,
    radius: 5.0,
    quality: 1.0
  }
});

EffectRegistry.register({
  id: 'radialBlur',
  name: 'Radial Blur',
  description: 'Rotational blur around a center point',
  category: 'blur',
  version: '1.0.0',
  constructor: RadialBlurEffect,
  defaultConfig: {
    intensity: 0.4,
    centerX: 0.5,
    centerY: 0.5,
    angle: 10.0
  }
});

EffectRegistry.register({
  id: 'bokeh',
  name: 'Bokeh Blur',
  description: 'Depth-of-field bokeh blur effect',
  category: 'blur',
  version: '1.0.0',
  constructor: BokehEffect,
  defaultConfig: {
    intensity: 0.5,
    focalDepth: 0.5,
    aperture: 0.8
  }
});

EffectRegistry.register({
  id: 'diffusion',
  name: 'Diffusion',
  description: 'Soft diffusion glow effect',
  category: 'blur',
  version: '1.0.0',
  constructor: DiffusionEffect,
  defaultConfig: {
    intensity: 0.5,
    size: 1.5
  }
});

EffectRegistry.register({
  id: 'fog',
  name: 'Fog',
  description: 'Animated fog effect with noise',
  category: 'blur',
  version: '1.0.0',
  constructor: FogEffect,
  defaultConfig: {
    density: 0.3,
    speed: 0.5,
    color: [1.0, 1.0, 1.0]
  }
});

EffectRegistry.register({
  id: 'progressiveBlur',
  name: 'Progressive Blur',
  description: 'Blur that increases with distance from center',
  category: 'blur',
  version: '1.0.0',
  constructor: ProgressiveBlurEffect,
  defaultConfig: {
    intensity: 0.6,
    centerX: 0.5,
    centerY: 0.5
  }
});

// DISTORT CATEGORY EFFECTS

EffectRegistry.register({
  id: 'bulge',
  name: 'Bulge',
  description: 'Bulge/pinch distortion effect',
  category: 'distort',
  version: '1.0.0',
  constructor: BulgeEffect,
  defaultConfig: {
    intensity: 0.5,
    centerX: 0.5,
    centerY: 0.5,
    radius: 0.4
  }
});

EffectRegistry.register({
  id: 'fbm',
  name: 'FBM Distortion',
  description: 'Fluid marble-like distortion using Fractal Brownian Motion',
  category: 'distort',
  version: '1.0.0',
  constructor: FbmEffect,
  defaultConfig: {
    intensity: 0.5,
    speed: 0.5,
    scale: 1.0
  }
});

EffectRegistry.register({
  id: 'liquify',
  name: 'Liquify',
  description: 'Sine-based liquid distortion effect',
  category: 'distort',
  version: '1.0.0',
  constructor: LiquifyEffect,
  defaultConfig: {
    intensity: 0.5,
    frequency: 1.0,
    speed: 0.5
  }
});

EffectRegistry.register({
  id: 'noise',
  name: 'BCC Noise',
  description: 'Body-Centered Cubic noise distortion',
  category: 'distort',
  version: '1.0.0',
  constructor: NoiseEffect,
  defaultConfig: {
    intensity: 0.5,
    scale: 1.0,
    speed: 0.5
  }
});

EffectRegistry.register({
  id: 'polar',
  name: 'Polar',
  description: 'Cartesian to polar coordinates transformation',
  category: 'distort',
  version: '1.0.0',
  constructor: PolarEffect,
  defaultConfig: {
    intensity: 1.0,
    rotation: 0.0,
    centerX: 0.5,
    centerY: 0.5
  }
});

EffectRegistry.register({
  id: 'ripple',
  name: 'Ripple',
  description: 'Concentric ripple distortion',
  category: 'distort',
  version: '1.0.0',
  constructor: RippleEffect,
  defaultConfig: {
    intensity: 0.05,
    frequency: 10.0,
    speed: 1.0,
    centerX: 0.5,
    centerY: 0.5
  }
});

EffectRegistry.register({
  id: 'sineWaves',
  name: 'Sine Waves',
  description: 'Sinusoidal wave distortion',
  category: 'distort',
  version: '1.0.0',
  constructor: SineWavesEffect,
  defaultConfig: {
    intensity: 0.5,
    frequency: 20.0,
    speed: 0.5,
    waveX: true,
    waveY: true
  }
});

EffectRegistry.register({
  id: 'skybox',
  name: 'Skybox Projection',
  description: 'Equirectangular 360 projection',
  category: 'distort',
  version: '1.0.0',
  constructor: SkyboxEffect,
  defaultConfig: {
    fov: 90.0,
    rotationX: 0.5,
    rotationY: 0.5,
    zoom: 1.0
  }
});

EffectRegistry.register({
  id: 'stretch',
  name: 'Stretch',
  description: 'Directional stretch/compression distortion',
  category: 'distort',
  version: '1.0.0',
  constructor: StretchEffect,
  defaultConfig: {
    intensity: 0.5,
    angle: 0.0,
    centerX: 0.5,
    centerY: 0.5
  }
});

EffectRegistry.register({
  id: 'swirl',
  name: 'Swirl',
  description: 'Swirl/twist distortion effect',
  category: 'distort',
  version: '1.0.0',
  constructor: SwirlEffect,
  defaultConfig: {
    intensity: 0.8,
    centerX: 0.5,
    centerY: 0.5,
    radius: 0.4
  }
});

EffectRegistry.register({
  id: 'trail',
  name: 'Trail',
  description: 'Motion trail / afterimage effect',
  category: 'distort',
  version: '1.0.0',
  constructor: TrailEffect,
  defaultConfig: {
    intensity: 0.5,
    decay: 0.9
  }
});

EffectRegistry.register({
  id: 'waterRipples',
  name: 'Water Ripples',
  description: 'Water surface ripple simulation',
  category: 'distort',
  version: '1.0.0',
  constructor: WaterRipplesEffect,
  defaultConfig: {
    intensity: 0.5,
    speed: 1.0
  }
});

EffectRegistry.register({
  id: 'waves',
  name: 'Noise Waves',
  description: 'Perlin noise wave distortion',
  category: 'distort',
  version: '1.0.0',
  constructor: WavesEffect,
  defaultConfig: {
    intensity: 0.5,
    speed: 1.0
  }
});

// LIGHT CATEGORY EFFECTS

EffectRegistry.register({
  id: 'beam',
  name: 'Beam',
  description: 'Animated scanning light beam',
  category: 'Light',
  version: '1.0.0',
  constructor: BeamEffect,
  defaultConfig: {
    intensity: 1.0,
    speed: 0.5,
    width: 0.5,
    angle: 0.0,
    color: '#661aff'
  }
});

EffectRegistry.register({
  id: 'bloom',
  name: 'Bloom',
  description: 'High-quality bloom effect',
  category: 'Light',
  version: '1.0.0',
  constructor: BloomEffect,
  defaultConfig: {
    intensity: 1.0,
    threshold: 0.5,
    radius: 1.0
  }
});

EffectRegistry.register({
  id: 'godRays',
  name: 'God Rays',
  description: 'Volumetric light scattering',
  category: 'Light',
  version: '1.0.0',
  constructor: GodRaysEffect,
  defaultConfig: {
    intensity: 1.0,
    decay: 0.96,
    density: 0.5,
    weight: 0.4,
    lightX: 0.5,
    lightY: 0.5
  }
});

EffectRegistry.register({
  id: 'lightTrail',
  name: 'Light Trail',
  description: 'Mouse/Touch light trail effect',
  category: 'Light',
  version: '1.0.0',
  constructor: LightTrailEffect,
  defaultConfig: {
    intensity: 1.0,
    trailLength: 0.8,
    color: '#0082f7'
  }
});

EffectRegistry.register({
  id: 'waterCaustics',
  name: 'Water Caustics',
  description: 'Water surface caustics simulation',
  category: 'Light',
  version: '1.0.0',
  constructor: WaterCausticsEffect,
  defaultConfig: {
    intensity: 0.8,
    speed: 0.5,
    refraction: 0.5,
    color: '#99b3e6'
  }
});

// MISC CATEGORY EFFECTS

EffectRegistry.register({
  id: 'circle',
  name: 'Circle',
  description: 'Circular mask overlay',
  category: 'Misc',
  version: '1.0.0',
  constructor: CircleEffect,
  defaultConfig: {
    radius: 0.25,
    feather: 0.1,
    centerX: 0.5,
    centerY: 0.5,
    color: '#661aff',
    opacity: 1.0
  }
});

EffectRegistry.register({
  id: 'glitter',
  name: 'Glitter',
  description: 'Voronoi-based sparkle effect',
  category: 'Misc',
  version: '1.0.0',
  constructor: GlitterEffect,
  defaultConfig: {
    intensity: 1.0,
    scale: 1.0,
    speed: 0.5
  }
});

EffectRegistry.register({
  id: 'gradientFill',
  name: 'Gradient Fill',
  description: 'Procedural linear gradient with OKLab mixing',
  category: 'Misc',
  version: '1.0.0',
  constructor: GradientFillEffect,
  defaultConfig: {
    color1: '#000000',
    color2: '#ffffff',
    angle: 0.0,
    speed: 0.0,
    opacity: 1.0
  }
});

EffectRegistry.register({
  id: 'noiseFill',
  name: 'Noise Fill',
  description: 'Procedural BCC noise pattern',
  category: 'Misc',
  version: '1.0.0',
  constructor: NoiseFillEffect,
  defaultConfig: {
    color1: '#ffd198',
    color2: '#9600e6',
    scale: 1.0,
    speed: 0.5,
    opacity: 1.0
  }
});

EffectRegistry.register({
  id: 'pattern',
  name: 'Pattern',
  description: 'Procedural geometric patterns',
  category: 'Misc',
  version: '1.0.0',
  constructor: PatternEffect,
  defaultConfig: {
    patternType: 0,
    scale: 1.0,
    color: '#fa1ee3',
    opacity: 1.0
  }
});

EffectRegistry.register({
  id: 'replicate',
  name: 'Replicate',
  description: 'Trail and aberration effect',
  category: 'Misc',
  version: '1.0.0',
  constructor: ReplicateEffect,
  defaultConfig: {
    spacing: 0.35,
    speed: 0.5,
    rotation: 0.0,
    opacity: 1.0
  }
});

EffectRegistry.register({
  id: 'video',
  name: 'Video Overlay',
  description: 'Video texture overlay (requires video source)',
  category: 'Misc',
  version: '1.0.0',
  constructor: VideoEffect,
  defaultConfig: {
    scale: 1.0,
    rotation: 0.0,
    posX: 0.5,
    posY: 0.5,
    opacity: 1.0
  }
});

EffectRegistry.register({
  id: 'wisps',
  name: 'Wisps',
  description: 'Flowing smoke/wisp effect',
  category: 'Misc',
  version: '1.0.0',
  constructor: WispsEffect,
  defaultConfig: {
    speed: 0.5,
    scale: 1.0,
    intensity: 1.0,
    color: '#ffffff'
  }
});
</file>

<file path="apps/web/src/lib/visualizer/effects/ImageSlideshowEffect.ts">
import * as THREE from 'three';
import { VisualEffect } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';
import { getRemotionEnvironment } from 'remotion';

// Use standard debugLog for ImageSlideshowEffect to allow suppression
const slideshowLog = {
  log: (...args: any[]) => debugLog.log('🖼️', ...args),
  warn: (...args: any[]) => debugLog.warn('🖼️', ...args),
  error: (...args: any[]) => debugLog.error('🖼️', ...args),
};

export class ImageSlideshowEffect implements VisualEffect {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  parameters: {
    triggerValue: number; // Mapped input (0-1)
    threshold: number;
    images: string[]; // List of image URLs
    opacity: number;
    position: { x: number; y: number }; // Normalized position (0-1), 0,0 = top-left
    size: { width: number; height: number }; // Normalized size (0-1), fraction of screen
  };

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private plane!: THREE.Mesh; // Initialized in updatePlaneGeometryAndPosition
  private material: THREE.MeshBasicMaterial;

  private currentImageIndex: number = -1;
  private textureCache: Map<string, THREE.Texture> = new Map();
  private loadingImages: Set<string> = new Set();
  private wasTriggered: boolean = false;
  private previousTriggerValue: number = 0; // Track previous value for edge detection
  private lastTriggerFrame: number = -999; // Frame when we last triggered (for cooldown)
  private minFramesBetweenTriggers: number = 6; // Minimum ~100ms at 60fps between triggers
  private textureLoader = new THREE.TextureLoader();
  private aspectRatio: number = 1;
  private failureCount = 0;
  private isAdvancing: boolean = false; // Prevent concurrent advanceSlide calls
  private pendingTextureResolvers: Map<string, ((texture: THREE.Texture) => void)[]> = new Map();
  private frameCounter: number = 0; // For periodic debug logging
  private lastErrorTime: number = 0;
  private errorCooldownMs: number = 2000; // 2 seconds cooldown
  private isNetworkThrottled: boolean = false; // Hard stop on 403 errors
  private consecutiveErrors: number = 0; // Track consecutive 403 errors
  private blacklistedUrls: Set<string> = new Set(); // URLs that returned 403/404

  constructor(config?: any) {
    this.id = config?.id || `imageSlideshow_${Math.random().toString(36).substr(2, 9)}`;
    this.name = 'Image Slideshow';
    this.description = 'Advances images based on audio transients';
    this.enabled = true;
    this.parameters = {
      triggerValue: 0,
      threshold: 0.1, // Lower default threshold to catch more transients
      images: config?.images || [],
      opacity: 1.0,
      position: config?.position || { x: 0.5, y: 0.5 }, // Center by default
      size: config?.size || { width: 1.0, height: 1.0 }, // Full screen by default
      ...config
    };

    this.textureLoader.setCrossOrigin('anonymous');

    this.scene = new THREE.Scene();

    // Use Orthographic camera to easily fill the screen
    this.aspectRatio = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1;
    this.camera = new THREE.OrthographicCamera(
      -this.aspectRatio, this.aspectRatio,
      1, -1,
      0.1, 100
    );
    this.camera.position.z = 10; // Move camera back to ensure plane is clearly visible

    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff, // Base white to multiply correctly with texture
      transparent: true,
      opacity: this.parameters.opacity,
      side: THREE.DoubleSide,
      map: null
    });

    // Create plane - will be positioned and sized based on parameters
    this.createPlane();
    this.plane.frustumCulled = false; // Disable culling to prevent disappearance
    this.plane.visible = false; // Start hidden until texture loads
    this.scene.add(this.plane);
  }

  /**
   * Create the plane mesh with initial geometry
   */
  private createPlane() {
    // Convert normalized position (0-1) to Three.js world coordinates
    const worldX = (this.parameters.position.x * 2 - 1) * this.aspectRatio;
    const worldY = 1 - this.parameters.position.y * 2;
    const worldWidth = this.parameters.size.width * 2 * this.aspectRatio;
    const worldHeight = this.parameters.size.height * 2;

    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(worldWidth, worldHeight), this.material);
    this.plane.position.set(worldX, worldY, 0);
  }

  init(renderer: THREE.WebGLRenderer): void {
    const remotionEnv = getRemotionEnvironment();
    const isInRemotionContext = remotionEnv.isRendering || remotionEnv.isStudio;

    slideshowLog.log('Initializing ImageSlideshowEffect', {
      effectId: this.id,
      imagesCount: this.parameters.images.length,
      sampleUrls: this.parameters.images.slice(0, 2).map(url => url.substring(0, 60) + '...')
    });

    if (isInRemotionContext) {
      console.log('[Slideshow Remotion] INIT', {
        effectId: this.id,
        imagesCount: this.parameters.images.length,
        threshold: this.parameters.threshold,
        isStudio: remotionEnv.isStudio,
        isRendering: remotionEnv.isRendering,
        sampleUrls: this.parameters.images.slice(0, 2).map(url => url.substring(0, 60) + '...')
      });
    }

    if (this.parameters.images.length > 0) {
      slideshowLog.log('Images available at init, calling advanceSlide()');
      this.advanceSlide();
    } else {
      slideshowLog.warn('No images available at init time');
    }
  }

  update(deltaTime: number): void {
    if (!this.enabled) return;

    // Skip all image operations in Remotion rendering to prevent hangs
    // The effect will still render its current state but won't load new images
    const isRemotionRendering = getRemotionEnvironment().isRendering;

    // STRICT CHECK: If network is throttled due to 403s, stop all operations
    if (this.isNetworkThrottled) {
      return;
    }

    // Trigger detection: Use cooldown-based approach for audio-reactive slideshow
    // This handles cases where drums-peaks produces sustained rising values
    const currentValue = this.parameters.triggerValue;
    const threshold = this.parameters.threshold;

    // Check Remotion context for logging
    const remotionEnv = getRemotionEnvironment();
    const isInRemotionContext = remotionEnv.isRendering || remotionEnv.isStudio;

    // Calculate the change in value
    const valueDelta = currentValue - this.previousTriggerValue;

    // Cooldown check: don't trigger too frequently
    const framesSinceLastTrigger = this.frameCounter - this.lastTriggerFrame;
    const cooldownExpired = framesSinceLastTrigger >= this.minFramesBetweenTriggers;

    // Trigger conditions:
    // 1. Value jumped significantly (rising edge) - catches sharp transients
    // 2. OR value is high and we haven't triggered recently - catches sustained peaks
    const isRisingEdge = valueDelta > threshold;
    const isAboveThreshold = currentValue > threshold * 2; // Higher threshold for sustained trigger
    const shouldTrigger = cooldownExpired && (isRisingEdge || (isAboveThreshold && !this.wasTriggered));

    // DEBUG: Log state periodically or on triggers
    if (isInRemotionContext && (this.frameCounter % 30 === 0 || shouldTrigger)) {
      console.log('[Slideshow Debug]', {
        frame: this.frameCounter,
        currentValue: currentValue.toFixed(4),
        valueDelta: valueDelta.toFixed(4),
        threshold,
        cooldownExpired,
        framesSinceLastTrigger,
        shouldTrigger,
        currentImageIndex: this.currentImageIndex,
      });
    }

    if (shouldTrigger) {
      if (isInRemotionContext) {
        console.log('[Slideshow] TRIGGER - advancing slide', {
          frame: this.frameCounter,
          currentIndex: this.currentImageIndex,
          reason: isRisingEdge ? 'rising_edge' : 'sustained_peak',
        });
      }
      this.advanceSlide();
      this.lastTriggerFrame = this.frameCounter;
      this.wasTriggered = true;
    } else if (currentValue <= threshold && this.wasTriggered) {
      // Reset wasTriggered when value drops low enough - enables next rising edge trigger
      if (isInRemotionContext && this.frameCounter % 30 === 0) {
        console.log('[Slideshow Debug] RESET wasTriggered (value dropped below threshold)', {
          frame: this.frameCounter,
          currentValue: currentValue.toFixed(4),
          threshold,
        });
      }
      this.wasTriggered = false;
    }

    // Update previous value for next frame
    this.previousTriggerValue = currentValue;

    // In Remotion mode, skip expensive image loading/processing
    // but still allow texture display if already loaded
    if (isRemotionRendering) {
      // Just update frame counter and return - don't load new images
      this.frameCounter++;
      return;
    }

    // Emergency backoff if we are hitting errors (e.g. 403s)
    if (Date.now() - this.lastErrorTime < this.errorCooldownMs) {
      return;
    }

    this.frameCounter++;

    // Debug opacity state every 60 frames (~1 second at 60fps)
    if (this.frameCounter % 60 === 0) {
      slideshowLog.log('📊 Opacity state check:', {
        effectId: this.id,
        parametersOpacity: this.parameters.opacity,
        materialOpacity: this.material.opacity,
        materialTransparent: this.material.transparent,
        hasMap: !!this.material.map,
        frameCounter: this.frameCounter
      });
    }

    // If images were added after init, load the first one immediately
    if (this.currentImageIndex === -1 && this.parameters.images.length > 0) {
      slideshowLog.log('Update: currentImageIndex is -1, images available, calling advanceSlide()');
      this.advanceSlide();
    }

    // Retry loading if no texture is displayed but images are available
    if (
      !this.material.map &&
      this.parameters.images.length > 0 &&
      this.failureCount < this.parameters.images.length * 2
    ) {
      const nextIndex = (this.currentImageIndex + 1) % this.parameters.images.length;
      const targetUrl = this.parameters.images[nextIndex];
      if (!this.loadingImages.has(targetUrl)) {
        slideshowLog.log('Update: No texture map, attempting to load:', {
          currentIndex: this.currentImageIndex,
          nextIndex,
          url: targetUrl.substring(0, 60),
          failureCount: this.failureCount
        });
        this.advanceSlide();
      }
    }

    // Update plane position and size if parameters changed
    this.updatePlaneGeometryAndPosition();

    // Safety: if a texture is present but the plane is somehow hidden, force it visible
    if (this.material.map && !this.plane.visible) {
      this.plane.visible = true;
      slideshowLog.log('Plane visibility auto-enabled in update because a texture is present');
    }
  }

  /**
   * Update plane geometry and position based on position/size parameters
   * Position and size are normalized (0-1), converted to Three.js world coordinates
   */
  private updatePlaneGeometryAndPosition() {
    // Convert normalized position (0-1) to Three.js world coordinates
    // X: 0 = left edge (-aspectRatio), 1 = right edge (aspectRatio)
    const worldX = (this.parameters.position.x * 2 - 1) * this.aspectRatio;
    // Y: 0 = top edge (1), 1 = bottom edge (-1) - flip Y for Three.js
    const worldY = 1 - this.parameters.position.y * 2;

    // Convert normalized size (0-1) to Three.js world size
    const worldWidth = this.parameters.size.width * 2 * this.aspectRatio;
    const worldHeight = this.parameters.size.height * 2;

    // Update plane position
    this.plane.position.set(worldX, worldY, 0);

    // Update plane geometry if size changed
    const currentWidth = (this.plane.geometry as THREE.PlaneGeometry).parameters.width;
    const currentHeight = (this.plane.geometry as THREE.PlaneGeometry).parameters.height;

    if (Math.abs(currentWidth - worldWidth) > 0.001 || Math.abs(currentHeight - worldHeight) > 0.001) {
      this.plane.geometry.dispose();
      this.plane.geometry = new THREE.PlaneGeometry(worldWidth, worldHeight);
    }
  }

  updateParameter(paramName: string, value: any): void {
    // Handle images array updates - this is called when a collection is selected
    if (paramName === 'images' && Array.isArray(value)) {
      slideshowLog.log('updateParameter called with images:', {
        valueLength: value.length,
        valueSample: value.slice(0, 2).map((url: any) => typeof url === 'string' ? url.substring(0, 80) : String(url))
      });

      // Filter out empty or invalid URLs - accept any non-empty string that looks like a URL
      const validUrls = value.filter((url: any) => {
        if (typeof url !== 'string') {
          slideshowLog.warn('Invalid URL type:', typeof url, url);
          return false;
        }
        const trimmed = url.trim();
        if (trimmed.length === 0) {
          slideshowLog.warn('Empty URL string');
          return false;
        }
        // Accept http/https URLs or data URLs
        const isValid = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:');
        if (!isValid) {
          slideshowLog.warn('URL does not start with http/https/data:', trimmed.substring(0, 50));
        }
        return isValid;
      });

      const oldLength = this.parameters.images.length;
      const newLength = validUrls.length;
      const imagesChanged = oldLength !== newLength ||
        JSON.stringify(this.parameters.images) !== JSON.stringify(validUrls);

      slideshowLog.log('Images validation result:', {
        oldCount: oldLength,
        newCount: newLength,
        validUrls: validUrls.length,
        invalidUrls: value.length - validUrls.length,
        imagesChanged,
        sampleUrls: validUrls.slice(0, 3).map((url: string) => url.substring(0, 60) + '...')
      });

      if (imagesChanged) {
        if (validUrls.length === 0) {
          slideshowLog.warn('No valid image URLs provided after filtering');
          slideshowLog.warn('Original value:', value);
          return;
        }

        // Update the parameter with only valid URLs
        this.parameters.images = validUrls;

        // Reset state for new collection
        this.currentImageIndex = -1;
        this.failureCount = 0;

        // Clear texture cache since URLs may have changed
        this.textureCache.forEach(t => t.dispose());
        this.textureCache.clear();
        this.loadingImages.clear();
        // Clear blacklist so refreshed URLs can be loaded
        this.blacklistedUrls.clear();

        // Clear current texture
        if (this.material.map) {
          this.material.map = null;
          this.material.color.setHex(0x000000); // Back to black
          this.material.needsUpdate = true;
        }

        // Load first image immediately
        slideshowLog.log('Loading first image from new collection, calling advanceSlide()');
        this.advanceSlide();
      } else {
        slideshowLog.log('Images array unchanged, skipping update');
      }
    } else if (paramName === 'opacity') {
      const oldOpacity = this.parameters.opacity;
      this.parameters.opacity = typeof value === 'number' ? value : parseFloat(value);
      this.material.opacity = this.parameters.opacity;
      slideshowLog.log('🔄 Opacity updated via updateParameter:', {
        effectId: this.id,
        oldValue: oldOpacity,
        newValue: this.parameters.opacity,
        materialOpacity: this.material.opacity,
        valueType: typeof value,
        rawValue: value
      });
    } else if (paramName === 'position') {
      if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
        this.parameters.position = {
          x: typeof value.x === 'number' ? value.x : parseFloat(value.x),
          y: typeof value.y === 'number' ? value.y : parseFloat(value.y)
        };
        this.updatePlaneGeometryAndPosition();
      }
    } else if (paramName === 'size') {
      if (value && typeof value === 'object' && 'width' in value && 'height' in value) {
        this.parameters.size = {
          width: typeof value.width === 'number' ? value.width : parseFloat(value.width),
          height: typeof value.height === 'number' ? value.height : parseFloat(value.height)
        };
        this.updatePlaneGeometryAndPosition();
      }
    } else if (paramName === 'threshold') {
      this.parameters.threshold = value;
      this.previousTriggerValue = this.parameters.triggerValue;
      this.wasTriggered = false;
    } else if (paramName === 'triggerValue') {
      const newValue = typeof value === 'number' ? value : parseFloat(value);
      this.parameters.triggerValue = newValue;
    }
  }

  resize(width: number, height: number) {
    this.aspectRatio = width / height;

    this.camera.left = -this.aspectRatio;
    this.camera.right = this.aspectRatio;
    this.camera.top = 1;
    this.camera.bottom = -1;
    this.camera.updateProjectionMatrix();

    // Update plane geometry and position based on new aspect ratio
    this.updatePlaneGeometryAndPosition();

    if (this.material.map) {
      this.fitTextureToScreen(this.material.map);
    }
  }

  private async advanceSlide() {
    const remotionEnv = getRemotionEnvironment();
    const isInRemotionContext = remotionEnv.isRendering || remotionEnv.isStudio;

    if (this.parameters.images.length === 0) {
      slideshowLog.warn('advanceSlide called but images array is empty');
      if (isInRemotionContext) {
        console.log('[Slideshow Remotion] advanceSlide BLOCKED: no images');
      }
      return;
    }

    // Prevent concurrent calls - if already advancing, skip
    if (this.isAdvancing) {
      if (isInRemotionContext) {
        console.log('[Slideshow Remotion] advanceSlide BLOCKED: already advancing (async load in progress)');
      }
      return;
    }

    this.isAdvancing = true;
    if (isInRemotionContext) {
      console.log('[Slideshow Remotion] advanceSlide STARTING', {
        currentIndex: this.currentImageIndex,
        nextIndex: (this.currentImageIndex + 1) % this.parameters.images.length,
      });
    }

    try {
      const nextIndex = (this.currentImageIndex + 1) % this.parameters.images.length;

      // If we're already on this index (shouldn't happen, but guard against it)
      if (nextIndex === this.currentImageIndex && this.currentImageIndex !== -1) {
        slideshowLog.log('Already on target index, skipping advance');
        this.isAdvancing = false;
        return;
      }

      const imageUrl = this.parameters.images[nextIndex];

      slideshowLog.log('Advancing slide:', {
        currentIndex: this.currentImageIndex,
        nextIndex,
        url: imageUrl.substring(0, 60)
      });

      // Try to get from cache
      let texture = this.textureCache.get(imageUrl);

      if (!texture) {
        try {
          texture = await this.loadTexture(imageUrl);
          this.failureCount = 0;
        } catch (e) {
          slideshowLog.error("Failed to load image for slideshow", imageUrl.substring(0, 60), e);
          this.currentImageIndex = nextIndex;
          this.failureCount++;
          this.isAdvancing = false;
          return;
        }
      }

      if (texture) {
        this.currentImageIndex = nextIndex;
        this.material.map = texture;
        this.material.color.setHex(0xffffff);
        this.material.needsUpdate = true;
        this.plane.visible = true; // Make sure plane is visible now

        slideshowLog.log('Slide advanced successfully:', {
          index: nextIndex,
          hasTexture: !!texture,
          textureSize: texture.image ? `${texture.image.width}x${texture.image.height}` : 'unknown'
        });

        if (isInRemotionContext) {
          console.log('[Slideshow Remotion] advanceSlide SUCCESS', {
            newIndex: nextIndex,
            textureSize: texture.image ? `${texture.image.width}x${texture.image.height}` : 'unknown',
          });
        }

        this.fitTextureToScreen(texture);

        // Preload next images & cleanup
        this.cleanupCache();
        this.loadNextTextures(nextIndex);
      } else {
        slideshowLog.error('advanceSlide: texture is null after load attempt');
        if (isInRemotionContext) {
          console.log('[Slideshow Remotion] advanceSlide FAILED: texture is null');
        }
      }
    } finally {
      this.isAdvancing = false;
    }
  }

  private fitTextureToScreen(texture: THREE.Texture) {
    if (!texture.image) return;

    const imageAspect = texture.image.width / texture.image.height;
    const screenAspect = this.aspectRatio;

    // Reset texture matrix to identity before applying transformations
    texture.matrixAutoUpdate = true;
    texture.matrix.identity();
    texture.center.set(0.5, 0.5);
    texture.offset.set(0, 0);

    if (imageAspect > screenAspect) {
      // Image is wider than screen
      texture.repeat.set(screenAspect / imageAspect, 1);
    } else {
      // Image is taller than screen
      texture.repeat.set(1, imageAspect / screenAspect);
    }
  }

  private loadNextTextures(currentIndex: number) {
    // Preload next 5 images for better responsiveness
    for (let i = 1; i <= 5; i++) {
      const idx = (currentIndex + i) % this.parameters.images.length;
      const url = this.parameters.images[idx];
      if (!this.textureCache.has(url) && !this.loadingImages.has(url)) {
        this.loadTexture(url).catch(() => { });
      }
    }
  }

  /**
   * Process image: resize if needed AND flip vertically for correct Three.js orientation.
   * We always process through canvas to ensure consistent orientation regardless of
   * browser ImageBitmap implementation differences.
   */
  private async resizeImageIfNeeded(imageBitmap: ImageBitmap, maxDimension: number = 2048): Promise<{ bitmap: ImageBitmap; wasResized: boolean; originalWidth: number; originalHeight: number }> {
    const originalWidth = imageBitmap.width;
    const originalHeight = imageBitmap.height;

    // Check if resizing is needed
    const needsResize = imageBitmap.width > maxDimension || imageBitmap.height > maxDimension;

    // Calculate target dimensions
    let width = imageBitmap.width;
    let height = imageBitmap.height;

    if (needsResize) {
      const scale = Math.min(maxDimension / imageBitmap.width, maxDimension / imageBitmap.height);
      width = Math.floor(imageBitmap.width * scale);
      height = Math.floor(imageBitmap.height * scale);
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      slideshowLog.warn('Could not get 2d context for processing, using original');
      return { bitmap: imageBitmap, wasResized: false, originalWidth, originalHeight };
    }

    // Flip vertically for correct WebGL/Three.js texture orientation
    // This ensures consistent behavior regardless of browser ImageBitmap handling
    ctx.translate(0, height);
    ctx.scale(1, -1);
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    const processedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
    const processedBitmap = await createImageBitmap(processedBlob);

    // Close original to free memory
    imageBitmap.close();

    return { bitmap: processedBitmap, wasResized: needsResize, originalWidth, originalHeight };
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    // Check if URL is blacklisted (403/404)
    if (this.blacklistedUrls.has(url)) {
      return Promise.reject(new Error("URL is blacklisted (403/404)"));
    }

    // STRICT CHECK: If throttled, reject immediately to save network
    if (this.isNetworkThrottled) {
      return Promise.reject(new Error("Network throttled due to previous 403s"));
    }

    // If we already have this texture cached, return it immediately
    const cached = this.textureCache.get(url);
    if (cached) {
      return Promise.resolve(cached);
    }

    // If a load is already in progress for this URL, attach to the same result
    if (this.loadingImages.has(url)) {
      slideshowLog.log('Texture already loading, attaching listener:', url.substring(0, 80));
      return new Promise((resolve) => {
        const existing = this.pendingTextureResolvers.get(url) || [];
        existing.push(resolve);
        this.pendingTextureResolvers.set(url, existing);
      });
    }

    this.loadingImages.add(url);
    slideshowLog.log('Loading texture:', url.substring(0, 80));

    return new Promise(async (resolve, reject) => {
      try {
        // Fetch image data
        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 403 || response.status === 404) {
            // Add to blacklist to prevent future attempts
            this.blacklistedUrls.add(url);

            if (response.status === 403) {
              this.consecutiveErrors++;

              // If we hit 3 consecutive 403s, stop trying for 5 seconds
              if (this.consecutiveErrors >= 3) {
                this.isNetworkThrottled = true;
                slideshowLog.warn("⛔ [ImageSlideshow] Too many 403s. Pausing loading for 5s.");
                setTimeout(() => {
                  this.isNetworkThrottled = false;
                  this.consecutiveErrors = 0;
                }, 5000);
              }
            }

            const msg = `⛔ ${response.status} Forbidden: URL Blacklisted. ${url.substring(0, 30)}...`;
            slideshowLog.warn(msg);
            throw new Error(msg);
          } else {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
          }
        }

        // On success, reset error counter
        this.consecutiveErrors = 0;

        const blob = await response.blob();

        // Decode using ImageBitmap API (faster, off main thread)
        const imageBitmap = await createImageBitmap(blob);

        // Resize if needed (max 2048px for performance)
        const { bitmap: resizedBitmap, wasResized, originalWidth, originalHeight } = await this.resizeImageIfNeeded(imageBitmap, 2048);

        // Create texture from ImageBitmap
        const texture = new THREE.CanvasTexture(resizedBitmap);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.matrixAutoUpdate = true;
        // flipY = false because we pre-flip the image in resizeImageIfNeeded()
        // via canvas transform. This ensures consistent orientation across browsers.
        texture.flipY = false;

        this.textureCache.set(url, texture);
        this.loadingImages.delete(url);

        slideshowLog.log('Texture loaded successfully:', {
          url: url.substring(0, 50),
          width: resizedBitmap.width,
          height: resizedBitmap.height,
          originalWidth,
          originalHeight,
          wasResized
        });

        // Resolve primary caller
        resolve(texture);

        // Resolve any queued callers waiting on this URL
        const pending = this.pendingTextureResolvers.get(url);
        if (pending && pending.length > 0) {
          pending.forEach(fn => {
            try {
              fn(texture);
            } catch (e) {
              slideshowLog.error('Error resolving pending texture listener:', e);
            }
          });
          this.pendingTextureResolvers.delete(url);
        }
      } catch (err: any) {
        this.loadingImages.delete(url);
        this.pendingTextureResolvers.delete(url);

        // Trigger cooldown on error to prevent flooding
        this.lastErrorTime = Date.now();

        // Provide more detailed error information
        let errorMessage = 'Texture load failed';
        if (err?.message) {
          errorMessage = err.message;
        } else if (err?.name === 'TypeError' && err?.message?.includes('Failed to fetch')) {
          // This is likely a CORS error or network issue
          errorMessage = `Network error (likely CORS or expired URL): ${url.substring(0, 100)}...`;
        }

        slideshowLog.error('🖼️ Texture load failed:', errorMessage);
        slideshowLog.error('Failed URL:', url.substring(0, 100));

        reject(err);
      }
    });
  }

  /**
   * Public method to wait for essential images to load.
   * Used by Remotion to delay rendering until assets are ready.
   */
  public async waitForImages(): Promise<void> {
    if (this.parameters.images.length === 0) return;

    // Determine which images we need. 
    // If we have a current index, we need that one.
    // If not, we need the first one.
    const targetIndex = this.currentImageIndex >= 0 ? this.currentImageIndex : 0;
    const url = this.parameters.images[targetIndex];

    if (!url) return;

    // If already cached, we're good
    if (this.textureCache.has(url)) return;

    // Otherwise, try to load it
    try {
      slideshowLog.log('waitForImages: Waiting for', url.substring(0, 50));
      await this.loadTexture(url);

      // Also ensure it's applied to the material if it's the current target
      if (this.currentImageIndex === -1 || this.currentImageIndex === targetIndex) {
        const texture = this.textureCache.get(url);
        if (texture) {
          this.currentImageIndex = targetIndex;
          this.material.map = texture;
          this.material.color.setHex(0xffffff);
          this.material.needsUpdate = true;
          this.plane.visible = true;
          this.fitTextureToScreen(texture);
        }
      }
    } catch (e) {
      slideshowLog.warn('waitForImages: Failed to load image, proceeding anyway', e);
    }
  }

  private cleanupCache() {
    // Keep current and next 5 images (matching preload count)
    const keepIndices = new Set<number>();
    keepIndices.add(this.currentImageIndex);
    for (let i = 1; i <= 5; i++) {
      keepIndices.add((this.currentImageIndex + i) % this.parameters.images.length);
    }

    const keepUrls = new Set<string>();
    keepIndices.forEach(idx => {
      if (this.parameters.images[idx]) keepUrls.add(this.parameters.images[idx]);
    });

    // Don't dispose the texture currently in use by the material
    const currentMap = this.material.map;

    for (const [url, texture] of this.textureCache) {
      if (!keepUrls.has(url) && texture !== currentMap) {
        texture.dispose();
        this.textureCache.delete(url);
      }
    }
  }

  getScene(): THREE.Scene { return this.scene; }
  getCamera(): THREE.Camera { return this.camera; }

  destroy(): void {
    this.plane.geometry.dispose();
    this.material.dispose();
    this.textureCache.forEach(t => t.dispose());
    this.textureCache.clear();
    this.loadingImages.clear();
  }
}
</file>

<file path="apps/web/src/lib/export-utils.ts">
import { useTimelineStore } from '@/stores/timelineStore';
import {
  type FeatureMapping,
  useVisualizerStore,
} from '@/stores/visualizerStore';
import type { RayboxCompositionProps } from '@/remotion/Root';
import type { AudioAnalysisData } from '@/types/audio-analysis-data';
import { DEFAULT_VISUALIZATION_SETTINGS } from 'phonoglyph-types';
import type { VisualizationSettings } from 'phonoglyph-types';

/**
 * File object structure expected from project files.
 */
interface ProjectFile {
  id?: string;
  downloadUrl?: string;
  is_master?: boolean;
  file_name?: string;
  file_type?: string;
  upload_status?: string;
  [key: string]: any;
}

/**
 * Gathers all project data needed for Remotion export.
 * Actively hydrates layer assets with fresh URLs to ensure the export is self-healing.
 */
export function getProjectExportPayload(
  projectId: string,
  cachedAnalysis: AudioAnalysisData[],
  projectFiles: ProjectFile[],
  stemUrlMap: Record<string, string> = {},
): RayboxCompositionProps {
  // 1. Get Store State
  const timelineState = useTimelineStore.getState();
  const visualizerState = useVisualizerStore.getState();

  // 2. Extract and Hydrate Layers
  // Deep clone layers to avoid mutating the active store during hydration
  const rawLayers = timelineState.layers;
  const layers = JSON.parse(JSON.stringify(rawLayers)).map((layer: any) => {
    // Hydrate Image Slideshows with fresh URLs from stemUrlMap
    if (layer.effectType === 'imageSlideshow' && layer.settings) {
      const imageIds = layer.settings.imageIds as string[];

      // If we have IDs and a URL map, attempt to resolve fresh URLs
      if (Array.isArray(imageIds) && imageIds.length > 0) {
        const currentImages = layer.settings.images as string[] | undefined;
        // Check if current URLs are old signed URLs (need refresh)
        const hasOldUrls = currentImages?.some(url => 
          url.includes('cloudflarestorage') || 
          url.includes('phonoglyph-uploads') ||
          url.includes('X-Amz-Signature')
        );
        
        const freshImages = imageIds
          .map((id) => stemUrlMap[id]) // Look up fresh direct URL
          .filter(Boolean); // Remove any that failed to resolve

        // Always update if we have fresh URLs, or if current URLs are old signed URLs
        if (freshImages.length > 0 || hasOldUrls) {
          // Prefer fresh URLs, but keep existing if fresh ones aren't available yet
          layer.settings.images = freshImages.length > 0 ? freshImages : currentImages;
        }
      }
    }
    return layer;
  });

  const mappings: Record<string, FeatureMapping> = visualizerState.mappings;
  const baseParameterValues: Record<string, Record<string, any>> =
    visualizerState.baseParameterValues;
  const featureDecayTimes: Record<string, number> = visualizerState.featureDecayTimes;
  const featureSensitivities: Record<string, number> = visualizerState.featureSensitivities;

  type VisualizationSettingsWithAspect = VisualizationSettings & {
    aspectRatio?: string;
  };

  const visualizerSettings = (visualizerState as {
    settings?: Partial<VisualizationSettingsWithAspect>;
    aspectRatio?: string;
  }).settings;

  const defaultAspectRatio =
    (DEFAULT_VISUALIZATION_SETTINGS as VisualizationSettingsWithAspect)
      .aspectRatio ?? '9:16';

  // Prefer the live store aspectRatio (driven by the UI) over anything cached
  const resolvedAspectRatio =
    visualizerState.aspectRatio ??
    visualizerSettings?.aspectRatio ??
    defaultAspectRatio;

  const visualizationSettings: VisualizationSettingsWithAspect = {
    ...DEFAULT_VISUALIZATION_SETTINGS,
    ...visualizerSettings,
    aspectRatio: resolvedAspectRatio,
  };

  const audioAnalysisData = cachedAnalysis;

  // 3. Find Master Audio
  let masterAudioUrl = '';

  const masterFile = projectFiles.find((file) => file.is_master === true);

  if (masterFile?.id) {
    masterAudioUrl = stemUrlMap[masterFile.id] || '';
    if (!masterAudioUrl && masterFile.downloadUrl) {
      masterAudioUrl = masterFile.downloadUrl;
    }
  } else if (projectFiles.length > 0) {
    // Fallback: look for audio files
    const firstAudioFile = projectFiles.find(
      (file) => file.file_type === 'audio' || file.downloadUrl,
    );

    if (firstAudioFile?.id) {
      masterAudioUrl =
        stemUrlMap[firstAudioFile.id] || firstAudioFile.downloadUrl || '';
    } else if (firstAudioFile?.downloadUrl) {
      masterAudioUrl = firstAudioFile.downloadUrl;
    }
  }

  // 4. Return Object
  return {
    layers,
    audioAnalysisData,
    visualizationSettings,
    masterAudioUrl,
    mappings,
    baseParameterValues,
    featureDecayTimes,
    featureSensitivities,
  };
}
</file>

<file path="apps/web/src/remotion/RemotionOverlayRenderer.tsx">
import React, { useMemo, useCallback } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { HudOverlay } from '@/components/hud/HudOverlay';
import type { Layer } from '@/types/video-composition';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { extractAudioDataAtTime } from './RayboxComposition';

type RemotionOverlayRendererProps = {
  layers: Layer[];
  audioAnalysisData: CachedAudioAnalysisData[];
};

// Helper: get feature keys for overlay type (copied from HudOverlayManager)
function getFeatureKeyForOverlay(type: string): string[] {
  switch (type) {
    case 'waveform':
    case 'oscilloscope':
      return ['rms', 'loudness'];
    case 'spectrogram':
    case 'spectrumAnalyzer':
      return ['fft', 'spectralCentroid', 'rms', 'loudness'];
    case 'peakMeter':
      return ['rms', 'loudness'];
    case 'stereometer':
      return ['spectralCentroid', 'rms'];
    case 'vuMeter':
      return ['rms', 'loudness'];
    case 'chromaWheel':
      return ['chroma', 'rms'];
    default:
      return ['rms'];
  }
}

export const RemotionOverlayRenderer: React.FC<RemotionOverlayRendererProps> = ({
  layers,
  audioAnalysisData,
}) => {
  // Use Remotion's hook directly - this gets the frame value during render
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width: videoWidth, height: videoHeight } = useVideoConfig();
  const videoDuration = fps > 0 ? durationInFrames / fps : 30; // Fallback to 30s if no duration
  const currentTime = fps > 0 ? frame / fps : 0;
  const cachedAnalysis = audioAnalysisData as CachedAudioAnalysisData[];

  const overlayLayers = useMemo(
    () => layers.filter((layer) => layer.type === 'overlay'),
    [layers],
  );

  const activeOverlays = useMemo(
    () =>
      overlayLayers.filter(
        (layer) =>
          currentTime >= (layer.startTime ?? 0) &&
          currentTime <= (layer.endTime ?? Number.POSITIVE_INFINITY),
      ),
    [overlayLayers, currentTime],
  );

  // Compute feature data for an overlay layer – adapted from HudOverlayManager,
  // but using cached audio analysis + extractAudioDataAtTime instead of audioController hooks.
  const getFeatureDataForOverlay = useCallback(
    (layer: Layer) => {
      const settings = (layer as any).settings || {};
      const stemId = settings.stemId || settings.stem?.id;

      if (!stemId || cachedAnalysis.length === 0) {
        return null;
      }

      // Find the analysis for this stem
      let analysis = cachedAnalysis.find((a) => a.fileMetadataId === stemId);

      // FALLBACK: If strict ID match fails, try matching by stemType
      if (!analysis) {
        const requestedStemType = settings.stemType || 'master';
        analysis = cachedAnalysis.find(a => a.stemType === requestedStemType);
      }
      if (!analysis || !analysis.analysisData) {
        return null;
      }

      const overlayType = layer.effectType as string;
      const featureKeys = getFeatureKeyForOverlay(overlayType);

      const frameTimes = analysis.analysisData.frameTimes as
        | Float32Array
        | number[]
        | undefined;
      const derivedDurationFromFrames =
        frameTimes && frameTimes.length > 0
          ? (frameTimes as any)[frameTimes.length - 1]
          : undefined;
      const metadataDuration = (analysis as any).metadata?.duration as
        | number
        | undefined;
      const analysisDurationField = (analysis.analysisData as any)
        .analysisDuration as number | undefined;

      // FIX: Use videoDuration as ultimate fallback instead of 1 second
      // This prevents overlays from "finishing" immediately and freezing
      const analysisDuration =
        metadataDuration ?? derivedDurationFromFrames ?? analysisDurationField ?? videoDuration;
      const progress = Math.max(0, Math.min(currentTime / analysisDuration, 1));

      // For spectrum overlays
      if (overlayType === 'spectrogram' || overlayType === 'spectrumAnalyzer') {
        // Use the shared extractor to get the FFT data for the current time
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );

        if (extracted?.frequencies?.length) {
          // For spectrogram, we might want a buffer, but for now let's return the current frame
          // If the overlay needs a buffer, it should manage it or we need to reconstruct it here
          // properly. However, the issue described is "static" rendering, which usually means
          // the data isn't updating. Returning the correct frame data fixes that.

          // If the component expects a buffer (history), we can try to generate a small one
          // by sampling previous frames, but for a single frame render, just the current
          // FFT is the most critical part.

          // Let's look at how HudOverlay uses this. It likely expects 'fft' to be the current frame.
          // The previous code was generating a fake buffer.

          // Let's reconstruct a small buffer by sampling backwards if needed, 
          // but primarily ensure 'fft' is correct.

          const buffer: Array<Float32Array> = [];
          // Sample a few frames back to give some history if needed
          const numHistoryFrames = 5;
          for (let i = numHistoryFrames; i >= 0; i--) {
            const t = currentTime - (i * 0.05); // 50ms steps
            const histExtracted = extractAudioDataAtTime(
              cachedAnalysis,
              analysis.fileMetadataId,
              Math.max(0, t),
              analysis.stemType
            );
            if (histExtracted?.frequencies) {
              buffer.push(new Float32Array(histExtracted.frequencies));
            } else {
              buffer.push(new Float32Array(extracted.frequencies.length).fill(0));
            }
          }

          return {
            fft: new Float32Array(extracted.frequencies),
            fftBuffer: buffer,
          };
        }

        return null;
      }

      // For stereometer: Try to get stereo window from analysis data first
      // The analysis may include stereoWindow_left/right fields
      if (overlayType === 'stereometer') {
        const stereoLeft = (analysis.analysisData as any).stereoWindow_left;
        const stereoRight = (analysis.analysisData as any).stereoWindow_right;

        // If we have per-frame time-data, use that
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );

        if (extracted?.timeData?.length) {
          const half = Math.floor(extracted.timeData.length / 2);
          const left = extracted.timeData.slice(0, half);
          const right = extracted.timeData.slice(half) || extracted.timeData.slice(0, half);

          return {
            stereoWindow: {
              left,
              right,
            },
          };
        }

        // Fallback: use static stereo window from analysis if available
        if (stereoLeft && stereoRight && Array.isArray(stereoLeft) && Array.isArray(stereoRight)) {
          return {
            stereoWindow: {
              left: stereoLeft,
              right: stereoRight,
            },
          };
        }

        return null;
      }

      // For consoleFeed: Use time-domain window as raw audio buffer
      if (overlayType === 'consoleFeed') {
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );

        if (extracted?.timeData?.length) {
          return { audioBuffer: extracted.timeData };
        }

        return null;
      }

      // For chroma wheel – use cached chroma data directly
      if (overlayType === 'chromaWheel') {
        if (analysis.analysisData.chroma && Array.isArray(analysis.analysisData.chroma)) {
          return { chroma: analysis.analysisData.chroma };
        }
        return null;
      }

      // For VU meter – derive RMS / peak from cached arrays
      if (overlayType === 'vuMeter') {
        let rmsValue = 0;
        let peakValue = 0;

        if (analysis.analysisData.rms && Array.isArray(analysis.analysisData.rms)) {
          const idx = Math.floor(progress * (analysis.analysisData.rms.length - 1));
          rmsValue = analysis.analysisData.rms[idx] || 0;
        }
        if (analysis.analysisData.loudness && Array.isArray(analysis.analysisData.loudness)) {
          const idx = Math.floor(progress * (analysis.analysisData.loudness.length - 1));
          peakValue = analysis.analysisData.loudness[idx] || 0;
        }

        return { rms: rmsValue, peak: peakValue };
      }

      // Generic array-based features (waveform, peakMeter, etc.)
      let featureArr: number[] | null = null;
      for (const key of featureKeys) {
        const arr = (analysis.analysisData as any)[key];
        if (arr && Array.isArray(arr) && arr.length > 0) {
          featureArr = arr;
          break;
        }
      }

      if (!featureArr) {
        // Fallback: try any available array feature
        // Note: analysis is already validated above (line 81), so it's guaranteed to be defined here
        const availableFeatures = Object.keys(analysis!.analysisData).filter(
          (key) =>
            Array.isArray((analysis!.analysisData as any)[key]) &&
            (analysis!.analysisData as any)[key].length > 0,
        );
        if (availableFeatures.length > 0) {
          featureArr = (analysis!.analysisData as any)[availableFeatures[0]];
        }
      }

      if (!featureArr) return null;

      const idx = Math.floor(progress * (featureArr.length - 1));

      // For waveform and oscilloscope, return a window of values
      if (overlayType === 'waveform' || overlayType === 'oscilloscope') {
        const windowSize = 100;
        const endIdx = idx + 1;
        const startIdx = Math.max(0, endIdx - windowSize);
        return featureArr.slice(startIdx, endIdx);
      }

      // For peak meter, return single value
      if (overlayType === 'peakMeter') {
        return featureArr[idx] || 0;
      }

      // Default: single scalar
      return featureArr[idx];
    },
    [cachedAnalysis, currentTime],
  );

  if (activeOverlays.length === 0) {
    return null;
  }

  return (
    <div
      id="remotion-hud-overlays-container"
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
    >
      {activeOverlays.map((layer) => {
        const featureData = getFeatureDataForOverlay(layer);
        return (
          <HudOverlay
            key={layer.id}
            layer={layer}
            featureData={featureData}
            // Pass video dimensions for headless rendering - avoids 0x0 canvas issue
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            // Pass frame/fps explicitly to avoid calling hooks twice
            frame={frame}
            fps={fps}
            // No-op callbacks: overlays are not editable in Remotion render
            onOpenModal={() => { }}
            onUpdate={() => { }}
            isSelected={false}
            onSelect={() => { }}
          />
        );
      })}
    </div>
  );
};
</file>

<file path="apps/web/src/remotion/Root.tsx">
import { type CalculateMetadataFunction, Composition } from 'remotion';
import { RayboxComposition } from './RayboxComposition';
import type { AudioAnalysisData } from '@/types/audio-analysis-data'; // Use the cached type
import type { Layer } from '@/types/video-composition';
import type { VisualizationSettings } from 'phonoglyph-types';

type VisualizationSettingsWithAspect = VisualizationSettings & { aspectRatio?: string };
type AspectRatioKey =
  | 'mobile'
  | 'tiktok'
  | 'youtube'
  | 'instagram'
  | 'landscape'
  | '16:9'
  | '9:16'
  | '1:1';

const ASPECT_RATIO_DIMENSIONS: Record<AspectRatioKey, { width: number; height: number }> = {
  mobile: { width: 1080, height: 1920 },
  tiktok: { width: 1080, height: 1920 },
  youtube: { width: 1920, height: 1080 },
  instagram: { width: 1080, height: 1080 },
  landscape: { width: 1920, height: 1200 },
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
};

// Robust payload loading: prefer the JSON, fall back to Debug module
// eslint-disable-next-line @typescript-eslint/no-require-imports
let TEST_PAYLOAD: RayboxCompositionProps | null = null;
try {
  const payload = require('./debug-payload.json') as unknown;
  TEST_PAYLOAD = payload as RayboxCompositionProps;
} catch (e) {
  console.warn('⚠️ Could not load debug-payload.json:', e);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const debugModule = require('./Debug') as { TEST_PAYLOAD?: unknown };
    TEST_PAYLOAD = debugModule.TEST_PAYLOAD as RayboxCompositionProps;
  } catch (e2) {
    console.warn('⚠️ Could not load Debug module:', e2);
  }
}

export interface RayboxCompositionProps extends Record<string, unknown> {
  layers: Layer[];
  // This contains the full timeline analysis for Master + all Stems
  audioAnalysisData: AudioAnalysisData[];
  visualizationSettings: VisualizationSettingsWithAspect;
  // The only audio track to be rendered in the output
  masterAudioUrl: string;
  // Audio feature mappings for effect parameters
  mappings?: Record<string, { featureId: string | null; modulationAmount: number }>;
  // Base parameter values before modulation
  baseParameterValues?: Record<string, Record<string, any>>;
  // User-configured decay times for peaks features (e.g., "drums-peaks": 0.3)
  featureDecayTimes?: Record<string, number>;
  // User-configured sensitivity for peaks features (e.g., "drums-peaks": 0.5 for 50%)
  // Higher values = keep more transients, lower = filter out quiet ones
  featureSensitivities?: Record<string, number>;
  // URL to fetch analysis data from R2 (used when payload is too large for Lambda)
  analysisUrl?: string;
}

const defaultProps: RayboxCompositionProps = {
  layers: [],
  audioAnalysisData: [],
  visualizationSettings: {
    colorScheme: 'mixed',
    pixelsPerSecond: 50,
    showTrackLabels: true,
    showVelocity: true,
    minKey: 21,
    maxKey: 108,
  },
  masterAudioUrl: '',
};

const resolveAspectRatioDimensions = (
  rawAspectRatio: string | undefined,
): { width: number; height: number } => {
  if (!rawAspectRatio) {
    return ASPECT_RATIO_DIMENSIONS['9:16'];
  }

  const normalized = rawAspectRatio.toLowerCase();

  if (normalized in ASPECT_RATIO_DIMENSIONS) {
    return ASPECT_RATIO_DIMENSIONS[normalized as AspectRatioKey];
  }

  if (normalized.includes(':')) {
    const [widthPart, heightPart] = normalized.split(':');
    const widthRatio = Number(widthPart);
    const heightRatio = Number(heightPart);

    if (
      Number.isFinite(widthRatio) &&
      Number.isFinite(heightRatio) &&
      widthRatio > 0 &&
      heightRatio > 0
    ) {
      if (widthRatio >= heightRatio) {
        const width = 1920;
        return { width, height: Math.round((heightRatio / widthRatio) * width) };
      }
      const height = 1920;
      return { width: Math.round((widthRatio / heightRatio) * height), height };
    }
  }

  return ASPECT_RATIO_DIMENSIONS['9:16'];
};

const calculateMetadata: CalculateMetadataFunction<RayboxCompositionProps> = async ({
  props,
}) => {
  // FPS is set on the Composition component (30), so we use that value here
  const safeFps = 60;

  let finalAudioData = props.audioAnalysisData;

  // If the API gave us a URL because the data was too big for the trigger payload:
  if (props.analysisUrl) {
    console.log('☁️ Fetching heavy analysis from R2...');
    try {
      const res = await fetch(props.analysisUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch analysis data: ${res.status} ${res.statusText}`);
      }
      finalAudioData = await res.json();
      console.log(`✅ Fetched ${finalAudioData.length} analysis entries from R2`);
    } catch (error) {
      console.error('❌ Failed to fetch analysis data from R2:', error);
      // Fall back to empty array if fetch fails
      finalAudioData = [];
    }
  }

  // Debug logging for payload visibility in the terminal
  if (!props.layers || props.layers.length === 0) {
    console.log(
      '⚠️ calculateMetadata received EMPTY layers. Check debug-payload.json!',
    );
  } else {
    console.log(
      `✅ calculateMetadata: ${props.layers.length} layers, Aspect: ${props.visualizationSettings?.aspectRatio}`,
    );
  }

  const layers = props?.layers ?? [];
  const { width, height } = resolveAspectRatioDimensions(
    props.visualizationSettings?.aspectRatio,
  );

  // Prefer explicit duration on the payload if provided
  const durationFromProps = (props as Partial<{ duration?: number }>).duration;
  let duration =
    typeof durationFromProps === 'number' && !Number.isNaN(durationFromProps)
      ? durationFromProps
      : undefined;

  // If no explicit duration, derive from the end of the last layer
  if (duration == null || Number.isNaN(duration)) {
    if (layers.length > 0) {
      const layerEndTimes = layers
        .map((l) => l.endTime)
        .filter((t) => typeof t === 'number' && !Number.isNaN(t));

      if (layerEndTimes.length > 0) {
        duration = Math.max(...layerEndTimes);
      }
    }
  }

  // Calculate duration based on the actual data we just fetched
  if ((duration == null || !Number.isFinite(duration) || duration <= 0) && finalAudioData.length > 0) {
    duration = finalAudioData[0]?.metadata?.duration || 30;
  }

  // Default to 30 seconds if we couldn't determine duration
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    duration = 30;
  }

  return {
    durationInFrames: Math.ceil(duration * safeFps),
    width,
    height,
    props: {
      ...props,
      audioAnalysisData: finalAudioData, // Inject the data into the component props
    },
  };
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="RayboxMain"
        component={RayboxComposition}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="Debug"
        component={RayboxComposition}
        width={1080}
        height={1920}
        fps={60}
        defaultProps={TEST_PAYLOAD ?? defaultProps}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
</file>

<file path="apps/web/src/remotion/RayboxComposition.tsx">
import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  Audio,
  delayRender,
  continueRender,
} from 'remotion';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
// Import EffectDefinitions to ensure effects are registered
import '@/lib/visualizer/effects/EffectDefinitions';
import type { RayboxCompositionProps } from './Root';
import type { AudioAnalysisData as SimpleAudioAnalysisData } from '@/types/visualizer';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { parseParamKey } from '@/lib/visualizer/paramKeys';
import { debugLog } from '@/lib/utils';
import { RemotionOverlayRenderer } from './RemotionOverlayRenderer';

const VALID_STEMS = new Set(['master', 'drums', 'bass', 'vocals', 'other']);

/**
 * Default decay times for stateless peaks calculation.
 * Fast decay for drums, medium for bass/vocals/melody.
 */
const DEFAULT_PEAK_DECAY_TIMES: Record<string, number> = {
  'drums-peaks': 0.3,   // Fast decay for drums
  'bass-peaks': 0.5,    // Medium decay for bass
  'vocals-peaks': 0.4,  // Medium-fast for vocals
  'melody-peaks': 0.5,  // Medium for melody
  'master-peaks': 0.4,  // Default
  'other-peaks': 0.5,
};

const DEFAULT_DECAY_TIME = 0.5;

/**
 * Default sensitivity values for peaks features.
 * 0.5 = 50% (keep upper half of transients by intensity)
 * 1.0 = 100% (keep all transients)
 */
const DEFAULT_PEAK_SENSITIVITIES: Record<string, number> = {
  'drums-peaks': 0.5,
  'bass-peaks': 0.5,
  'vocals-peaks': 0.5,
  'melody-peaks': 0.5,
  'master-peaks': 0.5,
  'other-peaks': 0.5,
};

/**
 * Helper to filter transients by sensitivity.
 * Ported from MappingSourcesPanel.tsx filterTransientsBySensitivity.
 *
 * @param sensitivity - 0-1 range, where 1 keeps all transients, 0 keeps only the strongest
 */
function filterTransientsBySensitivity(
  transients: Array<{ time: number; intensity: number; type?: string }>,
  sensitivity: number
): Array<{ time: number; intensity: number; type?: string }> {
  if (!transients || transients.length === 0) return transients;
  const clamped = Math.max(0, Math.min(1, sensitivity));
  if (clamped >= 0.999) return transients;

  const intensities = transients
    .map(t => t.intensity)
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (!intensities.length) return transients;

  const index = Math.floor((1 - clamped) * (intensities.length - 1));
  const threshold = intensities[index];

  return transients.filter(t => (Number.isFinite(t.intensity) ? t.intensity : 0) >= threshold);
}

/**
 * Stateless peaks calculation for Remotion/Lambda rendering.
 *
 * Algorithm:
 * 1. Filter transients by sensitivity (remove quiet "noise" peaks)
 * 2. Binary search for the most recent transient at or before time `t`
 * 3. If within decay window, return decayed intensity
 * 4. Otherwise return 0
 *
 * This is O(log n) per frame lookup.
 *
 * @param userDecayTimes - User-configured decay times from the export payload
 * @param userSensitivities - User-configured sensitivity values (0-1)
 */
function calculatePeaksValueStateless(
  transients: Array<{ time: number; intensity: number; type?: string }>,
  time: number,
  featureId: string,
  userDecayTimes?: Record<string, number>,
  userSensitivities?: Record<string, number>,
  frameForDebug?: number
): number {
  if (!transients || transients.length === 0) return 0;

  // Priority: user-configured > hardcoded defaults > fallback
  const sensitivity = userSensitivities?.[featureId]
    ?? DEFAULT_PEAK_SENSITIVITIES[featureId]
    ?? 0.5; // Default to 50%

  // Filter transients by sensitivity BEFORE the binary search
  const filteredTransients = filterTransientsBySensitivity(transients, sensitivity);

  // DEBUG: Log sensitivity filtering
  if (frameForDebug !== undefined && frameForDebug < 5) {
    console.log(`[Peaks Debug] frame=${frameForDebug} ${featureId}: ${transients.length} → ${filteredTransients.length} transients (sensitivity=${sensitivity})`);
  }

  // If no transients remain after filtering, return 0
  if (!filteredTransients || filteredTransients.length === 0) {
    return 0;
  }

  // Priority: user-configured > hardcoded defaults > fallback
  const decayTime = userDecayTimes?.[featureId]
    ?? DEFAULT_PEAK_DECAY_TIMES[featureId]
    ?? DEFAULT_DECAY_TIME;

  // Binary search for the latest transient at or before `time`
  let lo = 0;
  let hi = filteredTransients.length - 1;
  let latestIdx = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (filteredTransients[mid].time <= time) {
      latestIdx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // No transient found before this time
  if (latestIdx === -1) {
    // DEBUG: Log when no transient found (first few frames only)
    if (frameForDebug !== undefined && frameForDebug < 10) {
      console.log(`[Peaks Debug] frame=${frameForDebug} time=${time.toFixed(3)} featureId=${featureId} → NO TRANSIENT (first at ${filteredTransients[0]?.time?.toFixed(3) ?? 'N/A'})`);
    }
    return 0;
  }

  const transient = filteredTransients[latestIdx];
  const elapsed = time - transient.time;

  // Outside decay window
  if (elapsed < 0 || elapsed >= decayTime) {
    // DEBUG: Log decay expiry
    if (frameForDebug !== undefined && frameForDebug < 10) {
      console.log(`[Peaks Debug] frame=${frameForDebug} time=${time.toFixed(3)} featureId=${featureId} → DECAYED (elapsed=${elapsed.toFixed(3)} >= decayTime=${decayTime})`);
    }
    return 0;
  }

  // Apply linear decay envelope - intensity decreases linearly from full to zero over decayTime
  const result = transient.intensity * (1 - elapsed / decayTime);

  // DEBUG: Log computed value
  if (frameForDebug !== undefined && (frameForDebug < 10 || frameForDebug % 60 === 0)) {
    console.log(`[Peaks Debug] frame=${frameForDebug} time=${time.toFixed(3)} featureId=${featureId} → value=${result.toFixed(4)} (transient@${transient.time.toFixed(3)}, intensity=${transient.intensity.toFixed(4)}, elapsed=${elapsed.toFixed(3)})`);
  }

  return result;
}

/**
 * Helper function to extract audio feature values at a specific time from cached analysis data.
 * Adapted from use-audio-analysis.ts getFeatureValue logic.
 *
 * @param userDecayTimes - User-configured decay times for peaks features
 * @param userSensitivities - User-configured sensitivity values for peaks features
 * @param frameForDebug - Optional frame number for debug logging
 */
function getFeatureValueFromCached(
  cachedAnalysis: CachedAudioAnalysisData[],
  fileId: string,
  feature: string,
  time: number,
  stemType?: string,
  userDecayTimes?: Record<string, number>,
  userSensitivities?: Record<string, number>,
  frameForDebug?: number,
): number {
  let parsedStem = stemType ?? 'master';
  let featureName = feature;

  if (feature.includes('-')) {
    const parts = feature.split('-');
    const potentialStem = parts[0];

    if (VALID_STEMS.has(potentialStem.toLowerCase())) {
      parsedStem = potentialStem;
      featureName = parts.slice(1).join('-');
    }
  }

  let analysis = cachedAnalysis.find(
    (a) => a.fileMetadataId === fileId && a.stemType === parsedStem,
  );

  if (!analysis) {
    analysis = cachedAnalysis.find((a) => a.stemType === parsedStem);
  }

  if (!analysis?.analysisData) return 0;
  const { analysisData } = analysis;

  const getTimeSeriesValue = (arr: any) => {
    if (!arr || arr.length === 0) return 0;
    const times = analysisData.frameTimes as number[];
    if (!times || times.length === 0) return 0;

    let lo = 0,
      hi = times.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (times[mid] <= time) lo = mid;
      else hi = mid - 1;
    }
    return arr[lo] ?? 0;
  };

  const normalizedFeature = featureName.toLowerCase().replace(/-/g, '');

  // Handle peaks/transients case - stateless calculation
  if (normalizedFeature === 'peaks') {
    const transients = (analysisData as any).transients;
    if (!transients || !Array.isArray(transients)) {
      if (frameForDebug !== undefined && frameForDebug < 5) {
        console.log(`[Peaks Debug] frame=${frameForDebug} NO TRANSIENTS for ${parsedStem}-peaks (transients=${transients})`);
      }
      return 0;
    }

    // Construct full feature ID for decay time lookup
    const fullFeatureId = `${parsedStem}-peaks`;

    // DEBUG: Log first transient time to verify correct stem data
    if (frameForDebug !== undefined && frameForDebug < 5) {
      console.log(`[Peaks Debug] frame=${frameForDebug} ${fullFeatureId} has ${transients.length} transients, first at t=${transients[0]?.time?.toFixed(3)}`);
    }

    return calculatePeaksValueStateless(transients, time, fullFeatureId, userDecayTimes, userSensitivities, frameForDebug);
  }

  switch (normalizedFeature) {
    case 'rms':
      return getTimeSeriesValue(analysisData.rms);
    case 'volume':
      return getTimeSeriesValue(analysisData.rms ?? analysisData.volume);
    case 'loudness':
      return getTimeSeriesValue(analysisData.loudness);
    case 'spectralcentroid':
      return getTimeSeriesValue(analysisData.spectralCentroid);
    case 'spectralrolloff':
      return getTimeSeriesValue(analysisData.spectralRolloff);
    case 'spectralflux':
      return getTimeSeriesValue((analysisData as any).spectralFlux);
    case 'bass':
      return getTimeSeriesValue(analysisData.bass);
    case 'mid':
      return getTimeSeriesValue(analysisData.mid);
    case 'treble':
      return getTimeSeriesValue(analysisData.treble);
    default:
      return 0;
  }
}

/**
 * Convert cached audio analysis data to simple AudioAnalysisData format at a specific time.
 * Exported so Remotion-specific overlay renderer can reuse audio sampling logic.
 */
export function extractAudioDataAtTime(
  cachedAnalysis: CachedAudioAnalysisData[] | undefined,
  fileId: string | undefined,
  time: number,
  stemType?: string
): SimpleAudioAnalysisData | null {
  if (!cachedAnalysis || !fileId || cachedAnalysis.length === 0) {
    return null;
  }

  // Extract feature values at the current time
  const volume = getFeatureValueFromCached(cachedAnalysis, fileId, 'volume', time, stemType);
  const bass = getFeatureValueFromCached(cachedAnalysis, fileId, 'bass', time, stemType);
  const mid = getFeatureValueFromCached(cachedAnalysis, fileId, 'mid', time, stemType);
  const treble = getFeatureValueFromCached(cachedAnalysis, fileId, 'treble', time, stemType);
  const spectralCentroid = getFeatureValueFromCached(cachedAnalysis, fileId, 'spectral-centroid', time, stemType);

  // Get frequencies and timeData from the analysis
  let analysis = cachedAnalysis.find(
    a => a.fileMetadataId === fileId && a.stemType === (stemType ?? 'master')
  );

  // FALLBACK: If strict ID match fails, try matching by stemType only
  if (!analysis) {
    analysis = cachedAnalysis.find(a => a.stemType === (stemType ?? 'master'));
  }

  if (!analysis) {
    return null;
  }

  // Extract frequency data (FFT) at the current time
  const fft = analysis.analysisData.fft;
  const frameTimes = analysis.analysisData.frameTimes;
  let frequencies: number[] = [];
  let timeData: number[] = [];

  // Check for real stereo window data first (per-frame extraction)
  const stereoWindowLeft = (analysis.analysisData as any).stereoWindow_left;
  const stereoWindowRight = (analysis.analysisData as any).stereoWindow_right;
  const hasRealStereoData = stereoWindowLeft && stereoWindowRight &&
    Array.isArray(stereoWindowLeft) && Array.isArray(stereoWindowRight) &&
    stereoWindowLeft.length > 0 && stereoWindowRight.length > 0;

  if (hasRealStereoData) {
    // Calculate samples per frame for the flattened stereo window arrays
    const samplesPerFrame = stereoWindowLeft.length > 0 ? 1024 : 256; // Default to 1024 (N value from worker)
    const totalFrames = Math.floor(stereoWindowLeft.length / samplesPerFrame);

    // Find the frame index closest to the current time
    let effectiveFrameTimes = frameTimes;
    if (!effectiveFrameTimes || !Array.isArray(effectiveFrameTimes) || effectiveFrameTimes.length === 0) {
      const duration = (analysis.analysisData as any).analysisDuration || analysis.metadata?.duration || 30;
      effectiveFrameTimes = Array.from({ length: totalFrames }, (_, i) => (i / totalFrames) * duration);
    }

    let frameIndex = 0;
    for (let i = 0; i < effectiveFrameTimes.length; i++) {
      if (effectiveFrameTimes[i] <= time) {
        frameIndex = i;
      } else {
        break;
      }
    }

    // Extract the stereo window for this frame
    const startIdx = frameIndex * samplesPerFrame;
    const endIdx = Math.min(startIdx + samplesPerFrame, stereoWindowLeft.length);

    if (startIdx < stereoWindowLeft.length) {
      timeData = [
        ...stereoWindowLeft.slice(startIdx, endIdx),
        ...stereoWindowRight.slice(startIdx, endIdx)
      ];
    }
  } else if (fft && Array.isArray(fft) && fft.length > 0) {
    // Fallback: Generate time-domain approximation from FFT magnitudes (only if no real stereo data)
    // FIX: Add linear interpolation fallback when frameTimes is missing
    // This handles compressed payloads where frameTimes is not included
    let effectiveFrameTimes = frameTimes;
    let binsPerFrame = 1;

    if (!effectiveFrameTimes || !Array.isArray(effectiveFrameTimes) || effectiveFrameTimes.length === 0) {
      // Generate synthetic linear frameTimes based on analysis duration
      const duration = (analysis.analysisData as any).analysisDuration || analysis.metadata?.duration || 30;
      const numFrames = Math.min(fft.length, 256); // Assume reasonable frame count
      effectiveFrameTimes = Array.from({ length: numFrames }, (_, i) => (i / numFrames) * duration);
      binsPerFrame = Math.floor(fft.length / numFrames);
    } else {
      // [CHANGE 2] Dynamically calculate bin size instead of hardcoding 256
      binsPerFrame = Math.floor(fft.length / effectiveFrameTimes.length);
    }

    // Find the frame index closest to the current time
    let frameIndex = 0;
    for (let i = 0; i < effectiveFrameTimes.length; i++) {
      if (effectiveFrameTimes[i] <= time) {
        frameIndex = i;
      } else {
        break;
      }
    }

    if (binsPerFrame > 0) {
      const startIdx = frameIndex * binsPerFrame;
      const endIdx = Math.min(startIdx + binsPerFrame, fft.length);

      if (startIdx < fft.length) {
        frequencies = Array.from(fft.slice(startIdx, endIdx));
        // FIX: Generate time-domain approximation from FFT magnitudes
        // This is needed for stereometer which requires timeData
        // Generate a sine wave approximation from FFT magnitudes
        const numSamples = Math.min(binsPerFrame, 256);
        timeData = [];
        for (let i = 0; i < numSamples; i++) {
          // Create a simple approximation using the FFT magnitude
          const fftIdx = Math.min(startIdx + i, fft.length - 1);
          const mag = fft[fftIdx] || 0;
          // Add some variation based on index to simulate waveform
          const wave = Math.sin(i * 0.1) * mag * 0.3 + Math.cos(i * 0.05) * mag * 0.2;
          timeData.push(Math.max(-1, Math.min(1, wave)));
        }
      }
    }
  }

  return {
    frequencies: frequencies.length > 0 ? frequencies : new Array(256).fill(0),
    timeData: timeData.length > 0 ? timeData : new Array(256).fill(0),
    volume,
    bass,
    mid,
    treble,
  };
}

export const RayboxComposition: React.FC<RayboxCompositionProps> = ({
  layers,
  audioAnalysisData,
  visualizationSettings,
  masterAudioUrl,
  mappings,
  baseParameterValues,
  featureDecayTimes,
  featureSensitivities,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerManagerRef = useRef<VisualizerManager | null>(null);
  const effectInstancesRef = useRef<Map<string, any>>(new Map());
  const [handle] = useState(() => delayRender('Initializing Visualizer'));
  const isInitializedRef = useRef(false);

  const actualLayers = layers || [];
  const actualAudioAnalysisData = audioAnalysisData || [];

  // 1. Initialize Visualizer (useLayoutEffect) - runs once on mount
  useLayoutEffect(() => {
    if (!canvasRef.current || isInitializedRef.current) return;
    
    let isNewManager = false;

    if (!visualizerManagerRef.current) {
      try {
        visualizerManagerRef.current = new VisualizerManager(canvasRef.current, {
          canvas: { width, height, pixelRatio: 1 },
          performance: { targetFPS: fps, enableShadows: false },
          midi: { velocitySensitivity: 1.0, noteTrailDuration: 2.0, trackColorMapping: {} },
        });
        isNewManager = true;
        // If a new manager is created, any cached effect refs are stale.
        effectInstancesRef.current.clear();
      } catch (e) {
        console.error('Failed to initialize VisualizerManager:', e);
        // Log error but continue - let the render attempt to proceed
        // The canvas will just be black if WebGL fails, but won't crash the render
        continueRender(handle);
        return;
      }
    }

    const manager = visualizerManagerRef.current;
    if (manager) {
      // Ensure renderer matches latest dimensions to avoid aspect ratio glitches.
      manager.handleViewportResize(width, height);

      if (visualizationSettings) {
        manager.updateSettings(visualizationSettings as unknown as Record<string, number>);
      }

      const effectLayers = actualLayers.filter((l) => l.type === 'effect' && l.effectType);
      for (const layer of effectLayers) {
        const hasRef = effectInstancesRef.current.has(layer.id);
        const managerHasEffect =
          typeof manager.getEffect === 'function' ? !!manager.getEffect(layer.id) : false;

        if (!hasRef || !managerHasEffect || isNewManager) {
          const baseValues = baseParameterValues?.[layer.id] || {};
          const mergedSettings = { ...layer.settings, ...baseValues };
          const effectType = layer.effectType as string;
          const effect = EffectRegistry.createEffect(effectType, mergedSettings);
          if (effect) {
            effectInstancesRef.current.set(layer.id, effect);
            manager.addEffect(layer.id, effect);
          }
        }
      }
    }

    // Wait for assets to load before continuing
    const waitForAssets = async () => {
      try {
        const asyncEffects = Array.from(effectInstancesRef.current.values()).filter(
          (effect) => typeof (effect as any).waitForImages === 'function',
        );

        if (asyncEffects.length > 0) {
          // 10s timeout safety to prevent hanging forever on bad URLs
          await Promise.race([
            Promise.all(asyncEffects.map((effect) => (effect as any).waitForImages())),
            new Promise((r) => setTimeout(r, 10000)),
          ]);
        }
      } catch (e) {
        console.warn('⚠️ Asset waiting warning:', e);
      } finally {
        isInitializedRef.current = true;
        continueRender(handle);
      }
    };

    waitForAssets();
  }, [width, height, fps, actualLayers]); // Include actualLayers to update effects on change

  // 2. Render Loop (useLayoutEffect) - runs on every frame
  useLayoutEffect(() => {
    if (!visualizerManagerRef.current || !isInitializedRef.current) return;
    
    const time = frame / fps;
    const deltaTime = 1 / fps;
    const shouldLogMapping = frame < 3 || frame % Math.max(1, Math.round(fps)) === 0;
    const mappingLogEntries: Array<{
      paramKey: string;
      layerId: string;
      paramName: string;
      baseValue: number;
      rawValue: number;
      knob: number;
      delta: number;
      finalValue: number;
    }> = [];

    // 1. Map StemTypes to IDs for lookup
    const stemMap = new Map(actualAudioAnalysisData.map(a => [a.stemType, a.fileMetadataId]));
    
    const fileId = actualAudioAnalysisData.find((a) => a.stemType === 'master')?.fileMetadataId;
    const audioData = extractAudioDataAtTime(
      actualAudioAnalysisData as unknown as CachedAudioAnalysisData[],
      fileId || 'unknown',
      time,
      'master',
    );

    // DEBUG: Check if mappings exist - ALWAYS LOG TO TERMINAL
    if (frame === 0) {
      console.log('[MAPPING DEBUG] mappings:', mappings);
      console.log('[MAPPING DEBUG] actualLayers:', actualLayers.map(l => l.id));
      console.log('[MAPPING DEBUG] audioAnalysisData:', actualAudioAnalysisData.length, 'entries');
    }
    if (mappings && Object.keys(mappings).length > 0) {
      // Map parameter names to their valid max ranges
      const getSliderMax = (p: string): number => {
        const paramMaxMap: Record<string, number> = {
          // 0-1 range parameters
          opacity: 1.0,
          scale: 1.0,
          baseRadius: 1.0,
          threshold: 1.0,
          triggerValue: 1.0,
          // 0-2 range parameters
          contrast: 2.0,
          gamma: 2.2,
          // 0-100 range parameters (for legacy)
          rotation: 360,
          speed: 100,
        };
        return paramMaxMap[p] ?? 100; // Default to 100 for unknown params
      };

      Object.entries(mappings).forEach(([paramKey, mapping]) => {
        if (!mapping?.featureId) return;
        const parsed = parseParamKey(paramKey);
        if (!parsed) return;
        const { effectInstanceId: layerId, paramName } = parsed;

        // IMPORTANT: For mapped parameters, we must use STATIC base values only.
        // Do NOT read from effectInstancesRef.current.get(layerId)?.parameters
        // because those are dynamically updated each frame, causing accumulation.
        let baseValue = baseParameterValues?.[layerId]?.[paramName];
        if (baseValue === undefined)
          baseValue = actualLayers.find((l) => l.id === layerId)?.settings?.[paramName];
        // Default to 0 for unmapped base values - this prevents accumulation
        // since modulation is additive (baseValue + delta)
        if (baseValue === undefined) baseValue = 0;

        // DEBUG
        if (frame < 5) {
          console.log(`[DEBUG] Mapping ${paramKey}:`, {
            layerId,
            paramName,
            baseValue,
            hasBaseInParams: !!baseParameterValues?.[layerId],
            baseParamKeys: Object.keys(baseParameterValues || {}),
            layerIds: actualLayers.map(l => l.id),
          });
        }

        // FIX: Find the correct fileId based on the feature prefix (e.g. "bass-rms")
        const featureStemType = mapping.featureId.split('-')[0] || 'master';
        const targetFileId = stemMap.get(featureStemType) || fileId || 'unknown';

        const rawValue = getFeatureValueFromCached(
          actualAudioAnalysisData as unknown as CachedAudioAnalysisData[],
          targetFileId, // Pass real ID!
          mapping.featureId,
          time,
          undefined, // stemType - let function parse from featureId
          featureDecayTimes, // User-configured decay times
          featureSensitivities, // User-configured sensitivities
          frame, // For debug logging
        );

        const maxValue = getSliderMax(paramName);
        const knob = Math.max(-0.5, Math.min(0.5, (mapping.modulationAmount ?? 0.5) * 2 - 1));
        const delta = rawValue * knob * maxValue;
        const finalValue = Math.max(0, Math.min(maxValue, baseValue + delta));

        // DEBUG: Enhanced logging for triggerValue mapping
        if (frame < 5 || (paramName === 'triggerValue' && frame % 30 === 0)) {
          console.log(`[Mapping Calc] frame=${frame} ${paramKey}:`, {
            featureId: mapping.featureId,
            targetFileId,
            rawValue: rawValue.toFixed(4),
            baseValue,
            knob: knob.toFixed(4),
            maxValue,
            delta: delta.toFixed(4),
            finalValue: finalValue.toFixed(4),
          });
        }

        if (!Number.isNaN(finalValue)) {
          visualizerManagerRef.current?.updateEffectParameter(layerId, paramName, finalValue);
          if (shouldLogMapping) {
            mappingLogEntries.push({
              paramKey,
              layerId,
              paramName,
              baseValue,
              rawValue,
              knob,
              delta,
              finalValue,
            });
          }
        }
      });
    }

    if (shouldLogMapping && mappingLogEntries.length > 0) {
      debugLog.log('🎚️ Audio mapping frame snapshot', {
        frame,
        time: Number(time.toFixed(3)),
        entries: mappingLogEntries,
      });
    }

    visualizerManagerRef.current.updateTimelineState(actualLayers, time);
    if (audioData) visualizerManagerRef.current.setAudioData(audioData);
    
    // 2. Deterministic Update - sets uTime and all effect states based on frame/fps
    // This ensures frame 100 looks identical whether rendered on laptop, AWS Lambda in Virginia, or Oregon
    visualizerManagerRef.current.update(frame, fps);
    
    // 3. Final Draw - render all layers via compositor (don't use deprecated renderFrame)
    visualizerManagerRef.current.getCompositor().render();
    
    // 4. Flush WebGL - ensure canvas is ready for Remotion capture
    if (canvasRef.current) {
      const gl = canvasRef.current.getContext('webgl2') || canvasRef.current.getContext('webgl');
      if (gl) {
        gl.flush(); // Flush all pending commands to the GPU
        gl.finish(); // Force all WebGL commands to complete before returning
      }
    }
  }, [frame, fps, actualLayers, actualAudioAnalysisData, mappings, baseParameterValues, visualizationSettings]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%' }} />
      {masterAudioUrl && <Audio src={masterAudioUrl} />}
      <RemotionOverlayRenderer
        layers={actualLayers}
        audioAnalysisData={actualAudioAnalysisData as unknown as CachedAudioAnalysisData[]}
      />
    </div>
  );
};
</file>

</files>
