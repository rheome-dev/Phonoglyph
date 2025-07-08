// Hybrid Control System Types
export interface MeydaFeatureSet {
  rms: number;
  zcr: number;
  spectralCentroid: number;
  spectralRolloff: number;
  spectralFlatness: number;
  spectralSpread: number;
  mfcc: number[];
  loudness: {
    total: number;
    specific: number[];
  };
  perceptualSpread: number;
  perceptualSharpness: number;
}

export interface StemFeatureAnalysis {
  stemType: 'drums' | 'bass' | 'vocals' | 'other';
  timestamp: number;
  features: MeydaFeatureSet;
  derived: {
    intensity: number;
    rhythmicActivity: number;
    tonalContent: number;
    timbreProfile: number[];
  };
}

export interface MIDIMapping {
  channel: number;
  controller?: number;
  note?: number;
  scaling: number;
  range?: [number, number];
}

export interface AudioMapping {
  feature: keyof MeydaFeatureSet | keyof StemFeatureAnalysis['derived'];
  stem?: string;
  scaling: number;
  range?: [number, number];
  smoothing?: number;
}

export interface HybridParameterConfig {
  source: 'midi' | 'audio' | 'hybrid';
  midiMapping?: MIDIMapping;
  audioMapping?: AudioMapping;
  midiWeight?: number; // 0-1 for hybrid mode
  audioWeight?: number; // 0-1 for hybrid mode
}

export interface HybridControlSource {
  type: 'midi' | 'audio' | 'hybrid';
  midiWeight?: number;
  audioWeight?: number;
  parameters: {
    [key: string]: HybridParameterConfig;
  };
}

// Synchronization types
export interface SyncPoint {
  timestamp: number;
  midiTick: number;
  audioTime: number;
  confidence: number;
}

export interface SyncStatus {
  isSync: boolean;
  offset: number;
  drift: number;
  quality: number; // 0-1
  lastUpdate: number;
}

// Control events
export interface HybridControlEvent {
  type: 'parameter_change' | 'source_switch' | 'sync_update';
  parameter?: string;
  value?: any;
  source?: 'midi' | 'audio' | 'hybrid';
  timestamp: number;
}

// Preset system
export interface HybridPreset {
  id: string;
  name: string;
  description?: string;
  configuration: HybridControlSource;
  createdAt: Date;
  updatedAt: Date;
}

export type HybridControlEventHandler = (event: HybridControlEvent) => void;