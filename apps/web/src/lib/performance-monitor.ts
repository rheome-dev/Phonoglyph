// Performance Monitor for Story 5.2: Real-time Audio Analysis
// Comprehensive performance tracking and optimization system

import { PerformanceMetrics } from '@/types/stem-audio-analysis';

export interface DetailedPerformanceMetrics extends PerformanceMetrics {
  // Extended metrics
  memoryBreakdown: {
    audioBuffers: number;
    analyzers: number;
    workers: number;
    pipeline: number;
  };
  
  // Timing metrics
  timings: {
    audioDecoding: number;
    featureExtraction: number;
    visualization: number;
    workerCommunication: number;
  };
  
  // Quality metrics
  quality: {
    audioClarityAverage: number;
    featureConfidenceAverage: number;
    crossStemCorrelation: number;
  };
  
  // Device metrics
  device: {
    cpuCores: number;
    availableMemory: number;
    batteryLevel?: number;
    networkSpeed?: string;
    isMobile: boolean;
  };
  
  // Performance alerts
  alerts: PerformanceAlert[];
}

export interface PerformanceAlert {
  level: 'info' | 'warning' | 'critical';
  category: 'performance' | 'memory' | 'quality' | 'device';
  message: string;
  suggestion: string;
  timestamp: number;
}

export interface PerformanceReport {
  timestamp: number;
  duration: number; // Analysis duration in seconds
  metrics: DetailedPerformanceMetrics;
  recommendations: string[];
  score: number; // Overall performance score 0-100
}

export class PerformanceMonitor {
  private metrics: DetailedPerformanceMetrics;
  private metricsHistory: DetailedPerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private startTime: number;
  private lastUpdateTime: number;
  
  // Performance thresholds
  private thresholds = {
    fps: { warning: 45, critical: 25 },
    latency: { warning: 50, critical: 100 }, // ms
    memory: { warning: 100, critical: 150 }, // MB
    frameDrops: { warning: 10, critical: 30 }, // per minute
    cpuUsage: { warning: 70, critical: 90 }, // percentage
    batteryDrain: { warning: 5, critical: 10 } // percentage per hour
  };
  
  // Monitoring intervals
  private monitoringInterval: number | null = null;
  private historyRetentionMinutes = 5;
  
  constructor() {
    this.startTime = performance.now();
    this.lastUpdateTime = this.startTime;
    this.metrics = this.initializeMetrics();
    
    // Start automatic monitoring
    this.startMonitoring();
  }

  private initializeMetrics(): DetailedPerformanceMetrics {
    return {
      // Base metrics
      fps: 0,
      analysisLatency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      frameDrops: 0,
      
      // Extended metrics
      memoryBreakdown: {
        audioBuffers: 0,
        analyzers: 0,
        workers: 0,
        pipeline: 0
      },
      
      timings: {
        audioDecoding: 0,
        featureExtraction: 0,
        visualization: 0,
        workerCommunication: 0
      },
      
      quality: {
        audioClarityAverage: 0,
        featureConfidenceAverage: 0,
        crossStemCorrelation: 0
      },
      
      device: {
        cpuCores: navigator.hardwareConcurrency || 4,
        availableMemory: this.getAvailableMemory(),
        batteryLevel: undefined,
        networkSpeed: this.getNetworkSpeed(),
        isMobile: this.detectMobileDevice()
      },
      
      alerts: []
    };
  }

  // Public API methods
  updateMetrics(newMetrics: Partial<PerformanceMetrics>): void {
    const now = performance.now();
    const timeDelta = now - this.lastUpdateTime;
    
    // Update base metrics
    Object.assign(this.metrics, newMetrics);
    
    // Calculate derived metrics
    this.updateDerivedMetrics(timeDelta);
    
    // Check for performance issues
    this.checkPerformanceThresholds();
    
    // Update history
    this.updateMetricsHistory();
    
    this.lastUpdateTime = now;
  }

  updateTimings(category: keyof DetailedPerformanceMetrics['timings'], value: number): void {
    this.metrics.timings[category] = value;
  }

  updateMemoryBreakdown(breakdown: Partial<DetailedPerformanceMetrics['memoryBreakdown']>): void {
    Object.assign(this.metrics.memoryBreakdown, breakdown);
    
    // Calculate total memory usage
    this.metrics.memoryUsage = Object.values(this.metrics.memoryBreakdown)
      .reduce((sum, val) => sum + val, 0);
  }

  updateQualityMetrics(quality: Partial<DetailedPerformanceMetrics['quality']>): void {
    Object.assign(this.metrics.quality, quality);
  }

  getCurrentMetrics(): DetailedPerformanceMetrics {
    return { ...this.metrics };
  }

