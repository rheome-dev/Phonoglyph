// Visualization Feature Pipeline for Story 5.2
// Transforms audio analysis features into visualization parameters

import { StemAnalysis, AudioFeature, StemFeatureSet } from '@/types/stem-audio-analysis';
import { AudioAnalysisData } from '@/types/visualizer';

export interface VisualizationParameters {
  // Core visual parameters
  energy: number;           // 0-1: Overall energy level
  brightness: number;       // 0-1: Visual brightness/intensity
  color: {
    hue: number;           // 0-360: Color hue
    saturation: number;    // 0-1: Color saturation
    warmth: number;        // 0-1: Warm (red) vs cool (blue)
  };
  
  // Motion parameters
  movement: {
    speed: number;         // 0-1: Animation speed multiplier
    direction: number;     // 0-360: Movement direction
    chaos: number;         // 0-1: Randomness/unpredictability
  };
  
  // Spatial parameters
  scale: number;           // 0-2: Size scaling factor
  depth: number;           // 0-1: 3D depth effect
  spread: number;          // 0-1: Particle/element spread
  
  // Temporal parameters
  pulse: number;           // 0-1: Rhythmic pulsing
  attack: number;          // 0-1: Sharp onset detection
  sustain: number;         // 0-1: Sustained energy
  
  // Stem-specific multipliers
  stemWeights: Record<string, number>; // Per-stem influence weights
}

export class VisualizationFeaturePipeline {
  private stemAnalysisHistory: Map<string, StemAnalysis[]> = new Map();
  private featureSmoothing: Map<string, number> = new Map();
  private crossStemCorrelations: Map<string, number> = new Map();
  private lastParameters: VisualizationParameters | null = null;
  
  // Configuration for visualization impact
  private config = {
    historyLength: 30,        // Frames to keep for analysis
    smoothingFactor: 0.3,     // Feature smoothing (0 = no smoothing, 1 = max smoothing)
    energyThreshold: 0.1,     // Minimum energy to trigger visual changes
    attackThreshold: 0.7,     // Threshold for detecting attacks/onsets
    crossStemInfluence: 0.4,  // How much stems influence each other
    
         // Stem importance weights for different visual aspects
     stemInfluence: {
       drums: { movement: 1.0, pulse: 1.0, attack: 1.0, energy: 0.8, color: 0.3, chaos: 0.5, brightness: 0.4, warmth: 0.2, scale: 0.7, depth: 0.6, spread: 0.8 },
       bass: { depth: 1.0, warmth: 1.0, scale: 0.8, energy: 0.9, movement: 0.6, pulse: 0.7, attack: 0.5, color: 0.4, chaos: 0.3, brightness: 0.5, spread: 0.4 },
       vocals: { brightness: 1.0, color: 1.0, spread: 0.7, energy: 0.6, movement: 0.5, pulse: 0.4, attack: 0.3, warmth: 0.8, scale: 0.5, depth: 0.3, chaos: 0.6 },
       piano: { color: 0.8, brightness: 0.7, movement: 0.5, energy: 0.5, pulse: 0.6, attack: 0.4, warmth: 0.6, scale: 0.4, depth: 0.3, spread: 0.5, chaos: 0.3 },
       other: { chaos: 0.6, spread: 0.8, movement: 0.4, energy: 0.4, pulse: 0.3, attack: 0.2, color: 0.5, brightness: 0.4, warmth: 0.3, scale: 0.4, depth: 0.2 }
     }
  };

  constructor(config?: Partial<typeof this.config>) {
    this.config = { ...this.config, ...config };
  }

  // Main processing method
  processFeatures(stemAnalyses: Record<string, StemAnalysis>): VisualizationParameters {
    // Update history for temporal analysis
    this.updateAnalysisHistory(stemAnalyses);
    
    // Calculate cross-stem correlations
    this.updateCrossStemCorrelations();
    
    // Extract and smooth features
    const features = this.extractVisualizationFeatures(stemAnalyses);
    const smoothedFeatures = this.applyFeatureSmoothing(features);
    
    // Transform to visualization parameters
    const parameters = this.transformToVisualizationParameters(smoothedFeatures);
    
    // Apply temporal continuity
    const finalParameters = this.applyTemporalContinuity(parameters);
    
    this.lastParameters = finalParameters;
    return finalParameters;
  }

