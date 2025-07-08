import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { exportService } from '../services/export-service';
import { EXPORT_PRESETS, FormatPreset } from '../types/export';
import { createId } from '@paralleldrive/cuid2';

const exportConfigSchema = z.object({
  name: z.string(),
  format: z.object({
    container: z.enum(['mp4', 'webm', 'mov', 'gif']),
    videoCodec: z.enum(['h264', 'h265', 'vp9', 'av1']),
    audioCodec: z.enum(['aac', 'mp3', 'opus']),
    preset: z.enum(['youtube_1080p', 'youtube_4k', 'instagram_square', 'instagram_story', 'tiktok_vertical', 'twitter_landscape', 'custom'])
  }),
  quality: z.object({
    resolution: z.object({
      width: z.number().min(240).max(7680),
      height: z.number().min(240).max(4320)
    }),
    framerate: z.enum([24, 30, 60]),
    bitrate: z.number().min(500).max(50000),
    crf: z.number().min(0).max(51).optional(),
    profile: z.enum(['baseline', 'main', 'high']).optional()
  }),
  audio: z.object({
    enabled: z.boolean(),
    bitrate: z.number().min(64).max(320),
    sampleRate: z.enum([44100, 48000]),
    channels: z.enum([1, 2]),
    normalization: z.boolean(),
    fadeIn: z.number().min(0).max(10).optional(),
    fadeOut: z.number().min(0).max(10).optional()
  }),
  branding: z.object({
    watermark: z.object({
      imageUrl: z.string().url(),
      position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']),
      opacity: z.number().min(0).max(1),
      scale: z.number().min(0.1).max(2)
    }).optional(),
    endCard: z.object({
      duration: z.number().min(1).max(30),
      backgroundColor: z.string(),
      logoUrl: z.string().url().optional(),
      text: z.string().optional()
    }).optional()
  }).optional(),
  socialMedia: z.object({
    platform: z.enum(['youtube', 'instagram', 'tiktok', 'twitter']),
    aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5']),
    maxDuration: z.number().positive().optional(),
    requirements: z.object({
      maxFileSize: z.number().positive(),
      recommendedBitrate: z.number().positive(),
      supportedFormats: z.array(z.string())
    })
  }).optional()
});

