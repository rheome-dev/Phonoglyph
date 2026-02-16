# Implementation Plan: Stateless Peaks Feature for Remotion/Lambda

## Problem Statement

The `peaks` feature in live preview uses stateful logic:
- Tracks the last transient that fired (`lastTransientRefs`)
- Applies decay envelope based on elapsed time since last transient
- Detects playback loops by comparing current time to stored state

This CANNOT work in Lambda where:
- Each frame is rendered by a different instance
- Instances have no shared state
- Frames may render out of order
- Each frame only knows its own timestamp

## Goal

Implement a **stateless** peaks calculation that:
1. Works identically to the live preview version
2. Requires only: current time `t`, transients array, and decay time
3. Can be computed independently for any frame

## Key Insight

The peaks algorithm is actually stateless at its core. For any time `t`:

1. Find the most recent transient where `transient.time <= t`
2. If `(t - transient.time) < decayTime`: return `intensity * (1 - elapsed/decayTime)`
3. Otherwise: return 0

The "state" in live preview is just an optimization to avoid searching the transients array every frame. In Remotion, we can afford this search since it's not real-time.

## Implementation Location

**Primary file:** `apps/web/src/remotion/RayboxComposition.tsx`

Add peaks case to `getFeatureValueFromCached()` function.

## Step-by-Step Implementation

### Step 1: Add Decay Time Configuration

At the top of the file, add default decay times:

```typescript
const DEFAULT_PEAK_DECAY_TIMES: Record<string, number> = {
  'drums-peaks': 0.3,    // Fast decay for drums
  'bass-peaks': 0.5,     // Medium decay for bass
  'vocals-peaks': 0.4,   // Medium-fast for vocals
  'melody-peaks': 0.5,   // Medium for melody
  'master-peaks': 0.4,   // Default
  'other-peaks': 0.5,
};

const DEFAULT_DECAY_TIME = 0.5;
```

### Step 2: Create Stateless Peaks Helper

Add this function before `getFeatureValueFromCached`:

```typescript
/**
 * Stateless peaks calculation for Remotion/Lambda rendering.
 *
 * Algorithm:
 * 1. Binary search for the most recent transient at or before time `t`
 * 2. If within decay window, return decayed intensity
 * 3. Otherwise return 0
 *
 * This is O(log n) per frame lookup.
 */
function calculatePeaksValueStateless(
  transients: Array<{ time: number; intensity: number; type?: string }>,
  time: number,
  featureId: string
): number {
  if (!transients || transients.length === 0) return 0;

  const decayTime = DEFAULT_PEAK_DECAY_TIMES[featureId] ?? DEFAULT_DECAY_TIME;

  // Binary search for the latest transient at or before `time`
  let lo = 0;
  let hi = transients.length - 1;
  let latestIdx = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (transients[mid].time <= time) {
      latestIdx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // No transient found before this time
  if (latestIdx === -1) return 0;

  const transient = transients[latestIdx];
  const elapsed = time - transient.time;

  // Outside decay window
  if (elapsed < 0 || elapsed >= decayTime) return 0;

  // Apply linear decay envelope
  return transient.intensity * (1 - elapsed / decayTime);
}
```

### Step 3: Add Peaks Case to Switch Statement

In `getFeatureValueFromCached`, add the peaks case before the default:

```typescript
function getFeatureValueFromCached(
  cachedAnalysis: CachedAudioAnalysisData[],
  fileId: string,
  feature: string,
  time: number,
  stemType?: string,
): number {
  // ... existing stem parsing logic (lines 33-44) ...

  // ... existing analysis lookup (lines 46-55) ...

  const normalizedFeature = featureName.toLowerCase().replace(/-/g, '');

  // ADD THIS CASE for peaks/transients
  if (normalizedFeature === 'peaks') {
    const transients = analysisData.transients;
    if (!transients || !Array.isArray(transients)) return 0;

    // Construct full feature ID for decay time lookup
    const fullFeatureId = `${parsedStem}-peaks`;
    return calculatePeaksValueStateless(transients, time, fullFeatureId);
  }

  // ... existing switch statement ...
  switch (normalizedFeature) {
    case 'rms':
      return getTimeSeriesValue(analysisData.rms);
    // ... rest of cases ...
  }
}
```

### Step 4: Ensure Transients Array is Sorted

The binary search assumes transients are sorted by time. Add a safety sort if needed:

```typescript
// In calculatePeaksValueStateless, at the start:
// Sort once if not already sorted (defensive, should already be sorted from worker)
const sortedTransients = transients.slice().sort((a, b) => a.time - b.time);
```

Or better, ensure sorting in the analysis worker when transients are generated.

## Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/remotion/RayboxComposition.tsx` | Add `calculatePeaksValueStateless()`, add peaks case to switch |

## Algorithm Correctness Proof

For any frame at time `t`:

1. **Deterministic**: Same `t` + same transients array = same output
2. **Stateless**: No external state needed, only function arguments
3. **Order-independent**: Frame 100 doesn't need frame 99's result
4. **Matches live preview**: Same decay formula: `intensity * (1 - elapsed/decayTime)`

The only difference from live preview:
- Live preview caches `lastTransientRefs` as optimization
- Remotion does binary search each frame (O(log n), negligible for ~100 transients)

## Verification

1. **Unit test the helper function:**
```typescript
const transients = [
  { time: 1.0, intensity: 0.8 },
  { time: 2.5, intensity: 0.6 },
  { time: 4.0, intensity: 1.0 },
];

// At t=1.0 (exactly on transient): should return 0.8
// At t=1.25 (50% through decay): should return 0.4
// At t=1.5 (100% through 0.5s decay): should return 0
// At t=3.0 (0.5s after 2.5 transient): should return 0
// At t=2.6 (0.1s after 2.5 transient): should return ~0.48
```

2. **Visual verification in Remotion preview:**
   - Render a few frames around known transient times
   - Verify that the effect responds to beats

3. **Compare to live preview:**
   - Play same audio in live preview
   - Render same frames in Remotion
   - Values should match (within floating point tolerance)

## Edge Cases

| Case | Handling |
|------|----------|
| No transients in audio | Returns 0 for all frames |
| Time before first transient | Returns 0 |
| Time exactly on transient | Returns full intensity |
| Time after all transients + decay | Returns 0 |
| Very fast audio (many transients) | Binary search still O(log n) |
| Negative time (shouldn't happen) | Returns 0 |

## Performance

- Binary search: O(log n) where n = number of transients
- Typical audio: 50-200 transients
- Per-frame cost: ~7-8 comparisons max
- Total for 30s at 30fps: 900 frames × 8 comparisons = negligible

## Optional Enhancement: Configurable Decay Times

If you want per-mapping decay time control, extend the mapping type:

```typescript
interface FeatureMapping {
  featureId: string | null;
  modulationAmount: number;
  decayTime?: number;  // Optional override
}
```

Then pass it to `calculatePeaksValueStateless`:

```typescript
const decayTime = mapping.decayTime ?? DEFAULT_PEAK_DECAY_TIMES[featureId] ?? DEFAULT_DECAY_TIME;
```

This allows users to configure decay per effect in the UI.
