import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { StemSeparator, StemSeparationConfigSchema } from '../services/stem-separator';
import { generateS3Key, generateUploadUrl } from '../services/r2-storage';
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

            // Upload stems to R2
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
              })
              .eq('id', initialJob.id);

            // Cleanup temporary files
            await fs.rm(outputDir, { recursive: true, force: true });
          })
          .catch(async (error) => {
            // Update job in database with error
            await ctx.supabase
              .from('stem_separation_jobs')
              .update({
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
              })
              .eq('id', initialJob.id);

            // Cleanup temporary files
            await fs.rm(outputDir, { recursive: true, force: true });
          });

        return {
          jobId: initialJob.id,
          status: initialJob.status,
        };

      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error creating stem separation job:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create stem separation job',
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

        if (error) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Job not found or access denied',
          });
        }

        return job;

      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error getting job status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get job status',
        });
      }
    }),
}); 