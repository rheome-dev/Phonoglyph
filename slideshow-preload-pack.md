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
- Only files matching these patterns are included: apps/web/src/remotion/RayboxComposition.tsx, apps/web/src/remotion/Root.tsx, apps/web/src/lib/visualizer/effects/ImageSlideshowEffect.ts, apps/web/src/lib/visualizer/effects/EffectDefinitions.ts
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
            EffectDefinitions.ts
            ImageSlideshowEffect.ts
      remotion/
        RayboxComposition.tsx
        Root.tsx
</directory_structure>

<files>
This section contains the contents of the repository's files.

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
  // Background color for the visualizer (hex string, e.g. '#1a0033')
  backgroundColor?: string;
  // Whether the background color layer is visible
  isBackgroundVisible?: boolean;
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
  defaultConfig: {
    connectionLineWidth: 1.0,
    connectionColor: '#ffffff'
  }
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
    size: { width: 1.0, height: 1.0 },
    slideEvents: [] // STATELESS: pre-computed transients for Lambda rendering
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
    threshold: 0.5,
    falloff: 0.2,
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

<file path="apps/web/src/remotion/RayboxComposition.tsx">
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

const VALID_STEMS = new Set(['master', 'drums', 'bass', 'vocals', 'melody', 'other']);

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
  backgroundColor,
  isBackgroundVisible,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerManagerRef = useRef<VisualizerManager | null>(null);
  const effectInstancesRef = useRef<Map<string, any>>(new Map());
  // Increase timeout to 120 seconds for large payload loading
  const [handle] = useState(() => delayRender('Initializing Visualizer', { timeoutInMilliseconds: 120000 }));
  const isInitializedRef = useRef(false);

  // State for fetched analysis data.
  // In Lambda: calculateMetadata fetches from analysisUrl and injects audioAnalysisData into chunk
  // props, so audioAnalysisData is populated directly. fetchedAudioAnalysisData stays null.
  // In CLI/standalone: audioAnalysisData may be empty (no calculateMetadata), so we fetch from
  // analysisUrl and store here to trigger the slideshow preload effect.
  const [fetchedAudioAnalysisData, setFetchedAudioAnalysisData] = useState<typeof audioAnalysisData | null>(null);

  // Second delayRender handle: keeps rendering paused until slideshow images are preloaded
  // after audio analysis data arrives. Only created when using analysisUrl (Lambda case)
  // where audio data is fetched async and slideshow images can't be preloaded during init.
  const hasSlideshowLayers = (layers || []).some(l => l.type === 'effect' && l.effectType === 'imageSlideshow');
  const [slideshowPreloadHandle] = useState(() =>
    hasSlideshowLayers && analysisUrl
      ? delayRender('Preloading Slideshow Images', { timeoutInMilliseconds: 60000 })
      : null
  );
  // Default to true: no preloading handle means no blocking needed.
  // The effect below sets this to false ONLY when it creates a real delayRender
  // handle that must be waited on before rendering proceeds.
  const slideshowPreloadDoneRef = useRef(true);

  // Fetch analysis data from R2 if analysisUrl exists and audioAnalysisData is empty.
  // In Lambda: audioAnalysisData is populated via calculateMetadata, so this is skipped.
  // In CLI/standalone: audioAnalysisData may be empty, so we fetch from analysisUrl.
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
          // On fetch failure, release the slideshow preload handle so rendering can proceed
          if (slideshowPreloadHandle && !slideshowPreloadDoneRef.current) {
            slideshowPreloadDoneRef.current = true;
            continueRender(slideshowPreloadHandle);
          }
        });
    }
  }, [analysisUrl, audioAnalysisData]);

  const actualLayers = layers || [];
  // Use fetched data if available, otherwise use prop data
  const actualAudioAnalysisData = fetchedAudioAnalysisData || audioAnalysisData || [];

  // Pre-populate slideEvents on slideshow effects and preload images once audio data arrives.
  // This effect handles the Lambda case where audio data arrives via props (calculateMetadata
  // injects audioAnalysisData into chunk props) or via async fetch from analysisUrl.
  //
  // Key: Check actualAudioAnalysisData (not fetchedAudioAnalysisData) because:
  // - In main Lambda: actualAudioAnalysisData = fetchedAudioAnalysisData (populated from S3 fetch)
  // - In Lambda chunks: actualAudioAnalysisData = audioAnalysisData (injected by calculateMetadata)
  // - In CLI/standalone: actualAudioAnalysisData = audioAnalysisData (passed directly)
  //
  // Note: waitForAssets (in useLayoutEffect) also sets slideEvents as a safety net, but this
  // effect ensures slideshowPreloadHandle is always properly released.
  useEffect(() => {
    if (!slideshowPreloadHandle) return; // No handle = no blocking needed
    if (slideshowPreloadDoneRef.current) return; // Already released

    // Need both audio data AND the manager to be ready
    if (!actualAudioAnalysisData || actualAudioAnalysisData.length === 0) return;
    const manager = visualizerManagerRef.current;
    if (!manager) return; // Manager not yet created by useLayoutEffect

    // Signal that we're now actively blocking on image preloading
    slideshowPreloadDoneRef.current = false;

    const slideshowLayers = actualLayers.filter(
      l => l.type === 'effect' && l.effectType === 'imageSlideshow'
    );

    if (slideshowLayers.length === 0) {
      slideshowPreloadDoneRef.current = true;
      continueRender(slideshowPreloadHandle);
      return;
    }

    // Set slideEvents on each slideshow effect so waitForImages can preload correctly
    for (const layer of slideshowLayers) {
      const stemType = (layer.settings?.stemType as string) || 'drums';
      const stemAnalysis = (actualAudioAnalysisData as any[]).find(
        (a: any) => a.stemType === stemType
      );
      if (stemAnalysis?.analysisData) {
        const transients = (stemAnalysis.analysisData as any).transients;
        if (transients && Array.isArray(transients)) {
          const slideEvents = transients.map((t: any) => ({
            time: t.time,
            intensity: t.intensity || 1.0,
          }));
          manager.updateEffectParameter(layer.id, 'slideEvents', slideEvents);
          console.log(`[SlideshowPreload] Set ${slideEvents.length} slideEvents on layer ${layer.id}`);
        }
      }
    }

    // Preload first image only for each slideshow effect (avoids OOM in Lambda)
    const slideshowEffects = slideshowLayers
      .map(l => effectInstancesRef.current.get(l.id))
      .filter(Boolean)
      .filter(effect => typeof (effect as any).waitForImages === 'function');

    console.log(`[SlideshowPreload] Preloading images for ${slideshowEffects.length} slideshow effects`);

    // Race: wait for image loads OR 10s safety timeout
    Promise.race([
      Promise.all(slideshowEffects.map(effect => (effect as any).waitForImages())),
      new Promise(r => setTimeout(r, 10000)),
    ]).finally(() => {
      if (!slideshowPreloadDoneRef.current) {
        slideshowPreloadDoneRef.current = true;
        console.log('[SlideshowPreload] Slideshow images preloaded (or timed out), releasing delayRender');
        continueRender(slideshowPreloadHandle);
      }
    });
  }, [actualAudioAnalysisData, slideshowPreloadHandle]);

  // Safety timeout: if slideshowPreloadHandle exists but data never arrives (e.g. fetch fails),
  // release the handle after 30s so the Lambda render doesn't time out at 58s.
  useEffect(() => {
    if (!slideshowPreloadHandle) return;
    const timeout = setTimeout(() => {
      if (!slideshowPreloadDoneRef.current) {
        console.warn('[SlideshowPreload] Safety timeout: data never arrived, releasing handle');
        slideshowPreloadDoneRef.current = true;
        continueRender(slideshowPreloadHandle);
      }
    }, 30000);
    return () => clearTimeout(timeout);
  }, [slideshowPreloadHandle]);

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

      // Apply background color settings from project
      if (backgroundColor && typeof manager.setBackgroundColor === 'function') {
        manager.setBackgroundColor(backgroundColor);
      }
      if (isBackgroundVisible !== undefined && typeof manager.setBackgroundVisibility === 'function') {
        manager.setBackgroundVisibility(isBackgroundVisible);
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
        console.log(`[RayboxComposition] waitForAssets: actualAudioAnalysisData.length=${actualAudioAnalysisData?.length ?? 'null/undefined'}`);

        // Pre-populate slideEvents on slideshow effects so waitForImages can preload correctly.
        // In Lambda chunks: audioAnalysisData is provided directly via props (serialized by calculateMetadata).
        // In main Lambda render: the separate slideshowPreloadHandle effect also sets slideEvents.
        if (actualAudioAnalysisData && actualAudioAnalysisData.length > 0 && manager) {
          const slideshowLayers = actualLayers.filter(
            l => l.type === 'effect' && l.effectType === 'imageSlideshow'
          );
          for (const layer of slideshowLayers) {
            const stemType = (layer.settings?.stemType as string) || 'drums';
            const stemAnalysis = (actualAudioAnalysisData as any[]).find(
              (a: any) => a.stemType === stemType
            );
            if (stemAnalysis?.analysisData) {
              const transients = (stemAnalysis.analysisData as any).transients;
              if (transients && Array.isArray(transients)) {
                const slideEvents = transients.map((t: any) => ({
                  time: t.time,
                  intensity: t.intensity || 1.0,
                }));
                manager.updateEffectParameter(layer.id, 'slideEvents', slideEvents);
                console.log(`[RayboxComposition] Pre-populated ${slideEvents.length} slideEvents for layer ${layer.id}`);
              }
            }
          }
        }

        if (asyncEffects.length > 0) {
          console.log(`[RayboxComposition] Calling waitForImages on ${asyncEffects.length} effects (8s timeout)...`);
          const startTime = Date.now();
          await Promise.race([
            Promise.all(asyncEffects.map((effect) => (effect as any).waitForImages())),
            new Promise((r) => setTimeout(r, 8000)),
          ]);
          console.log(`[RayboxComposition] waitForImages resolved after ${Date.now() - startTime}ms`);
        } else {
          console.log('[RayboxComposition] No async effects to wait for');
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
        // Release slideshow preload handle if still pending
        if (slideshowPreloadHandle && !slideshowPreloadDoneRef.current) {
          slideshowPreloadDoneRef.current = true;
          continueRender(slideshowPreloadHandle);
          console.log('[RayboxComposition] Released slideshowPreloadHandle from waitForAssets');
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
      // Release slideshow preload handle on error to avoid blocking render
      if (slideshowPreloadHandle && !slideshowPreloadDoneRef.current) {
        slideshowPreloadDoneRef.current = true;
        continueRender(slideshowPreloadHandle);
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
      // Also release slideshow preload handle so render isn't blocked indefinitely
      // (can happen if fetchedAudioAnalysisData arrives after safety timeout fires)
      if (slideshowPreloadHandle && !slideshowPreloadDoneRef.current) {
        slideshowPreloadDoneRef.current = true;
        continueRender(slideshowPreloadHandle);
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
      } else {
        // Effect already exists - update its parameters from layer.settings
        // This ensures settings changes are applied on each render
        const existingEffect = effectInstancesRef.current.get(layer.id);
        if (existingEffect && layer.settings) {
          for (const [paramName, value] of Object.entries(layer.settings)) {
            if (value !== undefined && value !== null) {
              existingEffect.updateParameter(paramName, value);
            }
          }
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

    // 2c. Pass slide events to image slideshow effects for stateless Lambda rendering
    // Similar to particle effects, but for image slideshow transitions
    const slideshowLayers = actualLayers.filter(
      l => l.type === 'effect' && l.effectType === 'imageSlideshow'
    );

    for (const layer of slideshowLayers) {
      // Determine which stem to use for slideshow triggers
      // Priority: layer-specific setting > 'drums' (most common for beats)
      const stemType = (layer.settings?.stemType as string) || 'drums';

      // Find the audio analysis data for this stem
      const stemAnalysis = actualAudioAnalysisData.find(
        a => a.stemType === stemType
      );

      if (stemAnalysis?.analysisData) {
        const transients = (stemAnalysis.analysisData as any).transients;

        if (transients && Array.isArray(transients)) {
          // Apply sensitivity filtering to match live preview behavior.
          // Without this, exports would use ALL transients regardless of the user's
          // sensitivity slider, causing more frequent slide advances than the preview.
          const featureId = `${stemType}-peaks`;
          const sensitivity = featureSensitivities?.[featureId]
            ?? DEFAULT_PEAK_SENSITIVITIES[featureId]
            ?? 0.5;
          const filteredTransients = filterTransientsBySensitivity(transients, sensitivity);

          // Convert filtered transients to slide events
          const slideEvents = filteredTransients.map((t: any) => ({
            time: t.time,
            intensity: t.intensity || 1.0,
          }));

          // Update the effect parameter
          visualizerManagerRef.current?.updateEffectParameter(layer.id, 'slideEvents', slideEvents);

          // DEBUG: Log on first few frames
          if (frame < 3) {
            console.log(`[SlideshowEvents] frame=${frame} layer=${layer.id}: ${slideEvents.length} slide events from ${stemType} (${transients.length} raw, sensitivity=${sensitivity})`);
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
        masterAudioUrl={masterAudioUrl}
      />
    </div>
  );
};
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
    // STATELESS: Pre-computed slide events for deterministic Lambda rendering
    slideEvents: { time: number; intensity: number }[];
  };

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private plane!: THREE.Mesh; // Initialized in updatePlaneGeometryAndPosition
  private renderer?: THREE.WebGLRenderer;

  private applyTexture(texture: THREE.Texture | null) {
    if (this.material.map === texture) return;
    const wasNull = this.material.map === null;
    const isNowNull = texture === null;

    this.material.map = texture;
    
    if (texture) {
      this.material.color.setHex(0xffffff);
      this.plane.visible = true;
      this.fitTextureToScreen(texture);
    } else {
      this.material.color.setHex(0x000000); // Back to black
    }
    
    // Always signal material update when texture changes — swangle (Lambda software WebGL)
    // may not auto-detect map changes without needsUpdate, causing stale texture to linger.
    this.material.needsUpdate = true;
  }
  private material: THREE.MeshBasicMaterial;

  private currentImageIndex: number = -1;
  private textureCache: Map<string, THREE.Texture> = new Map();
  private loadingImages: Set<string> = new Set();
  private wasTriggered: boolean = false;
  private previousTriggerValue: number = 0; // Track previous value for edge detection
  private lastTriggerFrame: number = -999; // Frame when we last triggered (for cooldown)
  private minFramesBetweenTriggers: number = 3; // Minimum ~50ms at 60fps between triggers (allows very fast hi-hats/fills!)
  private textureLoader = new THREE.TextureLoader();
  private aspectRatio: number = 1;
  private failureCount = 0;
  private pendingTextureResolvers: Map<string, ((texture: THREE.Texture) => void)[]> = new Map();
  // Cached Remotion environment (doesn't change at runtime)
  private isRemotionRendering: boolean = false;
  private isInRemotionContext: boolean = false;
  private frameCounter: number = 0; // For periodic debug logging
  private lastErrorTime: number = 0;
  private errorCooldownMs: number = 2000; // 2 seconds cooldown
  private isNetworkThrottled: boolean = false; // Hard stop on 403 errors
  private consecutiveErrors: number = 0; // Track consecutive 403 errors
  private blacklistedUrls: Set<string> = new Set(); // URLs that returned 403/404

  // STATELESS: Track last calculated index to avoid redundant texture loads
  private lastCalculatedIndex: number = -1;
  // STATELESS: Guard to prevent updateWithTime from running before slideEvents are set.
  // On Lambda chunk restarts, initializedRef stays false until waitForImages confirms setup.
  private slideEventsInitialized: boolean = false;

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
      slideEvents: config?.slideEvents || [], // STATELESS: pre-computed transients for Lambda
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
    this.renderer = renderer;
    const remotionEnv = getRemotionEnvironment();
    this.isRemotionRendering = remotionEnv.isRendering;
    this.isInRemotionContext = remotionEnv.isRendering || remotionEnv.isStudio;

    slideshowLog.log('Initializing ImageSlideshowEffect', {
      effectId: this.id,
      imagesCount: this.parameters.images.length,
      sampleUrls: this.parameters.images.slice(0, 2).map(url => url.substring(0, 60) + '...')
    });

    if (this.isInRemotionContext) {
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

    // Trigger condition: Only fire on a clear rising edge (value jumped by more than threshold).
    // The "isAboveThreshold && !wasTriggered" path is intentionally removed — with a
    // momentum-accumulator input the base value hovers around 0.5, so "above threshold"
    // is always true and would cause spurious re-triggers after the cooldown expires.
    const isRisingEdge = valueDelta > threshold;
    const shouldTrigger = cooldownExpired && isRisingEdge;

    // DEBUG: Log state periodically or on triggers (Remotion only)
    if (this.isInRemotionContext && (this.frameCounter % 30 === 0 || shouldTrigger)) {
      console.log('[Slideshow Debug]', {
        frame: this.frameCounter,
        currentValue: currentValue.toFixed(4),
        valueDelta: valueDelta.toFixed(4),
        threshold,
        cooldownExpired,
        framesSinceLastTrigger,
        shouldTrigger,
        currentImageIndex: this.currentImageIndex,
        isRemotionRendering: this.isRemotionRendering,
      });
    }

    if (shouldTrigger && !this.isRemotionRendering) {
      // Live preview mode: advance slide immediately (non-blocking)
      this.advanceSlide();
      this.lastTriggerFrame = this.frameCounter;
      this.wasTriggered = true;
    } else if (shouldTrigger && this.isRemotionRendering) {
      // Remotion mode: track trigger state but don't advance (Lambda uses slideEvents)
      this.lastTriggerFrame = this.frameCounter;
      this.wasTriggered = true;
    } else if (currentValue <= threshold * 0.5 && this.wasTriggered) {
      this.wasTriggered = false;
    }

    // Update previous value for next frame
    this.previousTriggerValue = currentValue;

    // In Remotion mode, skip all expensive image loading/processing
    if (this.isRemotionRendering) {
      this.frameCounter++;
      return;
    }

    // Emergency backoff if we are hitting errors (e.g. 403s)
    if (Date.now() - this.lastErrorTime < this.errorCooldownMs) {
      return;
    }

    this.frameCounter++;

    // Opacity debug logging removed for performance

    // If images were added after init, load the first one immediately
    if (this.currentImageIndex === -1 && this.parameters.images.length > 0) {
      this.advanceSlide();
    }

    // If a texture load completed in the background, apply it now
    if (this.currentImageIndex >= 0) {
      const currentUrl = this.parameters.images[this.currentImageIndex];
      if (currentUrl) {
        const cachedTexture = this.textureCache.get(currentUrl);
        if (cachedTexture && this.material.map !== cachedTexture) {
          this.applyTexture(cachedTexture);
        }
      }
    }

    // Retry loading the CURRENT image if no texture is displayed.
    // Important: Do NOT call advanceSlide() here — that would skip ahead through
    // images every frame when a texture is loading, causing multiple advances per trigger.
    if (
      !this.material.map &&
      this.currentImageIndex >= 0 &&
      this.parameters.images.length > 0 &&
      this.failureCount < this.parameters.images.length * 2
    ) {
      const currentUrl = this.parameters.images[this.currentImageIndex];
      if (currentUrl && !this.textureCache.has(currentUrl) && !this.loadingImages.has(currentUrl)) {
        this.loadTexture(currentUrl).catch(() => {
          this.failureCount++;
        });
      }
    }

    // Update plane position and size if parameters changed
    this.updatePlaneGeometryAndPosition();

    // Safety: if a texture is present but the plane is somehow hidden, force it visible
    if (this.material.map && !this.plane.visible) {
      this.plane.visible = true;
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
          this.applyTexture(null);
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
    } else if (paramName === 'slideEvents') {
      // STATELESS: Receive pre-computed slide events from audio transients
      if (Array.isArray(value)) {
        this.parameters.slideEvents = value as { time: number; intensity: number }[];
        slideshowLog.log('slideEvents updated:', {
          count: this.parameters.slideEvents.length,
          sample: this.parameters.slideEvents.slice(0, 3)
        });
      }
    }
  }

  /**
   * STATELESS: Update method that receives absolute time for deterministic Lambda rendering.
   * This computes the current slide index based on slideEvents, eliminating stateful edge detection.
   * @param absoluteTime - Absolute time in seconds (frame / fps)
   */
  updateWithTime(absoluteTime: number): void {
    if (!this.enabled) return;
    if (this.parameters.images.length === 0) return;

    // Use cached Remotion environment (set in init)

    // STATELESS: Use slideEvents if available (Lambda mode)
    const slideEvents = this.parameters.slideEvents;

    // GUARD: On Lambda chunk restarts, slideEvents may not be set yet when updateWithTime
    // first runs (waitForImages runs after the first few frames). Skip to avoid resetting
    // lastCalculatedIndex to -1 and briefly flashing the wrong slide.
    if (this.isInRemotionContext && !this.slideEventsInitialized) return;

    if (slideEvents && slideEvents.length > 0) {
      // Count how many events have occurred by this time
      // Each event triggers one slide advance
      const eventsSoFar = slideEvents.filter(e => e.time <= absoluteTime).length;

      // Calculate which image should be shown (wrap around)
      const newIndex = eventsSoFar % this.parameters.images.length;

      // When index changes: update state and load texture
      if (newIndex !== this.lastCalculatedIndex) {
        const oldIdx = this.lastCalculatedIndex;

        this.lastCalculatedIndex = newIndex;
        this.currentImageIndex = newIndex;

        if (this.isInRemotionContext) {
          console.log(`[Slideshow Stateless] time=${absoluteTime.toFixed(2)}s, events=${eventsSoFar}, index=${newIndex}`);
        }

        // Load the texture if not already cached (async — old image stays visible until loaded)
        const imageUrl = this.parameters.images[newIndex];
        if (imageUrl && !this.textureCache.has(imageUrl)) {
          this.loadTexture(imageUrl).then((texture) => {
            if (texture) {
              this.applyTexture(texture);
            }
          }).catch(() => {});
        }

        // Look-ahead: preload the image that will be shown on the NEXT transition.
        // Use oldIdx (previous index before this transition) so the math works out:
        // 0→1 transition: oldIdx=0, look-ahead preloads image 1 ✓
        // 1→2 transition: oldIdx=1, look-ahead preloads image 2 ✓
        // First call (-1→0): oldIdx=-1 wraps to last image, but waitForImages
        //   already preloaded image 0 so this is a harmless duplicate.
        const lookAheadIdx = (oldIdx + 1 + this.parameters.images.length) % this.parameters.images.length;
        const lookAheadUrl = this.parameters.images[lookAheadIdx];
        if (lookAheadUrl && !this.textureCache.has(lookAheadUrl) && !this.loadingImages.has(lookAheadUrl)) {
          this.loadTexture(lookAheadUrl).then((texture) => {
            if (texture) {
              this.applyTexture(texture);
            }
          }).catch(() => {});
        }
      }

      // EVERY FRAME: Apply texture for current index if it's now in cache.
      if (this.currentImageIndex >= 0) {
        const imageUrl = this.parameters.images[this.currentImageIndex];
        const texture = imageUrl ? this.textureCache.get(imageUrl) : undefined;
        if (texture && this.material.map !== texture) {
          this.applyTexture(texture);
        }
      }

      return;
    }

    // FALLBACK: No slideEvents - use legacy stateful approach for live preview
    // (This path should rarely be hit in Lambda as slideEvents should always be provided)
    if (this.isInRemotionContext && this.frameCounter % 60 === 0) {
      console.log('[Slideshow] WARNING: No slideEvents, falling back to stateful mode');
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

  /**
   * Advance to the next slide. This method is NON-BLOCKING:
   * - Cache hit: swaps the texture synchronously (instant, same frame)
   * - Cache miss: advances the index immediately and starts a background load.
   *   The texture will be applied on the next frame when update() detects it in cache.
   * No trigger is ever blocked by a pending load.
   */
  private advanceSlide() {
    if (this.parameters.images.length === 0) return;

    const nextIndex = (this.currentImageIndex + 1) % this.parameters.images.length;

    // Guard: already on this index
    if (nextIndex === this.currentImageIndex && this.currentImageIndex !== -1) return;

    const imageUrl = this.parameters.images[nextIndex];

    // Always advance the index immediately so the trigger state machine progresses
    this.currentImageIndex = nextIndex;

    // Try synchronous cache hit — instant texture swap
    const cachedTexture = this.textureCache.get(imageUrl);
    if (cachedTexture) {
      this.applyTexture(cachedTexture);

      // Fire-and-forget preload / cleanup
      this.cleanupCache();
      this.loadNextTextures(nextIndex);
      return;
    }

    // Cache miss: start background load, don't block
    // The texture will be applied by the polling check in update()
    if (!this.loadingImages.has(imageUrl)) {
      this.loadTexture(imageUrl).then(() => {
        this.failureCount = 0;
        this.cleanupCache();
        this.loadNextTextures(nextIndex);
      }).catch(() => {
        this.failureCount++;
      });
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
    // Preload next 3 images to smooth out rapid sequential triggers
    for (let i = 1; i <= 3; i++) {
      const idx = (currentIndex + i) % this.parameters.images.length;
      const url = this.parameters.images[idx];
      if (!this.textureCache.has(url) && !this.loadingImages.has(url)) {
        this.loadTexture(url).catch(() => { });
      }
    }
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
          // Browser path: fast off-main-thread decode + flip via ImageBitmap
          // imageOrientation 'flipY' flips the image during the off-thread decode,
          // so we set texture.flipY = false to avoid double-flipping
          const imageBitmap = await createImageBitmap(blob, { imageOrientation: 'flipY' });

          texture = new THREE.CanvasTexture(imageBitmap);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          texture.matrixAutoUpdate = true;
          texture.flipY = false;
          // Explicit needsUpdate ensures swangle's software WebGL picks up
          // the new texture data immediately on the next render call.
          texture.needsUpdate = true;

          slideshowLog.log('Texture loaded via ImageBitmap:', {
            url: url.substring(0, 50),
            width: imageBitmap.width,
            height: imageBitmap.height,
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
        
        // Force GPU texture upload immediately to avoid lag on first render
        if (this.renderer) {
          this.renderer.initTexture(texture);
        }
        
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

        // Blacklist any URL that fails to load (not just 403/404).
        // This prevents repeated slow network-timeout retries on every frame
        // when a URL is unreachable (e.g. net::ERR_FAILED from Lambda).
        this.blacklistedUrls.add(url);

        // Provide more detailed error information
        let errorMessage = 'Texture load failed';
        if (err?.message) {
          errorMessage = err.message;
        } else if (err?.name === 'TypeError' && err?.message?.includes('Failed to fetch')) {
          errorMessage = `Network error (likely CORS or unreachable): ${url.substring(0, 100)}`;
        }

        slideshowLog.error('🖼️ Texture load failed (blacklisted):', errorMessage);
        slideshowLog.error('Failed URL:', url.substring(0, 100));

        reject(err);
      }
    });
  }

  /**
   * Public method to wait for essential images to load.
   * Used by Remotion to delay rendering until assets are ready.
   * @param duration - Optional total render duration in seconds. If provided, pre-loads
   *                   all images that will be shown during the render for Lambda compatibility.
   */
  public async waitForImages(duration?: number): Promise<void> {
    if (this.parameters.images.length === 0) return;

    const remotionEnv = getRemotionEnvironment();
    const isInRemotionContext = remotionEnv.isRendering || remotionEnv.isStudio;

    // STATELESS: In Lambda, only pre-load the FIRST image to avoid OOM.
    // Each Lambda chunk renders ~20 frames (~0.67s at 30fps) and only needs 1-2 images.
    // The rest load lazily via updateWithTime() which calls loadTexture() on demand.
    // Previously preloading ALL images (e.g. 34) crashed 3008MB Lambda with SwiftShader.
    if (isInRemotionContext && this.parameters.slideEvents.length > 0 && duration) {
      const firstIndex = this.currentImageIndex >= 0 ? this.currentImageIndex : 0;
      const firstUrl = this.parameters.images[firstIndex];

      slideshowLog.log('waitForImages: Pre-loading first image only (lazy load rest)', {
        duration,
        totalImages: this.parameters.images.length,
        slideEvents: this.parameters.slideEvents.length,
        firstIndex,
      });

      if (firstUrl && !this.textureCache.has(firstUrl)) {
        try {
          await this.loadTexture(firstUrl);
        } catch (e) {
          slideshowLog.warn(`waitForImages: Failed to preload first image`, e);
        }
      }

      // Apply first image
      if (firstUrl) {
        const texture = this.textureCache.get(firstUrl);
        if (texture) {
          this.currentImageIndex = firstIndex;
          this.applyTexture(texture);
        }
      }

      // STATELESS: Mark initialized so updateWithTime can run.
      this.slideEventsInitialized = true;
      return;
    }

    // STATELESS: Mark initialized even when slideEvents.length === 0 (fallback path).
    // This ensures updateWithTime will run on subsequent frames once slideEvents are set.
    this.slideEventsInitialized = true;

    // LEGACY: Single image load for live preview
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
          this.applyTexture(texture);
        }
      }
    } catch (e) {
      slideshowLog.warn('waitForImages: Failed to load image, proceeding anyway', e);
    }
  }

  private cleanupCache() {
    // Keep up to 50 images in the cache to prevent thrashing GPU memory on looping slideshows
    if (this.textureCache.size <= 50) return;

    // If we exceed 50, keep current, 5 previous, and max forward
    const keepIndices = new Set<number>();
    keepIndices.add(this.currentImageIndex);
    
    // Keep 5 previous (to handle loops backward or quick review)
    for (let i = 1; i <= 5; i++) {
        let prev = this.currentImageIndex - i;
        if (prev < 0) prev += this.parameters.images.length;
        keepIndices.add(prev);
    }
    
    // Keep up to 44 forward
    for (let i = 1; i <= 44; i++) {
      keepIndices.add((this.currentImageIndex + i) % this.parameters.images.length);
    }

    const keepUrls = new Set<string>();
    keepIndices.forEach(idx => {
      if (this.parameters.images[idx]) keepUrls.add(this.parameters.images[idx]);
    });

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

</files>
