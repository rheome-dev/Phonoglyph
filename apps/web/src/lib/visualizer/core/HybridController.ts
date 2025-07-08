import { VisualizerManager } from './VisualizerManager';
import { SyncManager } from './SyncManager';
import { 
  HybridControlSource, 
  HybridParameterConfig, 
  HybridControlEvent, 
  HybridControlEventHandler,
  StemFeatureAnalysis,
  MeydaFeatureSet
} from '@/types/hybrid-control';
import { LiveMIDIData, AudioAnalysisData } from '@/types/visualizer';

export class HybridController {
  private visualizer: VisualizerManager;
  private syncManager: SyncManager;
  private controlSources: Map<string, HybridControlSource> = new Map();
  private eventHandlers: HybridControlEventHandler[] = [];
  
  // Current input data
  private currentMIDIData?: LiveMIDIData;
  private currentAudioData?: AudioAnalysisData;
  private currentStemAnalysis?: StemFeatureAnalysis[];
  
  // Control state
  private isActive = false;
  private lastUpdateTime = 0;
  private parameterCache: Map<string, any> = new Map();
  private smoothingBuffers: Map<string, number[]> = new Map();
  
  // Performance monitoring
  private controlLatency = 0;
  private updateCount = 0;
  
  constructor(visualizer: VisualizerManager) {
    this.visualizer = visualizer;
    this.syncManager = new SyncManager();
    console.log('🎛️ HybridController initialized');
  }
  
  /**
   * Start the hybrid control system
   */
  start(): void {
    this.isActive = true;
    this.lastUpdateTime = performance.now();
    console.log('▶️ HybridController started');
  }
  
  /**
   * Stop the hybrid control system
   */
  stop(): void {
    this.isActive = false;
    console.log('⏹️ HybridController stopped');
  }
  
  /**
   * Set control source configuration for a parameter
   */
  setControlSource(parameter: string, config: HybridParameterConfig): void {
    // Get or create control source for this parameter
    let source = this.controlSources.get(parameter);
    if (!source) {
      source = {
        type: config.source,
        midiWeight: config.midiWeight || 1.0,
        audioWeight: config.audioWeight || 1.0,
        parameters: {}
      };
      this.controlSources.set(parameter, source);
    }
    
    // Update parameter configuration
    source.parameters[parameter] = config;
    source.type = config.source;
    
    console.log(`🎛️ Control source set: ${parameter} -> ${config.source}`);
    
    this.emitEvent({
      type: 'parameter_change',
      parameter,
      value: config,
      source: config.source,
      timestamp: performance.now()
    });
  }
  
  /**
   * Update visualization parameters based on current input data
   */
  updateVisuals(timestamp: number): void {
    if (!this.isActive) return;
    
    const startTime = performance.now();
    
    for (const [parameter, source] of this.controlSources) {
      const config = source.parameters[parameter];
      if (!config) continue;
      
      let finalValue: any;
      
      switch (config.source) {
        case 'midi':
          finalValue = this.applyMIDIControl(parameter, config);
          break;
        case 'audio':
          finalValue = this.applyAudioControl(parameter, config);
          break;
        case 'hybrid':
          finalValue = this.applyHybridControl(parameter, config);
          break;
      }
      
      if (finalValue !== undefined) {
        this.updateVisualizerParameter(parameter, finalValue);
      }
    }
    
    // Update performance metrics
    this.controlLatency = performance.now() - startTime;
    this.updateCount++;
    this.lastUpdateTime = timestamp;
    
    // Log performance every 300 updates (roughly 10 seconds at 30fps)
    if (this.updateCount % 300 === 0) {
      console.log(`🎛️ HybridController: ${this.controlLatency.toFixed(2)}ms latency, ${this.controlSources.size} active sources`);
    }
  }
  
