/**
 * Visualization Type Definitions
 * Comprehensive types for Three.js visualizations and effects
 */

import * as THREE from 'three';
import { AudioAnalysisData, StemType, VisualizationParameters } from './audio';

// ===== CORE VISUALIZATION TYPES =====

export interface VisualEffect {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  parameters: EffectParameters;
  init(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): Promise<void>;
  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void;
  destroy(): void;
  getShaderUniforms(): Record<string, THREE.IUniform>;
}

export interface EffectParameters {
  [key: string]: EffectParameter;
}

export interface EffectParameter {
  value: number | string | boolean | number[];
  min?: number;
  max?: number;
  step?: number;
  type: 'number' | 'string' | 'boolean' | 'color' | 'vector2' | 'vector3' | 'vector4';
  label: string;
  description?: string;
  category?: string;
}

// ===== MIDI DATA TYPES =====

export interface LiveMIDIData {
  activeNotes: MIDINote[];
  currentTime: number;
  tempo: number;
  totalNotes: number;
  trackActivity: Record<string, boolean>;
  timeSignature: [number, number];
  keySignature: string;
}

export interface MIDINote {
  note: number;
  velocity: number;
  startTime: number;
  endTime?: number;
  track: string;
  channel: number;
  instrument?: string;
}

export interface MIDITrack {
  id: string;
  name: string;
  channel: number;
  instrument: string;
  notes: MIDINote[];
  controlChanges: MIDIControlChange[];
  programChanges: MIDIProgramChange[];
}

export interface MIDIControlChange {
  timestamp: number;
  controller: number;
  value: number;
  channel: number;
}

export interface MIDIProgramChange {
  timestamp: number;
  program: number;
  channel: number;
}

// ===== VISUALIZER CORE TYPES =====

export interface VisualizerInstance {
  id: string;
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  effects: Map<string, VisualEffect>;
  mediaLayers: Map<string, MediaLayer>;
  audioTextureManager: AudioTextureManager;
  isInitialized: boolean;
  isPlaying: boolean;
  currentTime: number;
}

export interface MediaLayer {
  id: string;
  type: 'audio' | 'video' | 'image' | 'text' | 'effect';
  enabled: boolean;
  opacity: number;
  blendMode: BlendMode;
  transform: LayerTransform;
  content: MediaContent;
  effects: string[]; // Effect IDs
}

export type BlendMode = 
  | 'normal' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'soft-light' 
  | 'hard-light' 
  | 'color-dodge' 
  | 'color-burn' 
  | 'darken' 
  | 'lighten' 
  | 'difference' 
  | 'exclusion';

export interface LayerTransform {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  anchor: THREE.Vector2;
}

export interface MediaContent {
  type: 'texture' | 'geometry' | 'text' | 'particles';
  data: TextureContent | GeometryContent | TextContent | ParticleContent;
}

export interface TextureContent {
  texture: THREE.Texture;
  uvTransform: THREE.Matrix3;
  wrapS: THREE.Wrapping;
  wrapT: THREE.Wrapping;
  magFilter: THREE.TextureFilter;
  minFilter: THREE.TextureFilter;
}

export interface GeometryContent {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow: boolean;
  receiveShadow: boolean;
}

export interface TextContent {
  text: string;
  font: string;
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
}

export interface ParticleContent {
  count: number;
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  lifetimes: Float32Array;
  emissionRate: number;
}

// ===== AUDIO TEXTURE MANAGER TYPES =====

export interface AudioTextureManager {
  loadAudioAnalysis(audioData: Record<StemType, unknown>): Promise<void>;
  updateAudioData(stemType: StemType, data: AudioAnalysisData): void;
  getShaderUniforms(): Record<string, THREE.IUniform>;
  setCurrentTime(time: number): void;
  dispose(): void;
}

export interface AudioTextureConfig {
  textureWidth: number;
  textureHeight: number;
  maxFeatures: number;
  maxTimeSteps: number;
  format: THREE.PixelFormat;
  type: THREE.TextureDataType;
}

// ===== SHADER TYPES =====

export interface ShaderMaterial extends THREE.ShaderMaterial {
  uniforms: {
    [key: string]: THREE.IUniform;
  };
  vertexShader: string;
  fragmentShader: string;
}

