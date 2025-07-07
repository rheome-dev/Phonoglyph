-- MIDI file processing table for storing parsed MIDI metadata
DROP TABLE IF EXISTS "file_metadata" CASCADE;
CREATE TABLE "file_metadata" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "file_name" VARCHAR(255) NOT NULL,
  "file_type" VARCHAR(20) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "file_size" INTEGER NOT NULL,
  "s3_key" VARCHAR(255) NOT NULL,
  "s3_bucket" VARCHAR(255) NOT NULL,
  "upload_status" VARCHAR(20) NOT NULL DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_file_metadata_user_id" ON "file_metadata"("user_id");
CREATE INDEX IF NOT EXISTS "idx_file_metadata_file_type" ON "file_metadata"("file_type");
CREATE INDEX IF NOT EXISTS "idx_file_metadata_created_at" ON "file_metadata"("created_at");

-- Enable RLS (Row Level Security) for user data protection
ALTER TABLE "file_metadata" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own files
CREATE POLICY "Users can access own files" ON "file_metadata"
  FOR ALL 
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on record changes
CREATE TRIGGER update_file_metadata_updated_at 
  BEFORE UPDATE ON "file_metadata" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 