  private updateAnalysisHistory(stemAnalyses: Record<string, StemAnalysis>): void {
    Object.entries(stemAnalyses).forEach(([stemType, analysis]) => {
      if (!this.stemAnalysisHistory.has(stemType)) {
        this.stemAnalysisHistory.set(stemType, []);
      }
      
      const history = this.stemAnalysisHistory.get(stemType)!;
      history.push(analysis);
      
      // Keep only recent history
      if (history.length > this.config.historyLength) {
        history.shift();
      }
    });
  }

  private updateCrossStemCorrelations(): void {
    const stemTypes = Array.from(this.stemAnalysisHistory.keys());
    
    for (let i = 0; i < stemTypes.length; i++) {
      for (let j = i + 1; j < stemTypes.length; j++) {
        const stem1 = stemTypes[i];
        const stem2 = stemTypes[j];
        
        const correlation = this.calculateStemCorrelation(stem1, stem2);
        this.crossStemCorrelations.set(`${stem1}-${stem2}`, correlation);
      }
    }
  }

  private calculateStemCorrelation(stem1: string, stem2: string): number {
    const history1 = this.stemAnalysisHistory.get(stem1) || [];
    const history2 = this.stemAnalysisHistory.get(stem2) || [];
    
    if (history1.length < 2 || history2.length < 2) return 0;
    
    // Simple correlation based on energy levels
    const recent1 = history1.slice(-5);
    const recent2 = history2.slice(-5);
    
    let correlation = 0;
    const minLength = Math.min(recent1.length, recent2.length);
    
    for (let i = 0; i < minLength; i++) {
      const energy1 = recent1[i].metadata.energy;
      const energy2 = recent2[i].metadata.energy;
      correlation += Math.abs(energy1 - energy2);
    }
    
    return Math.max(0, 1 - (correlation / minLength)); // Invert so high correlation = low difference
  }

  private extractVisualizationFeatures(stemAnalyses: Record<string, StemAnalysis>): Record<string, number> {
    const features: Record<string, number> = {};
    
    Object.entries(stemAnalyses).forEach(([stemType, analysis]) => {
      const stemPrefix = stemType;
      
      // Energy features
      features[`${stemPrefix}_energy`] = analysis.metadata.energy;
      features[`${stemPrefix}_clarity`] = analysis.metadata.clarity;
      
      // Rhythmic features
      const rhythmFeatures = analysis.features.rhythm || [];
      features[`${stemPrefix}_rhythm_intensity`] = this.calculateFeatureIntensity(rhythmFeatures);
      features[`${stemPrefix}_rhythm_variation`] = this.calculateFeatureVariation(rhythmFeatures);
      
      // Pitch features
      const pitchFeatures = analysis.features.pitch || [];
      features[`${stemPrefix}_pitch_height`] = this.calculateFeatureAverage(pitchFeatures);
      features[`${stemPrefix}_pitch_movement`] = this.calculateFeatureMovement(pitchFeatures);
      
      // Intensity features
      const intensityFeatures = analysis.features.intensity || [];
      features[`${stemPrefix}_intensity`] = this.calculateFeatureIntensity(intensityFeatures);
      features[`${stemPrefix}_attack`] = this.detectAttack(intensityFeatures);
      
      // Timbre features
      const timbreFeatures = analysis.features.timbre || [];
      features[`${stemPrefix}_timbre_complexity`] = this.calculateFeatureVariation(timbreFeatures);
      features[`${stemPrefix}_timbre_warmth`] = this.calculateTimbreWarmth(timbreFeatures);
    });
    
    return features;
  }

