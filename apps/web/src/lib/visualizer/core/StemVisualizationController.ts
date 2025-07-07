import { VisualizerManager } from './VisualizerManager';
import { AudioAnalysisData } from '@/types/visualizer';
import { 
  StemVisualizationMapping, 
  RhythmConfig, 
  PitchConfig, 
  IntensityConfig,
  VisualizationPreset
} from '@/types/stem-visualization';
import TWEEN from '@tweenjs/tween.js';

interface FeatureState {
  value: number;
  lastUpdate: number;
  tween: TWEEN.Tween<{ value: number }> | null;
}

export class StemVisualizationController {
  private visualizer: VisualizerManager;
  private mappings: Map<string, StemVisualizationMapping>;
  private featureStates: Map<string, Map<string, FeatureState>>;
  private currentPreset: VisualizationPreset | null = null;
  
  constructor(visualizer: VisualizerManager) {
    this.visualizer = visualizer;
    this.mappings = new Map();
    this.featureStates = new Map();
  }

  public applyPreset(preset: VisualizationPreset) {
    this.currentPreset = preset;
    this.mappings.clear();
    
    // Apply mappings from preset
    Object.entries(preset.mappings).forEach(([stemId, mapping]) => {
      this.mappings.set(stemId, mapping);
      this.initializeFeatureState(stemId);
    });

    // Apply default settings
    this.visualizer.updateSettings(preset.defaultSettings);
  }

  private initializeFeatureState(stemId: string) {
    const featureState = new Map<string, FeatureState>();
    const mapping = this.mappings.get(stemId);
    
    if (mapping) {
      if (mapping.features.rhythm) {
        featureState.set('rhythm', { value: 0, lastUpdate: 0, tween: null });
      }
      if (mapping.features.pitch) {
        featureState.set('pitch', { value: 0, lastUpdate: 0, tween: null });
      }
      if (mapping.features.intensity) {
        featureState.set('intensity', { value: 0, lastUpdate: 0, tween: null });
      }
    }

    this.featureStates.set(stemId, featureState);
  }

  public updateVisualization(stemId: string, analysisData: AudioAnalysisData, timestamp: number) {
    const mapping = this.mappings.get(stemId);
    if (!mapping) return;

    const featureState = this.featureStates.get(stemId);
    if (!featureState) return;

    // Apply rhythm features
    if (mapping.features.rhythm) {
      this.applyRhythmicEffect(stemId, analysisData, mapping.features.rhythm, timestamp);
    }

    // Apply pitch features
    if (mapping.features.pitch) {
      this.applyPitchEffect(stemId, analysisData, mapping.features.pitch, timestamp);
    }

    // Apply intensity features
    if (mapping.features.intensity) {
      this.applyIntensityEffect(stemId, analysisData, mapping.features.intensity, timestamp);
    }

    // Update tweens
    TWEEN.update(timestamp);
  }

  private applyRhythmicEffect(
    stemId: string,
    analysisData: AudioAnalysisData,
    config: RhythmConfig,
    timestamp: number
  ) {
    const state = this.featureStates.get(stemId)?.get('rhythm');
    if (!state) return;

    // Calculate rhythm value from RMS and ZCR
    const rhythmValue = Math.min(
      1,
      (analysisData.volume * 0.7 + analysisData.bass * 0.3) * config.intensity
    );

    // Create smooth transition
    if (state.tween) {
      state.tween.stop();
    }

    state.tween = new TWEEN.Tween({ value: state.value })
      .to({ value: rhythmValue }, config.smoothing * 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate((obj) => {
        state.value = obj.value;
        this.applyVisualParameter(config.target, obj.value);
      })
      .start(timestamp);
  }

  private applyPitchEffect(
    stemId: string,
    analysisData: AudioAnalysisData,
    config: PitchConfig,
    timestamp: number
  ) {
    const state = this.featureStates.get(stemId)?.get('pitch');
    if (!state) return;

    // Calculate dominant frequency from spectrum
    let dominantFreq = this.calculateDominantFrequency(analysisData.frequencies);
    
    // Map frequency to target range
    const normalizedValue = this.mapFrequencyToRange(
      dominantFreq,
      config.range[0],
      config.range[1],
      config.response
    );

    // Smooth transition
    if (state.tween) {
      state.tween.stop();
    }

    state.tween = new TWEEN.Tween({ value: state.value })
      .to({ value: normalizedValue }, 100) // Fast transition for pitch
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate((obj) => {
        state.value = obj.value;
        this.applyVisualParameter(config.target, obj.value);
      })
      .start(timestamp);
  }

  private applyIntensityEffect(
    stemId: string,
    analysisData: AudioAnalysisData,
    config: IntensityConfig,
    timestamp: number
  ) {
    const state = this.featureStates.get(stemId)?.get('intensity');
    if (!state) return;

    // Calculate intensity from volume and spectral features
    const intensity = Math.max(0, analysisData.volume - config.threshold);
    const targetValue = intensity * (1 - config.decay);

    // Smooth transition
    if (state.tween) {
      state.tween.stop();
    }

    state.tween = new TWEEN.Tween({ value: state.value })
      .to({ value: targetValue }, 200) // Medium transition for intensity
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate((obj) => {
        state.value = obj.value;
        this.applyVisualParameter(config.target, obj.value);
      })
      .start(timestamp);
  }

  private calculateDominantFrequency(frequencies: Float32Array): number {
    let maxAmplitude = 0;
    let dominantBin = 0;

    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] > maxAmplitude) {
        maxAmplitude = frequencies[i];
        dominantBin = i;
      }
    }

    // Convert bin to frequency (assuming standard 44.1kHz sample rate)
    return (dominantBin * 44100) / (frequencies.length * 2);
  }

  private mapFrequencyToRange(
    freq: number,
    minFreq: number,
    maxFreq: number,
    response: 'linear' | 'exponential'
  ): number {
    if (response === 'linear') {
      return (freq - minFreq) / (maxFreq - minFreq);
    } else {
      // Exponential mapping using log scale
      const logMin = Math.log(minFreq);
      const logMax = Math.log(maxFreq);
      const logFreq = Math.log(freq);
      return (logFreq - logMin) / (logMax - logMin);
    }
  }

  private applyVisualParameter(target: string, value: number) {
    // Update visualization parameters based on target
    switch (target) {
      case 'scale':
        this.visualizer.setGlobalScale(1 + value);
        break;
      case 'rotation':
        this.visualizer.setRotationSpeed(value);
        break;
      case 'color':
        this.visualizer.setColorIntensity(value);
        break;
      case 'emission':
        this.visualizer.setEmissionIntensity(value);
        break;
      case 'position':
        this.visualizer.setPositionOffset(value);
        break;
      case 'height':
        this.visualizer.setHeightScale(value);
        break;
      case 'hue':
        this.visualizer.setHueRotation(value);
        break;
      case 'brightness':
        this.visualizer.setBrightness(value);
        break;
      case 'complexity':
        this.visualizer.setComplexity(value);
        break;
      case 'size':
        this.visualizer.setParticleSize(value);
        break;
      case 'opacity':
        this.visualizer.setOpacity(value);
        break;
      case 'speed':
        this.visualizer.setAnimationSpeed(value);
        break;
      case 'count':
        this.visualizer.setParticleCount(Math.floor(value * 10000));
        break;
    }
  }

  public dispose() {
    // Clean up tweens and states
    this.featureStates.forEach(featureMap => {
      featureMap.forEach(state => {
        if (state.tween) {
          state.tween.stop();
        }
      });
    });
    
    this.mappings.clear();
    this.featureStates.clear();
    this.currentPreset = null;
  }
} 