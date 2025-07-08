export interface SyncState {
  midiPosition: number;    // MIDI playback position in seconds
  audioPosition: number;   // Audio playback position in seconds
  videoPosition: number;   // Video frame position in seconds
  masterPosition: number;  // Master clock position in seconds
  lastSyncTime: number;    // Timestamp of last sync
}

export interface SyncDifferences {
  audioVideo: number;     // Audio - Video difference
  midiVideo: number;      // MIDI - Video difference
  midiAudio: number;      // MIDI - Audio difference
  maxDifference: number;  // Largest difference detected
}

export interface SyncConfig {
  tolerance: number;              // Maximum allowed difference in seconds
  correctionThreshold: number;    // Threshold to trigger correction
  masterClock: 'audio' | 'video' | 'midi' | 'auto';
  enableAutoCorrection: boolean;
  correctionMethod: 'jump' | 'smooth' | 'gradual';
  smoothingFactor: number;        // For smooth corrections (0-1)
  maxCorrectionPerFrame: number;  // Maximum correction per frame
}

export interface SyncEvent {
  type: 'drift' | 'correction' | 'sync-lost' | 'sync-restored';
  timestamp: number;
  differences: SyncDifferences;
  correction?: {
    target: 'audio' | 'video' | 'midi';
    amount: number;
    method: string;
  };
}

const DEFAULT_CONFIG: SyncConfig = {
  tolerance: 0.1,           // 100ms tolerance
  correctionThreshold: 0.05, // 50ms before correction
  masterClock: 'auto',
  enableAutoCorrection: true,
  correctionMethod: 'smooth',
  smoothingFactor: 0.1,
  maxCorrectionPerFrame: 0.016, // ~1 frame at 60fps
};

export class PreviewSyncManager {
  private state: SyncState;
  private config: SyncConfig;
  private syncHistory: SyncEvent[] = [];
  private correctionQueue: Array<{ target: string; amount: number; remaining: number }> = [];
  private isMonitoring: boolean = false;
  private monitoringInterval?: number;
  
  // Event listeners
  private listeners: Map<string, Set<(event: SyncEvent) => void>> = new Map();
  
  constructor(config?: Partial<SyncConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      midiPosition: 0,
      audioPosition: 0,
      videoPosition: 0,
      masterPosition: 0,
      lastSyncTime: performance.now()
    };
    
