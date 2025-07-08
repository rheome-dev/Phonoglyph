# Epic 4: Remotion Video Composition Platform

## Epic Status: 🔴 **0% Complete** - Planning Phase
**Last Updated:** Current  
**Stories Completed:** 0/7  
**Stories Remaining:** 7 (4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7)

## Epic Goal

Transform Phonoglyph into a hybrid video composition platform that combines user video/photo assets with existing Three.js effects using Remotion's React-based video framework, enabling musicians to create professional promotional content.

## Epic Description

**Primary Objective:** Integrate Remotion as the core video composition engine while preserving all existing Three.js visualizer functionality, enabling users to layer their personal video/photo content with MIDI-reactive effects.

**Business Value:**
- Expands target market from visualization enthusiasts to content-creating musicians
- Creates unique value proposition: "Your music + Your footage + AI effects"
- Enables premium pricing for video export features
- Differentiates from basic video editors through MIDI-first approach
- Leverages team's React/TypeScript expertise for faster development
- Provides professional export quality out of the box

**Strategic Pivot Rationale:**
- Remotion simplifies video pipeline complexity (React vs WebGL frame management)
- Preserves existing Three.js investment as premium "effect layers"
- Leverages team's React/TypeScript expertise
- Provides professional export quality out of the box

**Technical Scope:**
- 🔄 **Remotion integration** as core video composition engine
- ✅ **Preserve all existing Three.js effects** (ParticleNetwork, Metaballs, MidiHud, Bloom)
- 🆕 **Video/image asset management** extending Epic 1's file system
- 🆕 **MIDI-reactive video composition** with DAW-style interface
- 🆕 **Canvas-to-video integration** layer for Three.js effects
- 🔄 **Replace FFmpeg rendering** with Remotion server-side rendering
- 🆕 **Social media format exports** (Instagram, TikTok, YouTube)

## User Stories

### 🚧 Story 4.1: Remotion Foundation Integration
**Status:** Not Started  
**Priority:** Critical  
**As a developer**, I want Remotion integrated as the core video composition engine so that I can build React-based video features while preserving existing Three.js effects.

**Acceptance Criteria:**
- [ ] Remotion installed and configured in monorepo structure (`apps/video`)
- [ ] Basic composition structure created with Three.js wrapper component
- [ ] MIDI data flows from existing parser to Remotion props
- [ ] Three.js canvas renders as video layer in Remotion composition
- [ ] Timeline synchronization working between Remotion frames and MIDI events
- [ ] Development server supports hot reloading for composition changes
- [ ] Build process generates both web preview and video export configurations

**Technical Dependencies:**
- Epic 1: MIDI parser and file upload system
- Epic 2: Three.js visualizer effects
- Remotion 4.x installation and configuration

### 🚧 Story 4.2: Video Asset Management System
**Status:** Not Started  
**Priority:** High  
**As a musician**, I want to upload and organize my video/photo content so that I can use my personal media in MIDI-reactive compositions.

**Acceptance Criteria:**
- [ ] Video file upload (.mp4, .mov, .avi) extends existing file system
- [ ] Image file upload (.jpg, .png, .gif, .webp) with thumbnail generation
- [ ] Asset library UI with grid view and metadata display
- [ ] Video duration and resolution extraction using FFprobe
- [ ] Asset preview functionality in editor with scrubbing capability
- [ ] Folder organization for asset management within projects
- [ ] Asset optimization (compression, format conversion) for web delivery
- [ ] Asset search and filtering by type, duration, resolution
- [ ] Bulk upload functionality with progress tracking

