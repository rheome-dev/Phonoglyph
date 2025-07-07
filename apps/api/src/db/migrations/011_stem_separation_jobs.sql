-- Create stem separation jobs table
CREATE TABLE stem_separation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  config JSONB NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  estimated_time_remaining INTEGER,
  results JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies
ALTER TABLE stem_separation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stem separation jobs"
  ON stem_separation_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stem separation jobs"
  ON stem_separation_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stem separation jobs"
  ON stem_separation_jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stem_separation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_stem_separation_jobs_updated_at
  BEFORE UPDATE
  ON stem_separation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_stem_separation_jobs_updated_at(); 