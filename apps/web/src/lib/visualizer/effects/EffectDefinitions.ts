import { EffectRegistry } from './EffectRegistry';
import { MetaballsEffect } from './MetaballsEffect';
import { ParticleNetworkEffect } from './ParticleNetworkEffect';
import { ImageSlideshowEffect } from './ImageSlideshowEffect';
import { AsciiFilterEffect } from './AsciiFilterEffect';
import { BloomFilterEffect } from './BloomFilterEffect';

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
import { MiniBlurEffect } from './MiniBlurEffect';
import { NoiseBlurEffect } from './NoiseBlurEffect';
import { ProgressiveBlurEffect } from './ProgressiveBlurEffect';
import { RadialBlurEffect } from './RadialBlurEffect';
import { ZoomBlurEffect } from './ZoomBlurEffect';

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
  id: 'zoomBlur',
  name: 'Zoom Blur',
  description: 'Radial zoom blur from a center point',
  category: 'blur',
  version: '1.0.0',
  constructor: ZoomBlurEffect,
  defaultConfig: {
    intensity: 0.4,
    centerX: 0.5,
    centerY: 0.5,
    samples: 8
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
  id: 'miniBlur',
  name: 'Mini Blur',
  description: 'Fast lightweight blur',
  category: 'blur',
  version: '1.0.0',
  constructor: MiniBlurEffect,
  defaultConfig: {
    intensity: 0.5
  }
});

EffectRegistry.register({
  id: 'noiseBlur',
  name: 'Noise Blur',
  description: 'Noise-driven directional blur',
  category: 'blur',
  version: '1.0.0',
  constructor: NoiseBlurEffect,
  defaultConfig: {
    intensity: 0.5,
    scale: 1.5
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

// BLOOM FILTER (To be replaced by light category bloom later)
EffectRegistry.register({
  id: 'bloomFilter',
  name: 'Bloom Filter',
  description: 'Post-processing bloom with adjustable threshold and softness',
  category: 'filter',
  version: '1.0.0',
  constructor: BloomFilterEffect,
  defaultConfig: {
    intensity: 0.75,
    threshold: 0.55,
    softness: 0.35,
    radius: 0.35
  }
});
