import * as THREE from 'three';

export interface AudioFeatureData {
  features: Record<string, number[]>;
  duration: number;
  sampleRate: number;
  stemTypes: string[];
}

export interface AudioFeatureMapping {
  featureIndex: number;
  stemType: string;
  featureName: string;
  minValue: number;
  maxValue: number;
}

export class AudioTextureManager {
  private audioTexture: THREE.DataTexture;
  private featureTexture: THREE.DataTexture;
  private timeTexture: THREE.DataTexture;
  
  // Texture layout: X = time, Y = feature index, RGBA = feature values
  private audioData: Float32Array;
  private featureData: Float32Array;
  private timeData: Float32Array;
  
  // Configuration
  private readonly textureWidth = 256;  // Time samples
  private readonly textureHeight = 64;  // Feature rows (16 features per row)
  private readonly maxFeatures = 256;   // 64 rows × 4 channels
  
  // Feature mapping
  private featureMappings: AudioFeatureMapping[] = [];
  private featureIndexMap: Map<string, number> = new Map();
  
  constructor() {
    // Initialize audio data array (256×64×4 = 65,536 values)
    this.audioData = new Float32Array(this.textureWidth * this.textureHeight * 4);
    
    // Initialize feature metadata (64×4 = 256 values)
    this.featureData = new Float32Array(this.textureHeight * 4);
    
    // Initialize time synchronization (4 values: currentTime, duration, normalizedTime, padding)
    this.timeData = new Float32Array(4);
    
    // Create GPU textures
    this.audioTexture = new THREE.DataTexture(
      this.audioData,
      this.textureWidth,
      this.textureHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.audioTexture.needsUpdate = true;
    this.audioTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.audioTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.audioTexture.magFilter = THREE.LinearFilter;
    this.audioTexture.minFilter = THREE.LinearFilter;
    
    this.featureTexture = new THREE.DataTexture(
      this.featureData,
      4,
      this.textureHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.featureTexture.needsUpdate = true;
    this.featureTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.featureTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.featureTexture.magFilter = THREE.NearestFilter;
    this.featureTexture.minFilter = THREE.NearestFilter;
    
    this.timeTexture = new THREE.DataTexture(
      this.timeData,
      1,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.timeTexture.needsUpdate = true;
    this.timeTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.timeTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.timeTexture.magFilter = THREE.NearestFilter;
    this.timeTexture.minFilter = THREE.NearestFilter;
  }
  
  /**
   * Load cached audio analysis into GPU textures
   */
  public loadAudioAnalysis(analysisData: AudioFeatureData): void {
    this.buildFeatureMapping(analysisData);
    this.packFeaturesIntoTexture(analysisData);
  }
  
  /**
   * Build feature mapping from analysis data
   */
  private buildFeatureMapping(analysisData: AudioFeatureData): void {
    this.featureMappings = [];
    this.featureIndexMap.clear();
    
    let featureIndex = 0;
    
    // Map features by stem type and feature name
    for (const stemType of analysisData.stemTypes) {
      const stemFeatures = analysisData.features[stemType];
      if (!stemFeatures) continue;
      
      // Common audio features
      const featureNames = ['rms', 'spectralCentroid', 'spectralRolloff', 'zcr'];
      
      for (const featureName of featureNames) {
        if (featureIndex >= this.maxFeatures) break;
        
        const mapping: AudioFeatureMapping = {
          featureIndex,
          stemType,
          featureName,
          minValue: 0,
          maxValue: 1
        };
        
        this.featureMappings.push(mapping);
        this.featureIndexMap.set(`${stemType}-${featureName}`, featureIndex);
        featureIndex++;
      }
    }
    
    // Pack feature metadata into texture
    this.packFeatureMetadata();
  }
  
  /**
   * Pack feature metadata into feature texture
   */
  private packFeatureMetadata(): void {
    for (let i = 0; i < this.featureMappings.length; i++) {
      const mapping = this.featureMappings[i];
      const row = Math.floor(i / 4);
      const col = i % 4;
      const index = row * 4 + col;
      
      // Store feature index, stem type hash, feature name hash, and value range
      this.featureData[index * 4 + 0] = mapping.featureIndex;
      this.featureData[index * 4 + 1] = this.hashString(mapping.stemType);
      this.featureData[index * 4 + 2] = this.hashString(mapping.featureName);
      this.featureData[index * 4 + 3] = mapping.maxValue - mapping.minValue;
    }
    
    this.featureTexture.needsUpdate = true;
  }
  
  /**
   * Pack audio features into main texture
   */
  private packFeaturesIntoTexture(analysisData: AudioFeatureData): void {
    // Clear texture data
    this.audioData.fill(0);
    
    // Pack features by time and feature index
    for (const mapping of this.featureMappings) {
      const stemFeatures = analysisData.features[mapping.stemType];
      if (!stemFeatures) continue;
      
      const featureData = this.extractFeatureData(stemFeatures, mapping.featureName);
      if (!featureData) continue;
      
      // Pack into texture: X = time, Y = feature row, RGBA = feature values
      const row = Math.floor(mapping.featureIndex / 4);
      const channel = mapping.featureIndex % 4;
      
      for (let timeIndex = 0; timeIndex < Math.min(this.textureWidth, featureData.length); timeIndex++) {
        const textureIndex = (timeIndex + row * this.textureWidth) * 4 + channel;
        const normalizedValue = this.normalizeValue(featureData[timeIndex], mapping.minValue, mapping.maxValue);
        this.audioData[textureIndex] = normalizedValue;
      }
    }
    
    this.audioTexture.needsUpdate = true;
  }
  
  /**
   * Extract specific feature data from stem features
   */
  private extractFeatureData(stemFeatures: number[], featureName: string): number[] | null {
    // This is a simplified extraction - in practice, you'd parse the actual feature data structure
    // For now, we'll use the stem features directly as if they're the requested feature
    return stemFeatures;
  }
  
  /**
   * Update time synchronization (called once per frame)
   */
  public updateTime(currentTime: number, duration: number): void {
    this.timeData[0] = currentTime;
    this.timeData[1] = duration;
    this.timeData[2] = currentTime / duration; // Normalized progress
    this.timeData[3] = 0; // Padding
    
    this.timeTexture.needsUpdate = true;
  }
  
  /**
   * Get shader uniforms for audio texture access
   */
  public getShaderUniforms(): Record<string, THREE.Uniform> {
    return {
      uAudioTexture: new THREE.Uniform(this.audioTexture),
      uFeatureTexture: new THREE.Uniform(this.featureTexture),
      uTimeTexture: new THREE.Uniform(this.timeTexture),
      uAudioTextureSize: new THREE.Uniform(new THREE.Vector2(this.textureWidth, this.textureHeight)),
      uFeatureTextureSize: new THREE.Uniform(new THREE.Vector2(4, this.textureHeight))
    };
  }
  
  /**
   * Generate shader code for audio feature access
   */
  public generateShaderCode(): string {
    return `
      uniform sampler2D uAudioTexture;
      uniform sampler2D uFeatureTexture;
      uniform sampler2D uTimeTexture;
      uniform vec2 uAudioTextureSize;
      uniform vec2 uFeatureTextureSize;
      
      float sampleAudioFeature(float featureIndex) {
        vec4 timeData = texture2D(uTimeTexture, vec2(0.5));
        float normalizedTime = timeData.z;
        
        float rowIndex = floor(featureIndex / 4.0);
        vec2 uv = vec2(normalizedTime, rowIndex / uAudioTextureSize.y);
        vec4 featureData = texture2D(uAudioTexture, uv);
        
        // Extract correct channel based on feature index
        float channelIndex = mod(featureIndex, 4.0);
        if (channelIndex < 0.5) return featureData.r;
        else if (channelIndex < 1.5) return featureData.g;
        else if (channelIndex < 2.5) return featureData.b;
        else return featureData.a;
      }
      
      float sampleAudioFeatureByName(float stemTypeHash, float featureNameHash) {
        // Find feature index by name (simplified - in practice you'd use a lookup table)
        for (float i = 0.0; i < uFeatureTextureSize.y; i++) {
          vec2 featureUv = vec2(0.5, (i + 0.5) / uFeatureTextureSize.y);
          vec4 featureInfo = texture2D(uFeatureTexture, featureUv);
          
          if (featureInfo.y == stemTypeHash && featureInfo.z == featureNameHash) {
            return sampleAudioFeature(featureInfo.x);
          }
        }
        return 0.0;
      }
    `;
  }
  
  /**
   * Get feature value by name (for debugging/testing)
   */
  public getFeatureValue(stemType: string, featureName: string): number {
    const key = `${stemType}-${featureName}`;
    const featureIndex = this.featureIndexMap.get(key);
    if (featureIndex === undefined) return 0;
    
    const row = Math.floor(featureIndex / 4);
    const channel = featureIndex % 4;
    const timeIndex = Math.floor(this.timeData[2] * this.textureWidth);
    const textureIndex = (timeIndex + row * this.textureWidth) * 4 + channel;
    
    return this.audioData[textureIndex] || 0;
  }
  
  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }
  
  /**
   * Normalize value to 0-1 range
   */
  private normalizeValue(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }
  
  /**
   * Dispose of textures
   */
  public dispose(): void {
    this.audioTexture.dispose();
    this.featureTexture.dispose();
    this.timeTexture.dispose();
  }
} 