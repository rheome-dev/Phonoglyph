// Visualization Performance Monitor for Story 5.3: Stem-based Visualization Control
// Real-time performance tracking and optimization recommendations

// Extended performance metrics for visualization
export interface ExtendedVisualizationMetrics {
  frameRate: number;
  memoryUsage: number;
  lastUpdateLatency: number;
  parameterUpdatesPerSecond: number;
  gpuMemoryUsage: number;
  renderTime: number;
  mappingComputeTime: number;
  // GPU metrics
  gpuUtilization: number;
  renderCallsPerFrame: number;
  trianglesPerFrame: number;
  textureMemoryUsage: number;
  
  // CPU metrics
  cpuUsage: number;
  workerThreadUsage: number;
  mainThreadUsage: number;
  
  // Audio processing metrics
  audioBufferUnderruns: number;
  audioLatency: number;
  analysisLatency: number;
  
  // Network/storage metrics
  presetLoadTime: number;
  assetLoadTime: number;
  storageOperationTime: number;
  
  // User experience metrics
  inputLag: number;
  parameterUpdateLatency: number;
  visualResponseTime: number;
  
  // System health
  memoryLeaks: number;
  errorCount: number;
  warningCount: number;
  
  timestamp: number;
}

// Performance alert types
export interface PerformanceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'performance' | 'memory' | 'audio' | 'gpu' | 'user_experience';
  title: string;
  description: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
  canAutoFix: boolean;
  autoFixAction?: () => Promise<void>;
  timestamp: number;
  acknowledged: boolean;
}

// Performance optimization recommendations
export interface OptimizationRecommendation {
  id: string;
  category: 'quality' | 'performance' | 'memory' | 'battery';
  title: string;
  description: string;
  expectedImpact: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  action: () => Promise<boolean>;
  currentValue?: any;
  recommendedValue?: any;
}

// Performance thresholds and targets
export interface PerformanceThresholds {
  targetFrameRate: number;
  minFrameRate: number;
  maxMemoryUsage: number; // MB
  maxGpuMemoryUsage: number; // MB
  maxLatency: number; // ms
  maxAudioLatency: number; // ms
  maxCpuUsage: number; // percentage
  maxInputLag: number; // ms
}

// Performance monitoring configuration
export interface PerformanceMonitorConfig {
  enabled: boolean;
  sampleInterval: number; // ms
  historyLength: number; // number of samples to keep
  alertThresholds: PerformanceThresholds;
  enableAutoOptimization: boolean;
  enablePredictiveAnalysis: boolean;
  debugMode: boolean;
}

// Device capability assessment
export interface DeviceCapabilities {
  deviceClass: 'ultra-high' | 'high' | 'medium' | 'low' | 'potato';
  cpuCores: number;
  estimatedRam: number;
  gpuTier: 'high' | 'medium' | 'low';
  supportsWebGL2: boolean;
  supportsWebAudio: boolean;
  supportsWorkers: boolean;
  supportsSIMD: boolean;
  isMobile: boolean;
  batteryLevel?: number;
  thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
}

export class VisualizationPerformanceMonitor {
  private config: PerformanceMonitorConfig;
  private metricsHistory: ExtendedVisualizationMetrics[] = [];
  private alerts: Map<string, PerformanceAlert> = new Map();
  private recommendations: Map<string, OptimizationRecommendation> = new Map();
  private deviceCapabilities: DeviceCapabilities;
  
  // Performance tracking
  private frameTimestamps: number[] = [];
  private lastFrameTime: number = 0;
  private renderStartTime: number = 0;
  private updateStartTime: number = 0;
  
  // Memory tracking
  private memoryBaseline: number = 0;
  private lastMemoryCheck: number = 0;
  private memoryCheckInterval: number = 5000; // 5 seconds
  
  // Event listeners
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();
  
