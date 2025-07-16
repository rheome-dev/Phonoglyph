import { MIDIData } from '../types/midi';
export declare const midiRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: import("../types/auth").AuthContext & {
        req: any;
        res: any;
        isGuest: boolean;
    };
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: import("@trpc/server").DefaultDataTransformer;
}>, {
    parseMidiFile: import("@trpc/server").BuildProcedure<"mutation", {
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
        midiFileId: any;
        data: MIDIData;
        cached: boolean;
    }>;
    getVisualizationData: import("@trpc/server").BuildProcedure<"query", {
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
        midiData: MIDIData;
        settings: any;
        metadata: {
            id: any;
            fileName: any;
            duration: any;
            trackCount: any;
            noteCount: any;
            timeSignature: any;
            keySignature: any;
            tempoBpm: any;
        };
    }>;
    saveVisualizationSettings: import("@trpc/server").BuildProcedure<"mutation", {
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
            settings: {
                colorScheme?: "sage" | "slate" | "dusty-rose" | "mixed" | undefined;
                pixelsPerSecond?: number | undefined;
                showTrackLabels?: boolean | undefined;
                showVelocity?: boolean | undefined;
                minKey?: number | undefined;
                maxKey?: number | undefined;
            };
        };
        _input_out: {
            fileId: string;
            settings: {
                colorScheme: "sage" | "slate" | "dusty-rose" | "mixed";
                pixelsPerSecond: number;
                showTrackLabels: boolean;
                showVelocity: boolean;
                minKey: number;
                maxKey: number;
            };
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
        message: string;
    }>;
    getUserMidiFiles: import("@trpc/server").BuildProcedure<"query", {
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
            status?: "completed" | "failed" | "all" | "pending" | undefined;
            limit?: number | undefined;
            offset?: number | undefined;
            projectId?: string | undefined;
        };
        _input_out: {
            status: "completed" | "failed" | "all" | "pending";
            limit: number;
            offset: number;
            projectId?: string | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        files: any;
        hasMore: boolean;
    }>;
}>;
//# sourceMappingURL=midi.d.ts.map