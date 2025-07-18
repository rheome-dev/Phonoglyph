-- Make midi_file_path optional in projects table
-- Migration: 016_make_midi_file_path_optional

-- Make midi_file_path optional by dropping NOT NULL constraint
ALTER TABLE "projects" 
ALTER COLUMN "midi_file_path" DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN "projects"."midi_file_path" IS 'Optional path to MIDI file. Projects can be created without MIDI files initially.'; 