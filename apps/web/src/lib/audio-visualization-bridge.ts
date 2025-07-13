// Audio-Visualization Bridge for Story 5.3: Stem-based Visualization Control
// Connects audio analysis (Story 5.2) with stem visualization system

import { AudioProcessor } from '@/lib/audio-processor';
import { StemVisualizationController } from '@/lib/stem-visualization-controller';
import { presetManager } from '@/lib/preset-manager';
import { VisualizationPerformanceMonitor } from '@/lib/visualization-performance-monitor';
import { VisualizationFeaturePipeline } from '@/lib/visualization-feature-pipeline';

import {
  StemAnalysis,
  AudioFeature,
  StemFeatureSet,
  PerformanceMetrics
} from '@/types/stem-audio-analysis';
import {
  VisualizationPreset,
  StemVisualizationMapping,
  VisualizationEvent,
  VisualizationConfig
} from '@/types/stem-visualization';

// Bridge configuration options
export interface AudioVisualizationBridgeConfig {
  // Data flow settings
  updateInterval: number; // ms - how often to push updates to visualization
  bufferSize: number; // Number of analysis frames to buffer
  smoothingFactor: number; // 0-1 smoothing between updates
  
  // Feature processing
  enableFeatureSmoothing: boolean;
  enableCrossStemCorrelation: boolean;
  enablePredictiveFeatures: boolean;
  
  // Performance settings
  maxStemsProcessed: number;
  enableAdaptiveQuality: boolean;
  enablePerformanceOptimization: boolean;
  
  // Debug settings
  enableDebugLogging: boolean;
  logFeatureUpdates: boolean;
  logPerformanceMetrics: boolean;
}

// Analysis state tracking
export interface AnalysisState {
  isActive: boolean;
  currentPreset: VisualizationPreset | null;
  activeStemTypes: Set<string>;
  lastUpdateTime: number;
  analysisLatency: number;
  featureUpdateCount: number;
  correlationMatrix: Map<string, Map<string, number>>;
}

// Feature correlation data
export interface StemCorrelation {
  stemA: string;
  stemB: string;
  correlation: number;
  confidence: number;
  lag: number; // Time lag in ms
}

// Synchronized visualization update package
export interface VisualizationUpdate {
  timestamp: number;
  stemUpdates: Map<string, AudioFeature[]>;
  globalFeatures: AudioFeature[];
  correlations: StemCorrelation[];
  performanceHint: 'maintain' | 'reduce' | 'increase';
}

export class AudioVisualizationBridge {
  private config: AudioVisualizationBridgeConfig;
  private analysisState: AnalysisState;
  
  // Component instances
  private audioProcessor: AudioProcessor;
  private visualizationController: StemVisualizationController;
  private performanceMonitor: VisualizationPerformanceMonitor;
  private featurePipeline: VisualizationFeaturePipeline;
  
  // Data buffers and processing
  private featureBuffer: Map<string, AudioFeature[]> = new Map();
  private correlationHistory: StemCorrelation[] = [];
  private updateQueue: VisualizationUpdate[] = [];
  
  // Timing and synchronization
  private updateTimer: number | null = null;
  private lastAnalysisTime: number = 0;
  private syncOffset: number = 0;
  
  // Event handling
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();
  
  constructor(
    audioProcessor: AudioProcessor,
    visualizationController: StemVisualizationController,
    performanceMonitor: VisualizationPerformanceMonitor,
    config: Partial<AudioVisualizationBridgeConfig> = {}
  ) {
    this.audioProcessor = audioProcessor;
    this.visualizationController = visualizationController;
    this.performanceMonitor = performanceMonitor;
    
    this.config = {
      updateInterval: 16, // ~60fps
      bufferSize: 10,
      smoothingFactor: 0.15,
      enableFeatureSmoothing: true,
      enableCrossStemCorrelation: true,
      enablePredictiveFeatures: false,
      maxStemsProcessed: 5,
      enableAdaptiveQuality: true,
      enablePerformanceOptimization: true,
      enableDebugLogging: false,
      logFeatureUpdates: false,
      logPerformanceMetrics: false,
      ...config
    };

    this.analysisState = {
      isActive: false,
      currentPreset: null,
      activeStemTypes: new Set(),
      lastUpdateTime: 0,
      analysisLatency: 0,
      featureUpdateCount: 0,
      correlationMatrix: new Map()
    };

    this.featurePipeline = new VisualizationFeaturePipeline({
      enableSmoothing: this.config.enableFeatureSmoothing,
      enableCorrelation: this.config.enableCrossStemCorrelation,
      bufferSize: this.config.bufferSize
    });

    this.setupAudioProcessor();
    this.setupVisualizationController();
    this.setupPerformanceMonitor();
    
    console.log('🔌 AudioVisualizationBridge initialized');
  }

