# External Integrations

**Analysis Date:** 2026-02-24

## APIs & External Services

**Supabase (Authentication & Database):**
- Service: Supabase - Backend-as-a-Service (PostgreSQL + Auth)
- What it's used for: User authentication, database (users, files, projects), Row-Level Security (RLS)
- Client: `@supabase/supabase-js` v2.50.2
- Server client: `@supabase/ssr` v0.6.1
- Auth: Via `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend) and `SUPABASE_SERVICE_ROLE_KEY` (backend)
- Implementation:
  - Frontend: `apps/web/src/lib/supabase.ts`
  - Backend: `apps/api/src/lib/supabase.ts`
  - Server context: `apps/api/src/trpc.ts` - Creates authenticated context per request

**Cloudflare R2 (File Storage):**
- Service: Cloudflare R2 - S3-compatible object storage
- What it's used for: Storing audio files, MIDI files, video exports, thumbnails
- SDK/Client: `@aws-sdk/client-s3` v3.490.0 (AWS SDK with Cloudflare endpoint)
- Presigner: `@aws-sdk/s3-request-presigner` v3.490.0 (for pre-signed URLs)
- Auth:
  - `CLOUDFLARE_ACCOUNT_ID` - R2 account identifier
  - `CLOUDFLARE_R2_ACCESS_KEY_ID` - Access key for S3 operations
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - Secret key for S3 operations
- Config:
  - Endpoint: `https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
  - Region: `auto` (R2-specific)
  - forcePathStyle: `true` (required for R2)
  - Bucket: `phonoglyph-uploads`
- Implementation: `apps/api/src/services/r2-storage.ts`
- CORS Configuration: Ports 3000 (Next.js), 3001 (API), 3031 (Remotion Studio) are whitelisted

**RunPod Serverless (GPU Processing):**
- Service: RunPod - Serverless GPU infrastructure
- What it's used for: Audio stem separation with Spleeter model
- API Key: `RUNPOD_API_KEY`
- Endpoint: Integrated with stem separation pipeline
- Implementation: `apps/api/src/services/stem-separator.ts` uses Spleeter model variants (2stems, 4stems, 5stems)

**Remotion Lambda (Video Export):**
- Service: AWS Lambda via Remotion Lambda - Serverless video rendering
- What it's used for: Rendering visualizations to MP4 video files at scale
- SDK: `@remotion/lambda` v4.0.390
- Configuration:
  - Renderer: Software rendering via `swangle` (`chromiumOptions.gl = 'swangle'`)
  - Entry point: `apps/web/src/remotion/index.ts` (must call `registerRoot()`)
  - Composition: `RayboxComposition.tsx` with `RemotionOverlayRenderer.tsx`
- Implementation: `apps/api/src/routers/render.ts`
- CLI: `@remotion/cli` v4.0.390 for local development

## Data Storage

**Databases:**
- PostgreSQL via Supabase
  - Connection: `DATABASE_URL` (pooled connection via Supabase)
  - Client: `pg` v8.11.3 (node-postgres)
  - Migrations: `apps/api/src/db/migrations/` (SQL files, run via `pnpm db:migrate`)
  - Tables:
    - `auth.users` - Supabase auth (system table)
    - `public.file_metadata` - File records with mime type, size, S3 key
    - `public.stem_separation_jobs` - Async stem separation job tracking
    - `public.projects` - Project metadata
    - `public.midi_files` - MIDI file metadata
    - `public.visualization_settings` - User preset configurations
    - `public.audio_analysis_cache` - Cached audio feature data
    - `public.audio_analysis_jobs` - Async audio analysis job tracking
  - Security: Row-Level Security (RLS) policies enforced per user

**File Storage:**
- Cloudflare R2 (S3-compatible)
  - Primary storage for user-uploaded files (audio, MIDI, video)
  - Bucket: `phonoglyph-uploads`
  - Pre-signed URLs generated server-side for secure access
  - Expiration: Not specified in code (uses AWS SDK defaults)
  - Thumbnails stored with `_thumb` suffix

**Caching:**
- In-memory state: Zustand stores in browser (visualizerStore, timelineStore, projectSettingsStore)
- Audio analysis cache: Stored in PostgreSQL `audio_analysis_cache` table
- No Redis/Memcached detected

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (managed PostgreSQL auth)
- Implementation approach:
  - Frontend: `@supabase/supabase-js` client with session management
  - Backend: Token-based with `Authorization: Bearer {token}` header
  - Context extraction: `apps/api/src/trpc.ts` extracts token from Authorization header
  - User transformation: `phonoglyph-types` package provides `transformSupabaseUser()` utility

