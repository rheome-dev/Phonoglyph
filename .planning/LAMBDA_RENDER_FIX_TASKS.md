# Lambda Render Pipeline - Diagnosis & Fix Tasks

**Date:** 2026-03-11
**Symptom:** `triggerRender` succeeds (returns `renderId` + `bucketName`), but `getRenderStatus` returns 500, followed by "Rate Exceeded" on subsequent polls.

---

## Root Cause Analysis

### Primary Issue: Lambda Concurrency Exhaustion + Redundant Invocations

Each `getRenderStatus` poll (every 5 seconds) triggers **two Lambda invocations**:
1. `getFunctions()` — invokes Lambda to list compatible functions
2. `getRenderProgress()` — invokes Lambda to check render status

Meanwhile, `concurrencyPerRender: 25` means the render itself consumes up to 25 concurrent Lambda invocations for chunk rendering. Combined with polling, this easily exceeds the account's Lambda concurrency limit (AWS default: 1000, but many accounts have lower reserved limits).

The "Rate Exceeded" error originates from AWS's `TooManyRequestsException` — confirmed in `@remotion/lambda-client` source at `node_modules/.pnpm/@remotion+lambda-client@4.0.390/...`:
```
err.stack?.includes("TooManyRequestsException: Rate Exceeded.")
```

### Secondary Issues

1. **No `skipLambdaInvocation` flag** — Remotion v4.0.218+ supports `skipLambdaInvocation: true` on `getRenderProgress()`, which queries S3 directly instead of invoking Lambda. This eliminates the Lambda invocation cost and avoids rate limits entirely.

2. **Function name re-fetched every poll** — `getFunctions()` is called in both `triggerRender` AND every `getRenderStatus` call. The function name should be resolved once and cached/passed through.

3. **No exponential backoff** — Frontend polls every 5 seconds with no backoff. When errors occur, it just `continue`s the loop at the same rate.

4. **Zod schema strips fields** — `getProjectExportPayload()` returns `featureDecayTimes` and `featureSensitivities`, but `triggerRenderSchema` doesn't include them. Zod strips unknown keys by default, so these fields never reach the Lambda composition.

5. **`getRenderStatus` is a mutation** — Should be a query for semantic correctness and potential caching, though this is cosmetic.

---

## Fix Tasks

### TASK 1: Add `skipLambdaInvocation` to `getRenderProgress` (Critical)
**File:** `apps/api/src/routers/render.ts` (lines 252-257)
**Impact:** Eliminates Lambda invocation on every poll, fixing the rate limit issue entirely.

**Change:**
```typescript
// BEFORE (line 252-257)
const progress = await getRenderProgress({
  renderId: input.renderId,
  bucketName: input.bucketName,
  functionName,
  region,
});

// AFTER
const progress = await getRenderProgress({
  renderId: input.renderId,
  bucketName: input.bucketName,
  functionName,
  region,
  skipLambdaInvocation: true, // Query S3 directly, no Lambda invocation
});
```

**Docs:** https://www.remotion.dev/docs/lambda/getrenderprogress#skiplambdainvocation

---

### TASK 2: Cache function name — stop calling `getFunctions()` on every poll (Critical)
**File:** `apps/api/src/routers/render.ts`
**Impact:** Eliminates redundant Lambda invocation per poll.

**Change:** Two options:

**Option A (Recommended):** Pass `functionName` from `triggerRender` response through to `getRenderStatus`:
1. Add `functionName` to `triggerRender` return value (line 201-204)
2. Add `functionName` to `getRenderStatus` input schema (line 216-219)
3. Remove `getFunctions()` call from `getRenderStatus` (lines 228-243)
4. Update frontend to pass `functionName` through the polling loop

**Option B (Quick fix):** Module-level cache in render.ts:
```typescript
let cachedFunctionName: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000 * 10; // 10 minutes

async function getRemotionFunctionName(region: string): Promise<string> {
  const now = Date.now();
  if (cachedFunctionName && now - cacheTimestamp < CACHE_TTL) {
    return cachedFunctionName;
  }

  const DEFAULT_NAME = 'remotion-render-4-0-390-mem2048mb-disk2048mb-120sec';
  try {
    const functions = await getFunctions({ region, compatibleOnly: true });
    cachedFunctionName = functions[0]?.functionName || DEFAULT_NAME;
  } catch {
    cachedFunctionName = DEFAULT_NAME;
  }
  cacheTimestamp = now;
  return cachedFunctionName;
}
```