  /**
   * Apply MIDI-based control
   */
  private applyMIDIControl(parameter: string, config: HybridParameterConfig): any {
    if (!this.currentMIDIData || !config.midiMapping) return undefined;
    
    const mapping = config.midiMapping;
    const midiData = this.currentMIDIData;
    
    let rawValue = 0;
    
    if (mapping.controller !== undefined) {
      // CC control
      // Note: This would need to be implemented based on your MIDI data structure
      rawValue = this.getMIDIControllerValue(mapping.channel, mapping.controller) / 127;
    } else if (mapping.note !== undefined) {
      // Note velocity control
      const activeNote = midiData.activeNotes.find(note => 
        note.note === mapping.note
      );
      rawValue = activeNote ? activeNote.velocity / 127 : 0;
    }
    
    // Apply scaling and range
    return this.applyScaling(rawValue, mapping.scaling, mapping.range);
  }
  
  /**
   * Apply audio analysis-based control
   */
  private applyAudioControl(parameter: string, config: HybridParameterConfig): any {
    if (!config.audioMapping) return undefined;
    
    const mapping = config.audioMapping;
    let rawValue = 0;
    
    // Get value from audio analysis
    if (this.currentStemAnalysis && mapping.stem) {
      const stemData = this.currentStemAnalysis.find(s => s.stemType === mapping.stem);
      if (stemData) {
        rawValue = this.extractAudioFeature(stemData, mapping.feature);
      }
    } else if (this.currentAudioData) {
      // Use general audio data
      rawValue = this.extractGeneralAudioFeature(this.currentAudioData, mapping.feature);
    }
    
    // Apply smoothing if specified
    if (mapping.smoothing && mapping.smoothing > 0) {
      rawValue = this.applySmoothingToValue(parameter, rawValue, mapping.smoothing);
    }
    
    // Apply scaling and range
    return this.applyScaling(rawValue, mapping.scaling, mapping.range);
  }
  
  /**
   * Apply hybrid control (blend MIDI and audio)
   */
  private applyHybridControl(parameter: string, config: HybridParameterConfig): any {
    const midiValue = this.applyMIDIControl(parameter, config);
    const audioValue = this.applyAudioControl(parameter, config);
    
    if (midiValue === undefined && audioValue === undefined) return undefined;
    if (midiValue === undefined) return audioValue;
    if (audioValue === undefined) return midiValue;
    
    // Blend values using weights
    const midiWeight = config.midiWeight || 0.5;
    const audioWeight = config.audioWeight || 0.5;
    const totalWeight = midiWeight + audioWeight;
    
    if (totalWeight === 0) return midiValue;
    
    const normalizedMidiWeight = midiWeight / totalWeight;
    const normalizedAudioWeight = audioWeight / totalWeight;
    
    return midiValue * normalizedMidiWeight + audioValue * normalizedAudioWeight;
  }
  
  /**
   * Update MIDI data from external source
   */
  updateMIDIData(midiData: LiveMIDIData): void {
    this.currentMIDIData = midiData;
    
    // Auto-detect sync points on strong MIDI events
    if (midiData.activeNotes.length > 0) {
      const strongestNote = midiData.activeNotes.reduce((prev, current) => 
        current.velocity > prev.velocity ? current : prev
      );
      if (strongestNote.velocity > 100) { // Strong note
        this.syncManager.autoDetectSyncPoint(
          midiData.currentTime * 480, // Convert to ticks
          performance.now() / 1000,
          strongestNote.velocity / 127
        );
      }
    }
  }
  
  /**
   * Update audio data from external source
   */
  updateAudioData(audioData: AudioAnalysisData): void {
    this.currentAudioData = audioData;
  }
  
  /**
   * Update stem analysis data
   */
  updateStemAnalysis(stemAnalysis: StemFeatureAnalysis[]): void {
    this.currentStemAnalysis = stemAnalysis;
    
    // Auto-detect sync points on strong audio events
    stemAnalysis.forEach(stem => {
      if (stem.derived.intensity > 0.8) { // Strong audio event
        this.syncManager.autoDetectSyncPoint(
          0, // Would need current MIDI tick
          stem.timestamp,
          stem.derived.intensity
        );
      }
    });
  }
  
  /**
   * Get current synchronization status
   */
  getSyncStatus() {
    return this.syncManager.getSyncStatus();
  }
  
  /**
   * Manually adjust synchronization offset
   */
  adjustSyncOffset(deltaMs: number): void {
    this.syncManager.adjustOffset(deltaMs);
    this.emitEvent({
      type: 'sync_update',
      timestamp: performance.now()
    });
  }
  
