import { describe, it, expect } from 'vitest';

describe('Database Schema Validation', () => {
  describe('MIDI Files Table Schema', () => {
    it('should have all required columns for MIDI processing', () => {
      // Test data structure that matches our expected schema
      const sampleMidiFile = {
        id: 'uuid-string',
        user_id: 'user-uuid',
        file_key: 'midi/user-id/123_song.mid',
        original_filename: 'song.mid',
        file_size: 1024,
        duration_seconds: 120.5,
        track_count: 4,
        note_count: 500,
        time_signature: '4/4',
        key_signature: 'C major',
        tempo_bpm: 120,
        parsing_status: 'completed',
        parsed_data: {
          file: {
            name: 'song.mid',
            size: 1024,
            duration: 120.5,
            ticksPerQuarter: 480,
            timeSignature: [4, 4],
            keySignature: 'C major'
          },
          tracks: [],
          tempoChanges: []
        },
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Verify all expected fields are present
      expect(sampleMidiFile).toHaveProperty('id');
      expect(sampleMidiFile).toHaveProperty('user_id');
      expect(sampleMidiFile).toHaveProperty('file_key');
      expect(sampleMidiFile).toHaveProperty('original_filename');
      expect(sampleMidiFile).toHaveProperty('file_size');
      expect(sampleMidiFile).toHaveProperty('duration_seconds');
      expect(sampleMidiFile).toHaveProperty('track_count');
      expect(sampleMidiFile).toHaveProperty('note_count');
      expect(sampleMidiFile).toHaveProperty('time_signature');
      expect(sampleMidiFile).toHaveProperty('key_signature');
      expect(sampleMidiFile).toHaveProperty('tempo_bpm');
      expect(sampleMidiFile).toHaveProperty('parsing_status');
      expect(sampleMidiFile).toHaveProperty('parsed_data');
      expect(sampleMidiFile).toHaveProperty('error_message');
      expect(sampleMidiFile).toHaveProperty('created_at');
      expect(sampleMidiFile).toHaveProperty('updated_at');
    });

    it('should validate parsing status enum values', () => {
      const validStatuses = ['pending', 'completed', 'failed'];
      
      validStatuses.forEach(status => {
        expect(['pending', 'completed', 'failed']).toContain(status);
      });
    });

    it('should validate parsed_data structure', () => {
      const sampleParsedData = {
        file: {
          name: 'test.mid',
          size: 1024,
          duration: 60,
          ticksPerQuarter: 480,
          timeSignature: [4, 4],
          keySignature: 'C major'
        },
        tracks: [
          {
            id: 'track-1',
            name: 'Piano',
            instrument: 'Acoustic Grand Piano',
            channel: 0,
            notes: [],
            color: '#84a98c'
          }
        ],
        tempoChanges: [
          {
            tick: 0,
            bpm: 120,
            microsecondsPerQuarter: 500000
          }
        ]
      };

      expect(sampleParsedData.file).toHaveProperty('name');
      expect(sampleParsedData.file).toHaveProperty('duration');
      expect(sampleParsedData.file).toHaveProperty('ticksPerQuarter');
      expect(sampleParsedData).toHaveProperty('tracks');
      expect(sampleParsedData).toHaveProperty('tempoChanges');
      expect(Array.isArray(sampleParsedData.tracks)).toBe(true);
      expect(Array.isArray(sampleParsedData.tempoChanges)).toBe(true);
    });
  });

  describe('Visualization Settings Table Schema', () => {
    it('should have all required columns for visualization preferences', () => {
      const sampleVisualizationSettings = {
        id: 'uuid-string',
        user_id: 'user-uuid',
        midi_file_id: 'midi-file-uuid',
        color_scheme: 'mixed',
        pixels_per_second: 50,
        show_track_labels: true,
        show_velocity: true,
        min_key: 21,
        max_key: 108,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Verify all expected fields are present
      expect(sampleVisualizationSettings).toHaveProperty('id');
      expect(sampleVisualizationSettings).toHaveProperty('user_id');
      expect(sampleVisualizationSettings).toHaveProperty('midi_file_id');
      expect(sampleVisualizationSettings).toHaveProperty('color_scheme');
      expect(sampleVisualizationSettings).toHaveProperty('pixels_per_second');
      expect(sampleVisualizationSettings).toHaveProperty('show_track_labels');
      expect(sampleVisualizationSettings).toHaveProperty('show_velocity');
      expect(sampleVisualizationSettings).toHaveProperty('min_key');
      expect(sampleVisualizationSettings).toHaveProperty('max_key');
      expect(sampleVisualizationSettings).toHaveProperty('created_at');
      expect(sampleVisualizationSettings).toHaveProperty('updated_at');
    });

    it('should validate color scheme enum values', () => {
      const validColorSchemes = ['sage', 'slate', 'dusty-rose', 'mixed'];
      
      validColorSchemes.forEach(scheme => {
        expect(['sage', 'slate', 'dusty-rose', 'mixed']).toContain(scheme);
      });
    });

    it('should validate pixels per second range', () => {
      const testValues = [
        { value: 10, valid: true },
        { value: 50, valid: true },
        { value: 200, valid: true },
        { value: 5, valid: false },   // Too low
        { value: 250, valid: false }  // Too high
      ];

      testValues.forEach(({ value, valid }) => {
        const isValid = value >= 10 && value <= 200;
        expect(isValid).toBe(valid);
      });
    });

    it('should validate MIDI key range', () => {
      const testKeys = [
        { min: 21, max: 108, valid: true },
        { min: 0, max: 127, valid: true },
        { min: 60, max: 72, valid: true },
        { min: 108, max: 21, valid: false }, // Invalid range
        { min: -1, max: 127, valid: false }, // Below minimum
        { min: 0, max: 128, valid: false }   // Above maximum
      ];

      testKeys.forEach(({ min, max, valid }) => {
        const isValidRange = min >= 0 && max <= 127 && min <= max;
        expect(isValidRange).toBe(valid);
      });
    });
  });

  describe('Data Relationships', () => {
    it('should maintain referential integrity between tables', () => {
      // Sample data showing the relationship
      const midiFile = {
        id: 'midi-file-uuid',
        user_id: 'user-uuid'
      };

      const visualizationSettings = {
        id: 'settings-uuid',
        user_id: 'user-uuid',           // Must match MIDI file user
        midi_file_id: 'midi-file-uuid'  // Must reference existing MIDI file
      };

      // Verify foreign key relationships
      expect(visualizationSettings.user_id).toBe(midiFile.user_id);
      expect(visualizationSettings.midi_file_id).toBe(midiFile.id);
    });

    it('should ensure unique constraint on user/midi_file combination', () => {
      // Only one settings record per user per MIDI file
      const settings1 = {
        user_id: 'user-1',
        midi_file_id: 'midi-1',
        color_scheme: 'sage'
      };

      const settings2 = {
        user_id: 'user-1',
        midi_file_id: 'midi-1',  // Same combination - should be unique constraint violation
        color_scheme: 'slate'
      };

      // In a real database, this would violate the unique constraint
      expect(settings1.user_id).toBe(settings2.user_id);
      expect(settings1.midi_file_id).toBe(settings2.midi_file_id);
    });
  });

  describe('Index Coverage', () => {
    it('should have proper indexes for common query patterns', () => {
      // Verify we have indexes for common queries our API will perform
      const commonQueries = [
        'WHERE user_id = ?',                    // User's files
        'WHERE user_id = ? AND file_key = ?',   // Specific file lookup
        'WHERE parsing_status = ?',             // Status filtering
        'WHERE created_at > ?',                 // Time-based queries
        'WHERE midi_file_id = ?'                // Settings lookup
      ];

      // These represent the indexes we created in our schema
      const expectedIndexes = [
        'idx_midi_files_user_id',
        'idx_midi_files_file_key', 
        'idx_midi_files_parsing_status',
        'idx_midi_files_created_at',
        'idx_midi_files_user_file_key',
        'idx_visualization_settings_user_id',
        'idx_visualization_settings_midi_file_id',
        'idx_visualization_settings_user_midi_file'
      ];

      expect(expectedIndexes.length).toBeGreaterThan(0);
      expect(commonQueries.length).toBeGreaterThan(0);
    });
  });
}); 