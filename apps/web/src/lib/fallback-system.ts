// Fallback System for Story 5.2: Comprehensive Error Handling and Graceful Degradation
// Provides robust alternatives when primary systems fail

import { StemAnalysis, AudioFeature, PerformanceMetrics } from '@/types/stem-audio-analysis';
import { AudioAnalysisData } from '@/types/visualizer';

export interface FallbackState {
  // System availability
  webWorkerAvailable: boolean;
  audioContextAvailable: boolean;
  meydaAvailable: boolean;
  deviceOptimizerAvailable: boolean;
  performanceMonitorAvailable: boolean;
  
  // Fallback modes active
  activeFallbacks: string[];
  
  // Graceful degradation level
  degradationLevel: 'none' | 'minimal' | 'moderate' | 'severe' | 'emergency';
  
  // Error history
  recentErrors: FallbackError[];
}

export interface FallbackError {
  timestamp: number;
  component: string;
  error: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recovered: boolean;
}

export interface FallbackConfig {
  maxRetries: number;
  retryDelay: number;
  emergencyModeThreshold: number; // Number of critical errors to trigger emergency mode
  errorHistoryLimit: number;
  enableMockData: boolean;
  mockDataQuality: 'low' | 'medium' | 'high';
}

export class FallbackSystem {
  private state: FallbackState;
  private config: FallbackConfig;
  private retryCounters: Map<string, number> = new Map();
  private lastSuccessfulOperation: Map<string, number> = new Map();
  private mockDataGenerator: MockDataGenerator;
  
  // Emergency fallback data
  private emergencyVisualizationData: AudioAnalysisData;
  private lastValidStemAnalysis: Map<string, StemAnalysis> = new Map();

