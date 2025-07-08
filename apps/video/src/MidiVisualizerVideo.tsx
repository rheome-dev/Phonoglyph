import React from 'react';
import { Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeJSLayer } from './components/ThreeJSLayer';
import type { MIDIData, EffectLayer } from './types';

interface MidiVisualizerVideoProps {
  midiFileId: string;
  effectLayers: EffectLayer[];
  audioSrc?: string;
  midiData?: MIDIData;
}

export const MidiVisualizerVideo = (props: any) => {
  const { midiFileId, effectLayers, audioSrc, midiData } = props as MidiVisualizerVideoProps;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  
  // TODO: Load MIDI data from API if not provided
  const resolvedMidiData = midiData || getDefaultMidiData();
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      background: 'linear-gradient(45deg, #0f172a, #1e293b)' 
    }}>
      {/* Audio track */}
      {audioSrc && <Audio src={audioSrc} />}
      
      {/* Three.js Effect Layers */}
      {effectLayers.map((layer) => (
        <ThreeJSLayer
          key={layer.id}
          midiData={resolvedMidiData}
          settings={layer.settings || {}}
          effectType={layer.type}
          opacity={layer.opacity}
        />
      ))}
    </div>
  );
};

// Temporary placeholder function - will be replaced with actual API call
function getDefaultMidiData(): MIDIData {
  return {
    tracks: [],
    tempoChanges: [],
    timeSignatures: [],
    duration: 0
  };
}