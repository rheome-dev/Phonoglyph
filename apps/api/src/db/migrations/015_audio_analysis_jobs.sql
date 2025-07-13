-- Migration: 015_audio_analysis_jobs
-- Reason: Create a dedicated table for managing asynchronous audio analysis jobs,
-- improving performance by moving the slow analysis process to a background worker.

CREATE TABLE "audio_analysis_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "file_metadata_id" UUID NOT NULL REFERENCES "file_metadata"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  "error" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_audio_analysis_jobs_status" ON "audio_analysis_jobs"("status");
CREATE INDEX IF NOT EXISTS "idx_audio_analysis_jobs_created_at" ON "audio_analysis_jobs"("created_at");

-- Add RLS policies
ALTER TABLE "audio_analysis_jobs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own audio analysis jobs" ON "audio_analysis_jobs"
  FOR ALL
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at on record changes
CREATE OR REPLACE FUNCTION update_audio_analysis_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_audio_analysis_jobs_updated_at 
  BEFORE UPDATE ON "audio_analysis_jobs" 
  FOR EACH ROW EXECUTE FUNCTION update_audio_analysis_jobs_updated_at(); 