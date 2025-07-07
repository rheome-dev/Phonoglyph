-- Complete RLS Fix - Remove All Circular Dependencies
-- Migration: 009_fix_rls_final

-- Temporarily disable RLS to clean up policies
ALTER TABLE "projects" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "project_collaborators" DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing problematic policies
DROP POLICY IF EXISTS "Users can access own projects" ON "projects";
DROP POLICY IF EXISTS "Users can view their own projects" ON "projects";
DROP POLICY IF EXISTS "Collaborators can view shared projects" ON "projects";
DROP POLICY IF EXISTS "Users can create projects for themselves" ON "projects";
DROP POLICY IF EXISTS "Project owners can update projects" ON "projects";
DROP POLICY IF EXISTS "Project collaborators can update projects" ON "projects";
DROP POLICY IF EXISTS "Users can update their own projects" ON "projects";
DROP POLICY IF EXISTS "Users can delete their own projects" ON "projects";
DROP POLICY IF EXISTS "Public access to public projects" ON "projects";
DROP POLICY IF EXISTS "Shared project access" ON "projects";

DROP POLICY IF EXISTS "Users can view collaborators for owned projects" ON "project_collaborators";
DROP POLICY IF EXISTS "Users can view own collaborator records" ON "project_collaborators";
DROP POLICY IF EXISTS "Project owners can manage collaborators" ON "project_collaborators";
DROP POLICY IF EXISTS "Users can view project collaborators" ON "project_collaborators";

-- Re-enable RLS
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_collaborators" ENABLE ROW LEVEL SECURITY;

-- Create simple, non-circular RLS policies for projects
-- Users can see their own projects
CREATE POLICY "project_owner_access" ON "projects"
  FOR ALL 
  TO authenticated
  USING ("user_id" = auth.uid());

-- Public can see public projects  
CREATE POLICY "public_project_access" ON "projects"
  FOR SELECT
  TO anon, authenticated
  USING ("privacy_setting" = 'public');

-- Simple policies for project_collaborators
-- Users can see collaborator records for projects they own
CREATE POLICY "collaborator_owner_access" ON "project_collaborators"
  FOR ALL
  TO authenticated
  USING (
    "project_id" IN (
      SELECT "id" FROM "projects" 
      WHERE "user_id" = auth.uid()
    )
  );

-- Users can see their own collaborator records  
CREATE POLICY "collaborator_self_access" ON "project_collaborators"
  FOR SELECT
  TO authenticated
  USING ("user_id" = auth.uid()); 