# Architecture

**Analysis Date:** 2026-02-24

## Pattern Overview

**Overall:** Modular full-stack monorepo with GPU-accelerated client-side processing and type-safe backend API (tRPC + Express)

**Key Characteristics:**
- Client-side GPU compositing system (Three.js/WebGL) for real-time 60fps visualization
- Type-safe API layer using tRPC for client-server communication
- Zustand for decentralized state management across features
- Supabase for authentication and PostgreSQL database
- Server-side audio processing pipeline (stem separation, feature extraction)
- Remotion for deterministic video export rendering

## Layers

**Presentation Layer (Frontend):**
- Purpose: User-facing React components, real-time visualizations, and audio editing UI
- Location: `apps/web/src/app/`, `apps/web/src/components/`
- Contains: Next.js App Router pages, React components, CSS styles, layouts
- Depends on: Zustand stores, tRPC hooks, Three.js visualizer core
- Used by: End users via Next.js server-side rendering

**Visualization Engine Layer:**
- Purpose: GPU-accelerated multi-layer compositing and effect rendering
- Location: `apps/web/src/lib/visualizer/`
- Contains: VisualizerManager, MultiLayerCompositor, AudioTextureManager, 40+ shader effects
- Depends on: Three.js, WebGL, audio context, Zustand stores
- Used by: Creative visualizer page, video composition for export

**State Management Layer:**
- Purpose: Centralized state for visualizer settings, timeline, project configuration
- Location: `apps/web/src/stores/`
- Contains: Three Zustand stores (visualizerStore, timelineStore, projectSettingsStore)
- Depends on: Zustand library
- Used by: All frontend components and the visualization engine

**API Layer (Backend):**
- Purpose: Type-safe server-side business logic and data access
- Location: `apps/api/src/routers/`, `apps/api/src/services/`
- Contains: 13 tRPC routers (auth, file, stem, render, project, etc.), service classes
- Depends on: Express, tRPC, Supabase client, PostgreSQL driver
- Used by: Frontend via tRPC client

**Data Layer:**
- Purpose: Persistent storage and configuration
- Location: `apps/api/src/db/`
- Contains: PostgreSQL migrations, connection management, seed data
- Depends on: PostgreSQL driver
- Used by: Service classes for data persistence

**Service Layer:**
- Purpose: Cross-cutting concerns and external integrations
- Location: `apps/api/src/services/`
- Contains: R2 storage client, audio analyzer, stem processor, asset manager
- Depends on: Cloudflare S3 SDK, FFmpeg, Supabase client
- Used by: API routers

**Shared Types:**
- Purpose: Centralized TypeScript type definitions
- Location: `packages/types/index.ts`
- Contains: User, Project, File, Audio, Visualization type interfaces
- Depends on: Zod validation schemas
- Used by: Both frontend and backend for type safety

## Data Flow

**Visualization Rendering Flow:**

1. User loads `/creative-visualizer` page → `page.tsx` creates canvas element
2. Canvas mounted → TRPCProvider supplies API client, components render
3. User uploads audio file → `file.ts` router uploads to Cloudflare R2
4. File metadata stored in PostgreSQL via `asset.ts` router
5. `useAudioAnalysis` hook calls `audioAnalysisSandbox.ts` router → audio features extracted server-side
6. Features returned to client, stored in `visualizerStore` via Zustand
7. `VisualizerManager` initializes on canvas:
   - Creates Three.js scene, renderer, camera
   - Initializes `AudioTextureManager` → GPU texture packing
   - Initializes `MultiLayerCompositor` → GPU render targets
   - Registers 40+ effects from `EffectRegistry`
8. Animation loop (60fps):
   - Audio context reads current playback position
   - `AudioTextureManager` updates GPU textures with current audio features
   - Selected effects render to GPU render targets using shader programs
   - `MultiLayerCompositor` blends layers with blend mode shaders
   - Output composited to main canvas via `renderer.render()`
9. Real-time parameter changes update Zustand store → shader uniforms updated

**Video Export Pipeline:**

1. User configures export settings → stored in `projectSettingsStore`
2. User initiates render → tRPC `render.ts` router validates composition
3. Remotion Studio renders frame-by-frame (via `apps/web/src/remotion/RayboxComposition.tsx`):
   - `RemotionOverlayRenderer` creates frame props with timestamp
   - `VisualizerManager` instantiated with deterministic timing (frame count instead of delta time)
   - `chromiumOptions.gl = 'swangle'` ensures headless rendering consistency
4. Each frame exported to video file via Remotion API
5. Video file stored in R2, metadata saved to database

**Audio Analysis Pipeline:**

1. User uploads audio file via `useUpload` hook
2. File sent to `file.ts` router → stored in R2
3. `audioAnalysisSandbox.ts` router processes file:
   - Extracts 20+ audio features per 1024-sample window
   - Stems separated (drums, bass, vocals, melody) via FFmpeg
   - Features computed per stem
4. Results cached in memory/database for real-time visualization

**State Management Flow:**

