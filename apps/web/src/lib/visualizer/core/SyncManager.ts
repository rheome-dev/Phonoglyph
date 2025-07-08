import { SyncPoint, SyncStatus } from '@/types/hybrid-control';

export class SyncManager {
  private syncPoints: SyncPoint[] = [];
  private maxSyncPoints = 10; // Circular buffer size
  private currentOffset = 0;
  private lastSyncUpdate = 0;
  private driftHistory: number[] = [];
  private maxDriftHistory = 50;
  
  // Timing references
  private midiClock = 0;
  private audioClock = 0;
  private baseTimestamp = 0;
  
  // Performance monitoring
  private syncQuality = 1.0;
  private consecutiveBadSync = 0;
  private maxBadSync = 5;
  
  constructor() {
    this.baseTimestamp = performance.now();
    console.log('⏱️ SyncManager initialized');
  }
  
  /**
   * Add a new synchronization point from user interaction or automatic detection
   */
  addSyncPoint(point: SyncPoint): void {
    // Validate sync point
    if (point.confidence < 0.1) {
      console.warn('⚠️ Low confidence sync point rejected:', point.confidence);
      return;
    }
    
    // Add to circular buffer
    this.syncPoints.push(point);
    if (this.syncPoints.length > this.maxSyncPoints) {
      this.syncPoints.shift();
    }
    
    this.updateTimingModel();
    this.lastSyncUpdate = performance.now();
    
    console.log(`🎯 Sync point added: MIDI ${point.midiTick}, Audio ${point.audioTime.toFixed(3)}s, confidence ${point.confidence.toFixed(2)}`);
  }
  
  /**
   * Calculate current timing offset between MIDI and audio
   */
  calculateOffset(): number {
    if (this.syncPoints.length < 2) {
      return this.currentOffset;
    }
    
    // Use weighted average of recent sync points
    let totalWeight = 0;
    let weightedOffset = 0;
    
    this.syncPoints.forEach((point, index) => {
      const age = this.syncPoints.length - index;
      const weight = point.confidence * Math.pow(0.8, age); // More recent points have higher weight
      
      const offset = point.audioTime - (point.midiTick / 480); // Assuming 480 ticks per quarter note
      weightedOffset += offset * weight;
      totalWeight += weight;
    });
    
    if (totalWeight > 0) {
      const newOffset = weightedOffset / totalWeight;
      
      // Track drift
      const drift = Math.abs(newOffset - this.currentOffset);
      this.driftHistory.push(drift);
      if (this.driftHistory.length > this.maxDriftHistory) {
        this.driftHistory.shift();
      }
      
      // Update offset with smoothing
      const smoothingFactor = 0.1;
      this.currentOffset = this.currentOffset * (1 - smoothingFactor) + newOffset * smoothingFactor;
      
      this.updateSyncQuality(drift);
    }
    
    return this.currentOffset;
  }
  
  /**
   * Get adjusted time for both MIDI and audio domains
   */
  getAdjustedTime(timestamp: number): { midiTime: number; audioTime: number } {
    const elapsed = timestamp - this.baseTimestamp;
    const audioTime = elapsed / 1000; // Convert to seconds
    const midiTime = audioTime + this.currentOffset;
    
    return { midiTime, audioTime };
  }
  
  /**
   * Convert MIDI tick to audio time
   */
  midiTickToAudioTime(tick: number, tempo = 120): number {
    const quarterNoteTime = 60 / tempo; // Seconds per quarter note
    const tickTime = quarterNoteTime / 480; // Assuming 480 ticks per quarter note
    return tick * tickTime - this.currentOffset;
  }
  
  /**
   * Convert audio time to MIDI tick
   */
  audioTimeToMidiTick(audioTime: number, tempo = 120): number {
    const quarterNoteTime = 60 / tempo;
    const tickTime = quarterNoteTime / 480;
    return Math.round((audioTime + this.currentOffset) / tickTime);
  }
  
  /**
   * Get current synchronization status
   */
  getSyncStatus(): SyncStatus {
    const now = performance.now();
    const isSync = this.syncPoints.length >= 2 && (now - this.lastSyncUpdate) < 5000;
    
    const averageDrift = this.driftHistory.length > 0 
      ? this.driftHistory.reduce((a, b) => a + b, 0) / this.driftHistory.length 
      : 0;
    
    return {
      isSync,
      offset: this.currentOffset,
      drift: averageDrift,
      quality: this.syncQuality,
      lastUpdate: this.lastSyncUpdate
    };
  }
  
  /**
   * Automatically detect sync points from MIDI and audio events
   */
  autoDetectSyncPoint(midiTick: number, audioTime: number, eventStrength = 1.0): void {
    // Only auto-detect on strong musical events (beats, note onsets)
    if (eventStrength < 0.5) return;
    
    const confidence = Math.min(eventStrength * 0.8, 0.9); // Cap auto-detected confidence
    
    this.addSyncPoint({
      timestamp: performance.now(),
      midiTick,
      audioTime,
      confidence
    });
  }
  
  /**
   * Manual sync adjustment for user corrections
   */
  adjustOffset(deltaMs: number): void {
    this.currentOffset += deltaMs / 1000;
    console.log(`🔧 Manual sync adjustment: ${deltaMs}ms, new offset: ${this.currentOffset.toFixed(3)}s`);
    
    // Add a high-confidence sync point for this manual adjustment
    const now = performance.now();
    this.addSyncPoint({
      timestamp: now,
      midiTick: this.audioTimeToMidiTick((now - this.baseTimestamp) / 1000),
      audioTime: (now - this.baseTimestamp) / 1000,
      confidence: 0.95
    });
  }
  
  /**
   * Reset synchronization state
   */
  reset(): void {
    this.syncPoints = [];
    this.currentOffset = 0;
    this.driftHistory = [];
    this.syncQuality = 1.0;
    this.consecutiveBadSync = 0;
    this.baseTimestamp = performance.now();
    console.log('🔄 SyncManager reset');
  }
  
  /**
   * Get timing statistics for debugging
   */
  getTimingStats(): {
    syncPointCount: number;
    averageDrift: number;
    syncQuality: number;
    currentOffset: number;
  } {
    const averageDrift = this.driftHistory.length > 0 
      ? this.driftHistory.reduce((a, b) => a + b, 0) / this.driftHistory.length 
      : 0;
    
    return {
      syncPointCount: this.syncPoints.length,
      averageDrift,
      syncQuality: this.syncQuality,
      currentOffset: this.currentOffset
    };
  }
  
  private updateTimingModel(): void {
    // Advanced timing model could include tempo changes, time signature changes, etc.
    // For now, we use a simple linear model
    this.calculateOffset();
  }
  
  private updateSyncQuality(drift: number): void {
    // Update sync quality based on drift
    const targetDrift = 0.005; // 5ms target
    const driftRatio = Math.min(drift / targetDrift, 2.0);
    
    if (driftRatio > 1.5) {
      this.consecutiveBadSync++;
      this.syncQuality *= 0.9; // Reduce quality for bad sync
    } else {
      this.consecutiveBadSync = 0;
      this.syncQuality = Math.min(this.syncQuality * 1.1, 1.0); // Improve quality for good sync
    }
    
    // Warn if sync quality is degrading
    if (this.consecutiveBadSync >= this.maxBadSync) {
      console.warn(`⚠️ Sync quality degraded: ${this.syncQuality.toFixed(2)}, drift: ${drift.toFixed(3)}s`);
    }
  }
}