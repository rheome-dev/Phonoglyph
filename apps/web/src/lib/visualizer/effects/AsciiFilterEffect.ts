import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
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

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
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