1. Component subscribes to Zustand store: `const effects = useVisualizerStore(s => s.selectedEffects)`
2. User changes setting → `setSelectedEffects()` updates store
3. Store change triggers re-render and effect update
4. Changes can be auto-saved via `autoSave.ts` router
5. On page reload, state optionally restored from database via `projectSettingsStore` initialization

## Key Abstractions

**VisualizerManager:**
- Purpose: Orchestrates entire GPU rendering pipeline
- Examples: `apps/web/src/lib/visualizer/core/VisualizerManager.ts`
- Pattern: Singleton manager with lifecycle (init → animate → dispose), event-driven architecture
- Manages: Scene, renderer, effects, audio context, deterministic frame timing

**BaseShaderEffect:**
- Purpose: Abstract base class for all shader-based effects
- Examples: `apps/web/src/lib/visualizer/effects/BaseShaderEffect.ts`
- Pattern: Template method pattern - subclasses implement `initShader()` and `update()`
- All 40+ effects extend this and provide custom vertex/fragment shaders

**MultiLayerCompositor:**
- Purpose: GPU-based layer blending system
- Examples: `apps/web/src/lib/visualizer/core/MultiLayerCompositor.ts`
- Pattern: Render target composition with blend mode shaders
- Manages: Layer render targets, blend shader programs, post-processing (FXAA, bloom)

**AudioTextureManager:**
- Purpose: Packs audio features into GPU textures for shader access
- Examples: `apps/web/src/lib/visualizer/core/AudioTextureManager.ts`
- Pattern: Texture pooling with frame-based updates
- Eliminates: Per-frame uniform updates by pre-baking features into textures

**tRPC Router Pattern:**
- Purpose: Type-safe RPC procedures with validation
- Examples: All files in `apps/api/src/routers/`
- Pattern: Composition of procedures (public, protected, flexible, guestFriendly) with middleware
- Provides: Automatic type inference on frontend, runtime validation via Zod

**Zustand Store Pattern:**
- Purpose: Decentralized state container
- Examples: `apps/web/src/stores/visualizerStore.ts`, `timelineStore.ts`
- Pattern: Create function returns state object with actions, subscriber model
- Provides: No provider wrapper needed, direct hook usage, manual subscription optimization

## Entry Points

**Frontend Application:**
- Location: `apps/web/src/app/layout.tsx` (root layout)
- Triggers: Next.js server startup, user navigates to app
- Responsibilities: Wrap entire app with TRPCProvider, set up fonts, meta tags, portal root

**Home Page:**
- Location: `apps/web/src/app/page.tsx`
- Triggers: User visits `/`
- Responsibilities: Display landing page, check authentication status, render navigation

**Creative Visualizer Page:**
- Location: `apps/web/src/app/creative-visualizer/page.tsx` (112KB - main feature page)
- Triggers: User navigates to `/creative-visualizer`
- Responsibilities: Initialize canvas, create VisualizerManager, render UI controls, handle file upload

**Remotion Composition Entry:**
- Location: `apps/web/src/remotion/index.ts` (calls `registerRoot()`)
- Triggers: Remotion Studio startup or CLI render command
- Responsibilities: Register Remotion composition root, enable composition lookup

**API Server:**
- Location: `apps/api/src/index.ts`
- Triggers: Node.js process start
- Responsibilities: Initialize Express, load environment variables, set up middleware, start tRPC server

**Database Initialization:**
- Location: `apps/api/src/db/connection.ts`
- Triggers: First query to database
- Responsibilities: Create PostgreSQL connection pool, verify connectivity

## Error Handling

**Strategy:** Multi-layered error handling with graceful degradation

**Patterns:**
- Frontend error boundaries wrap visualizer components
- tRPC procedures validate inputs via Zod, return TRPCError with code + message
- Service classes throw descriptive errors caught by routers
- GPU context loss triggers visualizer pause, attempts recovery
- WebGL shader compilation errors logged and fallback to simpler effect
- Database connection failures in serverless don't block initialization
- Supabase auth failures fall back to guest mode

## Cross-Cutting Concerns

**Logging:**
- Backend: `apps/api/src/lib/logger.ts` - conditional logging based on DEBUG_LOGGING env var
- Frontend: `apps/web/src/lib/utils.ts` - debugLog utility with conditional console output

**Validation:**
- Backend: Zod schemas in `packages/types/index.ts` and router procedures
- Frontend: Client-side form validation via react-hook-form, server-side Zod validation

**Authentication:**
- Backend: tRPC middleware (`apps/api/src/trpc.ts`) extracts Bearer token, validates with Supabase
- Frontend: Supabase auth state via `useAuth` hook, guest session fallback
- Supports: Authenticated users, guest sessions, mixed flows (flexible procedures)

**Audio Processing:**
- Server-side: FFmpeg-based stem separation in `stem-processor.ts`
- Server-side: Meyda-based feature extraction in `audio-analyzer.ts`
- Client-side: Web Audio API for playback, real-time visualization

---

*Architecture analysis: 2026-02-24*
