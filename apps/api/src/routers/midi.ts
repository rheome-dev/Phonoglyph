import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { getFileBuffer } from '../services/r2-storage';
import { parseMidiFile, validateMidiBuffer } from '../services/midi-parser';
import { MIDIData } from 'phonoglyph-types';
import { logger } from '../lib/logger';

// Validation schemas
const VisualizationSettingsSchema = z.object({
  colorScheme: z.enum(['sage', 'slate', 'dusty-rose', 'mixed']).default('mixed'),
  pixelsPerSecond: z.number().min(10).max(200).default(50),
  showTrackLabels: z.boolean().default(true),
  showVelocity: z.boolean().default(true),
  minKey: z.number().min(0).max(127).default(21),
  maxKey: z.number().min(0).max(127).default(108),
});

export const midiRouter = router({
  
  // Parse uploaded MIDI file
  parseMidiFile: protectedProcedure
    .input(z.object({
      fileId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      try {
        // Get file metadata from database
        const { data: fileData, error: fetchError } = await ctx.supabase
          .from('file_metadata')
          .select('*')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .eq('file_type', 'midi')
          .single();

        if (fetchError || !fileData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'MIDI file not found or access denied',
          });
        }

        // Check if file upload is complete
        if (fileData.upload_status !== 'completed') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'File upload is not complete',
          });
        }

        // Check if already parsed
        const { data: existingMidi } = await ctx.supabase
          .from('midi_files')
          .select('*')
          .eq('file_key', fileData.s3_key)
          .eq('user_id', userId)
          .single();

        if (existingMidi && existingMidi.parsing_status === 'completed') {
          return {
            success: true,
            midiFileId: existingMidi.id,
            data: existingMidi.parsed_data as MIDIData,
            cached: true,
          };
        }

        // Get file buffer from R2
        const fileBuffer = await getFileBuffer(fileData.s3_key);

        // Validate MIDI format
        if (!validateMidiBuffer(fileBuffer)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid MIDI file format',
          });
        }

        // Parse MIDI file
        const parsingResult = await parseMidiFile(fileBuffer, fileData.file_name);

        if (!parsingResult.success || !parsingResult.data) {
          // Update parsing status to failed
          await ctx.supabase
            .from('midi_files')
            .upsert({
              user_id: userId,
              file_key: fileData.s3_key,
              original_filename: fileData.file_name,
              file_size: fileData.file_size,
              parsing_status: 'failed',
              error_message: parsingResult.error,
            });

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: parsingResult.error || 'Failed to parse MIDI file',
          });
        }

        // Store parsed data in database
        const { data: midiRecord, error: insertError } = await ctx.supabase
          .from('midi_files')
          .upsert({
            user_id: userId,
            file_key: fileData.s3_key,
            original_filename: fileData.file_name,
            file_size: fileData.file_size,
            duration_seconds: parsingResult.data.file.duration,
            track_count: parsingResult.data.tracks.length,
            note_count: parsingResult.data.tracks.reduce((sum, track) => sum + track.notes.length, 0),
            time_signature: `${parsingResult.data.file.timeSignature[0]}/${parsingResult.data.file.timeSignature[1]}`,
            key_signature: parsingResult.data.file.keySignature,
            tempo_bpm: parsingResult.data.tempoChanges[0]?.bpm || 120,
            parsing_status: 'completed',
            parsed_data: parsingResult.data,
            error_message: null,
          })
          .select()
          .single();

        if (insertError) {
          logger.error('Database error storing MIDI data:', insertError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to store parsed MIDI data',
          });
        }

        return {
          success: true,
          midiFileId: midiRecord.id,
          data: parsingResult.data,
          cached: false,
        };

      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        logger.error('Error parsing MIDI file:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to parse MIDI file',
        });
      }
    }),

  // Get visualization data for a MIDI file
  getVisualizationData: protectedProcedure
    .input(z.object({
      fileId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      try {
        // Get MIDI file data
        const { data: midiFile, error: fetchError } = await ctx.supabase
          .from('midi_files')
          .select('*')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single();

        if (fetchError || !midiFile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'MIDI file not found or access denied',
          });
        }

        if (midiFile.parsing_status !== 'completed') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'MIDI file has not been parsed yet',
          });
        }

        // Get user's visualization settings
        const { data: settings } = await ctx.supabase
          .from('visualization_settings')
          .select('*')
          .eq('user_id', userId)
          .eq('midi_file_id', input.fileId)
          .single();

        return {
          midiData: midiFile.parsed_data as MIDIData,
          settings: settings || null,
          metadata: {
            id: midiFile.id,
            fileName: midiFile.original_filename,
            duration: midiFile.duration_seconds,
            trackCount: midiFile.track_count,
            noteCount: midiFile.note_count,
            timeSignature: midiFile.time_signature,
            keySignature: midiFile.key_signature,
            tempoBpm: midiFile.tempo_bpm,
          },
        };

      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        logger.error('Error getting visualization data:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get visualization data',
        });
      }
    }),

  // Save visualization preferences
  saveVisualizationSettings: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      settings: VisualizationSettingsSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      try {
        // Verify user owns the MIDI file
        const { data: midiFile, error: fetchError } = await ctx.supabase
          .from('midi_files')
          .select('id')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single();

        if (fetchError || !midiFile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'MIDI file not found or access denied',
          });
        }

        // Upsert visualization settings
        const { error: upsertError } = await ctx.supabase
          .from('visualization_settings')
          .upsert({
            user_id: userId,
            midi_file_id: input.fileId,
            color_scheme: input.settings.colorScheme,
            pixels_per_second: input.settings.pixelsPerSecond,
            show_track_labels: input.settings.showTrackLabels,
            show_velocity: input.settings.showVelocity,
            min_key: input.settings.minKey,
            max_key: input.settings.maxKey,
          });

        if (upsertError) {
          logger.error('Database error saving visualization settings:', upsertError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save visualization settings',
          });
        }

        return {
          success: true,
          message: 'Visualization settings saved successfully',
        };

      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        logger.error('Error saving visualization settings:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save visualization settings',
        });
      }
    }),

  // Get user's MIDI files list
  getUserMidiFiles: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
      status: z.enum(['all', 'completed', 'failed', 'pending']).default('all'),
      projectId: z.string().optional(), // NEW: Filter by project
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      try {
        let midiFiles;
        
        if (input.projectId) {
          // When filtering by project, first get file_metadata for the project
          const { data: fileMetadata, error: fileError } = await ctx.supabase
            .from('file_metadata')
            .select('s3_key')
            .eq('user_id', userId)
            .eq('project_id', input.projectId)
            .eq('file_type', 'midi');
            
          if (fileError) {
            logger.error('Database error fetching file metadata:', fileError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to fetch project files',
            });
          }
          
          if (!fileMetadata || fileMetadata.length === 0) {
            // No files in this project
            return {
              files: [],
              hasMore: false,
            };
          }
          
          // Get the s3_keys for files in this project
          const s3Keys = fileMetadata.map((f: any) => f.s3_key);
          
          // Now query midi_files for those s3_keys
          let query = ctx.supabase
            .from('midi_files')
            .select('*')
            .eq('user_id', userId)
            .in('file_key', s3Keys)
            .order('created_at', { ascending: false })
            .range(input.offset, input.offset + input.limit - 1);
            
          if (input.status !== 'all') {
            query = query.eq('parsing_status', input.status);
          }
          
          const { data, error } = await query;
          midiFiles = data;
          
          if (error) {
            logger.error('Database error fetching MIDI files:', error);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to fetch MIDI files',
            });
          }
        } else {
          // Standard query without project filtering
          let query = ctx.supabase
            .from('midi_files')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(input.offset, input.offset + input.limit - 1);
            
          if (input.status !== 'all') {
            query = query.eq('parsing_status', input.status);
          }
          
          const { data, error } = await query;
          midiFiles = data;
          
          if (error) {
            // If the table doesn't exist yet, return empty result instead of error
            if (error.code === '42P01') { // Table doesn't exist
              logger.log('MIDI files table does not exist yet, returning empty result');
              return {
                files: [],
                hasMore: false,
              };
            }
            
            logger.error('Database error fetching MIDI files:', error);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to fetch MIDI files',
            });
          }
        }

        return {
          files: (midiFiles || []).map((file: any) => ({
            id: file.id,
            fileName: file.original_filename,
            fileSize: file.file_size,
            duration: file.duration_seconds,
            trackCount: file.track_count,
            noteCount: file.note_count,
            status: file.parsing_status,
            createdAt: file.created_at,
            errorMessage: file.error_message,
          })),
          hasMore: midiFiles.length === input.limit,
        };

      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        logger.error('Error fetching user MIDI files:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch MIDI files',
        });
      }
    }),
}); 