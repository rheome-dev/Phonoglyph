import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface Layer {
  id: string;
  name: string;
  type: 'video' | 'image' | 'effect' | 'three' | 'midi-trigger';
  visible: boolean;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light';
  startTime: number; // in seconds
  endTime: number; // in seconds
  zIndex: number;
  
  // Type-specific properties
  sourceUrl?: string; // for video/image layers
  effectType?: string; // for effect layers
  effectSettings?: Record<string, any>; // for effect layers
  transformations?: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  };
  
  // Animation keyframes
  keyframes?: Keyframe[];
}

export interface Keyframe {
  time: number;
  property: string;
  value: any;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
  easingParams?: number[];
}

export interface CompositionSettings {
  width: number;
  height: number;
  fps: number;
  duration: number; // in seconds
  backgroundColor: string;
  audioSrc?: string;
}

interface LayerState {
  layers: Layer[];
  selectedLayerId: string | null;
  compositionSettings: CompositionSettings;
  isPlaying: boolean;
  currentTime: number;
  previewQuality: 'draft' | 'medium' | 'high';
  
  // Actions
  addLayer: (layer: Omit<Layer, 'id'>) => string;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  duplicateLayer: (layerId: string) => string;
  reorderLayer: (layerId: string, newZIndex: number) => void;
  selectLayer: (layerId: string | null) => void;
  
  // Composition actions
  updateCompositionSettings: (settings: Partial<CompositionSettings>) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPreviewQuality: (quality: 'draft' | 'medium' | 'high') => void;
  
  // Layer visibility and ordering
  toggleLayerVisibility: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  getLayersByType: (type: Layer['type']) => Layer[];
  getVisibleLayers: () => Layer[];
  getLayersAtTime: (time: number) => Layer[];
  
  // Animation and keyframes
  addKeyframe: (layerId: string, keyframe: Omit<Keyframe, 'time'>, time: number) => void;
  removeKeyframe: (layerId: string, time: number, property: string) => void;
  updateKeyframe: (layerId: string, time: number, property: string, updates: Partial<Keyframe>) => void;
  
  // Utility functions
  getNextZIndex: () => number;
  exportComposition: () => { layers: Layer[]; settings: CompositionSettings };
  importComposition: (data: { layers: Layer[]; settings: CompositionSettings }) => void;
}

const DEFAULT_COMPOSITION: CompositionSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 60, // 1 minute default
  backgroundColor: '#000000'
};

export const useLayerStore = create<LayerState>()(
  subscribeWithSelector((set, get) => ({
    layers: [],
    selectedLayerId: null,
    compositionSettings: DEFAULT_COMPOSITION,
    isPlaying: false,
    currentTime: 0,
    previewQuality: 'medium',
    
    addLayer: (layerData) => {
      const id = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newLayer: Layer = {
        id,
        zIndex: get().getNextZIndex(),
        transformations: {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0
        },
        keyframes: [],
        ...layerData
      };
      
      set((state) => ({
        layers: [...state.layers, newLayer],
        selectedLayerId: id
      }));
      
      return id;
    },
    
    removeLayer: (layerId) => {
      set((state) => ({
        layers: state.layers.filter(layer => layer.id !== layerId),
        selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId
      }));
    },
    
    updateLayer: (layerId, updates) => {
      set((state) => ({
        layers: state.layers.map(layer =>
          layer.id === layerId ? { ...layer, ...updates } : layer
        )
      }));
    },
    
    duplicateLayer: (layerId) => {
      const state = get();
      const originalLayer = state.layers.find(l => l.id === layerId);
      if (!originalLayer) return '';
      
      const duplicatedLayer = {
        ...originalLayer,
        name: `${originalLayer.name} Copy`,
        startTime: originalLayer.endTime, // Place after original
        endTime: originalLayer.endTime + (originalLayer.endTime - originalLayer.startTime)
      };
      
      return state.addLayer(duplicatedLayer);
    },
    
    reorderLayer: (layerId, newZIndex) => {
      set((state) => ({
        layers: state.layers.map(layer =>
          layer.id === layerId ? { ...layer, zIndex: newZIndex } : layer
        )
      }));
    },
    
    selectLayer: (layerId) => {
      set({ selectedLayerId: layerId });
    },
    
    updateCompositionSettings: (settings) => {
      set((state) => ({
        compositionSettings: { ...state.compositionSettings, ...settings }
      }));
    },
    
    setCurrentTime: (time) => {
      set({ currentTime: Math.max(0, Math.min(time, get().compositionSettings.duration)) });
    },
    
    setIsPlaying: (playing) => {
      set({ isPlaying: playing });
    },
    
    setPreviewQuality: (quality) => {
      set({ previewQuality: quality });
    },
    
    toggleLayerVisibility: (layerId) => {
      set((state) => ({
        layers: state.layers.map(layer =>
          layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
        )
      }));
    },
    
    setLayerOpacity: (layerId, opacity) => {
      set((state) => ({
        layers: state.layers.map(layer =>
          layer.id === layerId ? { ...layer, opacity: Math.max(0, Math.min(1, opacity)) } : layer
        )
      }));
    },
    
    getLayersByType: (type) => {
      return get().layers.filter(layer => layer.type === type);
    },
    
    getVisibleLayers: () => {
      return get().layers.filter(layer => layer.visible);
    },
    
    getLayersAtTime: (time) => {
      return get().layers.filter(layer => 
        layer.visible && time >= layer.startTime && time <= layer.endTime
      );
    },
    
    addKeyframe: (layerId, keyframeData, time) => {
      set((state) => ({
        layers: state.layers.map(layer => {
          if (layer.id !== layerId) return layer;
          
          const keyframes = layer.keyframes || [];
          const newKeyframe: Keyframe = { ...keyframeData, time };
          
          // Remove existing keyframe at same time for same property
          const filteredKeyframes = keyframes.filter(
            kf => !(kf.time === time && kf.property === keyframeData.property)
          );
          
          return {
            ...layer,
            keyframes: [...filteredKeyframes, newKeyframe].sort((a, b) => a.time - b.time)
          };
        })
      }));
    },
    
    removeKeyframe: (layerId, time, property) => {
      set((state) => ({
        layers: state.layers.map(layer => {
          if (layer.id !== layerId) return layer;
          
          return {
            ...layer,
            keyframes: (layer.keyframes || []).filter(
              kf => !(kf.time === time && kf.property === property)
            )
          };
        })
      }));
    },
    
    updateKeyframe: (layerId, time, property, updates) => {
      set((state) => ({
        layers: state.layers.map(layer => {
          if (layer.id !== layerId) return layer;
          
          return {
            ...layer,
            keyframes: (layer.keyframes || []).map(kf =>
              kf.time === time && kf.property === property
                ? { ...kf, ...updates }
                : kf
            )
          };
        })
      }));
    },
    
    getNextZIndex: () => {
      const layers = get().layers;
      return layers.length > 0 ? Math.max(...layers.map(l => l.zIndex)) + 1 : 0;
    },
    
    exportComposition: () => {
      const state = get();
      return {
        layers: state.layers,
        settings: state.compositionSettings
      };
    },
    
    importComposition: (data) => {
      set({
        layers: data.layers,
        compositionSettings: data.settings,
        selectedLayerId: null
      });
    }
  }))
);