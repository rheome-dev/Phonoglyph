-- Migration: 022_render_expiration
-- Add expiration tracking for S3 render files to manage storage costs.
-- Rendered videos expire after 30 days by default.
-- Users can re-render to regenerate expired videos.

ALTER TABLE "renders" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "idx_renders_expires_at" ON "renders"("expires_at");

-- Renders table already has these policies from 021_renders_table.sql
-- This migration only adds the expires_at column, no new RLS policies needed
