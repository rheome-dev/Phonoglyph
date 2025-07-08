import React from 'react';
import { Composition } from 'remotion';
import { MidiVisualizerVideo } from './MidiVisualizerVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MidiVisualizer"
        component={MidiVisualizerVideo}
        durationInFrames={3000} // 60 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          midiFileId: 'sample',
          effectLayers: [
            { id: '1', type: 'metaballs' as const, opacity: 0.8 },
            { id: '2', type: 'particles' as const, opacity: 0.6 }
          ]
        }}
      />
    </>
  );
};