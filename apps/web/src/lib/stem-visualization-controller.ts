// StemVisualizationController for Story 5.3: Stem-based Visualization Control
// Maps audio features to visual parameters with real-time updates

import { 
  StemVisualizationMapping, 
  VisualizationState, 
  VisualizationConfig,
  MappingUpdate,
  VisualizationEvent,
  VisualizationMetrics,
  RhythmConfig,
  PitchConfig,
  IntensityConfig,
  TimbreConfig,
  DEFAULT_VISUALIZATION_STATE,
  VisualParameter,
  ResponseCurve
} from '@/types/stem-visualization';
import { StemAnalysis, AudioFeature } from '@/types/stem-audio-analysis';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';

export class StemVisualizationController {
  private visualizer: VisualizerManager;
  private mappings: Map<string, StemVisualizationMapping> = new Map();
  private analysisFeatures: Map<string, AudioFeature[]> = new Map();
  private currentState: VisualizationState;
  private targetState: VisualizationState;
  private config: VisualizationConfig;
  
  // Performance tracking
  private metrics: VisualizationMetrics;
  private lastUpdateTime: number = 0;
  private updateCount: number = 0;
  private frameStartTime: number = 0;
  
  // Smoothing and interpolation
  private interpolationFactors: Map<string, number> = new Map();
  private lastValues: Map<string, number> = new Map();
  private velocities: Map<string, number> = new Map();
  
  // Event handling
  private eventListeners: Map<string, ((event: VisualizationEvent) => void)[]> = new Map();
  
  constructor(visualizer: VisualizerManager, config?: Partial<VisualizationConfig>) {
    this.visualizer = visualizer;
    this.currentState = { ...DEFAULT_VISUALIZATION_STATE };
    this.targetState = { ...DEFAULT_VISUALIZATION_STATE };
    
    this.config = {
      targetFrameRate: 60,
      maxUpdatesPerFrame: 10,
      smoothingEnabled: true,
      interpolationQuality: 'high',
      maxParticleCount: 10000,
      maxEffectComplexity: 1.0,
      enablePostProcessing: true,
      enableCrossfade: true,
      defaultSmoothingFactor: 0.15,
      parameterUpdateThreshold: 0.001,
      enableDebugMode: false,
      showParameterValues: false,
      logMappingUpdates: false,
      ...config
    };
    
    this.metrics = this.initializeMetrics();
    
    console.log('🎨 StemVisualizationController initialized');
  }

  private initializeMetrics(): VisualizationMetrics {
    return {
      frameRate: 0,
      parameterUpdatesPerSecond: 0,
      memoryUsage: 0,
      gpuMemoryUsage: 0,
      renderTime: 0,
      mappingComputeTime: 0,
      lastUpdateLatency: 0
    };
  }

  // Main update loop - called each frame
  updateVisualization(timestamp: number): void {
    this.frameStartTime = performance.now();
    const deltaTime = timestamp - this.lastUpdateTime;
    
    if (deltaTime === 0) return; // Skip if no time has passed
    
    let updatesThisFrame = 0;
    const maxUpdates = this.config.maxUpdatesPerFrame;
    
    // Process each stem mapping
    for (const [stemType, mapping] of this.mappings) {
      if (!mapping.enabled || mapping.mute || updatesThisFrame >= maxUpdates) {
        continue;
      }
      
      const features = this.analysisFeatures.get(stemType);
      if (!features || features.length === 0) continue;
      
      // Apply stem mappings to update target state
      this.processStemMapping(stemType, mapping, features, timestamp);
      updatesThisFrame++;
    }
    
    // Interpolate current state towards target state
    if (this.config.smoothingEnabled) {
      this.interpolateState(deltaTime);
    } else {
      this.currentState = { ...this.targetState };
    }
    
    // Apply the current state to the visualizer
    this.applyStateToVisualizer();
    
    // Update performance metrics
    this.updateMetrics(timestamp, deltaTime);
    
    this.lastUpdateTime = timestamp;
  }

  private processStemMapping(
    stemType: string, 
    mapping: StemVisualizationMapping, 
    features: AudioFeature[], 
    timestamp: number
  ): void {
    const computeStart = performance.now();
    
    // Group features by type for efficient processing
    const featuresByType = this.groupFeaturesByType(features);
    
    // Apply rhythm mapping
    if (mapping.features.rhythm && featuresByType.rhythm) {
      this.applyRhythmicEffect(stemType, featuresByType.rhythm, mapping.features.rhythm, timestamp);
    }
    
    // Apply pitch mapping
    if (mapping.features.pitch && featuresByType.pitch) {
      this.applyPitchEffect(stemType, featuresByType.pitch, mapping.features.pitch, timestamp);
    }
    
    // Apply intensity mapping
    if (mapping.features.intensity && featuresByType.intensity) {
      this.applyIntensityEffect(stemType, featuresByType.intensity, mapping.features.intensity, timestamp);
    }
    
    // Apply timbre mapping
    if (mapping.features.timbre && featuresByType.timbre) {
      this.applyTimbreEffect(stemType, featuresByType.timbre, mapping.features.timbre, timestamp);
    }
    
    const computeTime = performance.now() - computeStart;
    this.metrics.mappingComputeTime += computeTime;
  }

