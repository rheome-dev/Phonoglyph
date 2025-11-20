"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stemRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const server_1 = require("@trpc/server");
const stem_separator_1 = require("../services/stem-separator");
const r2_storage_1 = require("../services/r2-storage");
const path_1 = require("path");
const fs_1 = require("fs");
const os_1 = require("os");
const logger_1 = require("../lib/logger");
exports.stemRouter = (0, trpc_1.router)({
    // Create a new stem separation job
    createSeparationJob: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        fileId: zod_1.z.string(),
        config: stem_separator_1.StemSeparationConfigSchema,
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
                .eq('file_type', 'audio')
                .single();
            if (fetchError || !fileData) {
                throw new server_1.TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Audio file not found or access denied',
                });
            }
            // Create stem separation job
            const initialJob = stem_separator_1.StemSeparator.createJob(input.config);
            // Store job in database
            const { error: insertError } = await ctx.supabase
                .from('stem_separation_jobs')
                .insert({
                id: initialJob.id,
                user_id: userId,
                file_key: fileData.s3_key,
                status: initialJob.status,
                config: input.config,
            });
            if (insertError) {
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create stem separation job',
                });
            }
            // Start processing in background
            const outputDir = (0, path_1.join)((0, os_1.tmpdir)(), initialJob.id);
            await fs_1.promises.mkdir(outputDir, { recursive: true });
            stem_separator_1.StemSeparator.processStem(initialJob.id, fileData.s3_key, outputDir)
                .then(async () => {
                const updatedJob = stem_separator_1.StemSeparator.getJob(initialJob.id);
                if (!updatedJob?.results)
                    return;
                // Upload stems to R2, create file metadata, and analyze them
                const stemUploads = Object.entries(updatedJob.results.stems).map(async ([stemName, stemPath]) => {
                    const stemKey = (0, r2_storage_1.generateS3Key)(userId, `${stemName}.${input.config.quality.outputFormat}`, 'audio');
                    const uploadUrl = await (0, r2_storage_1.generateUploadUrl)(stemKey, `audio/${input.config.quality.outputFormat}`);
                    // Read stem file and upload to R2
                    const stemBuffer = await fs_1.promises.readFile(stemPath);
                    await fetch(uploadUrl, {
                        method: 'PUT',
                        body: stemBuffer,
                        headers: {
                            'Content-Type': `audio/${input.config.quality.outputFormat}`,
                        },
                    });
                    // Create file metadata record for the stem
                    const { data: stemFileData, error: stemFileError } = await ctx.supabase
                        .from('file_metadata')
                        .insert({
                        user_id: userId,
                        file_name: `${stemName}.${input.config.quality.outputFormat}`,
                        file_type: 'audio',
                        mime_type: `audio/${input.config.quality.outputFormat}`,
                        file_size: stemBuffer.length,
                        s3_key: stemKey,
                        s3_bucket: process.env.R2_BUCKET_NAME || 'phonoglyph-storage',
                        upload_status: 'completed',
                        processing_status: 'completed',
                        project_id: fileData.project_id, // Associate with same project
                    })
                        .select('id')
                        .single();
                    if (stemFileError) {
                        logger_1.logger.error(`Failed to create file metadata for ${stemName} stem:`, stemFileError);
                        return { [stemName]: stemKey };
                    }
                    // Analyze the stem and cache the results
                    try {
                        const { AudioAnalyzer } = await Promise.resolve().then(() => __importStar(require('../services/audio-analyzer')));
                        const audioAnalyzer = new AudioAnalyzer();
                        await audioAnalyzer.analyzeAndCache(stemFileData.id, // Use the new stem file metadata ID
                        userId, stemName, stemBuffer);
                        logger_1.logger.log(`✅ Analyzed and cached ${stemName} stem`);
                    }
                    catch (analysisError) {
                        logger_1.logger.error(`❌ Failed to analyze ${stemName} stem:`, analysisError);
                        // Continue with other stems even if analysis fails
                    }
                    return { [stemName]: stemKey };
                });
                const stemKeys = Object.assign({}, ...(await Promise.all(stemUploads)));
                // Update job in database with results
                await ctx.supabase
                    .from('stem_separation_jobs')
                    .update({
                    status: 'completed',
                    progress: 100,
                    results: { stems: stemKeys },
                    analysis_status: 'completed',
                    analysis_completed_at: new Date().toISOString(),
                })
                    .eq('id', initialJob.id);
                // Cleanup temporary files
                await fs_1.promises.rm(outputDir, { recursive: true, force: true });
            })
                .catch(async (error) => {
                logger_1.logger.error('Stem separation failed:', error);
                // Update job status to failed
                await ctx.supabase
                    .from('stem_separation_jobs')
                    .update({
                    status: 'failed',
                    analysis_status: 'failed',
                })
                    .eq('id', initialJob.id);
                // Cleanup temporary files
                try {
                    await fs_1.promises.rm(outputDir, { recursive: true, force: true });
                }
                catch (cleanupError) {
                    logger_1.logger.error('Failed to cleanup temporary files:', cleanupError);
                }
            });
            return { jobId: initialJob.id };
        }
        catch (error) {
            logger_1.logger.error('Failed to create stem separation job:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }),
    // Get job status
    getJobStatus: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        jobId: zod_1.z.string(),
    }))
        .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            const { data: job, error } = await ctx.supabase
                .from('stem_separation_jobs')
                .select('*')
                .eq('id', input.jobId)
                .eq('user_id', userId)
                .single();
            if (error || !job) {
                throw new server_1.TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Job not found or access denied',
                });
            }
            return {
                id: job.id,
                status: job.status,
                progress: job.progress,
                analysisStatus: job.analysis_status,
                results: job.results,
                error: job.error,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get job status:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }),
    // Get cached audio analysis for multiple files
    getCachedAnalysis: trpc_1.flexibleProcedure
        .input(zod_1.z.object({
        fileIds: zod_1.z.array(zod_1.z.string()),
        stemType: zod_1.z.string().optional(),
    }))
        .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            const { AudioAnalyzer } = await Promise.resolve().then(() => __importStar(require('../services/audio-analyzer')));
            const audioAnalyzer = new AudioAnalyzer();
            return await audioAnalyzer.getBatchCachedAnalysis(input.fileIds, userId, input.stemType);
        }
        catch (error) {
            logger_1.logger.error('Failed to get batch cached analysis:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }),
    // Cache analysis data generated on the client
    cacheClientSideAnalysis: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        fileMetadataId: zod_1.z.string(),
        stemType: zod_1.z.string(),
        analysisData: zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.number())),
        waveformData: zod_1.z.object({
            points: zod_1.z.array(zod_1.z.number()),
            sampleRate: zod_1.z.number(),
            duration: zod_1.z.number(),
            markers: zod_1.z.array(zod_1.z.object({
                time: zod_1.z.number(),
                type: zod_1.z.enum(['beat', 'onset', 'peak', 'drop']),
                intensity: zod_1.z.number(),
                frequency: zod_1.z.number().optional(),
            })),
        }),
        metadata: zod_1.z.object({
            sampleRate: zod_1.z.number(),
            duration: zod_1.z.number(),
            bufferSize: zod_1.z.number(),
            featuresExtracted: zod_1.z.array(zod_1.z.string()),
        }),
    }))
        .mutation(async ({ ctx, input }) => {
        const { fileMetadataId, stemType, analysisData, waveformData, metadata } = input;
        const userId = ctx.user.id;
        const startTime = Date.now();
        try {
            const { data: existing, error: existingError } = await ctx.supabase
                .from('audio_analysis_cache')
                .select('id')
                .eq('file_metadata_id', fileMetadataId)
                .eq('stem_type', stemType)
                .single();
            if (existingError && existingError.code !== 'PGRST116') { // Ignore 'not found' error
                throw new server_1.TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Error checking for existing analysis: ${existingError.message}` });
            }
            if (existing) {
                logger_1.logger.log(`Analysis for file ${fileMetadataId} and stem ${stemType} already exists. Skipping cache.`);
                return { success: true, cached: false, message: "Analysis already cached." };
            }
            const { data: cachedAnalysis, error } = await ctx.supabase
                .from('audio_analysis_cache')
                .insert({
                user_id: userId,
                file_metadata_id: fileMetadataId,
                stem_type: stemType,
                analysis_version: '1.1-client', // Mark as client-generated
                sample_rate: metadata.sampleRate,
                duration: metadata.duration,
                buffer_size: metadata.bufferSize,
                features_extracted: metadata.featuresExtracted,
                analysis_data: analysisData,
                waveform_data: waveformData,
                analysis_duration: Date.now() - startTime,
            })
                .select()
                .single();
            if (error) {
                throw new server_1.TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to cache client-side analysis: ${error.message}` });
            }
            return { success: true, cached: true, data: cachedAnalysis };
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            logger_1.logger.error('Failed to cache client-side analysis:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }),
    // List user's stem separation jobs
    listJobs: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        limit: zod_1.z.number().min(1).max(100).default(20),
        offset: zod_1.z.number().min(0).default(0),
    }))
        .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            const { data: jobs, error } = await ctx.supabase
                .from('stem_separation_jobs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(input.offset, input.offset + input.limit - 1);
            if (error) {
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch jobs',
                });
            }
            return jobs || [];
        }
        catch (error) {
            logger_1.logger.error('Failed to list jobs:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }),
});
//# sourceMappingURL=stem.js.map