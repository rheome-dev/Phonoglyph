// Simple types for the current stem visualization implementation
// These are the only types actually being used in the working system

export interface StemVisualizationMapping {
  stemType: 'drums' | 'bass' | 'vocals' | 'piano' | 'other';
  enabled: boolean;
  priority: number;
  globalMultiplier: number;
  crossfade: number;
  solo: boolean;
  mute: boolean;
}

export interface VisualizationPreset {
  id: string;
  name: string;
  description: string;
  category: 'electronic' | 'rock' | 'classical' | 'ambient' | 'custom';
  tags: string[];
  mappings: Record<string, StemVisualizationMapping>;
  defaultSettings: {
    masterIntensity: number;
    transitionSpeed: number;
    backgroundAlpha: number;
    particleCount: number;
    qualityLevel: 'low' | 'medium' | 'high';
  };
  createdAt: string;
  updatedAt: string;
  userId?: string;
  isDefault: boolean;
  usageCount: number;
}

// Simple default preset for the current implementation
export const DEFAULT_PRESETS = [
  {
    id: 'default',
    name: 'Default',
    description: 'Default visualization preset',
    category: 'custom' as const,
    tags: ['default'],
    mappings: {},
    defaultSettings: {
      masterIntensity: 1.0,
      transitionSpeed: 1.0,
      backgroundAlpha: 0.1,
      particleCount: 100,
      qualityLevel: 'medium' as const
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    usageCount: 0
  }
]; 