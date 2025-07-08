-- Create export status enum type
CREATE TYPE export_status AS ENUM (
  'queued',
  'rendering', 
  'uploading',
  'completed',
  'failed',
  'cancelled'
);

-- Create export jobs table
CREATE TABLE export_jobs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  composition_id TEXT NOT NULL,
  config JSONB NOT NULL,
  status export_status NOT NULL DEFAULT 'queued',
  progress FLOAT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  error_message TEXT,
  download_url TEXT,
  file_size BIGINT,
  duration_seconds FLOAT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);
CREATE INDEX idx_export_jobs_created_at ON export_jobs(created_at DESC);
CREATE INDEX idx_export_jobs_composition_id ON export_jobs(composition_id);

-- Add RLS policies
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own export jobs"
  ON export_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export jobs"
  ON export_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own export jobs"
  ON export_jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own export jobs"
  ON export_jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_export_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  
  -- Auto-set completed_at when status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_export_jobs_updated_at
  BEFORE UPDATE
  ON export_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_export_jobs_updated_at();

-- Create function to cleanup old export jobs (to be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_export_jobs(max_age_hours INTEGER DEFAULT 168) -- 7 days
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM export_jobs 
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 hour' * max_age_hours
    AND status IN ('completed', 'failed', 'cancelled');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ language 'plpgsql';