import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';
import { MultiLayerCompositor } from '../core/MultiLayerCompositor';

export interface AsciiFilterConfig {
  id?: string; // Optional effect ID
  gridSize: number; // 0.005 to 0.05 - controls character size (audio reactive)
  gamma: number; // 0.2 to 2.2 - controls font weight selection (audio reactive)
  opacity: number; // 0.0 to 1.0 - overall effect opacity (audio reactive)
  contrast: number; // 0.0 to 2.0 - contrast boost (audio reactive)
  invert: number; // 0.0 or 1.0 - invert luminance (audio reactive)
  sourceTexture?: THREE.Texture; // Optional source texture to filter (deprecated - uses compositor)
}

export class AsciiFilterEffect implements VisualEffect {
  id: string;
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

  constructor(config: Partial<AsciiFilterConfig> = {}) {
    this.id = config?.id || `asciiFilter_${Math.random().toString(36).substr(2, 9)}`;
    this.name = 'ASCII Filter';
    this.description = 'Converts input to ASCII art with audio-reactive parameters';
    this.enabled = true;
    
    // Extract id from config to avoid including it in parameters
    const { id, ...paramsWithoutId } = config;
    this.parameters = {
      gridSize: 0.05,
      gamma: 1.2,
      opacity: 0.87,
      contrast: 1.4,
      invert: 0.0,
      sourceTexture: config?.sourceTexture,
      ...paramsWithoutId
    };

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.sourceTexture = this.parameters.sourceTexture;
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

  private generateFontSprite(): THREE.Texture {
    // Create a canvas to generate ASCII font sprite
    const canvas = document.createElement('canvas');
    const GLYPH_HEIGHT = 40;
    const GLYPH_WIDTH = 24; // Monospace width
    const CHARS_PER_ROW = 16; // 16 characters per row
    const NUM_CHARS = 95; // ASCII 32-126 (printable characters)
    const NUM_ROWS = Math.ceil(NUM_CHARS / CHARS_PER_ROW);
    
    canvas.width = CHARS_PER_ROW * GLYPH_WIDTH;
    canvas.height = NUM_ROWS * GLYPH_HEIGHT;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2d context for font sprite generation');
    }

    // White background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // White text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${GLYPH_HEIGHT * 0.8}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Generate ASCII characters from space (32) to ~ (126)
    for (let i = 0; i < NUM_CHARS; i++) {
      const charCode = 32 + i;
      const char = String.fromCharCode(charCode);
      const row = Math.floor(i / CHARS_PER_ROW);
      const col = i % CHARS_PER_ROW;
      
      const x = col * GLYPH_WIDTH + GLYPH_WIDTH / 2;
      const y = row * GLYPH_HEIGHT + GLYPH_HEIGHT / 2;
      
      ctx.fillText(char, x, y);
    }

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    
    return texture;
  }

