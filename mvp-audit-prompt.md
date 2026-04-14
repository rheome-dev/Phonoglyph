# Phonoglyph MVP Codebase Audit Prompt

You are a senior software architect conducting a comprehensive audit of the Phonoglyph codebase. Your task is to analyze the attached codebase pack (`mvp-audit-comprehensive-pack.md`) and evaluate its progress against the MVP Implementation Plan below.

---

## 🎯 Objective

Achieve a stable, feature-complete, and user-testable Minimum Viable Product (MVP). This plan prioritizes the critical refactors that unblock core feature development over premature optimization and scaling.

## 🧭 Guiding Principle

Build the minimum viable, valuable, and validatable product first. We will build a robust foundation, implement the core visual features (slideshows), enable the primary value proposition (video export), and only then address scaling for a larger user base.

---

## ✅ Pre-MVP: Foundational Stability & Core Feature Implementation

### **Phase 1: Critical Prerequisite Refactors (Immediate Priorities)**

#### **1.1: Refactor the Unified Timeline & Layer System**

**Problem:** The current timeline (`UnifiedTimeline.tsx`) is a presentational component driven by props from the massive `creative-visualizer/page.tsx`. This makes real-time interactions like dragging, resizing, and re-ordering layers inefficient and difficult to manage. The state is not centralized, leading to bugs and complexity.

**File Targets:**
- `apps/web/src/app/creative-visualizer/page.tsx`
- `apps/web/src/components/video-composition/UnifiedTimeline.tsx`
- **New File:** `apps/web/src/stores/timelineStore.ts` (or add to an existing Zustand store)

**Action Plan:**
- [x] **Centralize Timeline State:** Move the `videoLayers` and `effectClips` state from `useState` in `creative-visualizer/page.tsx` into a dedicated Zustand store (`useTimelineStore`). This store will also manage `currentTime`, `isPlaying`, `duration`, and `selectedLayerId`.
- [x] **Refactor `UnifiedTimeline.tsx`:**
    - Remove props like `layers`, `effectClips`, `currentTime`, etc.
    - Instead, have the component pull its state directly from the `useTimelineStore`.
    - Callbacks like `onLayerUpdate` should be replaced with direct calls to store actions (e.g., `store.updateLayer(id, { startTime, endTime })`).
- [x] **Implement Real-time Interaction:**
    - Use a library like `react-rnd` or `dnd-kit` to make the layer clips on the timeline draggable and resizable.
    - The `onDragStop` and `onResizeStop` handlers for these clips must calculate the new `startTime` and `endTime` based on their pixel position and call the corresponding `updateLayer` action in the Zustand store.
- [ ] **Decouple from `creative-visualizer`:** The goal is for `creative-visualizer/page.tsx` to simply render `<UnifiedTimeline />` without passing any state props related to the timeline's internal function.

#### **1.1.a: Overhaul the Timeline System (Functional MVP)**
- [x] **1.1.1: Unify the Timeline Layout:** Restructure `UnifiedTimeline.tsx` to have aligned "Track Header" and "Track Lane" columns for both composition layers and audio stems.
- [x] **1.1.2: Implement Basic Zoom:** Add a `zoom` level to the `timelineStore`. Refactor all `timeToX` and `xToTime` calculations to use `time * pixelsPerSecond * zoom` to fix stretching and enable zooming. Add UI controls.
- [x] **1.1.3: Implement Interactive Layer Clips:** Use `dnd-kit` to make layer clips draggable and resizable. The `onDragEnd` handlers must convert pixel deltas to time deltas and call the `updateLayer` action in the store.

#### **1.2a: Implement BPM Detection in Audio Pipeline**

**Problem:** The timeline grid and snapping feature requires BPM data, which is not yet being calculated. This is a prerequisite for Task 1.1.4.

**File Targets:**
- **Backend:** `apps/web/public/workers/audio-analysis-worker.js`
- **Types:** `apps/web/src/types/audio-analysis.ts`

**Action Plan:**
- [x] **Install `web-audio-beat-detector`**
- [x] **Update Data Types:** Ensure your main analysis interface can store the `bpm` value.
- [x] **Implement BPM Detection in Worker:** After decoding the `AudioBuffer`, use the `analyze()` function from `web-audio-beat-detector` to get the BPM.
- [x] **Update API & Database:** Modify your analysis-saving endpoint to include the new `bpm` field in the data that gets saved to the database.

#### **1.1.4: Implement BPM-Aware Grid and Snapping**

**Problem:** The timeline lacks a musical grid, making it difficult to align clips rhythmically.

