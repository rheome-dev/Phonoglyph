-- Event-Based Audio Feature Mapping Tables
-- Migration: 018_event_based_mappings

-- Create event-based mapping configuration table
CREATE TABLE "event_based_mappings" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "event_type" TEXT NOT NULL CHECK (event_type IN ('transient', 'chroma', 'volume', 'brightness')),
  "target_parameter" TEXT NOT NULL,
  "mapping_config" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add index for efficient mapping queries
CREATE INDEX "idx_event_based_mappings_user" ON "event_based_mappings" ("user_id");
CREATE INDEX "idx_event_based_mappings_project" ON "event_based_mappings" ("project_id");
CREATE INDEX "idx_event_based_mappings_event" ON "event_based_mappings" ("event_type");
CREATE INDEX "idx_event_based_mappings_enabled" ON "event_based_mappings" ("enabled") WHERE "enabled" = true;

-- Add unique constraint to prevent duplicate mappings
CREATE UNIQUE INDEX "idx_event_based_mappings_unique" 
  ON "event_based_mappings" ("project_id", "event_type", "target_parameter");

-- Add audio event cache table for performance
CREATE TABLE "audio_event_cache" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "file_metadata_id" UUID NOT NULL REFERENCES "file_metadata"("id") ON DELETE CASCADE,
  "stem_type" TEXT NOT NULL,
  "event_data" JSONB NOT NULL, -- Cached TransientEvent[] and ChromaEvent[]
  "analysis_version" TEXT NOT NULL DEFAULT '1.0',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for audio event cache
CREATE INDEX "idx_audio_event_cache_user" ON "audio_event_cache" ("user_id");
CREATE INDEX "idx_audio_event_cache_file" ON "audio_event_cache" ("file_metadata_id", "stem_type");
CREATE INDEX "idx_audio_event_cache_version" ON "audio_event_cache" ("analysis_version");

-- Add unique constraint to prevent duplicate event cache
CREATE UNIQUE INDEX "idx_audio_event_cache_unique" 
  ON "audio_event_cache" ("file_metadata_id", "stem_type", "analysis_version");

-- Enable RLS for event_based_mappings table
ALTER TABLE "event_based_mappings" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own event mappings
CREATE POLICY "Users can access own event mappings" ON "event_based_mappings"
  FOR ALL 
  USING (user_id = auth.uid());

-- RLS Policy: Users can view event mappings for projects they have access to
CREATE POLICY "Users can view project event mappings" ON "event_based_mappings"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE "projects"."id" = "event_based_mappings"."project_id" 
      AND (
        "projects"."user_id" = auth.uid() OR
        "projects"."privacy_setting" = 'public' OR
        (
          "projects"."privacy_setting" = 'unlisted' AND
          EXISTS (
            SELECT 1 FROM "project_shares"
            WHERE "project_shares"."project_id" = "projects"."id"
          )
        )
      )
    )
  );

-- Enable RLS for audio_event_cache table
ALTER TABLE "audio_event_cache" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own audio event cache
CREATE POLICY "Users can access own audio event cache" ON "audio_event_cache"
  FOR ALL 
  USING (user_id = auth.uid());

-- Add trigger for updated_at on event_based_mappings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_based_mappings_updated_at 
  BEFORE UPDATE ON "event_based_mappings" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_event_cache_updated_at 
  BEFORE UPDATE ON "audio_event_cache" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE "event_based_mappings" IS 'Event-based audio feature mapping configurations for visualization control';
COMMENT ON COLUMN "event_based_mappings"."event_type" IS 'Type of audio event: transient, chroma, volume, or brightness';
COMMENT ON COLUMN "event_based_mappings"."target_parameter" IS 'Visualization parameter to control';
COMMENT ON COLUMN "event_based_mappings"."mapping_config" IS 'JSONB containing mapping transform, range, sensitivity, and envelope settings';

COMMENT ON TABLE "audio_event_cache" IS 'Cached audio event data for performance optimization';
COMMENT ON COLUMN "audio_event_cache"."event_data" IS 'JSONB containing pre-computed TransientEvent and ChromaEvent arrays';
COMMENT ON COLUMN "audio_event_cache"."stem_type" IS 'Type of audio stem: drums, bass, vocals, other, or master';