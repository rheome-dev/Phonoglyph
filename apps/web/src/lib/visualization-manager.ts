import { AudioToMidiAdapter, AudioFeatures, VisualizationParameters } from './audio-to-midi-adapter';
import { StemType, VisualizationPreset, DEFAULT_PRESETS } from '@/types/stem-visualization';
import { VisualizationSettings } from '@/types/midi';
import { VisualizerManager } from './visualizer/core/VisualizerManager';

export interface VisualizationConfig {
  preset: VisualizationPreset;
  stemWeights: Record<StemType, number>;
  globalSettings: VisualizationSettings;
  smoothingFactor: number;
  responsiveness: number;
}

export class AudioVisualizationManager {
  private adapter: AudioToMidiAdapter;
  private currentConfig: VisualizationConfig;
  private visualizerManager: VisualizerManager | null = null;
  private lastParameters: VisualizationParameters | null = null;
  private smoothingBuffer: Map<string, number[]> = new Map();
  private readonly bufferSize = 5; // Number of frames to smooth over

  constructor(config?: Partial<VisualizationConfig>) {
    this.adapter = new AudioToMidiAdapter();
    this.currentConfig = {
      preset: DEFAULT_PRESETS[0],
      stemWeights: {
        drums: 1.0,
        bass: 1.0,
        vocals: 1.0,
        other: 0.8
      },
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
      ...config
    };
  }

  public setVisualizerManager(visualizer: VisualizerManager): void {
    this.visualizerManager = visualizer;
  }

  public updateConfig(config: Partial<VisualizationConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
  }

  public processAudioFeatures(
    stemFeatures: Record<StemType, AudioFeatures>,
    currentTime: number
  ): VisualizationParameters {
    // Apply preset-based mapping for each stem
    const stemParameters: VisualizationParameters[] = [];
    const weights: number[] = [];

    // Process each stem according to the current preset
    (Object.keys(stemFeatures) as StemType[]).forEach((stemType) => {
      const features = stemFeatures[stemType];
      const stem = stemType;
      const mapping = this.currentConfig.preset.mappings[stem];
      
      if (mapping) {
        const params = this.mapStemToVisualization(features, mapping, stem);
        stemParameters.push(params);
        weights.push(this.currentConfig.stemWeights[stem] || 1.0);
      }
    });

    // Blend all stem parameters
    let blendedParams: VisualizationParameters;
    if (stemParameters.length > 0) {
      blendedParams = this.adapter.visualizationAdapter.blendStemEffects(stemParameters, weights);
    } else {
      // Fallback to default parameters
      blendedParams = this.getDefaultParameters();
    }

    // Apply global settings and smoothing
    blendedParams = this.applyGlobalSettings(blendedParams);
    blendedParams = this.applySmoothingAndResponsiveness(blendedParams);

    this.lastParameters = blendedParams;
    return blendedParams;
  }

  private mapStemToVisualization(
    features: AudioFeatures,
    mapping: any,
    stemType: StemType
  ): VisualizationParameters {
    let params = this.getDefaultParameters();
    
    // Apply rhythm mapping
    if (mapping.features.rhythm) {
      const rhythmConfig = mapping.features.rhythm;
      const rhythmValue = this.calculateRhythmIntensity(features);
      
      switch (rhythmConfig.target) {
        case 'scale':
          params.scale = 1.0 + (rhythmValue * rhythmConfig.intensity);
          break;
        case 'rotation':
          params.rotation = rhythmValue * rhythmConfig.intensity * 360;
          break;
        case 'color':
          this.applyRhythmColor(params, rhythmValue, rhythmConfig.intensity, stemType);
          break;
        case 'emission':
          params.emission = 0.5 + (rhythmValue * rhythmConfig.intensity * 0.5);
          break;
        case 'position':
          const offset = rhythmValue * rhythmConfig.intensity;
          params.position = [offset * 0.1, offset * 0.1, 0];
          break;
      }
    }

    // Apply pitch mapping
    if (mapping.features.pitch) {
      const pitchConfig = mapping.features.pitch;
      const pitchValue = this.calculatePitchValue(features, pitchConfig);
      
      switch (pitchConfig.target) {
        case 'height':
          params.height = 0.5 + (pitchValue * 0.5);
          break;
        case 'hue':
          params.hue = pitchValue * 360;
          break;
        case 'brightness':
          params.brightness = 0.3 + (pitchValue * 0.7);
          break;
        case 'complexity':
          params.complexity = pitchValue;
          break;
      }
    }

    // Apply intensity mapping
    if (mapping.features.intensity) {
      const intensityConfig = mapping.features.intensity;
      const intensityValue = this.calculateIntensityValue(features, intensityConfig);
      
      switch (intensityConfig.target) {
        case 'size':
          params.size = 0.5 + (intensityValue * 1.5);
          break;
        case 'opacity':
          params.opacity = 0.2 + (intensityValue * 0.8);
          break;
        case 'speed':
          params.speed = 0.5 + (intensityValue * 1.5);
          break;
        case 'count':
          params.count = Math.floor(2000 + (intensityValue * 8000));
          break;
      }
    }

    return params;
  }

  private calculateRhythmIntensity(features: AudioFeatures): number {
    // Combine RMS, zero crossing rate, and beat confidence
    const rmsIntensity = Math.min(features.rms * 2, 1.0);
    const zcrIntensity = Math.min(features.zcr * 3, 1.0);
    const beatIntensity = features.beats.length > 0 
      ? features.beats.reduce((sum, beat) => sum + beat.confidence, 0) / features.beats.length 
      : 0;

    return (rmsIntensity * 0.4 + zcrIntensity * 0.3 + beatIntensity * 0.3);
  }

