# Codebase Concerns

**Analysis Date:** 2026-02-24

## Tech Debt

**Placeholder Media Processing Implementation:**
- Issue: Video/image metadata extraction and thumbnail generation use hardcoded placeholder JPEG bytes instead of actual ffmpeg/sharp processing
- Files: `apps/api/src/services/media-processor.ts`
- Impact: All video and image uploads return mock metadata (fixed 1920x1080, 60fps, 1-minute duration). Visualization layer setup cannot adapt to actual video dimensions or duration
- Fix approach: Integrate ffprobe for video metadata extraction and ffmpeg for thumbnail generation. Replace placeholder JPEG buffers with real thumbnail generation code.

**Missing File/Download Functionality:**
- Issue: Files page has placeholder implementations for file downloads and deletion
- Files: `apps/web/src/app/files/page.tsx` (lines 131-137 marked as "placeholder - tRPC integration pending")
- Impact: Users cannot download uploaded files or delete unwanted files from the dashboard
- Fix approach: Implement file download via R2 presigned URLs and deletion procedures through tRPC router

**Audio Analysis Delete Operations Not Implemented:**
- Issue: Auto-save provider has placeholder for delete functionality with no actual implementation
- Files: `apps/web/src/components/auto-save/auto-save-provider.tsx` (lines 290-291)
- Impact: Auto-saved editing states cannot be deleted by users
- Fix approach: Implement delete mutations in tRPC auto-save router and update UI provider to call them

**Stubbed Audio Analyzer Simplification:**
- Issue: Simplified placeholder logic in audio analyzer for peak values
- Files: `apps/api/src/services/audio-analyzer.ts` (line 735)
- Impact: Peak-based audio features may not reflect actual audio transients, affecting rhythm-reactive visualizations
- Fix approach: Complete full waveform analysis with proper peak detection algorithm

---

## Known Bugs

**Empty Error Handling in Creative Visualizer:**
- Symptoms: Error conditions silently fail, user gets no feedback
- Files: `apps/web/src/app/creative-visualizer/page.tsx` (lines 2071, 2536 - empty `catch {}` blocks)
- Trigger: When VisualizerManager initialization fails or layer rendering throws errors
- Workaround: Check browser console for error logs; refresh page if visualizer becomes unresponsive

**Image Texture Loading Race Condition:**
- Symptoms: Image Slideshow effect may fail to load images when switching effects rapidly
- Files: `apps/web/src/lib/visualizer/effects/ImageSlideshowEffect.ts` (line 462 - `.catch(() => { })` silently ignores failures)
- Trigger: User rapidly toggles ImageSlideshowEffect on/off or switches between collections
- Workaround: Wait a moment between effect toggles; reload the page if images don't appear

**Portal Modal Container Cleanup:**
- Symptoms: Console warnings if portal modal unmounts while DOM cleanup is in progress
- Files: `apps/web/src/components/ui/portal-modal.tsx` (line 105 - "Container might have already been removed")
- Trigger: Quick navigations away from modals (project creation, picker, etc.)
- Workaround: None needed - error is caught and ignored gracefully

---

## Security Considerations

**Raw Debug Logging of Request Bodies in Production-Like Environment:**
- Risk: Sensitive data (file paths, project metadata, potentially user IDs) logged to console/logs
- Files: `apps/api/src/index.ts` (lines 118-124, 51-56, 132-138)
- Current mitigation: Logging is conditional on `DEBUG_LOGGING` env var (controlled via `process.env.DEBUG_LOGGING === 'true'`)
- Recommendations:
  1. Ensure `DEBUG_LOGGING=false` in production
  2. Remove raw request body logging from production builds entirely
  3. Replace with structured logging that excludes sensitive fields
  4. Implement request/response size limits in logging layer

**Overly Permissive CORS Configuration for Development:**
- Risk: Localhost CORS allows any request from local 3000/3001 without origin validation in dev
- Files: `apps/api/src/index.ts` (lines 74-81 - allows all localhost:3000 requests without verification)
- Current mitigation: Production restricts to specific domains
- Recommendations:
  1. Validate referer header in addition to origin
  2. Add X-Requested-With header requirement for state-changing operations
  3. Consider request signing for critical operations (render, analysis)