**Database Schema Extensions:**
```sql
-- Extend file_metadata table for video/image assets
ALTER TABLE file_metadata 
ADD COLUMN duration_seconds FLOAT,
ADD COLUMN resolution_width INTEGER,
ADD COLUMN resolution_height INTEGER,
ADD COLUMN frame_rate FLOAT,
ADD COLUMN video_codec TEXT,
ADD COLUMN audio_codec TEXT,
ADD COLUMN thumbnail_url TEXT,
ADD COLUMN preview_url TEXT;

-- Asset collections for organization
CREATE TABLE asset_collections (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE asset_collection_items (
  id TEXT PRIMARY KEY,
  collection_id TEXT REFERENCES asset_collections(id) ON DELETE CASCADE,
  file_id TEXT REFERENCES file_metadata(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 🚧 Story 4.3: Layer Management Interface
**Status:** Not Started  
**Priority:** High  
**As a musician**, I want a DAW-style layer management interface so that I can organize video, image, and effect layers intuitively.

**Acceptance Criteria:**
- [ ] Layer stack UI similar to audio track mixing interface
- [ ] Drag-and-drop layer reordering with z-index control
- [ ] Layer solo/mute functionality for preview isolation
- [ ] Layer opacity and blend mode controls (normal, multiply, screen, overlay)
- [ ] Three.js effects appear as special "effect layers" with existing controls
- [ ] Real-time layer visibility toggles
- [ ] Layer grouping functionality for complex compositions
- [ ] Layer duplication and template creation
- [ ] Keyboard shortcuts for layer operations

**UI Components:**
- LayerStack component with React DnD
- LayerItem component with inline controls
- EffectLayer component wrapping Three.js visualizers
- BlendModeSelector component
- LayerPreview component for quick visual reference

### 🚧 Story 4.4: MIDI-Video Parameter Binding
**Status:** Not Started  
**Priority:** High  
**As a musician**, I want to bind MIDI data to video properties so that my visuals respond dynamically to my music like audio plugins.

**Acceptance Criteria:**
- [ ] Parameter binding interface for video layer properties (opacity, scale, position, rotation)
- [ ] MIDI source selection (note velocity, CC values, pitch bend, channel pressure)
- [ ] Real-time parameter mapping with visual feedback
- [ ] Range mapping controls (input min/max to output min/max scaling)
- [ ] Curve types (linear, exponential, logarithmic, smooth) for parameter response
- [ ] Binding presets for common MIDI → video mappings
- [ ] Multiple bindings per parameter with blend modes
- [ ] MIDI learn functionality for quick parameter assignment
- [ ] Binding automation recording and playback

**Supported Video Properties:**
- Transform: position (x, y), scale, rotation, skew
- Visual: opacity, brightness, contrast, saturation, hue
- Effects: blur, glow, drop shadow parameters
- Timing: playback speed, in/out points

### 🚧 Story 4.5: MIDI-Reactive Video Effects
**Status:** Not Started  
**Priority:** Medium  
**As a musician**, I want video cuts and transitions triggered by MIDI events so that my edits sync perfectly with my musical rhythm.

**Acceptance Criteria:**
- [ ] Hard cut triggers based on specific MIDI notes (kick, snare detection)
- [ ] Asset cycling through playlists on MIDI triggers
- [ ] Transition types (cut, fade, slide, zoom, spin) with configurable timing
- [ ] Velocity-sensitive effects (harder hits = longer clips or stronger effects)
- [ ] Beat quantization for musical timing alignment
- [ ] Visual preview of generated cuts in timeline
- [ ] Transition presets for different musical genres
- [ ] Custom transition creation with keyframe animation
- [ ] Transition probability settings for dynamic variation

**MIDI Trigger Types:**
- Note on/off events
- Velocity thresholds
- CC value changes
- Program changes
- Beat detection algorithms
- Chord change detection

### 🚧 Story 4.6: Unified Preview System
**Status:** Not Started  
**Priority:** High  
**As a musician**, I want real-time preview of my complete composition so that I can see video layers and Three.js effects together.

**Acceptance Criteria:**
- [ ] Remotion Player component integrated in editor UI
- [ ] Real-time playback combining all layers and effects
- [ ] Scrubbing through timeline updates all layers synchronously
- [ ] Transport controls (play, pause, stop, loop, scrub) affect all systems
- [ ] Performance optimization maintains 30fps preview minimum
- [ ] Mobile-responsive preview interface with touch controls
- [ ] Picture-in-picture mode for focusing on specific layers
- [ ] Preview quality settings (draft, medium, high) for performance
- [ ] Fullscreen preview mode for presentation

**Performance Optimizations:**
- Canvas rendering optimization for real-time playback
- Lazy loading for off-screen timeline segments
- WebGL texture streaming for video assets
- Frame caching for complex Three.js effects
- Background rendering for smoother scrubbing

### 🚧 Story 4.7: Professional Export Pipeline
**Status:** Not Started  
**Priority:** Critical  
**As a musician**, I want to export high-quality videos in social media formats so that I can use them for music promotion.

**Acceptance Criteria:**
- [ ] Remotion server-side rendering replaces FFmpeg pipeline
- [ ] Social media format presets (1:1 Instagram, 9:16 TikTok, 16:9 YouTube)
- [ ] Export queue system with real-time progress tracking
- [ ] Quality settings (resolution: 720p/1080p/4K, bitrate, framerate: 24/30/60fps)
- [ ] Audio synchronization with video composition
- [ ] Download management and cloud storage integration
- [ ] Batch export functionality for multiple formats
- [ ] Export templates for consistent branding
- [ ] Preview generation before full export
- [ ] Export history and re-export capability

**Export Formats:**
- MP4 (H.264/H.265) for maximum compatibility
- WebM for web optimization
- GIF for short clips and previews
- PNG sequence for external editing
- Custom resolution and aspect ratio support

## Modified Epic Dependencies

### Epic 1: Foundation & Video Asset Management (Extended)
- ✅ Preserve: All existing authentication, MIDI upload, basic UI
- 🆕 Add: Video/image asset upload and management
- 🆕 Add: Asset thumbnail generation and metadata extraction
- 🆕 Add: Video format validation and optimization

### Epic 2: Hybrid Visualization Engine (Modified)
- ✅ Preserve: All existing Three.js effects (ParticleNetwork, Metaballs, MidiHud, Bloom)
- ✅ Preserve: All existing effect controls and parameter binding
- 🆕 Add: Remotion composition wrapper for Three.js effects
- 🆕 Add: Canvas-to-video integration layer
- 🆕 Add: Timeline synchronization between Remotion and Three.js

### Epic 3: Remotion Export Pipeline (Replaced)
- 🔄 Replace: FFmpeg rendering with Remotion server-side rendering
- ✅ Preserve: Queue system and progress tracking
- 🆕 Add: Remotion CLI integration for video export
- 🆕 Add: Social media format presets

## Technical Implementation Details

### Remotion Integration Architecture
```typescript
// Composition structure
const MidiVisualizerComposition: React.FC<{
  midiData: MIDIData;
  videoLayers: VideoLayer[];
  effectLayers: EffectLayer[];
  audioSrc: string;
}> = ({ midiData, videoLayers, effectLayers, audioSrc }) => {
  return (
    <Composition>
      <Audio src={audioSrc} />
      {videoLayers.map(layer => (
        <VideoLayer 
          key={layer.id} 
          {...layer} 
          midiBindings={layer.midiBindings}
          frame={useCurrentFrame()}
        />
      ))}
      {effectLayers.map(effect => (
        <ThreeJSEffectLayer
          key={effect.id}
          effect={effect}
          midiData={midiData}
          frame={useCurrentFrame()}
        />
      ))}
    </Composition>
  );
};
```

### Performance Optimization Strategy
- **Canvas-to-Video Bridge:** Efficient Three.js canvas capture for Remotion
- **Frame Caching:** Cache complex Three.js renders for smooth playback
- **Lazy Loading:** Load video assets only when needed in timeline
- **Background Processing:** Pre-render heavy effects during idle time
- **Quality Scaling:** Adaptive quality based on device capabilities

## API Extensions Required

### New Video Composition Router
```typescript
export const videoCompositionRouter = router({
  // Composition CRUD operations
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string(),
      layers: z.array(layerSchema),
      duration: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      // Create new video composition
    }),

  // Export operations
  export: protectedProcedure
    .input(z.object({
      compositionId: z.string(),
      format: z.enum(['mp4', 'webm', 'gif']),
      quality: z.enum(['draft', 'medium', 'high'])
    }))
    .mutation(async ({ ctx, input }) => {
      // Queue video export with Remotion
    }),

  // Real-time preview
  preview: protectedProcedure
    .input(z.object({
      compositionId: z.string(),
      frame: z.number()
    }))
    .query(async ({ ctx, input }) => {
      // Generate preview frame
    })
});
```

## Definition of Done

- [ ] Remotion integrated and rendering video compositions
- [ ] All existing Three.js effects work as video layers
- [ ] Video/image asset management fully functional
- [ ] MIDI parameter binding system operational
- [ ] Real-time preview maintains 30fps minimum
- [ ] Export pipeline produces high-quality video files
- [ ] Social media format presets working correctly
- [ ] Mobile-responsive interface for all new features
- [ ] Comprehensive test coverage for video composition features
- [ ] Performance optimization delivers smooth user experience

## Success Metrics

- [ ] **Technical:** 30fps real-time preview, <3 minute export times for 1-minute videos
- [ ] **User Engagement:** >70% of users upload personal video assets within first session
- [ ] **Business:** 40% increase in subscription conversion through premium video features
- [ ] **Retention:** 50% increase in session duration with video composition features
- [ ] **Quality:** User satisfaction >4.5/5 for video export quality

## Risk Mitigation

**Primary Risk:** Remotion + Three.js integration complexity
**Mitigation:** Build proof-of-concept early, start with simple effects
**Rollback Plan:** Maintain existing visualization system, gradual migration

**Secondary Risk:** Video processing performance on client devices
**Mitigation:** Implement server-side rendering, quality scaling, performance monitoring
**Rollback Plan:** Cloud-only video processing with progress notifications

**Tertiary Risk:** Learning curve for existing users
**Mitigation:** Guided tutorials, preserve existing workflows, gradual feature introduction
**Rollback Plan:** Feature flags to disable video features for users who prefer simple visualization

## Recommended Execution Order

### Phase 1: Foundation (Month 1-2)
- Story 4.1: Remotion integration with Three.js wrapper
- Story 4.2: Video asset upload and management
- Story 4.6: Basic unified preview system

### Phase 2: Core Features (Month 3-4)
- Story 4.3: Layer management interface
- Story 4.4: MIDI parameter binding system
- Story 4.5: MIDI-reactive video effects

### Phase 3: Production Ready (Month 5-6)
- Story 4.7: Professional export pipeline
- Epic 3 Migration: Remotion rendering replaces FFmpeg
- UI polish, performance optimization, user testing

This epic preserves existing investment while dramatically expanding market opportunity by targeting content-creating musicians rather than just visualization enthusiasts! 🎬🎯 