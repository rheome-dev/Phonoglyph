# Technology Stack

**Analysis Date:** 2026-02-24

## Languages

**Primary:**
- TypeScript 5.3.3 - Used across all workspaces (frontend, backend, packages)
- GLSL - Shader code written inline in TypeScript for WebGL effects

**Secondary:**
- SQL - Database migrations and schema definitions in `apps/api/src/db/migrations/`
- JavaScript - Runtime execution (Node.js, browser)

## Runtime

**Environment:**
- Node.js >=18.0.0 (required in package.json engines)
- npm >=9.0.0 (package manager requirement)
- pnpm - Actual package manager used for workspace management

**Package Manager:**
- pnpm (workspace-based monorepo)
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core Frontend:**
- Next.js 14.2.30 - React framework, server components, API routes in `apps/web`
- React 18.2.0 - UI rendering library
- Three.js 0.177.0 - 3D graphics and WebGL rendering for visualizer

**Core Backend:**
- Express 4.21.2 - HTTP server and API routing in `apps/api/src/index.ts`
- tRPC 10.45.2 - Type-safe RPC framework (server and client)
  - `@trpc/server` for backend procedures
  - `@trpc/client` and `@trpc/next` for frontend integration
  - `@trpc/react-query` for React hooks

**Video/Rendering:**
- Remotion 4.0.0 - Server-side video composition and rendering
  - `@remotion/cli` - CLI tools for local rendering
  - `@remotion/lambda` - AWS Lambda deployment for video export
  - Entry point: `apps/web/src/remotion/index.ts` (calls `registerRoot()`)
  - Config: `apps/web/remotion.config.ts` (sets `chromiumOpenGlRenderer` to `swangle`)

**Testing:**
- Vitest 3.2.4 - Unit and component testing framework (replaces Jest)
- `@vitest/coverage-v8` - Code coverage reporting
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - DOM matchers for assertions
- jsdom 26.1.0 - DOM environment for Node.js testing

**Build/Dev Tools:**
- Tailwind CSS 3.4.1 - Utility-first CSS framework
- PostCSS 8.4.33 - CSS transformation
- Autoprefixer 10.4.16 - Vendor prefixing
- Webpack (via Next.js) - Module bundling with custom config in `apps/web/next.config.js`
- ESLint 8.56.0 - Code linting
- TypeScript Compiler (tsc) - Type checking and compilation

**UI Component Libraries:**
- Radix UI - Headless component primitives
  - `@radix-ui/react-avatar`, `react-dropdown-menu`, `react-label`, `react-progress`, `react-select`, `react-separator`, `react-slider`, `react-slot`, `react-switch`, `react-toast`
- Lucide React 0.523.0 - Icon library
- Heroicons 2.1.1 - Alternative icon set

**State Management:**
- Zustand 4.5.2 - Lightweight state management (stores in `apps/web/src/stores/`)
  - visualizerStore.ts - Visualizer settings and effects
  - timelineStore.ts - Playback and timeline state
  - projectSettingsStore.ts - Project configuration

**Data Fetching & Queries:**
- `@tanstack/react-query` 4.36.1 - Server state management and caching

**Forms & Validation:**
- React Hook Form 7.58.1 - Form state and validation
- `@hookform/resolvers` 5.2.2 - Validation schema resolvers
- Zod 3.25.67 - TypeScript-first schema validation (used across backend and frontend)

**Animation & Interaction:**
- Framer Motion 12.19.2 - React animation library
- TweenJS 25.0.0 - Animation tweening engine
- React Draggable 4.5.0 - Draggable element component
- Embla Carousel 8.6.0 - Carousel/slider component
- `@dnd-kit/core` 6.3.1 - Drag and drop primitives
  - `@dnd-kit/modifiers`, `@dnd-kit/utilities` - DnD utilities
- React DnD 16.0.1 - Alternative drag/drop library
- `react-hotkeys-hook` 5.1.0 - Keyboard shortcut handling
- `react-intersection-observer` 9.16.0 - Intersection observer hook

**Audio Analysis:**
- Meyda 5.6.3 - Audio feature extraction (RMS, spectral analysis)
- web-audio-beat-detector 8.2.31 - Beat detection from audio
- WAV 1.0.2 - WAV file parsing

**Styling & UI Utilities:**
- Tailwind Merge 3.3.1 - Merge Tailwind classes without conflicts
- Tailwind Animate 1.0.7 - Animation utilities
- Class Variance Authority 0.7.1 - Component variant management
- clsx 2.1.1 - Conditional className utility
- React Colorful 5.6.1 - Color picker component
- Leva 0.10.0 - React UI for tweaking Three.js objects
- cmdk 1.1.1 - Command menu component
- Vaul 1.1.2 - Drawer/sheet component