  // Optimization state
  private autoOptimizationActive: boolean = false;
  private optimizationCooldown: Map<string, number> = new Map();
  
  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    this.config = {
      enabled: true,
      sampleInterval: 1000, // 1 second
      historyLength: 300, // 5 minutes of history
      enableAutoOptimization: false,
      enablePredictiveAnalysis: true,
      debugMode: false,
      alertThresholds: {
        targetFrameRate: 60,
        minFrameRate: 30,
        maxMemoryUsage: 512, // MB
        maxGpuMemoryUsage: 256, // MB
        maxLatency: 50, // ms
        maxAudioLatency: 20, // ms
        maxCpuUsage: 80, // percentage
        maxInputLag: 100 // ms
      },
      ...config
    };

    this.deviceCapabilities = this.assessDeviceCapabilities();
    this.setupPerformanceObservers();
    this.initializeRecommendations();
    
    console.log('📊 VisualizationPerformanceMonitor initialized', {
      deviceClass: this.deviceCapabilities.deviceClass,
      autoOptimization: this.config.enableAutoOptimization
    });
  }

  // Assess device capabilities
  private assessDeviceCapabilities(): DeviceCapabilities {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    // Detect device class based on multiple factors
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory || 4; // GB estimate
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    
    // GPU tier assessment
    let gpuTier: 'high' | 'medium' | 'low' = 'medium';
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (renderer.includes('RTX') || renderer.includes('GTX 1080') || renderer.includes('RX 6')) {
          gpuTier = 'high';
        } else if (renderer.includes('integrated') || renderer.includes('Intel')) {
          gpuTier = 'low';
        }
      }
    }

    // Device class calculation
    let deviceClass: DeviceCapabilities['deviceClass'] = 'medium';
    const score = hardwareConcurrency * 10 + deviceMemory * 5 + (gpuTier === 'high' ? 30 : gpuTier === 'medium' ? 15 : 5);
    
    if (score >= 80) deviceClass = 'ultra-high';
    else if (score >= 60) deviceClass = 'high';
    else if (score >= 40) deviceClass = 'medium';
    else if (score >= 20) deviceClass = 'low';
    else deviceClass = 'potato';

    return {
      deviceClass,
      cpuCores: hardwareConcurrency,
      estimatedRam: deviceMemory * 1024, // Convert to MB
      gpuTier,
      supportsWebGL2: !!canvas.getContext('webgl2'),
      supportsWebAudio: !!(window as any).AudioContext || !!(window as any).webkitAudioContext,
      supportsWorkers: typeof Worker !== 'undefined',
      supportsSIMD: typeof WebAssembly !== 'undefined',
      isMobile,
      batteryLevel: this.getBatteryLevel(),
      thermalState: 'nominal'
    };
  }

  // Setup performance observers
  private setupPerformanceObservers(): void {
    if (!this.config.enabled) return;

    // Frame rate monitoring
    this.monitorFrameRate();
    
    // Memory monitoring
    this.monitorMemoryUsage();
    
    // Long task monitoring
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              this.emitAlert({
                id: `long-task-${Date.now()}`,
                type: 'warning',
                category: 'performance',
                title: 'Long Task Detected',
                description: `Task took ${entry.duration.toFixed(1)}ms`,
                recommendation: 'Consider breaking this operation into smaller chunks',
                impact: 'medium',
                canAutoFix: false,
                timestamp: performance.now(),
                acknowledged: false
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task monitoring not supported:', error);
      }
    }

    // Layout shift monitoring
    if ('PerformanceObserver' in window) {
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as any).value > 0.1) { // CLS threshold
              this.emitAlert({
                id: `layout-shift-${Date.now()}`,
                type: 'warning',
                category: 'user_experience',
                title: 'Layout Shift Detected',
                description: `Cumulative Layout Shift: ${(entry as any).value.toFixed(3)}`,
                recommendation: 'Ensure visual elements have reserved space',
                impact: 'medium',
                canAutoFix: false,
                timestamp: performance.now(),
                acknowledged: false
              });
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Layout shift monitoring not supported:', error);
      }
    }

    // Start regular monitoring
    this.startMetricsCollection();
  }

  // Start regular metrics collection
  private startMetricsCollection(): void {
    setInterval(() => {
      if (this.config.enabled) {
        this.collectMetrics();
      }
    }, this.config.sampleInterval);
  }

  // Monitor frame rate
  private monitorFrameRate(): void {
    const measureFrame = () => {
      const now = performance.now();
      
      if (this.lastFrameTime > 0) {
        const deltaTime = now - this.lastFrameTime;
        this.frameTimestamps.push(now);
        
        // Keep only recent frames (last 2 seconds)
        const cutoff = now - 2000;
        this.frameTimestamps = this.frameTimestamps.filter(timestamp => timestamp > cutoff);
        
        // Check for frame drops
        if (deltaTime > 33.33) { // Dropped below 30fps
          const currentFps = 1000 / deltaTime;
          if (currentFps < this.config.alertThresholds.minFrameRate) {
            this.emitAlert({
              id: `low-fps-${Date.now()}`,
              type: 'warning',
              category: 'performance',
              title: 'Low Frame Rate',
              description: `FPS dropped to ${currentFps.toFixed(1)}`,
              recommendation: 'Consider reducing visual quality or complexity',
              impact: 'high',
              canAutoFix: true,
              autoFixAction: async () => {
                await this.applyPerformanceOptimizations();
              },
              timestamp: now,
              acknowledged: false
            });
          }
        }
      }
      
      this.lastFrameTime = now;
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
  }

  // Monitor memory usage
  private monitorMemoryUsage(): void {
    const checkMemory = () => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
        
        if (usedMB > this.config.alertThresholds.maxMemoryUsage) {
          this.emitAlert({
            id: `high-memory-${Date.now()}`,
            type: 'critical',
            category: 'memory',
            title: 'High Memory Usage',
            description: `Memory usage: ${usedMB.toFixed(1)}MB`,
            recommendation: 'Consider reducing particle count or clearing unused resources',
            impact: 'high',
            canAutoFix: true,
            autoFixAction: async () => {
              await this.freeUpMemory();
            },
            timestamp: performance.now(),
            acknowledged: false
          });
        }
        
        // Detect memory leaks
        if (this.memoryBaseline === 0) {
          this.memoryBaseline = usedMB;
        } else {
          const growth = usedMB - this.memoryBaseline;
          if (growth > 100) { // 100MB growth
            this.emitAlert({
              id: `memory-leak-${Date.now()}`,
              type: 'critical',
              category: 'memory',
              title: 'Potential Memory Leak',
              description: `Memory grew by ${growth.toFixed(1)}MB`,
              recommendation: 'Check for unreleased resources or event listeners',
              impact: 'high',
              canAutoFix: false,
              timestamp: performance.now(),
              acknowledged: false
            });
            this.memoryBaseline = usedMB; // Reset baseline
          }
        }
      }
      
      setTimeout(checkMemory, this.memoryCheckInterval);
    };
    
    setTimeout(checkMemory, this.memoryCheckInterval);
  }

  // Collect comprehensive metrics
  private collectMetrics(): ExtendedVisualizationMetrics {
    const now = performance.now();
    const frameRate = this.calculateFrameRate();
    const memory = this.getMemoryMetrics();
    const gpu = this.getGPUMetrics();
    const audio = this.getAudioMetrics();
    
    const metrics: ExtendedVisualizationMetrics = {
      // Basic metrics
      frameRate,
      memoryUsage: memory.used,
      lastUpdateLatency: this.updateStartTime > 0 ? now - this.updateStartTime : 0,
      parameterUpdatesPerSecond: 0, // Will be set by visualization controller
      gpuMemoryUsage: 0, // Will be set by GPU metrics
      renderTime: 0, // Will be set by render timing
      mappingComputeTime: 0, // Will be set by mapping compute time
      
      // Extended metrics
      gpuUtilization: gpu.utilization,
      renderCallsPerFrame: gpu.renderCalls,
      trianglesPerFrame: gpu.triangles,
      textureMemoryUsage: gpu.textureMemory,
      
      cpuUsage: this.getCPUUsage(),
      workerThreadUsage: 0, // Would need worker integration
      mainThreadUsage: this.getMainThreadUsage(),
      
      audioBufferUnderruns: audio.underruns,
      audioLatency: audio.latency,
      analysisLatency: audio.analysisLatency,
      
      presetLoadTime: 0, // Set by preset manager
      assetLoadTime: 0, // Set by asset loader
      storageOperationTime: 0, // Set by storage operations
      
      inputLag: this.calculateInputLag(),
      parameterUpdateLatency: 0, // Set by controllers
      visualResponseTime: this.calculateVisualResponseTime(),
      
      memoryLeaks: this.detectMemoryLeaks(),
      errorCount: this.getErrorCount(),
      warningCount: this.getWarningCount(),
      
      timestamp: now
    };

    // Add to history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.config.historyLength) {
      this.metricsHistory.shift();
    }

    // Analyze metrics and generate recommendations
    this.analyzeMetrics(metrics);
    
    // Emit metrics event
    this.emit('metrics', metrics);
    
    if (this.config.debugMode) {
      console.log('📊 Performance metrics:', metrics);
    }
    
    return metrics;
  }

  // Calculate current frame rate
  private calculateFrameRate(): number {
    if (this.frameTimestamps.length < 2) return 0;
    
    const now = performance.now();
    const recentFrames = this.frameTimestamps.filter(timestamp => timestamp > now - 1000);
    return recentFrames.length;
  }

  // Get memory metrics
  private getMemoryMetrics() {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / (1024 * 1024),
        total: memory.totalJSHeapSize / (1024 * 1024),
        limit: memory.jsHeapSizeLimit / (1024 * 1024)
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }

  // Get GPU metrics (estimated)
  private getGPUMetrics() {
    // These would be more accurate with WebGL extensions
    return {
      memory: 0, // Would need GPU memory API
      utilization: 0, // Would need GPU utilization API
      renderCalls: 0, // Would be tracked by renderer
      triangles: 0, // Would be tracked by renderer
      textureMemory: 0 // Would be tracked by texture manager
    };
  }

  // Get audio metrics
  private getAudioMetrics() {
    return {
      underruns: 0, // Would be tracked by audio system
      latency: 0, // Would be measured by audio system
      analysisLatency: 0 // Would be measured by analysis system
    };
  }

  // Estimate CPU usage
  private getCPUUsage(): number {
    // This is a rough estimate based on frame timing
    const avgFrameTime = this.getAverageFrameTime();
    const targetFrameTime = 1000 / this.config.alertThresholds.targetFrameRate;
    return Math.min(100, (avgFrameTime / targetFrameTime) * 100);
  }

  // Calculate main thread usage
  private getMainThreadUsage(): number {
    // Based on long tasks and frame timing
    return this.getCPUUsage(); // Simplified
  }

  // Calculate input lag
  private calculateInputLag(): number {
    // Would need to measure time from input event to visual response
    return 0; // Placeholder
  }

  // Calculate visual response time
  private calculateVisualResponseTime(): number {
    // Time from parameter change to visual update
    return this.renderStartTime > 0 ? performance.now() - this.renderStartTime : 0;
  }

  // Get average frame time
  private getAverageFrameTime(): number {
    if (this.frameTimestamps.length < 2) return 0;
    
    const deltas = [];
    for (let i = 1; i < this.frameTimestamps.length; i++) {
      deltas.push(this.frameTimestamps[i] - this.frameTimestamps[i - 1]);
    }
    
    return deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
  }

  // Detect memory leaks
  private detectMemoryLeaks(): number {
    // Simple heuristic based on memory growth
    if (this.metricsHistory.length < 10) return 0;
    
    const recent = this.metricsHistory.slice(-10);
    const growth = recent[recent.length - 1].memoryUsage - recent[0].memoryUsage;
    return growth > 50 ? 1 : 0; // 1 if significant growth detected
  }

  // Get error count
  private getErrorCount(): number {
    return Array.from(this.alerts.values()).filter(alert => alert.type === 'critical').length;
  }

  // Get warning count  
  private getWarningCount(): number {
    return Array.from(this.alerts.values()).filter(alert => alert.type === 'warning').length;
  }

  // Analyze metrics and generate alerts/recommendations
  private analyzeMetrics(metrics: ExtendedVisualizationMetrics): void {
    // Frame rate analysis
    if (metrics.frameRate < this.config.alertThresholds.minFrameRate) {
      this.generateRecommendation('performance', 'Reduce Visual Quality', 
        'Lower particle count or effect complexity to improve frame rate');
    }
    
    // Memory analysis
    if (metrics.memoryUsage > this.config.alertThresholds.maxMemoryUsage * 0.8) {
      this.generateRecommendation('memory', 'Reduce Memory Usage',
        'Clear unused resources or reduce asset quality');
    }
    
    // Latency analysis
    if (metrics.lastUpdateLatency > this.config.alertThresholds.maxLatency) {
      this.generateRecommendation('performance', 'Optimize Update Loop',
        'Reduce computational complexity in update functions');
    }
    
    // Auto-optimization
    if (this.config.enableAutoOptimization && !this.autoOptimizationActive) {
      this.considerAutoOptimization(metrics);
    }
  }

  // Generate optimization recommendations
  private generateRecommendation(category: string, title: string, description: string): void {
    const id = `${category}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    if (!this.recommendations.has(id)) {
      const recommendation: OptimizationRecommendation = {
        id,
        category: category as any,
        title,
        description,
        expectedImpact: 'Performance improvement',
        difficulty: 'easy',
        action: async () => {
          // Implementation would depend on the specific recommendation
          return true;
        }
      };
      
      this.recommendations.set(id, recommendation);
      this.emit('recommendation', recommendation);
    }
  }

  // Consider auto-optimization
  private async considerAutoOptimization(metrics: ExtendedVisualizationMetrics): Promise<void> {
    if (metrics.frameRate < this.config.alertThresholds.minFrameRate * 0.8) {
      // Severe performance issues - apply aggressive optimizations
      await this.applyPerformanceOptimizations();
    }
  }

  // Apply performance optimizations
  private async applyPerformanceOptimizations(): Promise<void> {
    if (this.autoOptimizationActive) return;
    
    this.autoOptimizationActive = true;
    
    try {
      // Reduce particle count
      this.emit('optimize', { type: 'reduce_particles', factor: 0.7 });
      
      // Lower quality settings
      this.emit('optimize', { type: 'reduce_quality', level: 'medium' });
      
      // Disable expensive effects
      this.emit('optimize', { type: 'disable_effects', effects: ['bloom', 'motion_blur'] });
      
      console.log('🔧 Applied automatic performance optimizations');
      
      // Set cooldown
      setTimeout(() => {
        this.autoOptimizationActive = false;
      }, 30000); // 30 second cooldown
      
    } catch (error) {
      console.error('Failed to apply optimizations:', error);
      this.autoOptimizationActive = false;
    }
  }

  // Free up memory
  private async freeUpMemory(): Promise<void> {
    // Clear caches
    this.emit('cleanup', { type: 'clear_caches' });
    
    // Reduce quality
    this.emit('optimize', { type: 'reduce_memory', factor: 0.8 });
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    console.log('🧹 Freed up memory');
  }

  // Initialize default recommendations
  private initializeRecommendations(): void {
    const deviceClass = this.deviceCapabilities.deviceClass;
    
    if (deviceClass === 'low' || deviceClass === 'potato') {
      this.generateRecommendation('quality', 'Use Low Quality Preset',
        'Switch to a low-quality preset optimized for your device');
    }
    
    if (this.deviceCapabilities.isMobile) {
      this.generateRecommendation('battery', 'Enable Battery Saver',
        'Reduce frame rate and effects to conserve battery');
    }
  }

  // Get battery level (if available)
  private getBatteryLevel(): number | undefined {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        return battery.level;
      });
    }
    return undefined;
  }

  // Public API methods
  
  // Start render timing
  startRenderTiming(): void {
    this.renderStartTime = performance.now();
  }

  // End render timing
  endRenderTiming(): void {
    this.renderStartTime = 0;
  }

  // Start update timing
  startUpdateTiming(): void {
    this.updateStartTime = performance.now();
  }

  // End update timing
  endUpdateTiming(): void {
    this.updateStartTime = 0;
  }

  // Get current metrics
  getCurrentMetrics(): ExtendedVisualizationMetrics | null {
    return this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null;
  }

  // Get metrics history
  getMetricsHistory(duration?: number): ExtendedVisualizationMetrics[] {
    if (!duration) return [...this.metricsHistory];
    
    const cutoff = performance.now() - duration;
    return this.metricsHistory.filter(metrics => metrics.timestamp > cutoff);
  }

  // Get active alerts
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.acknowledged);
  }

  // Get recommendations
  getRecommendations(): OptimizationRecommendation[] {
    return Array.from(this.recommendations.values());
  }

  // Acknowledge alert
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert_acknowledged', alert);
    }
  }

  // Emit alert
  private emitAlert(alert: PerformanceAlert): void {
    this.alerts.set(alert.id, alert);
    this.emit('alert', alert);
    
    if (this.config.debugMode) {
      console.warn(`⚠️ Performance Alert: ${alert.title}`, alert);
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

  // Get device capabilities
  getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.deviceCapabilities };
  }

  // Update configuration
  updateConfig(newConfig: Partial<PerformanceMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Updated performance monitor config');
  }

  // Get performance summary
  getPerformanceSummary() {
    const recent = this.getMetricsHistory(60000); // Last minute
    if (recent.length === 0) return null;

    const avgFrameRate = recent.reduce((sum, m) => sum + m.frameRate, 0) / recent.length;
    const avgMemory = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    const avgLatency = recent.reduce((sum, m) => sum + m.lastUpdateLatency, 0) / recent.length;

    return {
      averageFrameRate: avgFrameRate,
      averageMemoryUsage: avgMemory,
      averageLatency: avgLatency,
      alertCount: this.getActiveAlerts().length,
      recommendationCount: this.getRecommendations().length,
      deviceClass: this.deviceCapabilities.deviceClass,
      overallHealth: this.calculateOverallHealth(avgFrameRate, avgMemory, avgLatency)
    };
  }

  // Calculate overall performance health score
  private calculateOverallHealth(frameRate: number, memory: number, latency: number): number {
    let score = 100;
    
    // Frame rate penalty
    if (frameRate < this.config.alertThresholds.targetFrameRate) {
      score -= (this.config.alertThresholds.targetFrameRate - frameRate) * 2;
    }
    
    // Memory penalty
    if (memory > this.config.alertThresholds.maxMemoryUsage * 0.8) {
      score -= 20;
    }
    
    // Latency penalty
    if (latency > this.config.alertThresholds.maxLatency) {
      score -= 15;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Cleanup
  dispose(): void {
    this.eventListeners.clear();
    this.alerts.clear();
    this.recommendations.clear();
    this.metricsHistory.length = 0;
    console.log('🧹 VisualizationPerformanceMonitor disposed');
  }
}

export default VisualizationPerformanceMonitor;