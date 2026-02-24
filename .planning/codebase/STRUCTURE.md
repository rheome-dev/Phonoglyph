# Codebase Structure

**Analysis Date:** 2026-02-24

## Directory Layout

```
Phonoglyph/
├── apps/
│   ├── web/                    # Next.js 14 frontend with visualizer & Remotion export
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router pages and layouts
│   │   │   ├── components/     # React components organized by feature
│   │   │   ├── lib/            # Utility libraries and core systems
│   │   │   ├── stores/         # Zustand state containers
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── remotion/       # Remotion video export compositions
│   │   │   └── types/          # Frontend-specific type overrides
│   │   ├── public/             # Static assets (fonts, logos, effects)
│   │   └── config/             # Build and dev configuration
│   │
│   ├── api/                    # Express + tRPC backend server
│   │   ├── src/
│   │   │   ├── routers/        # tRPC procedure definitions (13 routers)
│   │   │   ├── services/       # Business logic and external integrations
│   │   │   ├── db/             # Database connection and migrations
│   │   │   ├── lib/            # Utilities (logger, Supabase client)
│   │   │   └── types/          # API-specific types and guards
│   │   └── tsconfig.json       # TypeScript configuration
│   │
│   └── stem-api/               # Audio stem separation microservice (stub)
│
├── packages/
│   ├── types/                  # Shared TypeScript types (phonoglyph-types)
│   │   └── index.ts            # All shared schemas and interfaces
│   └── config/                 # Shared configuration
│
├── .planning/
│   └── codebase/               # Architecture documentation (this file's location)
│
├── docs/                       # Project documentation
│   ├── architecture/           # Architecture decision records
│   └── prd/                    # Product requirements documents
│
└── scripts/                    # Development and build scripts
```

## Directory Purposes

