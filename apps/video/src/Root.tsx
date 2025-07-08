import React from 'react';
import { Composition } from 'remotion';
import { MidiVisualizer, MidiVisualizerProps } from './compositions/MidiVisualizer';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MidiVisualizer"
        component={MidiVisualizer}
        durationInFrames={3000} // 100 seconds at 30fps - will be dynamic
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          midiData: null,
          layers: [],
          settings: {
            backgroundColor: '#000000',
            showWaveform: true,
            showNotes: true,
            noteColors: {},
            effects: []
          }
        } as MidiVisualizerProps}
      />
    </>
  );
};