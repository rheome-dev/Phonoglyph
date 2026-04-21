# Phonoglyph Technical Audit Report

**Date**: 2026-04-21
**Auditor**: PAI
**Score**: 8/20 (Poor)

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | Icon buttons missing aria-label; keyboard traps in dropzone divs |
| 2 | Performance | 1/4 | Full `three` imports in 51 files; 60fps rAF loop setting React state; layout thrashing |
| 3 | Responsive Design | 2/4 | Creative visualizer is desktop-only; icon buttons <44px touch target |
| 4 | Theming | 2/4 | Dark mode CSS defined but never applied; hardcoded hex colors throughout |
| 5 | Anti-Patterns | 1/4 | Glassmorphism, purple/cyan gradients, gradient text, Inter font — heavy AI aesthetic |
| **Total** | | **8/20** | **Poor (major overhaul needed)** |

**Rating bands**: 18-20 Excellent, 14-17 Good, 10-13 Acceptable, 6-9 Poor, 0-5 Critical

---

## Anti-Patterns Verdict

**FAIL — Heavy AI aesthetic, 4+ tells detected.**

| Tell | Severity | Location |
|------|----------|----------|
| Purple/cyan/blue gradients | CRITICAL | `globals.css:432-477` (5 gradient classes), `landing-page.tsx:30-49` |
| Glassmorphism everywhere | CRITICAL | `GlassCard.tsx` (dedicated component), `globals.css:259-291` (4 glass variants) |
| Gradient text | FAIL | `globals.css:433-444` (`background-clip: text`), `landing-page.tsx:131` |
| Inter font in base | FAIL | `globals.css:64` — `Inter` in `--font-sans` |
| Hero metric + card grid | Partial | Landing page has `text-7xl font-bold` with gradient text accent; project dashboard has identical glass cards |

---

## Executive Summary

- **Audit Health Score**: **8/20** (Poor)
- **Total issues by severity**: P0=6, P1=18, P2=9, P3=7
- **Top 5 critical issues**:
  1. Visualizer page has no mobile adaptation (P0)
  2. 51 files import full `three` bundle (~600KB each) (P0)
  3. `HudOverlayManager` drives 60fps React re-renders (P0)
  4. `.dark` class never applied — dark mode is cosmetic (P1)
  5. Project dropzone divs are keyboard traps (P1)
- **Recommended next steps**: Address P0s immediately, then P1s before release

---

## Detailed Findings by Severity

### P0 — Blocking (fix immediately)

**1. Visualizer page is desktop-only with no mobile guard**
- **Location**: `apps/web/src/app/creative-visualizer/page.tsx:3073-3074, 3120`
- **Category**: Responsive
- **Impact**: On mobile/tablet, the interface overflows horizontally with fixed `w-[260px]` / `w-[360px]` sidebars
- **WCAG**: 1.4.4 (Resize text), 1.4.10 (Reflow)
- **Recommendation**: Add a guard with "Desktop required" fallback, or implement responsive panels with container queries
- **Suggested command**: `/shape`

**2. 51 files import full `three` bundle**
- **Location**: `apps/web/src/lib/visualizer/effects/*.ts` (50 files), `core/*.ts` (multiple)
- **Category**: Performance
- **Impact**: Every effect file pulls ~600KB of Three.js even when only `Vector3` is needed. Only `MultiLayerCompositor.ts` does this correctly.
- **Recommendation**: Replace `import * as THREE from 'three'` with subpath imports like `import { Vector3 } from 'three'`
- **Suggested command**: `/optimize`

**3. HudOverlayManager fires React state updates 60 times per second**
- **Location**: `apps/web/src/components/hud/HudOverlayManager.tsx:58-66`
- **Category**: Performance
- **Impact**: Entire overlay component tree re-renders every frame regardless of whether HUD content changed
- **Recommendation**: Replace the `setFrame(f => f + 1)` rAF loop with a subscription model that only re-renders when HUD data actually changes
- **Suggested command**: `/optimize`

**4. Project dropzone divs are keyboard traps**
- **Location**: `apps/web/src/components/projects/project-creation-modal.tsx:185-217, 312-343`
- **Category**: Accessibility
- **Impact**: `div[role="button" tabIndex={0}]` is focusable but Enter/Space do nothing — WCAG 2.1.1 failure
- **WCAG**: 2.1.1 (Keyboard)
- **Recommendation**: Add `onKeyDown` handler or convert to `<button>`
- **Suggested command**: `/harden`

