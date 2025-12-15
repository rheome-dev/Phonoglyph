import { Composition } from 'remotion';
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

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="RayboxMain"
        component={RayboxComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
      {TEST_PAYLOAD && (
        <Composition
          id="Debug"
          component={RayboxComposition}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={300}
          defaultProps={TEST_PAYLOAD as unknown as RayboxCompositionProps}
        />
      )}
    </>
  );
};

