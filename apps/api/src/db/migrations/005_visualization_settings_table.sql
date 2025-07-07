-- User visualization preferences table
CREATE TABLE "visualization_settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "midi_file_id" UUID NOT NULL REFERENCES "midi_files"(id) ON DELETE CASCADE,
  
  -- Visualization preferences
  "color_scheme" VARCHAR(20) NOT NULL DEFAULT 'mixed' CHECK (color_scheme IN ('sage', 'slate', 'dusty-rose', 'mixed')),
  "pixels_per_second" INTEGER NOT NULL DEFAULT 50 CHECK (pixels_per_second >= 10 AND pixels_per_second <= 200),
  "show_track_labels" BOOLEAN NOT NULL DEFAULT true,
  "show_velocity" BOOLEAN NOT NULL DEFAULT true,
  "min_key" INTEGER NOT NULL DEFAULT 21 CHECK (min_key >= 0 AND min_key <= 127),
  "max_key" INTEGER NOT NULL DEFAULT 108 CHECK (max_key >= 0 AND max_key <= 127),
  
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure key range is valid
  CONSTRAINT "valid_key_range" CHECK (min_key <= max_key)
);

-- Create indexes for efficient queries
CREATE INDEX "idx_visualization_settings_user_id" ON "visualization_settings"("user_id");
CREATE INDEX "idx_visualization_settings_midi_file_id" ON "visualization_settings"("midi_file_id");
CREATE INDEX "idx_visualization_settings_created_at" ON "visualization_settings"("created_at");

-- Unique constraint: one settings record per user per MIDI file
CREATE UNIQUE INDEX "idx_visualization_settings_user_midi_file" 
  ON "visualization_settings"("user_id", "midi_file_id");

-- Enable RLS (Row Level Security) for user data protection
ALTER TABLE "visualization_settings" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own visualization settings
CREATE POLICY "Users can access own visualization settings" ON "visualization_settings"
  FOR ALL 
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at on record changes
CREATE TRIGGER update_visualization_settings_updated_at 
  BEFORE UPDATE ON "visualization_settings" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 