**5. `.dark` class is defined but never applied**
- **Location**: `apps/web/src/app/globals.css:210-235`, `apps/web/src/app/layout.tsx`
- **Category**: Theming
- **Impact**: Dark mode CSS variables are written but inaccessible; users cannot switch themes; Tailwind `dark:` classes are inert
- **Recommendation**: Install `next-themes`, wrap app in `<ThemeProvider>`, add theme toggle UI
- **Suggested command**: `/impeccable`

**6. Hardcoded hex colors in canvas/WebGL components**
- **Location**: `HudOverlay.tsx:137-161, 532-545`; `EffectDefinitions.ts:524, 569, 602`; `MappingSourcesPanel.tsx:172, 188`; `stem-waveform.tsx:35-38`
- **Category**: Theming
- **Impact**: Canvas visualizations cannot respond to theme changes; colors like `#00ff00`, `#00ffff`, `#ff0` are deeply embedded in JSX
- **Recommendation**: Create a `visualizerColors` theme token set in CSS variables
- **Suggested command**: `/impeccable`

---

### P1 — Major (fix before release)

**7. 7 MIDI transport icon buttons missing aria-label**
- **Location**: `apps/web/src/components/midi/midi-controls.tsx:72-150`
- **Category**: Accessibility
- **Impact**: Screen reader users cannot identify SkipBack, Play/Pause, Stop, SkipForward, ZoomOut, ZoomIn, Settings buttons
- **WCAG**: 1.1.1 (Non-text Content), 4.1.2 (Name, Role, Value)
- **Recommendation**: Add `aria-label="Skip back"`, `aria-label="Play or pause"`, etc.
- **Suggested command**: `/harden`

**8. No `onKeyDown` handlers across entire codebase (only 1 exists)**
- **Location**: `settings/page.tsx:140` (the only instance)
- **Category**: Accessibility
- **Impact**: Keyboard-only users cannot activate any button in the landing page, EffectsLibrarySidebar category toggle, SOLO button, or any interactive div
- **WCAG**: 2.1.1 (Keyboard)
- **Recommendation**: Add `onKeyDown` to all `div[role="button"]`, icon buttons, and toggle controls
- **Suggested command**: `/harden`

**9. Settings page tabs missing ARIA tab attributes**
- **Location**: `apps/web/src/app/settings/page.tsx:362-391`
- **Category**: Accessibility
- **Impact**: No `role="tablist"`, `role="tab"`, `aria-selected`, or `aria-controls` on tab buttons
- **WCAG**: 4.1.2 (Name, Role, Value)
- **Recommendation**: Add proper ARIA tab pattern per MDN docs
- **Suggested command**: `/harden`

**10. 5 range/number inputs without label associations**
- **Location**: `midi-controls.tsx:185-195, 235-245, 248-258`; `HudOverlayParameterModal.tsx:290-317, 340`
- **Category**: Accessibility
- **Impact**: `<label>` elements present but not associated via `htmlFor`/`id`
- **WCAG**: 1.3.1 (Info and Relationships)
- **Recommendation**: Add `id` to each input and matching `htmlFor` on labels
- **Suggested command**: `/harden`

**11. Auth forms missing aria-describedby and aria-invalid**
- **Location**: `signup-form.tsx:138, 152, 165, 178`; `login-form.tsx:90, 111`
- **Category**: Accessibility
- **Impact**: Error messages not announced to screen readers when validation fails
- **WCAG**: 1.3.1, 3.3.1 (Error Identification)
- **Recommendation**: Add `aria-describedby={errorId}` and `aria-invalid={!!error}` to inputs
- **Suggested command**: `/harden`

**12. getBoundingClientRect called inside render/animation loops**
- **Location**: `HudOverlay.tsx:684, 712, 897, 909`; `analysis-visualization.tsx:73, 143, 192`; `effect-carousel.tsx:138`; `UnifiedTimeline.tsx:907`
- **Category**: Performance
- **Impact**: Forces synchronous layout recalculation on every frame or mouse move
- **Recommendation**: Cache rect values in refs, update only on resize/scroll events
- **Suggested command**: `/optimize`

**13. Purple/cyan/blue gradients across landing page and CSS**
- **Location**: `globals.css:432-477` (5 classes); `landing-page.tsx:30-49`
- **Category**: Anti-Pattern
- **Impact**: One of the most recognizable AI design tells — brand spec says "Stone, bone, and amber" and "Abandon purple"
- **Recommendation**: Replace purple-to-blue gradients with warm stone/amber tones per the brand spec
- **Suggested command**: `/distill`

**14. Glassmorphism used decoratively throughout**
- **Location**: `GlassCard.tsx` (dedicated component); `globals.css:259-291` (4 variants); used in 10+ files
- **Category**: Anti-Pattern
- **Impact**: Glass effects are used as decorative wrappers, not for functional purposes; violates brand principle "Premium restraint"
- **Recommendation**: Audit glass usage — remove from decorative contexts (card backgrounds, section dividers), keep only for functional purposes (drag overlays, modal backdrops)
- **Suggested command**: `/distill`