export const exportRouter = router({
  // Queue a new export job
  queueExport: protectedProcedure
    .input(z.object({
      compositionId: z.string().cuid2(),
      config: exportConfigSchema
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const jobId = await exportService.queueExport(
          ctx.user.id,
          input.compositionId,
          {
            id: createId(),
            compositionId: input.compositionId,
            ...input.config
          }
        );
        
        return { 
          jobId,
          message: 'Export job queued successfully'
        };
      } catch (error) {
        console.error('Failed to queue export:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to queue export job'
        });
      }
    }),
    
  // Get job status and progress
  getJobStatus: protectedProcedure
    .input(z.object({ 
      jobId: z.string().cuid2() 
    }))
    .query(async ({ ctx, input }) => {
      const job = exportService.getJobStatus(input.jobId);
      
      if (!job) {
        throw new TRPCError({ 
          code: 'NOT_FOUND',
          message: 'Export job not found'
        });
      }
      
      if (job.userId !== ctx.user.id) {
        throw new TRPCError({ 
          code: 'FORBIDDEN',
          message: 'Access denied to this export job'
        });
      }
      
      return job;
    }),
    
  // Cancel an export job
  cancelJob: protectedProcedure
    .input(z.object({ 
      jobId: z.string().cuid2() 
    }))
    .mutation(async ({ ctx, input }) => {
      const job = exportService.getJobStatus(input.jobId);
      
      if (!job) {
        throw new TRPCError({ 
          code: 'NOT_FOUND',
          message: 'Export job not found'
        });
      }
      
      if (job.userId !== ctx.user.id) {
        throw new TRPCError({ 
          code: 'FORBIDDEN',
          message: 'Access denied to this export job'
        });
      }
      
      const cancelled = exportService.cancelJob(input.jobId);
      
      if (!cancelled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot cancel job in current state'
        });
      }
      
      return { 
        success: true,
        message: 'Export job cancelled successfully'
      };
    }),
    
  // Get user's export history
  getExportHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
      status: z.enum(['queued', 'rendering', 'uploading', 'completed', 'failed', 'cancelled']).optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        let jobs = exportService.getUserJobs(ctx.user.id);
        
        // Filter by status if provided
        if (input.status) {
          jobs = jobs.filter(job => job.status === input.status);
        }
        
        // Apply pagination
        const total = jobs.length;
        const paginatedJobs = jobs.slice(input.offset, input.offset + input.limit);
        
        return {
          jobs: paginatedJobs,
          total,
          hasMore: input.offset + input.limit < total
        };
      } catch (error) {
        console.error('Failed to get export history:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve export history'
        });
      }
    }),
    
  // Get available export presets
  getPresets: protectedProcedure
    .query(async () => {
      return {
        presets: Object.values(EXPORT_PRESETS),
        categories: {
          youtube: ['youtube_1080p', 'youtube_4k'],
          instagram: ['instagram_square', 'instagram_story'],
          tiktok: ['tiktok_vertical'],
          twitter: ['twitter_landscape']
        }
      };
    }),
    
  // Batch export to multiple formats
  batchExport: protectedProcedure
    .input(z.object({
      compositionId: z.string().cuid2(),
      presets: z.array(z.enum(['youtube_1080p', 'youtube_4k', 'instagram_square', 'instagram_story', 'tiktok_vertical', 'twitter_landscape'])).min(1).max(6)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const jobIds: string[] = [];
        const errors: string[] = [];
        
        for (const presetId of input.presets) {
          try {
            const preset = EXPORT_PRESETS[presetId as FormatPreset];
            if (preset) {
              const jobId = await exportService.queueExport(
                ctx.user.id,
                input.compositionId,
                { ...preset, compositionId: input.compositionId }
              );
              jobIds.push(jobId);
            }
          } catch (error) {
            console.error(`Failed to queue ${presetId}:`, error);
            errors.push(`Failed to queue ${presetId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        if (jobIds.length === 0) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to queue any export jobs'
          });
        }
        
        return { 
          jobIds,
          successCount: jobIds.length,
          totalRequested: input.presets.length,
          errors: errors.length > 0 ? errors : undefined,
          message: `Successfully queued ${jobIds.length} of ${input.presets.length} export jobs`
        };
      } catch (error) {
        console.error('Batch export failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Batch export failed'
        });
      }
    }),
    
  // Get export queue status
  getQueueStatus: protectedProcedure
    .query(async () => {
      try {
        return exportService.getQueueStatus();
      } catch (error) {
        console.error('Failed to get queue status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get queue status'
        });
      }
    }),
    
  // Get user's active exports (in progress)
  getActiveExports: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userJobs = exportService.getUserJobs(ctx.user.id);
        const activeJobs = userJobs.filter(job => 
          job.status === 'queued' || 
          job.status === 'rendering' || 
          job.status === 'uploading'
        );
        
        return {
          jobs: activeJobs,
          count: activeJobs.length
        };
      } catch (error) {
        console.error('Failed to get active exports:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get active exports'
        });
      }
    }),
    
  // Re-export with same configuration
  reExport: protectedProcedure
    .input(z.object({
      originalJobId: z.string().cuid2(),
      newCompositionId: z.string().cuid2().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const originalJob = exportService.getJobStatus(input.originalJobId);
      
      if (!originalJob) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Original export job not found'
        });
      }
      
      if (originalJob.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to this export job'
        });
      }
      
      try {
        const compositionId = input.newCompositionId || originalJob.compositionId;
        const config = { 
          ...originalJob.config,
          compositionId,
          id: createId() // Generate new ID for the re-export
        };
        
        const jobId = await exportService.queueExport(
          ctx.user.id,
          compositionId,
          config
        );
        
        return {
          jobId,
          message: 'Re-export job queued successfully'
        };
      } catch (error) {
        console.error('Re-export failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to queue re-export job'
        });
      }
    })
});