  /**
   * Add event handler
   */
  addEventListener(handler: HybridControlEventHandler): void {
    this.eventHandlers.push(handler);
  }
  
  /**
   * Remove event handler
   */
  removeEventListener(handler: HybridControlEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index !== -1) {
      this.eventHandlers.splice(index, 1);
    }
  }
  
  // Private helper methods
  
  private getMIDIControllerValue(channel: number, controller: number): number {
    // This would need to be implemented based on your MIDI data structure
    // For now, return a default value
    return 64; // Neutral CC value
  }
  
  private extractAudioFeature(stemData: StemFeatureAnalysis, feature: string): number {
    if (feature in stemData.features) {
      const value = (stemData.features as any)[feature];
      return Array.isArray(value) ? value[0] || 0 : value;
    }
    if (feature in stemData.derived) {
      return (stemData.derived as any)[feature];
    }
    return 0;
  }
  
  private extractGeneralAudioFeature(audioData: AudioAnalysisData, feature: string): number {
    // Map audio analysis features to values
    switch (feature) {
      case 'rms':
        return audioData.volume;
      case 'bass':
        return audioData.bass;
      case 'mid':
        return audioData.mid;
      case 'treble':
        return audioData.treble;
      default:
        return audioData.volume;
    }
  }
  
  private applySmoothingToValue(parameter: string, value: number, smoothing: number): number {
    if (!this.smoothingBuffers.has(parameter)) {
      this.smoothingBuffers.set(parameter, []);
    }
    
    const buffer = this.smoothingBuffers.get(parameter)!;
    buffer.push(value);
    
    const bufferSize = Math.floor(smoothing * 10) + 1; // Convert smoothing to buffer size
    if (buffer.length > bufferSize) {
      buffer.shift();
    }
    
    // Return moving average
    return buffer.reduce((sum, val) => sum + val, 0) / buffer.length;
  }
  
  private applyScaling(value: number, scaling: number, range?: [number, number]): number {
    let scaled = value * scaling;
    
    if (range) {
      const [min, max] = range;
      scaled = min + (scaled * (max - min));
    }
    
    return scaled;
  }
  
  private updateVisualizerParameter(parameter: string, value: any): void {
    // Cache the value to prevent unnecessary updates
    const cached = this.parameterCache.get(parameter);
    if (cached === value) return;
    
    this.parameterCache.set(parameter, value);
    
    // Map parameter names to visualizer methods
    switch (parameter) {
      case 'globalScale':
        this.visualizer.setGlobalScale(value);
        break;
      case 'rotationSpeed':
        this.visualizer.setRotationSpeed(value);
        break;
      case 'colorIntensity':
        this.visualizer.setColorIntensity(value);
        break;
      case 'emissionIntensity':
        this.visualizer.setEmissionIntensity(value);
        break;
      case 'positionOffset':
        this.visualizer.setPositionOffset(value);
        break;
      case 'heightScale':
        this.visualizer.setHeightScale(value);
        break;
      case 'hueRotation':
        this.visualizer.setHueRotation(value);
        break;
      case 'brightness':
        this.visualizer.setBrightness(value);
        break;
      case 'complexity':
        this.visualizer.setComplexity(value);
        break;
      case 'particleSize':
        this.visualizer.setParticleSize(value);
        break;
      case 'opacity':
        this.visualizer.setOpacity(value);
        break;
      case 'animationSpeed':
        this.visualizer.setAnimationSpeed(value);
        break;
      case 'particleCount':
        this.visualizer.setParticleCount(value);
        break;
      default:
        console.warn(`⚠️ Unknown parameter: ${parameter}`);
    }
  }
  
  private emitEvent(event: HybridControlEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('❌ Error in hybrid control event handler:', error);
      }
    });
  }
  
  /**
   * Get control performance statistics
   */
  getPerformanceStats() {
    return {
      controlLatency: this.controlLatency,
      updateCount: this.updateCount,
      activeSources: this.controlSources.size,
      syncStats: this.syncManager.getTimingStats()
    };
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    this.controlSources.clear();
    this.eventHandlers = [];
    this.parameterCache.clear();
    this.smoothingBuffers.clear();
    console.log('🧹 HybridController disposed');
  }
}