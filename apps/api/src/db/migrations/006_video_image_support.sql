-- Migration: 006_video_image_support
-- Extend file_metadata table for video and image assets

-- Create file_type enum (if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE file_type_enum AS ENUM ('midi', 'audio', 'video', 'image');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- If enum exists but missing values, add them
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'video' AND enumtypid = 'file_type_enum'::regtype) THEN
        ALTER TYPE file_type_enum ADD VALUE 'video';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'image' AND enumtypid = 'file_type_enum'::regtype) THEN
        ALTER TYPE file_type_enum ADD VALUE 'image';
    END IF;
EXCEPTION
    WHEN others THEN
        -- If enum doesn't exist, create it with all values
        DROP TYPE IF EXISTS file_type_enum;
        CREATE TYPE file_type_enum AS ENUM ('midi', 'audio', 'video', 'image');
END $$;

-- Convert file_type column from VARCHAR to enum (if not already)
DO $$
BEGIN
    -- Check if column is already the correct type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'file_metadata' 
        AND column_name = 'file_type' 
        AND data_type = 'character varying'
    ) THEN
        -- Convert VARCHAR to enum
        ALTER TABLE file_metadata 
        ALTER COLUMN file_type TYPE file_type_enum USING file_type::file_type_enum;
    END IF;
END $$;

-- Add new columns for video and image metadata
ALTER TABLE file_metadata 
ADD COLUMN IF NOT EXISTS video_metadata JSONB,     -- Duration, resolution, frame rate, codec
ADD COLUMN IF NOT EXISTS image_metadata JSONB,     -- Dimensions, color profile, orientation  
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,       -- Generated thumbnail/poster URL
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'completed' CHECK (
  processing_status IN ('pending', 'processing', 'completed', 'failed')
);

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS "idx_file_metadata_processing_status" ON "file_metadata"("processing_status");
CREATE INDEX IF NOT EXISTS "idx_file_metadata_thumbnail_url" ON "file_metadata"("thumbnail_url") WHERE thumbnail_url IS NOT NULL; 