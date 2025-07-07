import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { midiRouter } from '../routers/midi';
import * as r2Storage from '../services/r2-storage';
import * as midiParser from '../services/midi-parser';

// Mock dependencies
vi.mock('../services/r2-storage');
vi.mock('../services/midi-parser');

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          })),
          single: vi.fn()
        })),
        single: vi.fn()
      }))
    })),
    upsert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    order: vi.fn(() => ({
      range: vi.fn()
    }))
  }))
};

const mockContext = {
  user: { id: 'test-user-id' },
  supabase: mockSupabase
};

describe('MIDI Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseMidiFile', () => {
    it('should parse a MIDI file successfully', async () => {
      // Mock file metadata response
      const fileData = {
        id: 'test-file-id',
        s3_key: 'midi/test-user-id/test.mid',
        file_name: 'test.mid',
        file_size: 1000,
        upload_status: 'completed',
        file_type: 'midi'
      };

      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValueOnce({
        data: fileData,
        error: null
      });

      // Mock no existing MIDI file
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock file buffer
      const mockBuffer = Buffer.from([0x4D, 0x54, 0x68, 0x64]); // "MThd"
      vi.mocked(r2Storage.getFileBuffer).mockResolvedValueOnce(mockBuffer);

      // Mock MIDI validation
      vi.mocked(midiParser.validateMidiBuffer).mockReturnValueOnce(true);

      // Mock MIDI parsing
      const mockMidiData = {
        file: {
          name: 'test.mid',
          size: 1000,
          duration: 10.5,
          ticksPerQuarter: 480,
          timeSignature: [4, 4] as [number, number],
          keySignature: 'C major'
        },
        tracks: [{
          id: 'track-1',
          name: 'Track 1',
          instrument: 'Piano',
          channel: 0,
          notes: [],
          color: '#84a98c'
        }],
        tempoChanges: [{
          tick: 0,
          bpm: 120,
          microsecondsPerQuarter: 500000
        }]
      };

      vi.mocked(midiParser.parseMidiFile).mockResolvedValueOnce({
        success: true,
        data: mockMidiData
      });

      // Mock database insert
      const midiRecord = { id: 'midi-record-id' };
      mockSupabase.from().upsert().select().single.mockResolvedValueOnce({
        data: midiRecord,
        error: null
      });

      // Execute the mutation
      const caller = midiRouter.createCaller(mockContext);
      const result = await caller.parseMidiFile({ fileId: 'test-file-id' });

      expect(result.success).toBe(true);
      expect(result.midiFileId).toBe('midi-record-id');
      expect(result.data).toEqual(mockMidiData);
      expect(result.cached).toBe(false);
    });

    it('should return cached data if already parsed', async () => {
      const fileData = {
        id: 'test-file-id',
        s3_key: 'midi/test-user-id/test.mid',
        file_name: 'test.mid',
        upload_status: 'completed',
        file_type: 'midi'
      };

      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValueOnce({
        data: fileData,
        error: null
      });

      // Mock existing MIDI file
      const existingMidi = {
        id: 'existing-midi-id',
        parsing_status: 'completed',
        parsed_data: { test: 'data' }
      };

      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: existingMidi,
        error: null
      });

      const caller = midiRouter.createCaller(mockContext);
      const result = await caller.parseMidiFile({ fileId: 'test-file-id' });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.midiFileId).toBe('existing-midi-id');
    });

    it('should throw error if file not found', async () => {
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: 'Not found'
      });

      const caller = midiRouter.createCaller(mockContext);
      
      await expect(caller.parseMidiFile({ fileId: 'non-existent' }))
        .rejects
        .toThrow('MIDI file not found or access denied');
    });

    it('should throw error if file upload not complete', async () => {
      const fileData = {
        upload_status: 'uploading',
        file_type: 'midi'
      };

      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValueOnce({
        data: fileData,
        error: null
      });

      const caller = midiRouter.createCaller(mockContext);
      
      await expect(caller.parseMidiFile({ fileId: 'test-file-id' }))
        .rejects
        .toThrow('File upload is not complete');
    });

    it('should throw error for invalid MIDI format', async () => {
      const fileData = {
        upload_status: 'completed',
        file_type: 'midi',
        s3_key: 'test-key'
      };

      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValueOnce({
        data: fileData,
        error: null
      });

      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const mockBuffer = Buffer.from([0x00, 0x00]); // Invalid MIDI
      vi.mocked(r2Storage.getFileBuffer).mockResolvedValueOnce(mockBuffer);
      vi.mocked(midiParser.validateMidiBuffer).mockReturnValueOnce(false);

      const caller = midiRouter.createCaller(mockContext);
      
      await expect(caller.parseMidiFile({ fileId: 'test-file-id' }))
        .rejects
        .toThrow('Invalid MIDI file format');
    });
  });

  describe('getVisualizationData', () => {
    it('should return visualization data successfully', async () => {
      const midiFile = {
        id: 'midi-file-id',
        parsing_status: 'completed',
        parsed_data: { test: 'midi-data' },
        original_filename: 'test.mid',
        duration_seconds: 10.5,
        track_count: 2,
        note_count: 100,
        time_signature: '4/4',
        key_signature: 'C major',
        tempo_bpm: 120
      };

      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: midiFile,
        error: null
      });

      const settings = {
        color_scheme: 'mixed',
        pixels_per_second: 50
      };

      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: settings,
        error: null
      });

      const caller = midiRouter.createCaller(mockContext);
      const result = await caller.getVisualizationData({ fileId: 'midi-file-id' });

      expect(result.midiData).toEqual({ test: 'midi-data' });
      expect(result.settings).toEqual(settings);
      expect(result.metadata.fileName).toBe('test.mid');
    });

    it('should throw error if MIDI file not parsed', async () => {
      const midiFile = {
        parsing_status: 'pending'
      };

      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: midiFile,
        error: null
      });

      const caller = midiRouter.createCaller(mockContext);
      
      await expect(caller.getVisualizationData({ fileId: 'midi-file-id' }))
        .rejects
        .toThrow('MIDI file has not been parsed yet');
    });
  });

  describe('saveVisualizationSettings', () => {
    it('should save visualization settings successfully', async () => {
      // Mock MIDI file exists
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { id: 'midi-file-id' },
        error: null
      });

      // Mock successful upsert
      mockSupabase.from().upsert.mockResolvedValueOnce({
        error: null
      });

      const caller = midiRouter.createCaller(mockContext);
      const result = await caller.saveVisualizationSettings({
        fileId: 'midi-file-id',
        settings: {
          colorScheme: 'sage',
          pixelsPerSecond: 75,
          showTrackLabels: true,
          showVelocity: false,
          minKey: 21,
          maxKey: 108
        }
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Visualization settings saved successfully');
    });

    it('should throw error if MIDI file not found', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: 'Not found'
      });

      const caller = midiRouter.createCaller(mockContext);
      
      await expect(caller.saveVisualizationSettings({
        fileId: 'non-existent',
        settings: { colorScheme: 'sage' }
      }))
        .rejects
        .toThrow('MIDI file not found or access denied');
    });
  });

  describe('getUserMidiFiles', () => {
    it('should return user MIDI files successfully', async () => {
      const midiFiles = [
        {
          id: 'file-1',
          original_filename: 'song1.mid',
          file_size: 1000,
          duration_seconds: 60,
          track_count: 2,
          note_count: 500,
          parsing_status: 'completed',
          created_at: '2024-01-01T00:00:00Z',
          error_message: null
        },
        {
          id: 'file-2',
          original_filename: 'song2.mid',
          file_size: 2000,
          duration_seconds: 120,
          track_count: 4,
          note_count: 1000,
          parsing_status: 'completed',
          created_at: '2024-01-02T00:00:00Z',
          error_message: null
        }
      ];

      mockSupabase.from().select().eq().order().range.mockResolvedValueOnce({
        data: midiFiles,
        error: null
      });

      const caller = midiRouter.createCaller(mockContext);
      const result = await caller.getUserMidiFiles({});

      expect(result.files).toHaveLength(2);
      expect(result.files[0].fileName).toBe('song1.mid');
      expect(result.hasMore).toBe(false);
    });

    it('should filter by status', async () => {
      mockSupabase.from().select().eq().order().range.mockImplementationOnce(() => ({
        eq: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null
        })
      }));

      const caller = midiRouter.createCaller(mockContext);
      const result = await caller.getUserMidiFiles({ status: 'failed' });

      expect(result.files).toHaveLength(0);
    });
  });
}); 