  // Setup audio processor integration
  private setupAudioProcessor(): void {
    // Listen for stem analysis updates
    this.audioProcessor.on('stemAnalysis', (analysis: StemAnalysis) => {
      this.handleStemAnalysis(analysis);
    });

    // Listen for performance metrics from audio processing
    this.audioProcessor.on('performance', (metrics: PerformanceMetrics) => {
      this.handleAudioPerformanceMetrics(metrics);
    });

    // Listen for quality changes
    this.audioProcessor.on('qualityChange', (quality: string) => {
      this.handleAudioQualityChange(quality);
    });
  }

  // Setup visualization controller integration
  private setupVisualizationController(): void {
    // Listen for visualization events
    this.visualizationController.addEventListener('parameter_change', (event: VisualizationEvent) => {
      this.handleVisualizationEvent(event);
    });

    // Listen for preset changes
    this.visualizationController.addEventListener('preset_change', (event: VisualizationEvent) => {
      this.handlePresetChange(event);
    });
  }

  // Setup performance monitor integration
  private setupPerformanceMonitor(): void {
    this.performanceMonitor.on('metrics', (metrics: any) => {
      this.handlePerformanceMetrics(metrics);
    });

    this.performanceMonitor.on('alert', (alert: any) => {
      this.handlePerformanceAlert(alert);
    });

    this.performanceMonitor.on('recommendation', (recommendation: any) => {
      this.handlePerformanceRecommendation(recommendation);
    });
  }

  // Handle stem analysis from audio processor
  private handleStemAnalysis(analysis: StemAnalysis): void {
    const analysisStart = performance.now();
    
    try {
      // Extract and process features for this stem
      const stemFeatures = this.extractVisualizationFeatures(analysis);
      
      // Add to buffer
      this.addToFeatureBuffer(analysis.stemType, stemFeatures);
      
      // Update analysis state
      this.analysisState.activeStemTypes.add(analysis.stemType);
      this.analysisState.featureUpdateCount++;
      
      // Process correlations if enabled
      if (this.config.enableCrossStemCorrelation) {
        this.updateStemCorrelations(analysis.stemType, stemFeatures);
      }
      
      // Create visualization update if enough data is available
      if (this.shouldTriggerVisualizationUpdate()) {
        this.createVisualizationUpdate();
      }
      
      // Update analysis latency
      this.analysisState.analysisLatency = performance.now() - analysisStart;
      
      if (this.config.logFeatureUpdates) {
        console.log(`🎵 Processed ${analysis.stemType} features:`, stemFeatures.length);
      }
      
    } catch (error) {
      console.error('Error handling stem analysis:', error);
    }
  }

  // Extract visualization-relevant features from stem analysis
  private extractVisualizationFeatures(analysis: StemAnalysis): AudioFeature[] {
    const features: AudioFeature[] = [];
    
    // Process each feature type
    Object.entries(analysis.features).forEach(([featureType, featureList]) => {
      featureList.forEach(feature => {
        // Transform to visualization space
        const visualFeature = this.transformFeatureForVisualization(feature, analysis.stemType);
        if (visualFeature) {
          features.push(visualFeature);
        }
      });
    });
    
    return features;
  }

  // Transform audio feature to visualization space
  private transformFeatureForVisualization(
    audioFeature: AudioFeature, 
    stemType: string
  ): AudioFeature | null {
    // Apply stem-specific transformations based on current preset
    if (!this.analysisState.currentPreset) return audioFeature;
    
    const stemMapping = this.analysisState.currentPreset.mappings[stemType];
    if (!stemMapping || !stemMapping.enabled || stemMapping.mute) return null;
    
    // Apply global multiplier and other transformations
    const transformedFeature: AudioFeature = {
      ...audioFeature,
      value: audioFeature.value * stemMapping.globalMultiplier,
      confidence: audioFeature.confidence * (stemMapping.solo ? 1.2 : 1.0)
    };
    
    return transformedFeature;
  }

