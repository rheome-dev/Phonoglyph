# Effect Lambda Render Audit

Audit of all 40+ effects for patterns that could cause Lambda/swangle render failures.
Based on findings from the bloom effect investigation (commit `f8aba91a0`).

## Failure Patterns Identified

| ID | Pattern | Severity | Description |
|----|---------|----------|-------------|
| P1 | **Stale accumulation texture** | Critical | Effect calls `getAccumulatedTextureBeforeLayer()` during update phase, before `compositor.render()` fills current-frame render targets. First frame of each Lambda chunk reads empty/black texture. |
| P2 | **Resolution-dependent radius** | Medium | Blur/sample radius specified in fixed pixel counts. Looks fine at 720p preview but invisible at 1080p Lambda render. |
| P3 | **Stateful/temporal effects** | Medium | Effects that depend on previous frame state (ping-pong buffers, feedback loops). Lambda chunks start fresh — no previous frame exists. |
| P4 | **Heavy texture sampling** | Low | Effects with many `texture2D` calls per pixel. Swangle (software renderer) handles these much slower than GPU. Can cause Lambda timeouts on long compositions. |
| P5 | **Missing `toneMapped: false`** | Low | Now fixed globally in `BaseShaderEffect`. But custom materials created outside the base class (e.g., AsciiFilterEffect) may still have `toneMapped: true` default. |

---

## Effects Using Compositor Accumulation (P1 — Stale Texture)

These effects call `getAccumulatedTextureBeforeLayer()` and are affected by the stale texture pattern.
The fix in `f8aba91a0` added `refreshAccumulationTarget()` to the compositor's render loop, which
re-accumulates using freshly-rendered prior layer render targets. This fixes **all** effects using
accumulation, not just bloom.

| Effect | File | Uses Accumulation | Status |
|--------|------|-------------------|--------|
| **BloomEffect** | `BloomEffect.ts` | Via `BaseShaderEffect.updateWithTime()` | ✅ Fixed by compositor refresh |
| **AsciiFilterEffect** | `AsciiFilterEffect.ts` | Custom `update()` at line 408-410 | ✅ Fixed by compositor refresh |
| **All BaseShaderEffect subclasses** | `BaseShaderEffect.ts:144-148, 173-177` | Via `update()` and `updateWithTime()` | ✅ Fixed by compositor refresh |

### Effects inheriting BaseShaderEffect accumulation (all fixed):

Every effect that extends `BaseShaderEffect` and gets a `setCompositor()` call will use
`getAccumulatedTextureBeforeLayer()`. The compositor refresh fix covers all of these automatically.

**However**: Only effects that actually READ from `uTexture` (accumulated layers below) are affected.
Effects that generate their own content (e.g., MetaballsEffect, ParticleNetworkEffect) don't use
the accumulated texture even though the uniform exists — `uTexture` remains null for them.

**Effects that READ from accumulated layers (filter/post-process effects):**
- BloomEffect ✅
- AsciiFilterEffect ✅
- ChromaticAbberationEffect
- CRTEffect
- DitherEffect
- GlitchEffect
- GrainEffect
- HalftoneEffect
- PixelateEffect
- PosterizeEffect
- BlurEffect
- BokehEffect
- DiffusionEffect
- FogEffect
- ProgressiveBlurEffect
- RadialBlurEffect
- BulgeEffect
- FbmEffect
- LiquifyEffect
- NoiseEffect
- PolarEffect
- RippleEffect
- SineWavesEffect
- SkyboxEffect
- StretchEffect
- SwirlEffect
- TrailEffect
- WaterRipplesEffect
- WavesEffect
- GodRaysEffect
- GlitterEffect
- ReplicateEffect

All of these inherit the fix via the compositor's `refreshAccumulationTarget()`.

---

## Resolution-Dependent Effects (P2 — Fixed Pixel Radius)

Effects where blur/sample radius doesn't scale with render resolution.
At 1080p Lambda renders, these produce proportionally smaller effects than at 720p preview.

| Effect | File | Issue | Recommended Fix |
|--------|------|-------|-----------------|
| **BloomEffect** | `BloomEffect.ts` | 4px radius at 1080p | ✅ Fixed — added `resScale = max(res) / 720.0` |
| **DiffusionEffect** | `DiffusionEffect.ts:39` | `radius = uSize * 0.005` — tiny fixed multiplier | Add resolution scaling: `radius = uSize * 0.005 * resScale` |
| **BlurEffect** | `BlurEffect.ts:61` | `amount = uRadius * uIntensity * 0.001` — tiny fixed multiplier | Scale by resolution: `amount = uRadius * uIntensity * 0.001 * resScale` |
| **BokehEffect** | `BokehEffect.ts` | Fixed pixel offsets in blur loop | Add resolution scaling to offset calculation |
| **ProgressiveBlurEffect** | `ProgressiveBlurEffect.ts` | Fixed pixel-based offsets | Add resolution scaling |

**Not affected** (use UV-space or normalized coordinates):
- RippleEffect (UV-space distortion)
- SwirlEffect (UV-space distortion)
- BulgeEffect (UV-space distortion)
- FbmEffect (UV-space distortion)
- LiquifyEffect (UV-space distortion)
- All fill effects (GradientFill, NoiseFill, Pattern, etc.)

---

## Stateful/Temporal Effects (P3 — No Previous Frame)

Effects that depend on previous frame state. Lambda chunks start with fresh WebGL state,
so the first frame of each chunk has no history.

