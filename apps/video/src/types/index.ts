// MIDI Data Types
export interface MIDINote {
  id: string;
  time: number;
  duration: number;
  note: number;
  velocity: number;
}

export interface MIDITrack {
  id: string;
  name: string;
  notes: MIDINote[];
}

export interface TempoChange {
  time: number;
  bpm: number;
}

export interface TimeSignature {
  time: number;
  timeSignature: [number, number];
}

export interface MIDIData {
  tracks: MIDITrack[];
  tempoChanges: TempoChange[];
  timeSignatures: TimeSignature[];
  duration: number;
}

// Visualization Types
export interface VisualizationSettings {
  [key: string]: any;
}

export interface EffectLayer {
  id: string;
  type: 'metaballs' | 'particles' | 'midihud' | 'bloom';
  opacity: number;
  settings?: VisualizationSettings;
  zIndex?: number;
}