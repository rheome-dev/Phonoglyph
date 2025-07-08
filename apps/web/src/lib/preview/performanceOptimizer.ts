export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  averageFrameTime: number;
  memoryUsage: number;
  droppedFrames: number;
  totalFrames: number;
  cpuUsage?: number;
}

export interface PreviewSettings {
  quality: 'draft' | 'medium' | 'high';
  resolution: number;
  fps: number;
  disableEffects: boolean;
  enableThrottling: boolean;
  maxLayers: number;
}

export interface AdaptiveQualityConfig {
  targetFps: number;
  minFps: number;
  maxFps: number;
  fpsThresholds: {
    high: number;    // Switch to high quality above this FPS
    medium: number;  // Switch to medium quality above this FPS
    draft: number;   // Switch to draft quality above this FPS
  };
  adaptationDelay: number; // ms to wait before adapting
  enableAutoAdaptation: boolean;
}

const DEFAULT_CONFIG: AdaptiveQualityConfig = {
  targetFps: 30,
  minFps: 15,
  maxFps: 60,
  fpsThresholds: {
    high: 28,
    medium: 20,
    draft: 10
  },
  adaptationDelay: 2000,
  enableAutoAdaptation: true
};

export class PreviewPerformanceOptimizer {
  private frameTimeHistory: number[] = [];
  private lastFrameTime: number = 0;
  private droppedFrames: number = 0;
  private totalFrames: number = 0;
  private config: AdaptiveQualityConfig;
  private currentSettings: PreviewSettings;
  private lastAdaptationTime: number = 0;
  private performanceMonitoringEnabled: boolean = true;
  
  // Performance monitoring
  private observer?: PerformanceObserver;
  private memoryMonitor?: any;
  
  constructor(config?: Partial<AdaptiveQualityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentSettings = this.getDefaultSettings();
    this.initializePerformanceMonitoring();
  }
  
  private getDefaultSettings(): PreviewSettings {
    return {
      quality: 'medium',
      resolution: 0.5,
      fps: 30,
      disableEffects: false,
      enableThrottling: false,
      maxLayers: 10
    };
  }
  
