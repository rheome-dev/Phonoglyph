# Raybox Agent-CLI Readiness: Comprehensive Review

**Generated:** 2026-03-24
**Agents:** 5 parallel research agents across all major subsystems
**Goal:** Enable a coding agent to create a Raybox video end-to-end with only: (1) a music track, (2) visual assets, (3) an aesthetic vibe descriptor.

---

## Executive Summary

The Raybox platform has a **strong foundation** for agent-CLI automation, but significant work remains. The visualizer engine, mapping system, and rendering pipeline are well-architected and type-safe. The primary gaps are in the **audio analysis pipeline** (no structure/mood detection), the **API surface** (no webhooks, no CLI-friendly auth), and the **project lifecycle** (no programmatic project creation). With targeted additions, a fully automated end-to-end pipeline is achievable.

**Overall Readiness Score: 5.5/10**

---

## Part 1: What Already Works for Automation

### 1.1 State Management (Strong) — Difficulty: 3/5

Three Zustand stores govern all visualizer state:

| Store | Scope | Key Data |
|-------|-------|----------|
| `timelineStore` | Canvas composition | `layers[]`, `currentTime`, `duration`, `isPlaying` |
| `visualizerStore` | Effects & mapping | `mappings{}`, `baseParameterValues{}`, `selectedEffects{}` |
| `projectSettingsStore` | Appearance | `backgroundColor`, `aspectRatio` |

The **data model is clean and serializable**. Auto-save captures the full project state as JSON. Export payload (`getProjectExportPayload`) constructs exactly what the Lambda renderer needs. All state is TypeScript-typed end-to-end.

### 1.2 Effect System (Strong) — Difficulty: 4/5

**44 registered effects** across 7 categories: organic (2), stylize (9), blur (6), distort (12), light (5), misc (8), HUD overlays (9). All effects implement a consistent `VisualEffect` interface with typed parameters. The `EffectRegistry` provides discovery. Effects are GPU-based shaders with audio-reactive uniforms.

### 1.3 Mapping System (Good) — Difficulty: 4/5

Audio features are packed into GPU textures (256×64 RGBA Float32) by `AudioTextureManager`, giving shaders access to 16 time-series features per stem. The mapping formula is simple and deterministic:

```
parameterValue = baseValue × (1 + audioFeature × modulationAmount)
```

Available audio features per stem: **RMS, Loudness, Spectral Centroid, Spectral Rolloff, Spectral Flatness, ZCR, Energy, Bass, Mid, Treble, FFT, Amplitude Spectrum, Transients, Chroma, BPM**.

### 1.4 GPU Compositing (Excellent) — Difficulty: 4/5

`MultiLayerCompositor` handles 20+ layers via GPU render targets and blend-mode shaders. No CPU `drawImage()` calls. Five blend modes supported: normal, multiply, screen, overlay, add, subtract.

### 1.5 Rendering Pipeline (Good with gaps) — Difficulty: 3.5/5

Remotion handles frame capture cleanly. The stateless Lambda renderer uses a momentum-accumulator model for transients (replicating live preview behavior deterministically). Two-stage audio data loading (R2 upload → Lambda fetch) is solid. The full render pipeline is triggered via a single `triggerRender` tRPC call.

### 1.6 API Surface (Adequate with gaps) — Difficulty: 3/5

73+ tRPC procedures covering file upload, project CRUD, stem separation, and render triggering. Full Zod validation, Supabase auth, R2 integration. The tRPC client is type-safe.

---

## Part 2: The 4 Critical Gaps

### GAP 1: No Project Lifecycle API

**Severity: Critical**

Projects must currently be created through the UI. No `project.create` tRPC procedure is exposed. No way to programmatically:
- Create a project
- Associate audio files with it
- Trigger stem separation
- Wait for processing to complete

**Fix:** Add `project.create` and `project.get` procedures. Expose stem separation job status polling.

### GAP 2: No Webhooks / Async Callbacks

**Severity: Critical**

Both stem separation and Lambda rendering are async, but the API provides **no webhook or callback mechanism**. Agents must poll repeatedly:
```
while not done:
  status = getRenderStatus(renderId)
  sleep(30 seconds)
```

For a 3-minute video at 60fps, that's 6 Lambda chunks × 30s polling = ~3 minutes of polling overhead per render.

**Fix:** Add webhook endpoints for `render.completed`, `stem.completed`, `file.processed`. Priority P1.

### GAP 3: No Section/Structure Detection or Mood Classification

**Severity: High**

