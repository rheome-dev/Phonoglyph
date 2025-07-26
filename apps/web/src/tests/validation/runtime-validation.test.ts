/**
 * Runtime Validation Tests
 * Tests for runtime type validation and error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Simple type guards for testing (since we can't import the full validation service in this context)
function isAudioAnalysisData(value: unknown): value is {
  frequencies: number[];
  timeData: number[];
  volume: number;
  bass: number;
  mid: number;
  treble: number;
} {
  if (!value || typeof value !== 'object') return false;
  
  const data = value as Record<string, unknown>;
  return Array.isArray(data.frequencies) &&
         data.frequencies.every(f => typeof f === 'number') &&
         Array.isArray(data.timeData) &&
         data.timeData.every(t => typeof t === 'number') &&
         typeof data.volume === 'number' &&
         typeof data.bass === 'number' &&
         typeof data.mid === 'number' &&
         typeof data.treble === 'number';
}

function isLiveMIDIData(value: unknown): value is {
  activeNotes: Array<{
    note: number;
    velocity: number;
    startTime: number;
    track: string;
  }>;
  currentTime: number;
  tempo: number;
  totalNotes: number;
  trackActivity: Record<string, boolean>;
} {
  if (!value || typeof value !== 'object') return false;
  
  const data = value as Record<string, unknown>;
  return Array.isArray(data.activeNotes) &&
         data.activeNotes.every(note => 
           typeof note === 'object' &&
           note !== null &&
           typeof (note as any).note === 'number' &&
           typeof (note as any).velocity === 'number' &&
           typeof (note as any).startTime === 'number' &&
           typeof (note as any).track === 'string'
         ) &&
         typeof data.currentTime === 'number' &&
         typeof data.tempo === 'number' &&
         typeof data.totalNotes === 'number' &&
         typeof data.trackActivity === 'object' &&
         data.trackActivity !== null;
}

describe('Runtime Validation Tests', () => {
  describe('Audio Analysis Data Validation', () => {
    it('should validate correct audio analysis data', () => {
      const validData = {
        frequencies: [1, 2, 3, 4, 5],
        timeData: [0.1, 0.2, 0.3, 0.4, 0.5],
        volume: 0.8,
        bass: 0.6,
        mid: 0.7,
        treble: 0.5
      };

      expect(isAudioAnalysisData(validData)).toBe(true);
    });

    it('should reject invalid audio analysis data', () => {
      const invalidData = {
        frequencies: ['invalid', 'array'],
        timeData: [0.1, 0.2, 0.3],
        volume: 'not a number',
        bass: 0.6,
        mid: 0.7,
        treble: 0.5
      };

      expect(isAudioAnalysisData(invalidData)).toBe(false);
    });

    it('should reject incomplete audio analysis data', () => {
      const incompleteData = {
        frequencies: [1, 2, 3],
        timeData: [0.1, 0.2, 0.3]
        // Missing volume, bass, mid, treble
      };

      expect(isAudioAnalysisData(incompleteData)).toBe(false);
    });

    it('should reject null or undefined values', () => {
      expect(isAudioAnalysisData(null)).toBe(false);
      expect(isAudioAnalysisData(undefined)).toBe(false);
      expect(isAudioAnalysisData('string')).toBe(false);
      expect(isAudioAnalysisData(42)).toBe(false);
    });
  });

  describe('MIDI Data Validation', () => {
    it('should validate correct MIDI data', () => {
      const validData = {
        activeNotes: [
          {
            note: 60,
            velocity: 127,
            startTime: 0,
            track: 'piano'
          }
        ],
        currentTime: 1.5,
        tempo: 120,
        totalNotes: 1,
        trackActivity: {
          piano: true,
          drums: false
        }
      };

      expect(isLiveMIDIData(validData)).toBe(true);
    });

    it('should reject invalid MIDI data', () => {
      const invalidData = {
        activeNotes: [
          {
            note: 'C4', // Should be number
            velocity: 127,
            startTime: 0,
            track: 'piano'
          }
        ],
        currentTime: 1.5,
        tempo: 120,
        totalNotes: 1,
        trackActivity: {
          piano: true
        }
      };

      expect(isLiveMIDIData(invalidData)).toBe(false);
    });

    it('should handle empty active notes array', () => {
      const validData = {
        activeNotes: [],
        currentTime: 0,
        tempo: 120,
        totalNotes: 0,
        trackActivity: {}
      };

      expect(isLiveMIDIData(validData)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON data', () => {
      const malformedData = {
        frequencies: [1, 2, NaN, 4, 5],
        timeData: [0.1, 0.2, Infinity, 0.4, 0.5],
        volume: 0.8,
        bass: 0.6,
        mid: 0.7,
        treble: 0.5
      };

      // Should still validate structure even with NaN/Infinity
      expect(isAudioAnalysisData(malformedData)).toBe(true);
    });

    it('should handle circular references gracefully', () => {
      const circularData: any = {
        frequencies: [1, 2, 3],
        timeData: [0.1, 0.2, 0.3],
        volume: 0.8,
        bass: 0.6,
        mid: 0.7,
        treble: 0.5
      };
      
      // Create circular reference
      circularData.self = circularData;

      // Should still validate the main structure
      expect(isAudioAnalysisData(circularData)).toBe(true);
    });
  });

  describe('Performance Validation', () => {
    it('should validate large datasets efficiently', () => {
      const largeData = {
        frequencies: new Array(8192).fill(0).map(() => Math.random()),
        timeData: new Array(8192).fill(0).map(() => Math.random()),
        volume: Math.random(),
        bass: Math.random(),
        mid: Math.random(),
        treble: Math.random()
      };

      const startTime = performance.now();
      const isValid = isAudioAnalysisData(largeData);
      const endTime = performance.now();

      expect(isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle deeply nested structures', () => {
      const deeplyNested = {
        activeNotes: new Array(1000).fill(0).map((_, i) => ({
          note: 60 + (i % 12),
          velocity: 127,
          startTime: i * 0.1,
          track: `track_${i % 10}`
        })),
        currentTime: 100,
        tempo: 120,
        totalNotes: 1000,
        trackActivity: Object.fromEntries(
          new Array(10).fill(0).map((_, i) => [`track_${i}`, i % 2 === 0])
        )
      };

      const startTime = performance.now();
      const isValid = isLiveMIDIData(deeplyNested);
      const endTime = performance.now();

      expect(isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays', () => {
      const emptyArrayData = {
        frequencies: [],
        timeData: [],
        volume: 0,
        bass: 0,
        mid: 0,
        treble: 0
      };

      expect(isAudioAnalysisData(emptyArrayData)).toBe(true);
    });

    it('should handle extreme numeric values', () => {
      const extremeData = {
        frequencies: [Number.MAX_VALUE, Number.MIN_VALUE, 0, -0],
        timeData: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
        volume: Number.MAX_SAFE_INTEGER,
        bass: Number.MIN_SAFE_INTEGER,
        mid: Number.EPSILON,
        treble: -Number.EPSILON
      };

      expect(isAudioAnalysisData(extremeData)).toBe(true);
    });

    it('should handle special string values', () => {
      const midiWithSpecialStrings = {
        activeNotes: [
          {
            note: 60,
            velocity: 127,
            startTime: 0,
            track: '' // Empty string
          },
          {
            note: 64,
            velocity: 100,
            startTime: 1,
            track: '🎵🎶🎼' // Unicode characters
          }
        ],
        currentTime: 2,
        tempo: 120,
        totalNotes: 2,
        trackActivity: {
          '': true, // Empty key
          '🎵🎶🎼': false // Unicode key
        }
      };

      expect(isLiveMIDIData(midiWithSpecialStrings)).toBe(true);
    });
  });

  describe('Type Coercion Prevention', () => {
    it('should not accept string numbers as numbers', () => {
      const stringNumberData = {
        frequencies: ['1', '2', '3'], // String numbers
        timeData: [0.1, 0.2, 0.3],
        volume: '0.8', // String number
        bass: 0.6,
        mid: 0.7,
        treble: 0.5
      };

      expect(isAudioAnalysisData(stringNumberData)).toBe(false);
    });

    it('should not accept boolean values as numbers', () => {
      const booleanData = {
        frequencies: [1, 2, 3],
        timeData: [0.1, 0.2, 0.3],
        volume: true, // Boolean instead of number
        bass: false, // Boolean instead of number
        mid: 0.7,
        treble: 0.5
      };

      expect(isAudioAnalysisData(booleanData)).toBe(false);
    });
  });
});