| Effect | File | Issue | Severity |
|--------|------|-------|----------|
| **TrailEffect** | `TrailEffect.ts:35-36` | Comment says "requires multi-pass rendering (ping-pong buffers) which is not fully supported." Current implementation is a no-op passthrough (`gl_FragColor = color`). | None (broken in both envs) |
| **WaterRipplesEffect** | `WaterRipplesEffect.ts` | Stateless per-frame — uses `sin()` functions, no frame history needed. | None |

**Assessment**: No effects currently use true ping-pong buffers or frame history. TrailEffect is
a stub that passes through unchanged. If true temporal effects are added in the future, they will
need a warm-up mechanism for Lambda (render N previous frames before the chunk's first visible frame).

---

## Heavy Texture Sampling (P4 — Swangle Performance)

Effects with high texture sample counts per pixel. Swangle (software renderer) is ~100x slower
than GPU for texture lookups. At 1080x1920 resolution, each additional `texture2D` call adds
~2M software lookups per frame.

| Effect | File | Samples/pixel | Risk |
|--------|------|---------------|------|
| **GodRaysEffect** | `GodRaysEffect.ts:89` | **50** (`MAX_ITERATIONS = 50`) | 🔴 High — 103M lookups/frame at 1080p |
| **BloomEffect** | `BloomEffect.ts` | 25 (5×5 grid) | 🟡 Medium — 51M lookups/frame |
| **CRTEffect** | `CRTEffect.ts:79` | ~25 (blur + scanlines) | 🟡 Medium |
| **BlurEffect** | `BlurEffect.ts:68-73` | 18 (9-tap × 2 directions) | 🟡 Medium |
| **BokehEffect** | `BokehEffect.ts` | ~16 (circular sampling) | 🟡 Medium |
| **RadialBlurEffect** | `RadialBlurEffect.ts` | ~12 (6 pairs) | 🟢 Low |
| **ReplicateEffect** | `ReplicateEffect.ts` | ~10 (aberration loop) | 🟢 Low |

**Mitigation**: For Lambda, consider reducing `MAX_ITERATIONS` on GodRays (50→25 would halve
render time with minimal visual difference). Could be gated by `getRemotionEnvironment().isRendering`.

---

## Precision Concerns (Swangle-specific)

Swangle's software GLSL compiler may not support `highp` in fragment shaders on all platforms.
Most effects declare `precision highp float` which is fine on hardware GPUs but could silently
fall back to `mediump` (16-bit) in swangle.

| Effect | Precision | Risk |
|--------|-----------|------|
| **HalftoneEffect** | `mediump float` | ✅ Explicitly safe |
| **PosterizeEffect** | `mediump float` | ✅ Explicitly safe |
| **PixelateEffect** | `mediump float` | ✅ Explicitly safe |
| **GlitchEffect** | `highp float` + `highp int` | 🟡 Int precision for block calculations |
| **DitherEffect** | `highp float` + `highp int` | 🟡 Int precision for Bayer matrix indexing |
| **GrainEffect** | `highp float` + `highp int` | 🟡 Int precision for noise hash |
| All others | `highp float` | 🟢 Generally fine — `mediump` fallback produces slightly noisier but functional output |

**Assessment**: Precision fallback is unlikely to cause render failures. At worst, it produces
subtle visual differences (e.g., slightly different noise patterns in grain, minor banding in
gradients). Not a blocking issue.

---

## AsciiFilterEffect — Special Case

`AsciiFilterEffect` has its own compositor integration (doesn't inherit from `BaseShaderEffect`'s
`update()`/`updateWithTime()`). It has a custom `update()` method that calls
`this.compositor.getAccumulatedTextureBeforeLayer()` directly at line 410.

**Status**: ✅ Fixed by the compositor refresh. The accumulation target is refreshed during
`compositor.render()` regardless of when/where the effect calls `getAccumulatedTextureBeforeLayer()`.
The key fix is that `refreshAccumulationTarget()` runs in the render loop before the ASCII layer
renders, so the accumulation target has current-frame data by the time the ASCII shader reads it.

**Additional concern**: AsciiFilterEffect creates its own `ShaderMaterial` (not via `BaseShaderEffect.createMaterial()`).
This material may not have `toneMapped: false` set. Should verify and fix if needed.

---

## Summary of Required Actions

### Already Fixed (commit f8aba91a0)
- [x] Stale accumulation texture — all effects using `getAccumulatedTextureBeforeLayer()` (P1)
- [x] Bloom resolution scaling (P2)
- [x] `toneMapped: false` on BaseShaderEffect materials (P5)
- [x] `toneMapped: false` on compositor blend materials (P5)

### Fixed (follow-up batch)
- [x] **DiffusionEffect** — Added `resScale = max(res) / 720.0` to blur radius (P2)
- [x] **BlurEffect** — Added `resScale` to blur amount calculation (P2)
- [x] **BokehEffect** — Added `resScale` to hexagonal sampling offsets (P2)
- [x] **ProgressiveBlurEffect** — Added `resScale` to progressive blur amount (P2)
- [x] **AsciiFilterEffect** — Added `toneMapped: false` to custom ShaderMaterial (P5)
- [x] **GodRaysEffect** — Reduced `MAX_ITERATIONS` from 50 to 30 for Lambda performance (P4)

### No Action Needed
- TrailEffect — Already a stub/no-op
- All distortion effects — Use UV-space coordinates, resolution-independent
- All fill/generative effects — Don't read from accumulated layers
- Precision concerns — Not blocking, cosmetic differences only
