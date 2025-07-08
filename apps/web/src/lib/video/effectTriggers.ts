import { MIDIData, MIDINote, MIDITrack } from '@/types/midi';

export interface VideoTrigger {
  id: string;
  name: string;
  layerId: string;
  triggerType: TriggerType;
  midiCondition: MIDITriggerCondition;
  effect: VideoEffect;
  enabled: boolean;
  cooldown: number; // Minimum time between triggers (ms)
  lastTriggered: number;
}

export type TriggerType = 'cut' | 'asset_switch' | 'transition' | 'effect_burst';

export interface MIDITriggerCondition {
  type: 'note_on' | 'note_velocity_threshold' | 'beat_detection' | 'chord_change';
  note?: number;
  channel?: number;
  velocityThreshold?: number;
  beatDivision?: number; // 4 = quarter note, 8 = eighth note, etc.
  chordTolerance?: number;
}

export interface VideoEffect {
  type: 'hard_cut' | 'crossfade' | 'slide' | 'zoom' | 'spin' | 'glitch' | 'strobe';
  duration: number; // Effect duration in seconds
  intensity: number; // 0-1, can be modified by velocity
  direction?: 'in' | 'out' | 'left' | 'right' | 'up' | 'down';
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
  parameters?: Record<string, number>; // Effect-specific parameters
}

export interface TriggerEvent {
  triggerId: string;
  layerId: string;
  time: number;
  effect: VideoEffect;
}

export class VideoTriggerEngine {
  private triggers: VideoTrigger[] = [];
  private assetPlaylists: Map<string, string[]> = new Map();
  private currentAssetIndex: Map<string, number> = new Map();
  
  addTrigger(trigger: VideoTrigger): void {
    this.triggers.push(trigger);
  }
  
  removeTrigger(triggerId: string): void {
    this.triggers = this.triggers.filter(t => t.id !== triggerId);
  }
  
  updateTrigger(triggerId: string, updates: Partial<VideoTrigger>): void {
    const index = this.triggers.findIndex(t => t.id === triggerId);
    if (index !== -1) {
      this.triggers[index] = { ...this.triggers[index], ...updates };
    }
  }
  
  getTrigger(triggerId: string): VideoTrigger | undefined {
    return this.triggers.find(t => t.id === triggerId);
  }
  
  getTriggersByLayer(layerId: string): VideoTrigger[] {
    return this.triggers.filter(t => t.layerId === layerId);
  }
  
  setAssetPlaylist(layerId: string, assetIds: string[]): void {
    this.assetPlaylists.set(layerId, assetIds);
    this.currentAssetIndex.set(layerId, 0);
  }
  
  evaluateTriggers(
    midiData: MIDIData, 
    currentTime: number, 
    prevTime: number
  ): TriggerEvent[] {
    const events: TriggerEvent[] = [];
    
    this.triggers.forEach(trigger => {
      if (!trigger.enabled) return;
      
      // Check cooldown
      if (currentTime - trigger.lastTriggered < trigger.cooldown / 1000) return;
      
      const shouldTrigger = this.evaluateCondition(
        trigger.midiCondition,
        midiData,
        currentTime,
        prevTime
      );
      
      if (shouldTrigger.triggered) {
        events.push({
          triggerId: trigger.id,
          layerId: trigger.layerId,
          time: currentTime,
          effect: this.calculateEffect(trigger.effect, shouldTrigger.velocity || 127)
        });
        
        trigger.lastTriggered = currentTime;
      }
    });
    
    return events;
  }
  
  private evaluateCondition(
    condition: MIDITriggerCondition,
    midiData: MIDIData,
    currentTime: number,
    prevTime: number
  ): { triggered: boolean; velocity?: number } {
    switch (condition.type) {
      case 'note_on':
        return this.checkNoteOn(condition, midiData, currentTime, prevTime);
      case 'note_velocity_threshold':
        return this.checkVelocityThreshold(condition, midiData, currentTime, prevTime);
      case 'beat_detection':
        return this.checkBeatDetection(condition, midiData, currentTime);
      case 'chord_change':
        return this.checkChordChange(condition, midiData, currentTime, prevTime);
      default:
        return { triggered: false };
    }
  }
  
