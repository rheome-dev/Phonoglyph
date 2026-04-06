-- Migration: 020_user_credits
-- Add credit balance to user profiles for render credits system

-- Add credit_balance column to user_profiles
ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "credit_balance" INTEGER NOT NULL DEFAULT 10 CHECK (credit_balance >= 0);

-- Set initial credits for existing users who don't have a value yet
UPDATE "user_profiles"
  SET "credit_balance" = 10
  WHERE "credit_balance" IS NULL;

-- Ensure no nulls exist (DB-level safeguard)
ALTER TABLE "user_profiles"
  ALTER COLUMN "credit_balance" SET DEFAULT 10;

-- Index for fast balance lookups
CREATE INDEX IF NOT EXISTS "idx_user_profiles_credit_balance" ON "user_profiles"("credit_balance");
