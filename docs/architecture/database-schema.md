# Database Schema

## Authentication Tables (Managed by Supabase)

Supabase automatically manages authentication tables in the `auth` schema:
- `auth.users` - User authentication data
- `auth.sessions` - Session management  
- `auth.refresh_tokens` - Token refresh handling

## Application Tables

```sql
-- Projects Table
CREATE TABLE "projects" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "midi_file_path" TEXT NOT NULL,
  "audio_file_path" TEXT,
  "user_video_path" TEXT,
  "render_configuration" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
