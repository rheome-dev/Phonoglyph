-- Edit States Table for Auto-Save Functionality
-- Migration: 017_edit_states

-- Create edit_states table for storing auto-save data
CREATE TABLE "edit_states" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "project_id" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_current" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX "idx_edit_states_user_project" ON "edit_states" ("user_id", "project_id");
CREATE INDEX "idx_edit_states_current" ON "edit_states" ("is_current") WHERE "is_current" = true;
CREATE INDEX "idx_edit_states_timestamp" ON "edit_states" ("timestamp");
CREATE INDEX "idx_edit_states_version" ON "edit_states" ("version");

-- Enable RLS for edit_states table
ALTER TABLE "edit_states" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own edit states
CREATE POLICY "Users can access own edit states" ON "edit_states"
  FOR ALL 
  USING (user_id = auth.uid());

-- RLS Policy: Users can view edit states for projects they have access to
CREATE POLICY "Users can view project edit states" ON "edit_states"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "projects" 
      WHERE "projects"."id" = "edit_states"."project_id" 
      AND (
        "projects"."user_id" = auth.uid() OR
        "projects"."privacy_setting" = 'public' OR
        (
          "projects"."privacy_setting" = 'unlisted' AND
          EXISTS (
            SELECT 1 FROM "project_shares"
            WHERE "project_shares"."project_id" = "projects"."id"
          )
        )
      )
    )
  );

-- Add trigger for updated_at (though we don't have an updated_at column, keeping consistent with other tables)
-- Note: edit_states uses timestamp field for tracking when the state was saved

-- Add comments for documentation
COMMENT ON TABLE "edit_states" IS 'Stores auto-save states for user editing sessions';
COMMENT ON COLUMN "edit_states"."user_id" IS 'Reference to authenticated user';
COMMENT ON COLUMN "edit_states"."project_id" IS 'Reference to the project being edited';
COMMENT ON COLUMN "edit_states"."timestamp" IS 'When this edit state was saved';
COMMENT ON COLUMN "edit_states"."data" IS 'JSONB containing visualization parameters, stem mappings, effect settings, and timeline state';
COMMENT ON COLUMN "edit_states"."version" IS 'Version number for conflict resolution';
COMMENT ON COLUMN "edit_states"."is_current" IS 'Indicates if this is the most recent state for the project'; 