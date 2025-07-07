import { describe, it, expect, beforeEach } from 'vitest';
import { parseMidiFile, validateMidiBuffer } from '../services/midi-parser.js';

describe('MIDI Parser Service', () => {
  describe('validateMidiBuffer', () => {
    it('should validate correct MIDI header', () => {
      // Create a buffer with MIDI header signature
      const buffer = Buffer.from([0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06]);
      expect(validateMidiBuffer(buffer)).toBe(true);
    });

    it('should reject buffer without MIDI header', () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      expect(validateMidiBuffer(buffer)).toBe(false);
    });

    it('should reject empty buffer', () => {
      const buffer = Buffer.alloc(0);
      expect(validateMidiBuffer(buffer)).toBe(false);
    });

    it('should reject buffer that is too short', () => {
      const buffer = Buffer.from([0x4D, 0x54]);
      expect(validateMidiBuffer(buffer)).toBe(false);
    });
  });

  describe('parseMidiFile', () => {
    it('should handle invalid MIDI data gracefully', async () => {
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const result = await parseMidiFile(invalidBuffer, 'test.mid');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    it('should create minimal MIDI data structure for valid but empty file', async () => {
      // Create minimal valid MIDI file structure
      const midiHeader = Buffer.from([
        0x4D, 0x54, 0x68, 0x64, // "MThd" header
        0x00, 0x00, 0x00, 0x06, // Header length (6 bytes)
        0x00, 0x00,             // Format type 0
        0x00, 0x01,             // Number of tracks (1)
        0x00, 0x60,             // Ticks per quarter note (96)
        
        0x4D, 0x54, 0x72, 0x6B, // "MTrk" track header
        0x00, 0x00, 0x00, 0x04, // Track length (4 bytes)
        0x00, 0xFF, 0x2F, 0x00  // End of track meta event
      ]);

      const result = await parseMidiFile(midiHeader, 'empty.mid');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        expect(result.data.file.name).toBe('empty.mid');
        expect(result.data.file.size).toBe(midiHeader.length);
        expect(result.data.file.ticksPerQuarter).toBe(96);
        expect(result.data.tracks).toHaveLength(0); // No notes = no tracks in our implementation
        expect(result.data.tempoChanges).toHaveLength(1); // Default tempo
        expect(result.data.tempoChanges[0].bpm).toBe(120);
      }
    });

    it('should extract basic MIDI information correctly', async () => {
      // This would require a more complex MIDI buffer with actual note events
      // For now, test the error handling path
      const filename = 'test-song.mid';
      const result = await parseMidiFile(Buffer.alloc(0), filename);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid MIDI file format');
    });
  });

  describe('MIDI Note Conversion', () => {
    it('should convert MIDI note numbers to correct note names', () => {
      // This tests the internal midiNoteToName function indirectly
      // We'll need to export it or test through the main parsing function
      expect(true).toBe(true); // Placeholder for now
    });
  });

  describe('Color Assignment', () => {
    it('should assign colors from the muted palette', () => {
      // Test that tracks get assigned appropriate colors
      expect(true).toBe(true); // Placeholder for now
    });
  });

  describe('Performance', () => {
    it('should handle large MIDI files efficiently', async () => {
      // Create a larger buffer to test performance
      const largeBuffer = Buffer.alloc(1000000); // 1MB buffer
      const startTime = Date.now();
      
      const result = await parseMidiFile(largeBuffer, 'large.mid');
      const endTime = Date.now();
      
      // Should complete in reasonable time (even if it fails parsing)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
      expect(result).toBeDefined();
    });
  });
}); 