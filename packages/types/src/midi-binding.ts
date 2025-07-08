export interface MIDIBinding {
  id: string;
  name: string;
  layerId: string;
  targetProperty: VideoProperty;
  midiSource: MIDISource;
  mapping: ParameterMapping;
  curve: CurveType;
  enabled: boolean;
  weight: number; // For blending multiple bindings
  blendMode: BindingBlendMode;
}

export interface MIDISource {
  type: 'note_velocity' | 'note_on_off' | 'cc' | 'pitch_bend' | 'channel_pressure' | 'aftertouch';
  channel?: number; // 1-16, undefined for all channels
  note?: number; // 0-127, for note-based sources
  controller?: number; // 0-127, for CC sources
  trackIndex?: number; // Specific MIDI track
}

export interface VideoProperty {
  type: 'transform' | 'visual' | 'timing';
  property: string; // e.g., 'x', 'y', 'scaleX', 'opacity', 'playbackRate'
  component?: string; // For nested properties like transform.x
}

export interface ParameterMapping {
  inputMin: number;
  inputMax: number;
  outputMin: number;
  outputMax: number;
  clamp: boolean;
  invert: boolean;
}

export type CurveType = 'linear' | 'exponential' | 'logarithmic' | 'smooth' | 'steps' | 'custom';
export type BindingBlendMode = 'replace' | 'add' | 'multiply' | 'max' | 'min' | 'average';

// Supported video properties for binding
export const VIDEO_PROPERTIES: Record<string, VideoProperty[]> = {
  transform: [
    { type: 'transform', property: 'x', component: 'position' },
    { type: 'transform', property: 'y', component: 'position' },
    { type: 'transform', property: 'scaleX', component: 'scale' },
    { type: 'transform', property: 'scaleY', component: 'scale' },
    { type: 'transform', property: 'rotation', component: 'rotation' },
  ],
  visual: [
    { type: 'visual', property: 'opacity' },
    { type: 'visual', property: 'brightness' },
    { type: 'visual', property: 'contrast' },
    { type: 'visual', property: 'saturation' },
    { type: 'visual', property: 'hue' },
  ],
  timing: [
    { type: 'timing', property: 'playbackRate' },
    { type: 'timing', property: 'startTime' },
    { type: 'timing', property: 'endTime' },
  ]
};

// MIDI Control Change definitions
export const MIDI_CC_DEFINITIONS: Record<number, string> = {
  1: 'Modulation Wheel',
  2: 'Breath Controller',
  7: 'Volume',
  8: 'Balance',
  10: 'Pan',
  11: 'Expression',
  64: 'Sustain Pedal',
  65: 'Portamento',
  66: 'Sostenuto',
  67: 'Soft Pedal',
  68: 'Legato Footswitch',
  69: 'Hold 2',
  71: 'Filter Resonance',
  72: 'Release Time',
  73: 'Attack Time',
  74: 'Filter Cutoff',
  75: 'Decay Time',
  76: 'Vibrato Rate',
  77: 'Vibrato Depth',
  78: 'Vibrato Delay'
};

// Standard MIDI note names
export const MIDI_NOTE_NAMES: string[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

export function getMIDINoteLabel(note: number): string {
  const octave = Math.floor(note / 12) - 1;
  const noteIndex = note % 12;
  return `${MIDI_NOTE_NAMES[noteIndex]}${octave}`;
}

export function getMIDICCLabel(controller: number): string {
  return MIDI_CC_DEFINITIONS[controller] || `CC ${controller}`;
}