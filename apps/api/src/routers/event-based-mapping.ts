import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { EventBasedMappingService } from '../services/event-based-mapping';
import { TRPCError } from '@trpc/server';

// Validation schemas
const EventTypeSchema = z.enum(['transient', 'chroma', 'volume', 'brightness']);
const TransformTypeSchema = z.enum(['linear', 'exponential', 'logarithmic', 'envelope']);

const MappingConfigSchema = z.object({
  source: EventTypeSchema,
  transform: TransformTypeSchema,
  range: z.tuple([z.number(), z.number()]),
  sensitivity: z.number().min(0).max(100),
  envelope: z.object({
    attack: z.number().min(0),
    decay: z.number().min(0),
    sustain: z.number().min(0).max(1),
    release: z.number().min(0)
  }).optional()
});

const CreateMappingSchema = z.object({
  projectId: z.string().min(1),
  eventType: EventTypeSchema,
  targetParameter: z.string().min(1),
  mappingConfig: MappingConfigSchema.optional()
});

const UpdateMappingSchema = z.object({
  mappingId: z.string().min(1),
  targetParameter: z.string().min(1).optional(),
  mappingConfig: MappingConfigSchema.optional(),
  enabled: z.boolean().optional()
});

const EventBasedMappingConfigSchema = z.object({
  mode: z.enum(['midi-like', 'advanced']),
  features: z.object({
    transient: z.boolean(),
    chroma: z.boolean(),
    volume: z.boolean(),
    brightness: z.boolean()
  }),
  sensitivity: z.object({
    transient: z.number().min(0).max(100),
    chroma: z.number().min(0).max(100),
    volume: z.number().min(0).max(100),
    brightness: z.number().min(0).max(100)
  }),
  envelope: z.object({
    attack: z.number().min(0),
    decay: z.number().min(0),
    sustain: z.number().min(0).max(1),
    release: z.number().min(0)
  })
});

const ExtractAudioEventsSchema = z.object({
  fileMetadataId: z.string().min(1),
  stemType: z.string().min(1),
  config: EventBasedMappingConfigSchema,
  forceRecompute: z.boolean().optional()
});

