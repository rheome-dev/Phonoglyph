// Stem Audio Analysis Types for Story 5.2

export interface AudioFeature {
  type: 'rhythm' | 'pitch' | 'intensity' | 'timbre';
  value: number;
  confidence: number;
  timestamp: number;
}

export interface StemAnalysis {
  stemId: string;
  stemType: 'drums' | 'bass' | 'vocals' | 'other' | 'piano' | 'master'; // Includes master stem type
  features: {
    rhythm: AudioFeature[];
    pitch: AudioFeature[];
    intensity: AudioFeature[];
    timbre: AudioFeature[];
  };
  metadata: {
    bpm: number;
    key: string;
    energy: number;
    clarity: number; // Quality metric for Spleeter separation
  };
}

export interface StemProcessorConfig {
  bufferSize: number;
  analysisResolution: number;
  visualizationPreset?: string;
  deviceOptimization: 'mobile' | 'desktop' | 'auto';
  maxConcurrentStems: number;
}

export interface PerformanceMetrics {
  fps: number;
  analysisLatency: number;
  memoryUsage: number;
  cpuUsage: number;
  frameDrops: number;
}

export interface StemFeatureSet {
  stemType: StemAnalysis['stemType'];
  currentFeatures: Record<string, AudioFeature>;
  historicalFeatures: Record<string, AudioFeature[]>;
  correlationData: Record<string, number>; // Cross-stem correlations
}

export type VisualizationFeature = 
  | 'rms' 
  | 'spectralCentroid' 
  | 'spectralRolloff' 
  | 'loudness' 
  | 'perceptualSpread' 
  | 'spectralFlux'
  | 'mfcc'
  | 'chromaVector'
  | 'tempo'
  | 'rhythmPattern';

export interface AnalysisConfig {
  features: Set<VisualizationFeature>;
  bufferSize: number;
  frameRate: number;
  quality: 'low' | 'medium' | 'high';
  enableCrossStemAnalysis: boolean;
}

/**
 * Represents the detailed, time-series audio analysis data for a single track.
 * This is typically generated on the client-side by an analysis worker.
 * The keys are feature names (e.g., "rms", "spectralCentroid", "mfcc_0").
 * The values are Float32Array containing the value of that feature for each analysis frame.
 */
export interface AudioAnalysisDataForTrack {
  [feature: string]: Float32Array;
}