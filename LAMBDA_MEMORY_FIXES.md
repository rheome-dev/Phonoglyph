# Lambda Memory Optimization Fixes

**Created:** 2026-03-18
**Problem:** Remotion Lambda renders consistently hit the 3008MB memory ceiling and crash with `Runtime.OutOfMemory` when projects use 7-8+ effects. Every Lambda chunk (20 frames) maxes out at 2998-3008MB.

**Root Cause Summary:** MSAA 4x on all render targets (~430MB wasted), debug payload bundled in Lambda (~15-20MB), unneeded audio analysis fields loaded in full, and no Lambda-aware resolution scaling.

---

## Fix #1: Disable MSAA on render targets in Lambda context

**Status:** pending
**Priority:** highest
**Estimated savings:** ~430MB per Lambda invocation
**Risk:** Low — MSAA has no visual benefit in swangle software rendering

### Problem

`MultiLayerCompositor.ts:122` creates every WebGLRenderTarget with `samples: 4` (4x MSAA). At 1080x1920, each RT costs **31.6MB** vs **7.9MB** without MSAA. With 8 effects, there are ~18 render targets = **569MB with MSAA** vs **142MB without**. ~430MB wasted on antialiasing that's invisible in software-rendered (swangle) Lambda output.

### Implementation

1. In `apps/web/src/lib/visualizer/core/MultiLayerCompositor.ts`, modify `createRenderTarget()` (line 111) to accept or detect Lambda context
2. Use `getRemotionEnvironment().isRendering` to detect Lambda — if true, set `samples: 0`
3. Also check the compositor constructor — pass a flag or detect environment there
4. The `accumulationTargets` created at line 465 also need the same treatment

### Files

- `apps/web/src/lib/visualizer/core/MultiLayerCompositor.ts` (primary)
- May need to import `getRemotionEnvironment` from 'remotion' (handle gracefully if not in Remotion context)

---

## Fix #2: Exclude debug-payload.json from Lambda bundle

**Status:** pending
**Priority:** high
**Estimated savings:** ~15-20MB per Lambda invocation
**Risk:** Very low — Debug composition is never used in production Lambda renders

### Problem

`Root.tsx:33` does `require('./debug-payload.json')` at module load time. This 4.7MB JSON file gets parsed into a ~15-20MB JS object on **every** Lambda invocation, even for production renders that only use the "RayboxMain" composition and never touch the "Debug" composition.

### Implementation