  private groupFeaturesByType(features: AudioFeature[]): Record<string, AudioFeature[]> {
    return features.reduce((groups, feature) => {
      if (!groups[feature.type]) {
        groups[feature.type] = [];
      }
      groups[feature.type].push(feature);
      return groups;
    }, {} as Record<string, AudioFeature[]>);
  }

  private applyRhythmicEffect(
    stemType: string,
    features: AudioFeature[],
    config: RhythmConfig,
    timestamp: number
  ): void {
    const intensity = this.calculateWeightedFeatureValue(features);
    
    if (intensity < config.threshold) return;
    
    const modifiedIntensity = intensity * config.intensity * config.multiplier;
    const parameter = config.target;
    
    this.updateTargetParameter(stemType, parameter, modifiedIntensity, config.smoothing, timestamp);
    
    if (this.config.logMappingUpdates) {
      console.log(`🥁 ${stemType} rhythm → ${parameter}: ${modifiedIntensity.toFixed(3)}`);
    }
  }

  private applyPitchEffect(
    stemType: string,
    features: AudioFeature[],
    config: PitchConfig,
    timestamp: number
  ): void {
    const pitchValue = this.calculateWeightedFeatureValue(features);
    const [minRange, maxRange] = config.range;
    
    // Apply response curve
    let mappedValue: number;
    switch (config.response) {
      case 'exponential':
        mappedValue = Math.pow(pitchValue, 2);
        break;
      case 'logarithmic':
        mappedValue = Math.log(pitchValue + 1) / Math.log(2);
        break;
      case 'linear':
      default:
        mappedValue = pitchValue;
        break;
    }
    
    // Scale to range with sensitivity and offset
    const scaledValue = (mappedValue * config.sensitivity * (maxRange - minRange)) + minRange + config.offset;
    const parameter = config.target;
    
    this.updateTargetParameter(stemType, parameter, scaledValue, 0.1, timestamp);
    
    if (this.config.logMappingUpdates) {
      console.log(`🎵 ${stemType} pitch → ${parameter}: ${scaledValue.toFixed(3)}`);
    }
  }

  private applyIntensityEffect(
    stemType: string,
    features: AudioFeature[],
    config: IntensityConfig,
    timestamp: number
  ): void {
    const intensity = this.calculateWeightedFeatureValue(features);
    
    if (intensity < config.threshold) {
      // Apply decay
      const parameterKey = `${stemType}_${config.target}`;
      const currentValue = this.lastValues.get(parameterKey) || 0;
      const decayedValue = currentValue * (1 - config.decay);
      
      this.updateTargetParameter(stemType, config.target, decayedValue, 0.05, timestamp);
      return;
    }
    
    // Apply attack and ceiling
    const attackedIntensity = Math.min(intensity * config.attack, config.ceiling);
    
    // Apply curve response
    let finalValue: number;
    switch (config.curve) {
      case 'exponential':
        finalValue = Math.pow(attackedIntensity, 1.5);
        break;
      case 'curve':
        finalValue = 1 - Math.pow(1 - attackedIntensity, 2);
        break;
      case 'linear':
      default:
        finalValue = attackedIntensity;
        break;
    }
    
    this.updateTargetParameter(stemType, config.target, finalValue, 0.08, timestamp);
    
    if (this.config.logMappingUpdates) {
      console.log(`💥 ${stemType} intensity → ${config.target}: ${finalValue.toFixed(3)}`);
    }
  }

  private applyTimbreEffect(
    stemType: string,
    features: AudioFeature[],
    config: TimbreConfig,
    timestamp: number
  ): void {
    const timbreValue = this.calculateWeightedFeatureValue(features);
    const [minRange, maxRange] = config.range;
    
    // Apply sensitivity and bias
    const adjustedValue = (timbreValue * config.sensitivity) + config.bias;
    const scaledValue = (adjustedValue * (maxRange - minRange)) + minRange;
    
    this.updateTargetParameter(stemType, config.target, scaledValue, config.smoothing, timestamp);
    
    if (this.config.logMappingUpdates) {
      console.log(`🎨 ${stemType} timbre → ${config.target}: ${scaledValue.toFixed(3)}`);
    }
  }