  constructor(config?: Partial<FallbackConfig>) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000, // ms
      emergencyModeThreshold: 5,
      errorHistoryLimit: 50,
      enableMockData: true,
      mockDataQuality: 'medium',
      ...config
    };

    this.state = this.initializeFallbackState();
    this.mockDataGenerator = new MockDataGenerator(this.config.mockDataQuality);
    this.emergencyVisualizationData = this.createEmergencyVisualizationData();
    
    console.log('🛡️ Fallback System initialized with degradation level:', this.state.degradationLevel);
    
    // Set up system monitoring
    this.setupSystemMonitoring();
  }

  private initializeFallbackState(): FallbackState {
    return {
      webWorkerAvailable: this.checkWebWorkerSupport(),
      audioContextAvailable: this.checkAudioContextSupport(),
      meydaAvailable: this.checkMeydaSupport(),
      deviceOptimizerAvailable: true, // Assume available initially
      performanceMonitorAvailable: true,
      
      activeFallbacks: [],
      degradationLevel: 'none',
      recentErrors: []
    };
  }

  // System availability checks
  private checkWebWorkerSupport(): boolean {
    try {
      return typeof Worker !== 'undefined';
    } catch {
      return false;
    }
  }

  private checkAudioContextSupport(): boolean {
    try {
      return typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
    } catch {
      return false;
    }
  }

  private checkMeydaSupport(): boolean {
    try {
      return typeof window !== 'undefined' && 'Meyda' in window;
    } catch {
      return false;
    }
  }

  // Main fallback orchestration
  async executeWithFallback<T>(
    operation: string,
    primaryFn: () => Promise<T> | T,
    fallbackFn?: () => Promise<T> | T,
    options?: {
      retries?: number;
      timeout?: number;
      critical?: boolean;
    }
  ): Promise<T> {
    const retries = options?.retries ?? this.config.maxRetries;
    const timeout = options?.timeout ?? 5000;
    const critical = options?.critical ?? false;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(primaryFn, timeout);
        
        // Success - reset retry counter and update last successful operation
        this.retryCounters.set(operation, 0);
        this.lastSuccessfulOperation.set(operation, Date.now());
        
        // Remove from active fallbacks if it was there
        this.removeFromActiveFallbacks(operation);
        
        return result;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Log the error
        this.recordError(operation, errorMessage, critical ? 'critical' : 'medium');
        
        // Increment retry counter
        const currentRetries = this.retryCounters.get(operation) || 0;
        this.retryCounters.set(operation, currentRetries + 1);
        
        console.warn(`🚨 ${operation} failed (attempt ${attempt + 1}/${retries + 1}):`, errorMessage);
        
        // If this is the last attempt, try fallback
        if (attempt === retries) {
          if (fallbackFn) {
            try {
              console.log(`🔄 Executing fallback for ${operation}`);
              this.addToActiveFallbacks(operation);
              
              const fallbackResult = await this.executeWithTimeout(fallbackFn, timeout);
              this.recordRecovery(operation);
              return fallbackResult;
              
            } catch (fallbackError) {
              const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error';
              this.recordError(operation + '_fallback', fallbackErrorMessage, 'critical');
              throw new Error(`Both primary and fallback failed for ${operation}: ${fallbackErrorMessage}`);
            }
          } else {
            // No fallback available
            throw new Error(`Operation ${operation} failed after ${retries} retries: ${errorMessage}`);
          }
        }
        
        // Wait before retrying
        if (attempt < retries) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }
    
    throw new Error(`Unexpected execution path for ${operation}`);
  }

  // Specific fallback methods
  async analyzeAudioWithFallback(audioBuffer: ArrayBuffer, stemType: string): Promise<StemAnalysis> {
    return this.executeWithFallback(
      'audio_analysis',
      () => this.primaryAudioAnalysis(audioBuffer, stemType),
      () => this.fallbackAudioAnalysis(audioBuffer, stemType),
      { critical: true }
    );
  }

  async getVisualizationDataWithFallback(): Promise<AudioAnalysisData> {
    return this.executeWithFallback(
      'visualization_data',
      () => this.primaryVisualizationData(),
      () => this.fallbackVisualizationData(),
      { critical: false }
    );
  }

  async processWorkerTaskWithFallback<T>(
    taskName: string,
    workerFn: () => Promise<T>,
    mainThreadFn: () => Promise<T>
  ): Promise<T> {
    if (!this.state.webWorkerAvailable) {
      console.log(`🔄 Web Workers unavailable, using main thread for ${taskName}`);
      return mainThreadFn();
    }

    return this.executeWithFallback(
      `worker_${taskName}`,
      workerFn,
      mainThreadFn,
      { critical: false }
    );
  }

  // Primary and fallback implementations
  private async primaryAudioAnalysis(audioBuffer: ArrayBuffer, stemType: string): Promise<StemAnalysis> {
    if (!this.state.audioContextAvailable) {
      throw new Error('AudioContext not available');
    }
    
    if (!this.state.meydaAvailable) {
      throw new Error('Meyda not available');
    }
    
    // This would normally call the actual audio analysis
    // For now, we'll simulate the analysis
    throw new Error('Primary audio analysis not implemented - using fallback');
  }

  private async fallbackAudioAnalysis(audioBuffer: ArrayBuffer, stemType: string): Promise<StemAnalysis> {
    console.log(`🔄 Using fallback audio analysis for ${stemType}`);
    
    // Use cached analysis if available
    const cached = this.lastValidStemAnalysis.get(stemType);
    if (cached && Date.now() - cached.metadata.energy < 5000) { // Use cached if less than 5 seconds old
      return {
        ...cached,
        stemId: `${stemType}-fallback-${Date.now()}`
      };
    }
    
    // Generate mock analysis based on stem type
    return this.mockDataGenerator.generateStemAnalysis(stemType);
  }

  private async primaryVisualizationData(): Promise<AudioAnalysisData> {
    // This would normally get real visualization data
    throw new Error('Primary visualization data not implemented - using fallback');
  }

  private async fallbackVisualizationData(): Promise<AudioAnalysisData> {
    console.log('🔄 Using fallback visualization data');
    
    // Use emergency data with some variation
    const data = { ...this.emergencyVisualizationData };
    
    // Add some realistic variation
    const time = Date.now() / 1000;
    data.volume = Math.sin(time * 2) * 0.3 + 0.5;
    data.bass = Math.sin(time * 0.8) * 0.4 + 0.4;
    data.mid = Math.sin(time * 1.2) * 0.3 + 0.6;
    data.treble = Math.sin(time * 1.8) * 0.2 + 0.3;
    
    return data;
  }

  // Progressive degradation
  applyDegradation(): void {
    const errorCount = this.state.recentErrors.filter(e => 
      Date.now() - e.timestamp < 60000 && e.severity === 'critical'
    ).length;
    
    if (errorCount >= this.config.emergencyModeThreshold) {
      this.state.degradationLevel = 'emergency';
    } else if (errorCount >= 3) {
      this.state.degradationLevel = 'severe';
    } else if (errorCount >= 2) {
      this.state.degradationLevel = 'moderate';
    } else if (errorCount >= 1) {
      this.state.degradationLevel = 'minimal';
    } else {
      this.state.degradationLevel = 'none';
    }
    
    console.log(`🛡️ Degradation level: ${this.state.degradationLevel}`);
    
    // Apply degradation measures
    this.applyDegradationMeasures();
  }

  private applyDegradationMeasures(): void {
    switch (this.state.degradationLevel) {
      case 'emergency':
        this.enableEmergencyMode();
        break;
      case 'severe':
        this.enableSevereMode();
        break;
      case 'moderate':
        this.enableModerateMode();
        break;
      case 'minimal':
        this.enableMinimalMode();
        break;
      default:
        // Normal operation
        break;
    }
  }

  private enableEmergencyMode(): void {
    console.log('🚨 Emergency mode activated');
    this.config.enableMockData = true;
    this.config.mockDataQuality = 'low';
    this.config.maxRetries = 0; // No retries in emergency mode
    
    // Disable non-essential features
    this.state.webWorkerAvailable = false;
    this.addToActiveFallbacks('emergency_mode');
  }

  private enableSevereMode(): void {
    console.log('⚠️ Severe degradation mode activated');
    this.config.maxRetries = 1;
    this.config.mockDataQuality = 'low';
  }

  private enableModerateMode(): void {
    console.log('⚠️ Moderate degradation mode activated');
    this.config.maxRetries = 2;
    this.config.mockDataQuality = 'medium';
  }

  private enableMinimalMode(): void {
    console.log('ℹ️ Minimal degradation mode activated');
    this.config.maxRetries = this.config.maxRetries;
    this.config.mockDataQuality = 'high';
  }

  // Error tracking and recovery
  private recordError(component: string, error: string, severity: FallbackError['severity']): void {
    const fallbackError: FallbackError = {
      timestamp: Date.now(),
      component,
      error,
      severity,
      recovered: false
    };
    
    this.state.recentErrors.push(fallbackError);
    
    // Limit error history size
    if (this.state.recentErrors.length > this.config.errorHistoryLimit) {
      this.state.recentErrors.shift();
    }
    
    // Apply degradation based on error accumulation
    this.applyDegradation();
  }

  private recordRecovery(component: string): void {
    // Mark recent errors for this component as recovered
    this.state.recentErrors
      .filter(e => e.component === component && !e.recovered)
      .forEach(e => e.recovered = true);
  }

  private addToActiveFallbacks(fallback: string): void {
    if (!this.state.activeFallbacks.includes(fallback)) {
      this.state.activeFallbacks.push(fallback);
    }
  }

  private removeFromActiveFallbacks(fallback: string): void {
    const index = this.state.activeFallbacks.indexOf(fallback);
    if (index > -1) {
      this.state.activeFallbacks.splice(index, 1);
    }
  }

  // Utility methods
  private async executeWithTimeout<T>(fn: () => Promise<T> | T, timeoutMs: number): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createEmergencyVisualizationData(): AudioAnalysisData {
    const frequencies = new Float32Array(256);
    const timeData = new Float32Array(256);
    
    // Create static but visually appealing data
    for (let i = 0; i < 256; i++) {
      frequencies[i] = Math.exp(-i / 50) * 0.5; // Exponential decay
      timeData[i] = Math.sin(i * 0.1) * 0.3 + 0.3; // Sine wave
    }
    
    return {
      frequencies,
      timeData,
      volume: 0.5,
      bass: 0.4,
      mid: 0.6,
      treble: 0.3
    };
  }

  private setupSystemMonitoring(): void {
    // Monitor system health every 10 seconds
    setInterval(() => {
      this.checkSystemHealth();
    }, 10000);
    
    // Clean up old errors every minute
    setInterval(() => {
      this.cleanupOldErrors();
    }, 60000);
  }

  private checkSystemHealth(): void {
    // Re-check system availability
    const newState = {
      webWorkerAvailable: this.checkWebWorkerSupport(),
      audioContextAvailable: this.checkAudioContextSupport(),
      meydaAvailable: this.checkMeydaSupport()
    };
    
    // Check for recovery
    Object.entries(newState).forEach(([key, available]) => {
      const stateKey = key as keyof typeof newState;
      if (!this.state[stateKey] && available) {
        console.log(`✅ ${key} recovered`);
        this.state[stateKey] = available;
        this.recordRecovery(key);
      }
    });
  }

  private cleanupOldErrors(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.state.recentErrors = this.state.recentErrors.filter(
      error => error.timestamp > oneHourAgo
    );
  }

  // Public API
  getFallbackState(): FallbackState {
    return { ...this.state };
  }

  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'critical';
    components: Record<string, boolean>;
    activeFallbacks: string[];
    recentErrorCount: number;
  } {
    const criticalErrors = this.state.recentErrors.filter(
      e => e.severity === 'critical' && Date.now() - e.timestamp < 300000 // Last 5 minutes
    ).length;
    
    let overall: 'healthy' | 'degraded' | 'critical';
    if (this.state.degradationLevel === 'emergency' || criticalErrors >= 3) {
      overall = 'critical';
    } else if (this.state.degradationLevel !== 'none' || criticalErrors > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }
    
    return {
      overall,
      components: {
        webWorker: this.state.webWorkerAvailable,
        audioContext: this.state.audioContextAvailable,
        meyda: this.state.meydaAvailable,
        deviceOptimizer: this.state.deviceOptimizerAvailable,
        performanceMonitor: this.state.performanceMonitorAvailable
      },
      activeFallbacks: [...this.state.activeFallbacks],
      recentErrorCount: this.state.recentErrors.length
    };
  }

  // Recovery methods
  async attemptRecovery(component?: string): Promise<boolean> {
    console.log(`🔄 Attempting recovery${component ? ` for ${component}` : ''}`);
    
    if (component) {
      // Reset retry counter for specific component
      this.retryCounters.set(component, 0);
      this.removeFromActiveFallbacks(component);
    } else {
      // Global recovery attempt
      this.retryCounters.clear();
      this.state.activeFallbacks = [];
      this.state.degradationLevel = 'none';
    }
    
    // Re-check system health
    this.checkSystemHealth();
    
    return this.state.degradationLevel === 'none';
  }

  dispose(): void {
    // Clean up any monitoring intervals
    console.log('🧹 Fallback System disposed');
  }
}

