import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export interface MidiVisualizerProps {
  midiData: any;
  layers: any[];
  settings: {
    backgroundColor: string;
    showWaveform: boolean;
    showNotes: boolean;
    noteColors: Record<string, string>;
    effects: any[];
  };
}

export const MidiVisualizer: React.FC<MidiVisualizerProps> = ({
  midiData,
  layers,
  settings
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  const currentTime = frame / fps;
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: settings.backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}
    >
      {/* Background Layer */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `linear-gradient(45deg, ${settings.backgroundColor}, #1a1a2e)`
        }}
      />
      
      {/* MIDI Visualization Layers */}
      {layers.map((layer, index) => (
        <MidiLayer
          key={layer.id || index}
          layer={layer}
          currentTime={currentTime}
          frame={frame}
          width={width}
          height={height}
          settings={settings}
        />
      ))}
      
      {/* Waveform Visualization */}
      {settings.showWaveform && midiData && (
        <WaveformVisualization
          midiData={midiData}
          currentTime={currentTime}
          width={width}
          height={height}
        />
      )}
      
      {/* Note Visualization */}
      {settings.showNotes && midiData && (
        <NoteVisualization
          midiData={midiData}
          currentTime={currentTime}
          width={width}
          height={height}
          noteColors={settings.noteColors}
        />
      )}
      
      {/* Watermark and Branding */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          color: 'white',
          fontSize: 14,
          opacity: 0.8,
          fontFamily: 'Arial, sans-serif'
        }}
      >
        Phonoglyph
      </div>
    </AbsoluteFill>
  );
};

const MidiLayer: React.FC<{
  layer: any;
  currentTime: number;
  frame: number;
  width: number;
  height: number;
  settings: any;
}> = ({ layer, currentTime, frame, width, height, settings }) => {
  // Render layer based on its type
  switch (layer.type) {
    case 'piano-roll':
      return <PianoRollLayer layer={layer} currentTime={currentTime} />;
    case 'circular':
      return <CircularLayer layer={layer} currentTime={currentTime} />;
    case 'waveform':
      return <WaveformLayer layer={layer} currentTime={currentTime} />;
    default:
      return null;
  }
};

const WaveformVisualization: React.FC<{
  midiData: any;
  currentTime: number;
  width: number;
  height: number;
}> = ({ midiData, currentTime, width, height }) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '20%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          width: '80%',
          height: 4,
          backgroundColor: '#333',
          borderRadius: 2,
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${(currentTime / 100) * 100}%`, // Assuming 100s duration
            backgroundColor: '#00ff88',
            borderRadius: 2,
            transition: 'width 0.1s ease'
          }}
        />
      </div>
    </div>
  );
};

const NoteVisualization: React.FC<{
  midiData: any;
  currentTime: number;
  width: number;
  height: number;
  noteColors: Record<string, string>;
}> = ({ midiData, currentTime, width, height, noteColors }) => {
  if (!midiData?.tracks) return null;
  
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    >
      {/* Simple note visualization - would be enhanced with actual MIDI parsing */}
      <div
        style={{
          position: 'absolute',
          left: '10%',
          top: '30%',
          width: 200,
          height: 100,
          background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
          borderRadius: 10,
          opacity: Math.sin(currentTime * 2) * 0.5 + 0.5,
          transform: `scale(${1 + Math.sin(currentTime * 4) * 0.1})`
        }}
      />
    </div>
  );
};

const PianoRollLayer: React.FC<{ layer: any; currentTime: number }> = ({ layer, currentTime }) => {
  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '2px solid rgba(255, 255, 255, 0.2)'
      }}
    >
      {/* Piano roll visualization */}
    </div>
  );
};

const CircularLayer: React.FC<{ layer: any; currentTime: number }> = ({ layer, currentTime }) => {
  return (
    <div
      style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        border: '3px solid #00ff88',
        transform: `rotate(${currentTime * 30}deg) scale(${1 + Math.sin(currentTime) * 0.1})`
      }}
    >
      {/* Circular visualization */}
    </div>
  );
};

const WaveformLayer: React.FC<{ layer: any; currentTime: number }> = ({ layer, currentTime }) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around'
      }}
    >
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: `${20 + Math.sin(currentTime * 2 + i * 0.5) * 40}px`,
            backgroundColor: '#00ff88',
            borderRadius: 4
          }}
        />
      ))}
    </div>
  );
};