  // Add features to the buffer for the stem
  private addToFeatureBuffer(stemType: string, features: AudioFeature[]): void {
    if (!this.featureBuffer.has(stemType)) {
      this.featureBuffer.set(stemType, []);
    }
    
    const buffer = this.featureBuffer.get(stemType)!;
    buffer.push(...features);
    
    // Maintain buffer size
    while (buffer.length > this.config.bufferSize * 10) { // 10 features per buffer slot
      buffer.shift();
    }
  }

  // Update stem correlations
  private updateStemCorrelations(currentStem: string, features: AudioFeature[]): void {
    // Calculate correlations with other active stems
    for (const otherStem of this.analysisState.activeStemTypes) {
      if (otherStem === currentStem) continue;
      
      const otherFeatures = this.featureBuffer.get(otherStem);
      if (!otherFeatures || otherFeatures.length === 0) continue;
      
      const correlation = this.calculateStemCorrelation(features, otherFeatures);
      if (correlation) {
        this.correlationHistory.push(correlation);
        
        // Update correlation matrix
        if (!this.analysisState.correlationMatrix.has(currentStem)) {
          this.analysisState.correlationMatrix.set(currentStem, new Map());
        }
        this.analysisState.correlationMatrix.get(currentStem)!.set(otherStem, correlation.correlation);
      }
    }
    
    // Limit correlation history
    if (this.correlationHistory.length > 100) {
      this.correlationHistory = this.correlationHistory.slice(-50);
    }
  }

  // Calculate correlation between two feature sets
  private calculateStemCorrelation(
    featuresA: AudioFeature[], 
    featuresB: AudioFeature[]
  ): StemCorrelation | null {
    if (featuresA.length === 0 || featuresB.length === 0) return null;
    
    // Simple correlation calculation
    const valuesA = featuresA.map(f => f.value);
    const valuesB = featuresB.slice(-valuesA.length).map(f => f.value);
    
    if (valuesA.length !== valuesB.length) return null;
    
    const correlation = this.calculatePearsonCorrelation(valuesA, valuesB);
    
    return {
      stemA: 'current',
      stemB: 'other',
      correlation,
      confidence: 0.8, // Simplified
      lag: 0 // Simplified
    };
  }

