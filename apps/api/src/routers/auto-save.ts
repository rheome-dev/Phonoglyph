import { z } from 'zod';
import { router, protectedProcedure, flexibleProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { logger } from '../lib/logger';

// Validation schemas
const saveStateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  data: z.record(z.any()).refine((data) => {
    // Validate that data contains expected structure
    return data && typeof data === 'object';
  }, 'Invalid edit state data'),
  version: z.number().min(1, 'Version must be at least 1').optional(),
});

const restoreStateSchema = z.object({
  stateId: z.string().min(1, 'State ID is required'),
});

const getProjectStatesSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  limit: z.number().min(1).max(50).default(10),
  offset: z.number().min(0).default(0),
});

const deleteStateSchema = z.object({
  stateId: z.string().min(1, 'State ID is required'),
});

const clearProjectHistorySchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
});

export const autoSaveRouter = router({
  // Save current edit state
  saveState: protectedProcedure
    .input(saveStateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // First, mark all existing states for this project as not current
        await ctx.supabase
          .from('edit_states')
          .update({ is_current: false })
          .eq('project_id', input.projectId)
          .eq('user_id', ctx.user.id);

        // Get the next version number
        const { data: latestState } = await ctx.supabase
          .from('edit_states')
          .select('version')
          .eq('project_id', input.projectId)
          .eq('user_id', ctx.user.id)
          .order('version', { ascending: false })
          .limit(1)
          .single();

        const nextVersion = (latestState?.version || 0) + 1;

        // Create new edit state
        const { data: editState, error } = await ctx.supabase
          .from('edit_states')
          .insert({
            user_id: ctx.user.id,
            project_id: input.projectId,
            data: input.data,
            version: nextVersion,
            is_current: true,
          })
          .select()
          .single();

        if (error) {
          logger.error('Database error saving edit state:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save edit state',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'auto_save.save_state',
          p_resource_type: 'edit_state',
          p_resource_id: editState.id,
          p_metadata: { project_id: input.projectId, version: nextVersion },
        });

        return editState;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Error saving edit state:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save edit state',
        });
      }
    }),

  // Get current state for a project
  getCurrentState: protectedProcedure
    .input(z.object({ projectId: z.string().min(1, 'Project ID is required') }))
    .query(async ({ input, ctx }) => {
      try {
        // First, try to get the current state marked as is_current
        const { data: editState, error } = await ctx.supabase
          .from('edit_states')
          .select('*')
          .eq('project_id', input.projectId)
          .eq('user_id', ctx.user.id)
          .eq('is_current', true)
          .single();

        if (editState) {
          logger.log(`[autoSave] getCurrentState: found is_current=true, version=${editState.version}, id=${editState.id}`);
          return editState;
        }

        // If no current state found (or error), fallback to the latest by timestamp
        if (error && error.code !== 'PGRST116') {
          logger.error('[autoSave] getCurrentState: error fetching is_current state:', error);
        }

        logger.log(`[autoSave] getCurrentState: no is_current found, fallback to latest by timestamp`);

        const { data: latestState, error: latestError } = await ctx.supabase
          .from('edit_states')
          .select('*')
          .eq('project_id', input.projectId)
          .eq('user_id', ctx.user.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (latestError) {
          logger.error('[autoSave] getCurrentState: error fetching latest state:', latestError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch current state',
          });
        }

        if (!latestState) {
          logger.log(`[autoSave] getCurrentState: no states found for project`);
          return null;
        }

        logger.log(`[autoSave] getCurrentState: fallback returned version=${latestState.version}, id=${latestState.id}`);

        return latestState;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('[autoSave] getCurrentState: unexpected error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch current state',
        });
      }
    }),

  // Restore a specific edit state
  restoreState: protectedProcedure
    .input(restoreStateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Get the state to restore
        const { data: editState, error: fetchError } = await ctx.supabase
          .from('edit_states')
          .select('*')
          .eq('id', input.stateId)
          .eq('user_id', ctx.user.id)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Edit state not found or access denied',
            });
          }
          logger.error('Database error fetching edit state:', fetchError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch edit state',
          });
        }

        // Mark all existing states for this project as not current
        await ctx.supabase
          .from('edit_states')
          .update({ is_current: false })
          .eq('project_id', editState.project_id)
          .eq('user_id', ctx.user.id);

        // Create a new state based on the restored one
        const { data: newState, error: createError } = await ctx.supabase
          .from('edit_states')
          .insert({
            user_id: ctx.user.id,
            project_id: editState.project_id,
            data: editState.data,
            version: editState.version + 1,
            is_current: true,
          })
          .select()
          .single();

        if (createError) {
          logger.error('Database error creating restored state:', createError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to restore edit state',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'auto_save.restore_state',
          p_resource_type: 'edit_state',
          p_resource_id: newState.id,
          p_metadata: { 
            original_state_id: input.stateId,
            project_id: editState.project_id,
            version: newState.version 
          },
        });

        return newState;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Error restoring edit state:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to restore edit state',
        });
      }
    }),

  // Get edit history for a project
  getProjectStates: protectedProcedure
    .input(getProjectStatesSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { data: editStates, error } = await ctx.supabase
          .from('edit_states')
          .select('*')
          .eq('project_id', input.projectId)
          .eq('user_id', ctx.user.id)
          .order('timestamp', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) {
          logger.error('Database error fetching project states:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch project states',
          });
        }

        return editStates || [];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Error fetching project states:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch project states',
        });
      }
    }),

  // Delete a specific edit state
  deleteState: protectedProcedure
    .input(deleteStateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if this is the current state
        const { data: editState, error: fetchError } = await ctx.supabase
          .from('edit_states')
          .select('is_current, project_id')
          .eq('id', input.stateId)
          .eq('user_id', ctx.user.id)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Edit state not found or access denied',
            });
          }
          logger.error('Database error fetching edit state:', fetchError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch edit state',
          });
        }

        // Delete the state
        const { error: deleteError } = await ctx.supabase
          .from('edit_states')
          .delete()
          .eq('id', input.stateId)
          .eq('user_id', ctx.user.id);

        if (deleteError) {
          logger.error('Database error deleting edit state:', deleteError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete edit state',
          });
        }

        // If this was the current state, make the most recent state current
        if (editState.is_current) {
          const { data: latestState } = await ctx.supabase
            .from('edit_states')
            .select('id')
            .eq('project_id', editState.project_id)
            .eq('user_id', ctx.user.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          if (latestState) {
            await ctx.supabase
              .from('edit_states')
              .update({ is_current: true })
              .eq('id', latestState.id);
          }
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'auto_save.delete_state',
          p_resource_type: 'edit_state',
          p_resource_id: input.stateId,
          p_metadata: { 
            was_current: editState.is_current,
            project_id: editState.project_id 
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Error deleting edit state:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete edit state',
        });
      }
    }),

  // Clear all edit history for a project
  clearProjectHistory: protectedProcedure
    .input(clearProjectHistorySchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Delete all edit states for this project
        const { error } = await ctx.supabase
          .from('edit_states')
          .delete()
          .eq('project_id', input.projectId)
          .eq('user_id', ctx.user.id);

        if (error) {
          logger.error('Database error clearing project history:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to clear project history',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'auto_save.clear_history',
          p_resource_type: 'project',
          p_resource_id: input.projectId,
          p_metadata: { action: 'clear_edit_history' },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Error clearing project history:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clear project history',
        });
      }
    }),
}); 