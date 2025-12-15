import { type CalculateMetadataFunction, Composition } from 'remotion';
import { RayboxComposition } from './RayboxComposition';
import type { Layer } from '@/types/video-composition';
import type { AudioAnalysisData } from '@/types/audio-analysis-data'; // Use the cached type
import type { VisualizationSettings } from 'phonoglyph-types';

// Import debug payload (always available for local testing)
// eslint-disable-next-line @typescript-eslint/no-require-imports
let TEST_PAYLOAD: any = null;
try {
  const debugModule = require('./Debug');
  TEST_PAYLOAD = debugModule.TEST_PAYLOAD;
} catch (e) {
  // Debug module not available, that's okay
}

export interface RayboxCompositionProps extends Record<string, unknown> {
  layers: Layer[];
  // This contains the full timeline analysis for Master + all Stems
  audioAnalysisData: AudioAnalysisData[];
  visualizationSettings: VisualizationSettings;
  // The only audio track to be rendered in the output
  masterAudioUrl: string;
  // Audio feature mappings for effect parameters
  mappings?: Record<string, { featureId: string | null; modulationAmount: number }>;
  // Base parameter values before modulation
  baseParameterValues?: Record<string, Record<string, any>>;
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

const calculateMetadata: CalculateMetadataFunction<RayboxCompositionProps> = ({
  props,
}) => {
  // FPS is set on the Composition component (30), so we use that value here
  const safeFps = 30;

  const layers = props?.layers ?? [];

  // Prefer explicit duration on the payload if provided
  let duration = (props as any)?.duration as number | undefined;

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

  // Default to 30 seconds if we couldn't determine duration
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    duration = 30;
  }

  return {
    durationInFrames: Math.ceil(duration * safeFps),
    props,
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
      {TEST_PAYLOAD && (
        <Composition
          id="Debug"
          component={RayboxComposition}
          width={1080}
          height={1920}
          fps={30}
          defaultProps={TEST_PAYLOAD as unknown as RayboxCompositionProps}
          calculateMetadata={calculateMetadata}
        />
      )}
    </>
  );
};

