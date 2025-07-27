import { z } from 'zod'

// Import our comprehensive type definitions
export * from './audio'
export * from './visualization'
export {
  PerformanceMetrics,
  DetailedPerformanceMetrics,
  PerformanceAlert,
  OptimizationRecommendation,
  PerformanceMonitorConfig,
  DeviceCapabilities,
  PerformanceHistory,
  PerformanceAnalysis,
  OptimizationStrategy,
  PerformanceTest,
  PerformanceTestResult,
  RealTimeMonitor,
  isPerformanceMetrics,
  isPerformanceAlert,
  isDeviceCapabilities,
  isOptimizationRecommendation
} from './performance'

// Export all type guards from type-guards.ts (excluding duplicates already exported from performance)
export {
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isStemType,
  isAudioFeature,
  isExtendedAudioFeature,
  isAudioMarker,
  isStemMetadata,
  isStemAnalysisData,
  isAudioFeatureData,
  isCachedStemAnalysis,
  isAudioAnalysisData,
  isMIDINote,
  isLiveMIDIData,
  isDetailedPerformanceMetrics,
  validateAndTransform,
  safeValidate,
  createArrayValidator,
  createOptionalValidator,
  assertType,
  isValidEnum
} from './type-guards'

// ===== RENDER CONFIGURATION SCHEMA =====
const renderConfigurationSchema = z.object({
  resolution: z.object({
    width: z.number().min(1).max(7680),
    height: z.number().min(1).max(4320),
  }).optional(),
  frameRate: z.number().min(1).max(120).optional(),
  quality: z.enum(['draft', 'preview', 'high', 'ultra']).optional(),
  effects: z.array(z.string()).optional(),
  colorScheme: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
  }).optional(),
  audioSync: z.boolean().optional(),
  duration: z.number().min(0).optional(),
}).default({})

// ===== RENDER CONFIGURATION TYPES =====
export interface RenderConfiguration {
  resolution?: {
    width: number
    height: number
  }
  frameRate?: number
  quality?: 'draft' | 'preview' | 'high' | 'ultra'
  effects?: string[]
  colorScheme?: {
    primary: string
    secondary: string
    accent: string
  }
  audioSync?: boolean
  duration?: number
}

// ===== VALIDATION SCHEMAS =====
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  privacy_setting: z.enum(['private', 'unlisted', 'public']).default('private'),
  midi_file_path: z.string().optional(),
  audio_file_path: z.string().optional(),
  user_video_path: z.string().optional(),
  render_configuration: renderConfigurationSchema,
})

export const updateProjectSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  privacy_setting: z.enum(['private', 'unlisted', 'public']).optional(),
  thumbnail_url: z.string().url('Invalid thumbnail URL').optional(),
  primary_midi_file_id: z.string().uuid('Invalid file ID').optional(),
  audio_file_path: z.string().optional(),
  user_video_path: z.string().optional(),
  render_configuration: renderConfigurationSchema.optional(),
})

export const loginCredentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signupCredentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').optional(),
})

// ===== CORE USER TYPES =====
export interface User {
  id: string // UUID from Supabase auth.users
  email: string
  user_metadata: {
    name?: string
    avatar_url?: string
    provider?: string
  }
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

// Normalized User interface for internal API use
export interface NormalizedUser {
  id: string
  email: string
  name?: string
  image?: string
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  notifications: {
    email: boolean
    push: boolean
    marketing: boolean
  }
  visualization: {
    defaultQuality: 'draft' | 'preview' | 'high' | 'ultra'
    autoPlay: boolean
    showFPS: boolean
  }
  audio: {
    defaultVolume: number
    enableSpatialAudio: boolean
    bufferSize: number
  }
}

export interface UserProfile {
  id: string // UUID from auth.users
  display_name?: string
  avatar_url?: string
  bio?: string
  preferences: UserPreferences
  subscription_tier: 'free' | 'premium' | 'enterprise'
  created_at: string
  updated_at: string
}

export interface UserWithProfile extends User {
  profile: UserProfile
}

// ===== PROJECT TYPES =====
export interface Project {
  id: string
  name: string
  user_id: string // UUID from auth.users
  midi_file_path: string
  audio_file_path?: string
  user_video_path?: string
  render_configuration: RenderConfiguration
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

export interface ProjectWithCollaborators extends Project {
  collaborators: ProjectCollaborator[]
}

export interface ProjectExtended extends Project {
  // Computed fields
  file_count?: number
  total_file_size?: number
  last_accessed?: string
}

// ===== AUTHENTICATION TYPES =====
export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  email: string
  password: string
  name?: string
}

export interface AuthProvider {
  provider: 'google' | 'github' | 'discord'
  redirectTo?: string
}

export interface AuthError {
  message: string
  code?: string
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: string
  user: User
}

export interface SupabaseClient {
  auth: {
    signIn: (credentials: any) => Promise<any>
    signOut: () => Promise<any>
    getUser: () => Promise<any>
    onAuthStateChange: (callback: (event: string, session: AuthSession | null) => void) => any
  }
  from: (table: string) => any
  storage: any
}

export interface AuthContext {
  user: User | null
  session: AuthSession | null
  supabase: SupabaseClient
}

// ===== AUDIT & SYSTEM TYPES =====
export interface AuditLogMetadata {
  oldValue?: unknown
  newValue?: unknown
  changes?: Record<string, { from: unknown; to: unknown }>
  context?: {
    userAgent?: string
    ipAddress?: string
    sessionId?: string
    requestId?: string
  }
  additionalData?: Record<string, unknown>
}

export interface AuditLog {
  id: string
  user_id?: string // UUID from auth.users
  action: string
  resource_type: string
  resource_id?: string
  metadata: AuditLogMetadata
  ip_address?: string
  user_agent?: string
  created_at: string
}

// ===== SUPABASE INTEGRATION TYPES =====
interface SupabaseUser {
  id: string
  email?: string
  user_metadata?: {
    name?: string
    avatar_url?: string
  }
  created_at?: string
  updated_at?: string
}

// Helper to convert Supabase user to our User type
export function transformSupabaseUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    user_metadata: supabaseUser.user_metadata || {},
    created_at: supabaseUser.created_at || '',
    updated_at: supabaseUser.updated_at || '',
  }
}

// Helper to convert User to NormalizedUser for API use
export function normalizeUser(user: User): NormalizedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name,
    image: user.user_metadata?.avatar_url,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}

// ===== INFERRED TYPES FROM SCHEMAS =====
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type LoginCredentialsInput = z.infer<typeof loginCredentialsSchema>
export type SignupCredentialsInput = z.infer<typeof signupCredentialsSchema>