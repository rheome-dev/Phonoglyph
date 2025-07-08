import Meyda, { MeydaAnalyzer, MeydaFeatures } from 'meyda';
import { AudioAnalysisData } from '@/types/visualizer';
import { AudioProcessor } from './audio-processor';
import { StemAnalysis, VisualizationFeature } from '@/types/stem-audio-analysis';

export class AudioAnalyzer {
  private context: AudioContext;
  private analyzer: MeydaAnalyzer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private features: Set<string>;
  private bufferSize: number = 512;
  private lastFeatures: MeydaFeatures | null = null;
  private audioProcessor: AudioProcessor | null = null;
  
  // Optimized parameter sets for different quality levels
  private optimizedParams = {
    high: {
      bufferSize: 512,
      features: ['rms', 'spectralCentroid', 'spectralRolloff', 'loudness', 'perceptualSpread', 'spectralFlux', 'mfcc', 'energy'],
      frameRate: 60
    },
    medium: {
      bufferSize: 1024,
      features: ['rms', 'spectralCentroid', 'loudness', 'spectralFlux'],
      frameRate: 30
    },
    low: {
      bufferSize: 2048,
      features: ['rms', 'spectralCentroid', 'loudness'],
      frameRate: 15
    }
  };

  constructor(audioContext: AudioContext, quality: 'low' | 'medium' | 'high' = 'high') {
    this.context = audioContext;
    
    // Use optimized parameters based on quality setting
    const params = this.optimizedParams[quality];
    this.bufferSize = params.bufferSize;
    this.features = new Set(params.features);
    
    // Initialize audio processor for multi-stem support
    this.audioProcessor = new AudioProcessor(audioContext, {
      bufferSize: this.bufferSize,
      deviceOptimization: 'auto'
    });
    
    console.log(`🎵 AudioAnalyzer initialized with ${quality} quality (buffer: ${this.bufferSize}, features: ${this.features.size})`);
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

  // Enhanced methods for Story 5.2
  async analyzeMultipleStems(stems: Record<string, ArrayBuffer>): Promise<Record<string, StemAnalysis>> {
    if (!this.audioProcessor) {
      throw new Error('AudioProcessor not initialized');
    }

    const results: Record<string, StemAnalysis> = {};
    
    // Setup processing for all stems
    await this.audioProcessor.setupProcessing(stems);
    
    // Set up callback to collect results
    this.audioProcessor.setStemAnalysisCallback((stemType, analysis) => {
      results[stemType] = analysis;
    });
    
    // Start analysis
    this.audioProcessor.startAnalysis();
    
    // Wait for initial analysis results (simplified for demo)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return results;
  }

  getPerformanceMetrics() {
    return this.audioProcessor?.getPerformanceMetrics() || {
      fps: 0,
      analysisLatency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      frameDrops: 0
    };
  }

  // Adaptive quality adjustment based on performance
  adjustQualityForPerformance(): void {
    const metrics = this.getPerformanceMetrics();
    
    if (metrics.fps < 25 || metrics.analysisLatency > 40) {
      // Performance too low, reduce quality
      this.reduceAnalysisQuality();
      console.log('🔧 Reducing analysis quality for better performance');
    } else if (metrics.fps > 55 && metrics.analysisLatency < 15) {
      // Performance good, can increase quality
      this.increaseAnalysisQuality();
      console.log('🔧 Increasing analysis quality');
    }
  }

  private reduceAnalysisQuality(): void {
    // Reduce feature set
    this.features = new Set(['rms', 'spectralCentroid', 'loudness']);
    // Increase buffer size for efficiency
    this.bufferSize = Math.min(this.bufferSize * 2, 2048);
  }

  private increaseAnalysisQuality(): void {
    // Expand feature set
    this.features = new Set([
      'rms', 'spectralCentroid', 'spectralRolloff', 
      'loudness', 'perceptualSpread', 'spectralFlux'
    ]);
    // Decrease buffer size for lower latency
    this.bufferSize = Math.max(this.bufferSize / 2, 256);
  }

  // Visualization-optimized feature extraction
  getVisualizationFeatures(): Record<string, number> {
    if (!this.lastFeatures) return {};

    const features = this.lastFeatures;
    
    return {
      // Core visualization parameters
      energy: features.rms || 0,
      brightness: (features.spectralCentroid || 0) / 22050, // Normalized
      warmth: this.calculateWarmth(features),
      dynamics: features.spectralFlux || 0,
      
      // Enhanced parameters for visual effects
      clarity: this.calculateClarity(features),
      complexity: this.calculateComplexity(features),
      movement: this.calculateMovement(features)
    };
  }

  private calculateWarmth(features: MeydaFeatures): number {
    // Lower frequencies = warmer sound
    const centroid = features.spectralCentroid || 0;
    return Math.max(0, 1 - (centroid / 11025)); // Inverse of normalized centroid
  }

  private calculateClarity(features: MeydaFeatures): number {
    // High clarity = well-defined spectral characteristics
    const rolloff = features.spectralRolloff || 0;
    const spread = features.perceptualSpread || 1;
    return Math.min(1, rolloff / (spread * 1000));
  }

  private calculateComplexity(features: MeydaFeatures): number {
    // Spectral spread indicates harmonic complexity
    return Math.min(1, (features.perceptualSpread || 0) / 1000);
  }

  private calculateMovement(features: MeydaFeatures): number {
    // Spectral flux indicates how much the spectrum is changing
    return Math.min(1, (features.spectralFlux || 0) * 10);
  }

  public dispose() {
    this.stop();
    
    if (this.audioProcessor) {
      this.audioProcessor.dispose();
      this.audioProcessor = null;
    }
    
    if (this.context.state !== 'closed') {
      this.context.close();
    }
  }
} 