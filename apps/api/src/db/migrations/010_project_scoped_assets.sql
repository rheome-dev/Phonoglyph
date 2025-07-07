-- Project-Scoped Asset Management - Story 1.7
-- Migration: 010_project_scoped_assets

-- Add asset management fields to file_metadata table
ALTER TABLE "file_metadata" 
ADD COLUMN IF NOT EXISTS "asset_type" TEXT CHECK (asset_type IN ('midi', 'audio', 'video', 'image')),
ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "duration_seconds" FLOAT,
ADD COLUMN IF NOT EXISTS "usage_status" TEXT DEFAULT 'unused' CHECK (usage_status IN ('active', 'referenced', 'unused')),
ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "replacement_history" JSONB DEFAULT '[]'::jsonb;

-- Create asset usage tracking table
CREATE TABLE "asset_usage" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_id" UUID NOT NULL REFERENCES "file_metadata"("id") ON DELETE CASCADE,
  "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "usage_type" TEXT NOT NULL CHECK (usage_type IN ('visualizer', 'composition', 'export')),
  "usage_context" JSONB DEFAULT '{}'::jsonb,
  "started_at" TIMESTAMPTZ DEFAULT NOW(),
  "ended_at" TIMESTAMPTZ,
  "session_duration" INTERVAL GENERATED ALWAYS AS (ended_at - started_at) STORED,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage quota tracking table
CREATE TABLE "project_storage_quotas" (
  "project_id" TEXT PRIMARY KEY REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_subscription_tier" TEXT NOT NULL DEFAULT 'free',
  "total_limit_bytes" BIGINT NOT NULL,
  "used_bytes" BIGINT DEFAULT 0,
  "file_count_limit" INTEGER NOT NULL,
  "file_count_used" INTEGER DEFAULT 0,
  "per_file_size_limit" BIGINT NOT NULL,
  "last_calculated_at" TIMESTAMPTZ DEFAULT NOW(),
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create asset folders/categories table
CREATE TABLE "asset_folders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "parent_folder_id" UUID REFERENCES "asset_folders"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create asset tags table
CREATE TABLE "asset_tags" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "color" TEXT DEFAULT '#3B82F6',
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create asset-tag relationship table
CREATE TABLE "asset_tag_relationships" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_id" UUID NOT NULL REFERENCES "file_metadata"("id") ON DELETE CASCADE,
  "tag_id" UUID NOT NULL REFERENCES "asset_tags"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("file_id", "tag_id")
);

-- Add folder relationship to file_metadata
ALTER TABLE "file_metadata" 
ADD COLUMN IF NOT EXISTS "folder_id" UUID REFERENCES "asset_folders"("id") ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_file_metadata_project_type" ON "file_metadata"("project_id", "asset_type");
CREATE INDEX IF NOT EXISTS "idx_file_metadata_usage_status" ON "file_metadata"("usage_status");
CREATE INDEX IF NOT EXISTS "idx_file_metadata_is_primary" ON "file_metadata"("is_primary") WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS "idx_asset_usage_file_project" ON "asset_usage"("file_id", "project_id");
CREATE INDEX IF NOT EXISTS "idx_asset_usage_type_date" ON "asset_usage"("usage_type", "started_at");
CREATE INDEX IF NOT EXISTS "idx_asset_folders_project" ON "asset_folders"("project_id");
CREATE INDEX IF NOT EXISTS "idx_asset_tags_project" ON "asset_tags"("project_id");
CREATE INDEX IF NOT EXISTS "idx_asset_tag_relationships_file" ON "asset_tag_relationships"("file_id");
CREATE INDEX IF NOT EXISTS "idx_asset_tag_relationships_tag" ON "asset_tag_relationships"("tag_id");

-- Enable RLS for new tables
ALTER TABLE "asset_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_storage_quotas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_tag_relationships" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_usage
CREATE POLICY "Users can access own asset usage" ON "asset_usage"
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE "projects"."id" = "asset_usage"."project_id" 
      AND "projects"."user_id" = auth.uid()
    )
  );

-- RLS Policies for project_storage_quotas
CREATE POLICY "Users can access own storage quotas" ON "project_storage_quotas"
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE "projects"."id" = "project_storage_quotas"."project_id" 
      AND "projects"."user_id" = auth.uid()
    )
  );

-- RLS Policies for asset_folders
CREATE POLICY "Users can access own asset folders" ON "asset_folders"
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE "projects"."id" = "asset_folders"."project_id" 
      AND "projects"."user_id" = auth.uid()
    )
  );

-- RLS Policies for asset_tags
CREATE POLICY "Users can access own asset tags" ON "asset_tags"
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE "projects"."id" = "asset_tags"."project_id" 
      AND "projects"."user_id" = auth.uid()
    )
  );

-- RLS Policies for asset_tag_relationships
CREATE POLICY "Users can access own asset tag relationships" ON "asset_tag_relationships"
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM "file_metadata" fm
      JOIN "projects" p ON fm.project_id = p.id
      WHERE fm.id = "asset_tag_relationships"."file_id" 
      AND p.user_id = auth.uid()
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_project_storage_quotas_updated_at 
  BEFORE UPDATE ON "project_storage_quotas" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_folders_updated_at 
  BEFORE UPDATE ON "asset_folders" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate project storage usage
CREATE OR REPLACE FUNCTION calculate_project_storage_usage(project_id_param TEXT)
RETURNS TABLE(used_bytes BIGINT, file_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(fm.file_size), 0)::BIGINT as used_bytes,
    COUNT(fm.id)::INTEGER as file_count
  FROM file_metadata fm
  WHERE fm.project_id = project_id_param
    AND fm.upload_status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update storage quota
CREATE OR REPLACE FUNCTION update_project_storage_quota(project_id_param TEXT)
RETURNS VOID AS $$
DECLARE
  usage_record RECORD;
BEGIN
  -- Get current usage
  SELECT * INTO usage_record FROM calculate_project_storage_usage(project_id_param);
  
  -- Update or insert quota record
  INSERT INTO project_storage_quotas (
    project_id, 
    user_subscription_tier, 
    total_limit_bytes, 
    used_bytes, 
    file_count_limit, 
    file_count_used, 
    per_file_size_limit
  )
  VALUES (
    project_id_param,
    'free', -- Default tier, will be updated by application logic
    104857600, -- 100MB for free tier
    usage_record.used_bytes,
    10, -- 10 files for free tier
    usage_record.file_count,
    52428800 -- 50MB per file for free tier
  )
  ON CONFLICT (project_id) 
  DO UPDATE SET
    used_bytes = EXCLUDED.used_bytes,
    file_count_used = EXCLUDED.file_count_used,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update storage quota when files are added/removed
CREATE OR REPLACE FUNCTION trigger_update_storage_quota()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM update_project_storage_quota(NEW.project_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.project_id != NEW.project_id THEN
      PERFORM update_project_storage_quota(OLD.project_id);
      PERFORM update_project_storage_quota(NEW.project_id);
    ELSE
      PERFORM update_project_storage_quota(NEW.project_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_project_storage_quota(OLD.project_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for file_metadata changes
CREATE TRIGGER trigger_file_metadata_storage_update
  AFTER INSERT OR UPDATE OR DELETE ON "file_metadata"
  FOR EACH ROW EXECUTE FUNCTION trigger_update_storage_quota(); 