This file is a merged representation of the entire codebase, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the entire repository's contents.
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
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
EffectDefinitions.ts
ImageSlideshowEffect.ts
RayboxComposition.tsx
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="EffectDefinitions.ts">
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

<file path="ImageSlideshowEffect.ts">
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
      threshold: config?.threshold ?? 0.1, // Lower default threshold to catch more transients
      // Enforce minimum threshold of 0.01 to prevent edge case where threshold=0
      // breaks the trigger state machine (wasTriggered can never reset when threshold is 0)
      images: config?.images || [],
      opacity: 1.0,
      position: config?.position || { x: 0.5, y: 0.5 }, // Center by default
      size: config?.size || { width: 1.0, height: 1.0 }, // Full screen by default
      ...config
    };

    // Enforce minimum threshold to prevent broken state machine
    this.parameters.threshold = Math.max(0.01, this.parameters.threshold);

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

    // Check Remotion context FIRST - before any trigger logic
    const remotionEnv = getRemotionEnvironment();
    const isRemotionRendering = remotionEnv.isRendering;
    const isInRemotionContext = isRemotionRendering || remotionEnv.isStudio;

    // STRICT CHECK: If network is throttled due to 403s, stop all operations
    if (this.isNetworkThrottled) {
      return;
    }

    // Trigger detection: Use cooldown-based approach for audio-reactive slideshow
    // This handles cases where drums-peaks produces sustained rising values
    const currentValue = this.parameters.triggerValue;
    const threshold = this.parameters.threshold;

    // Calculate the change in value
    const valueDelta = currentValue - this.previousTriggerValue;

    // Cooldown check: don't trigger too frequently
    const framesSinceLastTrigger = this.frameCounter - this.lastTriggerFrame;
    const cooldownExpired = framesSinceLastTrigger >= this.minFramesBetweenTriggers;

    // Trigger conditions:
    // 1. Value jumped significantly (rising edge) - catches sharp transients
    // 2. OR value is above half threshold and we haven't triggered recently - catches sustained peaks
    const isRisingEdge = valueDelta > threshold;
    const isAboveThreshold = currentValue > threshold * 0.5; // Lower threshold for sustained trigger
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
        isRemotionRendering,
      });
    }

    // CRITICAL FIX: In Remotion rendering mode, do NOT call advanceSlide()
    // because network loading doesn't work reliably in Lambda. Just track state.
    // The effect renders its current texture only - no advancing during render.
    if (shouldTrigger && !isRemotionRendering) {
      if (isInRemotionContext) {
        console.log('[Slideshow] TRIGGER - would advance slide (but blocked in Remotion render)', {
          frame: this.frameCounter,
          currentIndex: this.currentImageIndex,
          reason: isRisingEdge ? 'rising_edge' : 'sustained_peak',
        });
      }
      // Only advance in non-Remotion (live preview) mode
      this.advanceSlide();
      this.lastTriggerFrame = this.frameCounter;
      this.wasTriggered = true;
    } else if (shouldTrigger && isRemotionRendering) {
      // In Remotion mode: just log that we would trigger but can't
      if (isInRemotionContext) {
        console.log('[Slideshow] BLOCKED TRIGGER in Remotion render mode', {
          frame: this.frameCounter,
          currentIndex: this.currentImageIndex,
        });
      }
      // Still track that we "triggered" to prevent rapid re-triggering
      this.lastTriggerFrame = this.frameCounter;
      this.wasTriggered = true;
    } else if (currentValue <= threshold * 0.5 && this.wasTriggered) {
      // Reset wasTriggered when value drops below half threshold - enables next trigger
      // Using threshold * 0.5 ensures reset happens before the next potential trigger point
      if (isInRemotionContext && this.frameCounter % 30 === 0) {
        console.log('[Slideshow Debug] RESET wasTriggered (value dropped below threshold*0.5)', {
          frame: this.frameCounter,
          currentValue: currentValue.toFixed(4),
          threshold,
          threshold05: (threshold * 0.5).toFixed(4),
        });
      }
      this.wasTriggered = false;
    }

    // Update previous value for next frame
    this.previousTriggerValue = currentValue;

    // In Remotion mode, skip all expensive image loading/processing
    // The effect renders its current texture only - no advancing, no loading
    if (isRemotionRendering) {
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

  /**
   * Load image from blob and return as HTMLImageElement.
   * Uses the native Image constructor which is available in both browser and Node.js
   * environments when running with Three.js/Remotion.
   */
  private async loadImageFromBlobAsElement(blob: Blob): Promise<HTMLImageElement> {
    // Convert blob to base64 data URL
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = this.arrayBufferToBase64(arrayBuffer);
    const mimeType = blob.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Create image element using the global Image constructor
    // This is available in browser and in Node.js when running with canvas support
    const img = new (globalThis.Image || Image || HTMLImageElement)();

    return new Promise((resolve, reject) => {
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error('Failed to load image from blob'));
      };
      img.src = dataUrl;
    });
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // Use btoa in browser, but in Node.js we need a different approach
    if (typeof window !== 'undefined') {
      return btoa(binary);
    } else {
      // Node.js environment - use Buffer
      return Buffer.from(binary, 'binary').toString('base64');
    }
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

        let texture: THREE.Texture;

        // Use createImageBitmap in browser (fast, off-main-thread decoding)
        // Fall back to HTMLImageElement for Remotion/Node.js where createImageBitmap is unavailable
        const canUseBitmap = typeof createImageBitmap === 'function';

        if (canUseBitmap) {
          // Browser path: fast off-main-thread decode via ImageBitmap
          const imageBitmap = await createImageBitmap(blob);
          const { bitmap: processedBitmap, wasResized, originalWidth, originalHeight } = await this.resizeImageIfNeeded(imageBitmap, 2048);

          texture = new THREE.CanvasTexture(processedBitmap);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          texture.matrixAutoUpdate = true;
          // flipY = false because we pre-flip in resizeImageIfNeeded() via canvas transform
          texture.flipY = false;

          slideshowLog.log('Texture loaded via ImageBitmap:', {
            url: url.substring(0, 50),
            width: processedBitmap.width,
            height: processedBitmap.height,
            originalWidth,
            originalHeight,
            wasResized,
          });
        } else {
          // Remotion/Node.js path: HTMLImageElement with base64 data URL
          const img = await this.loadImageFromBlobAsElement(blob);

          texture = new THREE.Texture(img);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          texture.matrixAutoUpdate = true;
          texture.flipY = true;
          texture.needsUpdate = true;

          slideshowLog.log('Texture loaded via HTMLImageElement:', {
            url: url.substring(0, 50),
            width: img.width,
            height: img.height,
          });
        }

        this.textureCache.set(url, texture);
        this.loadingImages.delete(url);

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

