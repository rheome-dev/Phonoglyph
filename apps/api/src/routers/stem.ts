import { z } from 'zod';
import { router, protectedProcedure, flexibleProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { StemSeparator, StemSeparationConfigSchema } from '../services/stem-separator';
import { generateS3Key, generateUploadUrl, getFileBuffer } from '../services/r2-storage';
import { join } from 'path';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { logger } from '../lib/logger';

export const stemRouter = router({
  // Create a new stem separation job
  createSeparationJob: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      config: StemSeparationConfigSchema,
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
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Audio file not found or access denied',
          });
        }

        // Create stem separation job
        const initialJob = StemSeparator.createJob(input.config);

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
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create stem separation job',
          });
        }

        // Start processing in background
        const outputDir = join(tmpdir(), initialJob.id);
        await fs.mkdir(outputDir, { recursive: true });

        StemSeparator.processStem(initialJob.id, fileData.s3_key, outputDir)
          .then(async () => {
            const updatedJob = StemSeparator.getJob(initialJob.id);
            if (!updatedJob?.results) return;

            // Upload stems to R2, create file metadata, and analyze them
            const stemUploads = Object.entries(updatedJob.results.stems).map(async ([stemName, stemPath]) => {
              const stemKey = generateS3Key(userId, `${stemName}.${input.config.quality.outputFormat}`, 'audio');
              const uploadUrl = await generateUploadUrl(stemKey, `audio/${input.config.quality.outputFormat}`);
              
              // Read stem file and upload to R2
              const stemBuffer = await fs.readFile(stemPath);
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
                logger.error(`Failed to create file metadata for ${stemName} stem:`, stemFileError);
                return { [stemName]: stemKey };
              }

              // Analyze the stem and cache the results
              try {
                const { AudioAnalyzer } = await import('../services/audio-analyzer');
                const audioAnalyzer = new AudioAnalyzer();
                await audioAnalyzer.analyzeAndCache(
                  stemFileData.id, // Use the new stem file metadata ID
                  userId,
                  stemName,
                  stemBuffer
                );
                logger.log(`✅ Analyzed and cached ${stemName} stem`);
              } catch (analysisError) {
                logger.error(`❌ Failed to analyze ${stemName} stem:`, analysisError);
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
            await fs.rm(outputDir, { recursive: true, force: true });
          })
          .catch(async (error) => {
            logger.error('Stem separation failed:', error);
            
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
              await fs.rm(outputDir, { recursive: true, force: true });
            } catch (cleanupError) {
              logger.error('Failed to cleanup temporary files:', cleanupError);
            }
          });

        return { jobId: initialJob.id };
      } catch (error) {
        logger.error('Failed to create stem separation job:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),

  // Get job status
  getJobStatus: protectedProcedure
    .input(z.object({
      jobId: z.string(),
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
          throw new TRPCError({
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
      } catch (error) {
        logger.error('Failed to get job status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),

  // Get cached audio analysis for multiple files
  getCachedAnalysis: flexibleProcedure
    .input(z.object({
      fileIds: z.array(z.string()),
      stemType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      try {
        const { AudioAnalyzer } = await import('../services/audio-analyzer');
        const audioAnalyzer = new AudioAnalyzer();
        return await audioAnalyzer.getBatchCachedAnalysis(
          input.fileIds,
          userId,
          input.stemType
        );
      } catch (error) {
        logger.error('Failed to get batch cached analysis:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),

  // Cache analysis data generated on the client
  cacheClientSideAnalysis: protectedProcedure
    .input(z.object({
      fileMetadataId: z.string(),
      stemType: z.string(),
      analysisData: z.record(z.string(), z.array(z.number())),
      waveformData: z.object({
        points: z.array(z.number()),
        sampleRate: z.number(),
        duration: z.number(),
        markers: z.array(z.object({
          time: z.number(),
          type: z.enum(['beat', 'onset', 'peak', 'drop']),
          intensity: z.number(),
          frequency: z.number().optional(),
        })),
      }),
      metadata: z.object({
        sampleRate: z.number(),
        duration: z.number(),
        bufferSize: z.number(),
        featuresExtracted: z.array(z.string()),
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
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Error checking for existing analysis: ${existingError.message}` });
        }

        if (existing) {
          logger.log(`Analysis for file ${fileMetadataId} and stem ${stemType} already exists. Skipping cache.`);
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
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to cache client-side analysis: ${error.message}` });
        }
        
        return { success: true, cached: true, data: cachedAnalysis };

      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Failed to cache client-side analysis:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),

  // List user's stem separation jobs
  listJobs: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
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
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch jobs',
          });
        }

        return jobs || [];
      } catch (error) {
        logger.error('Failed to list jobs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),
}); 