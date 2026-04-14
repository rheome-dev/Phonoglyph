# Fix Stereometer Time-Varying Data in Audio Analysis Worker

## Problem
The stereometer overlay is currently using synthetic/mock data in Remotion renders because the audio analysis worker doesn't extract time-varying stereo window data per-frame.

### Current Issues

1. **In `audio-analysis-worker.js`** (lines 602-607): The worker only extracts a SINGLE static stereo window (last 1024 samples), not per-frame data:
   ```javascript
   const leftWindow = buffer.slice(-N);  // Only gets last N samples
   featureFrames.stereoWindow_left = Array.from(leftWindow);
   featureFrames.stereoWindow_right = Array.from(leftWindow);
   ```
   This should extract stereo windows at each frame position, similar to how FFT is extracted.

2. **In `RemotionOverlayRenderer.tsx`**: There's synthetic fallback code that generates mock timeData from FFT magnitudes. This should be removed once real data is available.

## Required Changes

### 1. Fix `apps/web/public/workers/audio-analysis-worker.js`

Modify the feature extraction loop to extract stereo windows at each frame position, not just once at the end:

- At each frame position (in the loop that processes `currentPosition` through the audio):
  - Extract a window of N samples (e.g., 1024) ending at `currentPosition`
  - Store left and right channel data as `stereoWindow_left[]` and `stereoWindow_right[]` arrays
  - This should be per-frame, similar to how FFT is flattened

- Review how FFT is currently flattened (line 637: `flatFeatures.fft = allFrames.flat()`) and apply similar pattern to stereo windows

- Ensure the output format matches what `RemotionOverlayRenderer.tsx` expects

### 2. Fix `apps/web/src/remotion/RemotionOverlayRenderer.tsx`

Remove the synthetic fallback in the stereometer section (around lines 160-200):

- Remove the code that synthesizes timeData from FFT magnitudes
- Rely purely on the `extractAudioDataAtTime()` function which now should return proper timeData if available
- Keep the fallback to `stereoWindow_left/right` from analysis data, but these should now be proper time-varying arrays

### 3. Fix `apps/web/src/remotion/RayboxComposition.tsx`

Remove the synthetic timeData generation from FFT (added around lines 170-180):
- Remove the fallback that creates fake timeData from FFT magnitudes
- Only return real timeData if it exists in the analysis

## Verification

After implementing:
1. The stereometer should display real audio waveform data
2. The visualization should match what appears in the live preview (which uses real-time audio buffers)
3. No synthetic/mock data should be used

## Files to Modify

1. `apps/web/public/workers/audio-analysis-worker.js` - Extract per-frame stereo windows
2. `apps/web/src/remotion/RemotionOverlayRenderer.tsx` - Remove synthetic fallback
3. `apps/web/src/remotion/RayboxComposition.tsx` - Remove synthetic timeData generation
