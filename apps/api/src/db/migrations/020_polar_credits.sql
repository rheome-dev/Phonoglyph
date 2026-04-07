-- Polar.SH credit system for usage-based billing
-- Adds credit packs to Raybox video renders

-- Add Polar customer ID and credits to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 5;

-- Ensure existing users get 5 free credits on first run
UPDATE users SET credits = 5 WHERE credits IS NULL;

-- credit_transactions table: tracks all credit movements
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,                    -- positive = purchase/grant, negative = spend
  type TEXT NOT NULL CHECK (type IN ('purchase', 'spend', 'refund', 'grant')),
  polar_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- renders table: tracks individual render jobs
CREATE TABLE IF NOT EXISTS renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  output_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  credits_spent INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_renders_user_id ON renders(user_id);
CREATE INDEX IF NOT EXISTS idx_renders_status ON renders(status);
CREATE INDEX IF NOT EXISTS idx_renders_created_at ON renders(created_at DESC);

-- RLS policies
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE renders ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions FOR SELECT
  USING (user_id = auth.uid());

-- Users can view their own renders
CREATE POLICY "Users can view own renders"
  ON renders FOR SELECT
  USING (user_id = auth.uid());

-- Service role can do everything (for webhook handlers and background jobs)
CREATE POLICY "Service role can manage credit transactions"
  ON credit_transactions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage renders"
  ON renders FOR ALL
  USING (auth.role() = 'service_role');

-- ── RPC Functions ──────────────────────────────────────────────────────────────

-- Atomic increment/decrement of user credits (returns new balance, NULL if user not found)
CREATE OR REPLACE FUNCTION increment_credits(uid UUID, amount INTEGER)
RETURNS INTEGER AS $$
  UPDATE users
  SET credits = GREATEST(credits + amount, 0)
  WHERE id = uid
  RETURNING credits;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic decrement with guard (only succeeds if credits >= |amount|)
CREATE OR REPLACE FUNCTION decrement_credits(uid UUID)
RETURNS INTEGER AS $$
  UPDATE users
  SET credits = GREATEST(credits - 1, 0)
  WHERE id = uid AND credits >= 1
  RETURNING credits;
$$ LANGUAGE plpgsql SECURITY DEFINER;