- [x] **Data Flow:** In `UnifiedTimeline.tsx`, access the `cachedAnalysis` prop and find the analysis for the master track (or a fallback) to get the `bpm` value.
- [x] **Adaptive Grid Generation:** Create a `useMemo` hook that depends on `bpm`, `duration`, and `zoom`. Calculate the time interval for each grid line.
- [x] **Render Visual Grid:** In the "Timeline Lanes" `div`, map over the generated grid lines array and render a styled `div` for each line.
- [x] **Implement Snap-to-Grid Logic:** Create a `dnd-kit` modifier function called `snapToGrid`. Pass this modifier to the `<DndContext modifiers={[snapToGrid]}>`.

#### **1.2: Integrate Advanced Drum Stem Separation via music.ai**

**Decision:** Typed transient analysis on polyphonic drum tracks is de-prioritized. Prioritize high-quality per-drum stems via a stem separation API that offers individual drum stems.

**Action Plan:**
- [ ] **Contact Sales for Access:** Reach out to music.ai to obtain API access details.
- [ ] **Evaluate Separation Quality & Latency**
- [ ] **Backend Integration:** Add endpoints to submit audio and retrieve separated stems.
- [ ] **Storage & Metadata:** Store stem files and tag with stem type.
- [ ] **Pipeline Updates:** Compute BPM on the master and, if helpful, per-stem.
- [ ] **UI & Mapping:** Allow selecting one or more stems as modulation sources in MappingSourcesPanel.

#### **1.3: Overhaul `MappingSourcesPanel` to Expose New Features**

**Problem:** The UI needs to be updated to show the new, powerful modulation sources (Volume, Pitch, and filtered Transients) and provide rich, real-time visualizations for them.

**File Targets:**
- `apps/web/src/hooks/use-audio-features.ts`
- `apps/web/src/components/ui/MappingSourcesPanel.tsx`

**Action Plan:**
- [x] **Refactor `useAudioFeatures` Hook:** Generate Core Features (Volume, Pitch)
- [ ] **Generate Transient Features (now called Peaks)**
- [ ] **Enhance the `FeatureNode` Component with Custom Visualizations:**
    - [ ] Implement the `VolumeMeter` (oscilloscope style)
    - [ ] Implement the `PitchMeter` (piano keyboard style)
    - [ ] Implement the `PeakMeter` (oscilloscope with transient markers)

---

### **Phase 2: Core MVP Feature Development**

#### **2.1: Build Backend for Asset Collections**

**Problem:** The application has no way to group files. This is a hard requirement for creating a slideshow from multiple images.

**Action Plan:**
- [x] **Database Migration:** Create two new tables in Supabase.
    - `asset_collections`: (id, project_id, user_id, name, type ENUM('image_slideshow', 'generic'))
    - `asset_collection_items`: (id, collection_id, file_id, "order")
- [x] **tRPC Endpoints:** Create mutations for `asset.createCollection`, `asset.addFileToCollection`, `asset.getCollection`

#### **2.2: Implement Image/Video Slideshow Feature**

**Problem:** The core creative feature of a transient-driven slideshow does not exist.

**File Targets:**
- **New File:** `apps/web/src/lib/visualizer/effects/ImageSlideshowEffect.ts`
- `apps/web/src/components/video-composition/UnifiedTimeline.tsx`

**Action Plan:**
- [x] **Create `ImageSlideshowEffect.ts`:** Implement the `VisualEffect` interface with texture management
- [x] **Implement Efficient Texture Loading:** Preload next 1-2 images, use `texture.dispose()` for unused textures
- [x] **Integrate with Timeline:** Allow users to create an "Image Slideshow" collection in the UI

---

### **Phase 3: The Export Pipeline (The "Valuable" in MVP)**

#### **3.1: Implement Functional (Not Scalable) Media Processing**

**Problem:** The media processor currently returns mock data. We need real metadata (like video duration) for the export to work.

**File Targets:**
- `apps/api/src/services/media-processor.ts`
- `apps/api/src/routers/file.ts`

**Action Plan:**
- [ ] **Integrate `fluent-ffmpeg`:** Add the library and ensure `ffmpeg` is available
- [ ] **Implement Real Metadata Extraction:** Fill in the `extractVideoMetadata` and `generateVideoThumbnail` functions
- [ ] **Process Synchronously in API Route:** For the MVP, call these processing functions directly within the file upload tRPC endpoint

#### **3.2: Build the Headless Frame Renderer**

**Problem:** To export a video with Remotion, we need a function that can deterministically render the visual state for any given point in time.

