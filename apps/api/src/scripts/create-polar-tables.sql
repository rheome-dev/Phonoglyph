-- Polar.SH Integration: Add credits and payment tracking tables
-- Run this SQL against your Supabase database (via Supabase dashboard or CLI)

-- Add polar_customer_id and credits columns to users table
ALTER TABLE users ADD COLUMN polar_customer_id TEXT;
ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 5;

-- Create credit_transactions table to track all credit changes
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'spend', 'refund', 'grant')),
  polar_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create renders table to track video renders
CREATE TABLE IF NOT EXISTS renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  project_id UUID,
  output_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  credits_spent INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key for renders.project_id → projects(id) if projects table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    ALTER TABLE renders ADD CONSTRAINT fk_renders_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  -- Skip if constraint already exists or table doesn't exist
  NULL;
END $$;

-- Create increment_credits function (atomic increment)
CREATE OR REPLACE FUNCTION increment_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER AS $$
  UPDATE users SET credits = credits + p_amount WHERE id = p_user_id RETURNING credits;
$$ LANGUAGE sql SECURITY DEFINER;

-- Create decrement_credits function (atomic decrement with floor of 0)
CREATE OR REPLACE FUNCTION decrement_credits(p_user_id UUID)
RETURNS INTEGER AS $$
  UPDATE users SET credits = GREATEST(credits - 1, 0) WHERE id = p_user_id RETURNING credits;
$$ LANGUAGE sql SECURITY DEFINER;

-- Create index for faster user credit lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_renders_user_id ON renders(user_id);
CREATE INDEX IF NOT EXISTS idx_renders_status ON renders(status);
