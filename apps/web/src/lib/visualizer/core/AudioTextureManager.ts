import * as THREE from 'three';

/**
 * AudioTextureManager - GPU-based audio feature pipeline
 * 
 * This system implements the key optimization from modV analysis:
 * Instead of updating individual shader uniforms every frame (CPU overhead),
 * we pack all audio features into textures and pass them to shaders once.
 * 
 * Benefits:
 * - Eliminates per-frame uniform updates (major CPU bottleneck)
 * - Allows shaders to access hundreds of features simultaneously
 * - Enables GPU-based feature interpolation and processing
 * - Scales to complex multi-stem analysis without performance degradation
 */

export interface AudioFeatureData {
  [stemType: string]: {
    [featureName: string]: number[];
  };
}

export interface AudioTextureConfig {
  textureWidth: number;
  textureHeight: number;
  maxFeatures: number;
  maxTimeSteps: number;
}

export class AudioTextureManager {
  private gl: WebGLRenderingContext;
  private audioTexture!: THREE.DataTexture;
  private featureTexture!: THREE.DataTexture;
  private timeTexture!: THREE.DataTexture;

  // Texture data arrays
  private audioData!: Float32Array;
  private featureData!: Float32Array;
  private timeData!: Float32Array;
  
  // Configuration
  private config: AudioTextureConfig;
  
  // Feature mapping for efficient lookups
  private featureMap: Map<string, { stemIndex: number; featureIndex: number }> = new Map();
  private stemTypes: string[] = [];
  
  // Current playback state
  private currentTime: number = 0;
  private lastUpdateTime: number = 0;
  
  constructor(renderer: THREE.WebGLRenderer, config: Partial<AudioTextureConfig> = {}) {
    this.gl = renderer.getContext();
    
    // Default configuration optimized for real-time performance
    this.config = {
      textureWidth: 256,    // 256 time steps (good for ~10 seconds at 25fps)
      textureHeight: 64,    // 64 features max (16 stems × 4 features each)
      maxFeatures: 64,
      maxTimeSteps: 256,
      ...config
    };
    
    this.initializeTextures();
  }
  
