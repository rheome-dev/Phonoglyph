"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioAnalysisSandboxRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const server_1 = require("@trpc/server");
const logger_1 = require("../lib/logger");
// Schema for sandbox analysis data
const SandboxAnalysisSchema = zod_1.z.object({
    transients: zod_1.z.array(zod_1.z.object({
        time: zod_1.z.number(),
        intensity: zod_1.z.number(),
        frequency: zod_1.z.number(),
    })),
    chroma: zod_1.z.array(zod_1.z.object({
        time: zod_1.z.number(),
        pitch: zod_1.z.number(),
        confidence: zod_1.z.number(),
        note: zod_1.z.string(),
    })),
    rms: zod_1.z.array(zod_1.z.object({
        time: zod_1.z.number(),
        value: zod_1.z.number(),
    })),
    waveform: zod_1.z.array(zod_1.z.number()),
    metadata: zod_1.z.object({
        sampleRate: zod_1.z.number(),
        duration: zod_1.z.number(),
        bufferSize: zod_1.z.number(),
        analysisParams: zod_1.z.any(),
    }),
});
// Schema for cached sandbox analysis
const CachedSandboxAnalysisSchema = zod_1.z.object({
    id: zod_1.z.string(),
    fileMetadataId: zod_1.z.string(),
    stemType: zod_1.z.string(),
    analysisData: SandboxAnalysisSchema,
    waveformData: zod_1.z.object({
        points: zod_1.z.array(zod_1.z.number()),
        duration: zod_1.z.number(),
        sampleRate: zod_1.z.number(),
        markers: zod_1.z.array(zod_1.z.any()),
    }),
    metadata: zod_1.z.object({
        sampleRate: zod_1.z.number(),
        duration: zod_1.z.number(),
        bufferSize: zod_1.z.number(),
        featuresExtracted: zod_1.z.array(zod_1.z.string()),
        analysisDuration: zod_1.z.number(),
    }),
});
exports.audioAnalysisSandboxRouter = (0, trpc_1.router)({
    // Simple test endpoint to verify the router is working
    test: trpc_1.publicProcedure
        .query(() => {
        return {
            success: true,
            message: 'Audio Analysis Sandbox API is working!',
            timestamp: new Date().toISOString(),
        };
    }),
    // Save sandbox analysis to cache
    saveSandboxAnalysis: trpc_1.protectedProcedure
        .input(CachedSandboxAnalysisSchema)
        .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            // Verify that the user has access to this file
            const { data: file, error: fileError } = await ctx.supabase
                .from('file_metadata')
                .select('id, user_id')
                .eq('id', input.fileMetadataId)
                .single();
            if (fileError || !file) {
                throw new server_1.TRPCError({
                    code: 'NOT_FOUND',
                    message: 'File not found or access denied'
                });
            }
            if (file.user_id !== userId) {
                throw new server_1.TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this file'
                });
            }
            // Save the sandbox analysis data
            const { error: saveError } = await ctx.supabase
                .from('audio_analysis_cache')
                .insert({
                user_id: userId,
                file_metadata_id: input.fileMetadataId,
                stem_type: input.stemType,
                analysis_version: '2.0-sandbox', // Mark as sandbox version
                sample_rate: input.metadata.sampleRate,
                duration: input.metadata.duration,
                buffer_size: input.metadata.bufferSize,
                features_extracted: input.metadata.featuresExtracted,
                analysis_data: input.analysisData,
                waveform_data: input.waveformData,
                analysis_duration: input.metadata.analysisDuration,
            });
            if (saveError) {
                logger_1.logger.error('Failed to save sandbox analysis:', saveError);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to save sandbox analysis: ${saveError.message}`,
                });
            }
            return {
                success: true,
                message: 'Sandbox analysis saved successfully'
            };
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            logger_1.logger.error('Error saving sandbox analysis:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to save sandbox analysis',
            });
        }
    }),
    // Get sandbox analysis from cache
    getSandboxAnalysis: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        fileId: zod_1.z.string(),
        stemType: zod_1.z.string().optional().default('master'),
    }))
        .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            // Get the cached analysis
            const { data: analysis, error: analysisError } = await ctx.supabase
                .from('audio_analysis_cache')
                .select('*')
                .eq('file_metadata_id', input.fileId)
                .eq('user_id', userId)
                .eq('stem_type', input.stemType)
                .eq('analysis_version', '2.0-sandbox')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (analysisError || !analysis) {
                return null;
            }
            return {
                id: analysis.id,
                fileMetadataId: analysis.file_metadata_id,
                stemType: analysis.stem_type,
                analysisData: analysis.analysis_data,
                waveformData: analysis.waveform_data,
                metadata: {
                    sampleRate: analysis.sample_rate,
                    duration: analysis.duration,
                    bufferSize: analysis.buffer_size,
                    featuresExtracted: analysis.features_extracted,
                    analysisDuration: analysis.analysis_duration,
                },
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting sandbox analysis:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to get sandbox analysis',
            });
        }
    }),
    // Compare sandbox analysis with existing cached analysis
    compareAnalysis: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        fileId: zod_1.z.string(),
        stemType: zod_1.z.string().optional().default('master'),
    }))
        .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            // Get both sandbox and regular cached analysis
            const [sandboxResult, regularResult] = await Promise.all([
                ctx.supabase
                    .from('audio_analysis_cache')
                    .select('*')
                    .eq('file_metadata_id', input.fileId)
                    .eq('user_id', userId)
                    .eq('stem_type', input.stemType)
                    .eq('analysis_version', '2.0-sandbox')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single(),
                ctx.supabase
                    .from('audio_analysis_cache')
                    .select('*')
                    .eq('file_metadata_id', input.fileId)
                    .eq('user_id', userId)
                    .eq('stem_type', input.stemType)
                    .neq('analysis_version', '2.0-sandbox')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single(),
            ]);
            const sandboxAnalysis = sandboxResult.data;
            const regularAnalysis = regularResult.data;
            if (!sandboxAnalysis && !regularAnalysis) {
                return null;
            }
            // Compare the analyses
            const comparison = {
                hasSandbox: !!sandboxAnalysis,
                hasRegular: !!regularAnalysis,
                sandbox: sandboxAnalysis ? {
                    transients: sandboxAnalysis.analysis_data?.transients?.length || 0,
                    chroma: sandboxAnalysis.analysis_data?.chroma?.length || 0,
                    rms: sandboxAnalysis.analysis_data?.rms?.length || 0,
                    createdAt: sandboxAnalysis.created_at,
                } : null,
                regular: regularAnalysis ? {
                    transients: regularAnalysis.analysis_data?.transients?.length || 0,
                    chroma: regularAnalysis.analysis_data?.chroma?.length || 0,
                    rms: regularAnalysis.analysis_data?.rms?.length || 0,
                    createdAt: regularAnalysis.created_at,
                } : null,
            };
            return comparison;
        }
        catch (error) {
            logger_1.logger.error('Error comparing analysis:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to compare analysis',
            });
        }
    }),
    // Get all sandbox analyses for a user
    getSandboxAnalyses: trpc_1.flexibleProcedure
        .input(zod_1.z.object({
        limit: zod_1.z.number().optional().default(10),
        offset: zod_1.z.number().optional().default(0),
    }))
        .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            const { data: analyses, error } = await ctx.supabase
                .from('audio_analysis_cache')
                .select(`
            *,
            file_metadata (
              file_name,
              file_type
            )
          `)
                .eq('user_id', userId)
                .eq('analysis_version', '2.0-sandbox')
                .order('created_at', { ascending: false })
                .range(input.offset, input.offset + input.limit - 1);
            if (error) {
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to get sandbox analyses: ${error.message}`,
                });
            }
            return analyses || [];
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            logger_1.logger.error('Error getting sandbox analyses:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to get sandbox analyses',
            });
        }
    }),
    // Delete sandbox analysis
    deleteSandboxAnalysis: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        analysisId: zod_1.z.string(),
    }))
        .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            // Verify ownership
            const { data: analysis, error: fetchError } = await ctx.supabase
                .from('audio_analysis_cache')
                .select('id, user_id')
                .eq('id', input.analysisId)
                .eq('user_id', userId)
                .eq('analysis_version', '2.0-sandbox')
                .single();
            if (fetchError || !analysis) {
                throw new server_1.TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Sandbox analysis not found or access denied',
                });
            }
            // Delete the analysis
            const { error: deleteError } = await ctx.supabase
                .from('audio_analysis_cache')
                .delete()
                .eq('id', input.analysisId)
                .eq('user_id', userId);
            if (deleteError) {
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to delete sandbox analysis: ${deleteError.message}`,
                });
            }
            return {
                success: true,
                message: 'Sandbox analysis deleted successfully'
            };
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            logger_1.logger.error('Error deleting sandbox analysis:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to delete sandbox analysis',
            });
        }
    }),
});
//# sourceMappingURL=audio-analysis-sandbox.js.map