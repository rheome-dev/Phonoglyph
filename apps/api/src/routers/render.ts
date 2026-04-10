import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda';
import { logger } from '../lib/logger';
import { supabaseAdmin } from '../lib/supabase';
import { r2Client, BUCKET_NAME } from '../services/r2-storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// Zod schemas for the render payload
const audioBindingSchema = z.object({
  feature: z.string(),
  inputRange: z.tuple([z.number(), z.number()]),
  outputRange: z.tuple([z.number(), z.number()]),
  blendMode: z.enum(['add', 'multiply', 'replace']),
  modulationAmount: z.number().optional(),
});

const midiBindingSchema = z.object({
  source: z.enum(['velocity', 'cc', 'pitchBend', 'channelPressure']),
  inputRange: z.tuple([z.number(), z.number()]),
  outputRange: z.tuple([z.number(), z.number()]),
  blendMode: z.enum(['add', 'multiply', 'replace']),
});

const layerSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDeletable: z.boolean().optional(),
  type: z.string(),
  src: z.string().optional(),
  effectType: z.string().optional(),
  settings: z.any().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  scale: z.object({ x: z.number(), y: z.number() }),
  rotation: z.number(),
  opacity: z.number(),
  audioBindings: z.array(audioBindingSchema),
  midiBindings: z.array(midiBindingSchema),
  zIndex: z.number(),
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay']),
  startTime: z.number(),
  endTime: z.number(),
  duration: z.number(),
});

const visualizationSettingsSchema = z.object({
  colorScheme: z.string().optional(),
  pixelsPerSecond: z.number().optional(),
  showTrackLabels: z.boolean().optional(),
  showVelocity: z.boolean().optional(),
  minKey: z.number().optional(),
  maxKey: z.number().optional(),
  aspectRatio: z.string().optional(), // youtube, tiktok, instagram, etc.
});

// AudioAnalysisData schema - simplified to handle arrays as numbers
const audioAnalysisDataSchema = z.object({
  id: z.string(),
  fileMetadataId: z.string(),
  stemType: z.string(),
  analysisData: z.object({
    frameTimes: z.union([z.array(z.number()), z.any()]).optional(),
    rms: z.union([z.array(z.number()), z.any()]),
    loudness: z.union([z.array(z.number()), z.any()]),
    spectralCentroid: z.union([z.array(z.number()), z.any()]),
    spectralRolloff: z.union([z.array(z.number()), z.any()]).optional(),
    spectralFlatness: z.union([z.array(z.number()), z.any()]).optional(),
    zcr: z.union([z.array(z.number()), z.any()]).optional(),
    fft: z.union([z.array(z.number()), z.any()]),
    fftFrequencies: z.union([z.array(z.number()), z.any()]).optional(),
    amplitudeSpectrum: z.union([z.array(z.number()), z.any()]).optional(),
    volume: z.union([z.array(z.number()), z.any()]).optional(),
    bass: z.union([z.array(z.number()), z.any()]).optional(),
    mid: z.union([z.array(z.number()), z.any()]).optional(),
    treble: z.union([z.array(z.number()), z.any()]).optional(),
    features: z.union([z.array(z.number()), z.any()]).optional(),
    markers: z.union([z.array(z.number()), z.any()]).optional(),
    frequencies: z.union([z.array(z.number()), z.any()]).optional(),
    timeData: z.union([z.array(z.number()), z.any()]).optional(),
    stereoWindow_left: z.union([z.array(z.number()), z.any()]).optional(),
    stereoWindow_right: z.union([z.array(z.number()), z.any()]).optional(),
    transients: z.array(z.any()).optional(),
    chroma: z.array(z.any()).optional(),
    bpm: z.number().optional(),
  }),
  waveformData: z.object({
    points: z.array(z.number()),
    sampleRate: z.number(),
    duration: z.number(),
    markers: z.array(z.any()).optional(),
  }),
  metadata: z.object({
    sampleRate: z.number(),
    duration: z.number(),
    bufferSize: z.number(),
    featuresExtracted: z.array(z.string()),
    analysisDuration: z.number(),
    bpm: z.number().optional(),
  }),
  bpm: z.number().optional(),
});

const triggerRenderSchema = z.object({
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  layers: z.array(layerSchema),
  audioAnalysisData: z.array(audioAnalysisDataSchema),
  visualizationSettings: visualizationSettingsSchema,
  masterAudioUrl: z.string(),
  // Audio feature mappings for effect parameters (optional)
  mappings: z.record(
    z.string(),
    z.object({
      featureId: z.string().nullable(),
      modulationAmount: z.number(),
    })
  ).optional(),
  // Base parameter values before modulation (optional)
  baseParameterValues: z.record(
    z.string(),
    z.record(z.string(), z.any())
  ).optional(),
  // Audio modulation settings (TASK 4: previously stripped by Zod)
  featureDecayTimes: z.record(z.string(), z.number()).optional(),
  featureSensitivities: z.record(z.string(), z.number()).optional(),
  // Background color settings
  backgroundColor: z.string().optional(),
  isBackgroundVisible: z.boolean().optional(),
});

