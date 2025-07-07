import { z } from 'zod';
import { router, protectedProcedure, flexibleProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import type { Project, ProjectCollaborator, ProjectWithCollaborators, ProjectShare } from '../types/auth';

// Input validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  privacy_setting: z.enum(['private', 'unlisted', 'public']).default('private'),
  midi_file_path: z.string().optional(),
  audio_file_path: z.string().optional(),
  user_video_path: z.string().optional(),
  render_configuration: z.record(z.any()).default({}),
});

const updateProjectSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  privacy_setting: z.enum(['private', 'unlisted', 'public']).optional(),
  thumbnail_url: z.string().url('Invalid thumbnail URL').optional(),
  primary_midi_file_id: z.string().uuid('Invalid file ID').optional(),
  audio_file_path: z.string().optional(),
  user_video_path: z.string().optional(),
  render_configuration: z.record(z.any()).optional(),
});

const projectIdSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
});

// Additional validation schemas for new endpoints
const projectSearchSchema = z.object({
  query: z.string().optional(),
  privacy_setting: z.enum(['private', 'unlisted', 'public']).optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'name']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

const projectShareSchema = z.object({
  project_id: z.string().min(1, 'Project ID is required'),
  access_type: z.enum(['view', 'embed']).default('view'),
  expires_at: z.string().datetime().optional(),
});

const getSharedProjectSchema = z.object({
  share_token: z.string().min(1, 'Share token is required'),
});

const duplicateProjectSchema = z.object({
  project_id: z.string().min(1, 'Project ID is required'),
  new_name: z.string().min(1, 'New project name is required').max(100, 'Project name too long'),
  copy_files: z.boolean().default(true),
});

const addCollaboratorSchema = z.object({
  project_id: z.string().min(1, 'Project ID is required'),
  user_id: z.string().uuid('Invalid user ID'),
  role: z.enum(['editor', 'viewer']),
});

const updateCollaboratorSchema = z.object({
  project_id: z.string().min(1, 'Project ID is required'),
  user_id: z.string().uuid('Invalid user ID'),
  role: z.enum(['owner', 'editor', 'viewer']),
});

export const projectRouter = router({
  // Get all projects for the authenticated user
  list: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // RLS automatically filters projects based on user access
        const { data: projects, error } = await ctx.supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Database error fetching projects:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch projects',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.list',
          p_resource_type: 'project',
          p_metadata: { count: projects?.length || 0 },
        });

        return projects as Project[];
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch projects',
        });
      }
    }),

  // Get a specific project by ID
  get: protectedProcedure
    .input(projectIdSchema)
    .query(async ({ input, ctx }) => {
      try {
        // RLS automatically filters based on user access
        const { data: project, error } = await ctx.supabase
          .from('projects')
          .select('*')
          .eq('id', input.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Project not found or access denied',
            });
          }
          console.error('Database error fetching project:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch project',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.get',
          p_resource_type: 'project',
          p_resource_id: input.id,
        });

        return project as Project;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error fetching project:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch project',
        });
      }
    }),

  // Create a new project
  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const { data: project, error } = await ctx.supabase
          .from('projects')
          .insert({
            id: projectId,
            name: input.name,
            description: input.description,
            privacy_setting: input.privacy_setting,
            user_id: ctx.user.id,
            midi_file_path: input.midi_file_path,
            audio_file_path: input.audio_file_path,
            user_video_path: input.user_video_path,
            render_configuration: input.render_configuration,
          })
          .select()
          .single();

        if (error) {
          console.error('Database error creating project:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create project',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.create',
          p_resource_type: 'project',
          p_resource_id: project.id,
          p_metadata: { name: input.name },
        });

        return project as Project;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error creating project:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create project',
        });
      }
    }),

  // Update an existing project
  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, ...updateData } = input;

        const { data: project, error } = await ctx.supabase
          .from('projects')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Project not found or access denied',
            });
          }
          console.error('Database error updating project:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update project',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.update',
          p_resource_type: 'project',
          p_resource_id: id,
          p_metadata: updateData,
        });

        return project as Project;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error updating project:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update project',
        });
      }
    }),

  // Delete a project
  delete: protectedProcedure
    .input(projectIdSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { data: project, error } = await ctx.supabase
          .from('projects')
          .delete()
          .eq('id', input.id)
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Project not found or access denied',
            });
          }
          console.error('Database error deleting project:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete project',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.delete',
          p_resource_type: 'project',
          p_resource_id: input.id,
          p_metadata: { name: project.name },
        });

        return { success: true, deletedProject: project as Project };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error deleting project:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete project',
        });
      }
    }),

  // Search projects with filtering
  search: protectedProcedure
    .input(projectSearchSchema)
    .query(async ({ input, ctx }) => {
      try {
        let query = ctx.supabase
          .from('projects')
          .select(`
            *,
            file_metadata!project_id (
              id,
              file_size
            )
          `)
          .eq('user_id', ctx.user.id);

        // Apply filters
        if (input.query) {
          query = query.ilike('name', `%${input.query}%`);
        }
        if (input.privacy_setting) {
          query = query.eq('privacy_setting', input.privacy_setting);
        }

        // Apply sorting
        query = query.order(input.sort_by, { ascending: input.sort_order === 'asc' });

        // Apply pagination
        query = query.range(input.offset, input.offset + input.limit - 1);

        const { data: projects, error } = await query;

        if (error) {
          console.error('Database error searching projects:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to search projects',
          });
        }

        // Compute additional fields
        const projectsWithMetadata = projects?.map((project: any) => ({
          ...project,
          file_count: project.file_metadata?.length || 0,
          total_file_size: project.file_metadata?.reduce((sum: number, file: any) => sum + (file.file_size || 0), 0) || 0,
        })) || [];

        return projectsWithMetadata;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error searching projects:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search projects',
        });
      }
    }),

  // Duplicate a project
  duplicate: protectedProcedure
    .input(duplicateProjectSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // First get the original project
        const { data: originalProject, error: fetchError } = await ctx.supabase
          .from('projects')
          .select('*')
          .eq('id', input.project_id)
          .eq('user_id', ctx.user.id)
          .single();

        if (fetchError || !originalProject) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          });
        }

        const newProjectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create duplicate project
        const { data: newProject, error: createError } = await ctx.supabase
          .from('projects')
          .insert({
            id: newProjectId,
            name: input.new_name,
            description: originalProject.description,
            privacy_setting: 'private', // Always start as private
            user_id: ctx.user.id,
            midi_file_path: originalProject.midi_file_path,
            audio_file_path: originalProject.audio_file_path,
            user_video_path: originalProject.user_video_path,
            render_configuration: originalProject.render_configuration,
          })
          .select()
          .single();

        if (createError) {
          console.error('Database error duplicating project:', createError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to duplicate project',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.duplicate',
          p_resource_type: 'project',
          p_resource_id: newProject.id,
          p_metadata: { original_project_id: input.project_id, new_name: input.new_name },
        });

        return newProject as Project;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error duplicating project:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to duplicate project',
        });
      }
    }),

  // Create project share
  share: protectedProcedure
    .input(projectShareSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify project ownership
        const { data: project, error: fetchError } = await ctx.supabase
          .from('projects')
          .select('*')
          .eq('id', input.project_id)
          .eq('user_id', ctx.user.id)
          .single();

        if (fetchError || !project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          });
        }

        // Generate unique share token
        const shareToken = `share_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

        const { data: share, error: createError } = await ctx.supabase
          .from('project_shares')
          .insert({
            project_id: input.project_id,
            share_token: shareToken,
            access_type: input.access_type,
            expires_at: input.expires_at,
          })
          .select()
          .single();

        if (createError) {
          console.error('Database error creating project share:', createError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create project share',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.share',
          p_resource_type: 'project',
          p_resource_id: input.project_id,
          p_metadata: { access_type: input.access_type, share_token: shareToken },
        });

        return share as ProjectShare;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error creating project share:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create project share',
        });
      }
    }),

  // Get shared project (public access)
  getShared: flexibleProcedure
    .input(getSharedProjectSchema)
    .query(async ({ input, ctx }) => {
      try {
        // Get project via share token
        const { data: share, error: shareError } = await ctx.supabase
          .from('project_shares')
          .select(`
            *,
            projects (*)
          `)
          .eq('share_token', input.share_token)
          .single();

        if (shareError || !share || !share.projects) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Shared project not found or expired',
          });
        }

        // Check if share has expired
        if (share.expires_at && new Date(share.expires_at) < new Date()) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Share link has expired',
          });
        }

        // Increment view count
        await ctx.supabase
          .from('project_shares')
          .update({ view_count: share.view_count + 1 })
          .eq('id', share.id);

        return {
          project: share.projects as Project,
          share_info: {
            access_type: share.access_type,
            view_count: share.view_count + 1,
          }
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error fetching shared project:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch shared project',
        });
      }
    }),

  // Add a collaborator to a project
  addCollaborator: protectedProcedure
    .input(addCollaboratorSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user can manage this project (owner only)
        const { data: canAccess } = await ctx.supabase
          .rpc('user_can_access_project', {
            p_project_id: input.project_id,
            p_user_id: ctx.user.id,
          });

        if (!canAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to manage this project',
          });
        }

        const { data: collaborator, error } = await ctx.supabase
          .from('project_collaborators')
          .insert({
            project_id: input.project_id,
            user_id: input.user_id,
            role: input.role,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'User is already a collaborator on this project',
            });
          }
          console.error('Database error adding collaborator:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to add collaborator',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.add_collaborator',
          p_resource_type: 'project',
          p_resource_id: input.project_id,
          p_metadata: { collaborator_id: input.user_id, role: input.role },
        });

        return collaborator as ProjectCollaborator;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error adding collaborator:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add collaborator',
        });
      }
    }),

  // Update collaborator role
  updateCollaborator: protectedProcedure
    .input(updateCollaboratorSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { data: collaborator, error } = await ctx.supabase
          .from('project_collaborators')
          .update({ role: input.role })
          .eq('project_id', input.project_id)
          .eq('user_id', input.user_id)
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Collaborator not found or access denied',
            });
          }
          console.error('Database error updating collaborator:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update collaborator',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.update_collaborator',
          p_resource_type: 'project',
          p_resource_id: input.project_id,
          p_metadata: { collaborator_id: input.user_id, new_role: input.role },
        });

        return collaborator as ProjectCollaborator;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error updating collaborator:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update collaborator',
        });
      }
    }),

  // Remove collaborator from project
  removeCollaborator: protectedProcedure
    .input(z.object({
      project_id: z.string().min(1, 'Project ID is required'),
      user_id: z.string().uuid('Invalid user ID'),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { data: collaborator, error } = await ctx.supabase
          .from('project_collaborators')
          .delete()
          .eq('project_id', input.project_id)
          .eq('user_id', input.user_id)
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Collaborator not found or access denied',
            });
          }
          console.error('Database error removing collaborator:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to remove collaborator',
          });
        }

        // Log audit event
        await ctx.supabase.rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.remove_collaborator',
          p_resource_type: 'project',
          p_resource_id: input.project_id,
          p_metadata: { collaborator_id: input.user_id },
        });

        return { success: true, removedCollaborator: collaborator as ProjectCollaborator };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error removing collaborator:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove collaborator',
        });
      }
    }),

  // Get audit logs for projects owned by the user
  auditLogs: protectedProcedure
    .input(z.object({
      project_id: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      try {
        let query = ctx.supabase
          .from('audit_logs')
          .select('*')
          .eq('user_id', ctx.user.id)
          .eq('resource_type', 'project')
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.project_id) {
          query = query.eq('resource_id', input.project_id);
        }

        const { data: logs, error } = await query;

        if (error) {
          console.error('Database error fetching audit logs:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch audit logs',
          });
        }

        return logs || [];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error fetching audit logs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch audit logs',
        });
      }
    }),
}); 