# CLAUDE.md

## MANDATORY: Use td for Task Management

You must run `td usage --new-session` at conversation start (or after /clear) to see current work.
Use `td usage -q` for subsequent reads.

## GSD + TD Workflow

This project uses **GSD** (Goal Structuring Driveworks) agents with **TD** for structured task management.

### GSD Agents (invoke via /gsd commands)

| Command | Purpose |
|---------|---------|
| `/gsd:new-project` | Create new project roadmap with research, planning phases |
| `/gsd:plan-phase` | Plan implementation strategy for a specific phase |
| `/gsd:execute-phase` | Execute planned phase with atomic commits |
| `/gsd:debug` | Investigate bugs using scientific method |
| `/gsd:map-codebase` | Explore and document codebase structure |

### GSD + TD Integration

**Workflow:**
1. Use GSD agents to research, plan, and structure work
2. GSD outputs create issues in TD automatically
3. Use TD commands to track and execute individual tasks

**TD Commands:**
```bash
td usage              # See current state (run at session start)
td usage -q           # Quiet mode for quick reads
td next               # Highest priority open issue
td start <id>         # Begin work on an issue
td log "message"      # Log progress
td handoff <id>       # Capture state for next session (REQUIRED before stopping)
td review <id>       # Submit for review
td approve <id>      # Complete after review
```

**Session Rules:**
- Always run `td usage --new-session` at conversation start
- Always run `td handoff` before stopping work
- Never approve issues you implemented (different session required)

## CORS-Allowed Ports (Cloudflare R2)

Only these localhost ports are whitelisted in the R2 CORS policy:

| Port | Service | Command |
|------|---------|---------|
| 3000 | Next.js frontend | `pnpm --filter @phonoglyph/web dev` |
| 3001 | Express API | `pnpm --filter @phonoglyph/api dev` |
| 3031 | Remotion Studio | `cd apps/web && pnpm remotion studio src/remotion/index.ts --port 3031` |

**IMPORTANT:** If you start Remotion on any other port (e.g., 3333), R2 fetches will fail with CORS errors. Always use `--port 3031` for Remotion.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Practicum Context (Auto-load)

When starting a work session in this codebase, ALWAYS load these files into context:

1. **PRACTICUM_PLAN.md** — The main practicum plan with weekly milestones, learning objectives, and evaluation criteria
2. **WORK_SESSIONS.md** — Session log tracking hours, tasks, and progress

Both files are symlinked from this codebase to your LifeOS vault:
- `PRACTICUM_PLAN.md` → `School/Organizational Practicum/RAYBOX_PRACTICUM_PLAN.md`
- `WORK_SESSIONS.md` → `School/Organizational Practicum/WORK_SESSIONS.md`

### Session Workflow

**At session START:**
1. Read WORK_SESSIONS.md to see current progress and hours logged
2. Reference PRACTICUM_PLAN.md for the current week's milestones
3. Acknowledge the current status to the user

**At session END (before the user leaves):**
1. Ask the user if they want to log this work session
2. If yes, prompt for:
   - Duration (or estimate from session time if they want)
   - Task category (TECH-1 through TECH-4, GTM-1 through GTM-4, MTG, ADMIN)
   - Brief description of what was accomplished
3. Update WORK_SESSIONS.md with the session entry
4. Update the total hours at the top of the file

**When user asks to commit/push:**
- After committing and pushing, ALWAYS ask: "Would you like me to log this work session to WORK_SESSIONS.md?"
- If yes, parse the session JSONL to get:
  - Session start time (first message timestamp)
  - Session end time (last message timestamp)
  - Duration in hours
  - What was accomplished (from commit messages made during session)
- Log to WORK_SESSIONS.md with appropriate task category

## Project Overview

**Phonoglyph** (formerly Raybox) is a full-stack MIDI visualization platform that transforms audio files into stunning visual experiences. The application performs audio stem separation (drums, bass, vocals, melody), generates real-time audio-reactive visualizations using WebGL/Three.js, and exports high-quality videos via Remotion.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript 5.3.3, Tailwind CSS, Zustand (state)
- **Backend**: Express.js, TypeScript, tRPC (type-safe APIs)
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Video Export**: Remotion 4.0
- **3D Graphics**: Three.js, WebGL shaders
- **Audio Analysis**: Meyda, web-audio-beat-detector, fluent-ffmpeg (stem separation)

## Monorepo Structure

This is a **pnpm workspace** monorepo:

```
apps/
  web/          # Next.js frontend with visualizer
  api/          # Express + tRPC backend
  stem-api/     # Audio stem separation service
packages/
  types/        # Shared TypeScript types (phonoglyph-types)
  config/       # Shared configurations
```

## Common Commands

### Development

