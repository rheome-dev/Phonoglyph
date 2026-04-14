# ImageSlideshow Lambda Flicker Debug

## Context

I have a MIDI visualization platform (Phonoglyph) that renders audio-reactive videos via Remotion Lambda on AWS. One of the effects is `ImageSlideshowEffect` — it cycles through user-uploaded images triggered by audio transient events (drum hits, etc.).

**The problem**: In Lambda-rendered videos, the slideshow effect produces a single-frame flash/flicker on image transitions instead of clean, stable image swaps. The images appear for one frame then disappear, or the wrong image briefly flashes before the correct one shows.

## What I've Already Tried

The last 5+ commits have attempted to fix this with increasingly complex approaches — all failed or caused new issues:

1. **Added a second `delayRender` handle** (`slideshowPreloadHandle`) to block rendering until slideshow images were preloaded — this was buggy (`slideshowPreloadDoneRef` started as `true`, so `continueRender` was never called) and caused a 58s timeout crash. **I've now removed this entirely.**

2. **Added `slideEventsInitialized` guard** — prevents `updateWithTime` from running before `slideEvents` are set, to avoid briefly flashing the wrong slide on Lambda chunk restarts.

3. **Force `material.needsUpdate`** on every texture swap for swangle (software WebGL) compatibility.

4. **Look-ahead preloading** — preload the next image during each transition.

5. **Various safety timeouts and race conditions** patched with refs and guards.

## Current State After Cleanup

The `slideshowPreloadHandle` system has been removed. The flow is now:

1. Single `delayRender('Initializing Visualizer')` blocks rendering
2. `waitForAssets` in `useLayoutEffect`:
   - Creates effects via `EffectRegistry`
   - Populates `slideEvents` on slideshow effects from audio analysis transient data
   - Calls `waitForImages()` on each effect (8s race timeout)
   - Calls `continueRender(handle)` when done
3. 15s safety timeout as fallback

## The Core Question

**Why does the ImageSlideshow effect flicker/flash single frames in Lambda renders, and what's the correct architecture to prevent it?**

Specifically investigate:

1. **Texture loading race condition**: When `updateWithTime` calculates a new slide index and calls `loadTexture()`, is there a frame where the old texture is cleared but the new one hasn't loaded yet? In the browser this is invisible (sub-frame), but Lambda captures every frame.

2. **Lambda chunk boundary problem**: Lambda splits renders into chunks. When a new chunk starts, does the effect lose its texture state? The `slideEventsInitialized` guard helps but may not be sufficient.

3. **swangle (software WebGL) differences**: Lambda uses `chromiumOptions.gl = 'swangle'` for deterministic rendering. Does swangle handle texture uploads differently? The `material.needsUpdate = true` force-set was added for this.

4. **Stateless vs stateful rendering**: The effect tracks `lastCalculatedIndex` and `currentImageIndex` as instance state. On Lambda chunk restarts, this state resets. Is the stateless `slideEvents` approach (pre-calculated transition times) working correctly?

5. **First-frame flash**: Is there a frame rendered before `waitForImages` completes where no texture is applied, causing a black/empty flash?

## Key Architecture Points

- **ImageSlideshowEffect** extends no base class — it implements `VisualEffect` interface directly and manages its own Three.js scene/material/mesh
- **Texture loading** is async via `THREE.TextureLoader` with a cache (`textureCache: Map<string, THREE.Texture>`)
- **`updateWithTime(time, audioFeatures)`** is called every frame by `VisualizerManager` — it calculates which slide index to show based on `slideEvents` (transient timestamps)
- **`waitForImages()`** preloads only the first image to avoid Lambda OOM (34 images would crash 3008MB Lambda)
- **Look-ahead preloading** loads the next image during each transition, so it's ready before the next slide change

## Files Included in the Repomix Pack

The attached `slideshow-lambda-debug-pack.md` contains these files with line numbers:

### Effect Layer
- `ImageSlideshowEffect.ts` — The slideshow effect (texture loading, slide index calc, waitForImages)
- `BaseShaderEffect.ts` — Base class for other effects (slideshow doesn't extend this)
- `EffectRegistry.ts` — Effect creation factory
- `EffectDefinitions.ts` — Effect registration

### Remotion Layer
- `RayboxComposition.tsx` — Main composition (delayRender, waitForAssets, effect orchestration)
- `Root.tsx` — Remotion root with `calculateMetadata` (fetches audio data for Lambda)
- `RemotionOverlayRenderer.tsx` — Renders visualizer layers per-frame
- `index.ts` — Remotion entry point
- `remotion.config.ts` — Remotion config (swangle, timeouts)

### Core Visualizer
- `VisualizerManager.ts` — Orchestrates all effects, calls `updateWithTime`
- `MultiLayerCompositor.ts` — GPU-based layer compositing
- `MediaLayerManager.ts` — Bridges 2D/video elements with GPU pipeline
- `AudioTextureManager.ts` — Packs audio features into GPU textures

### API / Types
- `render.ts` — Lambda render trigger API route
- `export-utils.ts` — Export utilities
- `audio-analysis-data.ts` — Audio analysis type definitions
- `video-composition.ts` — Video composition types

## What I Need From You

1. **Root cause analysis**: Trace the exact code path that causes the flicker. Show me the specific lines where the race condition occurs.

2. **Minimal fix**: Propose the simplest possible change that fixes the flicker without adding new complexity. The previous approach of adding a second `delayRender` was overcomplicated and broken — I want to go simpler, not more complex.

3. **Lambda chunk safety**: Ensure the fix works across Lambda chunk boundaries where effect state resets.

4. **No new delayRender handles**: The single `delayRender('Initializing Visualizer')` should be sufficient. Don't propose adding more.

Please read the full repomix pack carefully before responding. Show specific line numbers and code references.