export interface ShaderUniforms {
  // Time uniforms
  uTime: THREE.IUniform<number>;
  uDeltaTime: THREE.IUniform<number>;
  
  // Audio uniforms
  uAudioTexture: THREE.IUniform<THREE.Texture>;
  uAudioTextureSize: THREE.IUniform<THREE.Vector2>;
  uAudioTime: THREE.IUniform<number>;
  
  // Visual parameter uniforms
  uColorPrimary: THREE.IUniform<THREE.Color>;
  uColorSecondary: THREE.IUniform<THREE.Color>;
  uIntensity: THREE.IUniform<number>;
  uScale: THREE.IUniform<number>;
  
  // Camera uniforms
  uCameraPosition: THREE.IUniform<THREE.Vector3>;
  uViewMatrix: THREE.IUniform<THREE.Matrix4>;
  uProjectionMatrix: THREE.IUniform<THREE.Matrix4>;
  
  // Resolution uniforms
  uResolution: THREE.IUniform<THREE.Vector2>;
  uPixelRatio: THREE.IUniform<number>;
}

// ===== PERFORMANCE MONITORING =====

export interface VisualizationPerformanceMetrics {
  frameRate: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  shaderPrograms: number;
  memoryUsage: {
    geometries: number;
    textures: number;
    total: number;
  };
  gpuMemoryUsage: number;
  renderTime: number;
  updateTime: number;
}

export interface PerformanceThresholds {
  minFrameRate: number;
  maxFrameTime: number;
  maxDrawCalls: number;
  maxMemoryUsage: number;
  maxGpuMemoryUsage: number;
}

// ===== EXPORT TYPES =====

export interface VisualizationExportSettings {
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  duration: number;
  quality: 'draft' | 'preview' | 'high' | 'ultra';
  format: 'mp4' | 'webm' | 'gif' | 'image_sequence';
  audioSync: boolean;
  effects: string[]; // Effect IDs to include
  layers: string[]; // Layer IDs to include
}

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  estimatedTimeRemaining: number;
  currentStage: 'preparing' | 'rendering' | 'encoding' | 'finalizing';
  errors: string[];
}

// ===== DEVICE OPTIMIZATION =====

export interface DeviceProfile {
  tier: 'low' | 'medium' | 'high' | 'ultra';
  capabilities: {
    webgl2: boolean;
    floatTextures: boolean;
    depthTextures: boolean;
    instancedArrays: boolean;
    vertexArrayObjects: boolean;
    maxTextureSize: number;
    maxRenderBufferSize: number;
    maxVertexUniforms: number;
    maxFragmentUniforms: number;
  };
  recommendedSettings: {
    maxParticles: number;
    textureResolution: number;
    shadowMapSize: number;
    antialias: boolean;
    postProcessing: boolean;
  };
}

// ===== TYPE GUARDS =====

export function isVisualEffect(value: unknown): value is VisualEffect {
  if (!value || typeof value !== 'object') return false;
  
  const effect = value as Record<string, unknown>;
  return typeof effect.id === 'string' &&
         typeof effect.name === 'string' &&
         typeof effect.enabled === 'boolean' &&
         typeof effect.init === 'function' &&
         typeof effect.update === 'function' &&
         typeof effect.destroy === 'function';
}

export function isLiveMIDIData(value: unknown): value is LiveMIDIData {
  if (!value || typeof value !== 'object') return false;
  
  const data = value as Record<string, unknown>;
  return Array.isArray(data.activeNotes) &&
         typeof data.currentTime === 'number' &&
         typeof data.tempo === 'number' &&
         typeof data.totalNotes === 'number' &&
         typeof data.trackActivity === 'object';
}

export function isMediaLayer(value: unknown): value is MediaLayer {
  if (!value || typeof value !== 'object') return false;
  
  const layer = value as Record<string, unknown>;
  return typeof layer.id === 'string' &&
         typeof layer.type === 'string' &&
         typeof layer.enabled === 'boolean' &&
         typeof layer.opacity === 'number';
}

export function isVisualizationParameters(value: unknown): value is VisualizationParameters {
  if (!value || typeof value !== 'object') return false;
  
  const params = value as Record<string, unknown>;
  return typeof params.colorScheme === 'object' &&
         typeof params.effectSettings === 'object' &&
         typeof params.cameraSettings === 'object';
}
