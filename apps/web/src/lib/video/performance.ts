import { MIDIData } from '@/types/midi';
import { VideoTrigger, TriggerEvent } from './effectTriggers';

/**
 * Performance-optimized data structures and utilities for real-time trigger evaluation
 */

export interface CachedMIDIAnalysis {
  timeRange: { start: number; end: number };
  activeNotes: Map<number, { velocity: number; startTime: number; duration: number }>;
  tempoAtTime: number;
  chordAnalysis?: number[];
  lastUpdated: number;
}

export interface PerformanceMetrics {
  evaluationTime: number;
  triggersProcessed: number;
  cacheHitRate: number;
  memoryUsage: number;
}

export class PerformanceOptimizedTriggerEngine {
  private triggers: Map<string, VideoTrigger> = new Map();
  private triggersByLayer: Map<string, Set<string>> = new Map();
  private triggersByType: Map<string, Set<string>> = new Map();
  
  // Performance optimization caches
  private midiAnalysisCache = new Map<string, CachedMIDIAnalysis>();
  private triggerResultCache = new Map<string, { events: TriggerEvent[]; timestamp: number }>();
  private noteIndex = new Map<number, { note: number; velocity: number; time: number; track: string }[]>();
  
  // Performance metrics
  private metrics: PerformanceMetrics = {
    evaluationTime: 0,
    triggersProcessed: 0,
    cacheHitRate: 0,
    memoryUsage: 0
  };
  
  // Configuration
  private cacheTimeout = 5000; // 5 seconds
  private maxCacheEntries = 100;
  private throttleInterval = 16; // ~60fps
  private lastEvaluationTime = 0;
  
  constructor() {
    // Clean up caches periodically
    setInterval(() => this.cleanupCaches(), 10000);
  }
  
  addTrigger(trigger: VideoTrigger): void {
    this.triggers.set(trigger.id, trigger);
    
    // Update indices
    if (!this.triggersByLayer.has(trigger.layerId)) {
      this.triggersByLayer.set(trigger.layerId, new Set());
    }
    this.triggersByLayer.get(trigger.layerId)!.add(trigger.id);
    
    if (!this.triggersByType.has(trigger.midiCondition.type)) {
      this.triggersByType.set(trigger.midiCondition.type, new Set());
    }
    this.triggersByType.get(trigger.midiCondition.type)!.add(trigger.id);
  }
  
  removeTrigger(triggerId: string): void {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return;
    
    this.triggers.delete(triggerId);
    
    // Update indices
    this.triggersByLayer.get(trigger.layerId)?.delete(triggerId);
    this.triggersByType.get(trigger.midiCondition.type)?.delete(triggerId);
    
    // Clear related caches
    this.clearTriggerCaches(triggerId);
  }
  
  evaluateTriggersOptimized(
    midiData: MIDIData,
    currentTime: number,
    prevTime: number
  ): TriggerEvent[] {
    const startTime = performance.now();
    
    // Throttle evaluation to prevent excessive calls
    if (currentTime - this.lastEvaluationTime < this.throttleInterval / 1000) {
      return [];
    }
    this.lastEvaluationTime = currentTime;
    
    // Check cache first
    const cacheKey = `${currentTime}-${prevTime}`;
    const cached = this.triggerResultCache.get(cacheKey);
    if (cached && (startTime - cached.timestamp) < this.cacheTimeout) {
      this.metrics.cacheHitRate = (this.metrics.cacheHitRate + 1) / 2;
      return cached.events;
    }
    
    // Get or create MIDI analysis
    const analysis = this.getMIDIAnalysis(midiData, currentTime, prevTime);
    
    // Evaluate triggers using optimized approach
    const events: TriggerEvent[] = [];
    let triggersProcessed = 0;
    
    // Group triggers by condition type for batch processing
    const triggerGroups = this.groupTriggersByCondition();
    
    for (const [conditionType, triggerIds] of triggerGroups) {
      const groupEvents = this.evaluateTriggerGroup(
        conditionType,
        triggerIds,
        analysis,
        currentTime,
        prevTime
      );
      events.push(...groupEvents);
      triggersProcessed += triggerIds.length;
    }
    
    // Cache results
    this.triggerResultCache.set(cacheKey, {
      events,
      timestamp: startTime
    });
    
    // Update metrics
    const endTime = performance.now();
    this.updateMetrics(endTime - startTime, triggersProcessed);
    
    return events;
  }
  
