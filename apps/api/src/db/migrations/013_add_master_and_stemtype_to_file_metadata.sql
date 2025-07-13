-- Migration: 013_add_master_and_stemtype_to_file_metadata.sql
-- Adds is_master (boolean) and stem_type (varchar) columns to file_metadata for stem project support

ALTER TABLE "file_metadata"
  ADD COLUMN IF NOT EXISTS "is_master" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "stem_type" VARCHAR(32);

-- Optionally, add an index for faster queries by stem_type or is_master
CREATE INDEX IF NOT EXISTS "idx_file_metadata_stem_type" ON "file_metadata"("stem_type");
CREATE INDEX IF NOT EXISTS "idx_file_metadata_is_master" ON "file_metadata"("is_master"); 