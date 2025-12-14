import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { renderMediaOnLambda, getFunctions } from '@remotion/lambda';
import { logger } from '../lib/logger';

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
  layers: z.array(layerSchema),
  audioAnalysisData: z.array(audioAnalysisDataSchema),
  visualizationSettings: visualizationSettingsSchema,
  masterAudioUrl: z.string(),
});

export const renderRouter = router({
  triggerRender: protectedProcedure
    .input(triggerRenderSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const region = 'us-east-1';
        const serveUrl = 'https://remotionlambda-useast1-zq6uoa8xhi.s3.us-east-1.amazonaws.com/sites/raybox-renderer/index.html';
        const composition = 'RayboxMain';

        // Try to get the function name dynamically, fallback to standard name
        let functionName = 'remotion-render-4-0-390-mem2048mb-disk2048mb-120sec';
        
        try {
          const functions = await getFunctions({
            region,
            compatibleOnly: true,
          });
          
          if (functions.length > 0) {
            // Use the first compatible function
            functionName = functions[0].functionName;
            logger.log(`Using Remotion function: ${functionName}`);
          } else {
            logger.warn(`No compatible functions found, using default: ${functionName}`);
          }
        } catch (error) {
          logger.warn(`Failed to get functions dynamically, using default: ${functionName}`, error);
        }

        logger.log('Triggering Remotion render:', {
          region,
          functionName,
          serveUrl,
          composition,
          userId: ctx.user.id,
        });

        const { renderId, bucketName } = await renderMediaOnLambda({
          region,
          functionName,
          serveUrl,
          composition,
          inputProps: input,
          codec: 'h264',
        });

        logger.log('Render triggered successfully:', { renderId, bucketName });

        return {
          renderId,
          bucketName,
        };
      } catch (error) {
        logger.error('Failed to trigger render:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to trigger render',
        });
      }
    }),
});