  private getMIDIAnalysis(
    midiData: MIDIData,
    currentTime: number,
    prevTime: number
  ): CachedMIDIAnalysis {
    const cacheKey = `${Math.floor(currentTime * 10)}`; // Cache by 100ms intervals
    const existing = this.midiAnalysisCache.get(cacheKey);
    
    if (existing && existing.timeRange.start <= prevTime && existing.timeRange.end >= currentTime) {
      return existing;
    }
    
    // Create new analysis
    const analysis: CachedMIDIAnalysis = {
      timeRange: { start: prevTime, end: currentTime },
      activeNotes: new Map(),
      tempoAtTime: this.calculateTempo(midiData, currentTime),
      lastUpdated: performance.now()
    };
    
    // Build note index if not exists
    if (this.noteIndex.size === 0) {
      this.buildNoteIndex(midiData);
    }
    
    // Find active notes in time range
    for (const track of midiData.tracks) {
      for (const note of track.notes) {
        if (note.start > prevTime && note.start <= currentTime) {
          analysis.activeNotes.set(note.pitch, {
            velocity: note.velocity,
            startTime: note.start,
            duration: note.duration
          });
        }
      }
    }
    
    // Calculate chord analysis if needed
    if (this.needsChordAnalysis()) {
      analysis.chordAnalysis = this.analyzeChordAtTime(midiData, currentTime);
    }
    
    // Cache the analysis
    this.midiAnalysisCache.set(cacheKey, analysis);
    
    return analysis;
  }
  
  private buildNoteIndex(midiData: MIDIData): void {
    this.noteIndex.clear();
    
    for (const track of midiData.tracks) {
      for (const note of track.notes) {
        if (!this.noteIndex.has(note.pitch)) {
          this.noteIndex.set(note.pitch, []);
        }
        this.noteIndex.get(note.pitch)!.push({
          note: note.pitch,
          velocity: note.velocity,
          time: note.start,
          track: track.id
        });
      }
    }
    
    // Sort notes by time for efficient lookup
    for (const notes of this.noteIndex.values()) {
      notes.sort((a, b) => a.time - b.time);
    }
  }
  
  private groupTriggersByCondition(): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    
    for (const [triggerId, trigger] of this.triggers) {
      if (!trigger.enabled) continue;
      
      const conditionType = trigger.midiCondition.type;
      if (!groups.has(conditionType)) {
        groups.set(conditionType, []);
      }
      groups.get(conditionType)!.push(triggerId);
    }
    
