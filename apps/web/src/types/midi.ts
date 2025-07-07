// Shared MIDI data types for frontend components

export interface MIDINote {
  id: string;
  start: number;
  duration: number;
  pitch: number;
  velocity: number;
  track: string;
  noteName: string;
}

export interface MIDITrack {
  id: string;
  name: string;
  instrument: string;
  channel: number;
  notes: MIDINote[];
  color: string;
  visible?: boolean;
}

export interface MIDIData {
  file: {
    name: string;
    size: number;
    duration: number;
    ticksPerQuarter: number;
    timeSignature: [number, number];
    keySignature: string;
  };
  tracks: MIDITrack[];
  tempoChanges: Array<{
    tick: number;
    bpm: number;
    microsecondsPerQuarter: number;
  }>;
}

export interface VisualizationSettings {
  colorScheme: 'sage' | 'slate' | 'dusty-rose' | 'mixed';
  pixelsPerSecond: number;
  showTrackLabels: boolean;
  showVelocity: boolean;
  minKey: number;
  maxKey: number;
}

export interface TempoChange {
  tick: number;
  bpm: number;
  microsecondsPerQuarter: number;
}

// Color scheme mappings
export const COLOR_SCHEMES = {
  sage: '#84a98c',
  slate: '#6b7c93', 
  'dusty-rose': '#b08a8a',
  mixed: ['#84a98c', '#6b7c93', '#b08a8a', '#a8a29e', '#8da3b0']
} as const;

// Default visualization settings
export const DEFAULT_VISUALIZATION_SETTINGS: VisualizationSettings = {
  colorScheme: 'mixed',
  pixelsPerSecond: 50,
  showTrackLabels: true,
  showVelocity: true,
  minKey: 21,
  maxKey: 108
}; 