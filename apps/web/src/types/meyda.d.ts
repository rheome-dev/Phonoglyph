declare module 'meyda' {
  export interface MeydaAnalyzer {
    start(): void;
    stop(): void;
  }

  export interface MeydaFeatures {
    rms: number;
    zcr: number;
    spectralCentroid: number;
    spectralRolloff: number;
    loudness: {
      specific: number[];
      total: number;
    };
    perceptualSpread: number;
    spectralFlux: number;
    buffer: Float32Array;
  }

  export interface MeydaOptions {
    audioContext: AudioContext;
    source: AudioNode;
    bufferSize: number;
    featureExtractors: string[];
    callback: (features: MeydaFeatures) => void;
  }

  export function createMeydaAnalyzer(options: MeydaOptions): MeydaAnalyzer;
} 