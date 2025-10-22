export declare const audioAnalysisSandboxRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: import("phonoglyph-types").AuthContext & {
        req: any;
        res: any;
        isGuest: boolean;
    };
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: import("@trpc/server").DefaultDataTransformer;
}>, {
    test: import("@trpc/server").BuildProcedure<"query", {
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
        _ctx_out: import("phonoglyph-types").AuthContext & {
            req: any;
            res: any;
            isGuest: boolean;
        };
        _input_in: typeof import("@trpc/server").unsetMarker;
        _input_out: typeof import("@trpc/server").unsetMarker;
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
        _meta: object;
    }, {
        success: boolean;
        message: string;
        timestamp: string;
    }>;
    saveSandboxAnalysis: import("@trpc/server").BuildProcedure<"mutation", {
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
                analysisDuration: number;
            };
            id: string;
            fileMetadataId: string;
            stemType: string;
            analysisData: {
                transients: {
                    time: number;
                    intensity: number;
                    frequency: number;
                }[];
                chroma: {
                    time: number;
                    pitch: number;
                    confidence: number;
                    note: string;
                }[];
                rms: {
                    value: number;
                    time: number;
                }[];
                waveform: number[];
                metadata: {
                    sampleRate: number;
                    duration: number;
                    bufferSize: number;
                    analysisParams?: any;
                };
            };
            waveformData: {
                sampleRate: number;
                duration: number;
                points: number[];
                markers: any[];
            };
        };
        _input_out: {
            metadata: {
                sampleRate: number;
                duration: number;
                bufferSize: number;
                featuresExtracted: string[];
                analysisDuration: number;
            };
            id: string;
            fileMetadataId: string;
            stemType: string;
            analysisData: {
                transients: {
                    time: number;
                    intensity: number;
                    frequency: number;
                }[];
                chroma: {
                    time: number;
                    pitch: number;
                    confidence: number;
                    note: string;
                }[];
                rms: {
                    value: number;
                    time: number;
                }[];
                waveform: number[];
                metadata: {
                    sampleRate: number;
                    duration: number;
                    bufferSize: number;
                    analysisParams?: any;
                };
            };
            waveformData: {
                sampleRate: number;
                duration: number;
                points: number[];
                markers: any[];
            };
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
        message: string;
    }>;
    getSandboxAnalysis: import("@trpc/server").BuildProcedure<"query", {
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
            stemType?: string | undefined;
        };
        _input_out: {
            stemType: string;
            fileId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        id: any;
        fileMetadataId: any;
        stemType: any;
        analysisData: any;
        waveformData: any;
        metadata: {
            sampleRate: any;
            duration: any;
            bufferSize: any;
            featuresExtracted: any;
            analysisDuration: any;
        };
    } | null>;
    compareAnalysis: import("@trpc/server").BuildProcedure<"query", {
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
            stemType?: string | undefined;
        };
        _input_out: {
            stemType: string;
            fileId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        hasSandbox: boolean;
        hasRegular: boolean;
        sandbox: {
            transients: any;
            chroma: any;
            rms: any;
            createdAt: any;
        } | null;
        regular: {
            transients: any;
            chroma: any;
            rms: any;
            createdAt: any;
        } | null;
    } | null>;
    getSandboxAnalyses: import("@trpc/server").BuildProcedure<"query", {
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
    deleteSandboxAnalysis: import("@trpc/server").BuildProcedure<"mutation", {
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
            analysisId: string;
        };
        _input_out: {
            analysisId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
        message: string;
    }>;
}>;
//# sourceMappingURL=audio-analysis-sandbox.d.ts.map