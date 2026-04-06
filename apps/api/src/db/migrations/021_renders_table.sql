-- Migration: 021_renders_table
-- Persist render metadata so it can be queried by renderId

CREATE TABLE IF NOT EXISTS "renders" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "project_id" TEXT REFERENCES "projects"("id") ON DELETE SET NULL,
  "project_name" TEXT,
  "bucket_name" TEXT NOT NULL,
  "function_name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
  "output_url" TEXT,
  "error_message" TEXT,
  "credits_spent" INTEGER DEFAULT 1,
  "metadata" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS "idx_renders_user_id" ON "renders"("user_id");
CREATE INDEX IF NOT EXISTS "idx_renders_project_id" ON "renders"("project_id");
CREATE INDEX IF NOT EXISTS "idx_renders_created_at" ON "renders"("created_at");
CREATE INDEX IF NOT EXISTS "idx_renders_status" ON "renders"("status");

-- RLS
ALTER TABLE "renders" ENABLE ROW LEVEL SECURITY;

-- Users can view their own renders
CREATE POLICY "Users can view their own renders" ON "renders"
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- System inserts renders (via tRPC triggerRender)
CREATE POLICY "Authenticated users can create renders" ON "renders"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- System updates renders (via Lambda webhook or polling)
CREATE POLICY "System can update renders" ON "renders"
  FOR UPDATE USING (true);

-- Public reads for shareable URLs (no auth required)
CREATE POLICY "Public can view renders by ID" ON "renders"
  FOR SELECT USING (true);

-- Auto-update timestamp
DROP TRIGGER IF EXISTS update_renders_updated_at ON "renders";
CREATE TRIGGER update_renders_updated_at BEFORE UPDATE ON "renders"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