**Media Processing:**
- Sharp 0.32.6 - Image processing and resizing
- Fluent FFmpeg 2.1.3 - Audio/video processing wrapper
  - `@types/fluent-ffmpeg` - TypeScript types
- Image-size 1.0.2 - Image dimension detection
- MIDI Parser JS 4.0.4 - MIDI file parsing

**File Handling:**
- File-type 18.7.0 - Detect file type from buffer

**Storage & Data:**
- `@aws-sdk/client-s3` 3.490.0 - AWS S3 client (for Cloudflare R2)
- `@aws-sdk/s3-request-presigner` 3.490.0 - Pre-signed URL generation for S3
- pg 8.11.3 - PostgreSQL client for database access

**Authentication & Security:**
- `@supabase/supabase-js` 2.50.2 - Supabase client for authentication
- `@supabase/ssr` 0.6.1 - Server-side rendering authentication utilities
- Helmet 7.1.0 - Security headers middleware for Express
- CORS 2.8.5 - Cross-Origin Resource Sharing middleware

**Utilities:**
- dotenv 16.5.0 - Environment variable loading
- concurrently 8.2.2 - Run multiple npm scripts concurrently
- tsx 4.7.0 - TypeScript execution for Node.js scripts

**Development & Testing Tools:**
- MSW 2.2.1 - Mock Service Worker for API mocking in tests
- Supertest 6.3.4 - HTTP assertion library
- `@types/` packages - TypeScript definitions for various libraries

## Key Dependencies

**Critical - Core Functionality:**
- Three.js - 3D rendering engine for visualizations
- Remotion - Video composition and export
- tRPC - Type-safe API communication
- Zustand - State management for visualizer
- Supabase - Authentication and database

**Infrastructure:**
- Express - HTTP server and routing
- Next.js - React framework with server capabilities
- PostgreSQL (via pg) - Relational database
- Cloudflare R2 (via AWS SDK S3) - Object storage for files

**Audio Processing:**
- Meyda - Spectral audio analysis
- web-audio-beat-detector - Real-time beat detection
- Fluent FFmpeg - Audio stem separation

## Configuration

**Environment Variables (Frontend):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3001)
- `NEXT_PUBLIC_DEBUG_LOGGING` - Enable debug logs (true/false)

**Environment Variables (Backend):**
Located in `apps/api/.env`:
- `NODE_ENV` - development/production
- `PORT` - Express server port (default: 3001)
- `FRONTEND_URL` - CORS whitelist (comma-separated origins)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key
- `DATABASE_URL` - PostgreSQL connection string
- `CLOUDFLARE_ACCOUNT_ID` - R2 account ID
- `CLOUDFLARE_R2_ACCESS_KEY_ID` - R2 access key
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - R2 secret key
- `CLOUDFLARE_R2_BUCKET` - R2 bucket name
- `RUNPOD_API_KEY` - RunPod serverless API key
- `JWT_SECRET` - Secret for JWT tokens
- `MAX_MIDI_FILE_SIZE` - Upload limit: 5MB (5242880 bytes)
- `MAX_AUDIO_FILE_SIZE` - Upload limit: 50MB (52428800 bytes)
- `MAX_VIDEO_FILE_SIZE` - Upload limit: 500MB (524288000 bytes)

**Build Configuration:**
- Next.js: `apps/web/next.config.js` - Webpack overrides for zod/v4/core compatibility
- Remotion: `apps/web/remotion.config.ts` - Sets chromium renderer to `swangle` for deterministic headless rendering
- TypeScript: `tsconfig.json` in each workspace with shared base config
- ESLint: `eslintrc` files with Next.js and TypeScript support

## Platform Requirements

**Development:**
- Node.js 18+ (for async/await, native fetch, other ES2021+ features)
- pnpm (workspace management)
- FFmpeg installed on system (for audio stem separation)
- 8GB+ RAM (for Remotion video rendering)

**Production:**
- Vercel (frontend deployment target, detected in code with `process.env.VERCEL`)
- Supabase PostgreSQL database
- Cloudflare R2 storage (S3-compatible API)
- RunPod serverless GPU (for stem separation)
- AWS Lambda via Remotion Lambda (for video rendering)

**Browser Support:**
- Modern browsers with WebGL support (Three.js requirement)
- Web Audio API support (for real-time audio analysis)
- ES2020+ JavaScript support

---

*Stack analysis: 2026-02-24*