export const eventBasedMappingRouter: any = router({
  /**
   * Create a new event-based mapping
   */
  create: protectedProcedure
    .input(CreateMappingSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new EventBasedMappingService();
        
        const mapping = await service.createMapping(
          ctx.session.user.id,
          input.projectId,
          input.eventType,
          input.targetParameter,
          input.mappingConfig
        );

        return {
          success: true,
          data: mapping
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create mapping',
          cause: error
        });
      }
    }) as any,

  /**
   * Update an existing mapping
   */
  update: protectedProcedure
    .input(UpdateMappingSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new EventBasedMappingService();
        
        const mapping = await service.updateMapping(
          input.mappingId,
          ctx.session.user.id,
          {
            targetParameter: input.targetParameter,
            mapping: input.mappingConfig,
            enabled: input.enabled
          }
        );

        return {
          success: true,
          data: mapping
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update mapping',
          cause: error
        });
      }
    }),

  /**
   * Delete a mapping
   */
  delete: protectedProcedure
    .input(z.object({ mappingId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new EventBasedMappingService();
        
        await service.deleteMapping(input.mappingId, ctx.session.user.id);

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete mapping',
          cause: error
        });
      }
    }),

  /**
   * Get all mappings for a project
   */
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new EventBasedMappingService();
        
        const mappings = await service.getProjectMappings(
          input.projectId,
          ctx.session.user.id
        );

        return {
          success: true,
          data: mappings
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get mappings',
          cause: error
        });
      }
    }),

  /**
   * Toggle mapping enabled state
   */
  toggle: protectedProcedure
    .input(z.object({ 
      mappingId: z.string().min(1),
      enabled: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new EventBasedMappingService();
        
        const mapping = await service.updateMapping(
          input.mappingId,
          ctx.session.user.id,
          { enabled: input.enabled }
        );

        return {
          success: true,
          data: mapping
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to toggle mapping',
          cause: error
        });
      }
    }),

  /**
   * Extract audio events from existing Meyda analysis
   */
  extractAudioEvents: protectedProcedure
    .input(ExtractAudioEventsSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new EventBasedMappingService();
        
        // Check if events are already cached in our event cache
        if (!input.forceRecompute) {
          const cachedEvents = await service.getCachedAudioEvents(
            input.fileMetadataId,
            input.stemType
          );
          
          if (cachedEvents) {
            return {
              success: true,
              data: cachedEvents,
              cached: true
            };
          }
        }

        // Extract events from existing Meyda analysis cache
        const eventData = await service.extractAudioEventsFromCache(
          input.fileMetadataId,
          input.stemType,
          input.config
        );
        
        // Cache the event results for faster future access
        await service.cacheAudioEvents(
          ctx.session.user.id,
          input.fileMetadataId,
          input.stemType,
          eventData
        );

        return {
          success: true,
          data: eventData,
          cached: false,
          source: 'meyda_analysis'
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to extract audio events',
          cause: error
        });
      }
    }),

  /**
   * Get cached audio events
   */
  getCachedEvents: protectedProcedure
    .input(z.object({
      fileMetadataId: z.string().min(1),
      stemType: z.string().min(1),
      analysisVersion: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new EventBasedMappingService();
        
        const eventData = await service.getCachedAudioEvents(
          input.fileMetadataId,
          input.stemType,
          input.analysisVersion || '1.0'
        );

        if (!eventData) {
          return {
            success: false,
            message: 'No cached events found'
          };
        }

        return {
          success: true,
          data: eventData
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get cached events',
          cause: error
        });
      }
    }),

  /**
   * Validate mapping configuration
   */
  validateMapping: protectedProcedure
    .input(z.object({
      eventType: EventTypeSchema,
      targetParameter: z.string().min(1),
      mappingConfig: MappingConfigSchema
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new EventBasedMappingService();
        
        const testMapping = {
          id: 'test',
          eventType: input.eventType,
          targetParameter: input.targetParameter,
          mapping: input.mappingConfig,
          enabled: true
        };

        const isValid = service.validateMapping(testMapping);

        return {
          success: true,
          valid: isValid,
          errors: isValid ? [] : ['Invalid mapping configuration']
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate mapping',
          cause: error
        });
      }
    }),

  /**
   * Get mapped value for current time
   */
  getMappedValue: protectedProcedure
    .input(z.object({
      mappingId: z.string().min(1),
      currentTime: z.number().min(0),
      eventData: z.object({
        transients: z.array(z.any()),
        chroma: z.array(z.any()),
        rms: z.array(z.number()),
        spectralFeatures: z.object({
          centroid: z.array(z.number()),
          rolloff: z.array(z.number()),
          flatness: z.array(z.number())
        }),
        eventCount: z.number()
      })
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new EventBasedMappingService();
        
        // Get the mapping
        const mappings = await service.getProjectMappings('', ctx.session.user.id);
        const mapping = mappings.find(m => m.id === input.mappingId);
        
        if (!mapping) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Mapping not found'
          });
        }

        const value = service.getMappedValue(
          mapping,
          input.eventData,
          input.currentTime
        );

        return {
          success: true,
          value,
          mapping: {
            eventType: mapping.eventType,
            targetParameter: mapping.targetParameter,
            enabled: mapping.enabled
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get mapped value',
          cause: error
        });
      }
    }),

  /**
   * Bulk create mappings
   */
  createBulk: protectedProcedure
    .input(z.object({
      projectId: z.string().min(1),
      mappings: z.array(z.object({
        eventType: EventTypeSchema,
        targetParameter: z.string().min(1),
        mappingConfig: MappingConfigSchema.optional()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new EventBasedMappingService();
        const results = [];
        
        for (const mappingData of input.mappings) {
          const mapping = await service.createMapping(
            ctx.session.user.id,
            input.projectId,
            mappingData.eventType,
            mappingData.targetParameter,
            mappingData.mappingConfig
          );
          results.push(mapping);
        }

        return {
          success: true,
          data: results,
          count: results.length
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create bulk mappings',
          cause: error
        });
      }
    }),

  /**
   * Get mapping presets
   */
  getPresets: protectedProcedure
    .query(async ({ ctx }) => {
      // Return predefined mapping presets
      const presets = [
        {
          id: 'kick-drum-trigger',
          name: 'Kick Drum Trigger',
          description: 'Maps drum transients to particle bursts',
          mappings: [
            {
              eventType: 'transient' as const,
              targetParameter: 'particleCount',
              mappingConfig: {
                source: 'transient' as const,
                transform: 'envelope' as const,
                range: [10, 100] as [number, number],
                sensitivity: 75,
                envelope: {
                  attack: 0.01,
                  decay: 0.05,
                  sustain: 0.3,
                  release: 0.2
                }
              }
            }
          ]
        },
        {
          id: 'melodic-color-mapping',
          name: 'Melodic Color Mapping',
          description: 'Maps pitch changes to color variations',
          mappings: [
            {
              eventType: 'chroma' as const,
              targetParameter: 'hue',
              mappingConfig: {
                source: 'chroma' as const,
                transform: 'linear' as const,
                range: [0, 360] as [number, number],
                sensitivity: 50
              }
            }
          ]
        },
        {
          id: 'dynamic-brightness',
          name: 'Dynamic Brightness',
          description: 'Maps volume to visual brightness',
          mappings: [
            {
              eventType: 'volume' as const,
              targetParameter: 'brightness',
              mappingConfig: {
                source: 'volume' as const,
                transform: 'logarithmic' as const,
                range: [0.2, 1.0] as [number, number],
                sensitivity: 60
              }
            }
          ]
        },
        {
          id: 'spectral-motion',
          name: 'Spectral Motion',
          description: 'Maps spectral brightness to movement speed',
          mappings: [
            {
              eventType: 'brightness' as const,
              targetParameter: 'speed',
              mappingConfig: {
                source: 'brightness' as const,
                transform: 'exponential' as const,
                range: [0.5, 3.0] as [number, number],
                sensitivity: 45
              }
            }
          ]
        }
      ];

      return {
        success: true,
        data: presets
      };
    }),

  /**
   * Apply a preset to a project
   */
  applyPreset: protectedProcedure
    .input(z.object({
      projectId: z.string().min(1),
      presetId: z.string().min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new EventBasedMappingService();
        
        // Get the preset (this would normally be from a database)
        const presetsResponse = await eventBasedMappingRouter.createCaller(ctx).getPresets();
        const preset = presetsResponse.data.find(p => p.id === input.presetId);
        
        if (!preset) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Preset not found'
          });
        }

        const results = [];
        for (const mappingData of preset.mappings) {
          const mapping = await service.createMapping(
            ctx.session.user.id,
            input.projectId,
            mappingData.eventType,
            mappingData.targetParameter,
            mappingData.mappingConfig
          );
          results.push(mapping);
        }

        return {
          success: true,
          data: results,
          preset: {
            id: preset.id,
            name: preset.name,
            description: preset.description
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to apply preset',
          cause: error
        });
      }
    })
});