export declare const appRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: import("../types/auth").AuthContext & {
        req: any;
        res: any;
        isGuest: boolean;
    };
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: import("@trpc/server").DefaultDataTransformer;
}>, {
    health: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("../types/auth").AuthContext & {
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
                ctx: import("../types/auth").AuthContext & {
                    req: any;
                    res: any;
                    isGuest: boolean;
                };
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _ctx_out: import("../types/auth").AuthContext & {
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
        ctx: import("../types/auth").AuthContext & {
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
                ctx: import("../types/auth").AuthContext & {
                    req: any;
                    res: any;
                    isGuest: boolean;
                };
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _ctx_out: import("../types/auth").AuthContext & {
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
            user: import("../types/auth").User | null;
        }>;
        me: import("@trpc/server").BuildProcedure<"query", {
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
            user: import("../types/auth").User;
            session: boolean;
            authenticated: boolean;
        }>;
    }>;
    user: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("../types/auth").AuthContext & {
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
            id: string;
            email: string;
            name: string | undefined;
            avatar_url: string | undefined;
            created_at: string;
        }>;
        updateProfile: import("@trpc/server").BuildProcedure<"mutation", {
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
                name?: string | undefined;
                avatar_url?: string | undefined;
            };
            _input_out: {
                name?: string | undefined;
                avatar_url?: string | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            success: boolean;
            message: string;
        }>;
        deleteAccount: import("@trpc/server").BuildProcedure<"mutation", {
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
                user: import("../types/auth").User | null;
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
        ctx: import("../types/auth").AuthContext & {
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
        }, import("../types/auth").ProjectWithCollaborators[]>;
        get: import("@trpc/server").BuildProcedure<"query", {
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
                id: string;
            };
            _input_out: {
                id: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("../types/auth").ProjectWithCollaborators>;
        create: import("@trpc/server").BuildProcedure<"mutation", {
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
                name: string;
                midi_file_path: string;
                description?: string | undefined;
                genre?: string | undefined;
                privacy_setting?: "public" | "private" | "unlisted" | undefined;
                audio_file_path?: string | undefined;
                user_video_path?: string | undefined;
                render_configuration?: Record<string, any> | undefined;
            };
            _input_out: {
                name: string;
                privacy_setting: "public" | "private" | "unlisted";
                midi_file_path: string;
                render_configuration: Record<string, any>;
                description?: string | undefined;
                genre?: string | undefined;
                audio_file_path?: string | undefined;
                user_video_path?: string | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("../types/auth").Project>;
        update: import("@trpc/server").BuildProcedure<"mutation", {
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
                id: string;
                name?: string | undefined;
                description?: string | undefined;
                genre?: string | undefined;
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
                genre?: string | undefined;
                privacy_setting?: "public" | "private" | "unlisted" | undefined;
                audio_file_path?: string | undefined;
                user_video_path?: string | undefined;
                render_configuration?: Record<string, any> | undefined;
                thumbnail_url?: string | undefined;
                primary_midi_file_id?: string | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("../types/auth").Project>;
        delete: import("@trpc/server").BuildProcedure<"mutation", {
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
                id: string;
            };
            _input_out: {
                id: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            success: boolean;
            deletedProject: import("../types/auth").Project;
        }>;
        search: import("@trpc/server").BuildProcedure<"query", {
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
                query?: string | undefined;
                limit?: number | undefined;
                offset?: number | undefined;
                genre?: string | undefined;
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
                genre?: string | undefined;
                privacy_setting?: "public" | "private" | "unlisted" | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, any>;
        duplicate: import("@trpc/server").BuildProcedure<"mutation", {
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
        }, import("../types/auth").Project>;
        share: import("@trpc/server").BuildProcedure<"mutation", {
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
        }, import("../types/auth").ProjectShare>;
        getShared: import("@trpc/server").BuildProcedure<"query", {
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
                share_token: string;
            };
            _input_out: {
                share_token: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            project: import("../types/auth").Project;
            share_info: {
                access_type: any;
                view_count: any;
            };
        }>;
        addCollaborator: import("@trpc/server").BuildProcedure<"mutation", {
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
        }, import("../types/auth").ProjectCollaborator>;
        updateCollaborator: import("@trpc/server").BuildProcedure<"mutation", {
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
                user_id: string;
                project_id: string;
                role: "owner" | "editor" | "viewer";
            };
            _input_out: {
                user_id: string;
                project_id: string;
                role: "owner" | "editor" | "viewer";
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("../types/auth").ProjectCollaborator>;
        removeCollaborator: import("@trpc/server").BuildProcedure<"mutation", {
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
            removedCollaborator: import("../types/auth").ProjectCollaborator;
        }>;
        auditLogs: import("@trpc/server").BuildProcedure<"query", {
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
    midi: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
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
            data: import("../types/midi").MIDIData;
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
            midiData: import("../types/midi").MIDIData;
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
            };
            _input_out: {
                status: "completed" | "failed" | "all" | "pending";
                limit: number;
                offset: number;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            files: any;
            hasMore: boolean;
        }>;
    }>;
}>;
export type AppRouter = typeof appRouter;
//# sourceMappingURL=index.d.ts.map