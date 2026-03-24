-- API Keys for CLI/programmatic access
-- Allows non-interactive authentication without Supabase OAuth

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Store SHA-256 hash of the key, never the raw key
  key_hash TEXT NOT NULL UNIQUE,
  -- Prefix for identification (first 8 chars of key, e.g. "rbox_abc1")
  key_prefix TEXT NOT NULL,
  -- Scopes limit what the key can do
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read', 'write', 'render'],
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast key lookup during auth
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- RLS policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own API keys
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own API keys
CREATE POLICY "Users can create own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own API keys (for revoking)
CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can read all keys (for auth validation)
CREATE POLICY "Service role can read all API keys"
  ON api_keys FOR SELECT
  USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();