export const renderRouter = router({
  // Get a render by ID (public — used by share page)
  getRender: protectedProcedure
    .input(z.object({ renderId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabase
        .from('renders')
        .select('*')
        .eq('id', input.renderId)
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Render not found' });
      }

      return {
        id: data.id,
        user_id: data.user_id,
        project_id: data.project_id,
        project_name: data.project_name,
        status: data.status,
        output_url: data.output_url,
        error_message: data.error_message,
        credits_spent: data.credits_spent,
        expires_at: data.expires_at,
        metadata: data.metadata,
        created_at: data.created_at,
      };
    }),

  // Update render status/output (used by frontend after polling)
  updateRender: protectedProcedure
    .input(z.object({
      renderId: z.string(),
      status: z.enum(['queued', 'in_progress', 'completed', 'failed']).optional(),
      outputUrl: z.string().optional(),
      errorMessage: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const updates: Record<string, any> = {};
      if (input.status) updates.status = input.status;
      if (input.outputUrl) updates.output_url = input.outputUrl;
      if (input.errorMessage) updates.error_message = input.errorMessage;
      if (input.metadata) updates.metadata = input.metadata;
      // Set 30-day expiration when render completes
      if (input.status === 'completed') {
        updates.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const { error } = await ctx.supabase
        .from('renders')
        .update(updates)
        .eq('id', input.renderId)
        .eq('user_id', ctx.user.id);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update render' });
      }

      return { success: true };
    }),

  triggerRender: protectedProcedure
    .input(triggerRenderSchema)
    .mutation(async ({ input, ctx }) => {
      // Ensure user_profiles row exists (create if trigger never fired)
      const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id,credits')
        .eq('id', ctx.user.id)
        .maybeSingle();

      if (!existingProfile) {
        logger.log('user_profiles row missing for user, creating with 5 free credits');
        await supabaseAdmin.from('user_profiles').insert({
          id: ctx.user.id,
          display_name: ctx.user.email?.split('@')[0] || 'User',
          credits: 5,
        });
      }

      // Check credit balance before doing any expensive work
      const { data: userData, error: creditError } = await supabaseAdmin
        .from('user_profiles')
        .select('credits')
        .eq('id', ctx.user.id)
        .single();

      if (creditError || !userData) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to check credit balance: ${creditError?.message ?? 'no data'} (${creditError?.code ?? 'unknown'})`,
        });
      }

      const currentCredits = userData.credits ?? 0;
      if (currentCredits < 1) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits. Purchase render credits to continue.',
        });
      }

      try {
        const region = 'us-east-1';
        const serveUrl = 'https://remotionlambda-useast1-zq6uoa8xhi.s3.us-east-1.amazonaws.com/sites/raybox-renderer/';
        const composition = 'RayboxMain';

        // 1. Generate a unique key for this render's analysis
        const analysisKey = `analysis-cache/${ctx.user.id}-${Date.now()}.json`;

        // 2. Upload the heavy audioAnalysisData to R2 as a static file
        // We do this here so the Lambda doesn't have to talk to Supabase
        await (r2Client as any).send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: analysisKey,
          Body: JSON.stringify(input.audioAnalysisData),
          ContentType: 'application/json',
        }));

        const analysisUrl = `https://assets.raybox.fm/${analysisKey}`;

        logger.log('Uploaded analysis data to R2:', {
          key: analysisKey,
          url: analysisUrl,
          dataSize: JSON.stringify(input.audioAnalysisData).length,
        });

        // Hardcoded to stable nodejs20.x function — 4-0-436 (nodejs24.x) has
        // Chromium sandbox failures causing all renders to crash. Do not change this
        // to a dynamic selector until the nodejs24 issue is resolved.
        const functionName = 'remotion-render-4-0-390-mem3008mb-disk2048mb-300sec';
        logger.log(`Using stable Remotion function: ${functionName}`);

        logger.log('Triggering Remotion render:', {
          region,
          functionName,
          serveUrl,
          composition,
          userId: ctx.user.id,
          analysisUrl,
        });

        // 3. Trigger Lambda with retry logic for rate limits
        const maxRetries = 3;
        const baseDelayMs = 2000;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const renderResult = await renderMediaOnLambda({
              region,
              functionName,
              serveUrl,
              composition,
              inputProps: {
                ...input,
                audioAnalysisData: [], // EMPTY THIS OUT to keep payload small
                analysisUrl: analysisUrl, // PASS THE LINK INSTEAD
              },
              codec: 'h264',
              concurrencyPerRender: 1000,
              framesPerLambda: 20, // Match working render (w3sheoepsg) - 20 frames per Lambda works
              logLevel: 'verbose',
              timeoutInMilliseconds: 120000, // 120s — must exceed component's delayRender timeouts (60s slideshow, 120s init)
              downloadBehavior: {
                type: 'download',
                fileName: `${(input.projectName || 'render').replace(/[^a-z0-9]/gi, '_')}.mp4`,
              },
              chromiumOptions: {
                gl: 'swangle', // Software WebGL via ANGLE+SwiftShader for no-GPU Lambda
                // Required: explicit flag to allow software WebGL fallback.
                // Without this, Chromium's passthrough decoder crashes (exit_code=9)
                // when automatic fallback to SwiftShader is attempted and blocked.
                args: ['--enable-unsafe-swiftshader'],
              },
            } as any);

            const { renderId, bucketName } = renderResult;
            const cloudWatchLogs = (renderResult as any).cloudWatchLogs;

            // 4. Persist render record to DB (use admin client to bypass RLS;
            //    user is already authenticated via protectedProcedure)
            const renderRecord = {
              id: renderId,
              user_id: ctx.user.id,
              project_id: input.projectId ?? null,
              project_name: input.projectName ?? null,
              bucket_name: bucketName,
              function_name: functionName,
              status: 'in_progress',
              metadata: {
                analysisUrl,
                composition,
                serveUrl,
              },
            };

            let { error: insertError } = await supabaseAdmin.from('renders').insert(renderRecord);

            // If insert fails (likely FK constraint on project_id), retry without project_id
            if (insertError) {
              logger.warn('Render record insert failed, retrying without project_id:', JSON.stringify(insertError));
              const { error: retryError } = await supabaseAdmin.from('renders').insert({
                ...renderRecord,
                project_id: null,
              });
              insertError = retryError;
            }

            if (insertError) {
              logger.error('Failed to persist render record:', JSON.stringify(insertError));
              // Don't throw — the Lambda render is already running. Log the error
              // and return the renderId so the client can still poll for completion.
              logger.warn('Render will continue without DB record. renderId:', renderId);
            }

            // Deduct 1 credit now that the render is confirmed running
            const { error: deductError } = await supabaseAdmin.rpc('decrement_credits', { uid: ctx.user.id });
            if (deductError) {
              logger.error('Failed to deduct credit (render still running):', JSON.stringify(deductError));
            } else {
              // Record the transaction
              await supabaseAdmin.from('credit_transactions').insert({
                user_id: ctx.user.id,
                amount: -1,
                type: 'spend',
              });
            }

            logger.log('Render triggered successfully:', { renderId, bucketName, functionName, cloudWatchLogs });

            return {
              renderId,
              bucketName,
              functionName,
              cloudWatchLogs,
            };
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const isRateLimit = lastError.message.includes('Rate Exceeded') ||
                                lastError.message.includes('concurrency') ||
                                lastError.message.includes('ConcurrentInvocationLimit');

            if (isRateLimit && attempt < maxRetries - 1) {
              const delayMs = baseDelayMs * Math.pow(2, attempt);
              logger.warn(`Lambda rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
              throw lastError;
            }
          }
        }

        // Should not reach here, but just in case
        throw lastError;
      } catch (error) {
        logger.error('Failed to trigger render:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to trigger render',
        });
      }
    }),

  listRenders: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const limit = input.limit ?? 20;

      let query = ctx.supabase
        .from('renders')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(limit + 1);

      if (input.cursor) {
        query = query.lt('created_at', input.cursor);
      }

      const { data: renders, error } = await query;

      if (error) {
        logger.error('Failed to list renders:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list renders' });
      }

      const hasMore = (renders?.length ?? 0) > limit;
      const items = hasMore ? (renders ?? []).slice(0, -1) : (renders ?? []);
      const nextCursor = hasMore ? (items[items.length - 1]?.created_at ?? null) : null;

      return { renders: items, nextCursor };
    }),

  getRenderStatus: protectedProcedure
    .input(
      z.object({
        renderId: z.string(),
        bucketName: z.string(),
        functionName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const region = 'us-east-1';

        logger.log('Getting render status:', {
          region,
          functionName: input.functionName,
          renderId: input.renderId,
          bucketName: input.bucketName,
        });

        const progress = await getRenderProgress({
          renderId: input.renderId,
          bucketName: input.bucketName,
          functionName: input.functionName,
          region,
          skipLambdaInvocation: true,
        });

        logger.log('Render status retrieved:', {
          renderId: input.renderId,
          overallProgress: progress.overallProgress,
          done: progress.done,
        });

        return progress;
      } catch (error) {
        logger.error('Failed to get render status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get render status',
        });
      }
    }),
});