  getPerformanceReport(): PerformanceReport {
    const duration = (performance.now() - this.startTime) / 1000;
    const score = this.calculatePerformanceScore();
    const recommendations = this.generateRecommendations();
    
    return {
      timestamp: Date.now(),
      duration,
      metrics: { ...this.metrics },
      recommendations,
      score
    };
  }

  getAlerts(level?: PerformanceAlert['level']): PerformanceAlert[] {
    if (level) {
      return this.alerts.filter(alert => alert.level === level);
    }
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
    this.metrics.alerts = [];
  }

  // Performance analysis methods
  private updateDerivedMetrics(timeDelta: number): void {
    // Update CPU usage estimation
    this.updateCPUUsage();
    
    // Update battery level if available
    this.updateBatteryLevel();
    
    // Update network speed
    this.metrics.device.networkSpeed = this.getNetworkSpeed();
    
    // Calculate average quality metrics
    this.calculateQualityAverages();
  }

  private updateCPUUsage(): void {
    // Estimate CPU usage based on frame timing and analysis latency
    const baseUsage = Math.min(100, (this.metrics.analysisLatency / 16.67) * 30); // Assume 30% max for analysis
    const frameDropPenalty = Math.min(50, this.metrics.frameDrops * 2);
    
    this.metrics.cpuUsage = Math.min(100, baseUsage + frameDropPenalty);
  }