1. In `apps/web/src/remotion/Root.tsx` (lines 30-44), gate the debug payload loading behind an environment check
2. Option A: Use `process.env.NODE_ENV !== 'production'` guard
3. Option B: Use dynamic `import()` only for the Debug composition
4. Option C: Remove the Debug composition entirely from the production bundle (preferred — it's only for local Remotion Studio testing)
5. The `TEST_PAYLOAD` variable is only referenced at line 220 in the Debug composition's `defaultProps`

### Files

- `apps/web/src/remotion/Root.tsx` (lines 30-44, line 220)
- Consider adding `debug-payload.json` to `.gitignore` or a Remotion bundle exclude list

---

## Fix #3: Trim audio analysis payload for Lambda renders

**Status:** pending
**Priority:** high
**Estimated savings:** 40-60% reduction in analysis data size in RAM
**Risk:** Medium — must be careful to keep fields needed by overlay effects. Layer-aware trimming mitigates this.

### Problem

The full audio analysis data uploaded to R2 (at `render.ts:146`) includes many fields never used during Lambda rendering. The render pipeline (`RayboxComposition.tsx`) only uses: `rms`/`volume`, `bass`, `mid`, `treble`, `spectralCentroid`, `transients`, and `frameTimes`. But the payload also ships per stem: `fft` (256 bins x 250 frames), `stereoWindow_left/right` (1024 x 250 frames each), `waveformData`, `amplitudeSpectrum`, `energy`, `perceptualSharpness`, `perceptualSpread`, `spectralFlux`, `spectralFlatness`, `zcr`, `chroma`, `markers`, etc.

### Implementation

1. In `apps/api/src/routers/render.ts`, before the R2 upload (line 146), create a trimmed copy of `audioAnalysisData`
2. Strip these unused fields per stem's `analysisData`:
   - `fft` — only used by `extractAudioDataAtTime()` for frequency/timeData, BUT check if any overlay effects need it (`RemotionOverlayRenderer.tsx` uses fft for spectrumAnalyzer/vuMeter overlays — keep if those overlays are in the layers)
   - `stereoWindow_left`, `stereoWindow_right` — only used for stereometer overlay timeData extraction. Strip unless stereometer overlay is in layers
   - `amplitudeSpectrum`, `energy`, `perceptualSharpness`, `perceptualSpread`, `spectralFlux`, `spectralFlatness`, `zcr` — NEVER referenced in render code
   - `waveformData` — NEVER used in render (UI-only for waveform display)
   - `chroma` — only used by chromaWheel overlay. Strip unless chromaWheel is in layers
   - `normalizationMeta` — not used in render
3. **Always keep:** `frameTimes`, `rms`, `volume`, `loudness`, `bass`, `mid`, `treble`, `spectralCentroid`, `spectralRolloff`, `transients`, `bpm`
4. Make the trimming **layer-aware**: inspect `input.layers` to see which overlay types are present, and conditionally keep `fft`/`stereoWindow`/`chroma` if their respective overlays exist

### Files

- `apps/api/src/routers/render.ts` (add trimming function before line 146)
- Reference: `apps/web/src/remotion/RayboxComposition.tsx` (getFeatureValueFromCached switch statement, lines 280-301)
- Reference: `apps/web/src/remotion/RemotionOverlayRenderer.tsx` (getRequiredFeatures, lines 19-33)

---

## Fix #4: Add reduced resolution option for Lambda renders

**Status:** pending
**Priority:** medium
**Estimated savings:** ~55% render target memory at 720p (79MB saved for 18 RTs scenario)
**Risk:** Low — quality trade-off is user's choice. 720p is still good for social media.

### Problem

Lambda always renders at full resolution (1080x1920 for 9:16, 1920x1080 for 16:9). Each render target at 1080x1920 costs 7.9MB (without MSAA). At 720x1280, it's only 3.5MB — a 55% reduction. With 18 render targets, that's 142MB vs 63MB.

### Implementation

1. Add a `lambdaResolution` option to the render trigger schema in `apps/api/src/routers/render.ts` (e.g., `'full' | '720p' | '540p'`)
2. Pass this through to `inputProps` so `calculateMetadata` in `Root.tsx` can scale dimensions
3. In `Root.tsx:calculateMetadata()`, if `lambdaResolution` is set, scale the `width`/`height` proportionally:
   - `'full'`: 1080x1920 (default, current behavior)
   - `'720p'`: 720x1280 (55% memory reduction on RTs)
   - `'540p'`: 540x960 (75% reduction — emergency fallback)
4. Update the frontend export UI to offer this option, defaulting to `'720p'` for Lambda renders
5. Consider auto-detecting: if effect count > 6, suggest or auto-use 720p

### Files

- `apps/api/src/routers/render.ts` (schema + passthrough)
- `apps/web/src/remotion/Root.tsx` (calculateMetadata resolution scaling)
- `apps/web/src/app/creative-visualizer/page.tsx` (UI option)
- `apps/web/src/lib/export-utils.ts` (payload construction)

---

## Fix #5: Time-window analysis loading per Lambda chunk

**Status:** pending
**Priority:** medium-low (implement after #1-3)
**Estimated savings:** ~80% of analysis RAM per Lambda chunk
**Risk:** Medium-high — requires changes to both upload and fetch paths

### Problem

Each Lambda chunk renders only 20 frames (~0.33s at 60fps), but fetches the ENTIRE analysis JSON from R2 via `fetch(analysisUrl)` in both `calculateMetadata()` (Root.tsx:132) and `RayboxComposition.tsx:485`. For a 3-minute song with 6 stems, this is the full dataset loaded into memory per chunk.

### Implementation

1. **Server-side chunking:** In `render.ts`, instead of uploading one monolithic JSON, split the analysis into time-indexed chunks (e.g., 5-second windows) and upload each as a separate R2 object:
   - `analysis-cache/{userId}-{timestamp}/manifest.json` (metadata: duration, chunk size, stem list)
   - `analysis-cache/{userId}-{timestamp}/chunk-0.json` (0-5s)
   - `analysis-cache/{userId}-{timestamp}/chunk-1.json` (5-10s)
2. **Client-side selective loading:** In `RayboxComposition.tsx`, calculate which time window the current Lambda chunk needs (from frame range), and only fetch the relevant chunk(s)
3. **Fallback:** Keep the full-fetch path as fallback if chunked data isn't available
4. Pass `analysisManifestUrl` instead of `analysisUrl` in inputProps

**Note:** Needs careful handling of chunk boundaries — peaks/transients lookback windows may span chunk edges. Include a buffer overlap (e.g., 2 seconds before chunk start).

### Files

- `apps/api/src/routers/render.ts` (chunked upload logic)
- `apps/web/src/remotion/Root.tsx` (calculateMetadata — fetch manifest + relevant chunk)
- `apps/web/src/remotion/RayboxComposition.tsx` (chunk-aware fetching in useEffect)

---

## Fix #6: Skip effects outside Lambda chunk time window

**Status:** pending
**Priority:** medium-low
**Estimated savings:** Variable — up to ~50% effect memory for time-staggered projects
**Risk:** Low-medium — need to handle edge cases where effects start mid-chunk

### Problem

Every Lambda chunk instantiates ALL effect layers regardless of whether they're visible in the chunk's time range. Each effect creates GPU resources (scene, camera, shader material, mesh, geometry). If a layer's `startTime`/`endTime` doesn't overlap with the chunk's frame range, those resources are wasted.

### Implementation

1. In `RayboxComposition.tsx`, during effect initialization (lines 620-637), calculate the chunk's time range from the frame range:
   - `const chunkStartTime = firstFrameOfChunk / fps`
   - `const chunkEndTime = lastFrameOfChunk / fps`
2. Skip effect creation for layers where `layer.endTime < chunkStartTime || layer.startTime > chunkEndTime`
3. The `updateTimelineState()` call at line 913 already handles visibility, but by then the effects are already instantiated and consuming memory
4. Move the time-gating to BEFORE effect creation
5. Use conservative overlap: include effects with any overlap + 1 second buffer

**Note:** Need to determine the Lambda chunk's frame range. Remotion provides frames sequentially within each chunk. Could use a ref to track min/max frames seen, or derive from `framesPerLambda` setting.

### Files

- `apps/web/src/remotion/RayboxComposition.tsx` (effect initialization block, lines 620-637)
- Reference: Layer type has `startTime` and `endTime` fields

---

## Implementation Order

**Phase 1 (Quick wins — do first):**
1. Fix #1: Disable MSAA (~430MB saved)
2. Fix #2: Exclude debug payload (~15-20MB saved)
3. Fix #3: Trim analysis payload (~40-60% analysis RAM saved)

**Phase 2 (If Phase 1 isn't enough):**
4. Fix #4: Reduced resolution option
5. Fix #6: Skip inactive effects

**Phase 3 (Architectural — only if needed):**
6. Fix #5: Time-window analysis loading
