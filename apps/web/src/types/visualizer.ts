import * as THREE from 'three';

export interface VisualEffect {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  parameters: Record<string, any>;
  // Effects are now self-contained and manage their own scene and camera
  init(renderer: THREE.WebGLRenderer): void;
  update(deltaTime: number): void;
  destroy(): void;

  // Expose internal scene and camera for the compositor
  getScene(): THREE.Scene;
  getCamera(): THREE.Camera;
}

export interface AudioAnalysisData {
  frequencies: number[];
  timeData: number[];
  volume: number;
  bass: number;
  mid: number;
  treble: number;
}

export interface LiveMIDIData {
  activeNotes: Array<{
    note: number;
    velocity: number;
    startTime: number;
    track: string;
  }>;
  currentTime: number;
  tempo: number;
  totalNotes: number;
  trackActivity: Record<string, boolean>;
}

export interface MetaballConfig {
  trailLength: number;
  baseRadius: number;
  smoothingFactor: number;
  colorPalette: string[];
  animationSpeed: number;
  noiseIntensity: number;
  highlightColor: [number, number, number];
}

export interface AspectRatioConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  maxWidth?: string;
  maxHeight?: string;
  className?: string;
}

export interface VisualizerConfig {
  canvas: {
    width: number;
    height: number;
    pixelRatio?: number;
  };
  aspectRatio?: AspectRatioConfig;
  effects?: VisualEffect[];
  performance?: {
    targetFPS?: number;
    enableShadows?: boolean;
  };
  midi: {
    velocitySensitivity: number;
    noteTrailDuration: number;
    trackColorMapping: Record<string, string>;
  };
}

export interface VisualizerControls {
  global: {
    intensity: number;
    colorShift: number;
    timeScale: number;
    resolution: number;
  };
  metaballs: MetaballConfig;
  particles: {
    count: number;
    size: number;
    speed: number;
    physics: boolean;
  };
  postProcessing: {
    bloom: number;
    contrast: number;
    saturation: number;
    noise: number;
  };
}

export type EffectType = 'metaballs' | 'particles' | 'waveforms' | 'geometry' | 'shaders' | 'postfx';

export interface EffectPreset {
  id: string;
  name: string;
  description: string;
  type: EffectType;
  config: Partial<VisualizerControls>;
  tags: string[];
} 