<file path="RayboxComposition.tsx">
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  Audio,
  delayRender,
  continueRender,
  random,
} from 'remotion';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
// Import EffectDefinitions to ensure effects are registered
import '@/lib/visualizer/effects/EffectDefinitions';
import type { RayboxCompositionProps } from './Root';
import type { AudioAnalysisData as SimpleAudioAnalysisData } from '@/types/visualizer';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import type { SpawnEvent } from '@/lib/visualizer/effects/ParticleNetworkEffect';
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
 * Physics constants for momentum accumulator model.
 *
 * Unlike the old damped spring (wobble) model, this creates organic directional drift:
 * - Peak hits → parameter gets bumped in a random direction (±1)
 * - No spring-back/return-to-zero by default
 * - Decay adds inertia (slows rate of change, doesn't pull back to zero)
 * - Soft bounds gently push back toward base value at extremes
 */
const MOMENTUM_LOOKBACK_MULTIPLIER = 3; // Look back decayTime * this for transients
const SOFT_BOUND_STRENGTH = 0.3;        // How strongly to pull back at extremes

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
 * Stateless peaks calculation for Remotion/Lambda rendering using momentum accumulator model.
 *
 * Algorithm (Momentum Accumulator):
 * 1. Filter transients by sensitivity (remove quiet "noise" peaks)
 * 2. For each transient in lookback window, add directional impulse (random ±1 per transient)
 * 3. Impulses decay exponentially but don't oscillate (no sine wave = no wobble)
 * 4. Apply soft bounds to gently push back toward base value at extremes
 *
 * Key differences from old wobble model:
 * - No oscillation (monotonic decay instead of sin wave)
 * - Random direction per transient creates organic drift
 * - Soft bounds instead of hard clamp
 * - Value drifts naturally, doesn't snap back to zero
 *
 * @param userDecayTimes - User-configured decay times from the export payload
 * @param userSensitivities - User-configured sensitivity values (0-1)
 * @param baseValue - The user's slider base value (default 0.5)
 */
function calculatePeaksValueStateless(
  transients: Array<{ time: number; intensity: number; type?: string }>,
  time: number,
  featureId: string,
  userDecayTimes?: Record<string, number>,
  userSensitivities?: Record<string, number>,
  frameForDebug?: number,
  baseValue: number = 0.5
): number {
  if (!transients || transients.length === 0) return baseValue;

  // Priority: user-configured > hardcoded defaults > fallback
  const sensitivity = userSensitivities?.[featureId]
    ?? DEFAULT_PEAK_SENSITIVITIES[featureId]
    ?? 0.5; // Default to 50%

  // Filter transients by sensitivity BEFORE processing
  const filteredTransients = filterTransientsBySensitivity(transients, sensitivity);

  // DEBUG: Log sensitivity filtering
  if (frameForDebug !== undefined && frameForDebug < 5) {
    console.log(`[Peaks Debug] frame=${frameForDebug} ${featureId}: ${transients.length} → ${filteredTransients.length} transients (sensitivity=${sensitivity})`);
  }

  // If no transients remain after filtering, return base value
  if (!filteredTransients || filteredTransients.length === 0) {
    return baseValue;
  }

  // Priority: user-configured > hardcoded defaults > fallback
  const decayTime = userDecayTimes?.[featureId]
    ?? DEFAULT_PEAK_DECAY_TIMES[featureId]
    ?? DEFAULT_DECAY_TIME;

  // Lookback window based on decay time
  const lookbackWindow = decayTime * MOMENTUM_LOOKBACK_MULTIPLIER;

  // MOMENTUM ACCUMULATOR: Sum directional impulses that decay over time
  let totalMomentum = 0;

  for (const transient of filteredTransients) {
    const elapsed = time - transient.time;

    // Skip future or too-old transients
    if (elapsed < 0 || elapsed > lookbackWindow) continue;

    // Deterministic direction from seeded random using Remotion's random()
    // This ensures same result across renders
    const direction = random(`peak-${transient.time}`) > 0.5 ? 1 : -1;

    // Exponential decay - impulse fades over time but doesn't oscillate
    // (No sine wave = no wobble, just monotonic decay)
    const decayFactor = Math.exp(-elapsed / decayTime);

    // Accumulate momentum (no sine wave = no wobble)
    totalMomentum += transient.intensity * direction * decayFactor;
  }

  // Soft bounds: reduce momentum if it would push too far from [0, 1]
  const projectedValue = baseValue + totalMomentum;

  if (projectedValue > 1) {
    const overshoot = projectedValue - 1;
    totalMomentum -= overshoot * SOFT_BOUND_STRENGTH;
  } else if (projectedValue < 0) {
    const undershoot = -projectedValue;
    totalMomentum += undershoot * SOFT_BOUND_STRENGTH;
  }

  const result = Math.max(0, Math.min(1, baseValue + totalMomentum));

  // DEBUG: Log computed value
  if (frameForDebug !== undefined && (frameForDebug < 10 || frameForDebug % 60 === 0)) {
    console.log(`[Peaks Debug] frame=${frameForDebug} time=${time.toFixed(3)} featureId=${featureId} → value=${result.toFixed(4)} (baseValue=${baseValue.toFixed(2)}, decayTime=${decayTime.toFixed(2)})`);
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
 * @param baseValue - Base value from user's slider (for momentum accumulator model)
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
  baseValue?: number,
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

    return calculatePeaksValueStateless(
      transients,
      time,
      fullFeatureId,
      userDecayTimes,
      userSensitivities,
      frameForDebug,
      baseValue ?? 0.5  // Default to 0.5 if not provided
    );
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
  analysisUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerManagerRef = useRef<VisualizerManager | null>(null);
  const effectInstancesRef = useRef<Map<string, any>>(new Map());
  // Increase timeout to 120 seconds for large payload loading
  const [handle] = useState(() => delayRender('Initializing Visualizer', { timeoutInMilliseconds: 120000 }));
  const isInitializedRef = useRef(false);

  // State for fetched analysis data (needed because calculateMetadata doesn't pass data to Lambda chunks)
  const [fetchedAudioAnalysisData, setFetchedAudioAnalysisData] = useState<typeof audioAnalysisData | null>(null);

  // Fetch analysis data from R2 if analysisUrl exists and audioAnalysisData is empty
  // This is needed because Remotion Lambda doesn't pass calculateMetadata results to chunk renders
  useEffect(() => {
    if (analysisUrl && (!audioAnalysisData || audioAnalysisData.length === 0)) {
      console.log('[RayboxComposition] Fetching analysis data from:', analysisUrl);
      fetch(analysisUrl)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
          return res.json();
        })
        .then(data => {
          console.log('[RayboxComposition] Fetched analysis data:', data.length, 'entries');
          setFetchedAudioAnalysisData(data);
        })
        .catch(err => {
          console.error('[RayboxComposition] Failed to fetch analysis data:', err);
        });
    }
  }, [analysisUrl, audioAnalysisData]);

  const actualLayers = layers || [];
  // Use fetched data if available, otherwise use prop data
  const actualAudioAnalysisData = fetchedAudioAnalysisData || audioAnalysisData || [];

  // 1. Initialize Visualizer (useLayoutEffect) - runs once on mount
  useLayoutEffect(() => {
    // Early return if already initialized or canvas not ready
    if (isInitializedRef.current) return;
    if (!canvasRef.current) {
      console.warn('[RayboxComposition] Canvas ref not ready, waiting for next render');
      return;
    }

    let isNewManager = false;
    let safetyTimeout: NodeJS.Timeout | null = null;

    if (!visualizerManagerRef.current) {
      try {
        console.log('[RayboxComposition] Creating VisualizerManager...');
        visualizerManagerRef.current = new VisualizerManager(canvasRef.current, {
          canvas: { width, height, pixelRatio: 1 },
          performance: { targetFPS: fps, enableShadows: false },
          midi: { velocitySensitivity: 1.0, noteTrailDuration: 2.0, trackColorMapping: {} },
        });
        isNewManager = true;
        // If a new manager is created, any cached effect refs are stale.
        effectInstancesRef.current.clear();
        console.log('[RayboxComposition] VisualizerManager created successfully');
      } catch (e) {
        console.error('[RayboxComposition] Failed to initialize VisualizerManager:', e);
        // Log error but continue - let the render attempt to proceed
        // The canvas will just be black if WebGL fails, but won't crash the render
        isInitializedRef.current = true;
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
      console.log(`[RayboxComposition] Creating ${effectLayers.length} effects...`);
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

        console.log(`[RayboxComposition] Waiting for ${asyncEffects.length} effects with images...`);

        if (asyncEffects.length > 0) {
          // 8s timeout safety to prevent hanging forever on bad URLs
          // (reduced from 10s to give more margin before 33s Remotion timeout)
          await Promise.race([
            Promise.all(asyncEffects.map((effect) => (effect as any).waitForImages())),
            new Promise((r) => setTimeout(r, 8000)),
          ]);
        }
        console.log('[RayboxComposition] Asset loading complete');
      } catch (e) {
        console.warn('[RayboxComposition] Asset waiting warning:', e);
      } finally {
        if (!isInitializedRef.current) {
          isInitializedRef.current = true;
          console.log('[RayboxComposition] Calling continueRender from waitForAssets');
          continueRender(handle);
        }
        // Clear safety timeout since we're done
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
          safetyTimeout = null;
        }
      }
    };

    waitForAssets().catch((err) => {
      console.error('[RayboxComposition] waitForAssets failed:', err);
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        continueRender(handle);
      }
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }
    });

    // Safety timeout: always clear the delayRender after 15 seconds
    // (reduced from 20s to give more margin before 33s Remotion timeout)
    safetyTimeout = setTimeout(() => {
      if (!isInitializedRef.current) {
        console.warn('[RayboxComposition] Safety timeout: forcing continueRender after 15s');
        isInitializedRef.current = true;
        continueRender(handle);
      }
    }, 15000);

    // Cleanup function to clear timeout on unmount
    return () => {
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, fps]); // Removed actualLayers to prevent re-runs during init

  // 1b. Update effects when layers change (after initialization)
  useLayoutEffect(() => {
    if (!isInitializedRef.current || !visualizerManagerRef.current) return;

    const manager = visualizerManagerRef.current;
    const effectLayers = actualLayers.filter((l) => l.type === 'effect' && l.effectType);

    for (const layer of effectLayers) {
      const hasRef = effectInstancesRef.current.has(layer.id);
      const managerHasEffect =
        typeof manager.getEffect === 'function' ? !!manager.getEffect(layer.id) : false;

      if (!hasRef || !managerHasEffect) {
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
  }, [actualLayers, baseParameterValues]);

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

    // 2b. Pass spawn events to particle network effects for stateless Lambda rendering
    // Find all particle network layers and inject spawn events from audio transients
    const particleEffectLayers = actualLayers.filter(
      l => l.type === 'effect' && l.effectType === 'particleNetwork'
    );

    for (const layer of particleEffectLayers) {
      // Determine which stem to use for this particle effect
      // Priority: layer-specific setting > 'drums' (most common for particles)
      const stemType = (layer.settings?.stemType as string) || 'drums';

      // Find the audio analysis data for this stem
      const stemAnalysis = actualAudioAnalysisData.find(
        a => a.stemType === stemType
      );

      if (stemAnalysis?.analysisData) {
        const transients = (stemAnalysis.analysisData as any).transients;

        if (transients && Array.isArray(transients)) {
          // Convert transients to spawn events
          const spawnEvents: SpawnEvent[] = transients.map((t: any) => ({
            time: t.time,
            intensity: t.intensity,
            stemType,
          }));

          // Update the effect parameter
          visualizerManagerRef.current?.updateEffectParameter(layer.id, 'spawnEvents', spawnEvents);

          // DEBUG: Log on first few frames
          if (frame < 3) {
            console.log(`[ParticleSpawn] frame=${frame} layer=${layer.id}: ${spawnEvents.length} spawn events from ${stemType}`);
          }
        }
      }
    }

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