  private checkNoteOn(
    condition: MIDITriggerCondition,
    midiData: MIDIData,
    currentTime: number,
    prevTime: number
  ): { triggered: boolean; velocity?: number } {
    for (const track of midiData.tracks) {
      for (const note of track.notes) {
        const noteTime = note.start;
        if (noteTime > prevTime && noteTime <= currentTime) {
          const matchesNote = !condition.note || note.pitch === condition.note;
          const matchesChannel = !condition.channel || track.channel === condition.channel;
          
          if (matchesNote && matchesChannel) {
            return { triggered: true, velocity: note.velocity };
          }
        }
      }
    }
    
    return { triggered: false };
  }
  
  private checkVelocityThreshold(
    condition: MIDITriggerCondition,
    midiData: MIDIData,
    currentTime: number,
    prevTime: number
  ): { triggered: boolean; velocity?: number } {
    const result = this.checkNoteOn(condition, midiData, currentTime, prevTime);
    
    if (result.triggered && result.velocity && condition.velocityThreshold) {
      return {
        triggered: result.velocity >= condition.velocityThreshold,
        velocity: result.velocity
      };
    }
    
    return { triggered: false };
  }
  
  private checkBeatDetection(
    condition: MIDITriggerCondition,
    midiData: MIDIData,
    currentTime: number
  ): { triggered: boolean } {
    // Get current tempo from tempo changes
    const tempo = this.getCurrentTempo(midiData, currentTime);
    const beatInterval = 60 / tempo; // Seconds per beat
    const beatDivisionInterval = beatInterval / (condition.beatDivision || 4);
    
    // Check if current time aligns with a beat division (within small tolerance)
    const timeSinceStart = currentTime;
    const remainder = timeSinceStart % beatDivisionInterval;
    const tolerance = 0.05; // 50ms tolerance
    
    return { triggered: remainder < tolerance || remainder > (beatDivisionInterval - tolerance) };
  }
  
  private checkChordChange(
    condition: MIDITriggerCondition,
    midiData: MIDIData,
    currentTime: number,
    prevTime: number
  ): { triggered: boolean } {
    // Analyze harmonic content change
    const currentChord = this.analyzeChord(midiData, currentTime);
    const prevChord = this.analyzeChord(midiData, prevTime);
    
    if (!currentChord || !prevChord) return { triggered: false };
    
    const chordDistance = this.calculateChordDistance(currentChord, prevChord);
    return { triggered: chordDistance > (condition.chordTolerance || 0.5) };
  }
  
  private calculateEffect(baseEffect: VideoEffect, velocity: number): VideoEffect {
    // Modify effect based on velocity
    const velocityRatio = velocity / 127;
    
    return {
      ...baseEffect,
      intensity: Math.min(1, baseEffect.intensity * (0.5 + velocityRatio * 0.5)),
      duration: baseEffect.duration * (0.8 + velocityRatio * 0.4)
    };
  }
  
  private getCurrentTempo(midiData: MIDIData, time: number): number {
    // Find the most recent tempo change
    let currentTempo = 120; // Default tempo
    
    if (midiData.tempoChanges) {
      for (const tempoChange of midiData.tempoChanges) {
        // Convert tick to time - simplified conversion
        const tempoTime = tempoChange.tick / (midiData.file.ticksPerQuarter * 2); // Rough conversion
        if (tempoTime <= time) {
          currentTempo = tempoChange.bpm;
        }
      }
    }
    
    return currentTempo;
  }
  
  private analyzeChord(midiData: MIDIData, time: number): number[] | null {
    // Find all active notes at the given time
    const activeNotes: number[] = [];
    
    for (const track of midiData.tracks) {
      for (const note of track.notes) {
        if (note.start <= time && (note.start + note.duration) > time) {
          activeNotes.push(note.pitch % 12); // Reduce to pitch class
        }
      }
    }
    
    return activeNotes.length > 0 ? [...new Set(activeNotes)].sort() : null;
  }
  
  private calculateChordDistance(chord1: number[], chord2: number[]): number {
    // Simple chord distance calculation
    const set1 = new Set(chord1);
    const set2 = new Set(chord2);
    
    const intersection = [...set1].filter(x => set2.has(x)).length;
    const union = new Set([...chord1, ...chord2]).size;
    
    return 1 - (intersection / union);
  }
}