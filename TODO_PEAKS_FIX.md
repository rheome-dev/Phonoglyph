# Peaks Audio Feature Fix for Remotion

## Problem
Drums peaks in Remotion have a jerky, binary on/off appearance compared to the smooth, nuanced, dynamic behavior in live preview.

## Root Cause
1. **Linear decay** (`1 - elapsed/decayTime`) drops to zero abruptly
2. **Hardcoded decay times** in Remotion (0.3s drums) vs user-configured in live preview
3. **30fps vs 60fps** - fewer frames means less smooth transitions

## Tasks

- [x] Investigate peaks implementation difference between live and Remotion
- [ ] Implement exponential decay for Remotion peaks
- [ ] Pass user-configured decay times in payload (not hardcoded)

---

## Implementation Details

### 1. Exponential Decay (RayboxComposition.tsx)

**File:** `apps/web/src/remotion/RayboxComposition.tsx`

**Current (linear - jerky):**
```typescript
return transient.intensity * (1 - elapsed / decayTime);
```

**New (exponential - smooth):**
```typescript
// The "3" controls decay curve (higher = faster initial drop, longer tail)
return transient.intensity * Math.exp(-elapsed / decayTime * 3);
```

### 2. User-Configured Decay Times in Payload

**Source:** `featureDecayTimesRef` in `use-audio-analysis.ts`

**Add to payload (Root.tsx / export flow):**
```typescript
interface RayboxCompositionProps {
  // ... existing props
  peakDecayTimes?: Record<string, number>; // e.g., { "drums-peaks": 0.5, "bass-peaks": 0.5 }
}
```

**Use in Remotion:**
```typescript
const decayTime = props.peakDecayTimes?.[featureId]
  ?? DEFAULT_PEAK_DECAY_TIMES[featureId]
  ?? DEFAULT_DECAY_TIME;
```

---

## Files to Modify

1. `apps/web/src/remotion/RayboxComposition.tsx` - Exponential decay + read from props
2. `apps/web/src/remotion/Root.tsx` - Add `peakDecayTimes` to props interface
3. `apps/web/src/app/creative-visualizer/page.tsx` - Include decay times in export payload
4. `apps/web/src/hooks/use-audio-analysis.ts` - Export `featureDecayTimesRef` for payload access
