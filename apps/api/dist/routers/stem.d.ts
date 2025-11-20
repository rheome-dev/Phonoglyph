export declare const stemRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: import("phonoglyph-types").AuthContext & {
        req: any;
        res: any;
        isGuest: boolean;
    };
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: import("@trpc/server").DefaultDataTransformer;
}>, {
    createSeparationJob: import("@trpc/server").BuildProcedure<"mutation", {
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
            config: {
                model: "spleeter";
                modelVariant: "2stems" | "4stems" | "5stems";
                stems: {
                    drums?: boolean | undefined;
                    bass?: boolean | undefined;
                    vocals?: boolean | undefined;
                    other?: boolean | undefined;
                    piano?: boolean | undefined;
                };
                quality: {
                    sampleRate?: "44100" | "48000" | undefined;
                    outputFormat?: "wav" | "mp3" | undefined;
                    bitrate?: number | undefined;
                };
            };
        };
        _input_out: {
            fileId: string;
            config: {
                model: "spleeter";
                modelVariant: "2stems" | "4stems" | "5stems";
                stems: {
                    vocals: boolean;
                    other: boolean;
                    drums?: boolean | undefined;
                    bass?: boolean | undefined;
                    piano?: boolean | undefined;
                };
                quality: {
                    sampleRate: "44100" | "48000";
                    outputFormat: "wav" | "mp3";
                    bitrate?: number | undefined;
                };
            };
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        jobId: string;
    }>;
    getJobStatus: import("@trpc/server").BuildProcedure<"query", {
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
            jobId: string;
        };
        _input_out: {
            jobId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        id: any;
        status: any;
        progress: any;
        analysisStatus: any;
        results: any;
        error: any;
    }>;
    getCachedAnalysis: import("@trpc/server").BuildProcedure<"query", {
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
            fileIds: string[];
            stemType?: string | undefined;
        };
        _input_out: {
            fileIds: string[];
            stemType?: string | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, import("../services/audio-analyzer").CachedAnalysis[]>;
    cacheClientSideAnalysis: import("@trpc/server").BuildProcedure<"mutation", {
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
            metadata: {
                sampleRate: number;
                duration: number;
                bufferSize: number;
                featuresExtracted: string[];
            };
            stemType: string;
            analysisData: Record<string, number[]>;
            fileMetadataId: string;
            waveformData: {
                points: number[];
                sampleRate: number;
                duration: number;
                markers: {
                    type: "beat" | "onset" | "peak" | "drop";
                    time: number;
                    intensity: number;
                    frequency?: number | undefined;
                }[];
            };
        };
        _input_out: {
            metadata: {
                sampleRate: number;
                duration: number;
                bufferSize: number;
                featuresExtracted: string[];
            };
            stemType: string;
            analysisData: Record<string, number[]>;
            fileMetadataId: string;
            waveformData: {
                points: number[];
                sampleRate: number;
                duration: number;
                markers: {
                    type: "beat" | "onset" | "peak" | "drop";
                    time: number;
                    intensity: number;
                    frequency?: number | undefined;
                }[];
            };
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
        cached: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        cached: boolean;
        data: any;
        message?: undefined;
    }>;
    listJobs: import("@trpc/server").BuildProcedure<"query", {
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
        };
        _input_out: {
            limit: number;
            offset: number;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, any>;
}>;
//# sourceMappingURL=stem.d.ts.map