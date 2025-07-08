import { SyncManager } from './SyncManager';
import { SyncStatus, SyncPoint } from '@/types/hybrid-control';

interface SyncMetrics {
  averageOffset: number;
  offsetStdDev: number;
  driftRate: number;
  syncPointCount: number;
  qualityScore: number;
  lastSyncTime: number;
  isStable: boolean;
}

interface SyncAlert {
  id: string;
  type: 'drift' | 'quality' | 'disconnect' | 'unstable';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export class SyncMonitor {
  private syncManager: SyncManager;
  private metrics: SyncMetrics;
  private alerts: SyncAlert[] = [];
  private metricsHistory: SyncMetrics[] = [];
  private maxHistoryLength = 100;
  private monitoringInterval: number | null = null;
  private isMonitoring = false;
  
  // Thresholds for alerts
  private thresholds = {
    driftWarning: 0.010,      // 10ms drift warning
    driftCritical: 0.050,     // 50ms drift critical
    qualityWarning: 0.6,      // Quality below 60%
    qualityCritical: 0.3,     // Quality below 30%
    disconnectTimeout: 10000,  // 10 seconds without sync
    instabilityCount: 5        // 5 consecutive poor samples
  };
  
  private consecutivePoorSamples = 0;
  
  constructor(syncManager: SyncManager) {
    this.syncManager = syncManager;
    this.metrics = this.initializeMetrics();
    console.log('📊 SyncMonitor initialized');
  }
  
  /**
   * Start continuous sync monitoring
   */
  startMonitoring(intervalMs = 1000): void {
    if (this.isMonitoring) {
      console.warn('⚠️ SyncMonitor already running');
      return;
    }
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.checkForAlerts();
    }, intervalMs) as unknown as number;
    