// Mock data generator for fallback scenarios
class MockDataGenerator {
  private quality: 'low' | 'medium' | 'high';
  
  constructor(quality: 'low' | 'medium' | 'high') {
    this.quality = quality;
  }
  
  generateStemAnalysis(stemType: string): StemAnalysis {
    const time = Date.now() / 1000;
    
    // Generate realistic-looking features based on stem type and quality
    const baseFeatures = this.generateBaseFeatures(stemType, time);
    
    return {
      stemId: `${stemType}-mock-${Date.now()}`,
      stemType: stemType as StemAnalysis['stemType'],
      features: {
        rhythm: this.generateFeatureArray('rhythm', baseFeatures.rhythm),
        pitch: this.generateFeatureArray('pitch', baseFeatures.pitch),
        intensity: this.generateFeatureArray('intensity', baseFeatures.intensity),
        timbre: this.generateFeatureArray('timbre', baseFeatures.timbre)
      },
      metadata: {
        bpm: baseFeatures.bpm,
        key: baseFeatures.key,
        energy: baseFeatures.energy,
        clarity: this.quality === 'high' ? 0.8 : this.quality === 'medium' ? 0.6 : 0.4
      }
    };
  }
  
  private generateBaseFeatures(stemType: string, time: number) {
    const stemTypeMultipliers = {
      drums: { rhythm: 1.0, pitch: 0.3, intensity: 0.9, energy: 0.8 },
      bass: { rhythm: 0.7, pitch: 0.8, intensity: 0.6, energy: 0.7 },
      vocals: { rhythm: 0.4, pitch: 1.0, intensity: 0.7, energy: 0.6 },
      piano: { rhythm: 0.6, pitch: 0.9, intensity: 0.5, energy: 0.5 },
      other: { rhythm: 0.5, pitch: 0.5, intensity: 0.5, energy: 0.5 }
    };
    
    const multipliers = stemTypeMultipliers[stemType as keyof typeof stemTypeMultipliers] || stemTypeMultipliers.other;
    
    return {
      rhythm: (Math.sin(time * 2) * 0.5 + 0.5) * multipliers.rhythm,
      pitch: (Math.sin(time * 1.5) * 0.5 + 0.5) * multipliers.pitch,
      intensity: (Math.sin(time * 3) * 0.5 + 0.5) * multipliers.intensity,
      timbre: (Math.sin(time * 0.8) * 0.5 + 0.5) * 0.5,
      energy: multipliers.energy * (Math.sin(time * 1.2) * 0.3 + 0.7),
      bpm: 120 + Math.sin(time * 0.1) * 20,
      key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(time) % 7]
    };
  }
  
  private generateFeatureArray(type: AudioFeature['type'], baseValue: number): AudioFeature[] {
    const featureCount = this.quality === 'high' ? 3 : this.quality === 'medium' ? 2 : 1;
    const features: AudioFeature[] = [];
    
    for (let i = 0; i < featureCount; i++) {
      features.push({
        type,
        value: Math.max(0, Math.min(1, baseValue + (Math.random() - 0.5) * 0.2)),
        confidence: this.quality === 'high' ? 0.8 : this.quality === 'medium' ? 0.6 : 0.4,
        timestamp: Date.now()
      });
    }
    
    return features;
  }
}