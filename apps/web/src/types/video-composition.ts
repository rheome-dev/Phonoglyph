import type { AudioAnalysisData, LiveMIDIData } from './visualizer';

export interface AudioBinding {
  feature: keyof AudioAnalysisData;
  inputRange: [number, number];
  outputRange: [number, number];
  blendMode: 'add' | 'multiply' | 'replace';
  modulationAmount?: number; // 0-1, default 1.0 (100%)
}

export interface MIDIBinding {
  source: 'velocity' | 'cc' | 'pitchBend' | 'channelPressure';
  inputRange: [number, number];
  outputRange: [number, number];
  blendMode: 'add' | 'multiply' | 'replace';
}

export interface Layer {
  id: string;
  type: 'video' | 'image' | 'effect';
  src?: string;
  effectType?: EffectType;
  settings?: any;
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  opacity: number;
  audioBindings: AudioBinding[];
  midiBindings: MIDIBinding[];
  zIndex: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  startTime: number;
  endTime: number;
  duration: number;
}

export type EffectType = 'metaballs' | 'particles' | 'particleNetwork' | 'midihud' | 'bloom';
export type LayerType = 'video' | 'image' | 'effect';

export interface VideoComposition {
  id: string;
  projectId: string;
  name: string;
  layers: Layer[];
  width: number;
  height: number;
  duration: number;
  fps: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LayerClip {
  id: string;
  layerId: string;
  startTime: number;
  endTime: number;
  parameters: Record<string, any>;
}

export interface CompositionTimeline {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  layers: Layer[];
  clips: LayerClip[];
} 