import { SupabaseClient } from '@supabase/supabase-js';
export interface AutoSaveConfig {
    enabled: boolean;
    interval: number;
    maxHistory: number;
    debounceTime: number;
}
export interface EditState {
    id: string;
    userId: string;
    projectId: string;
    timestamp: Date;
    data: {
        visualizationParams: Record<string, any>;
        stemMappings: Record<string, any>;
        effectSettings: Record<string, any>;
        timelineState: any;
    };
    version: number;
    isCurrent: boolean;
}
export interface SaveStateOptions {
    projectId: string;
    userId: string;
    data: Record<string, any>;
    version?: number;
    compress?: boolean;
}
export interface RestoreStateOptions {
    stateId: string;
    userId: string;
}
export declare class AutoSaveService {
    private supabase;
    constructor(supabase: SupabaseClient);
    saveState(options: SaveStateOptions): Promise<EditState>;
    getCurrentState(projectId: string, userId: string): Promise<EditState | null>;
    restoreState(options: RestoreStateOptions): Promise<EditState>;
    getProjectStates(projectId: string, userId: string, limit?: number, offset?: number): Promise<EditState[]>;
    deleteState(stateId: string, userId: string): Promise<void>;
    clearProjectHistory(projectId: string, userId: string): Promise<void>;
    private cleanupOldStates;
    private compressStateData;
    private mapDatabaseToEditState;
    validateStateData(data: Record<string, any>): boolean;
    getStorageStats(projectId: string, userId: string): Promise<{
        totalStates: number;
        totalSizeBytes: number;
        averageStateSizeBytes: number;
        oldestState: Date | null;
        newestState: Date | null;
    }>;
}
//# sourceMappingURL=auto-save.d.ts.map