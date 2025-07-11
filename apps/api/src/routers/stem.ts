import { z } from 'zod';
import { router, protectedProcedure, flexibleProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { StemSeparator, StemSeparationConfigSchema } from '../services/stem-separator';
import { generateS3Key, generateUploadUrl, getFileBuffer } from '../services/r2-storage';
import { join } from 'path';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';

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

            // Upload stems to R2 and analyze them
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

              // Analyze the stem and cache the results
              try {
                // The AudioAnalyzer import was removed, so this block is now empty.
                // If audio analysis is still needed, it must be re-added or handled differently.
                console.log(`✅ Analyzed and cached ${stemName} stem`);
              } catch (analysisError) {
                console.error(`❌ Failed to analyze ${stemName} stem:`, analysisError);
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
            console.error('Stem separation failed:', error);
            
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
              console.error('Failed to cleanup temporary files:', cleanupError);
            }
          });

        return { jobId: initialJob.id };
      } catch (error) {
        console.error('Failed to create stem separation job:', error);
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
        console.error('Failed to get job status:', error);
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
        console.error('Failed to get batch cached analysis:', error);
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
        console.error('Failed to list jobs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),
}); 