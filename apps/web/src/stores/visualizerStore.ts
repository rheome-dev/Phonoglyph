'use client';

import { create } from 'zustand';
import { getNestedParam, setNestedParam } from '@/lib/visualizer/paramKeys';

// Types
export interface FeatureMapping {
  featureId: string | null;
  modulationAmount: number; // 0-1, default 0.5 (50%)
}

export interface AudioAnalysisSettings {
  transientDecay: number;
  transientSensitivity: number;
}

interface VisualizerState {
  // Global Settings
  aspectRatio: string;
  selectedEffects: Record<string, boolean>;
  
  // Audio Analysis Configuration (per-feature settings)
  audioAnalysisSettings: AudioAnalysisSettings;
  featureDecayTimes: Record<string, number>;
  featureSensitivities: Record<string, number>;
  
  // Mappings & Parameters
  mappings: Record<string, FeatureMapping>;
  // Nested: effectInstanceId -> paramName -> value
  baseParameterValues: Record<string, Record<string, any>>;
  activeSliderValues: Record<string, Record<string, any>>;
}

interface VisualizerActions {
  // Setters
  setAspectRatio: (ratio: string) => void;
  setSelectedEffects: (effects: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setAudioAnalysisSettings: (settings: Partial<AudioAnalysisSettings>) => void;
  setFeatureDecayTime: (featureId: string, decayTime: number) => void;
  setFeatureSensitivity: (featureId: string, sensitivity: number) => void;
  setMappings: (mappings: Record<string, FeatureMapping> | ((prev: Record<string, FeatureMapping>) => Record<string, FeatureMapping>)) => void;
  // Set full maps (rare)
  setBaseParameterValues: (values: Record<string, Record<string, any>> | ((prev: Record<string, Record<string, any>>) => Record<string, Record<string, any>>)) => void;
  setActiveSliderValues: (values: Record<string, Record<string, any>> | ((prev: Record<string, Record<string, any>>) => Record<string, Record<string, any>>)) => void;
  // Set single parameter helpers
  setBaseParam: (effectInstanceId: string, paramName: string, value: any) => void;
  setActiveParam: (effectInstanceId: string, paramName: string, value: any) => void;
  
  // Helper Actions
  updateMapping: (id: string, mapping: FeatureMapping) => void;
  removeMapping: (id: string) => void;
  reset: () => void;
}

const DEFAULT_STATE: VisualizerState = {
  aspectRatio: 'mobile',
  selectedEffects: {},
  audioAnalysisSettings: {
    transientDecay: 0.5,
    transientSensitivity: 0.5,
  },
  featureDecayTimes: {},
  featureSensitivities: {},
  mappings: {},
  baseParameterValues: {},
  activeSliderValues: {},
};

export const useVisualizerStore = create<VisualizerState & VisualizerActions>((set) => ({
  ...DEFAULT_STATE,

  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  
  setSelectedEffects: (updater) => set((state) => ({ 
    selectedEffects: typeof updater === 'function' ? updater(state.selectedEffects) : updater 
  })),
  
  setAudioAnalysisSettings: (settings) => set((state) => ({
    audioAnalysisSettings: { ...state.audioAnalysisSettings, ...settings }
  })),

  setFeatureDecayTime: (featureId, decayTime) => set((state) => ({
    featureDecayTimes: { ...state.featureDecayTimes, [featureId]: decayTime }
  })),

  setFeatureSensitivity: (featureId, sensitivity) => set((state) => ({
    featureSensitivities: { ...state.featureSensitivities, [featureId]: sensitivity }
  })),

  setMappings: (updater) => set((state) => ({
    mappings: typeof updater === 'function' ? updater(state.mappings) : updater
  })),

  setBaseParameterValues: (updater) => set((state) => ({
    baseParameterValues: typeof updater === 'function' ? updater(state.baseParameterValues) : updater
  })),

  setActiveSliderValues: (updater) => set((state) => ({
    activeSliderValues: typeof updater === 'function' ? updater(state.activeSliderValues) : updater
  })),

  setBaseParam: (effectInstanceId, paramName, value) => set((state) => ({
    baseParameterValues: setNestedParam(state.baseParameterValues, effectInstanceId, paramName, value)
  })),

  setActiveParam: (effectInstanceId, paramName, value) => set((state) => ({
    activeSliderValues: setNestedParam(state.activeSliderValues, effectInstanceId, paramName, value)
  })),

  updateMapping: (id, mapping) => set((state) => ({
    mappings: { ...state.mappings, [id]: mapping }
  })),

  removeMapping: (id) => set((state) => {
    const newMappings = { ...state.mappings };
    delete newMappings[id];
    return { mappings: newMappings };
  }),

  reset: () => set(DEFAULT_STATE),
}));

