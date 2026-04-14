# Pre-extract stereo windows for stereometer in Remotion Lambda renders

## Problem

The stereometer overlay in Lambda renders shows **zero points** because `getFeatureDataForOverlay` is memoized without `audioReady` in its dependency array, so it never re-runs after the master audio is decoded.

## What was attempted

Adding `audioReady` to `useCallback` deps in `RemotionOverlayRenderer.tsx` fixes the data issue but causes **Lambda Chromium crashes** ("Page crashed!") due to memory pressure. The crash occurs at varied frames (638–1539 out of ~9000), confirming memory accumulation over time.

## Root cause of the crash

The `extractStereoWindow()` function runs on **every frame**, allocating 2×1024-element Float32Arrays (~8KB) per call. At 30fps for a 5-minute video: ~9,000 calls × 8KB = ~72MB of JS heap allocations just for stereo windows, plus GC pressure from churn. This is on top of the already memory-constrained Lambda Chromium environment (~300MB budget for page heap).

## Long-term fix: pre-extraction

Instead of extracting stereo windows per-frame during render, **pre-compute all ~9,000 stereo windows upfront** (one-time cost) and store them in a `Map<frame, {left, right}>`. Then during render, lookups are O(1) with zero allocation.

### Architecture

```
RemotionOverlayRenderer.tsx
├── useEffect (decode + pre-extract)
│   ├── 1. Fetch masterAudioUrl → ArrayBuffer
│   ├── 2. OfflineAudioContext.decodeAudioData(arrayBuffer) → AudioBuffer
│   ├── 3. For each frame 0..totalFrames:
│   │       windows.set(frame, extractStereoWindow(audioBuffer, frameTime, 1024))
│   └── 4. audioWindowsRef.current = windows
│       audioReady = true
│       continueRender(delayHandle)
│
├── getFeatureDataForOverlay
│   └── if stereometer: return { stereoWindow: audioWindowsRef.current.get(frame) }
│       // O(1) lookup, zero allocation
```

### Memory cost after fix

- Pre-computed windows: `9,000 frames × 2 × 1024 × 4 bytes = ~73MB` (one-time, static)
- Per-frame cost: O(1) lookup from Map, zero allocation
- Total: ~73MB fixed overhead instead of ~72MB+ GC churn

### Files to modify

1. **`apps/web/src/remotion/RemotionOverlayRenderer.tsx`**
   - Change `audioBufferRef` to `audioWindowsRef: useRef<Map<number, {left: number[], right: number[]}>>`
   - Modify `useEffect` to pre-compute all stereo windows into the Map
   - Remove the per-frame `extractStereoWindow` call from `getFeatureDataForOverlay`
   - Keep `audioReady` dep — needed so the callback re-runs when pre-extraction completes

### Key code locations

- **Decode + extract logic**: `RemotionOverlayRenderer.tsx:109-136` (useEffect)
- **Stereo window lookup**: `RemotionOverlayRenderer.tsx:265-272` (getFeatureDataForOverlay stereometer case)
- **extractStereoWindow helper**: `RemotionOverlayRenderer.tsx:41-82` (already exists, move to pre-compute phase)
- **Callback deps**: `RemotionOverlayRenderer.tsx:359` (currently `[cachedAnalysis, currentTime, audioReady]`)

### Implementation steps

1. Change `audioBufferRef` → `audioWindowsRef` of type `Map<number, {left: number[], right: number[]}>`
2. In the `useEffect`, after decoding the `AudioBuffer`, iterate all frames and pre-compute windows into the Map
3. In `getFeatureDataForOverlay` for stereometer, look up from `audioWindowsRef.current.get(frame)` instead of calling `extractStereoWindow` live
4. Verify `audioReady` is still in deps so the callback re-runs after pre-computation completes
5. Commit, push, redeploy to S3

### Related files (read-only context)

- `apps/web/src/components/hud/HudOverlay.tsx:178` — `drawStereometer()` expects `{stereoWindow: {left, right}}`
- `apps/web/src/remotion/RayboxComposition.tsx:961` — passes `masterAudioUrl` to `RemotionOverlayRenderer`

### Test plan

1. Lambda render with stereometer overlay should produce video with animated goniometer points (not blank)
2. Render should complete without Chromium page crash
3. Verify the goniometer animation matches the live preview's stereometer output
