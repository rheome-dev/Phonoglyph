export declare const fileRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: import("../types/auth").AuthContext & {
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
            ctx: import("../types/auth").AuthContext & {
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
            user: import("../types/auth").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            fileName: string;
            fileSize: number;
            mimeType: string;
        };
        _input_out: {
            fileName: string;
            fileSize: number;
            mimeType: string;
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
            ctx: import("../types/auth").AuthContext & {
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
            user: import("../types/auth").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            fileName: string;
            fileSize: number;
            mimeType: string;
            fileType: "midi" | "audio" | "video" | "image";
            fileData: string;
        };
        _input_out: {
            fileName: string;
            fileSize: number;
            mimeType: string;
            fileType: "midi" | "audio" | "video" | "image";
            fileData: string;
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
            ctx: import("../types/auth").AuthContext & {
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
            user: import("../types/auth").User;
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
    getUserFiles: import("@trpc/server").BuildProcedure<"query", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("../types/auth").AuthContext & {
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
            user: import("../types/auth").User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: {
            limit?: number | undefined;
            offset?: number | undefined;
            fileType?: "midi" | "audio" | "video" | "image" | "all" | undefined;
        };
        _input_out: {
            limit: number;
            offset: number;
            fileType: "midi" | "audio" | "video" | "image" | "all";
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        files: any[];
        hasMore: boolean;
    }>;
    getDownloadUrl: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("../types/auth").AuthContext & {
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
            user: import("../types/auth").User;
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
            ctx: import("../types/auth").AuthContext & {
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
            user: import("../types/auth").User;
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
            ctx: import("../types/auth").AuthContext & {
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
            user: import("../types/auth").User;
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
            ctx: import("../types/auth").AuthContext & {
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
            user: import("../types/auth").User;
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
}>;
//# sourceMappingURL=file.d.ts.map