**Rate Limiting Stored in Memory Only:**
- Risk: Upload rate limiter uses in-memory Map that resets on server restart; no persistence across instances
- Files: `apps/api/src/lib/file-validation.ts` (lines 346-382)
- Current mitigation: 10 uploads per minute per user enforced in-memory
- Recommendations:
  1. Move rate limiting to Redis or database for scalability
  2. Implement IP-based rate limiting as additional layer
  3. Add exponential backoff for repeated violations

**Executable File Extension Check May Be Bypassable:**
- Risk: Checks only lowercase extension; double extensions or unusual cases might bypass
- Files: `apps/api/src/routers/file.ts` (line 55 - calls `isExecutableFile()`)
- Current mitigation: Whitelist validation of file types, not blacklist
- Recommendations:
  1. Implement magic byte validation for all uploaded files
  2. Store all files with `.bin` extension regardless of original extension
  3. Serve downloads with correct MIME type from database, not file extension

**Supabase Service Role Key in Environment:**
- Risk: Full database access via service role key if leaked
- Files: `apps/api/src/services/audio-analyzer.ts` (line 53), multiple router files
- Current mitigation: Key stored in `.env` file which should not be committed
- Recommendations:
  1. Document `.env` in CONTRIBUTING.md
  2. Rotate key periodically
  3. Consider using row-level security policies for additional protection
  4. Audit Supabase for unused service role keys

---

## Performance Bottlenecks

**Creative Visualizer Page Size (3085 lines):**
- Problem: Single component handles all visualizer logic, state management, and UI
- Files: `apps/web/src/app/creative-visualizer/page.tsx`
- Cause: No component decomposition for effect management, timeline, HUD overlay, audio control
- Improvement path:
  1. Extract EffectsPanel into separate component
  2. Extract AudioControlPanel into separate component
  3. Extract TimelinePanel into separate component
  4. Create custom hooks for each domain (effects, audio, timeline)

**UnifiedTimeline Component Complexity (1292 lines):**
- Problem: Timeline UI, keyframe editing, layer management all in one component
- Files: `apps/web/src/components/video-composition/UnifiedTimeline.tsx`
- Cause: Tight coupling between rendering, state updates, and event handlers
- Improvement path:
  1. Extract KeyframeEditor into separate component
  2. Extract LayerList into separate component
  3. Move keyframe math into custom hook (useKeyframeCalculations)
  4. Memoize layer render items to prevent re-renders

**EffectsLibrarySidebar Size (1261 lines):**
- Problem: Effect browsing, parameter editing, audio mapping all in one component
- Files: `apps/web/src/components/ui/EffectsLibrarySidebar.tsx`
- Cause: Multiple modes (browse, edit, map) implemented inline without abstraction
- Improvement path:
  1. Extract EffectBrowser into separate component
  2. Extract EffectParameterEditor into separate component
  3. Extract AudioFeatureMapper into separate component
  4. Use composition pattern instead of mode switching

**Audio Analysis Worker Processes All Data in Single Buffer:**
- Problem: Worker loads entire audio file into memory, processes in one chunk
- Files: `apps/web/src/app/workers/audio-analysis.worker.ts` (processes entire channelData array)
- Cause: No streaming or chunked processing of audio analysis
- Improvement path:
  1. Implement sliding-window analysis (process 4KB chunks, overlap by 2KB)
  2. Post progress updates to main thread
  3. Clear intermediate buffers after each chunk
  4. Add timeout/cancellation support for large files

**Large Audio File Processing:**
- Problem: Video rendering with 50MB+ audio files can exceed Lambda memory limits
- Files: `apps/api/src/services/audio-analyzer.ts` (loads full WAV buffer in memory)
- Cause: No streaming audio analysis; entire file held in RAM during processing
- Improvement path:
  1. Implement streaming audio processing with fixed buffer size
  2. Use ffmpeg with pipe input to avoid buffering entire file
  3. Post analysis results to database in chunks during processing
  4. Add progress tracking for long-running analyses

