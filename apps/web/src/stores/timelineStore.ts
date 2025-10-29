'use client';

import { create } from 'zustand';
import type { Layer } from '@/types/video-composition';

interface TimelineState {
  layers: Layer[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  selectedLayerId: string | null;
  zoom: number;
}

interface TimelineActions {
  setLayers: (layers: Layer[]) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  deleteLayer: (layerId: string) => void;
  selectLayer: (layerId: string | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setZoom: (zoom: number) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
}

export const useTimelineStore = create<TimelineState & TimelineActions>((set) => ({
  layers: [
    // FIX: Ensure the default layer is a complete object to prevent rendering issues.
    {
      id: `layer-default-${Date.now()}`,
      name: 'Layer 1',
      type: 'image',
      src: '',
      zIndex: 0,
      isDeletable: true,
      startTime: 0,
      endTime: 120, // This will be updated when a project with a duration is loaded
      duration: 120,
      position: { x: 50, y: 50 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      opacity: 1,
      audioBindings: [],
      midiBindings: [],
      blendMode: 'normal',
    } as Layer,
  ],
  currentTime: 0,
  duration: 120,
  isPlaying: false,
  selectedLayerId: null,
  zoom: 1,

  setLayers: (layers) => set({ layers }),
  addLayer: (layer) => set((state) => {
    const maxZIndex = state.layers.reduce(
      (max, l) => (l.zIndex > max ? l.zIndex : max),
      -1
    );
    const newLayer = { ...layer, zIndex: maxZIndex + 1 } as Layer;
    return { layers: [...state.layers, newLayer] };
  }),
  updateLayer: (layerId, updates) => set((state) => ({
    layers: state.layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l)),
  })),
  deleteLayer: (layerId) => set((state) => ({
    layers: state.layers.filter((l) => l.id !== layerId),
    selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
  })),
  selectLayer: (layerId) => set({ selectedLayerId: layerId }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setZoom: (zoom) => set({ zoom: Math.max(0.01, Math.min(3, zoom)) }), // Min can be very small, max is now 300%
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
}));