**15. Inter font in base typography**
- **Location**: `globals.css:64` — `--font-sans: 'Inter', 'Helvetica Neue', 'Arial', sans-serif`
- **Category**: Anti-Pattern
- **Impact**: Inter is the #1 AI font tell; brand spec calls for Instrument Sans
- **Recommendation**: Replace `Inter` with `Instrument Sans` (already imported in the project)
- **Suggested command**: `/typeset`

**16. Contrast failures — text-white/50-70% on dark backgrounds**
- **Location**: `EffectsLibrarySidebar.tsx:396, 825, 897, 908, 940, 1023, 1029`; `HudOverlayParameterModal.tsx:197, 250, 288, 311, 334`
- **Category**: Accessibility
- **Impact**: `text-white/50` on dark background = ~3:1 contrast ratio, below WCAG AA 4.5:1 minimum
- **WCAG**: 1.4.3 (Contrast Minimum, Level AA)
- **Recommendation**: Raise to `text-white/80` minimum; `text-white/70` acceptable for large text
- **Suggested command**: `/harden`

**17. Two `<select>` elements missing labels**
- **Location**: `EffectsLibrarySidebar.tsx:943-951` (scrollbar style select), `EffectsLibrarySidebar.tsx:1171-1179` (parameter select)
- **Category**: Accessibility
- **Impact**: Screen readers cannot label these selects
- **WCAG**: 1.3.1 (Info and Relationships)
- **Recommendation**: Add `<label>` with `htmlFor` matching select `id`, or `aria-label` on the select
- **Suggested command**: `/harden`

**18. SOLO button missing aria-pressed**
- **Location**: `UnifiedTimeline.tsx:183-196`; `midi-controls.tsx:164-175`
- **Category**: Accessibility
- **Impact**: Toggle state not communicated to screen readers
- **WCAG**: 4.1.2 (Name, Role, Value)
- **Recommendation**: Add `aria-pressed={isActive}` to both SOLO buttons
- **Suggested command**: `/harden`

---

### P2 — Minor (fix in next pass)

**19. Next.js `<Image>` with missing alt prop**
- **Location**: `VideoCompositionTimeline.tsx:140`
- **Category**: Accessibility
- **Impact**: Next.js Image requires alt attribute or will render with empty alt
- **WCAG**: 1.1.1 (Non-text Content)
- **Recommendation**: Add `alt=""` if decorative, or descriptive alt if content
- **Suggested command**: `/harden`

**20. focus:outline-none used instead of focus-visible**
- **Location**: `DraggableFile.tsx:93`; `landing-page.tsx` buttons; `navigation.tsx` buttons
- **Category**: Accessibility
- **Impact**: Shows focus ring on mouse click, not just keyboard — inconsistent with shadcn pattern
- **WCAG**: 2.4.7 (Focus Visible)
- **Recommendation**: Replace `focus:outline-none` with `focus-visible:outline-none focus-visible:ring-2` on custom buttons
- **Suggested command**: `/harden`

**21. Stem separation grid-cols-2 without mobile breakpoints**
- **Location**: `stem-separation-upload.tsx:304, 346, 397`; `audio-stems-upload.tsx:260`; `single-audio-upload.tsx:284`
- **Category**: Responsive
- **Impact**: 2-column grids overflow on mobile
- **Recommendation**: Add `md:grid-cols-2` for proper stacking
- **Suggested command**: `/adapt`

**22. Portal modal close button 16x16px hit area**
- **Location**: `apps/web/src/components/ui/portal-modal.tsx:143`
- **Category**: Responsive
- **Impact**: 16px touch target far below 44px minimum
- **Recommendation**: Add `min-h-11 min-w-11` to close button container
- **Suggested command**: `/adapt`

**23. No React.memo on heavy canvas components**
- **Location**: `HudOverlay.tsx`, `analysis-visualization.tsx`, `UnifiedTimeline.tsx`, `midi-timeline.tsx`
- **Category**: Performance
- **Impact**: Every state change re-renders canvas-heavy components unnecessarily. Only `StemWaveform` has memoization (line 160 of stem-waveform.tsx).
- **Recommendation**: Wrap with `React.memo`
- **Suggested command**: `/optimize`

**24. Landing page has no h1 — starts at h2**
- **Location**: `apps/web/src/components/landing-page.tsx:188-254`
- **Category**: Accessibility
- **Impact**: Document outline skipped; h1 should appear at top of page
- **WCAG**: 1.3.1 (Info and Relationships)
- **Recommendation**: Add `<h1>` with page title at top of landing page content
- **Suggested command**: `/harden`