**apps/web/src/app/**
- Purpose: Next.js App Router pages and layout hierarchy
- Contains: Route-specific components, page.tsx files, layout.tsx files
- Key files:
  - `page.tsx`: Home page with landing page + navigation
  - `(auth)/login/page.tsx`: Login page (route group for auth pages)
  - `(auth)/signup/page.tsx`: Signup page
  - `creative-visualizer/page.tsx`: Main feature page (112KB - contains visualizer UI)
  - `dashboard/page.tsx`: User dashboard
  - `files/page.tsx`: File management interface
  - `layout.tsx`: Root layout, wraps all pages with TRPCProvider

**apps/web/src/components/**
- Purpose: Reusable React components organized by feature
- Contains: UI components, feature-specific component trees, layout components
- Subdirectories:
  - `ui/`: Base UI components (button, input, modal, slider, etc.)
  - `audio-analysis/`: Audio feature extraction UI
  - `stem-separation/`: Stem separation workflow components
  - `stem-visualization/`: Per-stem visualization display
  - `video-composition/`: Video export composition UI
  - `projects/`: Project management components
  - `auth/`: Authentication (login, signup, profile)
  - `layout/`: Layout components (sidebar, navbar, footer)
  - `hud/`: Heads-up display overlay for visualizer
  - `midi/`: MIDI file selection and preview
  - `auto-save/`: Auto-save status indicator

**apps/web/src/lib/visualizer/**
- Purpose: GPU-accelerated visualization engine and effect system
- Contains: Core rendering pipeline, shader effects, audio texture management
- Key files:
  - `core/VisualizerManager.ts`: Main orchestrator (42KB)
  - `core/MultiLayerCompositor.ts`: GPU layer blending system (17KB)
  - `core/AudioTextureManager.ts`: GPU texture packing for audio features (10KB)
  - `core/MediaLayerManager.ts`: Bridge between canvas/video elements and GPU
  - `effects/BaseShaderEffect.ts`: Abstract base for all effects
  - `effects/EffectRegistry.ts`: Effect factory and registration
  - `effects/[40+ individual effects]`: Bloom, Glitch, Metaballs, Ascii, CRT, etc. (700KB total)

**apps/web/src/lib/**
- Purpose: Utility libraries and cross-cutting concerns
- Contains: tRPC client setup, auth utilities, Supabase client, validation
- Key files:
  - `trpc.ts`: tRPC React client initialization
  - `trpc-links.ts`: tRPC transport configuration
  - `supabase.ts`: Supabase client factory
  - `auth.ts`: Authentication utilities
  - `utils.ts`: General utilities (debugLog, cn, etc.)
  - `validations.ts`: Zod validation schemas
  - `export-utils.ts`: Video export helpers
  - `guest-user.ts`: Guest session management
  - `video-composition/parameter-calculator.ts`: Frame-by-frame param calculation

**apps/web/src/stores/**
- Purpose: Zustand state containers
- Contains: Decentralized state management
- Files:
  - `visualizerStore.ts`: Effect selection, audio analysis settings, parameter mappings
  - `timelineStore.ts`: Playback position, keyframes, timeline state
  - `projectSettingsStore.ts`: Project-level config, export settings

**apps/web/src/hooks/**
- Purpose: Custom React hooks for UI logic
- Files:
  - `use-auth.ts`: Authentication state and operations
  - `use-upload.ts`: File upload handling
  - `use-audio-analysis.ts`: Audio feature extraction workflow
  - `use-audio-features.ts`: Access audio feature values
  - `use-feature-value.ts`: Get current value of audio feature
  - `use-stem-audio-controller.ts`: Control per-stem playback
  - `use-auto-save.ts`: Auto-save trigger mechanism
  - `use-toast.ts`: Toast notification system

**apps/web/src/remotion/**
- Purpose: Video export compositions and rendering
- Key files:
  - `index.ts`: Entry point that calls `registerRoot()` (required for Remotion CLI)
  - `Root.tsx`: Composition registry (exports RemotionRoot)
  - `RayboxComposition.tsx`: Main video composition with effects
  - `RemotionOverlayRenderer.tsx`: Renders visualizer layers frame-by-frame
  - `Debug.tsx`: Debug composition for development

**apps/web/public/**
- Purpose: Static assets served by Next.js
- Contains:
  - `fonts/`: Custom fonts (JetBrainsMono, InstrumentSerif, Lusitana)
  - `favicon/`: Icon files
  - `logo/`: Brand logos
  - `workers/`: Service workers
  - `effects/`: Effect-related static resources

**apps/api/src/routers/**
- Purpose: tRPC procedure definitions organized by domain
- Files (13 routers):
  - `index.ts`: Root router composition
  - `auth.ts`: Authentication procedures
  - `user.ts`: User profile CRUD
  - `project.ts`: Project management (create, read, update, delete)
  - `file.ts`: File upload, metadata, R2 storage operations
  - `asset.ts`: Asset management (images, videos, effects)
  - `midi.ts`: MIDI file parsing and operations
  - `stem.ts`: Audio stem separation workflow
  - `render.ts`: Remotion video rendering operations
  - `audio-analysis-sandbox.ts`: Audio feature extraction
  - `auto-save.ts`: Auto-save checkpoint operations
  - `guest.ts`: Guest session management
  - `health.ts`: Health check endpoint

**apps/api/src/services/**
- Purpose: Business logic, external integrations, data processing
- Files (11 services):
  - `r2-storage.ts`: Cloudflare R2 SDK wrapper
  - `audio-analyzer.ts`: Meyda-based audio feature extraction
  - `audio-analysis-processor.ts`: Audio processing worker interface
  - `stem-processor.ts`: FFmpeg-based stem separation
  - `stem-separator.ts`: Stem separation orchestration
  - `media-processor.ts`: Video/audio media manipulation
  - `midi-parser.ts`: MIDI file parsing and note extraction
  - `asset-manager.ts`: Asset lifecycle management
  - `queue-worker.ts`: Job queue processing
  - `auto-save.ts`: Auto-save checkpoint storage
  - `supabase-storage.ts`: Supabase storage integration (stub)

**apps/api/src/db/**
- Purpose: Database initialization and schema migrations
- Files:
  - `connection.ts`: PostgreSQL connection pool setup
  - `migrations/`: SQL migration files in sequence
    - `001_initial_schema.sql`
    - `002_supabase_auth_integration.sql`
    - `003_file_metadata_table.sql`
    - ... (22 migrations total)
  - `seeds/`: Database seed data for development

**packages/types/index.ts**
- Purpose: Shared TypeScript type definitions and Zod schemas
- Contains:
  - User types (User, WebUser, NormalizedUser, UserProfile)
  - Project types (Project, ProjectCollaborator, ProjectShare)
  - File types (FileMetadata, FileUploadProgress)
  - Audio types (AudioAnalysisData, AudioFeature, StemSeparationResult)
  - Visualizer types (VisualEffect, VisualizerConfig, VisualizationPreset)
  - Validation schemas (createProjectSchema, loginCredentialsSchema, etc.)
  - Type guards and transformers

## Key File Locations

**Entry Points:**
- `apps/web/src/app/layout.tsx`: Root Next.js layout, TRPCProvider setup
- `apps/web/src/app/page.tsx`: Home page with authentication check
- `apps/web/src/app/creative-visualizer/page.tsx`: Main visualizer application
- `apps/web/src/remotion/index.ts`: Remotion composition entry (must use index.ts for CLI)
- `apps/api/src/index.ts`: Express server initialization with tRPC middleware

**Configuration:**
- `apps/web/next.config.js`: Next.js configuration
- `apps/web/tsconfig.json`: TypeScript configuration
- `apps/web/tailwind.config.js`: Tailwind CSS configuration
- `apps/api/tsconfig.json`: Backend TypeScript configuration
- `apps/web/remotion.config.ts`: Remotion export configuration (swangle renderer)
- `pnpm-workspace.yaml`: Monorepo workspace configuration

**Core Logic:**
- `apps/web/src/lib/visualizer/core/VisualizerManager.ts`: Main rendering orchestrator
- `apps/web/src/lib/visualizer/effects/BaseShaderEffect.ts`: Effect base class
- `apps/api/src/trpc.ts`: tRPC context creation with auth middleware
- `apps/api/src/services/audio-analyzer.ts`: Audio feature extraction
- `apps/api/src/services/stem-processor.ts`: Stem separation pipeline

**Testing:**
- `apps/web/src/tests/`: Frontend test suites
- `apps/api/src/test/`: Backend test suites

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `Dashboard.tsx`, `AudioAnalysis.tsx`)
- Utils/hooks: camelCase (e.g., `useAuth.ts`, `utils.ts`)
- Services: camelCase (e.g., `audio-analyzer.ts`, `r2-storage.ts`)
- Types: camelCase with `.ts` extension (e.g., `visualizer.ts` for types, or exported from index.ts)
- Tests: `filename.test.ts` or `filename.spec.ts`

**Directories:**
- Feature directories: kebab-case (e.g., `audio-analysis/`, `stem-separation/`)
- Component folders: kebab-case (e.g., `ui/`, `video-composition/`)
- Utility directories: standard names (`lib/`, `hooks/`, `stores/`, `services/`, `types/`)

**Variables & Functions:**
- Functions: camelCase (e.g., `updateVisualizerState()`, `extractAudioFeatures()`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_FPS = 60`, `MAX_LAYER_COUNT = 20`)
- React state: descriptive camelCase (e.g., `isPlaying`, `selectedEffects`)
- Types/Interfaces: PascalCase (e.g., `VisualizerConfig`, `AudioAnalysisData`)

**Feature Flags:**
- Store names: `useXyzStore` (e.g., `useVisualizerStore`, `useTimelineStore`)
- Effect names: `XyzEffect` (e.g., `BloomEffect`, `GlitchEffect`, `MetaballsEffect`)
- Router names: `xyzRouter` (e.g., `authRouter`, `fileRouter`, `audioAnalysisSandboxRouter`)

## Where to Add New Code

**New Frontend Feature:**
- Primary code: `apps/web/src/components/[feature-name]/`
- Hooks: `apps/web/src/hooks/use-[feature-name].ts`
- Stores (if needed): `apps/web/src/stores/[feature-name]Store.ts`
- Types (if not in shared package): `apps/web/src/types/[feature-name].ts`
- Tests: `apps/web/src/tests/[feature-name].test.ts`
- Page route: `apps/web/src/app/[feature-name]/page.tsx`

**New Visualizer Effect:**
1. Create: `apps/web/src/lib/visualizer/effects/MyEffect.ts`
2. Extend: `BaseShaderEffect`
3. Implement: vertex/fragment shaders as strings
4. Register: Add to `EffectRegistry.ts` in effect definitions array
5. Test: Create composition in Remotion or test page

**New API Endpoint:**
1. Create router: `apps/api/src/routers/[feature-name].ts`
2. Define procedures using `publicProcedure`, `protectedProcedure`, or `flexibleProcedure`
3. Add validation: Use Zod schemas from `packages/types/index.ts`
4. Implement logic: Call service classes from `apps/api/src/services/`
5. Register: Add to `appRouter` in `apps/api/src/routers/index.ts`
6. Type frontend client: tRPC auto-generates types via `AppRouter`

**New Service/Business Logic:**
1. Create: `apps/api/src/services/[feature-name].ts`
2. Export class with static methods or instantiable methods
3. Use: Import in routers and call from procedures
4. Test: Create test file `apps/api/src/test/[feature-name].test.ts`

**New Utility Library:**
1. Shared across apps: `packages/types/index.ts` (for types) or new package
2. Frontend only: `apps/web/src/lib/[name].ts`
3. Backend only: `apps/api/src/lib/[name].ts`

## Special Directories

**Generated Build Output:**
- `.next/`: Next.js build cache and compiled output
  - Generated: Yes (on `pnpm build`)
  - Committed: No (in .gitignore)

**Database Migrations:**
- Location: `apps/api/src/db/migrations/`
- Generated: No (manually created)
- Committed: Yes
- Purpose: Version control for database schema evolution

**Node Modules:**
- Location: `node_modules/`, `apps/*/node_modules/`, `packages/*/node_modules/`
- Generated: Yes (via `pnpm install`)
- Committed: No (in .gitignore)
- Manager: pnpm (mandatory - do NOT use npm or yarn)

**.next/ Cache:**
- Location: `apps/web/.next/`
- Generated: Yes (during dev/build)
- Committed: No
- Contains: Compiled pages, static chunks, manifest files

**Public Static Assets:**
- Location: `apps/web/public/`
- Generated: No (manually added)
- Committed: Yes
- Served: Via `/_next/static/` by Next.js

**Documentation:**
- Location: `docs/`
- Generated: No (manually written)
- Committed: Yes
- Contains: Architecture decisions, PRDs, story files

---

*Structure analysis: 2026-02-24*
