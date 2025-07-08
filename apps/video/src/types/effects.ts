export interface VideoEffect {
  type: 'hard_cut' | 'crossfade' | 'slide' | 'zoom' | 'spin' | 'glitch' | 'strobe';
  duration: number; // Effect duration in seconds
  intensity: number; // 0-1, can be modified by velocity
  direction?: 'in' | 'out' | 'left' | 'right' | 'up' | 'down';
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
  parameters?: Record<string, number>; // Effect-specific parameters
}