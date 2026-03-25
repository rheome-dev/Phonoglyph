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
  threshold: number; // 0.0 to 1.0 - 0.5=all pixels, >0.5=highlights only, <0.5=shadows only (audio reactive)
  falloff: number; // 0.0 to 1.0 - how tightly ASCII sticks to threshold cutoff (audio reactive)
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
  private fontLoaded: boolean = false;

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
      threshold: 0.5, // Center = all pixels pass through (no filtering)
      falloff: 0.2, // Soft edge by default
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

  /**
   * Attempt to load JetBrainsMono via FontFace API so it's available to Canvas 2D.
   * Loads font synchronously (awaits completion) before returning.
   * Returns true if the font was loaded, false if we should use system fallback.
   */
  private loadMonoFont(): boolean {
    // Font paths to try (browser vs Lambda S3 bundle)
    const fontPaths = [
      '/fonts/JetBrainsMono-Regular.ttf',
      // S3 path: public/ directory is included in the bucket path
      '/sites/raybox-renderer/public/fonts/JetBrainsMono-Regular.ttf',
    ];

    for (const path of fontPaths) {
      try {
        const font = new FontFace('AsciiEffectMono', `url(${path})`);
        // Load synchronously by blocking on the promise
        (async () => {
          try {
            const loaded = await font.load();
            document.fonts.add(loaded);
            await document.fonts.ready;
            debugLog.log(`✅ [ASCII Filter] Loaded mono font from ${path}`);
            this.fontLoaded = true;
            // Regenerate sprite with the proper font
            this.buildSprite();
            if (this.uniforms) {
              this.uniforms.uSprite.value = this.fontSpriteTexture;
            }
          } catch (e) {
            debugLog.warn(`⚠️ [ASCII Filter] Font load failed from ${path}:`, e);
          }
        })();
        return true; // Optimistically assume load will succeed
      } catch {
        // Try next path
      }
    }

    // Also try the CSS-declared RayboxJetMono if already available
    try {
      document.fonts.load('bold 48px RayboxJetMono').then(() => {
        if (document.fonts.check('bold 48px RayboxJetMono')) {
          debugLog.log('✅ [ASCII Filter] Using pre-loaded RayboxJetMono');
          this.fontLoaded = true;
          this.buildSprite();
          if (this.uniforms) {
            this.uniforms.uSprite.value = this.fontSpriteTexture;
          }
        }
      });
    } catch {
      // Fall through
    }

    debugLog.warn('⚠️ [ASCII Filter] Could not load JetBrainsMono, using system fallback');
    return false;
  }

  private generateFontSprite(): { texture: THREE.Texture; cols: number; rows: number } {
    const canvas = document.createElement('canvas');
    const GLYPH_HEIGHT = 512; // High resolution — source of truth for crisp ASCII
    const GLYPH_WIDTH = Math.round(GLYPH_HEIGHT * 0.5);  // Aspect ratio ~0.5 for monospace
    const CHARS_PER_ROW = 16;
    const NUM_CHARS = 95; // ASCII 32-126
    const NUM_ROWS = Math.ceil(NUM_CHARS / CHARS_PER_ROW);

    canvas.width = CHARS_PER_ROW * GLYPH_WIDTH;
    canvas.height = NUM_ROWS * GLYPH_HEIGHT;

    console.log(`[ASCII Filter] Generating sprite sheet: ${canvas.width}x${canvas.height}px, glyph=${GLYPH_WIDTH}x${GLYPH_HEIGHT}`);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2d context for font sprite generation');
    }

    // 1. Fill Background (Black)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Pick font — prefer loaded mono font, fall back to system
    // Order matters: earlier fonts are preferred. DejaVu Sans Mono is reliably
    // available in Lambda's headless Chromium.
    const fontFamily = this.fontLoaded
      ? 'AsciiEffectMono, RayboxJetMono, monospace'
      : '"DejaVu Sans Mono", "DejaVu Sans", Consolas, Monaco, Menlo, "Courier New", monospace';

    ctx.fillStyle = '#FFFFFF';
    const fontSize = Math.round(GLYPH_HEIGHT * 0.75);
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < NUM_CHARS; i++) {
      const char = String.fromCharCode(32 + i);
      const row = Math.floor(i / CHARS_PER_ROW);
      const col = i % CHARS_PER_ROW;

      // Draw character centered in cell (no padding needed with NearestFilter)
      const x = col * GLYPH_WIDTH + GLYPH_WIDTH / 2;
      const y = row * GLYPH_HEIGHT + GLYPH_HEIGHT / 2;

      ctx.fillText(char, x, y);
    }

    const texture = new THREE.CanvasTexture(canvas);
    // CRITICAL: NearestFilter = no interpolation = crisp pixel-art text at any resolution.
    // LinearFilter causes bilinear interpolation between glyph pixels, creating blurry/
    // overlapping edges — especially bad at low Lambda output resolutions.
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = true;

    console.log(`[ASCII Filter] Sprite generated: ${NUM_CHARS} chars, ${GLYPH_WIDTH}x${GLYPH_HEIGHT}px each. Font: ${fontFamily.split(',')[0]}`);

    return { texture, cols: CHARS_PER_ROW, rows: NUM_ROWS };
  }

  private setupUniforms() {
    const size = this.renderer ? this.renderer.getSize(new THREE.Vector2()) : new THREE.Vector2(1024, 1024);

    this.uniforms = {
      uTexture: { value: this.sourceTexture || null },
      uSprite: { value: this.fontSpriteTexture },
      uSpriteGrid: { value: new THREE.Vector2(this.spriteCols, this.spriteRows) },
      uResolution: { value: new THREE.Vector2(size.x, size.y) },
      uGridSize: { value: this.mapTextSizeToGridSize(this.parameters.textSize) },
      uGamma: { value: this.parameters.gamma },
      uOpacity: { value: this.parameters.opacity },
      uContrast: { value: this.parameters.contrast },
      uInvert: { value: this.parameters.invert },
      uThreshold: { value: this.parameters.threshold },
      uFalloff: { value: this.parameters.falloff },
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
      uniform vec2 uSpriteGrid;
      uniform float uGridSize;
      uniform float uGamma;
      uniform float uOpacity;
      uniform float uContrast;
      uniform float uInvert;
      uniform float uThreshold;
      uniform float uFalloff;
      uniform float uHideBackground;
      uniform vec3 uColor;

      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;

        float aspectRatio = uResolution.x / uResolution.y;
        float charsAcross = 1.0 / uGridSize;
        float charsDown = charsAcross / aspectRatio * 0.5;
        vec2 cellCount = vec2(charsAcross, charsDown);

        vec2 gridUV = floor(uv * cellCount) / cellCount;
        vec2 centerUV = gridUV + (0.5 / cellCount);

        vec4 centerColor = texture2D(uTexture, centerUV);

        if (centerColor.a < 0.1) {
          gl_FragColor = vec4(0.0);
          return;
        }

        float rawGray = dot(centerColor.rgb, vec3(0.299, 0.587, 0.114));

        float gray = rawGray;
        gray = mix(gray, 1.0 - gray, uInvert);
        gray = pow(gray, uGamma);
        gray = clamp((gray - 0.5) * uContrast + 0.5, 0.0, 1.0);

        float thresholdMask = 1.0;
        if (uThreshold > 0.501) {
          float cutoff = (uThreshold - 0.5) * 2.0;
          float falloffHalf = max(uFalloff * 0.5, 0.001);
          thresholdMask = smoothstep(cutoff - falloffHalf, cutoff + falloffHalf, rawGray);
        } else if (uThreshold < 0.499) {
          float cutoff = (0.5 - uThreshold) * 2.0;
          float falloffHalf = max(uFalloff * 0.5, 0.001);
          thresholdMask = smoothstep(cutoff - falloffHalf, cutoff + falloffHalf, 1.0 - rawGray);
        }

        float totalChars = uSpriteGrid.x * uSpriteGrid.y;
        float charIndex = floor(gray * (totalChars - 1.0));

        float colIndex = mod(charIndex, uSpriteGrid.x);
        float rowIndex = floor(charIndex / uSpriteGrid.x);

        // Map local UV (0-1 per cell) directly to sprite sheet
        // NearestFilter means we don't need padding/inset — pixels map 1:1
        vec2 localUV = fract(uv * cellCount);
        float spriteX = (colIndex + localUV.x) / uSpriteGrid.x;
        float spriteY = (rowIndex + localUV.y) / uSpriteGrid.y;
        vec2 spriteUV = vec2(spriteX, spriteY);

        vec4 charColor = texture2D(uSprite, spriteUV);

        vec3 asciiCellColor;
        float finalAlpha;

        if (uHideBackground > 0.5) {
          asciiCellColor = uColor;
          finalAlpha = centerColor.a * charColor.r;
        } else {
          asciiCellColor = mix(centerColor.rgb, uColor, charColor.r);
          finalAlpha = centerColor.a;
        }

        vec4 asciiResult = vec4(asciiCellColor, finalAlpha);

        vec4 original = texture2D(uTexture, uv);
        float blendFactor = uHideBackground > 0.5 ? 1.0 : uOpacity;

        vec4 asciiWithOpacity = mix(original, asciiResult, blendFactor);
        gl_FragColor = mix(original, asciiWithOpacity, thresholdMask);
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
        depthTest: false,
        toneMapped: false
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
    this.scene.add(this.mesh);
  }

  init(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;

    // Attempt to load JetBrainsMono BEFORE generating sprite.
    // This is synchronous in the sense that we call it before buildSprite,
    // so the first sprite uses the loaded font if available.
    // The loadMonoFont triggers an async background refresh if font loads later.
    this.loadMonoFont();

    // Generate sprite (uses the loaded font if available, system font otherwise)
    this.buildSprite();

    this.setupUniforms();
    this.createMaterial();
    this.createMesh();

    debugLog.log('✅ ASCII Filter Effect initialized');
  }

  private buildSprite(): void {
    try {
      const spriteData = this.generateFontSprite();
      this.fontSpriteTexture = spriteData.texture;
      this.spriteCols = spriteData.cols;
      this.spriteRows = spriteData.rows;
    } catch (error) {
      debugLog.error('Failed to generate font sprite:', error);
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
    if (this.uniforms.uThreshold) this.uniforms.uThreshold.value = this.parameters.threshold;
    if (this.uniforms.uFalloff) this.uniforms.uFalloff.value = this.parameters.falloff;
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
      case 'threshold':
        this.parameters.threshold = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.threshold;
        this.uniforms.uThreshold.value = this.parameters.threshold;
        break;
      case 'falloff':
        this.parameters.falloff = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.falloff;
        this.uniforms.uFalloff.value = this.parameters.falloff;
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

