-- Enhanced Project Management Schema
-- Migration: 007_enhanced_project_management

-- Extend existing projects table with new fields
ALTER TABLE "projects" 
ADD COLUMN "description" TEXT,
ADD COLUMN "genre" TEXT,
ADD COLUMN "privacy_setting" TEXT DEFAULT 'private' CHECK (privacy_setting IN ('private', 'unlisted', 'public')),
ADD COLUMN "thumbnail_url" TEXT,
ADD COLUMN "primary_midi_file_id" UUID;

-- Create project sharing table for unique URL access
CREATE TABLE "project_shares" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "share_token" TEXT NOT NULL UNIQUE,
  "access_type" TEXT DEFAULT 'view' CHECK (access_type IN ('view', 'embed')),
  "expires_at" TIMESTAMP WITH TIME ZONE,
  "view_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add project relationship to file_metadata table
ALTER TABLE "file_metadata" 
ADD COLUMN "project_id" TEXT REFERENCES "projects"("id") ON DELETE CASCADE;

-- Create indexes for performance on filtering and search
CREATE INDEX IF NOT EXISTS "idx_projects_genre" ON "projects"("genre");
CREATE INDEX IF NOT EXISTS "idx_projects_privacy" ON "projects"("privacy_setting");
CREATE INDEX IF NOT EXISTS "idx_projects_user_privacy" ON "projects"("user_id", "privacy_setting");
CREATE INDEX IF NOT EXISTS "idx_project_shares_token" ON "project_shares"("share_token");
CREATE INDEX IF NOT EXISTS "idx_project_shares_project" ON "project_shares"("project_id");
CREATE INDEX IF NOT EXISTS "idx_file_metadata_project" ON "file_metadata"("project_id");

-- Enable RLS for project sharing table
ALTER TABLE "project_shares" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage shares for their own projects
CREATE POLICY "Users can manage own project shares" ON "project_shares"
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE "projects"."id" = "project_shares"."project_id" 
      AND "projects"."user_id" = auth.uid()
    )
  );

-- RLS Policy: Public access to shared projects via token
CREATE POLICY "Public access to shared projects" ON "project_shares"
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Update existing projects RLS policies for privacy settings
DROP POLICY IF EXISTS "Users can access own projects" ON "projects";

-- Enhanced RLS policy for projects with privacy settings
CREATE POLICY "Users can access own projects" ON "projects"
  FOR ALL 
  USING (user_id = auth.uid());

-- Policy for public access to public projects
CREATE POLICY "Public access to public projects" ON "projects"
  FOR SELECT
  TO anon, authenticated
  USING (privacy_setting = 'public');

-- Policy for shared project access via project_shares
CREATE POLICY "Shared project access" ON "projects"
  FOR SELECT
  TO anon, authenticated
  USING (
    privacy_setting = 'unlisted' AND
    EXISTS (
      SELECT 1 FROM "project_shares"
      WHERE "project_shares"."project_id" = "projects"."id"
    )
  );

-- Add trigger for project_shares updated_at
CREATE TRIGGER update_project_shares_updated_at 
  BEFORE UPDATE ON "project_shares" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint for primary_midi_file_id (referencing file_metadata)
-- Note: Adding as separate step to handle existing data
ALTER TABLE "projects" 
ADD CONSTRAINT "fk_projects_primary_midi_file" 
FOREIGN KEY ("primary_midi_file_id") 
REFERENCES "file_metadata"("id") 
ON DELETE SET NULL; 