  private initializeTextures(): void {
    const { textureWidth, textureHeight } = this.config;
    
    // Main audio features texture (RGBA = 4 features per pixel)
    // Layout: X = time, Y = feature index, RGBA = feature values
    this.audioData = new Float32Array(textureWidth * textureHeight * 4);
    this.audioTexture = new THREE.DataTexture(
      this.audioData,
      textureWidth,
      textureHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.audioTexture.needsUpdate = true;
    this.audioTexture.magFilter = THREE.LinearFilter;
    this.audioTexture.minFilter = THREE.LinearFilter;
    this.audioTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.audioTexture.wrapT = THREE.ClampToEdgeWrapping;
    
    // Feature metadata texture (stem types, feature names, etc.)
    this.featureData = new Float32Array(textureHeight * 4);
    this.featureTexture = new THREE.DataTexture(
      this.featureData,
      1,
      textureHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.featureTexture.needsUpdate = true;
    
    // Time synchronization texture
    this.timeData = new Float32Array(4);
    this.timeTexture = new THREE.DataTexture(
      this.timeData,
      1,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.timeTexture.needsUpdate = true;
  }
  
  /**
   * Load cached audio analysis data into GPU textures
   */
  public loadAudioAnalysis(analysisData: AudioFeatureData): void {
    console.log('🎵 Loading audio analysis into GPU textures...');
    
    // Build feature mapping
    this.buildFeatureMapping(analysisData);
    
    // Pack features into texture
    this.packFeaturesIntoTexture(analysisData);
    
    console.log(`✅ Loaded ${this.featureMap.size} features for ${this.stemTypes.length} stems`);
  }
  
  private buildFeatureMapping(analysisData: AudioFeatureData): void {
    this.featureMap.clear();
    this.stemTypes = Object.keys(analysisData);
    
    let featureIndex = 0;
    
    for (let stemIndex = 0; stemIndex < this.stemTypes.length; stemIndex++) {
      const stemType = this.stemTypes[stemIndex];
      const stemData = analysisData[stemType];
      
      for (const featureName of Object.keys(stemData)) {
        const featureKey = `${stemType}-${featureName}`;
        this.featureMap.set(featureKey, { stemIndex, featureIndex });
        featureIndex++;
        
        if (featureIndex >= this.config.maxFeatures) {
          console.warn(`⚠️ Feature limit reached (${this.config.maxFeatures}). Some features will be skipped.`);
          return;
        }
      }
    }
  }
  
  private packFeaturesIntoTexture(analysisData: AudioFeatureData): void {
    const { textureWidth, textureHeight } = this.config;
    
    // Clear texture data
    this.audioData.fill(0);
    
    // Pack each feature's time series data
    for (const [featureKey, mapping] of this.featureMap) {
      const [stemType, featureName] = featureKey.split('-');
      const featureValues = analysisData[stemType]?.[featureName];
      
      if (!featureValues) continue;
      
      const { featureIndex } = mapping;
      const rowIndex = Math.floor(featureIndex / 4); // 4 features per row (RGBA)
      const channelIndex = featureIndex % 4;
      
      // Resample feature data to fit texture width
      const sampleCount = Math.min(featureValues.length, textureWidth);
      
      for (let timeIndex = 0; timeIndex < sampleCount; timeIndex++) {
        const textureIndex = (rowIndex * textureWidth + timeIndex) * 4 + channelIndex;
        
        // Normalize feature values to 0-1 range for better GPU precision
        const normalizedValue = this.normalizeFeatureValue(featureValues[timeIndex], featureName);
        this.audioData[textureIndex] = normalizedValue;
      }
    }
    
    this.audioTexture.needsUpdate = true;
  }
  
  private normalizeFeatureValue(value: number, featureName: string): number {
    // Feature-specific normalization for optimal GPU precision
    switch (true) {
      case featureName.includes('rms'):
        return Math.min(value * 2.0, 1.0); // RMS is typically 0-0.5
      case featureName.includes('spectralCentroid'):
        return Math.min(value / 8000.0, 1.0); // Spectral centroid up to 8kHz
      case featureName.includes('spectralRolloff'):
        return Math.min(value / 16000.0, 1.0); // Rolloff up to 16kHz
      case featureName.includes('loudness'):
        return Math.min((value + 60) / 60.0, 1.0); // Loudness -60dB to 0dB
      default:
        return Math.min(Math.max(value, 0), 1.0); // Clamp to 0-1
    }
  }
  
  /**
   * Update time synchronization for shader access
   */
  public updateTime(currentTime: number, duration: number): void {
    this.currentTime = currentTime;
    
    // Update time texture with current playback state
    this.timeData[0] = currentTime; // Current time in seconds
    this.timeData[1] = duration; // Total duration
    this.timeData[2] = currentTime / duration; // Normalized progress (0-1)
    this.timeData[3] = performance.now() / 1000.0; // Absolute time for animations
    
    this.timeTexture.needsUpdate = true;
  }
  
  /**
   * Get shader uniforms for texture-based audio access
   */
  public getShaderUniforms(): Record<string, THREE.IUniform> {
    return {
      // Main audio features texture
      uAudioTexture: { value: this.audioTexture },
      
      // Feature metadata
      uFeatureTexture: { value: this.featureTexture },
      
      // Time synchronization
      uTimeTexture: { value: this.timeTexture },
      
      // Texture dimensions for shader calculations
      uAudioTextureSize: { value: new THREE.Vector2(this.config.textureWidth, this.config.textureHeight) },
      
      // Feature mapping info
      uFeatureCount: { value: this.featureMap.size },
      uStemCount: { value: this.stemTypes.length }
    };
  }
  
  /**
   * Get feature index for shader lookup
   */
  public getFeatureIndex(stemType: string, featureName: string): number {
    const featureKey = `${stemType}-${featureName}`;
    return this.featureMap.get(featureKey)?.featureIndex ?? -1;
  }
  
  /**
   * Generate shader code for audio feature access
   */
  public getShaderCode(): string {
    return `
      // Audio texture sampling functions
      uniform sampler2D uAudioTexture;
      uniform sampler2D uTimeTexture;
      uniform vec2 uAudioTextureSize;
      uniform float uFeatureCount;
      
      // Sample audio feature at current time
      float sampleAudioFeature(float featureIndex) {
        vec4 timeData = texture2D(uTimeTexture, vec2(0.5));
        float normalizedTime = timeData.z; // Normalized progress (0-1)
        
        float rowIndex = floor(featureIndex / 4.0);
        float channelIndex = mod(featureIndex, 4.0);
        
        vec2 uv = vec2(normalizedTime, rowIndex / uAudioTextureSize.y);
        vec4 featureData = texture2D(uAudioTexture, uv);
        
        // Extract the correct channel
        if (channelIndex < 0.5) return featureData.r;
        else if (channelIndex < 1.5) return featureData.g;
        else if (channelIndex < 2.5) return featureData.b;
        else return featureData.a;
      }
      
      // Sample audio feature with custom time offset
      float sampleAudioFeatureAtTime(float featureIndex, float timeOffset) {
        vec4 timeData = texture2D(uTimeTexture, vec2(0.5));
        float normalizedTime = clamp(timeData.z + timeOffset, 0.0, 1.0);
        
        float rowIndex = floor(featureIndex / 4.0);
        float channelIndex = mod(featureIndex, 4.0);
        
        vec2 uv = vec2(normalizedTime, rowIndex / uAudioTextureSize.y);
        vec4 featureData = texture2D(uAudioTexture, uv);
        
        if (channelIndex < 0.5) return featureData.r;
        else if (channelIndex < 1.5) return featureData.g;
        else if (channelIndex < 2.5) return featureData.b;
        else return featureData.a;
      }
    `;
  }
  
  /**
   * Cleanup GPU resources
   */
  public dispose(): void {
    this.audioTexture.dispose();
    this.featureTexture.dispose();
    this.timeTexture.dispose();
  }
}
