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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User | null;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
                session: any;
                supabase: any;
                isGuest: boolean;
            };
            _input_in: {
                project_id: string;
                expires_at?: string | undefined;
                access_type?: "view" | "embed" | undefined;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
                session: any;
                supabase: any;
                isGuest: boolean;
            };
            _input_in: {
                fileName: string;
                fileSize: number;
                mimeType: string;
                projectId?: string | undefined;
                isMaster?: boolean | undefined;
                stemType?: string | undefined;
            };
            _input_out: {
                fileName: string;
                fileSize: number;
                mimeType: string;
                projectId?: string | undefined;
                isMaster?: boolean | undefined;
                stemType?: string | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            fileId: `${string}-${string}-${string}-${string}-${string}`;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                projectId?: string | undefined;
                isMaster?: boolean | undefined;
                stemType?: string | undefined;
            };
            _input_out: {
                fileName: string;
                fileSize: number;
                mimeType: string;
                fileType: "midi" | "audio" | "video" | "image";
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
                session: any;
                supabase: any;
                isGuest: boolean;
            };
            _input_in: {
                limit?: number | undefined;
                offset?: number | undefined;
                projectId?: string | undefined;
                fileType?: "midi" | "audio" | "video" | "image" | "all" | undefined;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
        getDownloadUrls: import("@trpc/server").BuildProcedure<"mutation", {
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
                session: any;
                supabase: any;
                isGuest: boolean;
            };
            _input_in: {
                fileIds: string[];
            };
            _input_out: {
                fileIds: string[];
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, Record<string, {
            downloadUrl: string;
            fileName: string;
            fileSize: number;
            fileType: string;
        }>>;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                usageStatus?: "active" | "referenced" | "unused" | "all" | undefined;
                folderId?: string | undefined;
                tagIds?: string[] | undefined;
            };
            _input_out: {
                limit: number;
                offset: number;
                projectId: string;
                assetType: "midi" | "audio" | "video" | "image" | "all";
                usageStatus: "active" | "referenced" | "unused" | "all";
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
    asset: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("phonoglyph-types").AuthContext & {
            req: any;
            res: any;
            isGuest: boolean;
        };
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        createCollection: import("@trpc/server").BuildProcedure<"mutation", {
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
                session: any;
                supabase: any;
                isGuest: boolean;
            };
            _input_in: {
                name: string;
                projectId: string;
                type?: "image_slideshow" | "generic" | undefined;
            };
            _input_out: {
                type: "image_slideshow" | "generic";
                name: string;
                projectId: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, any>;
        addFileToCollection: import("@trpc/server").BuildProcedure<"mutation", {
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
                session: any;
                supabase: any;
                isGuest: boolean;
            };
            _input_in: {
                fileId: string;
                collectionId: string;
            };
            _input_out: {
                fileId: string;
                collectionId: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, any>;
        getCollection: import("@trpc/server").BuildProcedure<"query", {
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
                session: any;
                supabase: any;
                isGuest: boolean;
            };
            _input_in: {
                collectionId: string;
            };
            _input_out: {
                collectionId: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, any>;
        getProjectCollections: import("@trpc/server").BuildProcedure<"query", {
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                    bpm?: number | undefined;
                };
                stemType: string;
                analysisData: Record<string, number | number[] | {
                    type: string;
                    time: number;
                    intensity: number;
                }[] | Record<string, {
                    originalMin: number;
                    originalMax: number;
                    wasNormalized: boolean;
                }>>;
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
                    bpm?: number | undefined;
                };
                stemType: string;
                analysisData: Record<string, number | number[] | {
                    type: string;
                    time: number;
                    intensity: number;
                }[] | Record<string, {
                    originalMin: number;
                    originalMax: number;
                    wasNormalized: boolean;
                }>>;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
    audioAnalysisSandbox: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
                session: any;
                supabase: any;
                isGuest: boolean;
            };
            _input_in: {
                id: string;
                metadata: {
                    sampleRate: number;
                    duration: number;
                    bufferSize: number;
                    featuresExtracted: string[];
                    analysisDuration: number;
                };
                stemType: string;
                analysisData: {
                    metadata: {
                        sampleRate: number;
                        duration: number;
                        bufferSize: number;
                        analysisParams?: any;
                    };
                    rms: {
                        time: number;
                        value: number;
                    }[];
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
                    waveform: number[];
                };
                fileMetadataId: string;
                waveformData: {
                    sampleRate: number;
                    points: number[];
                    duration: number;
                    markers: any[];
                };
            };
            _input_out: {
                id: string;
                metadata: {
                    sampleRate: number;
                    duration: number;
                    bufferSize: number;
                    featuresExtracted: string[];
                    analysisDuration: number;
                };
                stemType: string;
                analysisData: {
                    metadata: {
                        sampleRate: number;
                        duration: number;
                        bufferSize: number;
                        analysisParams?: any;
                    };
                    rms: {
                        time: number;
                        value: number;
                    }[];
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
                    waveform: number[];
                };
                fileMetadataId: string;
                waveformData: {
                    sampleRate: number;
                    points: number[];
                    duration: number;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
    render: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("phonoglyph-types").AuthContext & {
            req: any;
            res: any;
            isGuest: boolean;
        };
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        triggerRender: import("@trpc/server").BuildProcedure<"mutation", {
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
                session: any;
                supabase: any;
                isGuest: boolean;
            };
            _input_in: {
                layers: {
                    id: string;
                    type: string;
                    name: string;
                    duration: number;
                    blendMode: "multiply" | "normal" | "screen" | "overlay";
                    position: {
                        x: number;
                        y: number;
                    };
                    scale: {
                        x: number;
                        y: number;
                    };
                    rotation: number;
                    opacity: number;
                    audioBindings: {
                        feature: string;
                        inputRange: [number, number];
                        outputRange: [number, number];
                        blendMode: "replace" | "add" | "multiply";
                        modulationAmount?: number | undefined;
                    }[];
                    midiBindings: {
                        inputRange: [number, number];
                        outputRange: [number, number];
                        blendMode: "replace" | "add" | "multiply";
                        source: "velocity" | "cc" | "pitchBend" | "channelPressure";
                    }[];
                    zIndex: number;
                    startTime: number;
                    endTime: number;
                    settings?: any;
                    isDeletable?: boolean | undefined;
                    src?: string | undefined;
                    effectType?: string | undefined;
                }[];
                audioAnalysisData: {
                    id: string;
                    metadata: {
                        sampleRate: number;
                        duration: number;
                        bufferSize: number;
                        featuresExtracted: string[];
                        analysisDuration: number;
                        bpm?: number | undefined;
                    };
                    stemType: string;
                    analysisData: {
                        bass?: any;
                        rms?: any;
                        spectralCentroid?: any;
                        spectralRolloff?: any;
                        spectralFlatness?: any;
                        zcr?: any;
                        loudness?: any;
                        markers?: any;
                        bpm?: number | undefined;
                        transients?: any[] | undefined;
                        chroma?: any[] | undefined;
                        frameTimes?: any;
                        fft?: any;
                        fftFrequencies?: any;
                        amplitudeSpectrum?: any;
                        volume?: any;
                        mid?: any;
                        treble?: any;
                        features?: any;
                        frequencies?: any;
                        timeData?: any;
                        stereoWindow_left?: any;
                        stereoWindow_right?: any;
                    };
                    fileMetadataId: string;
                    waveformData: {
                        sampleRate: number;
                        points: number[];
                        duration: number;
                        markers?: any[] | undefined;
                    };
                    bpm?: number | undefined;
                }[];
                visualizationSettings: {
                    colorScheme?: string | undefined;
                    pixelsPerSecond?: number | undefined;
                    showTrackLabels?: boolean | undefined;
                    showVelocity?: boolean | undefined;
                    minKey?: number | undefined;
                    maxKey?: number | undefined;
                    aspectRatio?: string | undefined;
                };
                masterAudioUrl: string;
                mappings?: Record<string, {
                    modulationAmount: number;
                    featureId: string | null;
                }> | undefined;
                baseParameterValues?: Record<string, Record<string, any>> | undefined;
                featureDecayTimes?: Record<string, number> | undefined;
                featureSensitivities?: Record<string, number> | undefined;
                backgroundColor?: string | undefined;
                isBackgroundVisible?: boolean | undefined;
            };
            _input_out: {
                layers: {
                    id: string;
                    type: string;
                    name: string;
                    duration: number;
                    blendMode: "multiply" | "normal" | "screen" | "overlay";
                    position: {
                        x: number;
                        y: number;
                    };
                    scale: {
                        x: number;
                        y: number;
                    };
                    rotation: number;
                    opacity: number;
                    audioBindings: {
                        feature: string;
                        inputRange: [number, number];
                        outputRange: [number, number];
                        blendMode: "replace" | "add" | "multiply";
                        modulationAmount?: number | undefined;
                    }[];
                    midiBindings: {
                        inputRange: [number, number];
                        outputRange: [number, number];
                        blendMode: "replace" | "add" | "multiply";
                        source: "velocity" | "cc" | "pitchBend" | "channelPressure";
                    }[];
                    zIndex: number;
                    startTime: number;
                    endTime: number;
                    settings?: any;
                    isDeletable?: boolean | undefined;
                    src?: string | undefined;
                    effectType?: string | undefined;
                }[];
                audioAnalysisData: {
                    id: string;
                    metadata: {
                        sampleRate: number;
                        duration: number;
                        bufferSize: number;
                        featuresExtracted: string[];
                        analysisDuration: number;
                        bpm?: number | undefined;
                    };
                    stemType: string;
                    analysisData: {
                        bass?: any;
                        rms?: any;
                        spectralCentroid?: any;
                        spectralRolloff?: any;
                        spectralFlatness?: any;
                        zcr?: any;
                        loudness?: any;
                        markers?: any;
                        bpm?: number | undefined;
                        transients?: any[] | undefined;
                        chroma?: any[] | undefined;
                        frameTimes?: any;
                        fft?: any;
                        fftFrequencies?: any;
                        amplitudeSpectrum?: any;
                        volume?: any;
                        mid?: any;
                        treble?: any;
                        features?: any;
                        frequencies?: any;
                        timeData?: any;
                        stereoWindow_left?: any;
                        stereoWindow_right?: any;
                    };
                    fileMetadataId: string;
                    waveformData: {
                        sampleRate: number;
                        points: number[];
                        duration: number;
                        markers?: any[] | undefined;
                    };
                    bpm?: number | undefined;
                }[];
                visualizationSettings: {
                    colorScheme?: string | undefined;
                    pixelsPerSecond?: number | undefined;
                    showTrackLabels?: boolean | undefined;
                    showVelocity?: boolean | undefined;
                    minKey?: number | undefined;
                    maxKey?: number | undefined;
                    aspectRatio?: string | undefined;
                };
                masterAudioUrl: string;
                mappings?: Record<string, {
                    modulationAmount: number;
                    featureId: string | null;
                }> | undefined;
                baseParameterValues?: Record<string, Record<string, any>> | undefined;
                featureDecayTimes?: Record<string, number> | undefined;
                featureSensitivities?: Record<string, number> | undefined;
                backgroundColor?: string | undefined;
                isBackgroundVisible?: boolean | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            renderId: string;
            bucketName: string;
            functionName: string;
            cloudWatchLogs: any;
        }>;
        getRenderStatus: import("@trpc/server").BuildProcedure<"mutation", {
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
                session: any;
                supabase: any;
                isGuest: boolean;
            };
            _input_in: {
                renderId: string;
                bucketName: string;
                functionName: string;
            };
            _input_out: {
                renderId: string;
                bucketName: string;
                functionName: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("@remotion/lambda").RenderProgress>;
    }>;
    apiKey: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("phonoglyph-types").AuthContext & {
            req: any;
            res: any;
            isGuest: boolean;
        };
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
                session: any;
                supabase: any;
                isGuest: boolean;
            };
            _input_in: {
                name: string;
                scopes?: ("read" | "write" | "render")[] | undefined;
                expiresAt?: string | undefined;
            };
            _input_out: {
                scopes: ("read" | "write" | "render")[];
                name: string;
                expiresAt?: string | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            user_id: string;
            name: string;
            key_prefix: string;
            scopes: string[];
            last_used_at: string | null;
            expires_at: string | null;
            revoked_at: string | null;
            created_at: string;
            key: string;
        }>;
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
                session: any;
                supabase: any;
                isGuest: boolean;
            };
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, import("../services/api-key").ApiKeyRecord[]>;
        revoke: import("@trpc/server").BuildProcedure<"mutation", {
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
                user: import("phonoglyph-types").User;
                req: any;
                res: any;
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
        }>;
    }>;
}>;
export type AppRouter = typeof appRouter;
//# sourceMappingURL=index.d.ts.map