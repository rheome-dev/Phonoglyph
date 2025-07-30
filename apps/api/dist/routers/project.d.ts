import type { Project, ProjectCollaborator, ProjectShare } from '../types/auth';
export declare const projectRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
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
    }, Project[]>;
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
    }, Project>;
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
            description?: string | undefined;
            privacy_setting?: "public" | "private" | "unlisted" | undefined;
            midi_file_path?: string | undefined;
            audio_file_path?: string | undefined;
            user_video_path?: string | undefined;
            render_configuration?: {
                colorScheme?: {
                    primary: string;
                    secondary: string;
                    accent: string;
                } | undefined;
                quality?: "high" | "ultra" | "draft" | "preview" | undefined;
                duration?: number | undefined;
                resolution?: {
                    width: number;
                    height: number;
                } | undefined;
                frameRate?: number | undefined;
                effects?: string[] | undefined;
                audioSync?: boolean | undefined;
            } | undefined;
        };
        _input_out: {
            name: string;
            privacy_setting: "public" | "private" | "unlisted";
            render_configuration: {
                colorScheme?: {
                    primary: string;
                    secondary: string;
                    accent: string;
                } | undefined;
                quality?: "high" | "ultra" | "draft" | "preview" | undefined;
                duration?: number | undefined;
                resolution?: {
                    width: number;
                    height: number;
                } | undefined;
                frameRate?: number | undefined;
                effects?: string[] | undefined;
                audioSync?: boolean | undefined;
            };
            description?: string | undefined;
            midi_file_path?: string | undefined;
            audio_file_path?: string | undefined;
            user_video_path?: string | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, Project>;
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
            privacy_setting?: "public" | "private" | "unlisted" | undefined;
            audio_file_path?: string | undefined;
            user_video_path?: string | undefined;
            render_configuration?: {
                colorScheme?: {
                    primary: string;
                    secondary: string;
                    accent: string;
                } | undefined;
                quality?: "high" | "ultra" | "draft" | "preview" | undefined;
                duration?: number | undefined;
                resolution?: {
                    width: number;
                    height: number;
                } | undefined;
                frameRate?: number | undefined;
                effects?: string[] | undefined;
                audioSync?: boolean | undefined;
            } | undefined;
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
            render_configuration?: {
                colorScheme?: {
                    primary: string;
                    secondary: string;
                    accent: string;
                } | undefined;
                quality?: "high" | "ultra" | "draft" | "preview" | undefined;
                duration?: number | undefined;
                resolution?: {
                    width: number;
                    height: number;
                } | undefined;
                frameRate?: number | undefined;
                effects?: string[] | undefined;
                audioSync?: boolean | undefined;
            } | undefined;
            thumbnail_url?: string | undefined;
            primary_midi_file_id?: string | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, Project>;
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
        deletedProject: Project;
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
    }, Project>;
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
    }, ProjectShare>;
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
        project: Project;
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
    }, ProjectCollaborator>;
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
    }, ProjectCollaborator>;
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
        removedCollaborator: ProjectCollaborator;
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
//# sourceMappingURL=project.d.ts.map