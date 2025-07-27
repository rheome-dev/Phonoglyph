import { z } from 'zod';
import { router, protectedProcedure, flexibleProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { createProjectSchema, updateProjectSchema, type Project, type ProjectCollaborator, type ProjectWithCollaborators, type ProjectShare } from 'phonoglyph-types';
import { db } from '../db/drizzle';
import { projects, fileMetadata } from '../db/schema';
import { eq, desc, and, or, like, asc, sql } from 'drizzle-orm';

// Additional validation schemas for new endpoints

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

// Helper function to transform Drizzle project result to Project type
function transformDrizzleProject(drizzleProject: any): Project {
  return {
    id: drizzleProject.id,
    name: drizzleProject.name,
    user_id: drizzleProject.userId,
    midi_file_path: drizzleProject.midiFilePath || '',
    audio_file_path: drizzleProject.audioFilePath,
    user_video_path: drizzleProject.userVideoPath,
    render_configuration: drizzleProject.renderConfiguration,
    description: drizzleProject.description,
    privacy_setting: drizzleProject.privacySetting as 'private' | 'unlisted' | 'public' || 'private',
    thumbnail_url: drizzleProject.thumbnailUrl,
    primary_midi_file_id: drizzleProject.primaryMidiFileId,
    created_at: drizzleProject.createdAt,
    updated_at: drizzleProject.updatedAt,
  };
}

export const projectRouter = router({
  // Get all projects for the authenticated user
  list: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Type-safe query with Drizzle ORM
        const userProjects = await db
          .select()
          .from(projects)
          .where(eq(projects.userId, ctx.user.id))
          .orderBy(desc(projects.createdAt));

        // Log audit event (keeping Supabase for audit logging for now)
        await (ctx.supabase as any).rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.list',
          p_resource_type: 'project',
          p_metadata: { count: userProjects?.length || 0 },
        });

        // Transform Drizzle result to match Project type (camelCase -> snake_case)
        return userProjects.map(transformDrizzleProject);
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
        // Type-safe query with user access control
        const project = await db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.id, input.id),
              eq(projects.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!project || project.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          });
        }

        // Log audit event
        await (ctx.supabase as any).rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.get',
          p_resource_type: 'project',
          p_resource_id: input.id,
        });

        return transformDrizzleProject(project[0]);
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
        console.log('=== API DEBUG PROJECT CREATION ===');
        console.log('Raw input received:', JSON.stringify(input, null, 2));
        console.log('input.name:', input.name);
        console.log('input.name type:', typeof input.name);
        console.log('=== END API DEBUG ===');

        const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Type-safe insert with Drizzle ORM
        const newProject = await db
          .insert(projects)
          .values({
            id: projectId,
            name: input.name,
            description: input.description,
            privacySetting: input.privacy_setting,
            userId: ctx.user.id,
            midiFilePath: input.midi_file_path,
            audioFilePath: input.audio_file_path,
            userVideoPath: input.user_video_path,
            renderConfiguration: input.render_configuration,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .returning();

        if (!newProject || newProject.length === 0) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create project',
          });
        }

        // Log audit event
        await (ctx.supabase as any).rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.create',
          p_resource_type: 'project',
          p_resource_id: newProject[0].id,
          p_metadata: { name: input.name },
        });

        return transformDrizzleProject(newProject[0]);
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

        // Type-safe update with user access control
        const updatedProject = await db
          .update(projects)
          .set({
            name: updateData.name,
            description: updateData.description,
            privacySetting: updateData.privacy_setting,
            midiFilePath: updateData.midi_file_path,
            audioFilePath: updateData.audio_file_path,
            userVideoPath: updateData.user_video_path,
            renderConfiguration: updateData.render_configuration,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(projects.id, id),
              eq(projects.userId, ctx.user.id)
            )
          )
          .returning();

        if (!updatedProject || updatedProject.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          });
        }

        // Log audit event
        await (ctx.supabase as any).rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.update',
          p_resource_type: 'project',
          p_resource_id: id,
          p_metadata: updateData,
        });

        return transformDrizzleProject(updatedProject[0]);
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
        // Step 1: Fetch all file metadata associated with the project
        const files = await db
          .select({
            id: fileMetadata.id,
            s3Key: fileMetadata.s3Key,
          })
          .from(fileMetadata)
          .where(eq(fileMetadata.projectId, input.id));

        // Step 2: If files exist, delete them from storage
        if (files && files.length > 0) {
          const filePaths = files.map(f => f.s3Key).filter((p): p is string => !!p);

          if (filePaths.length > 0) {
            const { error: storageError } = await ctx.supabase.storage
              .from('assets')
              .remove(filePaths);

            if (storageError) {
              console.error('Storage error deleting project files:', storageError);
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to delete project assets from storage.',
              });
            }
          }

          // Step 3: Delete the file metadata records using Drizzle
          const fileIds = files.map(f => f.id);
          await db
            .delete(fileMetadata)
            .where(sql`${fileMetadata.id} = ANY(${fileIds})`);
        }

        // Step 4: Delete the project itself using Drizzle
        const deletedProject = await db
          .delete(projects)
          .where(
            and(
              eq(projects.id, input.id),
              eq(projects.userId, ctx.user.id)
            )
          )
          .returning();

        if (!deletedProject || deletedProject.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          });
        }

        // Log audit event
        await (ctx.supabase as any).rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.delete',
          p_resource_type: 'project',
          p_resource_id: input.id,
          p_metadata: { name: deletedProject[0].name },
        });

        return { success: true, deletedProject: transformDrizzleProject(deletedProject[0]) };
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
        // Build base query conditions
        const conditions = [eq(projects.userId, ctx.user.id)];

        // Apply filters
        if (input.query) {
          conditions.push(like(projects.name, `%${input.query}%`));
        }
        if (input.privacy_setting) {
          conditions.push(eq(projects.privacySetting, input.privacy_setting));
        }

        // Build order by clause
        const orderBy = input.sort_order === 'asc'
          ? asc(projects[input.sort_by as keyof typeof projects])
          : desc(projects[input.sort_by as keyof typeof projects]);

        // Execute query with Drizzle
        const searchResults = await db
          .select()
          .from(projects)
          .where(and(...conditions))
          .orderBy(orderBy)
          .limit(input.limit)
          .offset(input.offset);

        // For now, return basic project data without file metadata aggregation
        // TODO: Implement proper joins and aggregations with Drizzle
        const projectsWithMetadata = searchResults.map(project => ({
          ...project,
          file_count: 0, // TODO: Add proper file count aggregation
          total_file_size: 0, // TODO: Add proper file size aggregation
        }));

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
        await (ctx.supabase as any).rpc('log_audit_event', {
          p_user_id: ctx.user.id,
          p_action: 'project.duplicate',
          p_resource_type: 'project',
          p_resource_id: newProject.id,
          p_metadata: { original_project_id: input.project_id, new_name: input.new_name },
        });

        return transformDrizzleProject(newProject);
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
        await (ctx.supabase as any).rpc('log_audit_event', {
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
        const { data: canAccess } = await (ctx.supabase as any)
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
        await (ctx.supabase as any).rpc('log_audit_event', {
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
        await (ctx.supabase as any).rpc('log_audit_event', {
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
        await (ctx.supabase as any).rpc('log_audit_event', {
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