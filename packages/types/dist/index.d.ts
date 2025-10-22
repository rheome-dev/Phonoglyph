import { z } from 'zod';
export declare const createProjectSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    privacy_setting: z.ZodDefault<z.ZodEnum<["private", "unlisted", "public"]>>;
    midi_file_path: z.ZodOptional<z.ZodString>;
    audio_file_path: z.ZodOptional<z.ZodString>;
    user_video_path: z.ZodOptional<z.ZodString>;
    render_configuration: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    privacy_setting: "private" | "unlisted" | "public";
    render_configuration: Record<string, any>;
    description?: string | undefined;
    midi_file_path?: string | undefined;
    audio_file_path?: string | undefined;
    user_video_path?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    privacy_setting?: "private" | "unlisted" | "public" | undefined;
    midi_file_path?: string | undefined;
    audio_file_path?: string | undefined;
    user_video_path?: string | undefined;
    render_configuration?: Record<string, any> | undefined;
}>;
export declare const updateProjectSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    privacy_setting: z.ZodOptional<z.ZodEnum<["private", "unlisted", "public"]>>;
    thumbnail_url: z.ZodOptional<z.ZodString>;
    primary_midi_file_id: z.ZodOptional<z.ZodString>;
    audio_file_path: z.ZodOptional<z.ZodString>;
    user_video_path: z.ZodOptional<z.ZodString>;
    render_configuration: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name?: string | undefined;
    description?: string | undefined;
    privacy_setting?: "private" | "unlisted" | "public" | undefined;
    audio_file_path?: string | undefined;
    user_video_path?: string | undefined;
    render_configuration?: Record<string, any> | undefined;
    thumbnail_url?: string | undefined;
    primary_midi_file_id?: string | undefined;
}, {
    id: string;
    name?: string | undefined;
    description?: string | undefined;
    privacy_setting?: "private" | "unlisted" | "public" | undefined;
    audio_file_path?: string | undefined;
    user_video_path?: string | undefined;
    render_configuration?: Record<string, any> | undefined;
    thumbnail_url?: string | undefined;
    primary_midi_file_id?: string | undefined;
}>;
export declare const loginCredentialsSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const signupCredentialsSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name?: string | undefined;
}, {
    email: string;
    password: string;
    name?: string | undefined;
}>;
interface SupabaseUser {
    id: string;
    email?: string;
    user_metadata?: {
        name?: string;
        avatar_url?: string;
        provider?: string;
    };
    created_at?: string;
    updated_at?: string;
}
export interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
    created_at: string;
    updated_at: string;
}
export interface WebUser {
    id: string;
    email: string;
    user_metadata: {
        name?: string;
        avatar_url?: string;
        provider?: string;
    };
    created_at: string;
    updated_at: string;
}
export interface NormalizedUser {
    id: string;
    email: string;
    name?: string;
    image?: string;
    created_at: string;
    updated_at: string;
}
export interface UserProfile {
    id: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    preferences: Record<string, any>;
    subscription_tier: 'free' | 'premium' | 'enterprise';
    created_at: string;
    updated_at: string;
}
export interface UserWithProfile extends User {
    profile: UserProfile;
}
export interface Project {
    id: string;
    name: string;
    user_id: string;
    midi_file_path: string;
    audio_file_path?: string;
    user_video_path?: string;
    render_configuration: Record<string, any>;
    description?: string;
    privacy_setting: 'private' | 'unlisted' | 'public';
    thumbnail_url?: string;
    primary_midi_file_id?: string;
    created_at: string;
    updated_at: string;
}
export interface ProjectCollaborator {
    id: string;
    project_id: string;
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
    created_at: string;
}
export interface ProjectShare {
    id: string;
    project_id: string;
    share_token: string;
    access_type: 'view' | 'embed';
    expires_at?: string;
    view_count: number;
    created_at: string;
    updated_at: string;
}
export interface ProjectWithCollaborators extends Project {
    collaborators: ProjectCollaborator[];
}
export interface ProjectExtended extends Project {
    file_count?: number;
    total_file_size?: number;
    last_accessed?: string;
}
export interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
}
export interface LoginCredentials {
    email: string;
    password: string;
}
export interface SignupCredentials {
    email: string;
    password: string;
    name?: string;
}
export interface AuthProvider {
    provider: 'google' | 'github' | 'discord';
    redirectTo?: string;
}
export interface AuthError {
    message: string;
    code?: string;
}
export interface AuthContext {
    user: User | null;
    session: any | null;
    supabase: any;
}
export interface AuditLog {
    id: string;
    user_id?: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    metadata: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}
export interface MIDINote {
    id: string;
    track: number | string;
    channel: number;
    note: number;
    pitch: number;
    velocity: number;
    startTime: number;
    start: number;
    duration: number;
    name: string;
    noteName?: string;
}
export interface TempoEvent {
    tick: number;
    bpm: number;
    microsecondsPerQuarter: number;
}
export interface TempoChange {
    tick: number;
    bpm: number;
    microsecondsPerQuarter: number;
}
export interface MIDITrack {
    id: string;
    name: string;
    instrument: string;
    channel: number;
    notes: MIDINote[];
    color: string;
    visible?: boolean;
}
export interface MIDIData {
    file: {
        name: string;
        size: number;
        duration: number;
        ticksPerQuarter: number;
        timeSignature: [number, number];
        keySignature: string;
    };
    tracks: MIDITrack[];
    tempoChanges: TempoEvent[] | TempoChange[];
}
export interface MIDIParsingResult {
    success: boolean;
    data?: MIDIData;
    error?: string;
}
export interface VisualizationSettings {
    colorScheme: 'sage' | 'slate' | 'dusty-rose' | 'mixed';
    pixelsPerSecond: number;
    showTrackLabels: boolean;
    showVelocity: boolean;
    minKey: number;
    maxKey: number;
}
export declare const COLOR_SCHEMES: {
    readonly sage: "#84a98c";
    readonly slate: "#6b7c93";
    readonly 'dusty-rose': "#b08a8a";
    readonly mixed: readonly ["#84a98c", "#6b7c93", "#b08a8a", "#a8a29e", "#8da3b0"];
};
export declare const DEFAULT_VISUALIZATION_SETTINGS: VisualizationSettings;
export declare function transformSupabaseUser(supabaseUser: SupabaseUser): User;
export declare function normalizeUser(user: User): NormalizedUser;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type LoginCredentialsInput = z.infer<typeof loginCredentialsSchema>;
export type SignupCredentialsInput = z.infer<typeof signupCredentialsSchema>;
export {};