  private setupUniforms() {
    const size = this.renderer ? this.renderer.getSize(new THREE.Vector2()) : new THREE.Vector2(1024, 1024);
    
    this.uniforms = {
      uTexture: { value: this.sourceTexture || null },
      uSprite: { value: this.fontSpriteTexture },
      uResolution: { value: new THREE.Vector2(size.x, size.y) },
      uGridSize: { value: this.parameters.gridSize },
      uGamma: { value: this.parameters.gamma },
      uOpacity: { value: this.parameters.opacity },
      uContrast: { value: this.parameters.contrast },
      uInvert: { value: this.parameters.invert },
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
      uniform float uGridSize;
      uniform float uGamma;
      uniform float uOpacity;
      uniform float uContrast;
      uniform float uInvert;

      varying vec2 vUv;

      const float GLYPH_HEIGHT = 40.0;

      void main() {
        vec2 uv = vUv;
        
        // Calculate aspect ratio to keep grid cells square
        float aspectRatio = uResolution.x / uResolution.y;
        float aspectCorrection = mix(aspectRatio, 1.0 / aspectRatio, 0.5);
        
        // Grid setup - audio reactive via uGridSize
        float baseGrid = 1.0 / uGridSize;
        vec2 cellSize = vec2(1.0 / (baseGrid * aspectRatio), 1.0 / baseGrid) * aspectCorrection;
        
        // Calculate which grid cell we are currently in
        vec2 cell = floor(uv / cellSize);
        vec2 cellCenter = (cell + 0.5) * cellSize;
        vec2 pixelatedCoord = cellCenter;
        
        // Sample the original texture
        vec4 bg = texture2D(uTexture, uv);
        vec4 color = texture2D(uTexture, pixelatedCoord);
        
        // Calculate Luminance (Brightness) of the pixelated cell
        float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
        luminance = mix(luminance, 1.0 - luminance, uInvert);
        
        // Gamma correction for better font weight selection - audio reactive
        float gammaCorrected = pow(clamp(luminance, 0.0, 1.0), uGamma);
        
        // Texture sizes
        ivec2 spriteTextureSize = textureSize(uSprite, 0);
        
        // Determine which glyph to use based on luminance
        float numSprites = max(1.0, float(spriteTextureSize.x) / GLYPH_HEIGHT);
        float numGlyphRows = 1.0;
        
        float spriteIndexWithGamma = clamp(floor(gammaCorrected * numSprites), 0.0, numSprites - 1.0);
        float glyphIndex = 0.0;
        
        // Calculate UVs within the Sprite Sheet
        float normalizedSpriteSizeX = 1.0 / numSprites;
        float normalizedSpriteSizeY = 1.0 / numGlyphRows;
        float spriteX = spriteIndexWithGamma * normalizedSpriteSizeX;
        
        vec2 spriteSheetUV = vec2(spriteX, glyphIndex / numGlyphRows);
        float scaleFactor = uGridSize / GLYPH_HEIGHT;
        vec2 spriteSize = vec2(GLYPH_HEIGHT / aspectRatio, GLYPH_HEIGHT) * scaleFactor * aspectCorrection;
        
        // Map local UVs inside the grid cell to the sprite character
        vec2 localOffset = mod(uv, cellSize) / cellSize;
        
        // Add a small inset to prevent bleeding between characters
        float inset = 0.5 / GLYPH_HEIGHT;
        localOffset = clamp(localOffset, inset, 1.0 - inset);
        
        spriteSheetUV += vec2(
          localOffset.x * normalizedSpriteSizeX, 
          localOffset.y * normalizedSpriteSizeY
        );
        
        // Sample the Sprite Sheet
        vec4 spriteColor = texture2D(uSprite, spriteSheetUV);
        
        // Use the red channel of the sprite as the alpha mask for the character
        float alpha = smoothstep(0.0, 1.0, spriteColor.r);
        
        // Coloring Logic - audio reactive contrast
        vec3 cc = (color.rgb - spriteIndexWithGamma * 0.04) * uContrast;
        
        // Final Mix: Background vs Dithered Character
        vec3 dithered = cc;
        
        // Final blend with original background - audio reactive opacity
        color.rgb = mix(bg.rgb, dithered, alpha * uOpacity);
        
        gl_FragColor = color;
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
      this.fontSpriteTexture = this.generateFontSprite();
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
    this.uniforms.uGridSize.value = this.parameters.gridSize;
    this.uniforms.uGamma.value = this.parameters.gamma;
    this.uniforms.uOpacity.value = this.parameters.opacity;
    this.uniforms.uContrast.value = this.parameters.contrast;
    this.uniforms.uInvert.value = this.parameters.invert;

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
    if (!this.uniforms) return;

    switch (paramName) {
      case 'gridSize':
        this.parameters.gridSize = typeof value === 'number' ? Math.max(0.005, Math.min(0.05, value)) : this.parameters.gridSize;
        if (this.uniforms.uGridSize) {
          this.uniforms.uGridSize.value = this.parameters.gridSize;
        }
        break;
      case 'gamma':
        this.parameters.gamma = typeof value === 'number' ? Math.max(0.2, Math.min(2.2, value)) : this.parameters.gamma;
        if (this.uniforms.uGamma) {
          this.uniforms.uGamma.value = this.parameters.gamma;
        }
        break;
      case 'opacity':
        this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
        if (this.uniforms.uOpacity) {
          this.uniforms.uOpacity.value = this.parameters.opacity;
        }
        break;
      case 'contrast':
        this.parameters.contrast = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.contrast;
        if (this.uniforms.uContrast) {
          this.uniforms.uContrast.value = this.parameters.contrast;
        }
        break;
      case 'invert':
        this.parameters.invert = typeof value === 'number' ? (value > 0.5 ? 1.0 : 0.0) : this.parameters.invert;
        if (this.uniforms.uInvert) {
          this.uniforms.uInvert.value = this.parameters.invert;
        }
        break;
      case 'sourceTexture':
        this.parameters.sourceTexture = value;
        if (this.uniforms.uTexture) {
          this.uniforms.uTexture.value = value || null;
        }
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

