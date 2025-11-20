"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoSaveRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const server_1 = require("@trpc/server");
const logger_1 = require("../lib/logger");
// Validation schemas
const saveStateSchema = zod_1.z.object({
    projectId: zod_1.z.string().min(1, 'Project ID is required'),
    data: zod_1.z.record(zod_1.z.any()).refine((data) => {
        // Validate that data contains expected structure
        return data && typeof data === 'object';
    }, 'Invalid edit state data'),
    version: zod_1.z.number().min(1, 'Version must be at least 1').optional(),
});
const restoreStateSchema = zod_1.z.object({
    stateId: zod_1.z.string().min(1, 'State ID is required'),
});
const getProjectStatesSchema = zod_1.z.object({
    projectId: zod_1.z.string().min(1, 'Project ID is required'),
    limit: zod_1.z.number().min(1).max(50).default(10),
    offset: zod_1.z.number().min(0).default(0),
});
const deleteStateSchema = zod_1.z.object({
    stateId: zod_1.z.string().min(1, 'State ID is required'),
});
const clearProjectHistorySchema = zod_1.z.object({
    projectId: zod_1.z.string().min(1, 'Project ID is required'),
});
exports.autoSaveRouter = (0, trpc_1.router)({
    // Save current edit state
    saveState: trpc_1.protectedProcedure
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
                logger_1.logger.error('Database error saving edit state:', error);
                throw new server_1.TRPCError({
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
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            logger_1.logger.error('Error saving edit state:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to save edit state',
            });
        }
    }),
    // Get current state for a project
    getCurrentState: trpc_1.protectedProcedure
        .input(zod_1.z.object({ projectId: zod_1.z.string().min(1, 'Project ID is required') }))
        .query(async ({ input, ctx }) => {
        try {
            const { data: editState, error } = await ctx.supabase
                .from('edit_states')
                .select('*')
                .eq('project_id', input.projectId)
                .eq('user_id', ctx.user.id)
                .eq('is_current', true)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    // No current state found, return null
                    return null;
                }
                logger_1.logger.error('Database error fetching current state:', error);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch current state',
                });
            }
            return editState;
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            logger_1.logger.error('Error fetching current state:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch current state',
            });
        }
    }),
    // Restore a specific edit state
    restoreState: trpc_1.protectedProcedure
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
                    throw new server_1.TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Edit state not found or access denied',
                    });
                }
                logger_1.logger.error('Database error fetching edit state:', fetchError);
                throw new server_1.TRPCError({
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
                logger_1.logger.error('Database error creating restored state:', createError);
                throw new server_1.TRPCError({
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
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            logger_1.logger.error('Error restoring edit state:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to restore edit state',
            });
        }
    }),
    // Get edit history for a project
    getProjectStates: trpc_1.protectedProcedure
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
                logger_1.logger.error('Database error fetching project states:', error);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch project states',
                });
            }
            return editStates || [];
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            logger_1.logger.error('Error fetching project states:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch project states',
            });
        }
    }),
    // Delete a specific edit state
    deleteState: trpc_1.protectedProcedure
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
                    throw new server_1.TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Edit state not found or access denied',
                    });
                }
                logger_1.logger.error('Database error fetching edit state:', fetchError);
                throw new server_1.TRPCError({
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
                logger_1.logger.error('Database error deleting edit state:', deleteError);
                throw new server_1.TRPCError({
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
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            logger_1.logger.error('Error deleting edit state:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to delete edit state',
            });
        }
    }),
    // Clear all edit history for a project
    clearProjectHistory: trpc_1.protectedProcedure
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
                logger_1.logger.error('Database error clearing project history:', error);
                throw new server_1.TRPCError({
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
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            logger_1.logger.error('Error clearing project history:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to clear project history',
            });
        }
    }),
});
//# sourceMappingURL=auto-save.js.map