**Action Plan:**
- [ ] **Create the `renderFrame` function:** This function will accept a complete `state` object and a `time` in seconds, render a single frame to an off-screen buffer and return it as an image.

#### **3.3: Remotion Integration for MVP**

**Problem:** The final step is to orchestrate `renderFrame` to create a video file.

**Action Plan:**
- [ ] **Create a Remotion Composition:** Create a component that calls your `renderFrame` function for each frame
- [ ] **Create a `project.createRenderJob` tRPC Endpoint:** When a user clicks "Export," send the current `visualizerState` to this endpoint
- [ ] **Execute Render In-Process (for MVP):** The tRPC endpoint will directly invoke the Remotion programmatic rendering API

---

## 🚀 Post-MVP: Scaling, Optimization, and Cleanup

### **Phase 4: Backend Scalability**
- [ ] **4.1: Migrate to a Robust Job Queue** (Redis & BullMQ)
- [ ] **4.2: Implement Distributed Rate Limiting**

### **Phase 5: Code Health & Security**
- [ ] **5.1: Full Code Cleanup & Foundational Fixes** (Three.js memory leaks, dead code removal, strict tRPC schemas)
- [ ] **5.2: Security Hardening** (Full RLS Audit)

### **(Post-MVP) 1.1.3b: Gradually Migrate react-dnd to dnd-kit**
Suggested Migration Order:
1. DroppableSlider.tsx / DroppableParameter.tsx
2. MappingSourcesPanel.tsx
3. DraggableFile.tsx
4. HudOverlayManager.tsx and HudOverlayParameterModal.tsx

---

# 🔍 YOUR AUDIT TASKS

Please analyze the attached codebase pack and provide a comprehensive report covering:

## 1. Progress Verification
For each checklist item marked `[x]` (complete) in the plan above:
- **Verify implementation exists** in the codebase
- **Assess implementation quality** (does it match the described requirements?)
- **Identify any gaps** between the plan and actual implementation
- **Flag any items marked complete that appear incomplete or partially implemented**

## 2. Incomplete Items Analysis
For each item marked `[ ]` (incomplete):
- **Check if any work has started** that isn't reflected in the checklist
- **Identify blockers or dependencies** that might be preventing progress
- **Estimate implementation complexity** (small/medium/large)

## 3. Code Quality Assessment
Evaluate the following across the codebase:
- **Architecture consistency:** Does the code follow the patterns described in the plan?
- **State management:** Is Zustand being used correctly for timeline state?
- **Component coupling:** How decoupled is `creative-visualizer/page.tsx` from the timeline?
- **Memory management:** Are there obvious memory leaks (especially in Three.js/WebGL code)?
- **Type safety:** Are there instances of `z.any()` or weak typing?

## 4. Technical Debt Inventory
Cross-reference with the included `TECH_DEBT_AUDIT.md` and identify:
- **Critical issues** that block MVP launch
- **Important issues** that should be addressed before scaling
- **Nice-to-have fixes** for post-MVP cleanup

## 5. Risk Assessment
Identify the top 3-5 risks to achieving a stable MVP, considering:
- Complex integrations (Remotion, ffmpeg, music.ai)
- Incomplete features
- Architectural issues
- Missing error handling

## 6. Recommended Next Steps
Based on your analysis, provide:
- **Immediate priorities** (this week)
- **Short-term priorities** (next 2 weeks)
- **Pre-launch checklist** (critical items before user testing)

---

# 📋 OUTPUT FORMAT

Please structure your response as:

```markdown
# Phonoglyph MVP Audit Report
**Date:** [Current Date]
**Codebase Version:** Based on attached pack

## Executive Summary
[2-3 paragraph overview of findings]

## 1. Progress Verification
### ✅ Verified Complete
[List items with evidence]

### ⚠️ Partially Complete
[List items with gaps identified]

### ❌ Marked Complete But Incomplete
[List any discrepancies]

## 2. Incomplete Items Analysis
[Table format: Item | Work Started? | Blockers | Complexity]

## 3. Code Quality Assessment
[Structured findings with specific file references]

## 4. Technical Debt Inventory
[Prioritized list with severity ratings]

## 5. Risk Assessment
[Top 5 risks with mitigation suggestions]

## 6. Recommended Next Steps
### Immediate (This Week)
### Short-Term (Next 2 Weeks)  
### Pre-Launch Checklist
```

---

**IMPORTANT NOTES:**
- Reference specific files and line numbers when possible
- Be direct about issues—this is an internal audit, not a code review for external stakeholders
- Focus on actionable insights rather than general observations
- If you find something working better than expected, note that too
