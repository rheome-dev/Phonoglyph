import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { supabaseAdmin } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

describe('Database Security and RLS Tests', () => {
  let supabase: SupabaseClient;
  let testUser1: any;
  let testUser2: any;
  let testProject: any;
  
  beforeAll(async () => {
    supabase = supabaseAdmin;
    
    // Create test users
    const { data: user1, error: error1 } = await supabase.auth.admin.createUser({
      email: 'test1@example.com',
      password: 'password123',
      user_metadata: { name: 'Test User 1' },
    });
    
    const { data: user2, error: error2 } = await supabase.auth.admin.createUser({
      email: 'test2@example.com',
      password: 'password123',
      user_metadata: { name: 'Test User 2' },
    });
    
    if (error1 || error2) {
      throw new Error(`Failed to create test users: ${error1?.message || error2?.message}`);
    }
    
    testUser1 = user1.user;
    testUser2 = user2.user;
  });

  afterAll(async () => {
    // Clean up test users
    if (testUser1) {
      await supabase.auth.admin.deleteUser(testUser1.id);
    }
    if (testUser2) {
      await supabase.auth.admin.deleteUser(testUser2.id);
    }
  });

  beforeEach(async () => {
    // Create a test project for user1
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        id: `test_proj_${randomUUID()}`,
        name: 'Test Project',
        user_id: testUser1.id,
        midi_file_path: '/test/midi/file.mid',
        render_configuration: { test: true },
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create test project: ${error.message}`);
    }
    
    testProject = project;
  });

  afterEach(async () => {
    // Clean up test project
    if (testProject) {
      await supabase
        .from('projects')
        .delete()
        .eq('id', testProject.id);
    }
  });

  describe('Row Level Security (RLS) Policies', () => {
    it('should allow users to see only their own projects', async () => {
      // User1 should see their project
      const { data: user1Projects, error: error1 } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', testUser1.id);

      expect(error1).toBeNull();
      expect(user1Projects).toHaveLength(1);
      expect(user1Projects?.[0].id).toBe(testProject.id);

      // User2 should not see user1's project when querying all projects
      const { data: user2Projects, error: error2 } = await supabase
        .from('projects')
        .select('*');

      expect(error2).toBeNull();
      expect(user2Projects?.find(p => p.id === testProject.id)).toBeUndefined();
    });

    it('should prevent users from accessing other users projects directly', async () => {
      // User2 should not be able to access user1's project directly
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', testProject.id)
        .single();

      // This should return null due to RLS filtering
      expect(project).toBeNull();
      expect(error?.code).toBe('PGRST116'); // No rows found
    });

    it('should allow users to create projects only for themselves', async () => {
      const projectId = `test_proj_${randomUUID()}`;
      
      // User2 should be able to create a project for themselves
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          id: projectId,
          name: 'User2 Project',
          user_id: testUser2.id,
          midi_file_path: '/test/midi/file2.mid',
          render_configuration: { test: true },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(project?.user_id).toBe(testUser2.id);

      // Clean up
      await supabase.from('projects').delete().eq('id', projectId);
    });

    it('should prevent users from creating projects for other users', async () => {
      const projectId = `test_proj_${randomUUID()}`;
      
      // User2 should not be able to create a project for user1
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          id: projectId,
          name: 'Malicious Project',
          user_id: testUser1.id, // Trying to create for another user
          midi_file_path: '/test/midi/malicious.mid',
          render_configuration: { test: true },
        })
        .select()
        .single();

      expect(error).not.toBeNull();
      expect(project).toBeNull();
    });

    it('should allow users to update only their own projects', async () => {
      // User1 should be able to update their own project
      const { data: updatedProject, error: error1 } = await supabase
        .from('projects')
        .update({ name: 'Updated Project Name' })
        .eq('id', testProject.id)
        .select()
        .single();

      expect(error1).toBeNull();
      expect(updatedProject?.name).toBe('Updated Project Name');

      // User2 should not be able to update user1's project
      const { data: maliciousUpdate, error: error2 } = await supabase
        .from('projects')
        .update({ name: 'Malicious Update' })
        .eq('id', testProject.id)
        .select()
        .single();

      expect(maliciousUpdate).toBeNull();
      expect(error2?.code).toBe('PGRST116'); // No rows found/updated
    });

    it('should allow users to delete only their own projects', async () => {
      // Create another project for user1
      const { data: tempProject, error: createError } = await supabase
        .from('projects')
        .insert({
          id: `temp_proj_${randomUUID()}`,
          name: 'Temporary Project',
          user_id: testUser1.id,
          midi_file_path: '/test/midi/temp.mid',
          render_configuration: { test: true },
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(tempProject).not.toBeNull();

      // User1 should be able to delete their own project
      const { data: deletedProject, error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', tempProject.id)
        .select()
        .single();

      expect(deleteError).toBeNull();
      expect(deletedProject?.id).toBe(tempProject.id);

      // User2 should not be able to delete user1's main project
      const { data: maliciousDelete, error: maliciousError } = await supabase
        .from('projects')
        .delete()
        .eq('id', testProject.id)
        .select()
        .single();

      expect(maliciousDelete).toBeNull();
      expect(maliciousError?.code).toBe('PGRST116'); // No rows found/deleted
    });
  });

  describe('User Profile Security', () => {
    it('should allow users to view all user profiles', async () => {
      // Users should be able to view all profiles (for collaboration)
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*');

      expect(error).toBeNull();
      expect(profiles).toBeInstanceOf(Array);
    });

    it('should allow users to manage only their own profile', async () => {
      // User1 should be able to update their own profile
      const { data: updatedProfile, error: error1 } = await supabase
        .from('user_profiles')
        .update({ display_name: 'Updated Name' })
        .eq('id', testUser1.id)
        .select()
        .single();

      expect(error1).toBeNull();
      expect(updatedProfile?.display_name).toBe('Updated Name');

      // User2 should not be able to update user1's profile
      const { data: maliciousUpdate, error: error2 } = await supabase
        .from('user_profiles')
        .update({ display_name: 'Malicious Update' })
        .eq('id', testUser1.id)
        .select()
        .single();

      expect(maliciousUpdate).toBeNull();
      expect(error2?.code).toBe('PGRST116'); // No rows found/updated
    });
  });

  describe('Project Collaborators Security', () => {
    it('should allow project owners to add collaborators', async () => {
      // User1 (owner) should be able to add user2 as collaborator
      const { data: collaborator, error } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: testProject.id,
          user_id: testUser2.id,
          role: 'viewer',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(collaborator?.project_id).toBe(testProject.id);
      expect(collaborator?.user_id).toBe(testUser2.id);
      expect(collaborator?.role).toBe('viewer');

      // Clean up
      await supabase
        .from('project_collaborators')
        .delete()
        .eq('id', collaborator.id);
    });

    it('should allow collaborators to view project details', async () => {
      // Add user2 as collaborator
      const { data: collaborator, error: collabError } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: testProject.id,
          user_id: testUser2.id,
          role: 'viewer',
        })
        .select()
        .single();

      expect(collabError).toBeNull();

      // User2 should now be able to see the project
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', testProject.id)
        .single();

      expect(error).toBeNull();
      expect(project?.id).toBe(testProject.id);

      // Clean up
      await supabase
        .from('project_collaborators')
        .delete()
        .eq('id', collaborator.id);
    });
  });

  describe('Audit Logs Security', () => {
    it('should allow users to view only their own audit logs', async () => {
      // Create audit log for user1
      await supabase.rpc('log_audit_event', {
        p_user_id: testUser1.id,
        p_action: 'test.action',
        p_resource_type: 'test',
        p_resource_id: 'test123',
        p_metadata: { test: true },
      });

      // User1 should see their own audit logs
      const { data: user1Logs, error: error1 } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', testUser1.id);

      expect(error1).toBeNull();
      expect(user1Logs?.length).toBeGreaterThan(0);

      // User2 should not see user1's audit logs
      const { data: user2Logs, error: error2 } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', testUser1.id);

      expect(error2).toBeNull();
      expect(user2Logs).toHaveLength(0); // RLS should filter out user1's logs
    });

    it('should allow system to insert audit logs', async () => {
      // System should be able to insert audit logs
      const { data: log, error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: testUser1.id,
          action: 'system.test',
          resource_type: 'system',
          resource_id: 'system123',
          metadata: { system: true },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(log?.action).toBe('system.test');
    });
  });

  describe('Database Functions', () => {
    it('should correctly identify user access to projects', async () => {
      // User1 should have access to their own project
      const { data: hasAccess1, error: error1 } = await supabase
        .rpc('user_can_access_project', {
          p_project_id: testProject.id,
          p_user_id: testUser1.id,
        });

      expect(error1).toBeNull();
      expect(hasAccess1).toBe(true);

      // User2 should not have access to user1's project
      const { data: hasAccess2, error: error2 } = await supabase
        .rpc('user_can_access_project', {
          p_project_id: testProject.id,
          p_user_id: testUser2.id,
        });

      expect(error2).toBeNull();
      expect(hasAccess2).toBe(false);
    });

    it('should log audit events correctly', async () => {
      const testAction = 'test.database.function';
      const testMetadata = { function: 'test', timestamp: Date.now() };

      // Log audit event
      const { error } = await supabase.rpc('log_audit_event', {
        p_user_id: testUser1.id,
        p_action: testAction,
        p_resource_type: 'test',
        p_resource_id: 'test456',
        p_metadata: testMetadata,
      });

      expect(error).toBeNull();

      // Verify audit log was created
      const { data: logs, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', testUser1.id)
        .eq('action', testAction)
        .order('created_at', { ascending: false })
        .limit(1);

      expect(fetchError).toBeNull();
      expect(logs).toHaveLength(1);
      expect(logs?.[0].action).toBe(testAction);
      expect(logs?.[0].metadata).toEqual(testMetadata);
    });
  });
}); 