---

### TASK 3: Add exponential backoff to frontend polling (Important)
**File:** `apps/web/src/app/creative-visualizer/page.tsx` (lines 961-1004)
**Impact:** Reduces load when errors occur, improves UX with better error reporting.

**Change:**
```typescript
// BEFORE (line 961-1004)
while (true) {
  await new Promise(r => setTimeout(r, 5000));
  // ...
}

// AFTER
let pollInterval = 5000;    // Start at 5s
const MAX_POLL = 30000;     // Max 30s
let consecutiveErrors = 0;
const MAX_ERRORS = 10;

while (true) {
  await new Promise(r => setTimeout(r, pollInterval));

  try {
    const status = await getStatus.mutateAsync({ renderId, bucketName });
    consecutiveErrors = 0;        // Reset on success
    pollInterval = 5000;          // Reset interval on success

    const progressPercent = Math.round((status.overallProgress || 0) * 100);
    setRenderProgress(progressPercent);

    if (status.fatalErrorEncountered) {
      throw new Error(
        `Render failed: ${status.errors?.map((e: any) => e.message).join(', ') || 'Fatal error'}`
      );
    }

    if (status.done && status.outputFile) {
      // ... existing download logic ...
      break;
    }
  } catch (error) {
    consecutiveErrors++;
    if (consecutiveErrors >= MAX_ERRORS) {
      throw new Error(`Render status check failed ${MAX_ERRORS} times. Last error: ${error}`);
    }
    pollInterval = Math.min(pollInterval * 1.5, MAX_POLL);
    console.warn(`Polling error (${consecutiveErrors}/${MAX_ERRORS}), next check in ${pollInterval/1000}s`, error);
  }
}
```

---

### TASK 4: Add `featureDecayTimes` and `featureSensitivities` to render schema (Important)
**File:** `apps/api/src/routers/render.ts` (lines 102-120)
**Impact:** Without these, audio modulation settings are silently dropped during export.

**Change:** Add to `triggerRenderSchema`:
```typescript
const triggerRenderSchema = z.object({
  layers: z.array(layerSchema),
  audioAnalysisData: z.array(audioAnalysisDataSchema),
  visualizationSettings: visualizationSettingsSchema,
  masterAudioUrl: z.string(),
  mappings: z.record(/* ... existing ... */).optional(),
  baseParameterValues: z.record(/* ... existing ... */).optional(),
  // ADD THESE:
  featureDecayTimes: z.record(z.string(), z.number()).optional(),
  featureSensitivities: z.record(z.string(), z.number()).optional(),
});
```

Then ensure they are passed through in `inputProps` (line 186-190):
```typescript
inputProps: {
  ...input,
  audioAnalysisData: [],
  analysisUrl: analysisUrl,
  // featureDecayTimes and featureSensitivities are already in `input` now
},
```

---

### TASK 5: Add initial delay before first poll (Minor)
**File:** `apps/web/src/app/creative-visualizer/page.tsx`
**Impact:** The first `getRenderStatus` call often fails because the Lambda hasn't written initial progress to S3 yet.

**Change:** Increase the initial delay before the first status check:
```typescript
// Before the polling loop:
await new Promise(r => setTimeout(r, 10000)); // Wait 10s before first check
```

---

## Verification

After implementing fixes, verify:
1. `triggerRender` returns `renderId`, `bucketName`, and `functionName`
2. `getRenderStatus` uses `skipLambdaInvocation: true` and receives `functionName` from client
3. No "Rate Exceeded" errors in console during polling
4. Exponential backoff is visible in console logs when transient errors occur
5. A full render completes and downloads successfully

## Reference
- Remotion Lambda docs: https://www.remotion.dev/docs/lambda
- `getRenderProgress` API: https://www.remotion.dev/docs/lambda/getrenderprogress
- Rate limit troubleshooting: https://www.remotion.dev/docs/lambda/troubleshooting/rate-limit
