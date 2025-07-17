import { z } from 'zod'

// Shared validation schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  privacy_setting: z.enum(['private', 'unlisted', 'public']).default('private'),
  midi_file_path: z.string().optional(),
  audio_file_path: z.string().optional(),
  user_video_path: z.string().optional(),
  render_configuration: z.record(z.any()).default({}),
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
  render_configuration: z.record(z.any()).optional(),
})

// Shared type definitions
export interface User {
  id: string
  email: string
  name?: string
  image?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  user_id: string
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

// Export inferred types
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>