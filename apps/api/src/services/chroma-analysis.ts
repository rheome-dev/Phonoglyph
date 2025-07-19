import { z } from 'zod';
import type { ChromaEvent } from '../types/event-based-mapping';

/**
 * Chroma Analysis Service
 * Extracts pitch and harmonic information from audio data
 */
export class ChromaAnalysisService {
  private sampleRate: number;
  private readonly chromaProfiles = {
    'C': [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    'C#': [0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    'D': [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    'D#': [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    'E': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    'F': [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
    'F#': [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    'G': [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    'G#': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    'A': [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
    'A#': [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    'B': [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]
  };

  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
  }

  /**
   * Extract chroma features from amplitude spectrum
   */
  public extractChroma(
    amplitudeSpectrum: number[][],
    sampleRate: number
  ): ChromaEvent[] {
    const events: ChromaEvent[] = [];
    
    for (let frameIndex = 0; frameIndex < amplitudeSpectrum.length; frameIndex++) {
      const spectrum = amplitudeSpectrum[frameIndex];
      if (!spectrum || spectrum.length === 0) continue;

      const chroma = this.calculateChromaVector(spectrum, sampleRate);
      if (!chroma) continue;

      const confidence = chroma.reduce((a, b) => a + b, 0) / chroma.length;
      
      if (confidence > 0.1) { // Minimum confidence threshold
        const rootNote = this.findDominantNote(chroma);
        const keySignature = this.detectKeySignature(chroma);
        
        events.push({
          timestamp: frameIndex * 0.025, // Assuming 25ms hop size
          chroma: [...chroma], // Copy array
          rootNote,
          confidence,
          keySignature
        });
      }
    }

    return this.filterChromaEventsByStability(events);
  }

  /**
   * Calculate chroma vector from amplitude spectrum
   */
  private calculateChromaVector(spectrum: number[], sampleRate: number): number[] | null {
    if (!spectrum || spectrum.length === 0) return null;

    const chroma = new Array(12).fill(0);
    const binSize = sampleRate / (2 * spectrum.length);

    for (let i = 0; i < spectrum.length; i++) {
      const frequency = i * binSize;
      if (frequency < 130.81) continue; // Below C3
      if (frequency > 4186.01) break;   // Above C8

      const noteIndex = this.frequencyToNoteIndex(frequency);
      if (noteIndex >= 0 && noteIndex < 12) {
        chroma[noteIndex] += spectrum[i] || 0;
      }
    }

    // Normalize
    const maxValue = Math.max(...chroma);
    if (maxValue > 0) {
      for (let i = 0; i < chroma.length; i++) {
        chroma[i] /= maxValue;
      }
    }

    return chroma;
  }

  /**
   * Convert frequency to note index (0-11)
   */
  private frequencyToNoteIndex(frequency: number): number {
    if (frequency <= 0) return -1;
    
    const noteIndex = Math.round(12 * Math.log2(frequency / 440) + 9) % 12;
    return noteIndex < 0 ? noteIndex + 12 : noteIndex;
  }

  /**
   * Find the dominant note from chroma vector
   */
  private findDominantNote(chroma: number[]): number {
    if (!chroma || chroma.length === 0) return 0;

    let maxValue = 0;
    let dominantNote = 0;

    for (let i = 0; i < chroma.length; i++) {
      const value = chroma[i];
      if (value && value > maxValue) {
        maxValue = value;
        dominantNote = i;
      }
    }

    return dominantNote;
  }

  /**
   * Detect key signature from chroma vector
   */
  private detectKeySignature(chroma: number[]): string {
    if (!chroma || chroma.length === 0) return 'C';

    let bestKey = 'C';
    let bestCorrelation = 0;

    for (const [key, profile] of Object.entries(this.chromaProfiles)) {
      let correlation = 0;
      
      for (let i = 0; i < 12; i++) {
        const chromaValue = chroma[i];
        const profileValue = profile[i];
        if (chromaValue && profileValue) {
          correlation += chromaValue * profileValue;
        }
      }

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestKey = key;
      }
    }

    return bestKey;
  }

  /**
   * Filter chroma events by stability (remove rapid changes)
   */
  private filterChromaEventsByStability(events: ChromaEvent[]): ChromaEvent[] {
    if (events.length === 0) return events;

    const filtered: ChromaEvent[] = [];
    const minDuration = 0.1; // 100ms minimum duration
    
    let currentEvent: ChromaEvent | undefined = events[0];
    let eventStart = currentEvent?.timestamp || 0;

    for (let i = 1; i < events.length; i++) {
      const event = events[i];
      if (!event || !currentEvent) continue;

      const keyChanged = currentEvent.keySignature !== event.keySignature;
      const noteChanged = Math.abs(currentEvent.rootNote - event.rootNote) > 2; // Allow some variance

      if (keyChanged || noteChanged) {
        if (currentEvent.timestamp - eventStart >= minDuration) {
          filtered.push(currentEvent);
        }
        eventStart = event.timestamp;
        currentEvent = event;
      } else {
        // Keep the event with higher confidence
        if (event.confidence > currentEvent.confidence) {
          currentEvent = event;
        }
      }
    }

    // Add the last event if it meets duration requirement
    if (currentEvent && currentEvent.timestamp - eventStart >= minDuration) {
      filtered.push(currentEvent);
    }

    return filtered;
  }

  /**
   * Detect chord patterns from chroma vector
   */
  public detectChordPattern(chroma: number[]): string[] {
    if (!chroma || chroma.length === 0) return [];

    const patterns = {
      'major': [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
      'minor': [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
      'diminished': [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
      'augmented': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
    };

    const detectedChords: string[] = [];

    for (const [chordType, pattern] of Object.entries(patterns)) {
      let correlation = 0;
      
      for (let i = 0; i < 12; i++) {
        const chromaValue = chroma[i];
        const patternValue = pattern[i];
        if (chromaValue && patternValue) {
          correlation += chromaValue * patternValue;
        }
      }

      if (correlation > 0.6) { // Threshold for chord detection
        detectedChords.push(chordType);
      }
    }

    return detectedChords;
  }

  /**
   * Calculate harmonic complexity from chroma vector
   */
  public calculateHarmonicComplexity(chroma: number[]): number {
    if (!chroma || chroma.length === 0) return 0;

    // Count active harmonics
    const activeHarmonics = chroma.filter(value => value && value > 0.1).length;
    
    // Calculate entropy
    const total = chroma.reduce((sum, value) => sum + (value || 0), 0);
    let entropy = 0;
    
    for (const value of chroma) {
      if (value && value > 0 && total > 0) {
        const p = value / total;
        entropy -= p * Math.log2(p);
      }
    }

    // Combine metrics
    return (activeHarmonics / 12) * 0.5 + (entropy / 3.58) * 0.5; // Normalize to 0-1
  }
}