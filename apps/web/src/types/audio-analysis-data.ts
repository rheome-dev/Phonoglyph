export interface TransientData {
  time: number;
  intensity: number;
  type?: string; // 'kick', 'snare', 'hat', 'generic', etc. - always provided by worker as 'generic' for now
  frequency?: number;
}

export interface FeatureNormalizationMeta {
  [featureName: string]: {
    originalMin: number;
    originalMax: number;
    wasNormalized: boolean;
  };
}

export interface ChromaData {
  time: number;
  pitch: number;
  confidence: number;
  chroma: number[];
}

export interface WaveformData {
  points: number[];
  sampleRate: number;
  duration: number;
  markers: Array<{ time: number; type: 'beat' | 'onset' | 'peak' | 'drop'; intensity: number; frequency?: number }>;
}

export interface AudioAnalysisData {
  id: string;
  fileMetadataId: string;
  stemType: string;

  analysisData: {
    frameTimes?: Float32Array | number[];
    rms: Float32Array | number[];
    loudness: Float32Array | number[];
    spectralCentroid: Float32Array | number[];
    spectralRolloff?: Float32Array | number[];
    spectralFlatness?: Float32Array | number[];
    zcr?: Float32Array | number[];

    fft: Float32Array | number[];
    fftFrequencies?: Float32Array | number[];
    amplitudeSpectrum?: Float32Array | number[];

    volume?: Float32Array | number[];
    bass?: Float32Array | number[];
    mid?: Float32Array | number[];
    treble?: Float32Array | number[];
    features?: Float32Array | number[];
    markers?: Float32Array | number[];
    frequencies?: Float32Array | number[];
    timeData?: Float32Array | number[];

    stereoWindow_left?: Float32Array | number[];
    stereoWindow_right?: Float32Array | number[];

    transients?: TransientData[];
    chroma?: ChromaData[];

    // Optional scalar BPM when detected and persisted
    bpm?: number;

    // Normalization metadata for time-series features
    normalizationMeta?: FeatureNormalizationMeta;
  };

  waveformData: WaveformData;

  metadata: {
    sampleRate: number;
    duration: number;
    bufferSize: number;
    featuresExtracted: string[];
    analysisDuration: number;
    bpm?: number;
  };

  // Optional convenience duplication for quick access
  bpm?: number;
}