The audio pipeline extracts excellent low-level features (RMS, spectral centroid, transients) but provides **zero high-level semantic metadata**:
- No intro/verse/chorus detection
- No genre classification
- No mood/vibe detection
- No energy curve over track lifetime
- No beat-grid export

Without this, an agent choosing effects blindly has no idea whether the track is "upbeat EDM with a drop at 2:15" or "chill lo-fi with a bridge at 1:30."

**Fix:** Add section detection (chromagram similarity + energy analysis) and LLM-based vibe/genre classification. Priority P1 for section detection, P2 for mood/genre.

### GAP 4: No CLI-Friendly Authentication

**Severity: High**

All API calls require Supabase Bearer tokens. The Supabase auth flow requires browser OAuth (login page, redirect). There is **no API key or service token system**. An agent running in a CI environment or as a standalone CLI cannot authenticate.

**Fix:** Implement API key authentication for non-interactive use. Priority P1.

---

## Part 3: The "Aesthetic Vibe" Problem

This is the most interesting challenge. The user wants to provide a vibe descriptor (e.g., "dark cyberpunk energy") and have the system automatically:

1. Choose appropriate effects
2. Select a color palette
3. Configure audio-reactive mappings
4. Set animation timing and pacing

### What Exists

The mapping system can drive any numeric parameter with any audio feature. The effects cover a wide aesthetic range. There are **no preset templates, aesthetic patterns, or vibe-to-visual rules**.

### What Needs to Be Built

**Aesthetic Preset System** — A library of named aesthetic configurations:

```typescript
interface AestheticPreset {
  id: string;
  name: string;
  description: string;
  vibeTags: string[];  // ["dark", "aggressive", "cyberpunk", "energetic"]

  // Layer configuration
  layers: Array<{
    effectType: string;
    baseParameterValues: Record<string, number>;
    colorPalette?: string[];  // hex colors
  }>;

  // Audio-to-visual mappings
  mappings: Record<string, { featureId: string; modulationAmount: number }>;

  // Timing/pacing
  transitionTiming: "beats" | "bars" | "free";
  suggestedBPMRange?: [number, number];

  // Visual style
  backgroundColor: string;
  aspectRatio?: string;
}
```

Example presets:

| Preset | Effects | Mappings | Colors |
|--------|---------|----------|--------|
| **Cyberpunk Energy** | ParticleNetwork + Bloom + Glitch + ChromaticAberration | drums-peaks → particleSpawning, bass-rms → bloom-intensity | `#00ffff`, `#ff00ff`, `#000033` |
| **Ethereal Dreams** | Metaballs + Wisps + Bloom + Fog | vocals-spectralCentroid → glowIntensity, main-rms → fog-density | `#c4b5fd`, `#f0abfc`, `#000011` |
| **Retro Lo-Fi** | CRT + Grain + Halftone + Pixelate | bass-rms → scanlines, drums-peaks → pixelSize | `#ffaa00`, `#00ff88`, `#111111` |
| **Neon Night** | Beam + GodRays + Bloom + Glitter | bass-rms → godRays-intensity, mid-volume → beam-intensity | `#ff0066`, `#00ff99`, `#000000` |
| **Organic Flow** | Metaballs + Liquify + Fog + Trail | vocals-pitch → metaballs-baseRadius, main-rms → trail-intensity | `#44ff44`, `#88ffaa`, `#001100` |

**LLM-Based Aesthetic Engine** — Given a vibe descriptor, an LLM (Claude) maps to the closest preset + parameter tweaks:

```typescript
async function createFromVibe(
  track: AudioTrack,
  vibe: string,
  assets?: string[]
): Promise<VisualizerConfig> {
  // 1. Analyze track metadata (BPM, sections, energy curve)
  const analysis = await analyzeTrack(track);

  // 2. Use LLM to select/merge presets based on vibe
  const preset = await selectPreset(analysis, vibe);

  // 3. Adjust timing to match BPM/section structure
  const config = adjustToTrack(preset, analysis);

  // 4. Inject asset references if provided
  if (assets?.length) {
    config.layers.push(imageSlideshowLayer(assets, analysis.transients));
  }

  return config;
}
```

---

## Part 4: Implementation Roadmap

### Phase 1: CLI Foundation (Week 1-2)

**Goal:** Enable fully programmatic video creation from a local audio file.

