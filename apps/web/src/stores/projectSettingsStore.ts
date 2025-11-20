'use client';

import { create } from 'zustand';

interface ProjectSettingsState {
  backgroundColor: string;
  isBackgroundVisible: boolean;
}

interface ProjectSettingsActions {
  setBackgroundColor: (color: string) => void;
  toggleBackgroundVisibility: () => void;
}

export const useProjectSettingsStore = create<ProjectSettingsState & ProjectSettingsActions>((set) => ({
  backgroundColor: '#000000',
  isBackgroundVisible: true,

  setBackgroundColor: (color) => set({ backgroundColor: color }),
  toggleBackgroundVisibility: () => set((state) => ({ isBackgroundVisible: !state.isBackgroundVisible })),
}));