  private calculateFeatureIntensity(features: AudioFeature[]): number {
    if (features.length === 0) return 0;
    return features.reduce((sum, f) => sum + f.value * f.confidence, 0) / features.length;
  }

  private calculateFeatureVariation(features: AudioFeature[]): number {
    if (features.length < 2) return 0;
    
    const values = features.map(f => f.value);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private calculateFeatureAverage(features: AudioFeature[]): number {
    if (features.length === 0) return 0;
    return features.reduce((sum, f) => sum + f.value, 0) / features.length;
  }

  private calculateFeatureMovement(features: AudioFeature[]): number {
    if (features.length < 2) return 0;
    
    let totalMovement = 0;
    for (let i = 1; i < features.length; i++) {
      totalMovement += Math.abs(features[i].value - features[i - 1].value);
    }
    
    return totalMovement / (features.length - 1);
  }

  private detectAttack(features: AudioFeature[]): number {
    if (features.length < 2) return 0;
    
    const recent = features.slice(-2);
    const increase = recent[1].value - recent[0].value;
    
    return increase > this.config.attackThreshold ? 1 : Math.max(0, increase);
  }

  private calculateTimbreWarmth(features: AudioFeature[]): number {
    // Simplified warmth calculation based on timbre variation
    const complexity = this.calculateFeatureVariation(features);
    return Math.max(0, 1 - complexity); // Less complex = warmer
  }

  private applyFeatureSmoothing(features: Record<string, number>): Record<string, number> {
    const smoothed: Record<string, number> = {};
    
    Object.entries(features).forEach(([key, value]) => {
      const previousValue = this.featureSmoothing.get(key) || value;
      const smoothingFactor = this.config.smoothingFactor;
      
      const smoothedValue = previousValue * smoothingFactor + value * (1 - smoothingFactor);
      smoothed[key] = smoothedValue;
      this.featureSmoothing.set(key, smoothedValue);
    });
    
    return smoothed;
  }

  private transformToVisualizationParameters(features: Record<string, number>): VisualizationParameters {
    // Calculate overall energy
    const totalEnergy = this.calculateWeightedStemValue(features, 'energy', 'energy');
    
    // Calculate movement parameters
    const rhythmIntensity = this.calculateWeightedStemValue(features, 'rhythm_intensity', 'movement');
    const rhythmVariation = this.calculateWeightedStemValue(features, 'rhythm_variation', 'movement');
    
    // Calculate color parameters
    const pitchHeight = this.calculateWeightedStemValue(features, 'pitch_height', 'color');
    const timbreWarmth = this.calculateWeightedStemValue(features, 'timbre_warmth', 'color');
    
    // Calculate spatial parameters
    const bassEnergy = features['bass_energy'] || 0;
    const vocalsSpread = features['vocals_intensity'] || 0;
    
    // Calculate temporal parameters
    const drumsAttack = features['drums_attack'] || 0;
    const overallIntensity = this.calculateWeightedStemValue(features, 'intensity', 'pulse');
    
    return {
      energy: Math.min(1, totalEnergy),
      brightness: Math.min(1, pitchHeight + totalEnergy * 0.3),
      
      color: {
        hue: (pitchHeight * 360) % 360,
        saturation: Math.min(1, rhythmVariation + 0.5),
        warmth: Math.min(1, timbreWarmth)
      },
      
      movement: {
        speed: Math.min(1, rhythmIntensity),
        direction: (rhythmVariation * 360) % 360,
        chaos: Math.min(1, this.calculateWeightedStemValue(features, 'timbre_complexity', 'chaos'))
      },
      
      scale: Math.min(2, 0.5 + bassEnergy * 1.5),
      depth: Math.min(1, bassEnergy),
      spread: Math.min(1, vocalsSpread),
      
      pulse: Math.min(1, overallIntensity),
      attack: Math.min(1, drumsAttack),
      sustain: Math.min(1, this.calculateSustain(features)),
      
      stemWeights: this.calculateStemWeights(features)
    };
  }

  private calculateWeightedStemValue(features: Record<string, number>, featureSuffix: string, visualAspect: string): number {
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.entries(this.config.stemInfluence).forEach(([stemType, weights]) => {
      const featureKey = `${stemType}_${featureSuffix}`;
      const featureValue = features[featureKey] || 0;
      const weight = (weights as any)[visualAspect] || 0;
      
      weightedSum += featureValue * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculateSustain(features: Record<string, number>): number {
    // Calculate sustained energy across all stems
    const sustainValues = Object.keys(features)
      .filter(key => key.endsWith('_intensity'))
      .map(key => features[key] || 0);
    
    if (sustainValues.length === 0) return 0;
    
    const average = sustainValues.reduce((sum, val) => sum + val, 0) / sustainValues.length;
    const variation = this.calculateFeatureVariation(sustainValues.map(v => ({ value: v, confidence: 1, type: 'intensity' as const, timestamp: 0 })));
    
    // High sustain = high average, low variation
    return Math.min(1, average * (1 - variation));
  }

  private calculateStemWeights(features: Record<string, number>): Record<string, number> {
    const weights: Record<string, number> = {};
    
    Object.keys(this.config.stemInfluence).forEach(stemType => {
      const energyKey = `${stemType}_energy`;
      const energy = features[energyKey] || 0;
      weights[stemType] = Math.min(1, energy);
    });
    
    return weights;
  }

  private applyTemporalContinuity(parameters: VisualizationParameters): VisualizationParameters {
    if (!this.lastParameters) {
      return parameters;
    }
    
    // Apply gentle smoothing to prevent jarring changes
    const continuityFactor = 0.15; // Lower = more smoothing
    
    return {
      energy: this.smoothValue(this.lastParameters.energy, parameters.energy, continuityFactor),
      brightness: this.smoothValue(this.lastParameters.brightness, parameters.brightness, continuityFactor),
      
      color: {
        hue: this.smoothAngle(this.lastParameters.color.hue, parameters.color.hue, continuityFactor),
        saturation: this.smoothValue(this.lastParameters.color.saturation, parameters.color.saturation, continuityFactor),
        warmth: this.smoothValue(this.lastParameters.color.warmth, parameters.color.warmth, continuityFactor)
      },
      
      movement: {
        speed: this.smoothValue(this.lastParameters.movement.speed, parameters.movement.speed, continuityFactor),
        direction: this.smoothAngle(this.lastParameters.movement.direction, parameters.movement.direction, continuityFactor),
        chaos: this.smoothValue(this.lastParameters.movement.chaos, parameters.movement.chaos, continuityFactor)
      },
      
      scale: this.smoothValue(this.lastParameters.scale, parameters.scale, continuityFactor),
      depth: this.smoothValue(this.lastParameters.depth, parameters.depth, continuityFactor),
      spread: this.smoothValue(this.lastParameters.spread, parameters.spread, continuityFactor),
      
      pulse: parameters.pulse, // Keep pulse responsive
      attack: parameters.attack, // Keep attack responsive
      sustain: this.smoothValue(this.lastParameters.sustain, parameters.sustain, continuityFactor),
      
      stemWeights: parameters.stemWeights // Update stem weights immediately
    };
  }

  private smoothValue(oldValue: number, newValue: number, factor: number): number {
    return oldValue * (1 - factor) + newValue * factor;
  }

  private smoothAngle(oldAngle: number, newAngle: number, factor: number): number {
    // Handle angle wrapping (0-360 degrees)
    let diff = newAngle - oldAngle;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    return (oldAngle + diff * factor + 360) % 360;
  }

  // Public utility methods
  getFeatureHistory(stemType: string): StemAnalysis[] {
    return this.stemAnalysisHistory.get(stemType) || [];
  }

  getCrossStemCorrelations(): Record<string, number> {
    return Object.fromEntries(this.crossStemCorrelations);
  }

  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }

  reset(): void {
    this.stemAnalysisHistory.clear();
    this.featureSmoothing.clear();
    this.crossStemCorrelations.clear();
    this.lastParameters = null;
  }
}