    this.initializeEventListeners();
  }
  
  private initializeEventListeners(): void {
    // Listen for external sync events
    window.addEventListener('audio-position-update', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.updateAudioPosition(customEvent.detail.position);
    });
    
    window.addEventListener('video-frame-update', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.updateVideoPosition(customEvent.detail.frame, customEvent.detail.fps || 30);
    });
    
    window.addEventListener('midi-position-update', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.updateMIDIPosition(customEvent.detail.position);
    });
  }
  
  startMonitoring(interval: number = 16): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.checkSync();
    }, interval);
  }
  
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
  }
  
  updateMIDIPosition(time: number): void {
    this.state.midiPosition = time;
    this.state.lastSyncTime = performance.now();
    this.updateMasterClock();
    
    if (this.isMonitoring) {
      this.checkSyncImmediate();
    }
  }
  
  updateAudioPosition(time: number): void {
    this.state.audioPosition = time;
    this.state.lastSyncTime = performance.now();
    this.updateMasterClock();
    
    if (this.isMonitoring) {
      this.checkSyncImmediate();
    }
  }
  
  updateVideoPosition(frame: number, fps: number): void {
    this.state.videoPosition = frame / fps;
    this.state.lastSyncTime = performance.now();
    this.updateMasterClock();
    
    if (this.isMonitoring) {
      this.checkSyncImmediate();
    }
  }
  
  private updateMasterClock(): void {
    switch (this.config.masterClock) {
      case 'audio':
        this.state.masterPosition = this.state.audioPosition;
        break;
      case 'video':
        this.state.masterPosition = this.state.videoPosition;
        break;
      case 'midi':
        this.state.masterPosition = this.state.midiPosition;
        break;
      case 'auto':
        // Use the most recently updated position
        this.state.masterPosition = Math.max(
          this.state.audioPosition,
          this.state.videoPosition,
          this.state.midiPosition
        );
        break;
    }
  }
  
  private checkSyncImmediate(): void {
    const differences = this.calculateDifferences();
    
    if (differences.maxDifference > this.config.tolerance) {
      this.handleSyncDrift(differences);
    }
  }
  
  private checkSync(): void {
    const differences = this.calculateDifferences();
    
    // Process any pending corrections
    this.processCorrectionQueue();
    
    // Check for sync drift
    if (differences.maxDifference > this.config.tolerance) {
      this.handleSyncDrift(differences);
    } else if (differences.maxDifference < this.config.correctionThreshold) {
      // Good sync state
      this.emitSyncEvent({
        type: 'sync-restored',
        timestamp: performance.now(),
        differences
      });
    }
  }
  
  private calculateDifferences(): SyncDifferences {
    const audioVideo = this.state.audioPosition - this.state.videoPosition;
    const midiVideo = this.state.midiPosition - this.state.videoPosition;
    const midiAudio = this.state.midiPosition - this.state.audioPosition;
    
    const maxDifference = Math.max(
      Math.abs(audioVideo),
      Math.abs(midiVideo),
      Math.abs(midiAudio)
    );
    
    return {
      audioVideo,
      midiVideo,
      midiAudio,
      maxDifference
    };
  }
  
  private handleSyncDrift(differences: SyncDifferences): void {
    const syncEvent: SyncEvent = {
      type: 'drift',
      timestamp: performance.now(),
      differences
    };
    
    // Add to history
    this.syncHistory.push(syncEvent);
    this.trimHistory();
    
    if (this.config.enableAutoCorrection && differences.maxDifference > this.config.correctionThreshold) {
      this.performCorrection(differences);
    }
    
    this.emitSyncEvent(syncEvent);
  }
  
  private performCorrection(differences: SyncDifferences): void {
    const master = this.determineMasterClock();
    let corrections: Array<{ target: string; amount: number }> = [];
    
    // Determine what needs correction based on master clock
    switch (master) {
      case 'audio':
        if (Math.abs(differences.audioVideo) > this.config.correctionThreshold) {
          corrections.push({ target: 'video', amount: differences.audioVideo });
        }
        if (Math.abs(differences.midiAudio) > this.config.correctionThreshold) {
          corrections.push({ target: 'midi', amount: -differences.midiAudio });
        }
        break;
      case 'video':
        if (Math.abs(differences.audioVideo) > this.config.correctionThreshold) {
          corrections.push({ target: 'audio', amount: -differences.audioVideo });
        }
        if (Math.abs(differences.midiVideo) > this.config.correctionThreshold) {
          corrections.push({ target: 'midi', amount: -differences.midiVideo });
        }
        break;
      case 'midi':
        if (Math.abs(differences.midiAudio) > this.config.correctionThreshold) {
          corrections.push({ target: 'audio', amount: differences.midiAudio });
        }
        if (Math.abs(differences.midiVideo) > this.config.correctionThreshold) {
          corrections.push({ target: 'video', amount: differences.midiVideo });
        }
        break;
    }
    
    // Apply corrections
    corrections.forEach(correction => {
      this.queueCorrection(correction.target, correction.amount);
      
      this.emitSyncEvent({
        type: 'correction',
        timestamp: performance.now(),
        differences,
        correction: {
          target: correction.target as any,
          amount: correction.amount,
          method: this.config.correctionMethod
        }
      });
    });
  }
  
  private determineMasterClock(): 'audio' | 'video' | 'midi' {
    if (this.config.masterClock !== 'auto') {
      return this.config.masterClock;
    }
    
    // Auto-determine based on which source seems most reliable
    // For now, prefer audio as it's typically the most stable
    if (this.state.audioPosition > 0) return 'audio';
    if (this.state.videoPosition > 0) return 'video';
    return 'midi';
  }
  
  private queueCorrection(target: string, amount: number): void {
    switch (this.config.correctionMethod) {
      case 'jump':
        // Immediate correction
        this.applyCorrectionImmediate(target, amount);
        break;
      case 'smooth':
      case 'gradual':
        // Queue for gradual correction
        this.correctionQueue.push({
          target,
          amount,
          remaining: Math.abs(amount)
        });
        break;
    }
  }
  
  private applyCorrectionImmediate(target: string, amount: number): void {
    const correctionEvent = new CustomEvent('sync-correction', {
      detail: {
        target,
        amount,
        method: 'immediate'
      }
    });
    
    window.dispatchEvent(correctionEvent);
  }
  
  private processCorrectionQueue(): void {
    if (this.correctionQueue.length === 0) return;
    
    const corrections = [...this.correctionQueue];
    this.correctionQueue = [];
    
    corrections.forEach(correction => {
      const maxCorrection = this.config.maxCorrectionPerFrame;
      const correctionAmount = Math.min(correction.remaining, maxCorrection);
      const correctionSign = correction.amount >= 0 ? 1 : -1;
      const actualCorrection = correctionAmount * correctionSign;
      
      // Apply partial correction
      this.applyCorrectionImmediate(correction.target, actualCorrection);
      
      // Update remaining correction
      correction.remaining -= correctionAmount;
      
      // Re-queue if more correction needed
      if (correction.remaining > 0.001) { // 1ms threshold
        this.correctionQueue.push(correction);
      }
    });
  }
  
  private trimHistory(): void {
    // Keep only last 100 sync events
    if (this.syncHistory.length > 100) {
      this.syncHistory = this.syncHistory.slice(-100);
    }
  }
  
  private emitSyncEvent(event: SyncEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
    
    // Also emit as window event for loose coupling
    window.dispatchEvent(new CustomEvent(`sync-${event.type}`, {
      detail: event
    }));
  }
  
  // Public API methods
  
  getCurrentState(): SyncState {
    return { ...this.state };
  }
  
  getDifferences(): SyncDifferences {
    return this.calculateDifferences();
  }
  
  getMasterTime(): number {
    return this.state.masterPosition;
  }
  
  isInSync(): boolean {
    const differences = this.calculateDifferences();
    return differences.maxDifference <= this.config.tolerance;
  }
  
  getSyncHealth(): {
    score: number;
    status: 'excellent' | 'good' | 'poor' | 'critical';
    maxDrift: number;
    avgDrift: number;
  } {
    const differences = this.calculateDifferences();
    const recentEvents = this.syncHistory.slice(-10);
    
    const avgDrift = recentEvents.length > 0
      ? recentEvents.reduce((sum, event) => sum + event.differences.maxDifference, 0) / recentEvents.length
      : 0;
    
    const maxDrift = differences.maxDifference;
    
    let score = 100;
    if (maxDrift > 0.2) score -= 50; // Major drift
    if (maxDrift > 0.1) score -= 25; // Moderate drift
    if (avgDrift > 0.05) score -= 15; // Consistent small drift
    
    score = Math.max(0, score);
    
    let status: 'excellent' | 'good' | 'poor' | 'critical';
    if (score >= 90) status = 'excellent';
    else if (score >= 70) status = 'good';
    else if (score >= 40) status = 'poor';
    else status = 'critical';
    
    return {
      score,
      status,
      maxDrift,
      avgDrift
    };
  }
  
  // Event subscription
  on(eventType: string, listener: (event: SyncEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }
  
  off(eventType: string, listener: (event: SyncEvent) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }
  
  // Configuration
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  getConfig(): SyncConfig {
    return { ...this.config };
  }
  
  // Manual sync control
  forceSyncToMaster(): void {
    const masterTime = this.state.masterPosition;
    
    this.applyCorrectionImmediate('audio', masterTime - this.state.audioPosition);
    this.applyCorrectionImmediate('video', masterTime - this.state.videoPosition);
    this.applyCorrectionImmediate('midi', masterTime - this.state.midiPosition);
  }
  
  reset(): void {
    this.state = {
      midiPosition: 0,
      audioPosition: 0,
      videoPosition: 0,
      masterPosition: 0,
      lastSyncTime: performance.now()
    };
    
    this.syncHistory = [];
    this.correctionQueue = [];
  }
  
  // Debugging and analysis
  getSyncHistory(): SyncEvent[] {
    return [...this.syncHistory];
  }
  
  getDebugInfo(): {
    state: SyncState;
    differences: SyncDifferences;
    config: SyncConfig;
    queueLength: number;
    historyLength: number;
    health: ReturnType<PreviewSyncManager['getSyncHealth']>;
  } {
    return {
      state: this.getCurrentState(),
      differences: this.getDifferences(),
      config: this.getConfig(),
      queueLength: this.correctionQueue.length,
      historyLength: this.syncHistory.length,
      health: this.getSyncHealth()
    };
  }
  
  dispose(): void {
    this.stopMonitoring();
    this.listeners.clear();
    this.correctionQueue = [];
    this.syncHistory = [];
  }
}