    console.log(`📈 SyncMonitor started (${intervalMs}ms interval)`);
  }
  
  /**
   * Stop sync monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('📉 SyncMonitor stopped');
  }
  
  /**
   * Get current sync metrics
   */
  getCurrentMetrics(): SyncMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }
  
  /**
   * Get sync metrics history
   */
  getMetricsHistory(): SyncMetrics[] {
    return [...this.metricsHistory];
  }
  
  /**
   * Get active alerts
   */
  getActiveAlerts(): SyncAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }
  
  /**
   * Get all alerts
   */
  getAllAlerts(): SyncAlert[] {
    return [...this.alerts];
  }
  
  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`✅ Alert acknowledged: ${alert.message}`);
      return true;
    }
    return false;
  }
  
  /**
   * Clear all acknowledged alerts
   */
  clearAcknowledgedAlerts(): void {
    const count = this.alerts.length;
    this.alerts = this.alerts.filter(alert => !alert.acknowledged);
    const cleared = count - this.alerts.length;
    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} acknowledged alerts`);
    }
  }
  
  /**
   * Get sync quality assessment
   */
  getSyncQualityAssessment(): {
    overall: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const metrics = this.getCurrentMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    let score = 1.0;
    
    // Check drift
    if (Math.abs(metrics.averageOffset) > this.thresholds.driftCritical) {
      score *= 0.3;
      issues.push(`High drift: ${(metrics.averageOffset * 1000).toFixed(1)}ms`);
      recommendations.push('Manually adjust sync offset or recalibrate');
    } else if (Math.abs(metrics.averageOffset) > this.thresholds.driftWarning) {
      score *= 0.7;
      issues.push(`Moderate drift: ${(metrics.averageOffset * 1000).toFixed(1)}ms`);
      recommendations.push('Monitor drift and consider sync adjustment');
    }
    
    // Check quality
    if (metrics.qualityScore < this.thresholds.qualityCritical) {
      score *= 0.2;
      issues.push(`Very low sync quality: ${(metrics.qualityScore * 100).toFixed(0)}%`);
      recommendations.push('Check audio and MIDI signal quality');
    } else if (metrics.qualityScore < this.thresholds.qualityWarning) {
      score *= 0.6;
      issues.push(`Low sync quality: ${(metrics.qualityScore * 100).toFixed(0)}%`);
      recommendations.push('Verify audio/MIDI timing alignment');
    }
    
    // Check stability
    if (!metrics.isStable) {
      score *= 0.5;
      issues.push('Unstable synchronization detected');
      recommendations.push('Check for timing inconsistencies in input sources');
    }
    
    // Check disconnect
    const timeSinceLastSync = Date.now() - metrics.lastSyncTime;
    if (timeSinceLastSync > this.thresholds.disconnectTimeout) {
      score *= 0.1;
      issues.push('No recent sync points detected');
      recommendations.push('Verify MIDI and audio sources are active');
    }
    
    // Check sync point count
    if (metrics.syncPointCount < 2) {
      score *= 0.4;
      issues.push('Insufficient sync points for accurate timing');
      recommendations.push('Allow more time for sync point collection');
    }
    
    // Determine overall rating
    let overall: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (score > 0.9) overall = 'excellent';
    else if (score > 0.7) overall = 'good';
    else if (score > 0.5) overall = 'fair';
    else if (score > 0.3) overall = 'poor';
    else overall = 'critical';
    
    return {
      overall,
      score: Math.max(0, Math.min(1, score)),
      issues,
      recommendations
    };
  }
  
  /**
   * Export sync analytics data
   */
  exportAnalytics(): string {
    const data = {
      exportedAt: new Date().toISOString(),
      currentMetrics: this.getCurrentMetrics(),
      metricsHistory: this.getMetricsHistory(),
      alerts: this.getAllAlerts(),
      qualityAssessment: this.getSyncQualityAssessment(),
      thresholds: this.thresholds
    };
    
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * Reset all monitoring data
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.metricsHistory = [];
    this.alerts = [];
    this.consecutivePoorSamples = 0;
    console.log('🔄 SyncMonitor reset');
  }
  
  /**
   * Update monitoring thresholds
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('⚙️ SyncMonitor thresholds updated');
  }
  
  // Private methods
  
  private updateMetrics(): void {
    const syncStatus = this.syncManager.getSyncStatus();
    const timingStats = this.syncManager.getTimingStats();
    
    // Calculate metrics from sync data
    this.metrics = {
      averageOffset: syncStatus.offset,
      offsetStdDev: this.calculateOffsetStdDev(),
      driftRate: syncStatus.drift,
      syncPointCount: timingStats.syncPointCount,
      qualityScore: syncStatus.quality,
      lastSyncTime: syncStatus.lastUpdate,
      isStable: this.assessStability(syncStatus)
    };
    
    // Add to history
    this.metricsHistory.push({ ...this.metrics });
    if (this.metricsHistory.length > this.maxHistoryLength) {
      this.metricsHistory.shift();
    }
  }
  
  private calculateOffsetStdDev(): number {
    if (this.metricsHistory.length < 2) return 0;
    
    const offsets = this.metricsHistory.map(m => m.averageOffset);
    const mean = offsets.reduce((sum, offset) => sum + offset, 0) / offsets.length;
    const variance = offsets.reduce((sum, offset) => sum + Math.pow(offset - mean, 2), 0) / offsets.length;
    
    return Math.sqrt(variance);
  }
  
  private assessStability(syncStatus: SyncStatus): boolean {
    // Check if sync quality is consistently good
    const recentMetrics = this.metricsHistory.slice(-5);
    if (recentMetrics.length < 3) return false;
    
    const avgQuality = recentMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / recentMetrics.length;
    const avgDrift = recentMetrics.reduce((sum, m) => sum + Math.abs(m.driftRate), 0) / recentMetrics.length;
    
    return avgQuality > 0.7 && avgDrift < this.thresholds.driftWarning;
  }
  
  private checkForAlerts(): void {
    const metrics = this.metrics;
    const now = Date.now();
    
    // Check drift alerts
    const absDrift = Math.abs(metrics.driftRate);
    if (absDrift > this.thresholds.driftCritical) {
      this.addAlert('drift', 'high', `Critical drift detected: ${(absDrift * 1000).toFixed(1)}ms`);
    } else if (absDrift > this.thresholds.driftWarning) {
      this.addAlert('drift', 'medium', `Drift warning: ${(absDrift * 1000).toFixed(1)}ms`);
    }
    
    // Check quality alerts
    if (metrics.qualityScore < this.thresholds.qualityCritical) {
      this.addAlert('quality', 'high', `Critical sync quality: ${(metrics.qualityScore * 100).toFixed(0)}%`);
    } else if (metrics.qualityScore < this.thresholds.qualityWarning) {
      this.addAlert('quality', 'medium', `Low sync quality: ${(metrics.qualityScore * 100).toFixed(0)}%`);
    }
    
    // Check disconnect alerts
    const timeSinceLastSync = now - metrics.lastSyncTime;
    if (timeSinceLastSync > this.thresholds.disconnectTimeout) {
      this.addAlert('disconnect', 'high', `No sync points for ${Math.round(timeSinceLastSync / 1000)}s`);
    }
    
    // Check stability alerts
    if (!metrics.isStable) {
      this.consecutivePoorSamples++;
      if (this.consecutivePoorSamples >= this.thresholds.instabilityCount) {
        this.addAlert('unstable', 'medium', `Unstable sync for ${this.consecutivePoorSamples} samples`);
      }
    } else {
      this.consecutivePoorSamples = 0;
    }
  }
  
  private addAlert(type: SyncAlert['type'], severity: SyncAlert['severity'], message: string): void {
    // Don't duplicate recent alerts of the same type
    const recentAlert = this.alerts.find(alert => 
      alert.type === type && 
      !alert.acknowledged && 
      (Date.now() - alert.timestamp) < 5000 // 5 seconds
    );
    
    if (recentAlert) return;
    
    const alert: SyncAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      severity,
      message,
      timestamp: Date.now(),
      acknowledged: false
    };
    
    this.alerts.push(alert);
    console.warn(`🚨 Sync Alert [${severity}]: ${message}`);
    
    // Limit alert history
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }
  
  private initializeMetrics(): SyncMetrics {
    return {
      averageOffset: 0,
      offsetStdDev: 0,
      driftRate: 0,
      syncPointCount: 0,
      qualityScore: 1.0,
      lastSyncTime: Date.now(),
      isStable: false
    };
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopMonitoring();
    this.reset();
    console.log('🧹 SyncMonitor disposed');
  }
}