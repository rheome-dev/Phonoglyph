import type { User as SupabaseUser } from '@supabase/supabase-js';
export interface User {
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
export interface Project {
    id: string;
    name: string;
    user_id: string;
    midi_file_path: string;
    audio_file_path?: string;
    user_video_path?: string;
    render_configuration: Record<string, any>;
    description?: string;
    genre?: string;
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
export interface ProjectWithCollaborators extends Project {
    collaborators: ProjectCollaborator[];
}
export interface ProjectExtended extends Project {
    file_count?: number;
    total_file_size?: number;
    last_accessed?: string;
}
export interface UserWithProfile extends User {
    profile: UserProfile;
}
export interface AuthContext {
    user: User | null;
    session: any | null;
    supabase: any;
}
export declare function transformSupabaseUser(supabaseUser: SupabaseUser): User;
//# sourceMappingURL=auth.d.ts.map