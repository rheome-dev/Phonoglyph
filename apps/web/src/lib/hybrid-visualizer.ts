import { AudioVisualizationManager, VisualizationConfig } from './visualization-manager';
import { AudioToMidiAdapter, AudioFeatures, VisualizationParameters } from './audio-to-midi-adapter';
import { VisualizationBridgeImpl } from './audio-to-midi-adapter';
import { MIDIData, VisualizationSettings } from '@/types/midi';
import { LiveMIDIData, AudioAnalysisData } from '@/types/visualizer';
import { StemType } from '@/types/stem-visualization';
import { VisualizerManager } from './visualizer/core/VisualizerManager';

export type DataSourceMode = 'midi' | 'audio' | 'hybrid';

export interface HybridVisualizationConfig extends VisualizationConfig {
  dataSourceMode: DataSourceMode;
  hybridBlendWeight: number; // 0 = full MIDI, 1 = full audio, 0.5 = equal blend
  enableCrossfade: boolean;
  crossfadeSpeed: number;
  midiWeight: number;
  audioWeight: number;
}

export class HybridVisualizer {
  private audioManager: AudioVisualizationManager;
  private audioAdapter: AudioToMidiAdapter;
  private bridge: VisualizationBridgeImpl;
  private visualizerManager: VisualizerManager | null = null;
  
  private config: HybridVisualizationConfig;
  
  // State tracking
  private lastMidiData: MIDIData | null = null;
  private lastAudioFeatures: Record<StemType, AudioFeatures> | null = null;
  private currentMode: DataSourceMode;
  private targetBlendWeight: number = 0.5;
  private currentBlendWeight: number = 0.5;
  
  // Performance tracking
  private lastUpdateTime: number = 0;
  private updateCount: number = 0;
  private frameDropCount: number = 0;

  constructor(config?: Partial<HybridVisualizationConfig>) {
    this.config = {
      // Inherit from VisualizationConfig defaults
      preset: { id: 'default', name: 'Default', description: 'Default preset', mappings: {}, defaultSettings: {} } as any,
      stemWeights: { drums: 1.0, bass: 1.0, vocals: 1.0, other: 0.8 },
      globalSettings: {
        colorScheme: 'mixed',
        pixelsPerSecond: 50,
        showTrackLabels: true,
        showVelocity: true,
        minKey: 21,
        maxKey: 108
      },
      smoothingFactor: 0.2,
      responsiveness: 0.8,
      
      // Hybrid-specific defaults
      dataSourceMode: 'hybrid',
      hybridBlendWeight: 0.5,
      enableCrossfade: true,
      crossfadeSpeed: 0.05,
      midiWeight: 1.0,
      audioWeight: 1.0,
      ...config
    };

    this.currentMode = this.config.dataSourceMode;
    this.currentBlendWeight = this.config.hybridBlendWeight;
    this.targetBlendWeight = this.config.hybridBlendWeight;

    this.audioManager = new AudioVisualizationManager(this.config);
    this.audioAdapter = new AudioToMidiAdapter();
    this.bridge = new VisualizationBridgeImpl();
  }

  public setVisualizerManager(visualizer: VisualizerManager): void {
    this.visualizerManager = visualizer;
    this.audioManager.setVisualizerManager(visualizer);
  }

  public updateDataSourceMode(mode: DataSourceMode): void {
    this.config.dataSourceMode = mode;
    this.currentMode = mode;
    
    // Adjust target blend weight based on mode
    switch (mode) {
      case 'midi':
        this.targetBlendWeight = 0.0;
        break;
      case 'audio':
        this.targetBlendWeight = 1.0;
        break;
      case 'hybrid':
        this.targetBlendWeight = this.config.hybridBlendWeight;
        break;
    }
  }

  public updateHybridBlendWeight(weight: number): void {
    this.config.hybridBlendWeight = Math.max(0, Math.min(1, weight));
    if (this.currentMode === 'hybrid') {
      this.targetBlendWeight = this.config.hybridBlendWeight;
    }
  }

