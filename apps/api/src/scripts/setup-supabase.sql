-- Supabase Database Setup Script
-- Run this in Supabase SQL Editor or via migration

-- Enable UUID extension (should already be enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (be careful in production!)
DROP TABLE IF EXISTS "project_collaborators" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;
DROP TABLE IF EXISTS "user_profiles" CASCADE;
DROP TABLE IF EXISTS "audit_logs" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE; -- Drop old custom users table

-- =============================================
-- CORE TABLES
-- =============================================

-- Projects table (references auth.users)
CREATE TABLE "projects" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "midi_file_path" TEXT NOT NULL,
  "audio_file_path" TEXT,
  "user_video_path" TEXT,
  "render_configuration" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table for additional user data
CREATE TABLE "user_profiles" (
  "id" UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "display_name" TEXT,
  "avatar_url" TEXT,
  "bio" TEXT,
  "preferences" JSONB DEFAULT '{}'::jsonb,
  "subscription_tier" TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Project collaborators table for sharing
CREATE TABLE "project_collaborators" (
  "id" UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("project_id", "user_id")
);

-- Audit log table for security tracking
CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" TEXT,
  "metadata" JSONB DEFAULT '{}'::jsonb,
  "ip_address" INET,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX "idx_projects_user_id" ON "projects"("user_id");
CREATE INDEX "idx_projects_created_at" ON "projects"("created_at");
CREATE INDEX "idx_user_profiles_display_name" ON "user_profiles"("display_name");
CREATE INDEX "idx_project_collaborators_project_id" ON "project_collaborators"("project_id");
CREATE INDEX "idx_project_collaborators_user_id" ON "project_collaborators"("user_id");
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("user_id");
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- =============================================
-- UPDATE TRIGGERS
-- =============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update triggers
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON "projects" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON "user_profiles" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_collaborators" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Projects RLS Policies
CREATE POLICY "Users can view their own projects" ON "projects"
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM "project_collaborators" 
      WHERE project_id = "projects"."id" 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects for themselves" ON "projects"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON "projects"
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM "project_collaborators" 
      WHERE project_id = "projects"."id" 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can delete their own projects" ON "projects"
  FOR DELETE USING (auth.uid() = user_id);

-- User Profiles RLS Policies
CREATE POLICY "Users can view all profiles" ON "user_profiles"
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own profile" ON "user_profiles"
  FOR ALL USING (auth.uid() = id);

-- Project Collaborators RLS Policies
CREATE POLICY "Users can view project collaborators" ON "project_collaborators"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE id = project_id 
      AND (
        user_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM "project_collaborators" pc2 
          WHERE pc2.project_id = project_id 
          AND pc2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Project owners can manage collaborators" ON "project_collaborators"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE id = project_id 
      AND user_id = auth.uid()
    )
  );

-- Audit Logs RLS Policies
CREATE POLICY "Users can view their own audit logs" ON "audit_logs"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON "audit_logs"
  FOR INSERT WITH CHECK (true);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to create user profile when user signs up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "user_profiles" (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO "audit_logs" (user_id, action, resource_type, resource_id, metadata)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access project
CREATE OR REPLACE FUNCTION user_can_access_project(p_project_id TEXT, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "projects" 
    WHERE id = p_project_id 
    AND (
      user_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM "project_collaborators" 
        WHERE project_id = p_project_id 
        AND user_id = p_user_id
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SAMPLE DATA (OPTIONAL - for testing)
-- =============================================

-- Uncomment below to insert sample data
/*
-- Insert sample user profile (replace with actual user ID from auth.users)
INSERT INTO "user_profiles" (id, display_name, bio) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Sample User', 'This is a sample user profile');

-- Insert sample project
INSERT INTO "projects" (id, name, user_id, midi_file_path, render_configuration)
VALUES (
  'sample_project_001',
  'My First MIDI Project',
  '00000000-0000-0000-0000-000000000000',
  '/uploads/sample.mid',
  '{"tempo": 120, "effects": ["reverb"]}'
);
*/

-- =============================================
-- MIGRATIONS TRACKING
-- =============================================

-- Create migrations table
CREATE TABLE IF NOT EXISTS "_migrations" (
  "id" SERIAL PRIMARY KEY,
  "filename" TEXT NOT NULL UNIQUE,
  "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Record initial setup
INSERT INTO "_migrations" (filename) 
VALUES ('001_initial_schema.sql'), ('002_supabase_auth_integration.sql')
ON CONFLICT (filename) DO NOTHING;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify tables were created
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'user_profiles', 'project_collaborators', 'audit_logs')
ORDER BY tablename;

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'user_profiles', 'project_collaborators', 'audit_logs')
  AND rowsecurity = true
ORDER BY tablename;

-- Verify functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('create_user_profile', 'log_audit_event', 'user_can_access_project')
ORDER BY routine_name; 