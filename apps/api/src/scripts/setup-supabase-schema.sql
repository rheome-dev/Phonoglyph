-- MIDI Visualization Database Schema Setup
-- Execute this script in your Supabase SQL Editor

-- ===================================================================
-- MIDI FILES TABLE
-- ===================================================================

-- MIDI file processing table for storing parsed MIDI metadata
CREATE TABLE IF NOT EXISTS "midi_files" (
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
  "parsing_status" VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (parsing_status IN ('pending', 'completed', 'failed')),
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
CREATE UNIQUE INDEX IF NOT EXISTS "idx_midi_files_user_file_key" 
  ON "midi_files"("user_id", "file_key");

-- Enable RLS (Row Level Security) for user data protection
ALTER TABLE "midi_files" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own MIDI files
DROP POLICY IF EXISTS "Users can access own MIDI files" ON "midi_files";
CREATE POLICY "Users can access own MIDI files" ON "midi_files"
  FOR ALL USING (auth.uid() = user_id);

-- ===================================================================
-- VISUALIZATION SETTINGS TABLE  
-- ===================================================================

-- User visualization preferences table
CREATE TABLE IF NOT EXISTS "visualization_settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "midi_file_id" UUID NOT NULL REFERENCES "midi_files"(id) ON DELETE CASCADE,
  
  -- Visualization preferences
  "color_scheme" VARCHAR(20) NOT NULL DEFAULT 'mixed' 
    CHECK (color_scheme IN ('sage', 'slate', 'dusty-rose', 'mixed')),
  "pixels_per_second" INTEGER NOT NULL DEFAULT 50 
    CHECK (pixels_per_second >= 10 AND pixels_per_second <= 200),
  "show_track_labels" BOOLEAN NOT NULL DEFAULT true,
  "show_velocity" BOOLEAN NOT NULL DEFAULT true,
  "min_key" INTEGER NOT NULL DEFAULT 21 
    CHECK (min_key >= 0 AND min_key <= 127),
  "max_key" INTEGER NOT NULL DEFAULT 108 
    CHECK (max_key >= 0 AND max_key <= 127),
  
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure key range is valid
  CONSTRAINT "valid_key_range" CHECK (min_key <= max_key)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "idx_visualization_settings_user_id" 
  ON "visualization_settings"("user_id");
CREATE INDEX IF NOT EXISTS "idx_visualization_settings_midi_file_id" 
  ON "visualization_settings"("midi_file_id");
CREATE INDEX IF NOT EXISTS "idx_visualization_settings_created_at" 
  ON "visualization_settings"("created_at");

-- Unique constraint: one settings record per user per MIDI file
CREATE UNIQUE INDEX IF NOT EXISTS "idx_visualization_settings_user_midi_file" 
  ON "visualization_settings"("user_id", "midi_file_id");

-- Enable RLS (Row Level Security) for user data protection
ALTER TABLE "visualization_settings" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own visualization settings
DROP POLICY IF EXISTS "Users can access own visualization settings" ON "visualization_settings";
CREATE POLICY "Users can access own visualization settings" ON "visualization_settings"
  FOR ALL USING (auth.uid() = user_id);

-- ===================================================================
-- UPDATE TRIGGERS
-- ===================================================================

-- Function to automatically update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on midi_files changes
DROP TRIGGER IF EXISTS update_midi_files_updated_at ON "midi_files";
CREATE TRIGGER update_midi_files_updated_at 
  BEFORE UPDATE ON "midi_files" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on visualization_settings changes
DROP TRIGGER IF EXISTS update_visualization_settings_updated_at ON "visualization_settings";
CREATE TRIGGER update_visualization_settings_updated_at 
  BEFORE UPDATE ON "visualization_settings" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Verify tables were created successfully
SELECT 
  schemaname,
  tablename,
  tableowner,
  tablespace,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename IN ('midi_files', 'visualization_settings')
  AND schemaname = 'public';

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('midi_files', 'visualization_settings')
  AND schemaname = 'public';

-- List all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('midi_files', 'visualization_settings');

-- ===================================================================
-- COMPLETION MESSAGE
-- ===================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 MIDI Visualization database schema setup completed successfully!';
  RAISE NOTICE '✅ Created tables: midi_files, visualization_settings';
  RAISE NOTICE '✅ Created indexes for optimal query performance';
  RAISE NOTICE '✅ Enabled Row Level Security (RLS)';
  RAISE NOTICE '✅ Created policies for user data protection';
  RAISE NOTICE '✅ Set up automatic timestamp triggers';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Your database is now ready for MIDI file processing and visualization!';
END $$; 