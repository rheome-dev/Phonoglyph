"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.midiRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const server_1 = require("@trpc/server");
const r2_storage_1 = require("../services/r2-storage");
const midi_parser_1 = require("../services/midi-parser");
// Validation schemas
const VisualizationSettingsSchema = zod_1.z.object({
    colorScheme: zod_1.z.enum(['sage', 'slate', 'dusty-rose', 'mixed']).default('mixed'),
    pixelsPerSecond: zod_1.z.number().min(10).max(200).default(50),
    showTrackLabels: zod_1.z.boolean().default(true),
    showVelocity: zod_1.z.boolean().default(true),
    minKey: zod_1.z.number().min(0).max(127).default(21),
    maxKey: zod_1.z.number().min(0).max(127).default(108),
});
exports.midiRouter = (0, trpc_1.router)({
    // Parse uploaded MIDI file
    parseMidiFile: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        fileId: zod_1.z.string(),
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
                throw new server_1.TRPCError({
                    code: 'NOT_FOUND',
                    message: 'MIDI file not found or access denied',
                });
            }
            // Check if file upload is complete
            if (fileData.upload_status !== 'completed') {
                throw new server_1.TRPCError({
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
                    data: existingMidi.parsed_data,
                    cached: true,
                };
            }
            // Get file buffer from R2
            const fileBuffer = await (0, r2_storage_1.getFileBuffer)(fileData.s3_key);
            // Validate MIDI format
            if (!(0, midi_parser_1.validateMidiBuffer)(fileBuffer)) {
                throw new server_1.TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invalid MIDI file format',
                });
            }
            // Parse MIDI file
            const parsingResult = await (0, midi_parser_1.parseMidiFile)(fileBuffer, fileData.file_name);
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
                throw new server_1.TRPCError({
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
                console.error('Database error storing MIDI data:', insertError);
                throw new server_1.TRPCError({
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
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error parsing MIDI file:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to parse MIDI file',
            });
        }
    }),
    // Get visualization data for a MIDI file
    getVisualizationData: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        fileId: zod_1.z.string(),
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
                throw new server_1.TRPCError({
                    code: 'NOT_FOUND',
                    message: 'MIDI file not found or access denied',
                });
            }
            if (midiFile.parsing_status !== 'completed') {
                throw new server_1.TRPCError({
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
                midiData: midiFile.parsed_data,
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
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error getting visualization data:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to get visualization data',
            });
        }
    }),
    // Save visualization preferences
    saveVisualizationSettings: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        fileId: zod_1.z.string(),
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
                throw new server_1.TRPCError({
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
                console.error('Database error saving visualization settings:', upsertError);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to save visualization settings',
                });
            }
            return {
                success: true,
                message: 'Visualization settings saved successfully',
            };
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error saving visualization settings:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to save visualization settings',
            });
        }
    }),
    // Get user's MIDI files list
    getUserMidiFiles: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        limit: zod_1.z.number().min(1).max(50).default(20),
        offset: zod_1.z.number().min(0).default(0),
        status: zod_1.z.enum(['all', 'completed', 'failed', 'pending']).default('all'),
    }))
        .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            let query = ctx.supabase
                .from('midi_files')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(input.offset, input.offset + input.limit - 1);
            if (input.status !== 'all') {
                query = query.eq('parsing_status', input.status);
            }
            const { data: midiFiles, error } = await query;
            if (error) {
                // If the table doesn't exist yet, return empty result instead of error
                if (error.code === '42P01') { // Table doesn't exist
                    console.log('MIDI files table does not exist yet, returning empty result');
                    return {
                        files: [],
                        hasMore: false,
                    };
                }
                console.error('Database error fetching MIDI files:', error);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch MIDI files',
                });
            }
            return {
                files: midiFiles.map((file) => ({
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
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error fetching user MIDI files:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch MIDI files',
            });
        }
    }),
});
//# sourceMappingURL=midi.js.map