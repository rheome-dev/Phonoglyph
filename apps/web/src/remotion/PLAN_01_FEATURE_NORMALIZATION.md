# Implementation Plan: Audio Feature Normalization

## Problem Statement

Audio feature values (rms, bass, mid, treble, volume, etc.) are currently raw values with vastly different ranges depending on the source audio. For example:
- Bass stem: max=0.069, avg=0.024
- Master stem: max=0.503, avg=0.188

This causes inconsistent modulation behavior where the same `modulationAmount` produces dramatically different visual effects depending on the audio content.

## Goal

Normalize all time-series audio features to a 0-1 range where:
- `0` = minimum value of that feature across the entire track
- `1` = maximum value of that feature across the entire track

This ensures consistent, predictable modulation regardless of source audio loudness.

## Implementation Location

**Primary file:** `apps/web/src/workers/audio-analysis.worker.ts`

The normalization should happen at the end of analysis, after all frames are computed but before the results are sent back to the main thread.

## Step-by-Step Implementation

### Step 1: Identify Features to Normalize

Add a constant defining which features need normalization:

```typescript
const FEATURES_TO_NORMALIZE = [
  'rms',
  'volume',
  'loudness',
  'bass',
  'mid',
  'treble',
  'spectralCentroid',
  'spectralRolloff',
  'spectralFlux',
  'zcr',
  'energy',
  'perceptualSharpness',
  'perceptualSpread'
] as const;
```

### Step 2: Create Normalization Function

```typescript
function normalizeFeatureArray(arr: Float32Array | number[]): Float32Array {
  if (!arr || arr.length === 0) return new Float32Array(0);

  let min = Infinity;
  let max = -Infinity;

  // Find min/max in single pass
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }

  // Avoid division by zero
  const range = max - min;
  if (range === 0) {
    // All values identical - return array of 0s or 1s based on value
    return new Float32Array(arr.length).fill(max > 0 ? 1 : 0);
  }

  // Normalize to 0-1
  const normalized = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    normalized[i] = (arr[i] - min) / range;
  }

  return normalized;
}
```

### Step 3: Store Original Max Values for Reference

To enable debugging and potential de-normalization, store the original max values in metadata:

```typescript
interface FeatureNormalizationMeta {
  [featureName: string]: {
    originalMin: number;
    originalMax: number;
    wasNormalized: boolean;
  };
}
```

### Step 4: Apply Normalization Before Returning Results

Locate the section where `analysisData` is assembled (after all frame processing). Add normalization step:

```typescript
// After all features are computed, before returning:
const normalizationMeta: FeatureNormalizationMeta = {};

for (const feature of FEATURES_TO_NORMALIZE) {
  const arr = analysisData[feature];
  if (arr && arr.length > 0) {
    const min = Math.min(...arr);
    const max = Math.max(...arr);

    normalizationMeta[feature] = {
      originalMin: min,
      originalMax: max,
      wasNormalized: true
    };

    analysisData[feature] = normalizeFeatureArray(arr);
  }
}

// Add normalization metadata to the result
analysisData.normalizationMeta = normalizationMeta;
```

### Step 5: Update Type Definitions

In `apps/web/src/types/audio-analysis-data.ts`, add:

```typescript
export interface FeatureNormalizationMeta {
  [featureName: string]: {
    originalMin: number;
    originalMax: number;
    wasNormalized: boolean;
  };
}

// Update AnalysisData interface to include:
export interface AnalysisData {
  // ... existing fields
  normalizationMeta?: FeatureNormalizationMeta;
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/workers/audio-analysis.worker.ts` | Add normalization logic |
| `apps/web/src/types/audio-analysis-data.ts` | Add `FeatureNormalizationMeta` type |

## Verification

After implementation:

1. Run audio analysis on a test file
2. Check that all normalized features have values between 0-1
3. Verify that the maximum value in each normalized array is exactly 1.0
4. Check that `normalizationMeta` contains the original min/max values

```typescript
// Debug verification in console:
const analysis = getAnalysis(fileId, 'master');
console.log('Bass range:', Math.min(...analysis.analysisData.bass), Math.max(...analysis.analysisData.bass));
// Should output: Bass range: 0 1
```

## Edge Cases

1. **Silent audio**: If all values are 0, return array of 0s
2. **Constant value**: If min === max and value > 0, return array of 1s
3. **Very short audio**: Still works, just fewer frames to normalize
4. **Negative values**: Some features (like waveform data) can be negative. The formula `(v - min) / range` handles this correctly.

## Rollback Plan

The normalization is non-destructive if `normalizationMeta` is preserved. To get original values:

```typescript
const originalValue = normalizedValue * (meta.originalMax - meta.originalMin) + meta.originalMin;
```