  public updateInputData(params: {
    midiData?: MIDIData;
    audioFeatures?: Record<StemType, AudioFeatures>;
    currentTime: number;
  }): VisualizationParameters {
    const { midiData, audioFeatures, currentTime } = params;
    
    // Performance monitoring
    const now = performance.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    
    if (timeSinceLastUpdate < 16) { // Target 60fps, skip if too fast
      this.frameDropCount++;
      return this.getLastVisualizationParameters();
    }
    
    this.lastUpdateTime = now;
    this.updateCount++;

    // Store latest data
    if (midiData) this.lastMidiData = midiData;
    if (audioFeatures) this.lastAudioFeatures = audioFeatures;

    // Determine what data sources are available
    const hasMidi = this.lastMidiData !== null;
    const hasAudio = this.lastAudioFeatures !== null;

    if (!hasMidi && !hasAudio) {
      // No data available, return default parameters
      return this.getDefaultParameters();
    }

    // Update crossfade weight if enabled
    if (this.config.enableCrossfade) {
      this.updateCrossfadeWeight();
    } else {
      this.currentBlendWeight = this.targetBlendWeight;
    }

    // Generate parameters based on available data and current mode
    let finalParameters: VisualizationParameters;

    switch (this.currentMode) {
      case 'midi':
        finalParameters = this.processMidiOnly(currentTime);
        break;
      case 'audio':
        finalParameters = this.processAudioOnly(currentTime);
        break;
      case 'hybrid':
        finalParameters = this.processHybridMode(currentTime);
        break;
    }

    // Apply parameters to visualizer
    if (this.visualizerManager) {
      this.audioManager.applyParametersToVisualizer(finalParameters);
    }

    return finalParameters;
  }

  private processMidiOnly(currentTime: number): VisualizationParameters {
    if (!this.lastMidiData) {
      return this.getDefaultParameters();
    }

    // Convert MIDI to compatible format and process through audio manager
    const audioFeatures = this.convertMidiToAudioFeatures(this.lastMidiData, currentTime);
    return this.audioManager.processAudioFeatures(audioFeatures, currentTime);
  }

  private processAudioOnly(currentTime: number): VisualizationParameters {
    if (!this.lastAudioFeatures) {
      return this.getDefaultParameters();
    }

    return this.audioManager.processAudioFeatures(this.lastAudioFeatures, currentTime);
  }

  private processHybridMode(currentTime: number): VisualizationParameters {
    const hasMidi = this.lastMidiData !== null;
    const hasAudio = this.lastAudioFeatures !== null;

    if (!hasMidi && !hasAudio) {
      return this.getDefaultParameters();
    }

    let midiParams: VisualizationParameters | null = null;
    let audioParams: VisualizationParameters | null = null;

    // Generate MIDI-based parameters
    if (hasMidi) {
      const audioFeaturesFromMidi = this.convertMidiToAudioFeatures(this.lastMidiData!, currentTime);
      midiParams = this.audioManager.processAudioFeatures(audioFeaturesFromMidi, currentTime);
    }

    // Generate audio-based parameters
    if (hasAudio) {
      audioParams = this.audioManager.processAudioFeatures(this.lastAudioFeatures!, currentTime);
    }

    // Blend parameters based on weights and availability
    if (midiParams && audioParams) {
      // Both sources available - blend them
      const midiWeight = (1 - this.currentBlendWeight) * this.config.midiWeight;
      const audioWeight = this.currentBlendWeight * this.config.audioWeight;
      
      return this.audioAdapter.visualizationAdapter.blendStemEffects(
        [midiParams, audioParams],
        [midiWeight, audioWeight]
      );
    } else if (midiParams) {
      // Only MIDI available
      return midiParams;
    } else if (audioParams) {
      // Only audio available
      return audioParams;
    } else {
      // Fallback
      return this.getDefaultParameters();
    }
  }