  // Calculate Pearson correlation coefficient
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
    const sumX2 = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);
    const sumY2 = y.map(yi => yi * yi).reduce((a, b) => a + b, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Check if we should trigger a visualization update
  private shouldTriggerVisualizationUpdate(): boolean {
    const now = performance.now();
    const timeSinceLastUpdate = now - this.analysisState.lastUpdateTime;
    
    // Time-based trigger
    if (timeSinceLastUpdate >= this.config.updateInterval) {
      return true;
    }
    
    // Data availability trigger
    const totalFeatures = Array.from(this.featureBuffer.values())
      .reduce((total, buffer) => total + buffer.length, 0);
    
    return totalFeatures >= this.config.maxStemsProcessed;
  }

  // Create and queue visualization update
  private createVisualizationUpdate(): void {
    const now = performance.now();
    
    // Collect current features from all stems
    const stemUpdates = new Map<string, AudioFeature[]>();
    const globalFeatures: AudioFeature[] = [];
    
    // Process each active stem
    for (const stemType of this.analysisState.activeStemTypes) {
      const buffer = this.featureBuffer.get(stemType);
      if (!buffer || buffer.length === 0) continue;
      
      // Get recent features
      const recentFeatures = buffer.slice(-5); // Last 5 features
      
      // Apply feature pipeline processing
      const processedFeatures = this.featurePipeline.processFeatures(stemType, recentFeatures);
      
      stemUpdates.set(stemType, processedFeatures);
      globalFeatures.push(...processedFeatures);
    }
    
    // Get recent correlations
    const recentCorrelations = this.correlationHistory.slice(-10);
    
    // Determine performance hint
    const performanceHint = this.determinePerformanceHint();
    
    const update: VisualizationUpdate = {
      timestamp: now,
      stemUpdates,
      globalFeatures,
      correlations: recentCorrelations,
      performanceHint
    };
    
    // Queue the update
    this.updateQueue.push(update);
    
    // Process update immediately if possible
    if (this.updateQueue.length === 1) {
      this.processVisualizationUpdate(update);
    }
    
    this.analysisState.lastUpdateTime = now;
  }

  // Determine performance optimization hint
  private determinePerformanceHint(): 'maintain' | 'reduce' | 'increase' {
    const currentMetrics = this.performanceMonitor.getCurrentMetrics();
    if (!currentMetrics) return 'maintain';
    
    // Check frame rate
    if (currentMetrics.frameRate < 30) {
      return 'reduce';
    } else if (currentMetrics.frameRate > 55 && currentMetrics.memoryUsage < 200) {
      return 'increase';
    }
    
    return 'maintain';
  }

  // Process visualization update
  private async processVisualizationUpdate(update: VisualizationUpdate): Promise<void> {
    try {
      this.performanceMonitor.startUpdateTiming();
      
      // Update each stem in the visualization controller
      for (const [stemType, features] of update.stemUpdates) {
        this.visualizationController.updateStemFeatures(stemType, features);
      }
      
      // Apply performance optimizations if needed
      if (this.config.enablePerformanceOptimization) {
        await this.applyPerformanceOptimizations(update.performanceHint);
      }
      
      // Update visualization
      this.visualizationController.updateVisualization(update.timestamp);
      
      this.performanceMonitor.endUpdateTiming();
      
      // Emit update event
      this.emit('visualization_update', {
        timestamp: update.timestamp,
        stemCount: update.stemUpdates.size,
        featureCount: update.globalFeatures.length,
        correlations: update.correlations.length
      });
      
      if (this.config.enableDebugLogging) {
        console.log('🎨 Applied visualization update:', {
          stems: update.stemUpdates.size,
          features: update.globalFeatures.length,
          hint: update.performanceHint
        });
      }
      
    } catch (error) {
      console.error('Error processing visualization update:', error);
    } finally {
      // Remove processed update from queue
      this.updateQueue.shift();
      
      // Process next update if available
      if (this.updateQueue.length > 0) {
        setTimeout(() => {
          this.processVisualizationUpdate(this.updateQueue[0]);
        }, 1);
      }
    }
  }

  // Apply performance optimizations based on hint
  private async applyPerformanceOptimizations(hint: 'maintain' | 'reduce' | 'increase'): Promise<void> {
    switch (hint) {
      case 'reduce':
        // Reduce update frequency temporarily
        this.config.updateInterval = Math.min(this.config.updateInterval * 1.2, 33);
        
        // Reduce buffer size
        this.config.bufferSize = Math.max(this.config.bufferSize * 0.8, 5);
        break;
        
      case 'increase':
        // Increase update frequency
        this.config.updateInterval = Math.max(this.config.updateInterval * 0.9, 8);
        
        // Increase buffer size
        this.config.bufferSize = Math.min(this.config.bufferSize * 1.1, 20);
        break;
        
      case 'maintain':
      default:
        // No changes needed
        break;
    }
  }

  // Handle various events

  private handleAudioPerformanceMetrics(metrics: PerformanceMetrics): void {
    // Update analysis latency in our state
    this.analysisState.analysisLatency = metrics.analysisLatency || 0;
    
    // Emit combined metrics
    this.emit('audio_performance', metrics);
  }

  private handleAudioQualityChange(quality: string): void {
    if (this.config.enableDebugLogging) {
      console.log('🎵 Audio quality changed:', quality);
    }
    
    // Adjust our processing based on audio quality
    if (quality === 'low') {
      this.config.bufferSize = Math.max(this.config.bufferSize * 0.7, 3);
    } else if (quality === 'high') {
      this.config.bufferSize = Math.min(this.config.bufferSize * 1.3, 15);
    }
  }

  private handleVisualizationEvent(event: VisualizationEvent): void {
    if (this.config.enableDebugLogging) {
      console.log('🎨 Visualization event:', event.type);
    }
    
    // Forward event
    this.emit('visualization_event', event);
  }

  private handlePresetChange(event: VisualizationEvent): void {
    // Update our current preset reference
    if (event.value && typeof event.value === 'object') {
      this.analysisState.currentPreset = event.value as VisualizationPreset;
      
      if (this.config.enableDebugLogging) {
        console.log('🎨 Preset changed:', this.analysisState.currentPreset.name);
      }
    }
  }

  private handlePerformanceMetrics(metrics: any): void {
    if (this.config.logPerformanceMetrics) {
      console.log('📊 Performance metrics:', metrics);
    }
    
    // Forward metrics
    this.emit('performance_metrics', metrics);
  }

  private handlePerformanceAlert(alert: any): void {
    console.warn('⚠️ Performance alert:', alert.title);
    
    // Take automatic action for critical alerts
    if (alert.type === 'critical' && alert.canAutoFix) {
      console.log('🔧 Attempting auto-fix for:', alert.title);
      this.applyEmergencyOptimizations();
    }
    
    this.emit('performance_alert', alert);
  }

  private handlePerformanceRecommendation(recommendation: any): void {
    if (this.config.enableDebugLogging) {
      console.log('💡 Performance recommendation:', recommendation.title);
    }
    
    this.emit('performance_recommendation', recommendation);
  }

  // Apply emergency optimizations
  private async applyEmergencyOptimizations(): Promise<void> {
    // Reduce processing load
    this.config.updateInterval = 33; // 30fps
    this.config.maxStemsProcessed = 3;
    this.config.enableCrossStemCorrelation = false;
    
    // Clear buffers
    this.featureBuffer.clear();
    this.correlationHistory.length = 0;
    
    console.log('🚨 Applied emergency optimizations');
  }

  // Public API methods

  // Start the bridge
  async start(): Promise<void> {
    if (this.analysisState.isActive) return;
    
    try {
      // Start audio processing
      await this.audioProcessor.start();
      
      // Load current preset
      const recentPresets = await presetManager.getRecentPresets(1);
      if (recentPresets.length > 0) {
        this.analysisState.currentPreset = recentPresets[0];
      }
      
      // Start update timer
      this.startUpdateTimer();
      
      this.analysisState.isActive = true;
      this.emit('bridge_started', { timestamp: performance.now() });
      
      console.log('🔌 AudioVisualizationBridge started');
      
    } catch (error) {
      console.error('Failed to start AudioVisualizationBridge:', error);
      throw error;
    }
  }

  // Stop the bridge
  async stop(): Promise<void> {
    if (!this.analysisState.isActive) return;
    
    try {
      // Stop audio processing
      await this.audioProcessor.stop();
      
      // Stop update timer
      this.stopUpdateTimer();
      
      // Clear state
      this.featureBuffer.clear();
      this.updateQueue.length = 0;
      this.correlationHistory.length = 0;
      this.analysisState.activeStemTypes.clear();
      
      this.analysisState.isActive = false;
      this.emit('bridge_stopped', { timestamp: performance.now() });
      
      console.log('🔌 AudioVisualizationBridge stopped');
      
    } catch (error) {
      console.error('Failed to stop AudioVisualizationBridge:', error);
      throw error;
    }
  }

  // Start update timer
  private startUpdateTimer(): void {
    if (this.updateTimer) return;
    
    this.updateTimer = window.setInterval(() => {
      if (this.shouldTriggerVisualizationUpdate()) {
        this.createVisualizationUpdate();
      }
    }, this.config.updateInterval);
  }

  // Stop update timer
  private stopUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  // Get current analysis state
  getAnalysisState(): AnalysisState {
    return { ...this.analysisState };
  }

  // Get feature buffer statistics
  getBufferStatistics() {
    const stats = new Map<string, number>();
    for (const [stemType, buffer] of this.featureBuffer) {
      stats.set(stemType, buffer.length);
    }
    return {
      totalBuffers: this.featureBuffer.size,
      bufferSizes: Object.fromEntries(stats),
      totalFeatures: Array.from(this.featureBuffer.values()).reduce((total, buffer) => total + buffer.length, 0),
      updateQueueLength: this.updateQueue.length
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<AudioVisualizationBridgeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Updated bridge configuration');
  }

  // Load and apply preset
  async loadPreset(presetId: string): Promise<void> {
    try {
      const preset = await presetManager.getPreset(presetId);
      if (!preset) {
        throw new Error(`Preset ${presetId} not found`);
      }
      
      this.analysisState.currentPreset = preset;
      
      // Apply preset to visualization controller
      Object.entries(preset.mappings).forEach(([stemType, mapping]) => {
        this.visualizationController.addStemMapping(stemType, mapping);
      });
      
      // Record usage
      await presetManager.recordUsage(presetId);
      
      this.emit('preset_loaded', { preset });
      console.log('🎨 Loaded preset:', preset.name);
      
    } catch (error) {
      console.error('Failed to load preset:', error);
      throw error;
    }
  }

  // Event system
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Cleanup
  dispose(): void {
    this.stop();
    this.eventListeners.clear();
    this.featureBuffer.clear();
    this.updateQueue.length = 0;
    this.correlationHistory.length = 0;
    
    console.log('🧹 AudioVisualizationBridge disposed');
  }
}

export default AudioVisualizationBridge;