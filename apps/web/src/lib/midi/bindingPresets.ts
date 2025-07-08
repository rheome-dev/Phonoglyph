// Local type definitions (will be replaced with proper imports later)
interface MIDIBinding {
  id: string;
  name: string;
  layerId: string;
  targetProperty: VideoProperty;
  midiSource: MIDISource;
  mapping: ParameterMapping;
  curve: CurveType;
  enabled: boolean;
  weight: number;
  blendMode: BindingBlendMode;
}

interface MIDISource {
  type: 'note_velocity' | 'note_on_off' | 'cc' | 'pitch_bend' | 'channel_pressure' | 'aftertouch';
  channel?: number;
  note?: number;
  controller?: number;
  trackIndex?: number;
}

interface VideoProperty {
  type: 'transform' | 'visual' | 'timing';
  property: string;
  component?: string;
}

interface ParameterMapping {
  inputMin: number;
  inputMax: number;
  outputMin: number;
  outputMax: number;
  clamp: boolean;
  invert: boolean;
}

type CurveType = 'linear' | 'exponential' | 'logarithmic' | 'smooth' | 'steps' | 'custom';
type BindingBlendMode = 'replace' | 'add' | 'multiply' | 'max' | 'min' | 'average';

export interface BindingPreset {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'advanced' | 'effects' | 'custom';
  icon: string;
  bindings: Omit<MIDIBinding, 'id' | 'layerId'>[];
}

export const BUILTIN_PRESETS: BindingPreset[] = [
  {
    id: 'kick-drum-scale',
    name: 'Kick Drum Scale',
    description: 'Scale layer with kick drum velocity',
    category: 'basic',
    icon: '🥁',
    bindings: [{
      name: 'Kick Scale',
      targetProperty: { type: 'transform', property: 'scaleX' },
      midiSource: { type: 'note_velocity', note: 36, channel: 10 }, // Standard kick
      mapping: { inputMin: 0, inputMax: 127, outputMin: 1, outputMax: 1.5, clamp: true, invert: false },
      curve: 'exponential',
      enabled: true,
      weight: 1,
      blendMode: 'replace'
    }]
  },
  
  {
    id: 'snare-flash',
    name: 'Snare Flash',
    description: 'Flash layer opacity with snare hits',
    category: 'basic',
    icon: '⚡',
    bindings: [{
      name: 'Snare → Opacity Flash',
      targetProperty: { type: 'visual', property: 'opacity' },
      midiSource: { type: 'note_velocity', note: 38, channel: 10 }, // Standard snare
      mapping: { inputMin: 0, inputMax: 127, outputMin: 0.3, outputMax: 1, clamp: true, invert: false },
      curve: 'exponential',
      enabled: true,
      weight: 1,
      blendMode: 'replace'
    }]
  },
  
  {
    id: 'velocity-opacity',
    name: 'Velocity Opacity',
    description: 'Control layer opacity with note velocity',
    category: 'basic',
    icon: '👁️',
    bindings: [{
      name: 'Note Velocity → Opacity',
      targetProperty: { type: 'visual', property: 'opacity' },
      midiSource: { type: 'note_velocity' }, // Any note
      mapping: { inputMin: 0, inputMax: 127, outputMin: 0.2, outputMax: 1, clamp: true, invert: false },
      curve: 'smooth',
      enabled: true,
      weight: 1,
      blendMode: 'replace'
    }]
  },
  
  {
    id: 'modwheel-rotation',
    name: 'Mod Wheel Rotation',
    description: 'Rotate layer with modulation wheel',
    category: 'basic',
    icon: '🎛️',
    bindings: [{
      name: 'Mod Wheel → Rotation',
      targetProperty: { type: 'transform', property: 'rotation' },
      midiSource: { type: 'cc', controller: 1 }, // Mod wheel
      mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 360, clamp: false, invert: false },
      curve: 'linear',
      enabled: true,
      weight: 1,
      blendMode: 'replace'
    }]
  },
  
  {
    id: 'piano-keys-position',
    name: 'Piano Keys Position',
    description: 'Move layer horizontally based on piano key',
    category: 'advanced',
    icon: '🎹',
    bindings: [{
      name: 'Piano Key → X Position',
      targetProperty: { type: 'transform', property: 'x' },
      midiSource: { type: 'note_on_off', channel: 1 },
      mapping: { inputMin: 21, inputMax: 108, outputMin: -200, outputMax: 200, clamp: true, invert: false },
      curve: 'linear',
      enabled: true,
      weight: 1,
      blendMode: 'replace'
    }]
  },
  
  {
    id: 'volume-scale',
    name: 'Volume Control Scale',
    description: 'Scale layer with volume fader',
    category: 'basic',
    icon: '🔊',
    bindings: [{
      name: 'Volume → Scale',
      targetProperty: { type: 'transform', property: 'scaleX' },
      midiSource: { type: 'cc', controller: 7 }, // Volume
      mapping: { inputMin: 0, inputMax: 127, outputMin: 0.5, outputMax: 1.5, clamp: true, invert: false },
      curve: 'linear',
      enabled: true,
      weight: 1,
      blendMode: 'replace'
    }]
  },
  
  {
    id: 'sustain-pedal-visibility',
    name: 'Sustain Pedal Visibility',
    description: 'Toggle layer visibility with sustain pedal',
    category: 'advanced',
    icon: '🎵',
    bindings: [{
      name: 'Sustain → Visibility',
      targetProperty: { type: 'visual', property: 'opacity' },
      midiSource: { type: 'cc', controller: 64 }, // Sustain pedal
      mapping: { inputMin: 0, inputMax: 127, outputMin: 0, outputMax: 1, clamp: true, invert: false },
      curve: 'steps',
      enabled: true,
      weight: 1,
      blendMode: 'replace'
    }]
  },
  
  {
    id: 'pitch-bend-position',
    name: 'Pitch Bend Position',
    description: 'Move layer vertically with pitch bend',
    category: 'advanced',
    icon: '↕️',
    bindings: [{
      name: 'Pitch Bend → Y Position',
      targetProperty: { type: 'transform', property: 'y' },
      midiSource: { type: 'pitch_bend' },
      mapping: { inputMin: 0, inputMax: 16383, outputMin: -100, outputMax: 100, clamp: true, invert: false },
      curve: 'smooth',
      enabled: true,
      weight: 1,
      blendMode: 'replace'
    }]
  },
  
  {
    id: 'filter-cutoff-brightness',
    name: 'Filter Cutoff Brightness',
    description: 'Control brightness with filter cutoff',
    category: 'effects',
    icon: '🔆',
    bindings: [{
      name: 'Filter Cutoff → Brightness',
      targetProperty: { type: 'visual', property: 'brightness' },
      midiSource: { type: 'cc', controller: 74 }, // Filter cutoff
      mapping: { inputMin: 0, inputMax: 127, outputMin: 0.5, outputMax: 1.5, clamp: true, invert: false },
      curve: 'exponential',
      enabled: true,
      weight: 1,
      blendMode: 'replace'
    }]
  },
  
  {
    id: 'expression-pedal-scale',
    name: 'Expression Pedal Scale',
    description: 'Scale layer with expression pedal',
    category: 'advanced',
    icon: '🦶',
    bindings: [{
      name: 'Expression → Scale',
      targetProperty: { type: 'transform', property: 'scaleX' },
      midiSource: { type: 'cc', controller: 11 }, // Expression
      mapping: { inputMin: 0, inputMax: 127, outputMin: 0.2, outputMax: 2, clamp: true, invert: false },
      curve: 'logarithmic',
      enabled: true,
      weight: 1,
      blendMode: 'replace'
    }]
  }
];

