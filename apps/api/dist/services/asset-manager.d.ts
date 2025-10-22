import { SupabaseClient } from '@supabase/supabase-js';
export interface AssetUsage {
    id: string;
    fileId: string;
    projectId: string;
    usageType: 'visualizer' | 'composition' | 'export';
    usageContext: Record<string, any>;
    startedAt: string;
    endedAt?: string;
    sessionDuration?: number;
}
export interface StorageQuota {
    projectId: string;
    userSubscriptionTier: 'free' | 'premium' | 'enterprise';
    totalLimitBytes: number;
    usedBytes: number;
    fileCountLimit: number;
    fileCountUsed: number;
    perFileSizeLimit: number;
    lastCalculatedAt: string;
}
export interface AssetFolder {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    parentFolderId?: string;
    createdAt: string;
    updatedAt: string;
}
export interface AssetTag {
    id: string;
    projectId: string;
    name: string;
    color: string;
    createdAt: string;
}
export declare class AssetManager {
    private supabase;
    constructor(supabase: SupabaseClient);
    startUsageTracking(fileId: string, projectId: string, usageType: 'visualizer' | 'composition' | 'export', usageContext?: Record<string, any>): Promise<string>;
    endUsageTracking(usageId: string): Promise<void>;
    updateFileUsageStatus(fileId: string, status: 'active' | 'referenced' | 'unused'): Promise<void>;
    getAssetUsage(fileId: string, projectId: string): Promise<AssetUsage[]>;
    getStorageQuota(projectId: string): Promise<StorageQuota>;
    checkStorageQuota(projectId: string, fileSize: number): Promise<{
        allowed: boolean;
        reason?: string;
    }>;
    updateSubscriptionTier(projectId: string, tier: 'free' | 'premium' | 'enterprise'): Promise<void>;
    private getTierLimits;
    private formatBytes;
    createFolder(projectId: string, name: string, description?: string, parentFolderId?: string): Promise<AssetFolder>;
    getFolders(projectId: string): Promise<AssetFolder[]>;
    createTag(projectId: string, name: string, color?: string): Promise<AssetTag>;
    getTags(projectId: string): Promise<AssetTag[]>;
    addTagToFile(fileId: string, tagId: string): Promise<void>;
    removeTagFromFile(fileId: string, tagId: string): Promise<void>;
    getFileTags(fileId: string): Promise<AssetTag[]>;
    replaceAsset(oldFileId: string, newFileId: string, preserveMetadata?: boolean): Promise<void>;
}
//# sourceMappingURL=asset-manager.d.ts.map