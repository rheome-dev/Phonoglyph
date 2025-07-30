export declare const healthRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: import("phonoglyph-types").AuthContext & {
        req: any;
        res: any;
        isGuest: boolean;
    };
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: import("@trpc/server").DefaultDataTransformer;
}>, {
    check: import("@trpc/server").BuildProcedure<"query", {
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
        status: string;
        timestamp: string;
        message: string;
    }>;
}>;
//# sourceMappingURL=health.d.ts.map