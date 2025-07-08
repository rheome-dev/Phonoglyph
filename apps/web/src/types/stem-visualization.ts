import { AudioFeature } from './stem-audio-analysis';

export interface RhythmConfig {
  target: 'scale' | 'rotation' | 'color' | 'emission' | 'position' | 'opacity';
  intensity: number;           // 0-1: How strong the effect is
  smoothing: number;          // 0-1: Amount of smoothing applied
  threshold: number;          // 0-1: Minimum value to trigger effect
  multiplier: number;         // Scaling factor for the effect
}

export interface PitchConfig {
  target: 'height' | 'hue' | 'brightness' | 'complexity' | 'color';
  range: [number, number];    // Min/max values for the target parameter
  response: 'linear' | 'exponential' | 'logarithmic';
  sensitivity: number;        // 0-1: How responsive to pitch changes
  offset: number;            // Base offset for the parameter
}

export interface IntensityConfig {
  target: 'size' | 'opacity' | 'speed' | 'count' | 'brightness' | 'emission' | 'warmth' | 'scale' | 'rotation';
  threshold: number;          // 0-1: Minimum intensity to trigger
  decay: number;             // 0-1: How quickly effect fades
  attack: number;            // 0-1: How quickly effect builds up
  ceiling: number;           // Maximum effect strength
  curve: 'linear' | 'exponential' | 'curve';
}

export interface TimbreConfig {
  target: 'texture' | 'warmth' | 'spread' | 'complexity';
  sensitivity: number;        // 0-1: Response sensitivity
  range: [number, number];   // Output range
  smoothing: number;         // Temporal smoothing
  bias: number;             // Base value bias
}

export interface StemVisualizationMapping {
  stemType: 'drums' | 'bass' | 'vocals' | 'piano' | 'other';
  enabled: boolean;
  priority: number;          // Higher priority stems override lower ones
  
  features: {
    rhythm?: RhythmConfig;
    pitch?: PitchConfig;
    intensity?: IntensityConfig;
    timbre?: TimbreConfig;
  };
  
  // Global modifiers for this stem
  globalMultiplier: number;   // Overall effect strength
  crossfade: number;         // Blend with other stems (0-1)
  solo: boolean;             // Only this stem affects visuals
  mute: boolean;             // Disable this stem's effects
}

export interface VisualizationPreset {
  id: string;
  name: string;
  description: string;
  category: 'electronic' | 'rock' | 'classical' | 'ambient' | 'custom';
  tags: string[];
  
  // Stem mappings
  mappings: Record<string, StemVisualizationMapping>;
  
  // Global settings
  defaultSettings: {
    masterIntensity: number;
    transitionSpeed: number;
    backgroundAlpha: number;
    particleCount: number;
    qualityLevel: 'low' | 'medium' | 'high';
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  userId?: string;
  isDefault: boolean;
  usageCount: number;
}

export interface VisualizationState {
  // Current parameter values
  scale: number;
  rotation: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number; a: number };
  emission: number;
  
  // Visual properties
  size: number;
  opacity: number;
  speed: number;
  count: number;
  height: number;
  brightness: number;
  complexity: number;
  
  // Texture/material properties
  texture: number;
  warmth: number;
  spread: number;
  
  // Timing
  lastUpdate: number;
  smoothingFactors: Record<string, number>;
}

export interface MappingUpdate {
  stemType: string;
  featureType: 'rhythm' | 'pitch' | 'intensity' | 'timbre';
  parameterName: string;
  value: number;
  timestamp: number;
  confidence: number;
}

export interface VisualizationEvent {
  type: 'parameter_change' | 'preset_change' | 'stem_mute' | 'stem_solo';
  stemType?: string;
  parameter?: string;
  value?: any;
  timestamp: number;
}

// Utility types for the mapping system
export type VisualParameter = 
  | 'scale' | 'rotation' | 'color' | 'emission' | 'position'
  | 'height' | 'hue' | 'brightness' | 'complexity'
  | 'size' | 'opacity' | 'speed' | 'count'
  | 'texture' | 'warmth' | 'spread';

export type AudioFeatureType = 'rhythm' | 'pitch' | 'intensity' | 'timbre';
export type StemType = 'drums' | 'bass' | 'vocals' | 'piano' | 'other';

// Response curve types for parameter mapping
export interface ResponseCurve {
  type: 'linear' | 'exponential' | 'logarithmic' | 'curve' | 'step';
  points?: Array<{ x: number; y: number }>; // For custom curves
  exponent?: number; // For exponential/power curves
  steepness?: number; // For sigmoid curves
}

// Performance monitoring for visualization system
export interface VisualizationMetrics {
  frameRate: number;
  parameterUpdatesPerSecond: number;
  memoryUsage: number;
  gpuMemoryUsage: number;
  renderTime: number;
  mappingComputeTime: number;
  lastUpdateLatency: number;
}

// Configuration for the visualization system
export interface VisualizationConfig {
  // Performance settings
  targetFrameRate: number;
  maxUpdatesPerFrame: number;
  smoothingEnabled: boolean;
  interpolationQuality: 'low' | 'medium' | 'high';
  
  // Visual limits
  maxParticleCount: number;
  maxEffectComplexity: number;
  enablePostProcessing: boolean;
  
  // Mapping behavior
  enableCrossfade: boolean;
  defaultSmoothingFactor: number;
  parameterUpdateThreshold: number;
  
  // Debug/development
  enableDebugMode: boolean;
  showParameterValues: boolean;
  logMappingUpdates: boolean;
}

// Preset categories and templates
export const PRESET_CATEGORIES = {
  electronic: 'Electronic/EDM',
  rock: 'Rock/Metal',
  classical: 'Classical/Orchestral', 
  ambient: 'Ambient/Drone',
  custom: 'User Created'
} as const;

export const DEFAULT_VISUALIZATION_STATE: VisualizationState = {
  scale: 1.0,
  rotation: { x: 0, y: 0, z: 0 },
  position: { x: 0, y: 0, z: 0 },
  color: { r: 1, g: 1, b: 1, a: 1 },
  emission: 0.0,
  
  size: 1.0,
  opacity: 1.0,
  speed: 1.0,
  count: 100,
  height: 1.0,
  brightness: 1.0,
  complexity: 0.5,
  
  texture: 0.0,
  warmth: 0.5,
  spread: 0.5,
  
  lastUpdate: 0,
  smoothingFactors: {}
};

export const DEFAULT_MAPPING_CONFIG: Partial<StemVisualizationMapping> = {
  enabled: true,
  priority: 1,
  globalMultiplier: 1.0,
  crossfade: 0.0,
  solo: false,
  mute: false
}; 