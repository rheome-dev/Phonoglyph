import { AudioFeatures } from './audio-to-midi-adapter';
import { StemType } from '@/types/stem-visualization';

export interface PerformanceConfig {
  targetFPS: number;
  maxMemoryUsage: number; // MB
  adaptiveQuality: boolean;
  frameSkipThreshold: number; // ms
  memoryCheckInterval: number; // frames
  qualityLevels: QualityLevel[];
  enableProfiling: boolean;
}

export interface QualityLevel {
  name: string;
  maxParticles: number;
  updateInterval: number; // ms between updates
  smoothingFactor: number;
  enableEffects: boolean;
  maxEffects: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  droppedFrames: number;
  activeEffects: number;
  currentQuality: string;
  processingTime: {
    audioAnalysis: number;
    parameterMapping: number;
    visualization: number;
    total: number;
  };
}

export class PerformanceOptimizer {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private droppedFrames: number = 0;
  private currentQualityIndex: number = 2; // Start at medium quality
  
  // Performance monitoring
  private frameTimeHistory: number[] = [];
  private memoryCheckCounter: number = 0;
  private lastMemoryCheck: number = 0;
  
  // Timing tracking
  private timingProfiles: Map<string, number[]> = new Map();
  private currentTimings: Map<string, number> = new Map();
  
