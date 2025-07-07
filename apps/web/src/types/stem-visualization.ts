export type StemType = 'drums' | 'bass' | 'vocals' | 'other';
export type VisualizationTarget = 
  | 'scale' | 'rotation' | 'color' | 'emission' | 'position'  // Rhythm targets
  | 'height' | 'hue' | 'brightness' | 'complexity'            // Pitch targets
  | 'size' | 'opacity' | 'speed' | 'count';                  // Intensity targets

export interface RhythmConfig {
  target: 'scale' | 'rotation' | 'color' | 'emission' | 'position';
  intensity: number;
  smoothing: number;
}

export interface PitchConfig {
  target: 'height' | 'hue' | 'brightness' | 'complexity';
  range: [number, number];
  response: 'linear' | 'exponential';
}

export interface IntensityConfig {
  target: 'size' | 'opacity' | 'speed' | 'count';
  threshold: number;
  decay: number;
}

export interface StemVisualizationMapping {
  stemType: StemType;
  features: {
    rhythm?: RhythmConfig;
    pitch?: PitchConfig;
    intensity?: IntensityConfig;
  };
}

export interface VisualizationPreset {
  id: string;
  name: string;
  description: string;
  mappings: Record<string, StemVisualizationMapping>;
  defaultSettings: Record<string, number>;
}

// Feature value ranges and defaults
export const DEFAULT_RANGES = {
  rhythm: {
    intensity: [0, 1],
    smoothing: [0, 1]
  },
  pitch: {
    range: [20, 20000], // Hz
    response: ['linear', 'exponential'] as const
  },
  intensity: {
    threshold: [0, 1],
    decay: [0, 1]
  }
};

// Default presets
export const DEFAULT_PRESETS: VisualizationPreset[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Standard visualization mapping for all stems',
    mappings: {
      drums: {
        stemType: 'drums',
        features: {
          rhythm: {
            target: 'scale',
            intensity: 0.8,
            smoothing: 0.2
          },
          intensity: {
            target: 'speed',
            threshold: 0.3,
            decay: 0.1
          }
        }
      },
      bass: {
        stemType: 'bass',
        features: {
          pitch: {
            target: 'height',
            range: [20, 200],
            response: 'exponential'
          },
          intensity: {
            target: 'size',
            threshold: 0.2,
            decay: 0.3
          }
        }
      },
      vocals: {
        stemType: 'vocals',
        features: {
          pitch: {
            target: 'brightness',
            range: [80, 1000],
            response: 'linear'
          },
          intensity: {
            target: 'opacity',
            threshold: 0.1,
            decay: 0.2
          }
        }
      },
      other: {
        stemType: 'other',
        features: {
          intensity: {
            target: 'count',
            threshold: 0.15,
            decay: 0.25
          }
        }
      }
    },
    defaultSettings: {
      globalIntensity: 1.0,
      smoothingFactor: 0.2,
      responsiveness: 0.8
    }
  }
]; 