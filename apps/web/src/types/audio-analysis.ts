export interface AnalysisParams {
  transientThreshold: number;
  onsetThreshold: number;
  chromaSmoothing: number;
  rmsWindowSize: number;
  pitchConfidence: number;
  minNoteDuration: number;
}

export interface TransientData {
  time: number;
  intensity: number;
  frequency: number;
}

export interface ChromaData {
  time: number;
  pitch: number;
  confidence: number;
  note: string;
}

export interface RMSData {
  time: number;
  value: number;
}

export type AnalysisMethod = 'original' | 'enhanced' | 'both';



// This is the target data structure for the analysis worker to produce
export interface FullAudioAnalysis {
  bpm: number;
  // ... other analysis fields
}