```bash
# Install dependencies (use pnpm, NOT npm)
pnpm install

# Start both frontend and backend in dev mode
pnpm dev

# Start frontend only (port 3000)
pnpm --filter @phonoglyph/web dev

# Start backend API only (port 3001)
pnpm --filter @phonoglyph/api dev
```

### Building

```bash
# Build all apps
pnpm build

# Build specific app
pnpm --filter @phonoglyph/web build
pnpm --filter @phonoglyph/api build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific workspace
pnpm --filter @phonoglyph/web test
pnpm --filter @phonoglyph/api test

# Run tests with coverage
pnpm --filter @phonoglyph/web test:coverage
```

### Database (Backend)

```bash
# Run migrations
pnpm --filter @phonoglyph/api db:migrate

# Seed database with development data
pnpm --filter @phonoglyph/api db:seed

# Run both migrations and seed
pnpm --filter @phonoglyph/api db:setup
```

### Type Checking

```bash
# Type check without emitting files
pnpm --filter @phonoglyph/web type-check
pnpm --filter @phonoglyph/api type-check
```

### Linting

```bash
# Lint all workspaces
pnpm lint

# Lint specific workspace
pnpm --filter @phonoglyph/web lint
```

### Remotion (Video Export)

```bash
# Start Remotion studio (development preview)
# MUST use port 3031 for R2 CORS compatibility
cd apps/web
pnpm remotion studio src/remotion/index.ts --port 3031

# IMPORTANT: Use index.ts (not Root.tsx) - it contains registerRoot()
# If you see "Waiting for registerRoot()", you're using the wrong entry point

# Render video locally (use composition ID, not file path)
pnpm remotion render src/remotion/index.ts RayboxMain --props='{}' -o out.mp4
```

### 🚨 MANDATORY: Redeploy to S3 After Lambda-Affecting Changes

Any changes to files in `apps/web/src/remotion/` or `apps/web/src/lib/visualizer/` affect the Lambda rendering pipeline. **After committing and pushing, you MUST redeploy the Remotion site bundle to S3** or Lambda renders will continue using the old code.

```bash
cd apps/web
npx remotion lambda sites create src/remotion/index.ts --site-name=raybox-renderer
```

The serve URL (`https://remotionlambda-useast1-zq6uoa8xhi.s3.us-east-1.amazonaws.com/sites/raybox-renderer/`) stays the same — no code changes needed after redeploy.

**Files that require S3 redeploy when changed:**
- `apps/web/src/remotion/**` — compositions, entry points, overlay renderers
- `apps/web/src/lib/visualizer/**` — effects, core pipeline, shaders
- `apps/web/remotion.config.ts` — Remotion configuration

## Architecture Deep Dive

### GPU-Based Multi-Layer Compositing System

**Critical Innovation**: The visualizer uses a GPU-based compositing architecture (documented in `docs/gpu-compositing-architecture.md`) that processes 20+ layers at 60fps, unlike traditional CPU-based approaches.

**Core Components** (all in `apps/web/src/lib/visualizer/core/`):

1. **VisualizerManager.ts** - Main orchestrator, lifecycle management
2. **AudioTextureManager.ts** - Packs audio features into GPU textures for shader access (eliminates per-frame uniform updates)
3. **MultiLayerCompositor.ts** - GPU shader-based layer blending using WebGL render targets (no CPU `drawImage()` calls)
4. **MediaLayerManager.ts** - Bridges 2D canvas/video elements with GPU pipeline

**Effects System** (`apps/web/src/lib/visualizer/effects/`):
- 40+ shader-based effects (BloomEffect, GlitchEffect, ParticleNetworkEffect, etc.)
- All effects extend `BaseShaderEffect.ts`
- Effects use audio-reactive uniforms updated via GPU textures

**Key Performance Pattern**:
```typescript
// ❌ Old CPU approach (slow)
context.drawImage(layer1, 0, 0); // GPU → CPU → GPU transfer
context.drawImage(layer2, 0, 0);

// ✅ Our GPU approach (fast)
renderer.setRenderTarget(layer.renderTarget); // Pure GPU operations
renderer.render(layer.scene, layer.camera);
compositor.compositeLayersToMain(); // Shader-based blending
```

### State Management

Three main Zustand stores in `apps/web/src/stores/`:

1. **visualizerStore.ts** - Visualizer settings, effects, audio-reactive parameters
2. **timelineStore.ts** - Playback state, timeline position, layer keyframes
3. **projectSettingsStore.ts** - Project-level configuration, export settings

### API Architecture (tRPC)

The backend uses **tRPC** for type-safe APIs. Routers are in `apps/api/src/routers/`:

- `auth.ts` - Supabase authentication
- `file.ts` - File uploads to R2, metadata management
- `stem.ts` - Audio stem separation operations
- `audio-analysis-sandbox.ts` - Audio feature extraction
- `render.ts` - Remotion video rendering
- `project.ts`, `midi.ts`, `user.ts` - CRUD operations