  // Adaptive features
  private qualityAdjustCooldown: number = 0;
  private readonly qualityAdjustDelay = 120; // frames (2 seconds at 60fps)

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      targetFPS: 60,
      maxMemoryUsage: 200, // 200MB
      adaptiveQuality: true,
      frameSkipThreshold: 33, // Skip if frame takes more than 33ms (30fps)
      memoryCheckInterval: 60, // Check every 60 frames (1 second at 60fps)
      qualityLevels: [
        {
          name: 'potato',
          maxParticles: 1000,
          updateInterval: 50,
          smoothingFactor: 0.5,
          enableEffects: false,
          maxEffects: 0
        },
        {
          name: 'low',
          maxParticles: 2500,
          updateInterval: 33,
          smoothingFactor: 0.3,
          enableEffects: true,
          maxEffects: 1
        },
        {
          name: 'medium',
          maxParticles: 5000,
          updateInterval: 16,
          smoothingFactor: 0.2,
          enableEffects: true,
          maxEffects: 2
        },
        {
          name: 'high',
          maxParticles: 10000,
          updateInterval: 16,
          smoothingFactor: 0.1,
          enableEffects: true,
          maxEffects: 3
        },
        {
          name: 'ultra',
          maxParticles: 20000,
          updateInterval: 8,
          smoothingFactor: 0.05,
          enableEffects: true,
          maxEffects: 5
        }
      ],
      enableProfiling: true,
      ...config
    };

    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      droppedFrames: 0,
      activeEffects: 0,
      currentQuality: this.config.qualityLevels[this.currentQualityIndex].name,
      processingTime: {
        audioAnalysis: 0,
        parameterMapping: 0,
        visualization: 0,
        total: 0
      }
    };
  }

  public startFrame(): void {
    this.lastFrameTime = performance.now();
    this.frameCount++;
    
    if (this.config.enableProfiling) {
      this.currentTimings.clear();
    }
  }

  public endFrame(): boolean {
    const frameTime = performance.now() - this.lastFrameTime;
    this.frameTimeHistory.push(frameTime);
    
    // Keep only last 60 frames for FPS calculation
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }

    // Calculate FPS
    const avgFrameTime = this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
    this.metrics.fps = 1000 / avgFrameTime;
    this.metrics.frameTime = avgFrameTime;

    // Check if frame should be skipped
    if (frameTime > this.config.frameSkipThreshold) {
      this.droppedFrames++;
      this.metrics.droppedFrames = this.droppedFrames;
      
      // Trigger adaptive quality adjustment if enabled
      if (this.config.adaptiveQuality && this.qualityAdjustCooldown <= 0) {
        this.adjustQualityDown();
        this.qualityAdjustCooldown = this.qualityAdjustDelay;
      }
      
      return false; // Skip this frame
    }

    // Update timing metrics if profiling is enabled
    if (this.config.enableProfiling) {
      this.updateTimingMetrics();
    }

    // Periodic memory check
    this.memoryCheckCounter++;
    if (this.memoryCheckCounter >= this.config.memoryCheckInterval) {
      this.checkMemoryUsage();
      this.memoryCheckCounter = 0;
    }

    // Update quality adjustment cooldown
    if (this.qualityAdjustCooldown > 0) {
      this.qualityAdjustCooldown--;
    }

    // Adaptive quality improvement check
    if (this.config.adaptiveQuality && this.qualityAdjustCooldown <= 0) {
      this.checkQualityUpgrade();
    }

    return true; // Frame should be processed
  }

  public startProfiling(operation: string): void {
    if (!this.config.enableProfiling) return;
    this.currentTimings.set(operation, performance.now());
  }

  public endProfiling(operation: string): void {
    if (!this.config.enableProfiling) return;
    
    const startTime = this.currentTimings.get(operation);
    if (startTime !== undefined) {
      const duration = performance.now() - startTime;
      
      if (!this.timingProfiles.has(operation)) {
        this.timingProfiles.set(operation, []);
      }
      
      const history = this.timingProfiles.get(operation)!;
      history.push(duration);
      
      // Keep only last 30 measurements
      if (history.length > 30) {
        history.shift();
      }
      
      // Update metrics
      const avgTime = history.reduce((sum, time) => sum + time, 0) / history.length;
      switch (operation) {
        case 'audioAnalysis':
          this.metrics.processingTime.audioAnalysis = avgTime;
          break;
        case 'parameterMapping':
          this.metrics.processingTime.parameterMapping = avgTime;
          break;
        case 'visualization':
          this.metrics.processingTime.visualization = avgTime;
          break;
      }
    }
  }

  public optimizeAudioFeatures(
    features: Record<StemType, AudioFeatures>,
    adaptiveMode: boolean = true
  ): Record<StemType, AudioFeatures> {
    if (!adaptiveMode) return features;

    this.startProfiling('audioAnalysis');
    
    const currentQuality = this.getCurrentQuality();
    const optimized: Record<StemType, AudioFeatures> = {} as Record<StemType, AudioFeatures>;

    // Optimize based on current quality level
    (Object.keys(features) as StemType[]).forEach((stemType) => {
      const stemFeatures = features[stemType];
      const stem = stemType;
      
      optimized[stem] = {
        ...stemFeatures,
        // Reduce MFCC complexity for lower quality
        mfcc: currentQuality.name === 'potato' || currentQuality.name === 'low' 
          ? stemFeatures.mfcc.slice(0, 3)
          : stemFeatures.mfcc,
        // Simplify beat detection for lower quality
        beats: currentQuality.name === 'potato'
          ? stemFeatures.beats.slice(0, Math.max(1, Math.floor(stemFeatures.beats.length / 2)))
          : stemFeatures.beats
      };
    });

    this.endProfiling('audioAnalysis');
    return optimized;
  }

  public shouldUpdateVisualization(): boolean {
    const currentQuality = this.getCurrentQuality();
    const timeSinceLastUpdate = performance.now() - this.lastMemoryCheck;
    
    return timeSinceLastUpdate >= currentQuality.updateInterval;
  }

  public getOptimalParticleCount(): number {
    const currentQuality = this.getCurrentQuality();
    const baseCount = currentQuality.maxParticles;
    
    // Adjust based on current performance
    if (this.metrics.fps < this.config.targetFPS * 0.8) {
      return Math.floor(baseCount * 0.7);
    } else if (this.metrics.fps > this.config.targetFPS * 1.1) {
      return Math.min(baseCount * 1.2, currentQuality.maxParticles);
    }
    
    return baseCount;
  }

  public getOptimalEffectCount(): number {
    const currentQuality = this.getCurrentQuality();
    return currentQuality.maxEffects;
  }

  public shouldEnableEffects(): boolean {
    const currentQuality = this.getCurrentQuality();
    return currentQuality.enableEffects && this.metrics.fps >= this.config.targetFPS * 0.9;
  }

  public getOptimalSmoothingFactor(): number {
    const currentQuality = this.getCurrentQuality();
    return currentQuality.smoothingFactor;
  }

  private updateTimingMetrics(): void {
    const total = this.metrics.processingTime.audioAnalysis + 
                  this.metrics.processingTime.parameterMapping + 
                  this.metrics.processingTime.visualization;
    this.metrics.processingTime.total = total;
  }

  private checkMemoryUsage(): void {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memInfo = (performance as any).memory;
      this.metrics.memoryUsage = memInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
      
      if (this.metrics.memoryUsage > this.config.maxMemoryUsage) {
        this.triggerGarbageCollection();
        this.adjustQualityDown();
      }
    }
    
    this.lastMemoryCheck = performance.now();
  }

  private adjustQualityDown(): void {
    if (this.currentQualityIndex > 0) {
      this.currentQualityIndex--;
      this.metrics.currentQuality = this.config.qualityLevels[this.currentQualityIndex].name;
      console.log(`🔽 Performance: Quality reduced to ${this.metrics.currentQuality}`);
    }
  }

  private checkQualityUpgrade(): void {
    // Only upgrade if performance is consistently good
    if (this.metrics.fps > this.config.targetFPS * 1.1 && 
        this.frameTimeHistory.length >= 30 &&
        this.frameTimeHistory.every(time => time < this.config.frameSkipThreshold * 0.8)) {
      
      if (this.currentQualityIndex < this.config.qualityLevels.length - 1) {
        this.currentQualityIndex++;
        this.metrics.currentQuality = this.config.qualityLevels[this.currentQualityIndex].name;
        this.qualityAdjustCooldown = this.qualityAdjustDelay * 2; // Longer cooldown for upgrades
        console.log(`🔼 Performance: Quality upgraded to ${this.metrics.currentQuality}`);
      }
    }
  }

  private triggerGarbageCollection(): void {
    // Clear timing history to free memory
    this.timingProfiles.forEach(history => {
      if (history.length > 10) {
        history.splice(0, history.length - 10);
      }
    });
    
    // Force garbage collection if available (development only)
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
  }

  private getCurrentQuality(): QualityLevel {
    return this.config.qualityLevels[this.currentQualityIndex];
  }

  // Public API methods
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public setQualityLevel(qualityName: string): boolean {
    const index = this.config.qualityLevels.findIndex(q => q.name === qualityName);
    if (index !== -1) {
      this.currentQualityIndex = index;
      this.metrics.currentQuality = qualityName;
      return true;
    }
    return false;
  }

  public getAvailableQualityLevels(): string[] {
    return this.config.qualityLevels.map(q => q.name);
  }

  public setTargetFPS(fps: number): void {
    this.config.targetFPS = Math.max(15, Math.min(120, fps));
  }

  public enableAdaptiveQuality(enabled: boolean): void {
    this.config.adaptiveQuality = enabled;
  }

  public reset(): void {
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.frameTimeHistory = [];
    this.qualityAdjustCooldown = 0;
    this.timingProfiles.clear();
    this.currentTimings.clear();
    this.metrics.droppedFrames = 0;
  }

  public getDetailedReport(): string {
    const quality = this.getCurrentQuality();
    return `
Performance Report:
- FPS: ${this.metrics.fps.toFixed(1)} / ${this.config.targetFPS}
- Frame Time: ${this.metrics.frameTime.toFixed(2)}ms
- Quality: ${this.metrics.currentQuality}
- Dropped Frames: ${this.metrics.droppedFrames}
- Memory Usage: ${this.metrics.memoryUsage.toFixed(1)}MB / ${this.config.maxMemoryUsage}MB
- Particles: ${quality.maxParticles}
- Effects: ${quality.maxEffects} (enabled: ${quality.enableEffects})
- Processing Times:
  * Audio Analysis: ${this.metrics.processingTime.audioAnalysis.toFixed(2)}ms
  * Parameter Mapping: ${this.metrics.processingTime.parameterMapping.toFixed(2)}ms  
  * Visualization: ${this.metrics.processingTime.visualization.toFixed(2)}ms
  * Total: ${this.metrics.processingTime.total.toFixed(2)}ms
    `;
  }
}