**Guest Sessions:**
- Supported via `GuestUser` type
- Session extraction: `apps/api/src/types/guest.ts` manages guest session IDs
- Fallback: If no authenticated user, guest session is created
- Validation: `isValidGuestSession()` ensures session legitimacy

**Session Management:**
- Frontend: Token stored in Supabase client
- Backend: Token passed per-request in Authorization header
- tRPC context: `apps/api/src/trpc.ts` creates context with `user`, `session`, `isGuest` flags

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, DataDog, or similar integration

**Logging:**
- Custom logger: `apps/api/src/lib/logger.ts` (implementation present but contents not analyzed)
- Debug logging: Controlled via `DEBUG_LOGGING` (backend) and `NEXT_PUBLIC_DEBUG_LOGGING` (frontend)
- Backend logs include: authentication, database operations, R2 storage, stem separation, tRPC errors
- Frontend logs: Disabled in production

## CI/CD & Deployment

**Hosting:**
- Frontend: Vercel (detected via `process.env.VERCEL` checks)
- Backend: Vercel (Express app exported for Vercel serverless)
- Video rendering: AWS Lambda via Remotion Lambda

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or similar configuration found
- Manual deployment assumed (Vercel auto-deploys on git push)

**Database Migrations:**
- Manual execution: `pnpm --filter @phonoglyph/api db:migrate`
- Migration files: `apps/api/src/db/migrations/*.sql`
- Seed data: `pnpm --filter @phonoglyph/api db:seed` (for development)

**Build Process:**
- Frontend: `next build` → `next start` (Vercel handles deployment)
- Backend: `tsc` (TypeScript compilation) → `node dist/index.js` (or Vercel serverless)

## Environment Configuration

**Required env vars (Frontend - .env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ahqgihozxzpyxrgesnxm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Required env vars (Backend - .env):**
```bash
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000,...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET=phonoglyph-uploads
RUNPOD_API_KEY=...
JWT_SECRET=...
MAX_MIDI_FILE_SIZE=5242880
MAX_AUDIO_FILE_SIZE=52428800
MAX_VIDEO_FILE_SIZE=524288000
```

**Secrets location:**
- `.env` file (local development, **NOT committed** via `.gitignore`)
- Environment variables set in deployment platform (Vercel):
  - For Vercel: Project settings → Environment Variables
  - Auto-injected: `VERCEL`, `VERCEL_ENV`, `VERCEL_URL` (Vercel platform variables)

## Webhooks & Callbacks

**Incoming:**
- None detected - No webhook endpoints for external services

**Outgoing:**
- Stem separation status updates: Async job tracking via database polling (not webhooks)
- Video render progress: Queried via `getRenderProgress()` in `@remotion/lambda`
- No external service callbacks detected

## API Routes & Endpoints

**tRPC Routers** (type-safe, auto-discovered):
- Mounted at: `/api/trpc` on Express server
- Authentication context: Applied per-procedure in `apps/api/src/trpc.ts`

**Routers defined in `apps/api/src/routers/`:**
- `auth.ts` - Session, user info
- `user.ts` - User profile operations
- `project.ts` - Project CRUD
- `file.ts` - File upload/download, metadata
- `midi.ts` - MIDI file operations
- `stem.ts` - Audio stem separation jobs
- `render.ts` - Video rendering via Remotion Lambda
- `audio-analysis-sandbox.ts` - Real-time audio feature extraction
- `auto-save.ts` - Auto-save project state
- `asset.ts` - Asset management
- `guest.ts` - Guest session operations
- `health.ts` - Health check endpoint

**Health Check Endpoint:**
- `GET /health` - Returns status, timestamp, environment

**Test Endpoint:**
- `POST /test` - Echo endpoint for debugging

## CORS & Security

**CORS Configuration** (`apps/api/src/index.ts`):
- Allowed origins (development): `http://localhost:3000`, `http://127.0.0.1:3000`
- Allowed origins (production):
  - `https://phonoglyph.rheome.tools`
  - `https://www.phonoglyph.rheome.tools`
  - `https://phonoglyph.vercel.app`
  - Vercel preview URLs: `https://phonoglyph-*.vercel.app`
- Credentials: Enabled (`credentials: true`)
- Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD
- Max age: 86400 seconds (24 hours)

**Security Headers:**
- Helmet.js middleware applied globally
- Content-Type normalization for duplicate headers

---

*Integration audit: 2026-02-24*
