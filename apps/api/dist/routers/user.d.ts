export declare const userRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: import("phonoglyph-types").AuthContext & {
        req: any;
        res: any;
        isGuest: boolean;
    };
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: import("@trpc/server").DefaultDataTransformer;
}>, {
    profile: import("@trpc/server").BuildProcedure<"query", {
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
        id: string;
        email: string;
        name: string | undefined;
        avatar_url: string | undefined;
        created_at: string;
    }>;
    updateProfile: import("@trpc/server").BuildProcedure<"mutation", {
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
            avatar_url?: string | undefined;
            name?: string | undefined;
        };
        _input_out: {
            avatar_url?: string | undefined;
            name?: string | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
        message: string;
    }>;
    deleteAccount: import("@trpc/server").BuildProcedure<"mutation", {
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
            confirmation: "DELETE_MY_ACCOUNT";
        };
        _input_out: {
            confirmation: "DELETE_MY_ACCOUNT";
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        success: boolean;
        message: string;
    }>;
    auditLogs: import("@trpc/server").BuildProcedure<"query", {
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
//# sourceMappingURL=user.d.ts.map