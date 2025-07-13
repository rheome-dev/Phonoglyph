-- Audio analysis cache table for pre-computed stem analysis
CREATE TABLE "audio_analysis_cache" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "file_metadata_id" UUID NOT NULL REFERENCES "file_metadata"(id) ON DELETE CASCADE,
  "stem_type" VARCHAR(50) NOT NULL, -- 'drums', 'bass', 'vocals', 'other', 'master'
  
  -- Analysis metadata
  "analysis_version" VARCHAR(20) NOT NULL DEFAULT '1.0',
  "sample_rate" INTEGER NOT NULL,
  "duration" DECIMAL(10,3) NOT NULL, -- in seconds
  "buffer_size" INTEGER NOT NULL,
  "features_extracted" TEXT[] NOT NULL, -- array of feature names
  
  -- Cached analysis data (JSON)
  "analysis_data" JSONB NOT NULL, -- contains frequency data, time data, feature markers
  
  -- Waveform data for visualization
  "waveform_data" JSONB, -- contains waveform points and feature markers
  
  -- Performance metrics
  "analysis_duration" INTEGER, -- milliseconds
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX "idx_audio_analysis_cache_user_id" ON "audio_analysis_cache"("user_id");
CREATE INDEX "idx_audio_analysis_cache_file_metadata_id" ON "audio_analysis_cache"("file_metadata_id");
CREATE INDEX "idx_audio_analysis_cache_stem_type" ON "audio_analysis_cache"("stem_type");
CREATE INDEX "idx_audio_analysis_cache_created_at" ON "audio_analysis_cache"("created_at");

-- Unique constraint to prevent duplicate analysis
CREATE UNIQUE INDEX "idx_audio_analysis_cache_unique" 
  ON "audio_analysis_cache"("file_metadata_id", "stem_type", "analysis_version");

-- Enable RLS (Row Level Security) for user data protection
ALTER TABLE "audio_analysis_cache" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own audio analysis cache
CREATE POLICY "Users can access own audio analysis cache" ON "audio_analysis_cache"
  FOR ALL 
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at on record changes
CREATE TRIGGER update_audio_analysis_cache_updated_at 
  BEFORE UPDATE ON "audio_analysis_cache" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add analysis status to stem_separations table
ALTER TABLE "stem_separations" 
ADD COLUMN "analysis_status" VARCHAR(20) DEFAULT 'pending' 
  CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add analysis completion timestamp
ALTER TABLE "stem_separations" 
ADD COLUMN "analysis_completed_at" TIMESTAMP WITH TIME ZONE;

-- Create index for analysis status queries
CREATE INDEX "idx_stem_separations_analysis_status" ON "stem_separations"("analysis_status"); 