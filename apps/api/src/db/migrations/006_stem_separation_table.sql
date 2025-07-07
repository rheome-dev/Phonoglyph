-- Stem separation processing table
CREATE TABLE "stem_separations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "file_metadata_id" UUID NOT NULL REFERENCES "file_metadata"(id) ON DELETE CASCADE,
  
  -- Processing status
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  "error_message" TEXT,
  
  -- Stem file paths in R2
  "drums_stem_key" VARCHAR(255),
  "bass_stem_key" VARCHAR(255),
  "vocals_stem_key" VARCHAR(255),
  "other_stem_key" VARCHAR(255),
  
  -- Processing metadata
  "model_version" VARCHAR(50) NOT NULL DEFAULT '5stems',
  "processing_duration" INTEGER, -- in seconds
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX "idx_stem_separations_user_id" ON "stem_separations"("user_id");
CREATE INDEX "idx_stem_separations_file_metadata_id" ON "stem_separations"("file_metadata_id");
CREATE INDEX "idx_stem_separations_status" ON "stem_separations"("status");
CREATE INDEX "idx_stem_separations_created_at" ON "stem_separations"("created_at");

-- Unique constraint to prevent duplicate processing
CREATE UNIQUE INDEX "idx_stem_separations_file" 
  ON "stem_separations"("file_metadata_id", "model_version");

-- Enable RLS (Row Level Security) for user data protection
ALTER TABLE "stem_separations" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own stem separations
CREATE POLICY "Users can access own stem separations" ON "stem_separations"
  FOR ALL 
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at on record changes
CREATE TRIGGER update_stem_separations_updated_at 
  BEFORE UPDATE ON "stem_separations" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 