**25. Visualizer page is a 2700-line monolith**
- **Location**: `creative-visualizer/page.tsx`
- **Category**: Performance
- **Impact**: Every state change re-renders the entire file; hard to maintain
- **Recommendation**: Extract sidebar panels, effects library, timeline controls into separate components with `React.memo`
- **Suggested command**: `/shape`

---

### P3 — Polish (fix if time permits)

**26. `btn-gradient` class uses purple palette**
- **Location**: `globals.css:466-477`
- **Category**: Anti-Pattern
- **Recommendation**: Replace with brand-compatible warm gradient

**27. `.glass-dark` hardcodes dark colors**
- **Location**: `globals.css:414-430`
- **Category**: Theming
- **Recommendation**: Make glass-dark use CSS variables so it adapts to theme changes

**28. Navigation variant prop is static (not a real theme system)**
- **Location**: `navigation.tsx:15, 19, 27`
- **Category**: Theming
- **Recommendation**: Wire to next-themes so variant auto-switches with theme

**29. Effect carousel mutates DOM directly via onMouseMove**
- **Location**: `effect-carousel.tsx:136-149`
- **Category**: Performance
- **Impact**: Bypasses React state — risk of state desync
- **Recommendation**: Use CSS transitions instead, or use a `useState` for the hover state

**30. Unused Tailwind tokens in config**
- **Location**: `tailwind.config.js` — `lcd-green`, `lcd-dark` defined but unused
- **Category**: Theming
- **Recommendation**: Audit and remove unused tokens

---

## Patterns & Systemic Issues

1. **Hard-coded hex colors appear in 15+ files** — canvas components, effects, HUD overlays all bypass CSS variable system. A centralized `visualizerColors` token set would address this across the board.

2. **Glassmorphism as architectural default** — a dedicated `GlassCard` component was created and used in 10+ places, suggesting it was chosen as a default card style rather than a contextual choice. This is a sign of template-driven design.

3. **Zero keyboard support outside of one settings page handler** — the codebase has only 1 `onKeyDown` across thousands of lines of UI code. Every interactive div and icon button is mouse-only.

4. **Full Three.js import pattern repeated 51 times** — a copy-paste pattern that should be a lint rule or shared import helper.

5. **Purple appears in globals.css and landing page despite brand explicitly banning it** — the `.impeccable.md` says "Abandon purple" but gradient classes in globals.css use `#a855f7` (purple-500 equivalent).

---

## Positive Findings

1. **shadcn/ui components are well-integrated** — button, input, slider, switch, toast all use proper `focus-visible` patterns, ARIA patterns from Radix

2. **Alt text on project images is well done** — `project-dashboard.tsx:234`, `asset-preview.tsx:82` both use descriptive alt values

3. **Font choices for monospace display (VT323, Lusitana, InstrumentSerif) are distinctive and on-brand**

4. **Animation uses `transform` not layout properties** — `effect-carousel.tsx` uses `perspective()` / `rotateX/Y` / `scale` (GPU-accelerated)

5. **Stone color palette in Tailwind config is comprehensive** — stone-50 through stone-900 with good semantic naming

6. **Auth forms use proper `<Label htmlFor>` association** for name, email, password fields

---

## Recommended Actions (Priority Order)

1. **[P0] `/shape`** — Design mobile guard / desktop-required pattern for creative-visualizer page
2. **[P0] `/optimize`** — Replace full `three` imports with subpath imports across 51 effect files
3. **[P0] `/optimize`** — Refactor HudOverlayManager rAF loop (60fps state updates → render-on-demand)
4. **[P1] `/impeccable`** — Establish dark mode theme system with next-themes (apply the `.dark` class)
5. **[P1] `/harden`** — Fix keyboard traps in project-creation-modal dropzones
6. **[P1] `/harden`** — Add aria-labels to 7 MIDI transport buttons
7. **[P1] `/distill`** — Strip purple/cyan gradients and replace with warm stone palette per brand spec
8. **[P1] `/distill`** — Audit and reduce glassmorphism usage to functional-only contexts
9. **[P1] `/typeset`** — Replace Inter font with Instrument Sans
10. **[P2] `/adapt`** — Add mobile breakpoints to stem separation grids, portal modal close button
11. **[P2] `/harden`** — Add aria-describedby to auth form errors, fix settings tabs ARIA pattern
12. **[P3] `/polish`** — Final polish pass after all P0/P1/P2 fixes

---

*Re-run `/audit` after fixes to see your score improve.*