export const PRESET_CATEGORIES = {
  basic: {
    name: 'Basic Controls',
    description: 'Simple, commonly used MIDI bindings',
    icon: '🎛️'
  },
  advanced: {
    name: 'Advanced',
    description: 'Complex bindings for experienced users',
    icon: '⚙️'
  },
  effects: {
    name: 'Visual Effects',
    description: 'Bindings for visual effect parameters',
    icon: '✨'
  },
  custom: {
    name: 'Custom',
    description: 'User-created binding presets',
    icon: '🎨'
  }
};

// Utility functions for working with presets
export function generateBindingId(): string {
  return `binding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function applyPresetToLayer(preset: BindingPreset, layerId: string): MIDIBinding[] {
  return preset.bindings.map(binding => ({
    ...binding,
    id: generateBindingId(),
    layerId
  }));
}

export function createCustomPreset(
  name: string,
  description: string,
  bindings: Omit<MIDIBinding, 'id' | 'layerId'>[]
): BindingPreset {
  return {
    id: `custom_${Date.now()}`,
    name,
    description,
    category: 'custom',
    icon: '🎨',
    bindings
  };
}

export function getPresetsByCategory(category: string): BindingPreset[] {
  return BUILTIN_PRESETS.filter(preset => preset.category === category);
}

export function searchPresets(query: string): BindingPreset[] {
  const lowercaseQuery = query.toLowerCase();
  return BUILTIN_PRESETS.filter(preset =>
    preset.name.toLowerCase().includes(lowercaseQuery) ||
    preset.description.toLowerCase().includes(lowercaseQuery)
  );
}