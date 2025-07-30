export declare const fileRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: import("phonoglyph-types").AuthContext & {
        req: any;
        res: any;
        isGuest: boolean;
    };
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: import("@trpc/server").DefaultDataTransformer;
}>, {
    getUploadUrl: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            fileName: string;
            mimeType: string;
            fileSize: number;
        };
        _input_out: {
            fileName: string;
            mimeType: string;
            fileSize: number;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        fileId: string;
        uploadUrl: string;
        s3Key: string;
        expiresIn: number;
        fileInfo: {
            fileName: string;
            fileType: import("../lib/file-validation").FileType;
            fileSize: number;
        };
    }>;
    uploadFile: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            fileName: string;
            fileType: "midi" | "audio" | "video" | "image";
            mimeType: string;
            fileSize: number;
            fileData: string;
            projectId?: string | undefined;
            isMaster?: boolean | undefined;
            stemType?: string | undefined;
        };
        _input_out: {
            fileName: string;
            fileType: "midi" | "audio" | "video" | "image";
            mimeType: string;
            fileSize: number;
            fileData: string;
            projectId?: string | undefined;
            isMaster?: boolean | undefined;
            stemType?: string | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        fileId: any;
        success: boolean;
        fileInfo: {
            fileName: string;
            fileType: import("../lib/file-validation").FileType;
            fileSize: number;
        };
    }>;
    confirmUpload: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            fileId: string;
            success?: boolean | undefined;
        };
        _input_out: {
            success: boolean;
            fileId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
        fileId: string;
        status: string;
    }>;
    saveAudioAnalysis: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            fileId: string;
            analysisData?: any;
        };
        _input_out: {
            fileId: string;
            analysisData?: any;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
    }>;
    getUserFiles: import("@trpc/server").BuildProcedure<"query", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            limit?: number | undefined;
            offset?: number | undefined;
            fileType?: "midi" | "audio" | "video" | "image" | "all" | undefined;
            projectId?: string | undefined;
        };
        _input_out: {
            limit: number;
            offset: number;
            fileType: "midi" | "audio" | "video" | "image" | "all";
            projectId?: string | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        files: any[];
        hasMore: boolean;
    }>;
    getDownloadUrl: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            fileId: string;
        };
        _input_out: {
            fileId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        downloadUrl: string;
        fileName: any;
        fileSize: any;
        fileType: any;
        expiresIn: number;
    }>;
    deleteFile: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            fileId: string;
        };
        _input_out: {
            fileId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
        fileId: string;
    }>;
    getUploadStats: import("@trpc/server").BuildProcedure<"query", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: typeof import("@trpc/server").unsetMarker;
        _input_out: typeof import("@trpc/server").unsetMarker;
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        remainingUploads: number;
        maxUploadsPerMinute: number;
        resetTime: number;
    }>;
    getProcessingStatus: import("@trpc/server").BuildProcedure<"query", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            fileId: string;
        };
        _input_out: {
            fileId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        status: any;
        fileType: any;
        hasMetadata: boolean;
        hasThumbnail: boolean;
    }>;
    getProjectAssets: import("@trpc/server").BuildProcedure<"query", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            projectId: string;
            search?: string | undefined;
            limit?: number | undefined;
            offset?: number | undefined;
            assetType?: "midi" | "audio" | "video" | "image" | "all" | undefined;
            usageStatus?: "all" | "active" | "referenced" | "unused" | undefined;
            folderId?: string | undefined;
            tagIds?: string[] | undefined;
        };
        _input_out: {
            limit: number;
            offset: number;
            projectId: string;
            assetType: "midi" | "audio" | "video" | "image" | "all";
            usageStatus: "all" | "active" | "referenced" | "unused";
            search?: string | undefined;
            folderId?: string | undefined;
            tagIds?: string[] | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        files: any[];
        hasMore: boolean;
    }>;
    startAssetUsage: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            projectId: string;
            fileId: string;
            usageType: "visualizer" | "composition" | "export";
            usageContext?: Record<string, any> | undefined;
        };
        _input_out: {
            projectId: string;
            fileId: string;
            usageType: "visualizer" | "composition" | "export";
            usageContext?: Record<string, any> | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        usageId: string;
    }>;
    endAssetUsage: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            usageId: string;
        };
        _input_out: {
            usageId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
    }>;
    getStorageQuota: import("@trpc/server").BuildProcedure<"query", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            projectId: string;
        };
        _input_out: {
            projectId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, import("../services/asset-manager").StorageQuota>;
    createAssetFolder: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            name: string;
            projectId: string;
            description?: string | undefined;
            parentFolderId?: string | undefined;
        };
        _input_out: {
            name: string;
            projectId: string;
            description?: string | undefined;
            parentFolderId?: string | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, import("../services/asset-manager").AssetFolder>;
    getAssetFolders: import("@trpc/server").BuildProcedure<"query", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            projectId: string;
        };
        _input_out: {
            projectId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, import("../services/asset-manager").AssetFolder[]>;
    createAssetTag: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            name: string;
            projectId: string;
            color?: string | undefined;
        };
        _input_out: {
            name: string;
            projectId: string;
            color?: string | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, import("../services/asset-manager").AssetTag>;
    getAssetTags: import("@trpc/server").BuildProcedure<"query", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            projectId: string;
        };
        _input_out: {
            projectId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, import("../services/asset-manager").AssetTag[]>;
    addTagToFile: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            fileId: string;
            tagId: string;
        };
        _input_out: {
            fileId: string;
            tagId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
    }>;
    removeTagFromFile: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            fileId: string;
            tagId: string;
        };
        _input_out: {
            fileId: string;
            tagId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
    }>;
    replaceAsset: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("phonoglyph-types").AuthContext & {
                req: any;
                res: any;
                isGuest: boolean;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: any;
            res: any;
            user: import("phonoglyph-types").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            oldFileId: string;
            newFileId: string;
            preserveMetadata?: boolean | undefined;
        };
        _input_out: {
            oldFileId: string;
            newFileId: string;
            preserveMetadata: boolean;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
    }>;
}>;
//# sourceMappingURL=file.d.ts.map