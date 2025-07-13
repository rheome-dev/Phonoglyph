// Default Visualization Mappings for Story 5.3
// Curated presets for different musical genres and styles

import { 
  VisualizationPreset, 
  StemVisualizationMapping, 
  PRESET_CATEGORIES 
} from '@/types/stem-visualization';

// Base mapping configurations optimized for different musical contexts
export const DEFAULT_MAPPINGS: Record<string, StemVisualizationMapping> = {
  // Drum-focused mapping - emphasizes rhythm and energy
  drums: {
    stemType: 'drums',
    enabled: true,
    priority: 3,
    globalMultiplier: 1.2,
    crossfade: 0.0,
    solo: false,
    mute: false,
    features: {
      rhythm: {
        target: 'scale',
        intensity: 0.8,
        smoothing: 0.1,
        threshold: 0.15,
        multiplier: 1.5
      },
      intensity: {
        target: 'speed',
        threshold: 0.2,
        decay: 0.3,
        attack: 0.7,
        ceiling: 2.0,
        curve: 'exponential'
      },
      timbre: {
        target: 'texture',
        sensitivity: 0.6,
        range: [0.2, 0.8],
        smoothing: 0.2,
        bias: 0.0
      }
    }
  },

  // Bass-focused mapping - controls low-end and foundation
  bass: {
    stemType: 'bass',
    enabled: true,
    priority: 2,
    globalMultiplier: 1.0,
    crossfade: 0.0,
    solo: false,
    mute: false,
    features: {
      pitch: {
        target: 'height',
        range: [0.1, 2.0],
        response: 'exponential',
        sensitivity: 0.7,
        offset: 0.5
      },
      intensity: {
        target: 'size',
        threshold: 0.1,
        decay: 0.4,
        attack: 0.5,
        ceiling: 3.0,
        curve: 'linear'
      },
      rhythm: {
        target: 'position',
        intensity: 0.3,
        smoothing: 0.3,
        threshold: 0.1,
        multiplier: 0.8
      }
    }
  },

  // Vocal-focused mapping - emphasizes melody and expression
  vocals: {
    stemType: 'vocals',
    enabled: true,
    priority: 4,
    globalMultiplier: 1.1,
    crossfade: 0.0,
    solo: false,
    mute: false,
    features: {
      pitch: {
        target: 'hue',
        range: [0.0, 1.0],
        response: 'linear',
        sensitivity: 0.9,
        offset: 0.0
      },
      intensity: {
        target: 'brightness',
        threshold: 0.05,
        decay: 0.2,
        attack: 0.6,
        ceiling: 2.0,
        curve: 'curve'
      },
      timbre: {
        target: 'warmth',
        sensitivity: 0.8,
        range: [0.3, 1.0],
        smoothing: 0.15,
        bias: 0.2
      }
    }
  },

  // Piano-focused mapping - balanced harmonic response
  piano: {
    stemType: 'piano',
    enabled: true,
    priority: 2,
    globalMultiplier: 0.9,
    crossfade: 0.0,
    solo: false,
    mute: false,
    features: {
      pitch: {
        target: 'complexity',
        range: [0.3, 1.0],
        response: 'logarithmic',
        sensitivity: 0.6,
        offset: 0.1
      },
      intensity: {
        target: 'opacity',
        threshold: 0.1,
        decay: 0.25,
        attack: 0.4,
        ceiling: 1.0,
        curve: 'linear'
      },
      rhythm: {
        target: 'rotation',
        intensity: 0.4,
        smoothing: 0.4,
        threshold: 0.2,
        multiplier: 0.6
      }
    }
  },

  // Other instruments - fills gaps and adds texture
  other: {
    stemType: 'other',
    enabled: true,
    priority: 1,
    globalMultiplier: 0.8,
    crossfade: 0.0,
    solo: false,
    mute: false,
    features: {
      intensity: {
        target: 'count',
        threshold: 0.15,
        decay: 0.3,
        attack: 0.3,
        ceiling: 1.0,
        curve: 'linear'
      },
      timbre: {
        target: 'spread',
        sensitivity: 0.5,
        range: [0.2, 0.8],
        smoothing: 0.3,
        bias: 0.1
      }
    }
  }
};

