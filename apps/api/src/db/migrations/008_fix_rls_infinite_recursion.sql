-- Fix RLS Infinite Recursion in Project Collaborators
-- Migration: 008_fix_rls_infinite_recursion

-- Drop the problematic policies that cause circular references
DROP POLICY IF EXISTS "Users can view project collaborators" ON "project_collaborators";
DROP POLICY IF EXISTS "Project owners can manage collaborators" ON "project_collaborators";

-- Create simplified RLS policies for project_collaborators without circular references
-- Users can view collaborators for projects they own
CREATE POLICY "Users can view collaborators for owned projects" ON "project_collaborators"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE "projects"."id" = "project_collaborators"."project_id" 
      AND "projects"."user_id" = auth.uid()
    )
  );

-- Users can view their own collaborator records
CREATE POLICY "Users can view own collaborator records" ON "project_collaborators"
  FOR SELECT USING ("project_collaborators"."user_id" = auth.uid());

-- Only project owners can manage (INSERT/UPDATE/DELETE) collaborators
CREATE POLICY "Project owners can manage collaborators" ON "project_collaborators"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE "projects"."id" = "project_collaborators"."project_id" 
      AND "projects"."user_id" = auth.uid()
    )
  );

-- Also update the projects RLS policy to remove circular reference
DROP POLICY IF EXISTS "Users can view their own projects" ON "projects";

-- Create a simplified policy for projects that doesn't reference collaborators
CREATE POLICY "Users can view their own projects" ON "projects"
  FOR SELECT USING ("projects"."user_id" = auth.uid());

-- Separate policy for collaborator access to projects  
CREATE POLICY "Collaborators can view shared projects" ON "projects"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "project_collaborators" 
      WHERE "project_collaborators"."project_id" = "projects"."id" 
      AND "project_collaborators"."user_id" = auth.uid()
    )
  );

-- Update the project update policy to also remove circular reference
DROP POLICY IF EXISTS "Users can update their own projects" ON "projects";

CREATE POLICY "Project owners can update projects" ON "projects"
  FOR UPDATE USING ("projects"."user_id" = auth.uid());

CREATE POLICY "Project collaborators can update projects" ON "projects"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "project_collaborators" 
      WHERE "project_collaborators"."project_id" = "projects"."id" 
      AND "project_collaborators"."user_id" = auth.uid()
      AND "project_collaborators"."role" IN ('owner', 'editor')
    )
  ); 