| Task | Effort | Priority |
|------|--------|----------|
| Add `project.create` tRPC procedure | Low | P1 |
| Add `file.upload` → R2 → stem separation flow | Medium | P1 |
| Add API key auth system (bypass Supabase OAuth) | Medium | P1 |
| Add webhook endpoints for render + stem completion | Medium | P1 |
| Add `render.getOutputUrl` procedure (construct final MP4 URL) | Low | P1 |
| Build `raybox-cli` package with subcommands | Medium | P1 |

**Phase 1 Deliverable:**
```bash
# Create project, upload audio, render — fully automated
raybox create "My Video" --audio track.mp3 --vibe "dark cyberpunk"
raybox render --project-id proj_xxx --output out.mp4
```

### Phase 2: Audio Intelligence (Week 2-3)

**Goal:** Give the system enough track understanding to make intelligent visual decisions.

| Task | Effort | Priority |
|------|--------|----------|
| Add section detection (intro/verse/chorus/bridge/outro) | High | P1 |
| Add beat-grid export (per-beat timing data) | Medium | P1 |
| Add energy curve extraction (per-section RMS) | Medium | P1 |
| Add key/scale detection | Low | P2 |
| Add LLM-based genre/mood classification (via Claude) | Medium | P2 |
| Cache analysis results to avoid re-computation | Medium | P2 |

**Phase 2 Deliverable:** `POST /api/audio/analyze` returns BPM, key, duration, sections with timestamps, energy curve, mood tags, and suggested visual pacing.

### Phase 3: Aesthetic Engine (Week 3-4)

**Goal:** Translate vibe descriptors into visual configurations.

| Task | Effort | Priority |
|------|--------|----------|
| Build aesthetic preset library (10-15 presets) | Medium | P1 |
| Create LLM prompt template for preset selection | Low | P1 |
| Implement `POST /api/visualizer/from-vibe` endpoint | Medium | P1 |
| Add asset handling (image/video upload → slideshow layer) | Medium | P2 |
| Add color palette generation (palette from vibe via LLM) | Low | P2 |

**Phase 3 Deliverable:**
```bash
raybox create "Promo Video" \
  --audio song.mp3 \
  --images asset1.png asset2.png \
  --vibe "upbeat summer festival with neon accents" \
  --aspect-ratio youtube
```

### Phase 4: Polish & Production (Week 4+)

| Task | Effort | Priority |
|------|--------|----------|
| Render history API (list past renders, metadata) | Low | P2 |
| Multiple codec support (webm, prores) | Medium | P2 |
| Resolution scaling for Lambda (fix memory ceiling) | High | P1 |
| Bitrate/quality controls | Medium | P2 |
| Render cancellation | Low | P2 |
| Cost estimation (Lambda invocation count) | Low | P3 |
| Template/preset save/load via API | Medium | P2 |

---

## Part 5: Technical Architecture for Agent CLI

### Proposed CLI Structure

```
raybox-cli/
├── src/
│   ├── commands/
│   │   ├── create.ts        # Create project + upload + analyze
│   │   ├── render.ts        # Trigger render + poll + download
│   │   ├── vibe.ts          # Generate visualizer config from vibe
│   │   ├── analyze.ts       # Deep audio analysis
│   │   ├── list-effects.ts  # List available effects + params
│   │   └── list-presets.ts  # List aesthetic presets
│   ├── lib/
│   │   ├── trpc-client.ts   # Type-safe tRPC client
│   │   ├── auth.ts           # API key auth
│   │   ├── poller.ts         # Webhook + polling utilities
│   │   ├── payload-builder.ts # Construct render payloads
│   │   ├── preset-engine.ts  # Vibe → preset mapping
│   │   └── llm-analyzer.ts   # LLM-based audio understanding
│   └── index.ts
├── package.json
└── tsconfig.json
```

### Key Design Decisions

1. **tRPC over REST** — Existing type-safe API is excellent. Build CLI on top of it with a thin wrapper.
2. **Webhooks preferred, polling fallback** — Use webhooks when available, fall back to polling for older API versions.
3. **Payload construction is the hardest part** — The `getProjectExportPayload` pattern shows exactly what needs to be built. Create a `PayloadBuilder` class that accepts a high-level config (vibe + assets) and produces the full `RayboxCompositionProps`.
4. **LLM as the aesthetic brain** — Use Claude to bridge the gap between "vibe descriptor" and "effect configuration." The LLM picks presets, adjusts parameters, and generates mapping suggestions.
5. **Render happens server-side** — No client-side rendering. CLI uploads config → API triggers Lambda → CLI polls → downloads MP4 from S3.

### End-to-End Flow

