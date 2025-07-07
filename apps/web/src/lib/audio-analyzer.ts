import Meyda, { MeydaAnalyzer, MeydaFeatures } from 'meyda';
import { AudioAnalysisData } from '@/types/visualizer';

export class AudioAnalyzer {
  private context: AudioContext;
  private analyzer: MeydaAnalyzer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private features: Set<string>;
  private bufferSize: number = 512;
  private lastFeatures: MeydaFeatures | null = null;

  constructor(audioContext: AudioContext) {
    this.context = audioContext;
    this.features = new Set([
      'rms',
      'zcr',
      'spectralCentroid',
      'spectralRolloff',
      'loudness',
      'perceptualSpread',
      'spectralFlux'
    ]);
  }

  async analyzeStem(audioBuffer: AudioBuffer): Promise<AudioAnalysisData> {
    // Clean up previous source if it exists
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    // Create new audio source
    this.source = this.context.createBufferSource();
    this.source.buffer = audioBuffer;

    // Create analyzer node
    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.context,
      source: this.source,
      bufferSize: this.bufferSize,
      featureExtractors: Array.from(this.features),
      callback: this.handleAnalysis
    });

    // Start analysis
    this.analyzer.start();
    this.source.start(0);

    // Wait for first analysis
    return new Promise((resolve) => {
      const checkFeatures = () => {
        if (this.lastFeatures) {
          resolve(this.createAnalysisData(this.lastFeatures));
        } else {
          setTimeout(checkFeatures, 10);
        }
      };
      checkFeatures();
    });
  }

  private handleAnalysis = (features: MeydaFeatures) => {
    this.lastFeatures = features;
    // Convert Meyda features to our AudioAnalysisData format
    const analysisData = this.createAnalysisData(features);
    // Emit event or callback with new data
    this.onAnalysis(analysisData);
  };

  private createAnalysisData(features: MeydaFeatures): AudioAnalysisData {
    // Convert raw frequency data to normalized Float32Array
    const frequencies = new Float32Array(256);
    if (features.loudness && features.loudness.specific) {
      const specific = features.loudness.specific;
      for (let i = 0; i < Math.min(specific.length, frequencies.length); i++) {
        frequencies[i] = specific[i] / 100; // Normalize to 0-1 range
      }
    }

    // Create time domain data
    const timeData = new Float32Array(256);
    if (features.buffer) {
      for (let i = 0; i < Math.min(features.buffer.length, timeData.length); i++) {
        timeData[i] = (features.buffer[i] + 1) / 2; // Convert from -1,1 to 0,1 range
      }
    }

    return {
      frequencies,
      timeData,
      volume: features.rms || 0,
      bass: this.calculateBandEnergy(frequencies, 0, 60),   // 0-60 Hz
      mid: this.calculateBandEnergy(frequencies, 60, 2000), // 60-2000 Hz
      treble: this.calculateBandEnergy(frequencies, 2000, 20000) // 2000-20000 Hz
    };
  }

  private calculateBandEnergy(frequencies: Float32Array, minFreq: number, maxFreq: number): number {
    const minIndex = Math.floor((minFreq / 22050) * frequencies.length);
    const maxIndex = Math.ceil((maxFreq / 22050) * frequencies.length);
    let energy = 0;
    let count = 0;

    for (let i = minIndex; i < maxIndex && i < frequencies.length; i++) {
      energy += frequencies[i];
      count++;
    }

    return count > 0 ? energy / count : 0;
  }

  // Callback for real-time analysis updates
  private onAnalysis: (data: AudioAnalysisData) => void = () => {};
  
  public setAnalysisCallback(callback: (data: AudioAnalysisData) => void) {
    this.onAnalysis = callback;
  }

  public stop() {
    if (this.analyzer) {
      this.analyzer.stop();
    }
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
  }

  public dispose() {
    this.stop();
    if (this.context.state !== 'closed') {
      this.context.close();
    }
  }
} 