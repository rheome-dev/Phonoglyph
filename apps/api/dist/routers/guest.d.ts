import type { User } from '../types/auth';
export declare const guestRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: import("../types/auth").AuthContext & {
        req: any;
        res: any;
        isGuest: boolean;
    };
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: import("@trpc/server").DefaultDataTransformer;
}>, {
    sessionInfo: import("@trpc/server").BuildProcedure<"query", {
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
            user: User | null;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: typeof import("@trpc/server").unsetMarker;
        _input_out: typeof import("@trpc/server").unsetMarker;
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        type: string;
        authenticated: boolean;
        isGuest: boolean;
        user: null;
        limitations?: undefined;
    } | {
        type: string;
        authenticated: boolean;
        isGuest: boolean;
        user: {
            id: string;
            sessionId: string;
            createdAt: string;
            email?: undefined;
            name?: undefined;
        };
        limitations: {
            maxProjects: number;
            dataRetention: string;
            features: string[];
        };
    } | {
        type: string;
        authenticated: boolean;
        isGuest: boolean;
        user: {
            id: string;
            email: string;
            name: string | undefined;
            sessionId?: undefined;
            createdAt?: undefined;
        };
        limitations: null;
    }>;
    listProjects: import("@trpc/server").BuildProcedure<"query", {
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
            user: User;
            session: any;
            supabase: any;
            isGuest: boolean;
        };
        _input_in: typeof import("@trpc/server").unsetMarker;
        _input_out: typeof import("@trpc/server").unsetMarker;
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        projects: never[];
        isGuest: boolean;
        message: string;
        conversionPrompt: {
            title: string;
            description: string;
            benefits: string[];
        };
    } | {
        projects: never[];
        isGuest: boolean;
        message?: undefined;
        conversionPrompt?: undefined;
    }>;
}>;
//# sourceMappingURL=guest.d.ts.map