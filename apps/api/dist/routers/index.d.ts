export declare const appRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: import("phonoglyph-types").AuthContext & {
        req: any;
        res: any;
        isGuest: boolean;
    };
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: import("@trpc/server").DefaultDataTransformer;
}>, {
    health: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
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
    auth: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("phonoglyph-types").AuthContext & {
            req: any;
            res: any;
            isGuest: boolean;
        };
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        session: import("@trpc/server").BuildProcedure<"query", {
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
            authenticated: boolean;
            user: import("phonoglyph-types").User | null;
        }>;
        me: import("@trpc/server").BuildProcedure<"query", {
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
            user: import("phonoglyph-types").User;
            session: boolean;
            authenticated: boolean;
        }>;
    }>;
    user: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
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
    guest: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("phonoglyph-types").AuthContext & {
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
                user: import("phonoglyph-types").User | null;
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
    project: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("phonoglyph-types").AuthContext & {
            req: any;
            res: any;
            isGuest: boolean;
        };
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        list: import("@trpc/server").BuildProcedure<"query", {
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
        }, import("phonoglyph-types").Project[]>;
        get: import("@trpc/server").BuildProcedure<"query", {
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
                id: string;
            };
            _input_out: {
                id: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("phonoglyph-types").Project>;
        create: import("@trpc/server").BuildProcedure<"mutation", {
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
                description?: string | undefined;
                privacy_setting?: "public" | "private" | "unlisted" | undefined;
                midi_file_path?: string | undefined;
                audio_file_path?: string | undefined;
                user_video_path?: string | undefined;
                render_configuration?: Record<string, any> | undefined;
            };
            _input_out: {
                name: string;
                privacy_setting: "public" | "private" | "unlisted";
                render_configuration: Record<string, any>;
                description?: string | undefined;
                midi_file_path?: string | undefined;
                audio_file_path?: string | undefined;
                user_video_path?: string | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("phonoglyph-types").Project>;
        update: import("@trpc/server").BuildProcedure<"mutation", {
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
                id: string;
                name?: string | undefined;
                description?: string | undefined;
                privacy_setting?: "public" | "private" | "unlisted" | undefined;
                audio_file_path?: string | undefined;
                user_video_path?: string | undefined;
                render_configuration?: Record<string, any> | undefined;
                thumbnail_url?: string | undefined;
                primary_midi_file_id?: string | undefined;
            };
            _input_out: {
                id: string;
                name?: string | undefined;
                description?: string | undefined;
                privacy_setting?: "public" | "private" | "unlisted" | undefined;
                audio_file_path?: string | undefined;
                user_video_path?: string | undefined;
                render_configuration?: Record<string, any> | undefined;
                thumbnail_url?: string | undefined;
                primary_midi_file_id?: string | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("phonoglyph-types").Project>;
        delete: import("@trpc/server").BuildProcedure<"mutation", {
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
                id: string;
            };
            _input_out: {
                id: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            success: boolean;
            deletedProject: import("phonoglyph-types").Project;
        }>;
        search: import("@trpc/server").BuildProcedure<"query", {
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
                query?: string | undefined;
                limit?: number | undefined;
                offset?: number | undefined;
                privacy_setting?: "public" | "private" | "unlisted" | undefined;
                sort_by?: "name" | "created_at" | "updated_at" | undefined;
                sort_order?: "asc" | "desc" | undefined;
            };
            _input_out: {
                limit: number;
                offset: number;
                sort_by: "name" | "created_at" | "updated_at";
                sort_order: "asc" | "desc";
                query?: string | undefined;
                privacy_setting?: "public" | "private" | "unlisted" | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, any>;
        duplicate: import("@trpc/server").BuildProcedure<"mutation", {
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
                project_id: string;
                new_name: string;
                copy_files?: boolean | undefined;
            };
            _input_out: {
                project_id: string;
                new_name: string;
                copy_files: boolean;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("phonoglyph-types").Project>;
        share: import("@trpc/server").BuildProcedure<"mutation", {
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
                project_id: string;
                access_type?: "view" | "embed" | undefined;
                expires_at?: string | undefined;
            };
            _input_out: {
                project_id: string;
                access_type: "view" | "embed";
                expires_at?: string | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("phonoglyph-types").ProjectShare>;
        getShared: import("@trpc/server").BuildProcedure<"query", {
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
                share_token: string;
            };
            _input_out: {
                share_token: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            project: import("phonoglyph-types").Project;
            share_info: {
                access_type: any;
                view_count: any;
            };
        }>;
        addCollaborator: import("@trpc/server").BuildProcedure<"mutation", {
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
                user_id: string;
                project_id: string;
                role: "editor" | "viewer";
            };
            _input_out: {
                user_id: string;
                project_id: string;
                role: "editor" | "viewer";
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("phonoglyph-types").ProjectCollaborator>;
        updateCollaborator: import("@trpc/server").BuildProcedure<"mutation", {
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
                user_id: string;
                project_id: string;
                role: "editor" | "viewer" | "owner";
            };
            _input_out: {
                user_id: string;
                project_id: string;
                role: "editor" | "viewer" | "owner";
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("phonoglyph-types").ProjectCollaborator>;
        removeCollaborator: import("@trpc/server").BuildProcedure<"mutation", {
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
                user_id: string;
                project_id: string;
            };
            _input_out: {
                user_id: string;
                project_id: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            success: boolean;
            removedCollaborator: import("phonoglyph-types").ProjectCollaborator;
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
                project_id?: string | undefined;
            };
            _input_out: {
                limit: number;
                offset: number;
                project_id?: string | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, any>;
    }>;
    file: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
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
                projectId?: string | undefined;
                fileType?: "all" | "midi" | "audio" | "video" | "image" | undefined;
            };
            _input_out: {
                limit: number;
                offset: number;
                fileType: "all" | "midi" | "audio" | "video" | "image";
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
                assetType?: "all" | "midi" | "audio" | "video" | "image" | undefined;
                usageStatus?: "all" | "active" | "referenced" | "unused" | undefined;
                folderId?: string | undefined;
                tagIds?: string[] | undefined;
            };
            _input_out: {
                limit: number;
                offset: number;
                projectId: string;
                assetType: "all" | "midi" | "audio" | "video" | "image";
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
                fileId: string;
                projectId: string;
                usageType: "visualizer" | "composition" | "export";
                usageContext?: Record<string, any> | undefined;
            };
            _input_out: {
                fileId: string;
                projectId: string;
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
    midi: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("phonoglyph-types").AuthContext & {
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
            midiFileId: any;
            data: import("phonoglyph-types").MIDIData;
            cached: boolean;
        }>;
        getVisualizationData: import("@trpc/server").BuildProcedure<"query", {
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
            midiData: import("phonoglyph-types").MIDIData;
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
                status?: "all" | "completed" | "failed" | "pending" | undefined;
                limit?: number | undefined;
                offset?: number | undefined;
                projectId?: string | undefined;
            };
            _input_out: {
                status: "all" | "completed" | "failed" | "pending";
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
    stem: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
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
                    sampleRate: number;
                    points: number[];
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
                    sampleRate: number;
                    points: number[];
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
    autoSave: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("phonoglyph-types").AuthContext & {
            req: any;
            res: any;
            isGuest: boolean;
        };
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        saveState: import("@trpc/server").BuildProcedure<"mutation", {
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
                data: Record<string, any>;
                projectId: string;
                version?: number | undefined;
            };
            _input_out: {
                data: Record<string, any>;
                projectId: string;
                version?: number | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, any>;
        getCurrentState: import("@trpc/server").BuildProcedure<"query", {
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
        }, any>;
        restoreState: import("@trpc/server").BuildProcedure<"mutation", {
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
                stateId: string;
            };
            _input_out: {
                stateId: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, any>;
        getProjectStates: import("@trpc/server").BuildProcedure<"query", {
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
                limit?: number | undefined;
                offset?: number | undefined;
            };
            _input_out: {
                limit: number;
                offset: number;
                projectId: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, any>;
        deleteState: import("@trpc/server").BuildProcedure<"mutation", {
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
                stateId: string;
            };
            _input_out: {
                stateId: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            success: boolean;
        }>;
        clearProjectHistory: import("@trpc/server").BuildProcedure<"mutation", {
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
        }, {
            success: boolean;
        }>;
    }>;
}>;
export type AppRouter = typeof appRouter;
//# sourceMappingURL=index.d.ts.map