**GPU Memory Management in VisualizerManager:**
- Problem: Can accumulate 20+ textures + render targets; no automatic cleanup
- Files: `apps/web/src/lib/visualizer/core/VisualizerManager.ts` (lines 659-663 warn on high memory but don't cleanup)
- Cause: Effects not properly disposed when removed; no LRU cache for textures
- Improvement path:
  1. Implement dispose() method for each effect
  2. Call dispose() when removing effects
  3. Implement texture cache with LRU eviction
  4. Monitor GPU memory periodically and trigger cleanup

---

## Fragile Areas

**VisualizerManager GPU Context Initialization:**
- Files: `apps/web/src/lib/visualizer/core/VisualizerManager.ts`
- Why fragile: WebGL context can be lost on device sleep, tab backgrounding, or GPU memory pressure. Initialization assumes context is stable.
- Safe modification:
  1. Always wrap renderer calls in try-catch
  2. Implement context restoration via `webglcontextlost`/`webglcontextrestored` events
  3. Test with GPU blacklisting in Chrome DevTools
- Test coverage: No specific WebGL context loss tests

**RayboxComposition Stateless Peaks Calculation:**
- Files: `apps/web/src/remotion/RayboxComposition.tsx` (lines 47-82)
- Why fragile: Binary search for transients assumes sorted array. If transients array becomes unsorted (data corruption), calculation silently returns wrong values.
- Safe modification:
  1. Add assertions that transients array is sorted by time
  2. Add fallback if search returns null (return 0 instead of crashing)
  3. Validate transients at composition load time
  4. Add unit tests for edge cases (empty, single, out-of-order transients)
- Test coverage: No tests for calculatePeaksValueStateless function

**Remotion Rendering with Deterministic Output:**
- Files: `apps/web/remotion.config.ts`, `apps/web/src/remotion/RayboxComposition.tsx`
- Why fragile: Uses `chromiumOptions.gl = 'swangle'` for deterministic rendering. If swangle unavailable or changes behavior, videos become non-deterministic (can break automated testing).
- Safe modification:
  1. Check swangle availability at startup
  2. Fall back to standard rendering with warning if swangle unavailable
  3. Version-lock Remotion to known stable version
  4. Test rendering determinism on every release
- Test coverage: No determinism verification tests

**File Type Detection by Extension Only:**
- Files: `apps/api/src/lib/file-validation.ts` (lines 158-178)
- Why fragile: `.mp3` renamed to `.mid` will pass extension check but fail magic byte check. Inconsistent validation means some files accepted on upload but rejected during processing.
- Safe modification:
  1. Always validate magic bytes before accepting file
  2. Rename all files to `.bin` on storage, track real type in database
  3. Use MIME type from upload request as secondary validation
  4. Log all validation mismatches for debugging
- Test coverage: Partial - magic byte tests exist but not integrated with extension tests

**Auto-Save State Serialization:**
- Files: `apps/api/src/services/auto-save.ts` (lines 385+)
- Why fragile: Deserialization of EditState from database has no schema validation. If database schema changes, old records fail to deserialize.
- Safe modification:
  1. Implement Zod schema for EditState deserialization
  2. Add migration function to transform old EditState format
  3. Add version field to serialized state
  4. Test deserialization of old format
- Test coverage: No deserialization error tests

**Asset Manager Collection Sync:**
- Files: `apps/api/src/services/asset-manager.ts` (lines 292-347)
- Why fragile: Returns `(data || []).map()` pattern - will crash if data is undefined but supabase returns object instead of array.
- Safe modification:
  1. Use explicit checks: `Array.isArray(data) ? data : []`
  2. Add TypeScript types for API responses
  3. Add defensive programming for all supabase responses
  4. Test with malformed API responses
- Test coverage: No malformed response tests

---

## Scaling Limits

**R2 Storage Bandwidth:**
- Current capacity: Cloudflare R2 pricing by bandwidth (~$0.015/GB egress)
- Limit: Remotion rendering jobs can generate 50+ MB videos; with 10 concurrent renders = 500MB/minute
- Scaling path:
  1. Implement video caching (cache rendered compositions by content hash)
  2. Use R2 regional endpoints for faster access
  3. Add CDN cache headers to rendered videos
  4. Monitor bandwidth usage via Cloudflare Analytics

**Database Connection Pool in Serverless:**
- Current capacity: Vercel serverless has default connection pool of 3-5
- Limit: More than 5 concurrent API requests exceed pool, requests wait for connection
- Scaling path:
  1. Use Supabase connection pooler (port 6543) instead of direct connection
  2. Implement connection pooling at application level
  3. Add request queuing for database operations
  4. Monitor connection pool saturation in production

**Remotion Lambda Rendering Queue:**
- Current capacity: Remotion SaaS has default concurrency limits
- Limit: More than 2-3 concurrent video renders may hit rate limits or timeout
- Scaling path:
  1. Implement job queue (Bull/RabbitMQ) for render requests
  2. Add batch rendering for multiple compositions
  3. Increase Remotion Lambda concurrency (paid feature)
  4. Pre-render common configurations offline

**Audio File Processing Memory:**
- Current capacity: 8GB heap available in Lambda
- Limit: Processing 500MB+ WAV files exhausts memory during analysis
- Scaling path:
  1. Implement streaming analysis (process 4MB chunks)
  2. Use child processes to isolate audio processing
  3. Store intermediate results in database instead of memory
  4. Split audio into stems before processing

---

## Dependencies at Risk

**Web Audio API Deprecation (ScriptProcessor):**
- Risk: `ScriptProcessorNode` is deprecated in Web Audio API; may be removed in future browser versions
- Impact: Audio analysis worker uses deprecated API for real-time audio extraction
- Migration plan: Replace with `AudioWorkletNode` (already supported in all modern browsers)

**Meyda Audio Feature Extraction Maintenance:**
- Risk: Meyda.js is community-maintained library with infrequent updates
- Impact: Audio feature extraction (spectral centroid, MFCC, etc.) depends on maintained external library
- Migration plan:
  1. Consider implementing core features (RMS, spectral centroid) natively using Web Audio API
  2. Evaluate alternatives like tf.js audio models
  3. Keep Meyda as fallback with feature flag

**Remotion Rendering Stability:**
- Risk: Remotion uses headless Chrome rendering; breaking changes in Chrome can break exports
- Impact: Video export pipeline is critical feature; version incompatibility breaks all exports
- Migration plan:
  1. Lock Remotion to specific minor version (not just major)
  2. Test video export on every deployment
  3. Have manual rendering fallback process documented
  4. Monitor Remotion GitHub for known issues

---

## Missing Critical Features

**Stem Separation Quality Control:**
- Problem: No way to verify stem separation output quality before rendering
- Blocks: Users cannot check if vocals are properly isolated before video export
- Recommendation: Add stem playback with visual waveform comparison to original

**Video Composition Preview at Export Quality:**
- Problem: Creative visualizer uses real-time WebGL rendering; exported video uses Remotion Lambda which may render differently
- Blocks: Users can't verify final output looks correct before long export job
- Recommendation: Add "Export Preview" mode that uses same rendering as Lambda

**Collaboration/Sharing:**
- Problem: Projects are single-user; no way to share or collaborate
- Blocks: Teams cannot work on same project simultaneously
- Recommendation: Implement project sharing with RLS policies for permissions

---

## Test Coverage Gaps

**Stateless Peak Calculation Edge Cases:**
- What's not tested: Binary search with empty array, out-of-order transients, transients beyond composition duration
- Files: `apps/web/src/remotion/RayboxComposition.tsx` (lines 47-82)
- Risk: Edge cases could return NaN or incorrect peak values during render
- Priority: **High** - affects deterministic video output

**GPU Context Loss Handling:**
- What's not tested: WebGL context loss recovery, re-initialization of shaders after context restore
- Files: `apps/web/src/lib/visualizer/core/VisualizerManager.ts`
- Risk: Visualizer becomes unusable after GPU memory pressure or device sleep
- Priority: **High** - common issue on laptops with shared GPU

**File Upload Validation Integration:**
- What's not tested: Real file validation with actual ffmpeg header detection, MIME type mismatches
- Files: `apps/api/src/lib/file-validation.ts`, `apps/api/src/routers/file.ts`
- Risk: Malicious files could bypass validation if only extension checked
- Priority: **High** - security issue

**Audio Analysis Worker Memory Cleanup:**
- What's not tested: Large file analysis (>100MB) memory cleanup, worker termination after analysis
- Files: `apps/web/src/app/workers/audio-analysis.worker.ts`
- Risk: Long-running analysis could leak memory and crash browser tab
- Priority: **Medium** - affects large file support

**Remotion Render Error Handling:**
- What's not tested: Network failures during render, R2 access failures, composition syntax errors
- Files: `apps/api/src/routers/render.ts`
- Risk: Failed renders don't provide clear error messages to users
- Priority: **Medium** - affects user experience

**Auto-Save Conflict Resolution:**
- What's not tested: Concurrent save attempts, deserialization of corrupted EditState, version mismatches
- Files: `apps/api/src/services/auto-save.ts`
- Risk: Users lose work or get corrupted state if auto-save fails
- Priority: **High** - user data safety

---

*Concerns audit: 2026-02-24*