  private calculateWeightedFeatureValue(features: AudioFeature[]): number {
    if (features.length === 0) return 0;
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const feature of features) {
      const weight = feature.confidence || 1;
      weightedSum += feature.value * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private updateTargetParameter(
    stemType: string,
    parameter: VisualParameter,
    value: number,
    smoothing: number,
    timestamp: number
  ): void {
    const parameterKey = `${stemType}_${parameter}`;
    
    // Apply smoothing if enabled
    if (this.config.smoothingEnabled && smoothing > 0) {
      const lastValue = this.lastValues.get(parameterKey) || value;
      const smoothedValue = lastValue + (value - lastValue) * (1 - smoothing);
      this.lastValues.set(parameterKey, smoothedValue);
      value = smoothedValue;
    }
    
    // Update target state based on parameter type
    this.setStateParameter(parameter, value);
    
    // Emit update event
    this.emitEvent({
      type: 'parameter_change',
      stemType,
      parameter,
      value,
      timestamp
    });
    
    this.updateCount++;
  }

  private setStateParameter(parameter: VisualParameter, value: number): void {
    switch (parameter) {
      case 'scale':
        this.targetState.scale = Math.max(0.1, Math.min(5.0, value));
        break;
      case 'rotation':
        this.targetState.rotation.y = (value * 360) % 360;
        break;
      case 'color':
        // Map to hue
        this.targetState.color.r = Math.sin(value * Math.PI * 2) * 0.5 + 0.5;
        this.targetState.color.g = Math.sin((value + 0.33) * Math.PI * 2) * 0.5 + 0.5;
        this.targetState.color.b = Math.sin((value + 0.66) * Math.PI * 2) * 0.5 + 0.5;
        break;
      case 'emission':
        this.targetState.emission = Math.max(0, Math.min(2.0, value));
        break;
      case 'position':
        this.targetState.position.x = (value - 0.5) * 10;
        break;
      case 'size':
        this.targetState.size = Math.max(0.1, Math.min(3.0, value));
        break;
      case 'opacity':
        this.targetState.opacity = Math.max(0, Math.min(1.0, value));
        break;
      case 'speed':
        this.targetState.speed = Math.max(0.1, Math.min(10.0, value));
        break;
      case 'count':
        this.targetState.count = Math.max(1, Math.min(this.config.maxParticleCount, Math.floor(value * 1000)));
        break;
      case 'height':
        this.targetState.height = Math.max(0.1, Math.min(5.0, value));
        break;
      case 'hue':
        this.targetState.color.r = Math.sin(value * Math.PI * 2) * 0.5 + 0.5;
        this.targetState.color.g = Math.sin((value + 0.33) * Math.PI * 2) * 0.5 + 0.5;
        this.targetState.color.b = Math.sin((value + 0.66) * Math.PI * 2) * 0.5 + 0.5;
        break;
      case 'brightness':
        this.targetState.brightness = Math.max(0, Math.min(2.0, value));
        break;
      case 'complexity':
        this.targetState.complexity = Math.max(0, Math.min(this.config.maxEffectComplexity, value));
        break;
      case 'texture':
        this.targetState.texture = Math.max(0, Math.min(1.0, value));
        break;
      case 'warmth':
        this.targetState.warmth = Math.max(0, Math.min(1.0, value));
        break;
      case 'spread':
        this.targetState.spread = Math.max(0, Math.min(1.0, value));
        break;
    }
  }

  private interpolateState(deltaTime: number): void {
    const interpolationSpeed = Math.min(1.0, deltaTime / (1000 / this.config.targetFrameRate));
    const factor = this.config.defaultSmoothingFactor * interpolationSpeed;
    
    // Interpolate all numeric values
    this.currentState.scale = this.lerp(this.currentState.scale, this.targetState.scale, factor);
    this.currentState.emission = this.lerp(this.currentState.emission, this.targetState.emission, factor);
    this.currentState.size = this.lerp(this.currentState.size, this.targetState.size, factor);
    this.currentState.opacity = this.lerp(this.currentState.opacity, this.targetState.opacity, factor);
    this.currentState.speed = this.lerp(this.currentState.speed, this.targetState.speed, factor);
    this.currentState.height = this.lerp(this.currentState.height, this.targetState.height, factor);
    this.currentState.brightness = this.lerp(this.currentState.brightness, this.targetState.brightness, factor);
    this.currentState.complexity = this.lerp(this.currentState.complexity, this.targetState.complexity, factor);
    this.currentState.texture = this.lerp(this.currentState.texture, this.targetState.texture, factor);
    this.currentState.warmth = this.lerp(this.currentState.warmth, this.targetState.warmth, factor);
    this.currentState.spread = this.lerp(this.currentState.spread, this.targetState.spread, factor);
    
    // Interpolate vectors
    this.currentState.rotation.x = this.lerp(this.currentState.rotation.x, this.targetState.rotation.x, factor);
    this.currentState.rotation.y = this.lerp(this.currentState.rotation.y, this.targetState.rotation.y, factor);
    this.currentState.rotation.z = this.lerp(this.currentState.rotation.z, this.targetState.rotation.z, factor);
    
    this.currentState.position.x = this.lerp(this.currentState.position.x, this.targetState.position.x, factor);
    this.currentState.position.y = this.lerp(this.currentState.position.y, this.targetState.position.y, factor);
    this.currentState.position.z = this.lerp(this.currentState.position.z, this.targetState.position.z, factor);
    
    this.currentState.color.r = this.lerp(this.currentState.color.r, this.targetState.color.r, factor);
    this.currentState.color.g = this.lerp(this.currentState.color.g, this.targetState.color.g, factor);
    this.currentState.color.b = this.lerp(this.currentState.color.b, this.targetState.color.b, factor);
    this.currentState.color.a = this.lerp(this.currentState.color.a, this.targetState.color.a, factor);
    
    // Interpolate count (but keep as integer)
    const targetCount = this.targetState.count;
    const currentCount = this.currentState.count;
    this.currentState.count = Math.round(this.lerp(currentCount, targetCount, factor * 0.5)); // Slower interpolation for count
  }

  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }

  private applyStateToVisualizer(): void {
    // Apply current state to the visualizer manager
    // This connects to the existing visualization engine
    
    this.visualizer.setGlobalScale(this.currentState.scale);
    this.visualizer.setRotationSpeed(this.currentState.speed);
    this.visualizer.setColorIntensity(this.currentState.brightness);
    this.visualizer.setEmissionIntensity(this.currentState.emission);
    this.visualizer.setOpacity(this.currentState.opacity);
    this.visualizer.setParticleCount(this.currentState.count);
    
    // Apply additional parameters if the visualizer supports them
    if ('setComplexity' in this.visualizer) {
      (this.visualizer as any).setComplexity(this.currentState.complexity);
    }
  }

  private updateMetrics(timestamp: number, deltaTime: number): void {
    const frameTime = performance.now() - this.frameStartTime;
    
    this.metrics.frameRate = deltaTime > 0 ? Math.round(1000 / deltaTime) : 0;
    this.metrics.renderTime = frameTime;
    this.metrics.lastUpdateLatency = performance.now() - timestamp;
    this.metrics.parameterUpdatesPerSecond = (this.updateCount / (timestamp / 1000)) || 0;
    
    // Update memory usage (simplified)
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
  }

  // Public API methods
  addStemMapping(stemType: string, mapping: StemVisualizationMapping): void {
    this.mappings.set(stemType, mapping);
    console.log(`🎨 Added mapping for ${stemType}`);
  }

  removeStemMapping(stemType: string): void {
    this.mappings.delete(stemType);
    console.log(`🗑️ Removed mapping for ${stemType}`);
  }

  updateStemMapping(stemType: string, mapping: Partial<StemVisualizationMapping>): void {
    const existing = this.mappings.get(stemType);
    if (existing) {
      this.mappings.set(stemType, { ...existing, ...mapping });
      console.log(`🔄 Updated mapping for ${stemType}`);
    }
  }

  updateStemFeatures(stemType: string, features: AudioFeature[]): void {
    this.analysisFeatures.set(stemType, features);
  }

  setStemMute(stemType: string, muted: boolean): void {
    const mapping = this.mappings.get(stemType);
    if (mapping) {
      mapping.mute = muted;
      this.emitEvent({
        type: 'stem_mute',
        stemType,
        value: muted,
        timestamp: performance.now()
      });
    }
  }

  setStemSolo(stemType: string, solo: boolean): void {
    // If soloing, mute all other stems
    if (solo) {
      for (const [type, mapping] of this.mappings) {
        mapping.solo = type === stemType;
      }
    } else {
      // Unsolo all stems
      for (const [, mapping] of this.mappings) {
        mapping.solo = false;
      }
    }
    
    this.emitEvent({
      type: 'stem_solo',
      stemType,
      value: solo,
      timestamp: performance.now()
    });
  }

  getCurrentState(): VisualizationState {
    return { ...this.currentState };
  }

  getMetrics(): VisualizationMetrics {
    return { ...this.metrics };
  }

  // Event system
  addEventListener(eventType: string, callback: (event: VisualizationEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  removeEventListener(eventType: string, callback: (event: VisualizationEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: VisualizationEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  // Configuration
  updateConfig(newConfig: Partial<VisualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Updated visualization config');
  }

  // Cleanup
  dispose(): void {
    this.mappings.clear();
    this.analysisFeatures.clear();
    this.eventListeners.clear();
    this.interpolationFactors.clear();
    this.lastValues.clear();
    this.velocities.clear();
    
    console.log('🧹 StemVisualizationController disposed');
  }
}