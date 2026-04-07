-- Polar.SH credit system: fix for user_profiles table
-- Run AFTER migration 020_polar_credits.sql
-- (020 already created credit_transactions and renders tables)

-- Add Polar customer ID and credits columns to user_profiles
-- (polar_credits migration tried to add to non-existent 'users' table)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 5;

-- Ensure existing users get 5 free credits on first run
UPDATE user_profiles SET credits = 5 WHERE credits IS NULL;

-- ── RPC Functions ──────────────────────────────────────────────────────────────
-- (polar_credits migration tried to create these with wrong table reference)

-- Atomic increment of user credits (returns new balance, NULL if user not found)
CREATE OR REPLACE FUNCTION increment_credits(uid UUID, amount INTEGER)
RETURNS INTEGER AS $$
  UPDATE user_profiles
  SET credits = GREATEST(credits + amount, 0)
  WHERE id = uid
  RETURNING credits;
$$ LANGUAGE sql SECURITY DEFINER;

-- Atomic decrement with guard (only succeeds if credits >= 1)
CREATE OR REPLACE FUNCTION decrement_credits(uid UUID)
RETURNS INTEGER AS $$
  UPDATE user_profiles
  SET credits = GREATEST(credits - 1, 0)
  WHERE id = uid AND credits >= 1
  RETURNING credits;
$$ LANGUAGE sql SECURITY DEFINER;
