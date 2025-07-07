-- Migration: 002_supabase_auth_integration
-- Integrate with Supabase authentication and set up Row Level Security

-- Drop the custom users table since we'll use auth.users
DROP TABLE IF EXISTS "users" CASCADE;

-- Update projects table to reference auth.users
ALTER TABLE "projects" 
  ALTER COLUMN "user_id" TYPE UUID USING "user_id"::UUID,
  ADD CONSTRAINT "projects_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create user profiles table for additional user data
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

-- Create project collaborators table for sharing
CREATE TABLE "project_collaborators" (
  "id" UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("project_id", "user_id")
);

-- Create audit log table for security tracking
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

-- Add indexes for performance
CREATE INDEX "idx_user_profiles_display_name" ON "user_profiles"("display_name");
CREATE INDEX "idx_project_collaborators_project_id" ON "project_collaborators"("project_id");
CREATE INDEX "idx_project_collaborators_user_id" ON "project_collaborators"("user_id");
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("user_id");
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- Update triggers for new tables
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON "user_profiles";
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON "user_profiles" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON "projects";
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON "projects" 
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
-- Users can only see their own projects or projects they're collaborators on
CREATE POLICY "Users can view their own projects" ON "projects"
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM "project_collaborators" 
      WHERE project_id = "projects"."id" 
      AND user_id = auth.uid()
    )
  );

-- Users can only insert projects for themselves
CREATE POLICY "Users can create projects for themselves" ON "projects"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own projects or projects they have editor+ access to
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

-- Users can only delete their own projects
CREATE POLICY "Users can delete their own projects" ON "projects"
  FOR DELETE USING (auth.uid() = user_id);

-- User Profiles RLS Policies
-- Users can view all profiles (for collaboration)
CREATE POLICY "Users can view all profiles" ON "user_profiles"
  FOR SELECT USING (true);

-- Users can only insert/update their own profile
CREATE POLICY "Users can manage their own profile" ON "user_profiles"
  FOR ALL USING (auth.uid() = id);

-- Project Collaborators RLS Policies
-- Users can view collaborators for projects they have access to
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

-- Only project owners can manage collaborators
CREATE POLICY "Project owners can manage collaborators" ON "project_collaborators"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE id = project_id 
      AND user_id = auth.uid()
    )
  );

-- Audit Logs RLS Policies
-- Users can only view their own audit logs
CREATE POLICY "Users can view their own audit logs" ON "audit_logs"
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert audit logs (no user restriction for INSERT)
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