import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  name?: string
  image?: string
  created_at: string
  updated_at: string
}

// New database models
export interface UserProfile {
  id: string // UUID from auth.users
  display_name?: string
  avatar_url?: string
  bio?: string
  preferences: Record<string, any>
  subscription_tier: 'free' | 'premium' | 'enterprise'
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  user_id: string // UUID from auth.users
  midi_file_path: string
  audio_file_path?: string
  user_video_path?: string
  render_configuration: Record<string, any>
  description?: string
  privacy_setting: 'private' | 'unlisted' | 'public'
  thumbnail_url?: string
  primary_midi_file_id?: string
  created_at: string
  updated_at: string
}

export interface ProjectCollaborator {
  id: string
  project_id: string
  user_id: string // UUID from auth.users
  role: 'owner' | 'editor' | 'viewer'
  created_at: string
}

export interface ProjectShare {
  id: string
  project_id: string
  share_token: string // unique URL token
  access_type: 'view' | 'embed'
  expires_at?: string
  view_count: number
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id?: string // UUID from auth.users
  action: string
  resource_type: string
  resource_id?: string
  metadata: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Utility types for API responses
export interface ProjectWithCollaborators extends Project {
  collaborators: ProjectCollaborator[]
}

export interface ProjectExtended extends Project {
  // Computed fields
  file_count?: number
  total_file_size?: number
  last_accessed?: string
}

export interface UserWithProfile extends User {
  profile: UserProfile
}

export interface AuthContext {
  user: User | null
  session: any | null
  supabase: any
}

// Helper to convert Supabase user to our User type
export function transformSupabaseUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.name,
    image: supabaseUser.user_metadata?.avatar_url,
    created_at: supabaseUser.created_at || '',
    updated_at: supabaseUser.updated_at || '',
  }
} 