  private convertMidiToAudioFeatures(midiData: MIDIData, currentTime: number): Record<StemType, AudioFeatures> {
    // Simple conversion from MIDI data to audio features
    // This is a simplified implementation - in practice, this would be more sophisticated
    
    const features: Record<StemType, AudioFeatures> = {
      drums: this.createDefaultAudioFeatures(),
      bass: this.createDefaultAudioFeatures(),
      vocals: this.createDefaultAudioFeatures(),
      other: this.createDefaultAudioFeatures()
    };

    // Analyze active notes at current time
    midiData.tracks.forEach(track => {
      const activeNotes = track.notes.filter(note => 
        currentTime >= note.start && currentTime <= note.start + note.duration
      );

      if (activeNotes.length > 0) {
        // Determine stem type based on track name or instrument
        let stemType: StemType = 'other';
        const trackName = track.name.toLowerCase();
        if (trackName.includes('drum') || trackName.includes('kick') || trackName.includes('snare')) {
          stemType = 'drums';
        } else if (trackName.includes('bass')) {
          stemType = 'bass';
        } else if (trackName.includes('vocal') || trackName.includes('voice')) {
          stemType = 'vocals';
        }

        // Convert note data to audio features
        const avgVelocity = activeNotes.reduce((sum, note) => sum + note.velocity, 0) / activeNotes.length / 127;
        const avgPitch = activeNotes.reduce((sum, note) => sum + note.pitch, 0) / activeNotes.length;
        const noteFreq = 440 * Math.pow(2, (avgPitch - 69) / 12);

        features[stemType] = {
          rms: avgVelocity,
          zcr: Math.min(activeNotes.length / 10, 1.0), // More notes = higher ZCR
          spectralCentroid: noteFreq * 2,
          beats: [{ time: currentTime, confidence: avgVelocity }],
          fundamentalFreq: noteFreq,
          spectralRolloff: noteFreq * 3,
          mfcc: [avgVelocity, avgVelocity * 0.8, avgVelocity * 0.6, avgVelocity * 0.4],
          loudness: avgVelocity,
          spectralSlope: avgVelocity * 0.5
        };
      }
    });

    return features;
  }

  private createDefaultAudioFeatures(): AudioFeatures {
    return {
      rms: 0.1,
      zcr: 0.1,
      spectralCentroid: 1000,
      beats: [],
      fundamentalFreq: 0,
      spectralRolloff: 2000,
      mfcc: [0.1, 0.05, 0.02, 0.01],
      loudness: 0.1,
      spectralSlope: 0.05
    };
  }

  private updateCrossfadeWeight(): void {
    const weightDiff = this.targetBlendWeight - this.currentBlendWeight;
    if (Math.abs(weightDiff) > 0.001) {
      this.currentBlendWeight += weightDiff * this.config.crossfadeSpeed;
    } else {
      this.currentBlendWeight = this.targetBlendWeight;
    }
  }

  private getDefaultParameters(): VisualizationParameters {
    return {
      scale: 1.0,
      rotation: 0.0,
      color: [1.0, 1.0, 1.0],
      emission: 1.0,
      position: [0, 0, 0],
      height: 1.0,
      hue: 0.0,
      brightness: 1.0,
      complexity: 0.5,
      size: 1.0,
      opacity: 1.0,
      speed: 1.0,
      count: 5000
    };
  }

  private getLastVisualizationParameters(): VisualizationParameters {
    return this.audioManager.getCurrentParameters() || this.getDefaultParameters();
  }

  // Public API methods
  public getPerformanceStats(): {
    updateCount: number;
    frameDropCount: number;
    currentBlendWeight: number;
    dataSourceMode: DataSourceMode;
    hasMidiData: boolean;
    hasAudioData: boolean;
  } {
    return {
      updateCount: this.updateCount,
      frameDropCount: this.frameDropCount,
      currentBlendWeight: this.currentBlendWeight,
      dataSourceMode: this.currentMode,
      hasMidiData: this.lastMidiData !== null,
      hasAudioData: this.lastAudioFeatures !== null
    };
  }

  public getConfig(): HybridVisualizationConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<HybridVisualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.audioManager.updateConfig(newConfig);
  }

  public reset(): void {
    this.lastMidiData = null;
    this.lastAudioFeatures = null;
    this.updateCount = 0;
    this.frameDropCount = 0;
    this.currentBlendWeight = this.config.hybridBlendWeight;
    this.targetBlendWeight = this.config.hybridBlendWeight;
    this.audioManager.reset();
  }

  public setMidiWeight(weight: number): void {
    this.config.midiWeight = Math.max(0, Math.min(2, weight));
  }

  public setAudioWeight(weight: number): void {
    this.config.audioWeight = Math.max(0, Math.min(2, weight));
  }

  public enableCrossfade(enabled: boolean): void {
    this.config.enableCrossfade = enabled;
  }

  public setCrossfadeSpeed(speed: number): void {
    this.config.crossfadeSpeed = Math.max(0.001, Math.min(1.0, speed));
  }
}