import { z } from 'zod';
import { router, protectedProcedure, flexibleProcedure, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

// Schema for sandbox analysis data
const SandboxAnalysisSchema = z.object({
  transients: z.array(z.object({
    time: z.number(),
    intensity: z.number(),
    frequency: z.number(),
  })),
  chroma: z.array(z.object({
    time: z.number(),
    pitch: z.number(),
    confidence: z.number(),
    note: z.string(),
  })),
  rms: z.array(z.object({
    time: z.number(),
    value: z.number(),
  })),
  waveform: z.array(z.number()),
  metadata: z.object({
    sampleRate: z.number(),
    duration: z.number(),
    bufferSize: z.number(),
    analysisParams: z.any(),
  }),
});

// Schema for cached sandbox analysis
const CachedSandboxAnalysisSchema = z.object({
  id: z.string(),
  fileMetadataId: z.string(),
  stemType: z.string(),
  analysisData: SandboxAnalysisSchema,
  waveformData: z.object({
    points: z.array(z.number()),
    duration: z.number(),
    sampleRate: z.number(),
    markers: z.array(z.any()),
  }),
  metadata: z.object({
    sampleRate: z.number(),
    duration: z.number(),
    bufferSize: z.number(),
    featuresExtracted: z.array(z.string()),
    analysisDuration: z.number(),
  }),
});

export const audioAnalysisSandboxRouter = router({
  // Simple test endpoint to verify the router is working
  test: publicProcedure
    .query(() => {
      return {
        success: true,
        message: 'Audio Analysis Sandbox API is working!',
        timestamp: new Date().toISOString(),
      };
    }),

  // Save sandbox analysis to cache
  saveSandboxAnalysis: protectedProcedure
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
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'File not found or access denied' 
          });
        }

        if (file.user_id !== userId) {
          throw new TRPCError({ 
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
          console.error('Failed to save sandbox analysis:', saveError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to save sandbox analysis: ${saveError.message}`,
          });
        }

        return { 
          success: true, 
          message: 'Sandbox analysis saved successfully' 
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error saving sandbox analysis:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save sandbox analysis',
        });
      }
    }),

  // Get sandbox analysis from cache
  getSandboxAnalysis: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      stemType: z.string().optional().default('master'),
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
      } catch (error) {
        console.error('Error getting sandbox analysis:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get sandbox analysis',
        });
      }
    }),

  // Compare sandbox analysis with existing cached analysis
  compareAnalysis: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      stemType: z.string().optional().default('master'),
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
      } catch (error) {
        console.error('Error comparing analysis:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to compare analysis',
        });
      }
    }),

  // Get all sandbox analyses for a user
  getSandboxAnalyses: flexibleProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
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
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to get sandbox analyses: ${error.message}`,
          });
        }

        return analyses || [];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error getting sandbox analyses:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get sandbox analyses',
        });
      }
    }),

  // Delete sandbox analysis
  deleteSandboxAnalysis: protectedProcedure
    .input(z.object({
      analysisId: z.string(),
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
          throw new TRPCError({
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
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to delete sandbox analysis: ${deleteError.message}`,
          });
        }

        return { 
          success: true, 
          message: 'Sandbox analysis deleted successfully' 
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error deleting sandbox analysis:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete sandbox analysis',
        });
      }
    }),
});
