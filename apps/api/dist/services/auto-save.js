"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoSaveService = void 0;
const server_1 = require("@trpc/server");
class AutoSaveService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    // Save current edit state
    async saveState(options) {
        try {
            // First, mark all existing states for this project as not current
            await this.supabase
                .from('edit_states')
                .update({ is_current: false })
                .eq('project_id', options.projectId)
                .eq('user_id', options.userId);
            // Get the next version number
            const { data: latestState } = await this.supabase
                .from('edit_states')
                .select('version')
                .eq('project_id', options.projectId)
                .eq('user_id', options.userId)
                .order('version', { ascending: false })
                .limit(1)
                .single();
            const nextVersion = (latestState?.version || 0) + 1;
            // Prepare data for storage
            const stateData = options.compress
                ? this.compressStateData(options.data)
                : options.data;
            // Create new edit state
            const { data: editState, error } = await this.supabase
                .from('edit_states')
                .insert({
                user_id: options.userId,
                project_id: options.projectId,
                data: stateData,
                version: nextVersion,
                is_current: true,
            })
                .select()
                .single();
            if (error) {
                console.error('Database error saving edit state:', error);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to save edit state',
                });
            }
            // Clean up old states if we exceed max history
            await this.cleanupOldStates(options.projectId, options.userId);
            return this.mapDatabaseToEditState(editState);
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error saving edit state:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to save edit state',
            });
        }
    }
    // Get current state for a project
    async getCurrentState(projectId, userId) {
        try {
            const { data: editState, error } = await this.supabase
                .from('edit_states')
                .select('*')
                .eq('project_id', projectId)
                .eq('user_id', userId)
                .eq('is_current', true)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    // No current state found, return null
                    return null;
                }
                console.error('Database error fetching current state:', error);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch current state',
                });
            }
            return this.mapDatabaseToEditState(editState);
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error fetching current state:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch current state',
            });
        }
    }
    // Restore a specific edit state
    async restoreState(options) {
        try {
            // Get the state to restore
            const { data: editState, error: fetchError } = await this.supabase
                .from('edit_states')
                .select('*')
                .eq('id', options.stateId)
                .eq('user_id', options.userId)
                .single();
            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    throw new server_1.TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Edit state not found or access denied',
                    });
                }
                console.error('Database error fetching edit state:', fetchError);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch edit state',
                });
            }
            // Mark all existing states for this project as not current
            await this.supabase
                .from('edit_states')
                .update({ is_current: false })
                .eq('project_id', editState.project_id)
                .eq('user_id', options.userId);
            // Create a new state based on the restored one
            const { data: newState, error: createError } = await this.supabase
                .from('edit_states')
                .insert({
                user_id: options.userId,
                project_id: editState.project_id,
                data: editState.data,
                version: editState.version + 1,
                is_current: true,
            })
                .select()
                .single();
            if (createError) {
                console.error('Database error creating restored state:', createError);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to restore edit state',
                });
            }
            return this.mapDatabaseToEditState(newState);
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error restoring edit state:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to restore edit state',
            });
        }
    }
    // Get edit history for a project
    async getProjectStates(projectId, userId, limit = 10, offset = 0) {
        try {
            const { data: editStates, error } = await this.supabase
                .from('edit_states')
                .select('*')
                .eq('project_id', projectId)
                .eq('user_id', userId)
                .order('timestamp', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                console.error('Database error fetching project states:', error);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch project states',
                });
            }
            return (editStates || []).map(state => this.mapDatabaseToEditState(state));
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error fetching project states:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch project states',
            });
        }
    }
    // Delete a specific edit state
    async deleteState(stateId, userId) {
        try {
            // Check if this is the current state
            const { data: editState, error: fetchError } = await this.supabase
                .from('edit_states')
                .select('is_current, project_id')
                .eq('id', stateId)
                .eq('user_id', userId)
                .single();
            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    throw new server_1.TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Edit state not found or access denied',
                    });
                }
                console.error('Database error fetching edit state:', fetchError);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch edit state',
                });
            }
            // Delete the state
            const { error: deleteError } = await this.supabase
                .from('edit_states')
                .delete()
                .eq('id', stateId)
                .eq('user_id', userId);
            if (deleteError) {
                console.error('Database error deleting edit state:', deleteError);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to delete edit state',
                });
            }
            // If this was the current state, make the most recent state current
            if (editState.is_current) {
                const { data: latestState } = await this.supabase
                    .from('edit_states')
                    .select('id')
                    .eq('project_id', editState.project_id)
                    .eq('user_id', userId)
                    .order('timestamp', { ascending: false })
                    .limit(1)
                    .single();
                if (latestState) {
                    await this.supabase
                        .from('edit_states')
                        .update({ is_current: true })
                        .eq('id', latestState.id);
                }
            }
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error deleting edit state:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to delete edit state',
            });
        }
    }
    // Clear all edit history for a project
    async clearProjectHistory(projectId, userId) {
        try {
            const { error } = await this.supabase
                .from('edit_states')
                .delete()
                .eq('project_id', projectId)
                .eq('user_id', userId);
            if (error) {
                console.error('Database error clearing project history:', error);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to clear project history',
                });
            }
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error clearing project history:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to clear project history',
            });
        }
    }
    // Clean up old states to maintain history limit
    async cleanupOldStates(projectId, userId, maxHistory = 10) {
        try {
            // Get count of states for this project
            const { count } = await this.supabase
                .from('edit_states')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', projectId)
                .eq('user_id', userId);
            if (count && count > maxHistory) {
                // Get IDs of states to delete (keep the most recent ones)
                const { data: statesToDelete } = await this.supabase
                    .from('edit_states')
                    .select('id')
                    .eq('project_id', projectId)
                    .eq('user_id', userId)
                    .order('timestamp', { ascending: true })
                    .limit(count - maxHistory);
                if (statesToDelete && statesToDelete.length > 0) {
                    const idsToDelete = statesToDelete.map(state => state.id);
                    await this.supabase
                        .from('edit_states')
                        .delete()
                        .in('id', idsToDelete);
                }
            }
        }
        catch (error) {
            console.error('Error cleaning up old states:', error);
            // Don't throw error for cleanup failures
        }
    }
    // Compress state data to reduce storage size
    compressStateData(data) {
        try {
            // Simple compression: remove null/undefined values and compress large objects
            const compressed = JSON.parse(JSON.stringify(data, (key, value) => {
                if (value === null || value === undefined)
                    return undefined;
                if (typeof value === 'object' && Object.keys(value).length === 0)
                    return undefined;
                return value;
            }));
            return compressed;
        }
        catch (error) {
            console.error('Error compressing state data:', error);
            return data; // Return original data if compression fails
        }
    }
    // Map database record to EditState interface
    mapDatabaseToEditState(dbRecord) {
        return {
            id: dbRecord.id,
            userId: dbRecord.user_id,
            projectId: dbRecord.project_id,
            timestamp: new Date(dbRecord.timestamp),
            data: dbRecord.data,
            version: dbRecord.version,
            isCurrent: dbRecord.is_current,
        };
    }
    // Validate edit state data structure
    validateStateData(data) {
        try {
            // Check for required top-level keys
            const requiredKeys = ['visualizationParams', 'stemMappings', 'effectSettings', 'timelineState'];
            const hasRequiredKeys = requiredKeys.every(key => key in data);
            if (!hasRequiredKeys) {
                return false;
            }
            // Validate data types
            const isValid = typeof data.visualizationParams === 'object' &&
                typeof data.stemMappings === 'object' &&
                typeof data.effectSettings === 'object';
            return isValid;
        }
        catch (error) {
            console.error('Error validating state data:', error);
            return false;
        }
    }
    // Get storage statistics for a project
    async getStorageStats(projectId, userId) {
        try {
            const { data: states, error } = await this.supabase
                .from('edit_states')
                .select('timestamp, data')
                .eq('project_id', projectId)
                .eq('user_id', userId)
                .order('timestamp', { ascending: true });
            if (error) {
                console.error('Database error fetching storage stats:', error);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch storage stats',
                });
            }
            if (!states || states.length === 0) {
                return {
                    totalStates: 0,
                    totalSizeBytes: 0,
                    averageStateSizeBytes: 0,
                    oldestState: null,
                    newestState: null,
                };
            }
            const totalStates = states.length;
            const totalSizeBytes = states.reduce((acc, state) => {
                return acc + JSON.stringify(state.data).length;
            }, 0);
            const averageStateSizeBytes = Math.round(totalSizeBytes / totalStates);
            const oldestState = new Date(states[0]?.timestamp || new Date());
            const newestState = new Date(states[states.length - 1]?.timestamp || new Date());
            return {
                totalStates,
                totalSizeBytes,
                averageStateSizeBytes,
                oldestState,
                newestState,
            };
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error getting storage stats:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to get storage stats',
            });
        }
    }
}
exports.AutoSaveService = AutoSaveService;
//# sourceMappingURL=auto-save.js.map