// Electronic/EDM preset - high energy, aggressive mappings
export const ELECTRONIC_PRESET: VisualizationPreset = {
  id: 'electronic-default',
  name: 'Electronic Dance',
  description: 'High-energy preset optimized for electronic and EDM tracks',
  category: 'electronic',
  tags: ['edm', 'electronic', 'dance', 'synth', 'bass'],
  mappings: {
    drums: {
      ...DEFAULT_MAPPINGS.drums,
      features: {
        rhythm: {
          target: 'scale',
          intensity: 1.0,
          smoothing: 0.05,
          threshold: 0.1,
          multiplier: 2.0
        },
        intensity: {
          target: 'emission',
          threshold: 0.15,
          decay: 0.2,
          attack: 0.9,
          ceiling: 2.5,
          curve: 'exponential'
        }
      }
    },
    bass: {
      ...DEFAULT_MAPPINGS.bass,
      globalMultiplier: 1.3,
      features: {
        pitch: {
          target: 'height',
          range: [0.1, 3.0],
          response: 'exponential',
          sensitivity: 0.8,
          offset: 0.2
        },
        intensity: {
          target: 'size',
          threshold: 0.1,
          decay: 0.3,
          attack: 0.8,
          ceiling: 4.0,
          curve: 'exponential'
        }
      }
    },
    vocals: {
      ...DEFAULT_MAPPINGS.vocals,
      features: {
        pitch: {
          target: 'color',
          range: [0.0, 1.0],
          response: 'linear',
          sensitivity: 1.0,
          offset: 0.0
        },
        intensity: {
          target: 'brightness',
          threshold: 0.05,
          decay: 0.15,
          attack: 0.8,
          ceiling: 2.5,
          curve: 'exponential'
        }
      }
    },
    piano: DEFAULT_MAPPINGS.piano,
    other: {
      ...DEFAULT_MAPPINGS.other,
      features: {
        intensity: {
          target: 'speed',
          threshold: 0.1,
          decay: 0.2,
          attack: 0.5,
          ceiling: 5.0,
          curve: 'exponential'
        }
      }
    }
  },
  defaultSettings: {
    masterIntensity: 1.2,
    transitionSpeed: 0.8,
    backgroundAlpha: 0.1,
    particleCount: 8000,
    qualityLevel: 'high'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDefault: true,
  usageCount: 0
};

// Rock/Metal preset - powerful, rhythmic mappings
export const ROCK_PRESET: VisualizationPreset = {
  id: 'rock-default',
  name: 'Rock & Metal',
  description: 'Powerful preset for rock, metal, and heavy music',
  category: 'rock',
  tags: ['rock', 'metal', 'guitar', 'drums', 'energy'],
  mappings: {
    drums: {
      ...DEFAULT_MAPPINGS.drums,
      globalMultiplier: 1.4,
      features: {
        rhythm: {
          target: 'scale',
          intensity: 1.2,
          smoothing: 0.1,
          threshold: 0.2,
          multiplier: 1.8
        },
        intensity: {
          target: 'speed',
          threshold: 0.25,
          decay: 0.15,
          attack: 1.0,
          ceiling: 3.0,
          curve: 'exponential'
        },
        timbre: {
          target: 'texture',
          sensitivity: 0.8,
          range: [0.4, 1.0],
          smoothing: 0.1,
          bias: 0.2
        }
      }
    },
    bass: {
      ...DEFAULT_MAPPINGS.bass,
      globalMultiplier: 1.1,
      features: {
        pitch: {
          target: 'height',
          range: [0.2, 2.5],
          response: 'exponential',
          sensitivity: 0.9,
          offset: 0.3
        },
        intensity: {
          target: 'size',
          threshold: 0.15,
          decay: 0.2,
          attack: 0.7,
          ceiling: 3.5,
          curve: 'exponential'
        }
      }
    },
    vocals: {
      ...DEFAULT_MAPPINGS.vocals,
      features: {
        pitch: {
          target: 'brightness',
          range: [0.5, 2.0],
          response: 'linear',
          sensitivity: 0.8,
          offset: 0.2
        },
        intensity: {
          target: 'opacity',
          threshold: 0.1,
          decay: 0.2,
          attack: 0.8,
          ceiling: 1.0,
          curve: 'curve'
        }
      }
    },
    piano: DEFAULT_MAPPINGS.piano,
    other: {
      ...DEFAULT_MAPPINGS.other,
      features: {
        intensity: {
          target: 'rotation',
          threshold: 0.2,
          decay: 0.25,
          attack: 0.6,
          ceiling: 2.0,
          curve: 'linear'
        }
      }
    }
  },
  defaultSettings: {
    masterIntensity: 1.1,
    transitionSpeed: 0.7,
    backgroundAlpha: 0.2,
    particleCount: 6000,
    qualityLevel: 'high'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDefault: true,
  usageCount: 0
};

// Classical preset - elegant, refined mappings
export const CLASSICAL_PRESET: VisualizationPreset = {
  id: 'classical-default',
  name: 'Classical Orchestra',
  description: 'Elegant preset for classical and orchestral music',
  category: 'classical',
  tags: ['classical', 'orchestra', 'strings', 'elegant', 'refined'],
  mappings: {
    drums: {
      ...DEFAULT_MAPPINGS.drums,
      globalMultiplier: 0.6,
      features: {
        rhythm: {
          target: 'position',
          intensity: 0.4,
          smoothing: 0.4,
          threshold: 0.3,
          multiplier: 0.8
        },
        intensity: {
          target: 'opacity',
          threshold: 0.2,
          decay: 0.5,
          attack: 0.3,
          ceiling: 0.8,
          curve: 'linear'
        }
      }
    },
    bass: {
      ...DEFAULT_MAPPINGS.bass,
      globalMultiplier: 0.8,
      features: {
        pitch: {
          target: 'height',
          range: [0.3, 1.5],
          response: 'logarithmic',
          sensitivity: 0.5,
          offset: 0.4
        },
        intensity: {
          target: 'size',
          threshold: 0.1,
          decay: 0.6,
          attack: 0.2,
          ceiling: 2.0,
          curve: 'curve'
        }
      }
    },
    vocals: {
      ...DEFAULT_MAPPINGS.vocals,
      features: {
        pitch: {
          target: 'hue',
          range: [0.2, 0.8],
          response: 'linear',
          sensitivity: 0.7,
          offset: 0.0
        },
        intensity: {
          target: 'brightness',
          threshold: 0.05,
          decay: 0.4,
          attack: 0.3,
          ceiling: 1.5,
          curve: 'curve'
        },
        timbre: {
          target: 'warmth',
          sensitivity: 0.6,
          range: [0.5, 1.0],
          smoothing: 0.3,
          bias: 0.3
        }
      }
    },
    piano: {
      ...DEFAULT_MAPPINGS.piano,
      globalMultiplier: 1.2,
      features: {
        pitch: {
          target: 'complexity',
          range: [0.4, 1.0],
          response: 'logarithmic',
          sensitivity: 0.8,
          offset: 0.2
        },
        intensity: {
          target: 'scale',
          threshold: 0.1,
          decay: 0.4,
          attack: 0.3,
          ceiling: 1.5,
          curve: 'curve'
        }
      }
    },
    other: {
      ...DEFAULT_MAPPINGS.other,
      features: {
        intensity: {
          target: 'count',
          threshold: 0.15,
          decay: 0.5,
          attack: 0.2,
          ceiling: 0.8,
          curve: 'linear'
        },
        timbre: {
          target: 'spread',
          sensitivity: 0.4,
          range: [0.3, 0.7],
          smoothing: 0.4,
          bias: 0.2
        }
      }
    }
  },
  defaultSettings: {
    masterIntensity: 0.8,
    transitionSpeed: 0.3,
    backgroundAlpha: 0.8,
    particleCount: 3000,
    qualityLevel: 'medium'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDefault: true,
  usageCount: 0
};

// Ambient preset - smooth, atmospheric mappings
export const AMBIENT_PRESET: VisualizationPreset = {
  id: 'ambient-default',
  name: 'Ambient Atmosphere',
  description: 'Smooth, atmospheric preset for ambient and chill music',
  category: 'ambient',
  tags: ['ambient', 'chill', 'atmospheric', 'smooth', 'relaxing'],
  mappings: {
    drums: {
      ...DEFAULT_MAPPINGS.drums,
      globalMultiplier: 0.4,
      features: {
        rhythm: {
          target: 'opacity',
          intensity: 0.3,
          smoothing: 0.7,
          threshold: 0.4,
          multiplier: 0.6
        },
        intensity: {
          target: 'speed',
          threshold: 0.3,
          decay: 0.8,
          attack: 0.1,
          ceiling: 0.5,
          curve: 'linear'
        }
      }
    },
    bass: {
      ...DEFAULT_MAPPINGS.bass,
      globalMultiplier: 0.7,
      features: {
        pitch: {
          target: 'height',
          range: [0.4, 1.2],
          response: 'logarithmic',
          sensitivity: 0.3,
          offset: 0.5
        },
        intensity: {
          target: 'warmth',
          threshold: 0.05,
          decay: 0.9,
          attack: 0.1,
          ceiling: 1.0,
          curve: 'curve'
        }
      }
    },
    vocals: {
      ...DEFAULT_MAPPINGS.vocals,
      features: {
        pitch: {
          target: 'hue',
          range: [0.1, 0.9],
          response: 'linear',
          sensitivity: 0.5,
          offset: 0.0
        },
        intensity: {
          target: 'brightness',
          threshold: 0.02,
          decay: 0.7,
          attack: 0.2,
          ceiling: 1.2,
          curve: 'curve'
        },
        timbre: {
          target: 'spread',
          sensitivity: 0.4,
          range: [0.5, 1.0],
          smoothing: 0.5,
          bias: 0.3
        }
      }
    },
    piano: {
      ...DEFAULT_MAPPINGS.piano,
      features: {
        pitch: {
          target: 'complexity',
          range: [0.2, 0.8],
          response: 'logarithmic',
          sensitivity: 0.4,
          offset: 0.3
        },
        intensity: {
          target: 'scale',
          threshold: 0.1,
          decay: 0.6,
          attack: 0.2,
          ceiling: 1.2,
          curve: 'curve'
        }
      }
    },
    other: {
      ...DEFAULT_MAPPINGS.other,
      features: {
        intensity: {
          target: 'count',
          threshold: 0.1,
          decay: 0.8,
          attack: 0.1,
          ceiling: 0.6,
          curve: 'linear'
        },
        timbre: {
          target: 'texture',
          sensitivity: 0.3,
          range: [0.2, 0.6],
          smoothing: 0.6,
          bias: 0.2
        }
      }
    }
  },
  defaultSettings: {
    masterIntensity: 0.6,
    transitionSpeed: 0.2,
    backgroundAlpha: 0.9,
    particleCount: 2000,
    qualityLevel: 'medium'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDefault: true,
  usageCount: 0
};

// Collection of all default presets
export const DEFAULT_PRESETS: VisualizationPreset[] = [
  ELECTRONIC_PRESET,
  ROCK_PRESET,
  CLASSICAL_PRESET,
  AMBIENT_PRESET
];

// Utility function to get preset by ID
export function getPresetById(id: string): VisualizationPreset | undefined {
  return DEFAULT_PRESETS.find(preset => preset.id === id);
}

// Utility function to get presets by category
export function getPresetsByCategory(category: keyof typeof PRESET_CATEGORIES): VisualizationPreset[] {
  return DEFAULT_PRESETS.filter(preset => preset.category === category);
}

// Utility function to create a custom preset based on a default
export function createCustomPreset(
  basePresetId: string,
  customizations: Partial<VisualizationPreset>
): VisualizationPreset | null {
  const basePreset = getPresetById(basePresetId);
  if (!basePreset) return null;

  return {
    ...basePreset,
    ...customizations,
    id: customizations.id || `custom-${Date.now()}`,
    category: 'custom',
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 0
  };
}

// Quick preset selection for common use cases
export const QUICK_PRESETS = {
  highEnergy: ELECTRONIC_PRESET,
  powerful: ROCK_PRESET,
  elegant: CLASSICAL_PRESET,
  relaxing: AMBIENT_PRESET
} as const;

console.log('🎨 Default visualization mappings loaded:', DEFAULT_PRESETS.length, 'presets available');