  private calculatePitchValue(features: AudioFeatures, pitchConfig: any): number {
    if (features.fundamentalFreq === 0) return 0;

    const [minFreq, maxFreq] = pitchConfig.range;
    let normalizedPitch = (features.fundamentalFreq - minFreq) / (maxFreq - minFreq);
    normalizedPitch = Math.max(0, Math.min(1, normalizedPitch));

    if (pitchConfig.response === 'exponential') {
      normalizedPitch = Math.pow(normalizedPitch, 2);
    }

    return normalizedPitch;
  }

  private calculateIntensityValue(features: AudioFeatures, intensityConfig: any): number {
    const intensity = Math.max(features.rms, features.loudness);
    
    if (intensity < intensityConfig.threshold) return 0;
    
    const scaledIntensity = (intensity - intensityConfig.threshold) / (1.0 - intensityConfig.threshold);
    return Math.min(scaledIntensity, 1.0);
  }

  private applyRhythmColor(
    params: VisualizationParameters, 
    rhythmValue: number, 
    intensity: number, 
    stemType: StemType
  ): void {
    const stemColors = {
      drums: [1.0, 0.3, 0.3], // Red
      bass: [0.3, 0.3, 1.0],  // Blue
      vocals: [0.3, 1.0, 0.3], // Green
      other: [1.0, 1.0, 0.3]   // Yellow
    };

    const baseColor = stemColors[stemType] || [1.0, 1.0, 1.0];
    const colorIntensity = rhythmValue * intensity;
    
    params.color = [
      baseColor[0] * (0.5 + colorIntensity * 0.5),
      baseColor[1] * (0.5 + colorIntensity * 0.5),
      baseColor[2] * (0.5 + colorIntensity * 0.5)
    ];
  }

  private applyGlobalSettings(params: VisualizationParameters): VisualizationParameters {
    // Apply global scaling and responsiveness
    const responsiveness = this.currentConfig.responsiveness;
    
    return {
      ...params,
      scale: params.scale * responsiveness,
      rotation: params.rotation * responsiveness,
      emission: params.emission * responsiveness,
      brightness: params.brightness * responsiveness,
      speed: params.speed * responsiveness
    };
  }

  private applySmoothingAndResponsiveness(params: VisualizationParameters): VisualizationParameters {
    if (!this.lastParameters) return params;

    const smoothingFactor = this.currentConfig.smoothingFactor;
    const smoothed: VisualizationParameters = { ...params };

    // Smooth numeric parameters
    const numericKeys: (keyof VisualizationParameters)[] = [
      'scale', 'rotation', 'emission', 'height', 'hue', 'brightness', 
      'complexity', 'size', 'opacity', 'speed', 'count'
    ];

    numericKeys.forEach(key => {
      if (typeof params[key] === 'number' && typeof this.lastParameters![key] === 'number') {
        const current = params[key] as number;
        const previous = this.lastParameters![key] as number;
        (smoothed[key] as number) = previous + (current - previous) * (1 - smoothingFactor);
      }
    });

    // Smooth color components
    if (this.lastParameters.color && params.color) {
      smoothed.color = [
        this.lastParameters.color[0] + (params.color[0] - this.lastParameters.color[0]) * (1 - smoothingFactor),
        this.lastParameters.color[1] + (params.color[1] - this.lastParameters.color[1]) * (1 - smoothingFactor),
        this.lastParameters.color[2] + (params.color[2] - this.lastParameters.color[2]) * (1 - smoothingFactor)
      ];
    }

    // Smooth position components
    if (this.lastParameters.position && params.position) {
      smoothed.position = [
        this.lastParameters.position[0] + (params.position[0] - this.lastParameters.position[0]) * (1 - smoothingFactor),
        this.lastParameters.position[1] + (params.position[1] - this.lastParameters.position[1]) * (1 - smoothingFactor),
        this.lastParameters.position[2] + (params.position[2] - this.lastParameters.position[2]) * (1 - smoothingFactor)
      ];
    }

    return smoothed;
  }

  public applyParametersToVisualizer(params: VisualizationParameters): void {
    if (!this.visualizerManager) return;

    // Apply parameters to the visualizer manager
    this.visualizerManager.setGlobalScale(params.scale);
    this.visualizerManager.setRotationSpeed(params.rotation);
    this.visualizerManager.setColorIntensity(Math.max(...params.color));
    this.visualizerManager.setEmissionIntensity(params.emission);
    this.visualizerManager.setHeightScale(params.height);
    this.visualizerManager.setHueRotation(params.hue);
    this.visualizerManager.setBrightness(params.brightness);
    this.visualizerManager.setComplexity(params.complexity);
    this.visualizerManager.setParticleSize(params.size);
    this.visualizerManager.setOpacity(params.opacity);
    this.visualizerManager.setAnimationSpeed(params.speed);
    this.visualizerManager.setParticleCount(params.count);
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

  public getCurrentParameters(): VisualizationParameters | null {
    return this.lastParameters;
  }

  public getConfig(): VisualizationConfig {
    return { ...this.currentConfig };
  }

  public loadPreset(presetId: string): boolean {
    const preset = DEFAULT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      this.currentConfig.preset = preset;
      return true;
    }
    return false;
  }

  public setStemWeight(stemType: StemType, weight: number): void {
    this.currentConfig.stemWeights[stemType] = Math.max(0, Math.min(2, weight));
  }

  public reset(): void {
    this.lastParameters = null;
    this.smoothingBuffer.clear();
  }
}