    return groups;
  }
  
  private evaluateTriggerGroup(
    conditionType: string,
    triggerIds: string[],
    analysis: CachedMIDIAnalysis,
    currentTime: number,
    prevTime: number
  ): TriggerEvent[] {
    const events: TriggerEvent[] = [];
    
    switch (conditionType) {
      case 'note_on':
      case 'note_velocity_threshold':
        events.push(...this.evaluateNoteTriggersOptimized(triggerIds, analysis, currentTime));
        break;
      case 'beat_detection':
        events.push(...this.evaluateBeatTriggersOptimized(triggerIds, analysis, currentTime));
        break;
      case 'chord_change':
        events.push(...this.evaluateChordTriggersOptimized(triggerIds, analysis, currentTime, prevTime));
        break;
    }
    
    return events;
  }
  
  private evaluateNoteTriggersOptimized(
    triggerIds: string[],
    analysis: CachedMIDIAnalysis,
    currentTime: number
  ): TriggerEvent[] {
    const events: TriggerEvent[] = [];
    
    // Process all note triggers together
    for (const [pitch, noteData] of analysis.activeNotes) {
      const relevantTriggers = triggerIds.filter(id => {
        const trigger = this.triggers.get(id)!;
        const condition = trigger.midiCondition;
        
        // Check cooldown
        if (currentTime - trigger.lastTriggered < trigger.cooldown / 1000) {
          return false;
        }
        
        // Check note match
        if (condition.note && condition.note !== pitch) {
          return false;
        }
        
        // Check velocity threshold
        if (condition.type === 'note_velocity_threshold' && condition.velocityThreshold) {
          if (noteData.velocity < condition.velocityThreshold) {
            return false;
          }
        }
        
        return true;
      });
      
      // Create events for matching triggers
      for (const triggerId of relevantTriggers) {
        const trigger = this.triggers.get(triggerId)!;
        events.push({
          triggerId,
          layerId: trigger.layerId,
          time: currentTime,
          effect: this.calculateVelocityModifiedEffect(trigger.effect, noteData.velocity)
        });
        
        trigger.lastTriggered = currentTime;
      }
    }
    
    return events;
  }
  
  private evaluateBeatTriggersOptimized(
    triggerIds: string[],
    analysis: CachedMIDIAnalysis,
    currentTime: number
  ): TriggerEvent[] {
    const events: TriggerEvent[] = [];
    const tempo = analysis.tempoAtTime;
    
    for (const triggerId of triggerIds) {
      const trigger = this.triggers.get(triggerId)!;
      
      // Check cooldown
      if (currentTime - trigger.lastTriggered < trigger.cooldown / 1000) {
        continue;
      }
      
      const beatDivision = trigger.midiCondition.beatDivision || 4;
      const beatInterval = 60 / tempo;
      const divisionInterval = beatInterval / beatDivision;
      
      const remainder = currentTime % divisionInterval;
      const tolerance = 0.05; // 50ms tolerance
      
      if (remainder < tolerance || remainder > (divisionInterval - tolerance)) {
        events.push({
          triggerId,
          layerId: trigger.layerId,
          time: currentTime,
          effect: trigger.effect
        });
        
        trigger.lastTriggered = currentTime;
      }
    }
    
    return events;
  }
  
  private evaluateChordTriggersOptimized(
    triggerIds: string[],
    analysis: CachedMIDIAnalysis,
    currentTime: number,
    prevTime: number
  ): TriggerEvent[] {
    const events: TriggerEvent[] = [];
    
    if (!analysis.chordAnalysis) return events;
    
    const prevAnalysis = this.midiAnalysisCache.get(`${Math.floor(prevTime * 10)}`);
    if (!prevAnalysis?.chordAnalysis) return events;
    
    const chordDistance = this.calculateChordDistance(
      analysis.chordAnalysis,
      prevAnalysis.chordAnalysis
    );
    
    for (const triggerId of triggerIds) {
      const trigger = this.triggers.get(triggerId)!;
      
      // Check cooldown
      if (currentTime - trigger.lastTriggered < trigger.cooldown / 1000) {
        continue;
      }
      
      const tolerance = trigger.midiCondition.chordTolerance || 0.5;
      
      if (chordDistance > tolerance) {
        events.push({
          triggerId,
          layerId: trigger.layerId,
          time: currentTime,
          effect: trigger.effect
        });
        
        trigger.lastTriggered = currentTime;
      }
    }
    
    return events;
  }
  
  private calculateVelocityModifiedEffect(baseEffect: any, velocity: number): any {
    const velocityRatio = velocity / 127;
    
    return {
      ...baseEffect,
      intensity: Math.min(1, baseEffect.intensity * (0.5 + velocityRatio * 0.5)),
      duration: baseEffect.duration * (0.8 + velocityRatio * 0.4)
    };
  }
  
  private calculateTempo(midiData: MIDIData, time: number): number {
    let currentTempo = 120;
    
    if (midiData.tempoChanges) {
      for (const tempoChange of midiData.tempoChanges) {
        const tempoTime = tempoChange.tick / (midiData.file.ticksPerQuarter * 2);
        if (tempoTime <= time) {
          currentTempo = tempoChange.bpm;
        }
      }
    }
    
    return currentTempo;
  }
  
  private analyzeChordAtTime(midiData: MIDIData, time: number): number[] {
    const activeNotes: number[] = [];
    
    for (const track of midiData.tracks) {
      for (const note of track.notes) {
        if (note.start <= time && (note.start + note.duration) > time) {
          activeNotes.push(note.pitch % 12);
        }
      }
    }
    
    return [...new Set(activeNotes)].sort();
  }
  
  private calculateChordDistance(chord1: number[], chord2: number[]): number {
    const set1 = new Set(chord1);
    const set2 = new Set(chord2);
    
    const intersection = [...set1].filter(x => set2.has(x)).length;
    const union = new Set([...chord1, ...chord2]).size;
    
    return 1 - (intersection / union);
  }
  
  private needsChordAnalysis(): boolean {
    return Array.from(this.triggers.values()).some(
      trigger => trigger.enabled && trigger.midiCondition.type === 'chord_change'
    );
  }
  
  private cleanupCaches(): void {
    const now = performance.now();
    const timeout = this.cacheTimeout;
    
    // Clean MIDI analysis cache
    for (const [key, analysis] of this.midiAnalysisCache) {
      if (now - analysis.lastUpdated > timeout) {
        this.midiAnalysisCache.delete(key);
      }
    }
    
    // Clean trigger result cache
    for (const [key, result] of this.triggerResultCache) {
      if (now - result.timestamp > timeout) {
        this.triggerResultCache.delete(key);
      }
    }
    
    // Limit cache size
    if (this.midiAnalysisCache.size > this.maxCacheEntries) {
      const entries = Array.from(this.midiAnalysisCache.entries());
      entries.sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);
      
      const toDelete = entries.slice(0, entries.length - this.maxCacheEntries);
      for (const [key] of toDelete) {
        this.midiAnalysisCache.delete(key);
      }
    }
  }
  
  private clearTriggerCaches(triggerId: string): void {
    // Remove cached results that might be affected by this trigger
    for (const [key, result] of this.triggerResultCache) {
      if (result.events.some(event => event.triggerId === triggerId)) {
        this.triggerResultCache.delete(key);
      }
    }
  }
  
  private updateMetrics(evaluationTime: number, triggersProcessed: number): void {
    this.metrics.evaluationTime = (this.metrics.evaluationTime + evaluationTime) / 2;
    this.metrics.triggersProcessed = triggersProcessed;
    this.metrics.memoryUsage = this.calculateMemoryUsage();
  }
  
  private calculateMemoryUsage(): number {
    // Estimate memory usage in bytes
    const midiCacheSize = this.midiAnalysisCache.size * 1000; // ~1KB per entry
    const triggerCacheSize = this.triggerResultCache.size * 500; // ~500B per entry
    const noteIndexSize = this.noteIndex.size * 100; // ~100B per pitch
    
    return midiCacheSize + triggerCacheSize + noteIndexSize;
  }
  
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  optimizeForLatency(): void {
    this.throttleInterval = 8; // ~120fps
    this.cacheTimeout = 2000; // 2 seconds
    this.maxCacheEntries = 50;
  }
  
  optimizeForMemory(): void {
    this.throttleInterval = 32; // ~30fps
    this.cacheTimeout = 1000; // 1 second
    this.maxCacheEntries = 25;
    this.cleanupCaches();
  }
}