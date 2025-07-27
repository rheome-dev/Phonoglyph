// Updated tRPC router using Trigger.dev
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { client as triggerClient } from '../lib/trigger';

export const stemRouter = router({
  // Create stem separation job (simplified with Trigger.dev)
  createSeparationJob: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      config: z.object({
        modelVariant: z.enum(['2stems', '4stems', '5stems']),
        outputFormat: z.enum(['wav', 'mp3']),
        sampleRate: z.enum(['44100', '48000']),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Get file metadata
      const { data: fileData, error } = await ctx.supabase
        .from('file_metadata')
        .select('*')
        .eq('id', input.fileId)
        .eq('user_id', userId)
        .single();

      if (error || !fileData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Audio file not found',
        });
      }

      // Create job record in database
      const jobId = crypto.randomUUID();
      const { error: insertError } = await ctx.supabase
        .from('stem_separation_jobs')
        .insert({
          id: jobId,
          user_id: userId,
          file_metadata_id: input.fileId,
          status: 'queued',
          config: input.config,
        });

      if (insertError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create job',
        });
      }

      // Trigger the background job
      await triggerClient.sendEvent({
        name: "stem.separation.requested",
        payload: {
          fileId: input.fileId,
          userId,
          s3Key: fileData.s3_key,
          config: input.config,
        },
      });

      return { jobId, status: 'queued' };
    }),

  // Get job status (unchanged)
  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('stem_separation_jobs')
        .select('*')
        .eq('id', input.jobId)
        .eq('user_id', ctx.user.id)
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      return data;
    }),

  // List user's stem separation jobs
  listJobs: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('stem_separation_jobs')
        .select(`
          *,
          file_metadata:file_metadata_id (
            file_name,
            file_size
          )
        `)
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch jobs',
        });
      }

      return data;
    }),
});