  private updateBatteryLevel(): void {
    // Use Battery API if available
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.metrics.device.batteryLevel = Math.round(battery.level * 100);
      }).catch(() => {
        // Battery API not available
        this.metrics.device.batteryLevel = undefined;
      });
    }
  }

  private calculateQualityAverages(): void {
    if (this.metricsHistory.length === 0) return;
    
    const recent = this.metricsHistory.slice(-10); // Last 10 updates
    
    this.metrics.quality.audioClarityAverage = 
      recent.reduce((sum, m) => sum + m.quality.audioClarityAverage, 0) / recent.length;
      
    this.metrics.quality.featureConfidenceAverage = 
      recent.reduce((sum, m) => sum + m.quality.featureConfidenceAverage, 0) / recent.length;
  }

  private checkPerformanceThresholds(): void {
    const newAlerts: PerformanceAlert[] = [];
    
    // FPS checks
    if (this.metrics.fps < this.thresholds.fps.critical) {
      newAlerts.push(this.createAlert('critical', 'performance', 
        `Critical FPS drop: ${this.metrics.fps}fps`, 
        'Reduce analysis quality or enable mobile optimizations'));
    } else if (this.metrics.fps < this.thresholds.fps.warning) {
      newAlerts.push(this.createAlert('warning', 'performance', 
        `Low FPS detected: ${this.metrics.fps}fps`, 
        'Consider reducing concurrent stem analysis'));
    }
    
    // Latency checks
    if (this.metrics.analysisLatency > this.thresholds.latency.critical) {
      newAlerts.push(this.createAlert('critical', 'performance', 
        `High analysis latency: ${this.metrics.analysisLatency.toFixed(1)}ms`, 
        'Switch to Web Worker processing or reduce buffer size'));
    } else if (this.metrics.analysisLatency > this.thresholds.latency.warning) {
      newAlerts.push(this.createAlert('warning', 'performance', 
        `Elevated latency: ${this.metrics.analysisLatency.toFixed(1)}ms`, 
        'Optimize feature extraction or increase buffer size'));
    }
    
    // Memory checks
    if (this.metrics.memoryUsage > this.thresholds.memory.critical) {
      newAlerts.push(this.createAlert('critical', 'memory', 
        `High memory usage: ${this.metrics.memoryUsage}MB`, 
        'Reduce concurrent stems or clear audio buffer cache'));
    } else if (this.metrics.memoryUsage > this.thresholds.memory.warning) {
      newAlerts.push(this.createAlert('warning', 'memory', 
        `Elevated memory usage: ${this.metrics.memoryUsage}MB`, 
        'Monitor memory growth and consider cleanup'));
    }
    
    // CPU checks
    if (this.metrics.cpuUsage > this.thresholds.cpuUsage.critical) {
      newAlerts.push(this.createAlert('critical', 'performance', 
        `High CPU usage: ${this.metrics.cpuUsage.toFixed(1)}%`, 
        'Enable worker processing or reduce analysis quality'));
    }
    
    // Battery checks (mobile devices)
    if (this.metrics.device.isMobile && this.metrics.device.batteryLevel !== undefined) {
      const batteryDrainRate = this.estimateBatteryDrainRate();
      if (batteryDrainRate > this.thresholds.batteryDrain.critical) {
        newAlerts.push(this.createAlert('critical', 'device', 
          `High battery drain: ${batteryDrainRate.toFixed(1)}%/hour`, 
          'Enable battery optimization mode'));
      }
    }
    
    // Add new alerts
    this.alerts.push(...newAlerts);
    this.metrics.alerts = newAlerts;
    
    // Keep only recent alerts (last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > fiveMinutesAgo);
  }

  private createAlert(level: PerformanceAlert['level'], category: PerformanceAlert['category'], 
                     message: string, suggestion: string): PerformanceAlert {
    return {
      level,
      category,
      message,
      suggestion,
      timestamp: Date.now()
    };
  }

  private calculatePerformanceScore(): number {
    let score = 100;
    
    // FPS penalty
    if (this.metrics.fps < 60) {
      score -= (60 - this.metrics.fps) * 0.5;
    }
    
    // Latency penalty
    if (this.metrics.analysisLatency > 33) {
      score -= (this.metrics.analysisLatency - 33) * 0.2;
    }
    
    // Memory penalty
    if (this.metrics.memoryUsage > 80) {
      score -= (this.metrics.memoryUsage - 80) * 0.1;
    }
    
    // Frame drops penalty
    score -= this.metrics.frameDrops * 0.5;
    
    // Quality bonus
    score += this.metrics.quality.featureConfidenceAverage * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.metrics;
    
    // Performance recommendations
    if (metrics.fps < 45) {
      recommendations.push('Reduce analysis quality or enable worker processing');
    }
    
    if (metrics.analysisLatency > 50) {
      recommendations.push('Increase buffer size or optimize feature extraction');
    }
    
    if (metrics.memoryUsage > 100) {
      recommendations.push('Implement memory cleanup or reduce concurrent stems');
    }
    
    // Device-specific recommendations
    if (metrics.device.isMobile) {
      recommendations.push('Enable mobile optimizations for better battery life');
      
      if (metrics.device.batteryLevel !== undefined && metrics.device.batteryLevel < 20) {
        recommendations.push('Switch to low-power analysis mode');
      }
    }
    
    // Quality recommendations
    if (metrics.quality.audioClarityAverage < 0.7) {
      recommendations.push('Check audio input quality or increase analysis resolution');
    }
    
    if (metrics.quality.crossStemCorrelation < 0.3) {
      recommendations.push('Verify stem separation quality or adjust correlation parameters');
    }
    
    return recommendations;
  }

  // Utility methods
  private getAvailableMemory(): number {
    // Use Performance Memory API if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round((memory.jsHeapSizeLimit - memory.usedJSHeapSize) / (1024 * 1024));
    }
    
    // Fallback estimation based on device type
    return this.detectMobileDevice() ? 512 : 2048; // MB
  }

  private getNetworkSpeed(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private detectMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private estimateBatteryDrainRate(): number {
    // Simplified battery drain estimation
    // In practice, this would track battery level over time
    const baseDrain = this.metrics.device.isMobile ? 2 : 0; // %/hour
    const cpuDrain = (this.metrics.cpuUsage / 100) * 3; // Additional drain from CPU usage
    
    return baseDrain + cpuDrain;
  }

  private updateMetricsHistory(): void {
    this.metricsHistory.push({ ...this.metrics });
    
    // Keep only recent history
    const maxHistoryLength = this.historyRetentionMinutes * 60; // Assuming 1 update per second
    if (this.metricsHistory.length > maxHistoryLength) {
      this.metricsHistory = this.metricsHistory.slice(-maxHistoryLength);
    }
  }

  private startMonitoring(): void {
    // Update device metrics every 5 seconds
    this.monitoringInterval = window.setInterval(() => {
      this.updateBatteryLevel();
      this.checkPerformanceThresholds();
    }, 5000);
  }

  // Performance optimization suggestions
  getOptimizationSuggestions(): {
    immediate: string[];
    quality: string[];
    device: string[];
  } {
    const immediate: string[] = [];
    const quality: string[] = [];
    const device: string[] = [];
    
    // Immediate performance issues
    if (this.metrics.fps < 30) {
      immediate.push('Switch to emergency low-quality mode');
    }
    if (this.metrics.analysisLatency > 100) {
      immediate.push('Disable non-essential features');
    }
    if (this.metrics.memoryUsage > 150) {
      immediate.push('Force garbage collection and clear caches');
    }
    
    // Quality optimizations
    if (this.metrics.quality.featureConfidenceAverage < 0.6) {
      quality.push('Increase analysis buffer size');
      quality.push('Verify audio input quality');
    }
    
    // Device-specific optimizations
    if (this.metrics.device.isMobile) {
      device.push('Enable mobile-specific optimizations');
      device.push('Reduce visual effects complexity');
    }
    
    if (this.metrics.device.availableMemory < 100) {
      device.push('Enable memory conservation mode');
    }
    
    return { immediate, quality, device };
  }

  // Cleanup
  dispose(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.metricsHistory = [];
    this.alerts = [];
  }
}