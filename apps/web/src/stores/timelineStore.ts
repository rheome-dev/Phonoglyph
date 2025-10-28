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
  layers: [],
  currentTime: 0,
  duration: 120,
  isPlaying: false,
  selectedLayerId: null,

  setLayers: (layers) => set({ layers }),
  addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
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


