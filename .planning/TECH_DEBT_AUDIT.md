# Phonoglyph Technical Debt Audit

**Date**: 2026-03-22
**Overall Debt Score**: 7.5/10 (HIGH)

---

## Executive Summary

The Phonoglyph codebase has significant technical debt concentrated in three areas: **massive component files** (3K+ lines), **duplicated effect boilerplate** (~3,000 lines across 45 files), and **near-zero test coverage** on the core visualizer system. The backend is reasonably structured but has fire-and-forget promise patterns and Zod version conflicts.

---

## 1. Code Complexity Debt

### God Files (>1000 lines)

| File | Lines | Problem |
|------|-------|---------|
| `apps/web/src/app/creative-visualizer/page.tsx` | **3,112** | Monolithic: state, audio, effects, export, UI all in one file |
| `apps/web/src/components/ui/EffectsLibrarySidebar.tsx` | **1,309** | Effect browsing, parameter mapping, collection mgmt combined |
| `apps/web/src/components/video-composition/UnifiedTimeline.tsx` | **1,288** | Drag-drop, zoom/pan, sequencing, waveform rendering combined |
| `apps/api/src/routers/file.ts` | **1,190** | 41 endpoints crammed into one router |
| `apps/web/src/lib/visualizer/core/VisualizerManager.ts` | **1,165** | Effect lifecycle, shader updates, audio textures, compositor |
| `apps/web/src/remotion/RayboxComposition.tsx` | **1,034** | Deterministic rendering + state management |
| `apps/web/src/components/ui/HudOverlay.tsx` | **970** | 6+ overlay types in one component |
| `apps/web/src/lib/visualizer/effects/ImageSlideshowEffect.ts` | **949** | Image mgmt, transitions, collection loading |
| `apps/web/src/lib/visualizer/effects/ParticleNetworkEffect.ts` | **838** | Particle system with dual update paths |

### Complex Methods (>50 lines)

- `VisualizerManager.renderFrame()` — 106 lines, 5+ nesting levels
- `VisualizerManager.updateEffectParameter()` — 83 lines, 4+ nesting levels
- `EffectsLibrarySidebar.getSliderMax()` — 46-case switch statement
- `EffectsLibrarySidebar.getSliderStep()` — 46+ case switch statement
- `creative-visualizer` audio useEffect — ~150 lines, 6+ nesting levels

### Massive Code Duplication (~3,000 lines)

**45 effect files** repeat identical `updateParameter()` boilerplate:
```typescript
updateParameter(paramName: string, value: any): void {
  switch (paramName) {
    case 'param1':
      this.parameters.param1 = clamp(value, min, max);
      if (this.uniforms) this.uniforms.uParam1.value = this.parameters.param1;
      break;
    // ... repeated 5-10 times per effect
  }
}
```

Also duplicated: `syncParametersToUniforms()` and `getCustomUniforms()` patterns.

**Fix**: Move to metadata-driven parameter definitions in base class. Define parameter ranges/names declaratively, auto-generate update logic.

---

## 2. Architecture Debt

### Hardcoded Production URLs

| File | Line | URL |
|------|------|-----|
| `apps/api/src/index.ts` | 74-80 | `phonoglyph.rheome.tools`, `phonoglyph.vercel.app` in CORS |
| `apps/web/src/lib/trpc-links.ts` | 104-106 | `api.phonoglyph.rheome.tools` fallback |
| `apps/api/src/services/r2-storage.ts` | 56-67 | `localhost:3000`, `phonoglyph.rheome.tools` in bucket CORS |

**Fix**: Move all URLs to environment variables.

### Environment Variables — No Startup Validation

- `r2-storage.ts`: R2 config uses `process.env` with `!` assertions — crashes at runtime if missing
- `connection.ts`: DB pool uses fallback defaults (`DB_PASSWORD || 'password'`)
- `index.ts`: Hardcoded CORS alongside env vars

**Fix**: Centralized config validation module that throws at startup on missing vars.

### State Management — Zustand Store Issues

- `visualizerStore.ts`: Contains `Record<string, Record<string, any>>` — deep any types
- `timelineStore.ts`: Uses `Date.now()` for IDs — breaks deterministic Lambda rendering
- `projectSettingsStore.ts`: Only 2 values — could be merged
- No computed/derived selectors for frequently-accessed data
- No cross-store synchronization

### Effects ↔ Core Coupling

`BaseShaderEffect` and `AsciiFilterEffect` directly import `MultiLayerCompositor`. Effects should depend on an abstract texture source interface, not compositor internals.

### API Input Validation — `z.any()` in Schemas

| File | Location | Issue |
|------|----------|-------|
| `routers/render.ts` | L32, L62-85 | `settings: z.any()`, audio arrays accept `z.any()` |
| `routers/auto-save.ts` | L9-12 | `data: z.record(z.any())` |

**Fix**: Replace with specific union types or discriminated unions.

---

## 3. Testing Debt

### Coverage Summary

