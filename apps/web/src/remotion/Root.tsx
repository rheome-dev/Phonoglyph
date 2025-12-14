import { Composition } from 'remotion';
import { RayboxComposition } from './RayboxComposition';
import type { Layer } from '@/types/video-composition';
import type { AudioAnalysisData } from '@/types/audio-analysis-data'; // Use the cached type
import type { VisualizationSettings } from 'phonoglyph-types';

export interface RayboxCompositionProps {
  layers: Layer[];
  // This contains the full timeline analysis for Master + all Stems
  audioAnalysisData: AudioAnalysisData[];
  visualizationSettings: VisualizationSettings;
  // The only audio track to be rendered in the output
  masterAudioUrl: string;
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
    </>
  );
};

