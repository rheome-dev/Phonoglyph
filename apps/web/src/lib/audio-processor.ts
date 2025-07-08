// AudioProcessor for Story 5.2: Real-time Audio Analysis Integration
import Meyda, { MeydaAnalyzer, MeydaFeatures } from 'meyda';
import { 
  StemAnalysis, 
  AudioFeature, 
  StemProcessorConfig, 
  PerformanceMetrics,
  VisualizationFeature,
  AnalysisConfig 
} from '@/types/stem-audio-analysis';

export class AudioProcessor {
  private context: AudioContext;
  private sources: Map<string, AudioBufferSourceNode> = new Map();
  private analyzers: Map<string, MeydaAnalyzer> = new Map();
  private config: StemProcessorConfig;
  private analysisConfig: AnalysisConfig;
  private performanceMetrics: PerformanceMetrics;
  private lastAnalysisTime = 0;
  
  // Visualization-optimized feature sets for different stem types
  private stemFeatureMap: Record<string, VisualizationFeature[]> = {
    drums: ['rms', 'spectralCentroid', 'spectralFlux', 'tempo', 'rhythmPattern'],
    bass: ['rms', 'spectralCentroid', 'loudness', 'chromaVector'],
    vocals: ['rms', 'spectralCentroid', 'mfcc', 'loudness', 'perceptualSpread'],
    piano: ['rms', 'spectralCentroid', 'chromaVector', 'loudness'],
    other: ['rms', 'spectralCentroid', 'spectralRolloff', 'loudness']
  };

  constructor(audioContext: AudioContext, config?: Partial<StemProcessorConfig>) {
    this.context = audioContext;
    this.config = {
      bufferSize: 512, // Optimized for visualization latency
      analysisResolution: 1, // Full resolution by default
      deviceOptimization: 'auto',
      maxConcurrentStems: 5,
      ...config
    };

    this.analysisConfig = this.createOptimizedAnalysisConfig();
    this.performanceMetrics = this.initializeMetrics();

    // Auto-detect device capabilities
    if (this.config.deviceOptimization === 'auto') {
      this.config.deviceOptimization = this.detectDeviceCapabilities();
    }

    this.optimizeForDevice();
  }

  private createOptimizedAnalysisConfig(): AnalysisConfig {
    const baseFeatures: VisualizationFeature[] = [
      'rms', 'spectralCentroid', 'spectralRolloff', 'loudness', 'spectralFlux'
    ];

    return {
      features: new Set(baseFeatures),
      bufferSize: this.config.bufferSize,
      frameRate: 60, // Target 60fps
      quality: this.config.deviceOptimization === 'mobile' ? 'medium' : 'high',
      enableCrossStemAnalysis: true
    };
  }

  private detectDeviceCapabilities(): 'mobile' | 'desktop' {
    // Simple device detection based on available processing power
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasLimitedMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4;
    const hasSlowConnection = (navigator as any).connection && (navigator as any).connection.effectiveType !== '4g';
    
    return (isMobile || hasLimitedMemory || hasSlowConnection) ? 'mobile' : 'desktop';
  }

