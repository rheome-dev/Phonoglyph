'use client';

import { create } from 'zustand';
import type { Layer } from '@/types/video-composition';

interface TimelineState {
  layers: Layer[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  selectedLayerId: string | null;
}

interface TimelineActions {
  setLayers: (layers: Layer[]) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  deleteLayer: (layerId: string) => void;
  selectLayer: (layerId: string | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
}

export const useTimelineStore = create<TimelineState & TimelineActions>((set) => ({
  layers: [
    {
      id: `default-empty-${Date.now()}`,
      name: 'Layer 1',
      type: 'image',
      src: '',
      zIndex: 1,
      isDeletable: true,
      startTime: 0,
      endTime: 120,
      duration: 120,
    } as Layer,
  ],
  currentTime: 0,
  duration: 120,
  isPlaying: false,
  selectedLayerId: null,

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
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
}));


