/**
 * Event-Based Audio Feature Mapping Types
 */

export interface TransientEvent {
  timestamp: number;
  amplitude: number;
  frequency: number; // dominant frequency
  duration: number; // estimated duration
  confidence: number;
  envelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

export interface ChromaEvent {
  timestamp: number;
  chroma: number[]; // 12-element array for C, C#, D, etc.
  rootNote: number; // 0-11 (C=0, C#=1, etc.)
  confidence: number;
  keySignature?: string; // detected key
}

export interface AudioEventData {
  transients: TransientEvent[];
  chroma: ChromaEvent[];
  rms: number[]; // continuous RMS for CC-like modulation
  spectralFeatures: {
    centroid: number[];
    rolloff: number[];
    flatness: number[];
  };
  eventCount: number;
}

export interface EventBasedMappingConfig {
  mode: 'midi-like' | 'advanced';
  features: {
    transient: boolean; // Note on detection with envelope
    chroma: boolean;    // Pitch detection and key analysis
    volume: boolean;    // Continuous RMS energy
    brightness: boolean; // Spectral centroid for CC-like control
  };
  sensitivity: {
    transient: number; // 0-100 (threshold for detection)
    chroma: number;    // 0-100 (confidence threshold)
    volume: number;    // 0-100 (response curve)
    brightness: number; // 0-100 (spectral response)
  };
  envelope: {
    attack: number;   // seconds
    decay: number;    // seconds
    sustain: number;  // 0-1
    release: number;  // seconds
  };
}

export interface AudioEventMapping {
  id: string;
  eventType: 'transient' | 'chroma' | 'volume' | 'brightness';
  targetParameter: string; // Visualization parameter to control
  mapping: {
    source: 'transient' | 'chroma' | 'volume' | 'brightness';
    transform: 'linear' | 'exponential' | 'logarithmic' | 'envelope';
    range: [number, number]; // Min/max values
    sensitivity: number; // 0-100
    envelope?: {
      attack: number;
      decay: number;
      sustain: number;
      release: number;
    };
  };
  enabled: boolean;
}

export interface EventBasedMappingService {
  config: EventBasedMappingConfig;
  mappings: AudioEventMapping[];
  
  createMapping(eventType: string, targetParameter: string): AudioEventMapping;
  updateMapping(mappingId: string, updates: Partial<AudioEventMapping>): void;
  deleteMapping(mappingId: string): void;
  getMappedValue(eventType: string, audioEventData: AudioEventData): number;
  validateMapping(mapping: AudioEventMapping): boolean;
  detectTransients(rms: number[], spectralCentroid: number[], threshold: number): TransientEvent[];
  extractChroma(amplitudeSpectrum: number[][], sampleRate: number): ChromaEvent[];
}

// Database entity types
export interface EventBasedMappingEntity {
  id: string;
  user_id: string;
  project_id: string;
  event_type: 'transient' | 'chroma' | 'volume' | 'brightness';
  target_parameter: string;
  mapping_config: {
    source: 'transient' | 'chroma' | 'volume' | 'brightness';
    transform: 'linear' | 'exponential' | 'logarithmic' | 'envelope';
    range: [number, number];
    sensitivity: number;
    envelope?: {
      attack: number;
      decay: number;
      sustain: number;
      release: number;
    };
  };
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AudioEventCacheEntity {
  id: string;
  user_id: string;
  file_metadata_id: string;
  stem_type: string;
  event_data: {
    transients: TransientEvent[];
    chroma: ChromaEvent[];
    rms: number[];
    spectralFeatures: {
      centroid: number[];
      rolloff: number[];
      flatness: number[];
    };
  };
  analysis_version: string;
  created_at: Date;
  updated_at: Date;
}