  private optimizeForDevice(): void {
    if (this.config.deviceOptimization === 'mobile') {
      // Mobile optimizations
      this.config.bufferSize = 1024; // Larger buffer for efficiency
      this.config.maxConcurrentStems = 3; // Limit concurrent processing
      this.analysisConfig.frameRate = 30; // Reduce frame rate
      this.analysisConfig.quality = 'medium';
      
      // Reduce feature set for mobile
      this.analysisConfig.features = new Set(['rms', 'spectralCentroid', 'loudness']);
    } else {
      // Desktop optimizations
      this.config.bufferSize = 512; // Smaller buffer for lower latency
      this.config.maxConcurrentStems = 5;
      this.analysisConfig.frameRate = 60;
      this.analysisConfig.quality = 'high';
      
      // Full feature set for desktop
      this.analysisConfig.features = new Set([
        'rms', 'spectralCentroid', 'spectralRolloff', 'loudness', 
        'perceptualSpread', 'spectralFlux', 'mfcc', 'chromaVector'
      ]);
    }
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      analysisLatency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      frameDrops: 0
    };
  }

  async setupProcessing(stems: Record<string, ArrayBuffer>): Promise<void> {
    const stemEntries = Object.entries(stems);
    
    // Limit concurrent stems based on device capabilities
    const maxStems = Math.min(stemEntries.length, this.config.maxConcurrentStems);
    
    for (let i = 0; i < maxStems; i++) {
      const [stemType, buffer] = stemEntries[i];
      await this.setupStemAnalysis(stemType, buffer);
    }

    console.log(`🎵 Audio processing setup complete for ${maxStems} stems`);
  }

  private async setupStemAnalysis(stemType: string, buffer: ArrayBuffer): Promise<void> {
    try {
      // Decode audio buffer
      const audioBuffer = await this.context.decodeAudioData(buffer.slice(0));
      
      // Create audio source
      const source = this.context.createBufferSource();
      source.buffer = audioBuffer;
      
      // Get optimized features for this stem type
      const stemFeatures = this.getStemFeatures(stemType);
      
      // Create analyzer with visualization-optimized settings
      const analyzer = Meyda.createMeydaAnalyzer({
        audioContext: this.context,
        source: source,
        bufferSize: this.config.bufferSize,
        featureExtractors: stemFeatures,
        callback: (features) => this.handleStemAnalysis(stemType, features)
      });

      this.sources.set(stemType, source);
      this.analyzers.set(stemType, analyzer);

      // Connect to destination for playback
      source.connect(this.context.destination);
      
    } catch (error) {
      console.error(`❌ Failed to setup analysis for ${stemType}:`, error);
    }
  }

  private getStemFeatures(stemType: string): string[] {
    const stemSpecificFeatures = this.stemFeatureMap[stemType] || this.stemFeatureMap.other;
    const enabledFeatures = stemSpecificFeatures.filter(feature => 
      this.analysisConfig.features.has(feature)
    );

    // Convert to Meyda feature names
    return enabledFeatures.map(feature => {
      switch (feature) {
        case 'rhythmPattern': return 'spectralFlux'; // Use spectralFlux for rhythm
        case 'chromaVector': return 'mfcc'; // Use MFCC for harmonic content
        default: return feature;
      }
    });
  }

  private handleStemAnalysis = (stemType: string, features: MeydaFeatures): void => {
    const startTime = performance.now();

    // Convert Meyda features to our AudioFeature format
    const audioFeatures = this.convertToAudioFeatures(features);
    
    // Create stem analysis data
    const stemAnalysis: StemAnalysis = {
      stemId: `${stemType}-${Date.now()}`,
      stemType: stemType as StemAnalysis['stemType'],
      features: {
        rhythm: audioFeatures.filter(f => f.type === 'rhythm'),
        pitch: audioFeatures.filter(f => f.type === 'pitch'),
        intensity: audioFeatures.filter(f => f.type === 'intensity'),
        timbre: audioFeatures.filter(f => f.type === 'timbre')
      },
      metadata: {
        bpm: this.estimateBPM(features),
        key: this.estimateKey(features),
        energy: features.rms || 0,
        clarity: this.calculateClarity(features)
      }
    };

    // Update performance metrics
    const analysisTime = performance.now() - startTime;
    this.updatePerformanceMetrics(analysisTime);

    // Emit analysis event
    this.onStemAnalysis(stemType, stemAnalysis);
  };

  private convertToAudioFeatures(features: MeydaFeatures): AudioFeature[] {
    const timestamp = performance.now();
    const audioFeatures: AudioFeature[] = [];

    // RMS -> Intensity
    if (features.rms !== undefined) {
      audioFeatures.push({
        type: 'intensity',
        value: features.rms,
        confidence: 0.9,
        timestamp
      });
    }

    // Spectral Centroid -> Pitch
    if (features.spectralCentroid !== undefined) {
      audioFeatures.push({
        type: 'pitch',
        value: features.spectralCentroid / 22050, // Normalize to 0-1
        confidence: 0.8,
        timestamp
      });
    }

    // Spectral Flux -> Rhythm
    if (features.spectralFlux !== undefined) {
      audioFeatures.push({
        type: 'rhythm',
        value: features.spectralFlux,
        confidence: 0.7,
        timestamp
      });
    }

    // Perceptual Spread -> Timbre
    if (features.perceptualSpread !== undefined) {
      audioFeatures.push({
        type: 'timbre',
        value: features.perceptualSpread,
        confidence: 0.6,
        timestamp
      });
    }

    return audioFeatures;
  }

  private estimateBPM(features: MeydaFeatures): number {
    // Simple BPM estimation based on spectral flux
    // In production, this would use more sophisticated tempo detection
    const flux = features.spectralFlux || 0;
    return Math.max(60, Math.min(180, flux * 120 + 120)); // Range 60-180 BPM
  }

  private estimateKey(features: MeydaFeatures): string {
    // Simple key estimation based on spectral centroid
    // In production, this would use chromaVector analysis
    const centroid = features.spectralCentroid || 0;
    const keyIndex = Math.floor((centroid / 22050) * 12);
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return keys[keyIndex % 12];
  }

  private calculateClarity(features: MeydaFeatures): number {
    // Calculate separation clarity based on spectral characteristics
    const centroid = features.spectralCentroid || 0;
    const spread = features.perceptualSpread || 0;
    const rolloff = features.spectralRolloff || 0;
    
    // Higher clarity when spectral characteristics are well-defined
    return Math.min(1.0, (centroid + rolloff) / (spread + 1));
  }

  private updatePerformanceMetrics(analysisTime: number): void {
    this.performanceMetrics.analysisLatency = analysisTime;
    
    // Update FPS based on analysis time
    const targetFrameTime = 1000 / this.analysisConfig.frameRate;
    this.performanceMetrics.fps = Math.min(this.analysisConfig.frameRate, 1000 / analysisTime);
    
    // Track frame drops
    if (analysisTime > targetFrameTime) {
      this.performanceMetrics.frameDrops++;
    }

    // Estimate memory usage (simplified)
    this.performanceMetrics.memoryUsage = this.sources.size * 10; // MB estimate
  }

  // Public methods
  getFeatures(): Record<string, AudioFeature[]> {
    // Collect current features from all stems
    const allFeatures: Record<string, AudioFeature[]> = {};
    
    // This would be populated by the analysis callbacks
    // For now, return empty structure
    return allFeatures;
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  startAnalysis(): void {
    this.analyzers.forEach((analyzer, stemType) => {
      try {
        analyzer.start();
        console.log(`🎵 Started analysis for ${stemType}`);
      } catch (error) {
        console.error(`❌ Failed to start analysis for ${stemType}:`, error);
      }
    });

    // Start sources
    this.sources.forEach((source, stemType) => {
      try {
        source.start(0);
      } catch (error) {
        console.error(`❌ Failed to start source for ${stemType}:`, error);
      }
    });
  }

  stopAnalysis(): void {
    this.analyzers.forEach((analyzer) => analyzer.stop());
    this.sources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (error) {
        // Source may already be stopped
      }
    });
  }

  dispose(): void {
    this.stopAnalysis();
    this.sources.clear();
    this.analyzers.clear();
  }

  // Event callbacks
  private onStemAnalysis: (stemType: string, analysis: StemAnalysis) => void = () => {};
  
  public setStemAnalysisCallback(callback: (stemType: string, analysis: StemAnalysis) => void): void {
    this.onStemAnalysis = callback;
  }
}