**Important**: All API types are automatically inferred from tRPC router definitions. The frontend gets full type safety without manual type definitions.

### Database Schema

PostgreSQL migrations in `apps/api/src/db/migrations/`:

- `001_initial_schema.sql` - Users, files, projects base tables
- `002_supabase_auth_integration.sql` - Supabase auth integration
- `003_file_metadata_table.sql` - File storage metadata
- `004_midi_files_table.sql` - MIDI file support
- `005_visualization_settings_table.sql` - Visualizer presets

To add a migration, create a new `.sql` file in sequence and run `pnpm --filter @phonoglyph/api db:migrate`.

### Video Export Pipeline (Remotion)

Remotion compositions in `apps/web/src/remotion/`:

- `index.ts` - **Entry point** (calls `registerRoot()`) - always use this for CLI commands
- `Root.tsx` - Composition registry (exports `RemotionRoot`)
- `RayboxComposition.tsx` - Main video composition
- `RemotionOverlayRenderer.tsx` - Renders visualizer layers frame-by-frame

**Key Configuration**: `apps/web/remotion.config.ts` sets `chromiumOptions.gl = 'swangle'` for deterministic rendering in headless environments.

## Environment Setup

### Backend (.env in apps/api/)

```bash
cp apps/api/env.example apps/api/.env
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side)
- `DATABASE_URL` - PostgreSQL connection string
- `CLOUDFLARE_R2_*` - R2 storage credentials

### Frontend (.env.local in apps/web/)

```bash
cp apps/web/.env.example apps/web/.env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (default: http://localhost:3001)

## Key Implementation Patterns

### Adding a New Visualizer Effect

1. Create effect file in `apps/web/src/lib/visualizer/effects/YourEffect.ts`
2. Extend `BaseShaderEffect` and implement shader code
3. Register in `effects/EffectRegistry.ts`
4. Add audio-reactive parameter bindings via uniforms

Example:
```typescript
export class YourEffect extends BaseShaderEffect {
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAudioFeature: { value: 0 }, // Audio-reactive
      },
      vertexShader: `...`,
      fragmentShader: `...`,
    });
    super(renderer, scene, material);
  }
}
```

### Working with Audio Features

Audio features are extracted per stem (drums, bass, vocals, melody):
- RMS (volume)
- Spectral Centroid (brightness)
- Spectral Rolloff
- ZCR (zero crossing rate)

Access in shaders via `AudioTextureManager`:
```glsl
uniform sampler2D uAudioTexture;
float drumsRMS = sampleAudioFeature(0.0); // Feature index 0
```

### Adding a tRPC Route

1. Create router in `apps/api/src/routers/your-feature.ts`
2. Define procedures with Zod validation
3. Add to root router in `apps/api/src/routers/index.ts`
4. Frontend automatically gets types via `@trpc/client`

## Debug Logging

Backend has optional verbose logging:

```bash
# Enable verbose logs (auth, DB, R2, stem separation)
DEBUG_LOGGING=true pnpm --filter @phonoglyph/api dev

# Disable (default)
DEBUG_LOGGING=false pnpm --filter @phonoglyph/api dev
```

Frontend:
```bash
NEXT_PUBLIC_DEBUG_LOGGING=true pnpm --filter @phonoglyph/web dev
```

## Important Notes

- **Always use `pnpm`**, not `npm` (this is a pnpm workspace)
- The project uses **TypeScript 5.3.3** across all packages
- All shaders are GLSL written inline in TypeScript files
- Remotion rendering uses software rendering (`swangle`) for deterministic output
- R2 storage is S3-compatible; use AWS SDK S3 client
- Authentication flows through Supabase RLS policies

## Performance Considerations

- GPU compositing system can handle 20+ layers at 60fps
- Audio features are GPU-texture-based (no per-frame uniform updates)
- Avoid CPU `drawImage()` operations; use GPU render targets
- Large audio files are processed server-side for stem separation
- Video exports can be memory-intensive; monitor heap usage

## Troubleshooting

### WebGL Context Lost
- Reduce number of active layers
- Check for shader compilation errors in console
- Ensure GPU memory isn't exhausted

### Type Errors After Changes
```bash
# Rebuild shared types package
pnpm --filter phonoglyph-types build

# Re-run type check
pnpm --filter @phonoglyph/web type-check
```

### Database Connection Issues
- Verify Supabase credentials in `.env`
- Ensure migrations have run: `pnpm --filter @phonoglyph/api db:migrate`
- Check PostgreSQL connection string format

### Remotion Rendering Fails
- Verify `chromiumOptions.gl = 'swangle'` in `remotion.config.ts`
- Check available system memory (8GB+ recommended)
- Ensure all media assets are accessible
