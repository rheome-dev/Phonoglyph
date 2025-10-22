"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetManager = void 0;
const server_1 = require("@trpc/server");
class AssetManager {
    constructor(supabase) {
        this.supabase = supabase;
    }
    // Asset Usage Tracking
    async startUsageTracking(fileId, projectId, usageType, usageContext = {}) {
        const { data, error } = await this.supabase
            .from('asset_usage')
            .insert({
            file_id: fileId,
            project_id: projectId,
            usage_type: usageType,
            usage_context: usageContext,
            started_at: new Date().toISOString()
        })
            .select('id')
            .single();
        if (error) {
            console.error('Error starting usage tracking:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to start usage tracking'
            });
        }
        // Update file usage status
        await this.updateFileUsageStatus(fileId, 'active');
        return data.id;
    }
    async endUsageTracking(usageId) {
        const { error } = await this.supabase
            .from('asset_usage')
            .update({
            ended_at: new Date().toISOString()
        })
            .eq('id', usageId);
        if (error) {
            console.error('Error ending usage tracking:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to end usage tracking'
            });
        }
    }
    async updateFileUsageStatus(fileId, status) {
        const { error } = await this.supabase
            .from('file_metadata')
            .update({
            usage_status: status,
            last_used_at: status === 'unused' ? null : new Date().toISOString()
        })
            .eq('id', fileId);
        if (error) {
            console.error('Error updating file usage status:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to update file usage status'
            });
        }
    }
    async getAssetUsage(fileId, projectId) {
        const { data, error } = await this.supabase
            .from('asset_usage')
            .select('*')
            .eq('file_id', fileId)
            .eq('project_id', projectId)
            .order('started_at', { ascending: false });
        if (error) {
            console.error('Error fetching asset usage:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch asset usage'
            });
        }
        return data || [];
    }
    // Storage Quota Management
    async getStorageQuota(projectId) {
        const { data, error } = await this.supabase
            .from('project_storage_quotas')
            .select('*')
            .eq('project_id', projectId)
            .single();
        if (error) {
            console.error('Error fetching storage quota:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch storage quota'
            });
        }
        return {
            projectId: data.project_id,
            userSubscriptionTier: data.user_subscription_tier,
            totalLimitBytes: data.total_limit_bytes,
            usedBytes: data.used_bytes,
            fileCountLimit: data.file_count_limit,
            fileCountUsed: data.file_count_used,
            perFileSizeLimit: data.per_file_size_limit,
            lastCalculatedAt: data.last_calculated_at
        };
    }
    async checkStorageQuota(projectId, fileSize) {
        const quota = await this.getStorageQuota(projectId);
        // Check total storage limit
        if (quota.usedBytes + fileSize > quota.totalLimitBytes) {
            return {
                allowed: false,
                reason: `Storage limit exceeded. Available: ${this.formatBytes(quota.totalLimitBytes - quota.usedBytes)}`
            };
        }
        // Check file count limit
        if (quota.fileCountUsed >= quota.fileCountLimit) {
            return {
                allowed: false,
                reason: `File count limit exceeded. Maximum: ${quota.fileCountLimit} files`
            };
        }
        // Check per-file size limit
        if (fileSize > quota.perFileSizeLimit) {
            return {
                allowed: false,
                reason: `File size exceeds limit. Maximum: ${this.formatBytes(quota.perFileSizeLimit)}`
            };
        }
        return { allowed: true };
    }
    async updateSubscriptionTier(projectId, tier) {
        const limits = this.getTierLimits(tier);
        const { error } = await this.supabase
            .from('project_storage_quotas')
            .upsert({
            project_id: projectId,
            user_subscription_tier: tier,
            total_limit_bytes: limits.totalLimitBytes,
            file_count_limit: limits.fileCountLimit,
            per_file_size_limit: limits.perFileSizeLimit
        });
        if (error) {
            console.error('Error updating subscription tier:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to update subscription tier'
            });
        }
    }
    getTierLimits(tier) {
        switch (tier) {
            case 'free':
                return {
                    totalLimitBytes: 100 * 1024 * 1024, // 100MB
                    fileCountLimit: 10,
                    perFileSizeLimit: 50 * 1024 * 1024 // 50MB
                };
            case 'premium':
                return {
                    totalLimitBytes: 1024 * 1024 * 1024, // 1GB
                    fileCountLimit: 100,
                    perFileSizeLimit: 100 * 1024 * 1024 // 100MB
                };
            case 'enterprise':
                return {
                    totalLimitBytes: 10 * 1024 * 1024 * 1024, // 10GB
                    fileCountLimit: 1000,
                    perFileSizeLimit: 500 * 1024 * 1024 // 500MB
                };
        }
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    // Asset Organization
    async createFolder(projectId, name, description, parentFolderId) {
        const { data, error } = await this.supabase
            .from('asset_folders')
            .insert({
            project_id: projectId,
            name,
            description,
            parent_folder_id: parentFolderId
        })
            .select('*')
            .single();
        if (error) {
            console.error('Error creating folder:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create folder'
            });
        }
        return {
            id: data.id,
            projectId: data.project_id,
            name: data.name,
            description: data.description,
            parentFolderId: data.parent_folder_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }
    async getFolders(projectId) {
        const { data, error } = await this.supabase
            .from('asset_folders')
            .select('*')
            .eq('project_id', projectId)
            .order('name');
        if (error) {
            console.error('Error fetching folders:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch folders'
            });
        }
        return (data || []).map((folder) => ({
            id: folder.id,
            projectId: folder.project_id,
            name: folder.name,
            description: folder.description,
            parentFolderId: folder.parent_folder_id,
            createdAt: folder.created_at,
            updatedAt: folder.updated_at
        }));
    }
    async createTag(projectId, name, color = '#3B82F6') {
        const { data, error } = await this.supabase
            .from('asset_tags')
            .insert({
            project_id: projectId,
            name,
            color
        })
            .select('*')
            .single();
        if (error) {
            console.error('Error creating tag:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create tag'
            });
        }
        return {
            id: data.id,
            projectId: data.project_id,
            name: data.name,
            color: data.color,
            createdAt: data.created_at
        };
    }
    async getTags(projectId) {
        const { data, error } = await this.supabase
            .from('asset_tags')
            .select('*')
            .eq('project_id', projectId)
            .order('name');
        if (error) {
            console.error('Error fetching tags:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch tags'
            });
        }
        return (data || []).map((tag) => ({
            id: tag.id,
            projectId: tag.project_id,
            name: tag.name,
            color: tag.color,
            createdAt: tag.created_at
        }));
    }
    async addTagToFile(fileId, tagId) {
        const { error } = await this.supabase
            .from('asset_tag_relationships')
            .insert({
            file_id: fileId,
            tag_id: tagId
        });
        if (error) {
            console.error('Error adding tag to file:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to add tag to file'
            });
        }
    }
    async removeTagFromFile(fileId, tagId) {
        const { error } = await this.supabase
            .from('asset_tag_relationships')
            .delete()
            .eq('file_id', fileId)
            .eq('tag_id', tagId);
        if (error) {
            console.error('Error removing tag from file:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to remove tag from file'
            });
        }
    }
    async getFileTags(fileId) {
        // First get the tag IDs for this file
        const { data: relationships, error: relError } = await this.supabase
            .from('asset_tag_relationships')
            .select('tag_id')
            .eq('file_id', fileId);
        if (relError) {
            console.error('Error fetching file tag relationships:', relError);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch file tag relationships'
            });
        }
        if (!relationships || relationships.length === 0) {
            return [];
        }
        // Then get the actual tag data
        const tagIds = relationships.map((rel) => rel.tag_id);
        const { data: tags, error: tagError } = await this.supabase
            .from('asset_tags')
            .select('*')
            .in('id', tagIds)
            .order('name');
        if (tagError) {
            console.error('Error fetching file tags:', tagError);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch file tags'
            });
        }
        return (tags || []).map((tag) => ({
            id: tag.id,
            projectId: tag.project_id,
            name: tag.name,
            color: tag.color,
            createdAt: tag.created_at
        }));
    }
    // Asset Replacement
    async replaceAsset(oldFileId, newFileId, preserveMetadata = true) {
        // Get old file metadata
        const { data: oldFile, error: oldFileError } = await this.supabase
            .from('file_metadata')
            .select('*')
            .eq('id', oldFileId)
            .single();
        if (oldFileError || !oldFile) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Original file not found'
            });
        }
        // Get new file metadata
        const { data: newFile, error: newFileError } = await this.supabase
            .from('file_metadata')
            .select('*')
            .eq('id', newFileId)
            .single();
        if (newFileError || !newFile) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Replacement file not found'
            });
        }
        // Update replacement history
        const replacementHistory = oldFile.replacement_history || [];
        replacementHistory.push(oldFileId);
        // Update new file with old file's metadata if preserving
        const updateData = {
            replacement_history: replacementHistory
        };
        if (preserveMetadata) {
            updateData.project_id = oldFile.project_id;
            updateData.folder_id = oldFile.folder_id;
            updateData.asset_type = oldFile.asset_type;
            updateData.is_primary = oldFile.is_primary;
            updateData.usage_status = oldFile.usage_status;
        }
        const { error: updateError } = await this.supabase
            .from('file_metadata')
            .update(updateData)
            .eq('id', newFileId);
        if (updateError) {
            console.error('Error updating replacement file:', updateError);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to update replacement file'
            });
        }
        // Copy tags from old file to new file
        const oldFileTags = await this.getFileTags(oldFileId);
        for (const tag of oldFileTags) {
            await this.addTagToFile(newFileId, tag.id);
        }
        // Mark old file as replaced
        const { error: markError } = await this.supabase
            .from('file_metadata')
            .update({
            usage_status: 'unused',
            is_primary: false
        })
            .eq('id', oldFileId);
        if (markError) {
            console.error('Error marking old file as replaced:', markError);
            // Don't throw error here as the main operation succeeded
        }
    }
}
exports.AssetManager = AssetManager;
//# sourceMappingURL=asset-manager.js.map