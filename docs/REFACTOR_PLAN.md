# REFACTOR_PLAN.md  
**Master Refactor & MVP Build Plan (v2 – October 2025)**  
_Phase-tracked with TODO markers for progress visibility._

---

## 🌐 Overview

Phonoglyph’s codebase contains the skeleton of a powerful visual synthesis platform but lacks a maintainable architecture for compositing, state flow, and deterministic rendering.

This plan establishes a clean separation of concerns and provides a roadmap to reach **Private Alpha → Paid Beta** without introducing unnecessary scalability work prematurely.

```

UI Components  ←→  Context Providers  ←→  Domain Hooks  ←→  Engine / Services

````

We are **not using Zustand**.  
State will be centralized via **React Context + Domain Hooks**, with React Query for server data.

---

## ⚙️ Phase 1 — Architectural Refactor (MUST COME FIRST)

### 🎯 Goals
- Eliminate monolithic component logic (`creative-visualizer/page.tsx`, `HudOverlay.tsx`, etc.)
- Implement the **Compositor render pattern**
- Standardize state via **Context Providers + Domain Hooks**

---

### 🧱 1.1 Rebuild the Rendering Pipeline

**Objective:** Migrate from a single monolithic render call to a true multi-layer compositor.

🟡 **TODO:**
- [ ] Replace `renderer.render()` calls in `VisualizerManager` with a `MultiLayerCompositor` loop.
- [ ] Each active layer should render to its own off-screen target.
- [ ] Final composite drawn by `multiLayerCompositor.render()`.

```ts
for (const layer of activeLayers) {
  compositor.renderLayer(layer.getScene(), layer.getCamera(), layer.blendMode)
}
compositor.finalComposite()
````

🟡 **TODO:**

* [ ] Refactor each effect (`MetaballsEffect`, `ParticleNetworkEffect`, etc.)

  * Each manages its own `THREE.Scene`
  * Implements `getScene()` and `getCamera()`
  * No direct calls to `this.scene.add(...)` on global scene.

```ts
interface VisualEffect {
  init(): void
  update(dt: number, audio: AudioData): void
  getScene(): THREE.Scene
  getCamera(): THREE.Camera
}
```

✅ **Deliverable:** Multi-layer compositor rendering established.

---

### 🧭 1.2 Centralize State via Providers

**Objective:** Replace scattered `useState` logic with organized domain-scoped providers.

| Domain   | Provider                      | Hook              | Core State                 |
| -------- | ----------------------------- | ----------------- | -------------------------- |
| Editor   | `EditorProvider`              | `useEditor()`     | selection, keyboard, undo  |
| Layers   | `LayersProvider`              | `useLayers()`     | list, ordering, visibility |
| Timeline | `TimelineProvider`            | `useTimeline()`   | playhead, zoom, range      |
| Effects  | `EffectsProvider`             | `useEffects()`    | registry, params, mappings |
| HUD/UI   | existing `HudOverlayProvider` | `useHudOverlay()` | modals, overlays           |

🟡 **TODO:**

* [ ] Implement the 4 new providers.
* [ ] Move state logic out of `creative-visualizer/page.tsx` into corresponding providers.
* [ ] Replace direct `useState` calls with provider hook usage.
* [ ] Ensure all providers wrap the main app in `_app.tsx`:

```tsx
<App>
  <TRPCProvider>
    <EditorProvider>
      <LayersProvider>
        <TimelineProvider>
          <EffectsProvider>
            <CreativeVisualizerPage />
          </EffectsProvider>
        </TimelineProvider>
      </LayersProvider>
    </EditorProvider>
  </TRPCProvider>
</App>
```

✅ **Deliverable:**
All core visualizer state flows through providers.
`creative-visualizer/page.tsx` reduced to a presentation component (<400 lines).

---

## 🧩 Phase 2 — Functional Validation & MVP Features

### 🎥 2.1 Image / Video Slideshow Engine

🟡 **TODO:**

* [ ] Add DB tables:

  * `asset_collections`
  * `asset_collection_items (collectionId, fileId, order)`
* [ ] Implement tRPC routes for CRUD operations on collections.
* [ ] Create new effects:

  * `ImageSlideshowEffect`
  * `VideoSlicingEffect`
* [ ] Load only 2–3 textures at a time (LRU cache).
* [ ] Implement transient-triggered advance logic (with debounce).

```ts
if (audioData.transients.drums > threshold && canAdvance()) {
  nextSlide()
}
```

✅ **Deliverable:**
Functional slideshow / video slicing layer that validates rendering architecture.

---

### 🧱 2.2 Registry-Driven Effect System

🟡 **TODO:**

