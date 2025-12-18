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
  const safeFps = 30;

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
        fps={30}
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
        fps={30}
        defaultProps={TEST_PAYLOAD ?? defaultProps}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};

