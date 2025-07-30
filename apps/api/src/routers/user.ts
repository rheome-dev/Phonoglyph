import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import type { UserProfile } from 'phonoglyph-types';

const updateProfileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name too long').optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  preferences: z.record(z.any()).optional(),
});

export const userRouter = router({
  // Get user profile
  profile: protectedProcedure
    .query(({ ctx }) => {
      return {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        avatar_url: ctx.user.image,
        created_at: ctx.user.created_at,
      }
    }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      avatar_url: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.auth.updateUser({
        data: input,
      })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      return {
        success: true,
        message: 'Profile updated successfully',
      }
    }),

  // Delete user account and all associated data
  deleteAccount: protectedProcedure
    .input(z.object({
      confirmation: z.literal('DELETE_MY_ACCOUNT'),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Log audit event before deletion
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'user.delete_account',
          p_resource_type: 'user',
          p_resource_id: ctx.user.id,
          p_metadata: { confirmation: input.confirmation },
        });

        // Delete user from Supabase auth (this will cascade delete all related data)
        const { error } = await ctx.supabase.auth.admin.deleteUser(ctx.user.id);

        if (error) {
          console.error('Database error deleting user account:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete user account',
          });
        }

        return { success: true, message: 'Account deleted successfully' };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error deleting user account:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete user account',
        });
      }
    }),

  // Get user's audit logs
  auditLogs: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const { data: logs, error } = await ctx.supabase
          .from('audit_logs')
          .select('*')
          .eq('user_id', ctx.user.id)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) {
          console.error('Database error fetching audit logs:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch audit logs',
          });
        }

        return logs || [];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error fetching audit logs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch audit logs',
        });
      }
    }),
}); 