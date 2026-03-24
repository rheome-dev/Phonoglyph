import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { createApiKey, revokeApiKey, listApiKeys } from '../services/api-key';
import { logger } from '../lib/logger';

export const apiKeyRouter = router({
  // Create a new API key (requires authenticated session)
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      scopes: z.array(z.enum(['read', 'write', 'render'])).default(['read', 'write', 'render']),
      expiresAt: z.string().datetime().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { rawKey, record } = await createApiKey(
          ctx.user.id,
          input.name,
          input.scopes,
          input.expiresAt
        );

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'apiKey.create',
          p_resource_type: 'api_key',
          p_resource_id: record.id,
          p_metadata: { name: input.name, scopes: input.scopes },
        });

        // Return the raw key ONCE — it cannot be retrieved after this
        return {
          key: rawKey,
          ...record,
        };
      } catch (error) {
        logger.error('Failed to create API key:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create API key',
        });
      }
    }),

  // List all API keys for the current user
  list: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        return await listApiKeys(ctx.user.id);
      } catch (error) {
        logger.error('Failed to list API keys:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list API keys',
        });
      }
    }),

  // Revoke an API key
  revoke: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const success = await revokeApiKey(input.id, ctx.user.id);

        if (!success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'API key not found or already revoked',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'apiKey.revoke',
          p_resource_type: 'api_key',
          p_resource_id: input.id,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Failed to revoke API key:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to revoke API key',
        });
      }
    }),
});