| Area | Files | Tests | Coverage |
|------|-------|-------|----------|
| Visualizer core (`lib/visualizer/`) | 62 | 0 | **0%** |
| Effects (40+ shaders) | 45+ | 0 | **0%** |
| Frontend hooks | 8 | 0 | **0%** |
| Zustand stores | 3 | 0 | **0%** |
| React components | 20+ | 0 | **0%** |
| Remotion compositions | 4 | 0 | **0%** |
| Backend services | 11 | ~1 | **~9%** |
| Backend routers | 10 | 2-3 | **~25%** |

**The core product (GPU visualizer) has zero test coverage.**

### Test Quality Issues

- **Duplicate test files**: Tests exist in both `/src/test/` AND `/src/tests/` directories
- `basic.test.ts` only tests `1 + 1 === 2`
- Heavy `vi.fn()` with loose `any` mocking
- No GPU/WebGL test infrastructure
- No coverage thresholds configured in vitest

### Missing Error Handling

**Fire-and-forget promises** in critical paths:

- `routers/stem.ts:63-140`: `StemSeparator.processStem()` `.then()` chain with **no `.catch()`** — silent failure
- `routers/file.ts`: Database errors logged but not thrown — operation continues in broken state
- `hooks/use-upload.ts`: No retry logic, no timeout handling
- Multi-step DB operations without transactions — risk of partial state corruption

---

## 4. Dependency Health

### Version Conflicts

| Package | API Version | Web Version | Risk |
|---------|-------------|-------------|------|
| **zod** | `^3.22.4` | `^3.25.67` | HIGH — validation behavior differences |

### Outdated Dependencies

| Package | Current | Latest | Gap |
|---------|---------|--------|-----|
| TypeScript | 5.3.3 | 5.9.3 | 6 minor versions (~1 year old) |
| @vitest/coverage-v8 | 3.2.4 | 4.1.0 | 1 major version |
| concurrently | 8.2.2 | 9.2.1 | 1 major version |

### Type Safety Erosion

- **184 instances** of `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`
- **69+ `any` types** in visualizer effects code
- Key offenders: `creative-visualizer/page.tsx`, `audio-analysis.worker.ts`, `trpc.ts`

---

## 5. Infrastructure Debt

### CI/CD — Stub Deployments

`.github/workflows/ci.yml:120-143` has placeholder deploy steps:
```yaml
- name: Deploy to staging
  run: echo "This would deploy to your staging server"
```

### Logging — Inconsistent Strategy

- 180+ console calls across codebase
- Backend mixes `console.error`, `logger.error`
- Frontend mixes `console.log`, `debugLog.log`
- Remotion files use raw `console.log` (23 occurrences)

### FIX/TODO Comments — 41 Found

16 `FIX` comments and 25+ `TODO` comments indicating patched-but-not-refactored areas.

---

## 6. Prioritized Remediation Plan

### Quick Wins (Week 1-2, High ROI)

| # | Action | Effort | Savings |
|---|--------|--------|---------|
| 1 | **Fix Zod version conflict** — align API to `^3.25.67` | 1h | Prevents runtime validation bugs |
| 2 | **Add `.catch()` to stem.ts promise chain** | 1h | Prevents silent job failures |
| 3 | **Move hardcoded URLs to env vars** | 2h | Eliminates deploy brittleness |
| 4 | **Add startup config validation** | 4h | Catches missing env vars immediately |
| 5 | **Standardize logging** — pick one logger per layer | 4h | Reduces log noise, easier debugging |
| 6 | **Verify `.env` not in git history** | 1h | Security |

### Medium-Term (Month 1-2)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 7 | **Extract updateParameter boilerplate** — metadata-driven params | 16h | Removes ~3,000 lines of duplication |
| 8 | **Split `creative-visualizer/page.tsx`** into hooks + container | 24h | 3,112→5 files of ~500 lines |
| 9 | **Split `file.ts` router** — file, media, metadata, processing | 8h | 1,190→4 focused routers |
| 10 | **Replace top 20 `as any`** with proper types | 8h | Type safety for critical paths |
| 11 | **Add tests for backend services** — stem, audio, queue | 16h | Covers critical untested pipelines |
| 12 | **Replace `z.any()` schemas** with typed schemas | 4h | Input validation safety |

### Long-Term (Quarter 2)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 13 | **Add visualizer unit tests** — at least core + top 10 effects | 40h | Tests core product |
| 14 | **Decouple effects from MultiLayerCompositor** — use interface | 16h | Cleaner architecture |
| 15 | **Split EffectsLibrarySidebar** — generic param sliders from metadata | 16h | 1,309→4 components |
| 16 | **Implement real CI/CD deployment** | 8h | Automated deploys |
| 17 | **Upgrade TypeScript** to 5.8+ | 8h | Language features, security patches |
| 18 | **Add deterministic ID generation** for Remotion context | 4h | Fixes `Date.now()` in Lambda |

---

## Debt Reduction KPIs

| Metric | Current | Target (3 months) |
|--------|---------|-------------------|
| Files >1000 lines | 6 | 0 |
| Duplicated boilerplate lines | ~3,000 | <200 |
| `as any` / `@ts-ignore` count | 184 | <50 |
| Test coverage (visualizer) | 0% | 40% |
| Test coverage (backend services) | 9% | 60% |
| `z.any()` in schemas | 6+ | 0 |
| Hardcoded URLs | 6+ | 0 |
| FIX/TODO comments | 41 | <15 |