* [ ] Create `effectsRegistry.ts` to register all effect classes.
* [ ] Expose metadata (name, parameters, defaults) for dynamic UI generation.
* [ ] Refactor `EffectsProvider` to manage enable/disable + param mapping.

✅ **Deliverable:**
Registry system allowing hot addition of new effects without modifying engine code.

---

## 🧰 Phase 3 — UI, Tooling, and Performance Cleanup

### 🎨 3.1 UI Decomposition

🟡 **TODO:**

* [ ] Break out `HUD`, `Timeline`, and `Sidebar` into smaller components.
* [ ] Replace prop-drilling with context hooks.
* [ ] Add parameter panels generated dynamically from effect metadata.

✅ **Deliverable:** Modular, readable UI tied cleanly to providers.

---

### 🤖 3.2 AI-Assisted Code Cleanup

🟡 **TODO:**

* [ ] Use **Repomix** to generate cleanup diffs per file.
* [ ] Add lint/type checks and Prettier config.
* [ ] Fix or suppress TypeScript errors flagged during refactor.

✅ **Deliverable:** Consistent, type-safe, maintainable codebase.

---

### ⚡ 3.3 Performance Audit

🟡 **TODO:**

* [ ] Profile provider re-renders (React Profiler).
* [ ] If any hot domain shows frame drops → introduce internal fine-grained store (e.g., Jotai) **behind** the hook API (never global).

✅ **Deliverable:** Solid 60fps performance and deterministic behavior.

---

## 🧠 Phase 4 — Remotion Export Pipeline (Final MVP Step)

### 🎯 Objective

Enable deterministic, headless rendering for video export.
*Do this **after** architecture + slideshow engine are complete.*

---

### 🧩 4.1 Headless Frame Renderer

🟡 **TODO:**

* [ ] Implement `renderFrame(time, state)` in the engine:

```ts
async function renderFrame(t: number, state: VisualizerState) {
  engine.setState(state)
  engine.seek(t)
  return engine.captureFrame() // → ImageData or PNG buffer
}
```

✅ **Deliverable:** Deterministic frame renderer usable outside the live UI.

---

### 🎬 4.2 Remotion Integration

🟡 **TODO:**

* [ ] Create `/remotion/Composition.tsx` calling `renderFrame()` per frame.
* [ ] Add tRPC endpoint `render.createJob()` → stores serialized visualizer state.
* [ ] Serverless function (Vercel / Lambda):

  * [ ] Pulls job → runs Remotion render → uploads video to R2.
  * [ ] Updates DB with output URL.

✅ **Deliverable:**
Working internal export pipeline → **Private Alpha** release.

---

## 🚀 Phase 5 — Scale-Up (Post-Beta, Optional)

> Only needed once paying users generate queue saturation.

🟡 **TODO:**

* [ ] Introduce **Redis + BullMQ** for long render queues.
* [ ] Migrate file storage from Supabase → Cloudflare R2/S3 for high throughput.
* [ ] Integrate Stripe for export credit billing.
* [ ] Add metrics dashboard (Sentry + PostHog).

✅ **Deliverable:** Scalable backend for Paid Beta.

---

## 🧭 Development Workflow

1. 🟡 **Run Repomix** → auto-generate cleanup PRs.
2. 🟡 **Complete Phases 1–3 sequentially.**
3. 🟡 **Implement slideshow + registry (Phase 2).**
4. 🟡 **Test deterministic rendering (Phase 4.1).**
5. 🟢 **Launch Private Alpha.**
6. 🟢 **Add paid beta & queue scaling once user load increases.**

---

## ✅ Acceptance Criteria Summary

| Phase | Key Deliverables           | Outcome                |
| ----- | -------------------------- | ---------------------- |
| 1     | Compositor loop, Providers | Stable architecture    |
| 2     | Slideshow + Registry       | Functional MVP visuals |
| 3     | Modular UI, Cleanup        | Maintainable frontend  |
| 4     | Remotion Export            | Private Alpha          |
| 5     | Queue + Billing            | Paid Beta scalability  |

---

### 📘 Notes

* Deployment target: **Vercel**
* Database: **Supabase (Postgres)**
* Asset Storage: **Cloudflare R2**
* Security: Handled via Cloudflare + Supabase Auth
* Render jobs: Local async until Phase 5 (no Redis required)

---

**Last Updated:** Oct 24, 2025
**Maintainer:** Jasper Hall
**Document Status:** 🟡 *In progress (Phase 1 active)*

```

---

Would you like me to automatically generate a **matching `/docs/TODO_PHASES.md`** file next — where each bullet here is broken out into its own detailed task list (with file paths, estimated effort, and checkboxes for tracking in GitHub Projects)? It’s super helpful if you’re using GitHub Issues or Projects for tracking the refactor.
```
