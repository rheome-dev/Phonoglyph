-- MIDI file processing table for storing parsed MIDI metadata
DROP TABLE IF EXISTS "midi_files" CASCADE;
CREATE TABLE "midi_files" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "file_key" VARCHAR(255) NOT NULL,
  "original_filename" VARCHAR(255) NOT NULL,
  "file_size" INTEGER NOT NULL,
  
  -- Parsed MIDI metadata
  "duration_seconds" DECIMAL(10,3),
  "track_count" INTEGER,
  "note_count" INTEGER,
  "time_signature" VARCHAR(10),
  "key_signature" VARCHAR(10),
  "tempo_bpm" INTEGER,
  
  -- Processing status
  "parsing_status" VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'completed', 'failed')),
  "parsed_data" JSONB,
  "error_message" TEXT,
  
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "idx_midi_files_user_id" ON "midi_files"("user_id");
CREATE INDEX IF NOT EXISTS "idx_midi_files_file_key" ON "midi_files"("file_key");
CREATE INDEX IF NOT EXISTS "idx_midi_files_parsing_status" ON "midi_files"("parsing_status");
CREATE INDEX IF NOT EXISTS "idx_midi_files_created_at" ON "midi_files"("created_at");
CREATE INDEX IF NOT EXISTS "idx_midi_files_duration" ON "midi_files"("duration_seconds");

-- GIN index for efficient JSONB queries on parsed_data
CREATE INDEX IF NOT EXISTS "idx_midi_files_parsed_data" ON "midi_files" USING GIN ("parsed_data");

-- Unique constraint to prevent duplicate processing of same file
CREATE UNIQUE INDEX IF NOT EXISTS "idx_midi_files_user_file_key" ON "midi_files"("user_id", "file_key");

-- Enable RLS (Row Level Security) for user data protection
ALTER TABLE "midi_files" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own MIDI files
CREATE POLICY "Users can access own MIDI files" ON "midi_files"
  FOR ALL 
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at on record changes
CREATE TRIGGER update_midi_files_updated_at 
  BEFORE UPDATE ON "midi_files" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 