```
User: "Create a cyberpunk promo video for my track"
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ raybox create --audio track.mp3 --vibe "cyberpunk"     │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 1. API Key Auth → tRPC client                          │
│ 2. file.uploadFile (base64 encode track)                │
│ 3. stem.createSeparationJob (4stems: drums/bass/vocals/other)│
│ 4. Poll stem.getJobStatus until completed              │
│ 5. POST /api/audio/analyze → get sections, BPM, mood   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 6. LLM selects "Cyberpunk Energy" preset + tweaks       │
│ 7. PayloadBuilder.construct() → RayboxCompositionProps │
│    - layers: [ParticleNetwork, Bloom, Glitch]           │
│    - mappings: { "bloom::intensity": { drums-rms, 1.0 }}│
│    - baseParameterValues: { bloom: { threshold: 0.3 }} │
│ 8. render.triggerRender(props) → renderId             │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 9. Poll render.getRenderStatus (webhook or 30s polling) │
│ 10. render.getOutputUrl(renderId) → S3 URL             │
│ 11. Download MP4 from S3                               │
└─────────────────────────────────────────────────────────┘
         │
         ▼
    out.mp4 ✓
```

---

## Part 6: Per-Subsystem Readiness Scores

| Subsystem | Score | Readiness | Key Gap |
|-----------|-------|-----------|---------|
| State Management | 8/10 | High | No programmatic project creation |
| Effect System | 8/10 | High | No preset/templates |
| Mapping System | 7/10 | Good | No visual mapping editor |
| GPU Compositing | 9/10 | Excellent | MSAA memory waste in Lambda |
| Audio Analysis | 5/10 | Partial | No structure/mood detection |
| Rendering/Export | 6/10 | Moderate | Lambda memory ceiling, no webhooks |
| API Surface | 5/10 | Partial | No API keys, no webhooks, no output URL |
| Visualizer UI | 7/10 | Good | Cannot be bypassed for project creation |
| **Overall** | **6/10** | Moderate | 4 critical gaps block full automation |

---

## Part 7: Quick Wins (Already Possible)

Before any new code, here's what works **today**:

1. **List all effects + parameters** — `EffectRegistry` is already exported and introspectable
2. **Construct render payload** — `getProjectExportPayload` already exists, just need to call it programmatically
3. **Trigger Lambda render** — `trpc.render.triggerRender` already works with the right payload shape
4. **Poll render status** — `trpc.render.getRenderStatus` works, just needs polling
5. **File upload** — `file.uploadFile` works with base64 encoding

**What requires new code:** project creation, API key auth, webhooks, section detection, vibe/preset engine.

---

## Part 8: Key Files Reference

| File | Purpose | Change Needed |
|------|---------|-------------|
| `apps/api/src/routers/project.ts` | Project CRUD | Add `create` procedure |
| `apps/api/src/routers/render.ts` | Lambda rendering | Add `getOutputUrl`, webhook support |
| `apps/api/src/routers/stem.ts` | Stem separation | Add webhooks |
| `apps/api/src/auth/` | Authentication | Add API key system |
| `apps/web/src/lib/visualizer/effects/EffectRegistry.ts` | Effect discovery | Export for CLI |
| `apps/web/src/lib/visualizer/export-utils.ts` | Payload construction | Already exists |
| `apps/api/src/services/audio-analyzer.ts` | Audio analysis | Add section detection |
| `apps/api/src/services/stem-separator.ts` | Stem separation | Add webhooks |
| `apps/web/src/lib/visualizer/core/AudioTextureManager.ts` | Audio→GPU pipeline | No change needed |
| `apps/web/src/remotion/RayboxComposition.tsx` | Frame rendering | Memory fixes needed |
| `apps/web/remotion.config.ts` | Remotion config | Resolution scaling |

---

## Conclusion

Raybox is **more ready than not** for agent-CLI automation. The hard parts — GPU compositing, audio-visual mapping, Lambda rendering, type-safe APIs — are all built and working. The missing pieces are:

1. **Project lifecycle** (P1 — blocks everything)
2. **API key auth** (P1 — blocks non-browser use)
3. **Webhooks** (P1 — enables async workflows)
4. **Audio structure detection** (P1 — enables intelligent visual decisions)
5. **Aesthetic preset system** (P1 — translates vibe descriptors to configs)

With ~3-4 weeks of focused work on these 5 items, the platform can support fully automated end-to-end video creation from a vibe descriptor. The result would be a CLI tool that, given a track and a vibe, produces a polished video with no UI required.
