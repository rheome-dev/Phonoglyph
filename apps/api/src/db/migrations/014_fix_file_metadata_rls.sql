-- Migration: 014_fix_file_metadata_rls
-- Reason: The existing RLS policy for file_metadata only allows users to access files
-- they own directly (user_id = auth.uid()). It does not account for project-based
-- access, where a project owner should be able to manage all files within their project,
-- regardless of who uploaded them. This prevents project-level operations like deletion.

-- Drop the old, restrictive policy
DROP POLICY IF EXISTS "Users can access own files" ON "file_metadata";

-- Create a new, more flexible policy that grants access if the user:
-- 1. Is the direct owner of the file (maintains original behavior).
-- 2. Is the owner of the project to which the file belongs.
CREATE POLICY "Project members can access project files" ON "file_metadata"
  FOR ALL
  USING (
    (auth.uid() = user_id) OR
    (EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = file_metadata.project_id AND projects.user_id = auth.uid()
    ))
  ); 