  private initializePerformanceMonitoring(): void {
    if (!this.performanceMonitoringEnabled) return;
    
    // Monitor frame timing
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'measure') {
              this.updateFrameTime(entry.duration);
            }
          });
        });
        
        this.observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
    
    // Monitor memory usage (if available)
    if ('memory' in performance) {
      this.memoryMonitor = setInterval(() => {
        this.monitorMemoryUsage();
      }, 5000); // Check every 5 seconds
    }
  }
  
  updateFrameTime(frameTime?: number): void {
    const now = performance.now();
    
    if (frameTime !== undefined) {
      // Explicit frame time provided
      this.frameTimeHistory.push(frameTime);
    } else if (this.lastFrameTime > 0) {
      // Calculate from timestamp
      const calculatedFrameTime = now - this.lastFrameTime;
      this.frameTimeHistory.push(calculatedFrameTime);
    }
    
    this.lastFrameTime = now;
    this.totalFrames++;
    
    // Keep only last 60 frame times for rolling average
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    
    // Check for dropped frames
    if (this.frameTimeHistory.length > 0) {
      const lastFrameTime = this.frameTimeHistory[this.frameTimeHistory.length - 1];
      const expectedFrameTime = 1000 / this.config.targetFps;
      
      if (lastFrameTime > expectedFrameTime * 1.5) {
        this.droppedFrames++;
      }
    }
    
    // Trigger adaptation if needed
    if (this.config.enableAutoAdaptation) {
      this.considerAdaptation();
    }
  }
  
  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      // If memory usage is above 80%, consider reducing quality
      if (memoryUsage > 0.8 && this.currentSettings.quality !== 'draft') {
        this.adaptForMemoryPressure();
      }
    }
  }
  
  private adaptForMemoryPressure(): void {
    const now = performance.now();
    if (now - this.lastAdaptationTime < this.config.adaptationDelay) return;
    
    console.log('Adapting for memory pressure');
    
    if (this.currentSettings.quality === 'high') {
      this.updateSettings({ quality: 'medium', resolution: 0.5 });
    } else if (this.currentSettings.quality === 'medium') {
      this.updateSettings({ quality: 'draft', resolution: 0.25, disableEffects: true });
    }
    
    this.lastAdaptationTime = now;
  }
  
  getCurrentFPS(): number {
    if (this.frameTimeHistory.length < 10) return this.config.targetFps;
    
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    return Math.round(1000 / avgFrameTime);
  }
  
  getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    return this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
  }
  
  getPerformanceMetrics(): PerformanceMetrics {
    const currentFps = this.getCurrentFPS();
    const avgFrameTime = this.getAverageFrameTime();
    const lastFrameTime = this.frameTimeHistory[this.frameTimeHistory.length - 1] || 0;
    
    let memoryUsage = 0;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    
    return {
      fps: currentFps,
      frameTime: lastFrameTime,
      averageFrameTime: avgFrameTime,
      memoryUsage,
      droppedFrames: this.droppedFrames,
      totalFrames: this.totalFrames
    };
  }
  
  private considerAdaptation(): void {
    const now = performance.now();
    if (now - this.lastAdaptationTime < this.config.adaptationDelay) return;
    
    const currentFps = this.getCurrentFPS();
    const targetQuality = this.getOptimalQuality(currentFps);
    
    if (targetQuality !== this.currentSettings.quality) {
      console.log(`Adapting quality: ${this.currentSettings.quality} -> ${targetQuality} (FPS: ${currentFps})`);
      this.adaptToQuality(targetQuality);
      this.lastAdaptationTime = now;
    }
  }
  
  private getOptimalQuality(fps: number): 'draft' | 'medium' | 'high' {
    const thresholds = this.config.fpsThresholds;
    
    if (fps >= thresholds.high) {
      return 'high';
    } else if (fps >= thresholds.medium) {
      return 'medium';
    } else {
      return 'draft';
    }
  }
  
  private adaptToQuality(quality: 'draft' | 'medium' | 'high'): void {
    switch (quality) {
      case 'draft':
        this.updateSettings({
          quality: 'draft',
          resolution: 0.25,
          fps: 15,
          disableEffects: true,
          enableThrottling: true,
          maxLayers: 5
        });
        break;
      case 'medium':
        this.updateSettings({
          quality: 'medium',
          resolution: 0.5,
          fps: 30,
          disableEffects: false,
          enableThrottling: false,
          maxLayers: 10
        });
        break;
      case 'high':
        this.updateSettings({
          quality: 'high',
          resolution: 1.0,
          fps: 30,
          disableEffects: false,
          enableThrottling: false,
          maxLayers: 20
        });
        break;
    }
  }
  
  updateSettings(settings: Partial<PreviewSettings>): void {
    this.currentSettings = { ...this.currentSettings, ...settings };
    
    // Emit settings change event for components to react
    window.dispatchEvent(new CustomEvent('preview-settings-changed', {
      detail: this.currentSettings
    }));
  }
  
  getCurrentSettings(): PreviewSettings {
    return { ...this.currentSettings };
  }
  
  forceQuality(quality: 'draft' | 'medium' | 'high'): void {
    this.config.enableAutoAdaptation = false;
    this.adaptToQuality(quality);
  }
  
  enableAutoAdaptation(): void {
    this.config.enableAutoAdaptation = true;
  }
  
  disableAutoAdaptation(): void {
    this.config.enableAutoAdaptation = false;
  }
  
  reset(): void {
    this.frameTimeHistory = [];
    this.droppedFrames = 0;
    this.totalFrames = 0;
    this.lastFrameTime = 0;
    this.lastAdaptationTime = 0;
  }
  
  updateConfig(config: Partial<AdaptiveQualityConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  // Utility methods for performance analysis
  getDroppedFrameRate(): number {
    return this.totalFrames > 0 ? this.droppedFrames / this.totalFrames : 0;
  }
  
  isPerformingWell(): boolean {
    const fps = this.getCurrentFPS();
    const droppedRate = this.getDroppedFrameRate();
    
    return fps >= this.config.targetFps * 0.8 && droppedRate < 0.05; // Less than 5% dropped frames
  }
  
  getPerformanceScore(): number {
    // Return a score from 0-100 based on performance
    const fps = this.getCurrentFPS();
    const fpsScore = Math.min(100, (fps / this.config.targetFps) * 100);
    
    const droppedRate = this.getDroppedFrameRate();
    const stabilityScore = Math.max(0, 100 - (droppedRate * 2000)); // Heavily penalize dropped frames
    
    return Math.round((fpsScore + stabilityScore) / 2);
  }
  
  // Resource management
  dispose(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
    
    this.performanceMonitoringEnabled = false;
  }
  
  // Benchmarking utilities
  async runPerformanceBenchmark(duration: number = 5000): Promise<PerformanceMetrics> {
    console.log(`Running performance benchmark for ${duration}ms...`);
    
    this.reset();
    const startTime = performance.now();
    
    // Simulate frame updates
    const benchmarkInterval = setInterval(() => {
      this.updateFrameTime();
    }, 1000 / this.config.targetFps);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        clearInterval(benchmarkInterval);
        const metrics = this.getPerformanceMetrics();
        console.log('Benchmark completed:', metrics);
        resolve(metrics);
      }, duration);
    });
  }
  
  // Performance recommendations
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getPerformanceMetrics();
    
    if (metrics.fps < this.config.targetFps * 0.8) {
      recommendations.push('Consider reducing preview quality to improve frame rate');
    }
    
    if (metrics.memoryUsage > 500) { // 500MB
      recommendations.push('High memory usage detected. Consider restarting the preview');
    }
    
    if (this.getDroppedFrameRate() > 0.1) {
      recommendations.push('High dropped frame rate. Reduce complexity or disable effects');
    }
    
    if (this.currentSettings.quality === 'high' && metrics.fps < 25) {
      recommendations.push('Consider switching to medium quality for better performance');
    }
    
    return recommendations;
  }
}