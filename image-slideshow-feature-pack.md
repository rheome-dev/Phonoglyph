This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
- Pay special attention to the Repository Description. These contain important context and guidelines specific to this project.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: /Users/jasperhall/Desktop/Phonoglyph/apps/api/src/db/migrations/018_asset_collections.sql, /Users/jasperhall/Desktop/Phonoglyph/apps/api/src/routers/asset.ts, /Users/jasperhall/Desktop/Phonoglyph/apps/api/src/routers/index.ts, /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/lib/visualizer/effects/ImageSlideshowEffect.ts, /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/lib/visualizer/effects/EffectDefinitions.ts, /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/components/video-composition/UnifiedTimeline.tsx, /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/app/creative-visualizer/page.tsx, /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/components/assets/CollectionManager.tsx, /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/components/midi/three-visualizer.tsx, /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/components/ui/portal-modal.tsx, /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/types/video-composition.ts
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# User Provided Header
Image Slideshow Feature Pack

# Directory Structure
```
/
  Users/
    jasperhall/
      Desktop/
        Phonoglyph/
          apps/
            api/
              src/
                db/
                  migrations/
                    018_asset_collections.sql
                routers/
                  asset.ts
                  index.ts
            web/
              src/
                app/
                  creative-visualizer/
                    page.tsx
                components/
                  assets/
                    CollectionManager.tsx
                  midi/
                    three-visualizer.tsx
                  ui/
                    portal-modal.tsx
                  video-composition/
                    UnifiedTimeline.tsx
                lib/
                  visualizer/
                    effects/
                      EffectDefinitions.ts
                      ImageSlideshowEffect.ts
                types/
                  video-composition.ts
```

# Files

## File: /Users/jasperhall/Desktop/Phonoglyph/apps/api/src/db/migrations/018_asset_collections.sql
```sql
-- Create asset_collections table
CREATE TYPE collection_type AS ENUM ('image_slideshow', 'generic');

CREATE TABLE asset_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type collection_type NOT NULL DEFAULT 'generic',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset_collection_items table
CREATE TABLE asset_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES asset_collections(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES file_metadata(id) ON DELETE CASCADE NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE asset_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_collection_items ENABLE ROW LEVEL SECURITY;

-- Policies for asset_collections
CREATE POLICY "Users can view their own collections"
  ON asset_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
  ON asset_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON asset_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON asset_collections FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for asset_collection_items
-- Access depends on the collection ownership
CREATE POLICY "Users can view items of their collections"
  ON asset_collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM asset_collections
      WHERE id = asset_collection_items.collection_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add items to their collections"
  ON asset_collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM asset_collections
      WHERE id = asset_collection_items.collection_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from their collections"
  ON asset_collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM asset_collections
      WHERE id = asset_collection_items.collection_id
      AND user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_asset_collections_updated_at 
  BEFORE UPDATE ON asset_collections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## File: /Users/jasperhall/Desktop/Phonoglyph/apps/api/src/routers/asset.ts
```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { logger } from '../lib/logger'

export const assetRouter = router({
  // Create a new asset collection
  createCollection: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      type: z.enum(['image_slideshow', 'generic']).default('generic'),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        // Verify project ownership
        const { data: project, error: projectError } = await ctx.supabase
          .from('projects')
          .select('id')
          .eq('id', input.projectId)
          .eq('user_id', userId)
          .single()

        if (projectError || !project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          })
        }

        const { data: collection, error } = await ctx.supabase
          .from('asset_collections')
          .insert({
            project_id: input.projectId,
            user_id: userId,
            name: input.name,
            type: input.type,
          })
          .select()
          .single()

        if (error) {
          logger.error('Database error creating collection:', error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create collection',
          })
        }

        return collection
      } catch (error) {
        if (error instanceof TRPCError) throw error
        logger.error('Error creating collection:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create collection',
        })
      }
    }),

  // Add a file to a collection
  addFileToCollection: protectedProcedure
    .input(z.object({
      collectionId: z.string(),
      fileId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        // Verify collection ownership
        const { data: collection, error: collectionError } = await ctx.supabase
          .from('asset_collections')
          .select('id, project_id')
          .eq('id', input.collectionId)
          .eq('user_id', userId)
          .single()

        if (collectionError || !collection) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Collection not found or access denied',
          })
        }

        // Verify file ownership and project match (optional constraint, but good practice)
        // We allow files from different projects if they belong to the user, or restrict to same project?
        // For now, just check user ownership.
        const { data: file, error: fileError } = await ctx.supabase
          .from('file_metadata')
          .select('id')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single()
          
        if (fileError || !file) {
           throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        // Get current max order
        const { data: maxOrderData, error: maxOrderError } = await ctx.supabase
          .from('asset_collection_items')
          .select('order')
          .eq('collection_id', input.collectionId)
          .order('order', { ascending: false })
          .limit(1)

        const nextOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order + 1 : 0

        const { data: item, error } = await ctx.supabase
          .from('asset_collection_items')
          .insert({
            collection_id: input.collectionId,
            file_id: input.fileId,
            order: nextOrder,
          })
          .select()
          .single()

        if (error) {
          logger.error('Database error adding file to collection:', error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to add file to collection',
          })
        }

        return item
      } catch (error) {
        if (error instanceof TRPCError) throw error
        logger.error('Error adding file to collection:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add file to collection',
        })
      }
    }),

  // Get a collection with its items
  getCollection: protectedProcedure
    .input(z.object({
      collectionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        const { data: collection, error } = await ctx.supabase
          .from('asset_collections')
          .select(`
            *,
            items:asset_collection_items(
              *,
              file:file_metadata(*)
            )
          `)
          .eq('id', input.collectionId)
          .eq('user_id', userId)
          .single()

        if (error || !collection) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Collection not found or access denied',
          })
        }
        
        // Sort items by order (supabase select ordering on related tables can be tricky, doing it in JS for safety)
        if (collection.items) {
            collection.items.sort((a: any, b: any) => a.order - b.order);
        }

        return collection
      } catch (error) {
        if (error instanceof TRPCError) throw error
        logger.error('Error fetching collection:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch collection',
        })
      }
    }),
    
  // Get all collections for a project
  getProjectCollections: protectedProcedure
    .input(z.object({
        projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
        const userId = ctx.user.id
        
        try {
            const { data: collections, error } = await ctx.supabase
                .from('asset_collections')
                .select('*')
                .eq('project_id', input.projectId)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                
            if (error) {
                logger.error('Database error fetching project collections:', error)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch project collections'
                })
            }
            
            return collections
        } catch (error) {
            if (error instanceof TRPCError) throw error
            logger.error('Error fetching project collections:', error)
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch project collections'
            })
        }
    })
})
```

## File: /Users/jasperhall/Desktop/Phonoglyph/apps/api/src/routers/index.ts
```typescript
import { router } from '../trpc';
import { healthRouter } from './health';
import { guestRouter } from './guest';
import { authRouter } from './auth';
import { userRouter } from './user';
import { projectRouter } from './project';
import { fileRouter } from './file';
import { midiRouter } from './midi';
import { stemRouter } from './stem';
import { autoSaveRouter } from './auto-save';
import { audioAnalysisSandboxRouter } from './audio-analysis-sandbox';
import { assetRouter } from './asset';

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  user: userRouter,
  guest: guestRouter,
  project: projectRouter,
  file: fileRouter,
  asset: assetRouter,
  midi: midiRouter,
  stem: stemRouter,
  autoSave: autoSaveRouter,
  audioAnalysisSandbox: audioAnalysisSandboxRouter,
});

export type AppRouter = typeof appRouter;
```

## File: /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/app/creative-visualizer/page.tsx
```typescript
'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Zap, Palette, Settings2, Eye, EyeOff, Info, Map } from 'lucide-react';
import { ThreeVisualizer } from '@/components/midi/three-visualizer';
import { EffectsLibrarySidebar, EffectUIData } from '@/components/ui/EffectsLibrarySidebar';
import { CollapsibleEffectsSidebar } from '@/components/layout/collapsible-effects-sidebar';
import { FileSelector } from '@/components/midi/file-selector';
import { MIDIData, VisualizationSettings, DEFAULT_VISUALIZATION_SETTINGS } from '@/types/midi';
import { VisualizationPreset, StemVisualizationMapping } from '@/types/stem-visualization';
import { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { trpc } from '@/lib/trpc';
import { CollapsibleSidebar } from '@/components/layout/collapsible-sidebar';
import { ProjectPickerModal } from '@/components/projects/project-picker-modal';
import { debugLog } from '@/lib/utils';
import { ProjectCreationModal } from '@/components/projects/project-creation-modal';
import { useStemAudioController } from '@/hooks/use-stem-audio-controller';
import { useAudioAnalysis } from '@/hooks/use-audio-analysis';
import { PortalModal } from '@/components/ui/portal-modal';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MappingSourcesPanel } from '@/components/ui/MappingSourcesPanel';
import { DroppableParameter } from '@/components/ui/droppable-parameter';
import { LayerContainer } from '@/components/video-composition/LayerContainer';
import { useTimelineStore } from '@/stores/timelineStore';
import { UnifiedTimeline } from '@/components/video-composition/UnifiedTimeline';
import { TestVideoComposition } from '@/components/video-composition/TestVideoComposition';
import type { Layer } from '@/types/video-composition';
import { useFeatureValue } from '@/hooks/use-feature-value';
import { HudOverlayProvider, useHudOverlayContext } from '@/components/hud/HudOverlayManager';
import { AspectRatioSelector } from '@/components/ui/aspect-ratio-selector';
import { getAspectRatioConfig } from '@/lib/visualizer/aspect-ratios';
import { useProjectSettingsStore } from '@/stores/projectSettingsStore';
import { CollectionManager } from '@/components/assets/CollectionManager';

// Derived boolean: are stem URLs ready?
// const stemUrlsReady = Object.keys(asyncStemUrlMap).length > 0; // This line was moved

// Wrapper component that provides HUD overlay functionality to the sidebar
const EffectsLibrarySidebarWithHud: React.FC<{
  effects: any[];
  selectedEffects: Record<string, boolean>;
  onEffectToggle: (effectId: string) => void;
  onEffectDoubleClick: (effectId: string) => void;
  isVisible: boolean;
  stemUrlsReady: boolean;
}> = ({ effects, selectedEffects, onEffectToggle, onEffectDoubleClick, isVisible, stemUrlsReady }) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const hudContext = useHudOverlayContext();
  
  const handleEffectDoubleClick = (effectId: string) => {
    if (!stemUrlsReady) {
      debugLog.warn('[EffectsLibrarySidebarWithHud] Overlay creation blocked: stem URLs not ready');
      return;
    }
    const effect = effects.find(e => e.id === effectId);
    if (effect && effect.category === 'Overlays' && isClient) {
      // Map effect ID to overlay type
      const overlayTypeMap: Record<string, string> = {
        'waveform': 'waveform',
        'spectrogram': 'spectrogram',
        'peakMeter': 'peakMeter',
        'stereometer': 'stereometer',
        'oscilloscope': 'oscilloscope',
        'spectrumAnalyzer': 'spectrumAnalyzer',
        'midiMeter': 'midiMeter'
      };
      
      const overlayType = overlayTypeMap[effectId];
      if (overlayType) {
        debugLog.log('🎯 Adding HUD overlay:', overlayType);
        hudContext.addOverlay(overlayType);
      }
    }
    onEffectDoubleClick(effectId);
  };
  
  return (
    <EffectsLibrarySidebar
      effects={effects}
      selectedEffects={selectedEffects}
      onEffectToggle={onEffectToggle}
      onEffectDoubleClick={handleEffectDoubleClick}
      isVisible={isVisible}
    />
  );
};

// Sample MIDI data for demonstration
const createSampleMIDIData = (): MIDIData => {
  const notes: any[] = [];
  const melodyPattern = [60, 64, 67, 72, 69, 65, 62, 60, 67, 64, 69, 72, 74, 67, 64, 60];
  for (let i = 0; i < melodyPattern.length; i++) {
    notes.push({
      id: `melody-${i}`,
      start: i * 0.5,
      duration: 0.4,
      pitch: melodyPattern[i],
      velocity: 60 + Math.random() * 40,
      track: 'melody',
      noteName: `Note${melodyPattern[i]}`,
    });
  }
  const chordTimes = [2, 4, 6, 8];
  chordTimes.forEach((time, idx) => {
    const chordNotes = [48, 52, 55];
    chordNotes.forEach((note, noteIdx) => {
      notes.push({
        id: `chord-${idx}-${noteIdx}`,
        start: time,
        duration: 1.5,
        pitch: note,
        velocity: 40 + Math.random() * 30,
        track: 'melody',
        noteName: `Chord${note}`,
      });
    });
  });

  return {
    file: {
      name: 'Creative Demo.mid',
      size: 1024,
      duration: 10.0,
      ticksPerQuarter: 480,
      timeSignature: [4, 4],
      keySignature: 'C Major'
    },
    tracks: [
      { id: 'melody', name: 'Synth Lead', instrument: 'Synthesizer', channel: 1, color: '#84a98c', visible: true, notes: notes },
      { id: 'bass', name: 'Bass Synth', instrument: 'Bass', channel: 2, color: '#6b7c93', visible: true, notes: [
          { id: 'b1', start: 0.0, duration: 1.0, pitch: 36, velocity: 100, track: 'bass', noteName: 'C2' },
          { id: 'b2', start: 1.0, duration: 1.0, pitch: 40, velocity: 95, track: 'bass', noteName: 'E2' },
          { id: 'b3', start: 2.0, duration: 1.0, pitch: 43, velocity: 90, track: 'bass', noteName: 'G2' },
          { id: 'b4', start: 3.0, duration: 1.0, pitch: 48, velocity: 85, track: 'bass', noteName: 'C3' },
          { id: 'b5', start: 4.0, duration: 2.0, pitch: 36, velocity: 100, track: 'bass', noteName: 'C2' },
        ]
      },
      { id: 'drums', name: 'Drums', instrument: 'Drum Kit', channel: 10, color: '#b08a8a', visible: true, notes: [
          { id: 'd1', start: 0.0, duration: 0.1, pitch: 36, velocity: 120, track: 'drums', noteName: 'Kick' },
          { id: 'd2', start: 0.5, duration: 0.1, pitch: 42, velocity: 80, track: 'drums', noteName: 'HiHat' },
          { id: 'd3', start: 1.0, duration: 0.1, pitch: 38, velocity: 100, track: 'drums', noteName: 'Snare' },
          { id: 'd4', start: 1.5, duration: 0.1, pitch: 42, velocity: 70, track: 'drums', noteName: 'HiHat' },
          { id: 'd5', start: 2.0, duration: 0.1, pitch: 36, velocity: 127, track: 'drums', noteName: 'Kick' },
          { id: 'd6', start: 2.5, duration: 0.1, pitch: 42, velocity: 85, track: 'drums', noteName: 'HiHat' },
          { id: 'd7', start: 3.0, duration: 0.1, pitch: 38, velocity: 110, track: 'drums', noteName: 'Snare' },
          { id: 'd8', start: 3.5, duration: 0.1, pitch: 42, velocity: 75, track: 'drums', noteName: 'HiHat' },
        ]
      }
    ],
    tempoChanges: [
      { tick: 0, bpm: 120, microsecondsPerQuarter: 500000 }
    ]
  };
};

// Transform backend MIDI data to frontend format
const transformBackendToFrontendMidiData = (backendData: any): MIDIData => {
  return {
    file: {
      name: backendData.file.name,
      size: backendData.file.size,
      duration: backendData.file.duration,
      ticksPerQuarter: backendData.file.ticksPerQuarter,
      timeSignature: backendData.file.timeSignature,
      keySignature: backendData.file.keySignature
    },
    tracks: backendData.tracks.map((track: any) => ({
      id: String(track.id),
      name: track.name,
      instrument: track.instrument,
      channel: track.channel,
      color: track.color,
      visible: true,
      notes: track.notes.map((note: any) => ({
        id: note.id,
        start: note.startTime, // Backend: startTime -> Frontend: start
        duration: note.duration,
        pitch: note.note,      // Backend: note -> Frontend: pitch
        velocity: note.velocity,
        track: String(track.id), // Backend: track (number) -> Frontend: track (string)
        noteName: note.name,   // Backend: name -> Frontend: noteName
      }))
    })),
    tempoChanges: backendData.tempoChanges
  };
};


function CreativeVisualizerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [useDemoData, setUseDemoData] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [settings, setSettings] = useState<VisualizationSettings>(DEFAULT_VISUALIZATION_SETTINGS);
  const {
    layers,
    currentTime,
    isPlaying,
    selectedLayerId,
    addLayer,
    updateLayer,
    deleteLayer,
    selectLayer,
    setCurrentTime,
    setDuration,
    togglePlay,
    setPlaying,
  } = useTimelineStore();
  const [fps, setFps] = useState(60);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<VisualizationPreset>({
    id: 'default',
    name: 'Default',
    description: 'Default visualization preset',
    category: 'custom',
    tags: ['default'],
    mappings: {},
    defaultSettings: {
      masterIntensity: 1.0,
      transitionSpeed: 1.0,
      backgroundAlpha: 0.1,
      particleCount: 100,
      qualityLevel: 'medium'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    usageCount: 0
  });

  // Effects timeline has been merged into layers via store
  const [showVideoComposition, setShowVideoComposition] = useState(false);

  // Effects carousel state (now for timeline-based effects)
  const [selectedEffects, setSelectedEffects] = useState<Record<string, boolean>>({});

  // Visualizer aspect ratio toggle state - now using modular system
  const [visualizerAspectRatio, setVisualizerAspectRatio] = useState<string>('mobile');

  // Effect parameter modal state
  const [openEffectModals, setOpenEffectModals] = useState<Record<string, boolean>>({
    'metaballs': false,
    'midiHud': false,
    'particleNetwork': false
  });

  // Feature mapping state
  interface FeatureMapping {
    featureId: string | null;
    modulationAmount: number; // 0-1, default 1.0 (100%)
  }
  const [mappings, setMappings] = useState<Record<string, FeatureMapping>>({});
  const [featureNames, setFeatureNames] = useState<Record<string, string>>({});
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | undefined>();
  // Base (user-set) parameter values and last modulated values for visualization
  const [baseParameterValues, setBaseParameterValues] = useState<Record<string, number>>({});
  const [modulatedParameterValues, setModulatedParameterValues] = useState<Record<string, number>>({});

  // Real-time sync calibration offset in ms
  const [syncOffsetMs, setSyncOffsetMs] = useState(0);

  // Performance monitoring for sync debugging
  const [syncMetrics, setSyncMetrics] = useState({
    audioLatency: 0,
    visualLatency: 0,
    syncDrift: 0,
    frameTime: 0,
    lastUpdate: 0
  });

  const [sampleMidiData] = useState<MIDIData>(createSampleMIDIData());
  const stemAudio = useStemAudioController();
  const audioAnalysis = useAudioAnalysis();
  
  // Sync performance monitoring
  useEffect(() => {
    if (!isPlaying) return;
    
    const updateSyncMetrics = () => {
      const now = performance.now();
      const audioTime = stemAudio.currentTime;
      const visualTime = currentTime;
      const audioLatency = stemAudio.getAudioLatency ? stemAudio.getAudioLatency() * 1000 : 0;
      const frameTime = now - syncMetrics.lastUpdate;
      
      setSyncMetrics({
        audioLatency,
        visualLatency: frameTime,
        syncDrift: Math.abs(audioTime - visualTime) * 1000, // Convert to ms
        frameTime,
        lastUpdate: now
      });
    };
    
    const interval = setInterval(updateSyncMetrics, 100); // Update every 100ms
    return () => clearInterval(interval);
  }, [isPlaying, stemAudio.currentTime, currentTime, syncMetrics.lastUpdate]);
  
  // Enhanced audio analysis data - This state is no longer needed, data comes from useCachedStemAnalysis
  // const [audioAnalysisData, setAudioAnalysisData] = useState<any>(null);
  
  const [showPicker, setShowPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isLoadingStemsRef = useRef(false);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  
  // Ref to track current analysis state to avoid stale closures
  const currentAnalysisRef = useRef(audioAnalysis.cachedAnalysis);
  
  // Update ref when analysis changes
  useEffect(() => {
    currentAnalysisRef.current = audioAnalysis.cachedAnalysis;
  }, [audioAnalysis.cachedAnalysis]);

  // Get download URL mutation
  const getDownloadUrlMutation = trpc.file.getDownloadUrl.useMutation();

  // Fetch current project information
  const { 
    data: projectData, 
    isLoading: projectLoading, 
    error: projectError 
  } = trpc.project.get.useQuery(
    { id: currentProjectId! },
    { enabled: !!currentProjectId }
  );

  // Fetch project files for general asset management / UI
  const { 
    data: projectFiles, 
    isLoading: projectFilesLoading 
  } = trpc.file.getUserFiles.useQuery(
    { 
      limit: 200, 
      fileType: 'all',
      projectId: currentProjectId || undefined
    },
    { enabled: !!currentProjectId }
  );

  // Dedicated query for audio files so they can never be paged out
  const { 
    data: projectAudioFiles 
  } = trpc.file.getUserFiles.useQuery(
    {
      limit: 1000,
      fileType: 'audio',
      projectId: currentProjectId || undefined
    },
    { enabled: !!currentProjectId }
  );

  // Fetch MIDI visualization data
  const { 
    data: fileData, 
    isLoading: fileLoading, 
    error: fileError 
  } = trpc.midi.getVisualizationData.useQuery(
    { fileId: selectedFileId! },
    { enabled: !!selectedFileId && !useDemoData }
  );

  useEffect(() => {
    const fileId = searchParams.get('fileId');
    const projectId = searchParams.get('projectId');
    
    if (projectId) {
      setCurrentProjectId(projectId);
      setUseDemoData(false);
    }
    
    if (fileId) {
      setSelectedFileId(fileId);
      setUseDemoData(false);
    }

    // If no project or file is specified, default to demo mode
    if (!projectId && !fileId) {
      setUseDemoData(true);
    }

    const projectIdFromParams = searchParams.get('projectId');
    if (!projectIdFromParams) {
      setShowPicker(true);
    } else {
      setShowPicker(false);
    }

    // Mark as initialized after processing URL params
    setIsInitialized(true);
  }, [searchParams]);

  // Helper to sort stems: non-master first, master last
  function sortStemsWithMasterLast(stems: any[]) {
    return [...stems].sort((a, b) => {
      if (a.is_master && !b.is_master) return 1;
      if (!a.is_master && b.is_master) return -1;
      return 0;
    });
  }

  // Load stems when project audio files are available
  useEffect(() => {
    // This effect now correctly handles both initial load and changes to project files
    if (projectAudioFiles?.files && currentProjectId && isInitialized && !audioAnalysis.isLoading) {
      let cancelled = false;
      
      const loadStemsWithUrls = async () => {
        // Prevent re-loading if already in progress
        if (isLoadingStemsRef.current) return;
        isLoadingStemsRef.current = true;

        try {
          const audioFiles = projectAudioFiles.files.filter(file => 
            file.file_type === 'audio' && file.upload_status === 'completed'
          );

          if (audioFiles.length > 0) {
            debugLog.log('Found audio files, preparing to load:', audioFiles.map(f => f.file_name));
            debugLog.log('Master stem info:', audioFiles.map(f => ({ name: f.file_name, is_master: f.is_master })));
            
            // Debug: Log file structure to see what fields are available
            debugLog.log('Audio file structure sample:', audioFiles[0]);
            
            // Sort so master is last
            const sortedAudioFiles = sortStemsWithMasterLast(audioFiles.map(f => ({
              ...f,
              stemType: f.stem_type || getStemTypeFromFileName(f.file_name)
            })));

            const stemsToLoad = await Promise.all(
              sortedAudioFiles.map(async file => {
                // Debug: Check if file.id exists
                if (!file.id) {
                  debugLog.error('File missing ID:', file);
                  throw new Error(`File missing ID: ${file.file_name}`);
                }
                
                debugLog.log('Getting download URL for file:', { id: file.id, name: file.file_name });
                const result = await getDownloadUrlMutation.mutateAsync({ fileId: file.id });
                return {
                  id: file.id,
                  url: result.downloadUrl,
                  label: file.file_name,
                  isMaster: file.is_master || false,
                  stemType: file.stemType
                };
              })
            );

            if (!cancelled) {
              // Process non-master first, then master
              const nonMasterStems = stemsToLoad.filter(s => !s.isMaster);
              const masterStems = stemsToLoad.filter(s => s.isMaster);
              await stemAudio.loadStems(nonMasterStems, (stemId, audioBuffer) => {
                const stem = nonMasterStems.find(s => s.id === stemId);
                // Use ref to get current state to avoid stale closure
                const currentAnalysis = currentAnalysisRef.current;
                const hasAnalysis = currentAnalysis.some(a => a.fileMetadataId === stemId);
                debugLog.log('🎵 Stem loaded callback:', { 
                  stemId, 
                  stemType: stem?.stemType, 
                  hasAnalysis,
                  cachedAnalysisCount: currentAnalysis.length,
                  cachedAnalysisIds: currentAnalysis.map(a => a.fileMetadataId)
                });
                if (stem && !hasAnalysis) {
                  debugLog.log('🎵 Triggering analysis for stem:', stemId, stem.stemType);
                  audioAnalysis.analyzeAudioBuffer(stemId, audioBuffer, stem.stemType);
                } else {
                  debugLog.log('🎵 Skipping analysis for stem:', stemId, 'reason:', !stem ? 'no stem found' : 'analysis already exists');
                }
              });
              if (masterStems.length > 0) {
                await stemAudio.loadStems(masterStems, (stemId, audioBuffer) => {
                  const stem = masterStems.find(s => s.id === stemId);
                  // Use ref to get current state to avoid stale closure
                  const currentAnalysis = currentAnalysisRef.current;
                  const hasAnalysis = currentAnalysis.some(a => a.fileMetadataId === stemId);
                  debugLog.log('🎵 Master stem loaded callback:', { 
                    stemId, 
                    stemType: stem?.stemType, 
                    hasAnalysis,
                    cachedAnalysisCount: currentAnalysis.length,
                    cachedAnalysisIds: currentAnalysis.map(a => a.fileMetadataId)
                  });
                  if (stem && !hasAnalysis) {
                    debugLog.log('🎵 Triggering analysis for master stem:', stemId, stem.stemType);
                    audioAnalysis.analyzeAudioBuffer(stemId, audioBuffer, stem.stemType);
                  } else {
                    debugLog.log('🎵 Skipping analysis for master stem:', stemId, 'reason:', !stem ? 'no stem found' : 'analysis already exists');
                  }
                });
              }
            }
          } else {
            debugLog.log('No completed audio files found in project.');
          }
        } catch (error) {
          if (!cancelled) {
            debugLog.error('Failed to load stems:', error);
          }
        } finally {
          if (!cancelled) {
            isLoadingStemsRef.current = false;
          }
        }
      };
      
      loadStemsWithUrls();
      return () => { 
        cancelled = true; 
        isLoadingStemsRef.current = false;
      };
    }
  }, [projectAudioFiles?.files, currentProjectId, isInitialized, audioAnalysis.isLoading]); // Removed audioAnalysis.cachedAnalysis from dependencies

  

  const availableStems = projectAudioFiles?.files?.filter(file => 
    file.file_type === 'audio' && file.upload_status === 'completed'
  ) || [];

  // Load all analyses when stems are available
  useEffect(() => {
    if (availableStems.length > 0) {
      const stemIds = availableStems.map(stem => stem.id);
      audioAnalysis.loadAnalysis(stemIds);
    }
  }, [availableStems.length]); // Only depend on stem count, not the analysis functions



  const midiData = useDemoData ? sampleMidiData : (fileData?.midiData ? transformBackendToFrontendMidiData(fileData.midiData) : undefined);
  const visualizationSettings = useDemoData ? DEFAULT_VISUALIZATION_SETTINGS : (fileData?.settings || DEFAULT_VISUALIZATION_SETTINGS);

  const handleFileSelected = (fileId: string) => {
    setSelectedFileId(fileId);
    setUseDemoData(false);
    setCurrentTime(0);
    setPlaying(false);
    
    const params = new URLSearchParams(searchParams);
    params.set('fileId', fileId);
    router.push(`/creative-visualizer?${params.toString()}`, { scroll: false });
  };

  const handleDemoModeChange = useCallback((demoMode: boolean) => {
    setUseDemoData(demoMode);
    setCurrentTime(0);
    setPlaying(false);
    
    if (demoMode) {
      const params = new URLSearchParams(searchParams);
      params.delete('fileId');
      const newUrl = params.toString() ? `/creative-visualizer?${params.toString()}` : '/creative-visualizer';
      router.push(newUrl, { scroll: false });
    }
  }, [searchParams, router]);

  const handlePlayPause = async () => {
    // Control both MIDI visualization and stem audio
    if (isPlaying) {
      stemAudio.pause();
      setPlaying(false);
    } else {
      // Only start if we have stems loaded
      if (hasStems) {
        try {
          await stemAudio.play();
          setPlaying(true);
        } catch (error) {
          debugLog.error('Failed to start audio playback:', error);
          setPlaying(false);
        }
      } else {
        setPlaying(true);
      }
    }
  };

  const handleReset = () => {
    stemAudio.stop();
    setPlaying(false);
    setCurrentTime(0);
  };

  const handleProjectSelect = (projectId: string) => {
    setCurrentProjectId(projectId);
    setShowPicker(false);
    const params = new URLSearchParams(searchParams);
    params.set('projectId', projectId);
    router.push(`/creative-visualizer?${params.toString()}`);
  };

  const handleCreateNew = () => {
    setShowPicker(false);
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  


  

  // Check if stems are actually loaded in the audio controller, not just available in the project
  const hasStems = availableStems.length > 0 && stemAudio.stemsLoaded;
  
  // Check if we're currently loading stems
  const stemLoadingState = availableStems.length > 0 && !stemAudio.stemsLoaded;

  // Effects data for new sidebar (with categories and rarity)
  const effects: EffectUIData[] = [
    { 
      id: 'metaballs', 
      name: 'Metaballs Effect', 
      description: 'Organic, fluid-like visualizations that respond to audio intensity',
      category: 'Generative',
      rarity: 'Rare',
      image: '/effects/generative/metaballs.png',
      parameters: {} // <-- Added
    },
    { 
      id: 'midiHud', 
      name: 'HUD Effect', 
      description: 'Technical overlay displaying real-time audio analysis and MIDI data',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {} // <-- Added
    },
    { 
      id: 'particleNetwork', 
      name: 'Particle Effect', 
      description: 'Dynamic particle systems that react to rhythm and pitch',
      category: 'Generative',
      rarity: 'Mythic',
      image: '/effects/generative/particles.png',
      parameters: {} // Empty - modal is handled by ThreeVisualizer
    },
    { 
      id: 'imageSlideshow', 
      name: 'Image Slideshow', 
      description: 'Rhythmic image slideshow triggered by audio transients',
      category: 'Generative',
      rarity: 'Common',
      image: '/effects/generative/slideshow.png',
      parameters: {
         triggerValue: 0,
         threshold: 0.5,
         scale: 1.0,
         opacity: 1.0,
         images: [] 
      }
    },
    // HUD Overlay Effects
    { 
      id: 'waveform', 
      name: 'Waveform Overlay', 
      description: 'Real-time audio waveform visualization',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'spectrogram', 
      name: 'Spectrogram Overlay', 
      description: 'Frequency vs time visualization with color mapping',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'peakMeter', 
      name: 'Peak/LUFS Meter', 
      description: 'Professional audio level metering with peak and LUFS measurements',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'stereometer', 
      name: 'Stereometer Overlay', 
      description: 'Stereo field visualization and correlation meter',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'oscilloscope', 
      name: 'Oscilloscope Overlay', 
      description: 'Real-time waveform oscilloscope with pitch tracking',
      category: 'Overlays',
      rarity: 'Mythic',
      parameters: {}
    },
    { 
      id: 'spectrumAnalyzer', 
      name: 'Spectrum Analyzer', 
      description: 'FFT-based frequency spectrum visualization',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'midiMeter', 
      name: 'MIDI Activity Meter', 
      description: 'Real-time MIDI note and velocity visualization',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'vuMeter', 
      name: 'VU Meter', 
      description: 'Classic VU meter with needle and bar styles',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'chromaWheel', 
      name: 'Chroma Wheel', 
      description: '12-note chroma wheel for pitch class visualization',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'consoleFeed', 
      name: 'Data Feed', 
      description: 'Live data feed for MIDI, LUFS, FFT, and more',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    }
  ];

  const handleSelectEffect = (effectId: string) => {
    // Toggle the effect selection
    setSelectedEffects(prev => ({
      ...prev,
      [effectId]: !prev[effectId]
    }));
    
    // Open the parameter modal for this effect
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: true
    }));
  };

  const handleEffectDoubleClick = (effectId: string) => {
    // Open the parameter modal for this effect
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: true
    }));
  };

  // Effect clip timeline is merged into layers via store; per-effect UI remains via modals



  const handleCloseEffectModal = (effectId: string) => {
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: false
    }));
  };

  // Video composition handlers moved into store (addLayer, updateLayer, deleteLayer, selectLayer)





  // Feature mapping handlers
  const handleMapFeature = (parameterId: string, featureId: string) => {
    const [layerOrEffectId, paramName] = parameterId.split('-');
    debugLog.log('🎛️ Creating mapping:', {
      parameterId,
      featureId,
      parameterName: paramName,
      layerOrEffectId
    });
    
    setMappings(prev => ({ 
      ...prev, 
      [parameterId]: { 
        featureId, 
        modulationAmount: 0.5 // Default to 50% (noon)
      } 
    }));
    
    // Special handling for ImageSlideshow triggerValue: also save to layer.settings.triggerSourceId
    if (paramName === 'triggerValue') {
      const slideshowLayer = layers.find(l => l.id === layerOrEffectId && l.type === 'effect' && l.effectType === 'imageSlideshow');
      if (slideshowLayer) {
        console.log('🖼️ Saving triggerSourceId to layer settings:', layerOrEffectId, featureId);
        updateLayer(slideshowLayer.id, {
          ...slideshowLayer,
          settings: {
            ...slideshowLayer.settings,
            triggerSourceId: featureId
          }
        });
      }
    }
    
    // Store feature name for display
    const featureName = featureId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    setFeatureNames(prev => ({ ...prev, [featureId]: featureName }));
    
    debugLog.log('🎛️ Mapping created successfully');
  };

  const handleUnmapFeature = (parameterId: string) => {
    const [layerOrEffectId, paramName] = parameterId.split('-');
    debugLog.log('🎛️ Removing mapping:', {
      parameterId,
      currentMapping: mappings[parameterId]
    });
    
    setMappings(prev => ({ 
      ...prev, 
      [parameterId]: { 
        featureId: null, 
        modulationAmount: 0.5 
      } 
    }));
    
    // Special handling for ImageSlideshow triggerValue: also remove from layer.settings.triggerSourceId
    if (paramName === 'triggerValue') {
      const slideshowLayer = layers.find(l => l.id === layerOrEffectId && l.type === 'effect' && l.effectType === 'imageSlideshow');
      if (slideshowLayer) {
        console.log('🖼️ Removing triggerSourceId from layer settings:', layerOrEffectId);
        updateLayer(slideshowLayer.id, {
          ...slideshowLayer,
          settings: {
            ...slideshowLayer.settings,
            triggerSourceId: undefined
          }
        });
      }
    }
    
    debugLog.log('🎛️ Mapping removed successfully');
  };

  const handleModulationAmountChange = (parameterId: string, amount: number) => {
    setMappings(prev => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        modulationAmount: amount
      }
    }));
  };

  // Handler for selecting a stem/track
  const handleStemSelect = (stemId: string) => {
    debugLog.log('🎛️ Selecting stem:', {
      stemId,
      previousActiveTrack: activeTrackId,
      availableAnalyses: audioAnalysis.cachedAnalysis?.map(a => ({
        id: a.fileMetadataId,
        stemType: a.stemType,
        hasData: !!a.analysisData,
        features: a.analysisData ? Object.keys(a.analysisData) : []
      })) || []
    });
    
    setActiveTrackId(stemId);
    
    // Log the analysis data for the selected stem
    const selectedAnalysis = audioAnalysis.cachedAnalysis?.find(a => a.fileMetadataId === stemId);
    if (selectedAnalysis) {
      debugLog.log('🎛️ Selected stem analysis:', {
        stemId,
        stemType: selectedAnalysis.stemType,
        duration: selectedAnalysis.metadata.duration,
        features: selectedAnalysis.analysisData ? Object.keys(selectedAnalysis.analysisData) : [],
        sampleValues: selectedAnalysis.analysisData ? 
          Object.entries(selectedAnalysis.analysisData).reduce((acc, [feature, data]) => {
            if (Array.isArray(data) && data.length > 0) {
              acc[feature] = {
                length: data.length,
                firstValue: data[0],
                lastValue: data[data.length - 1],
                sampleValues: data.slice(0, 5) // First 5 values
              };
            }
            return acc;
          }, {} as Record<string, any>) : {}
      });
    } else {
      debugLog.warn('🎛️ No analysis found for selected stem:', stemId);
    }
  };

  const [activeSliderValues, setActiveSliderValues] = useState<Record<string, number>>({});
  const visualizerRef = useRef<any>(null);
  const animationFrameId = useRef<number>();

  // Sync project-wide background settings to the visualizer engine
  const { backgroundColor, isBackgroundVisible } = useProjectSettingsStore();
  useEffect(() => {
    const manager = visualizerRef.current;
    if (!manager) return;
    try {
      if (typeof manager.setBackgroundColor === 'function') {
        manager.setBackgroundColor(backgroundColor);
      }
      if (typeof manager.setBackgroundVisibility === 'function') {
        manager.setBackgroundVisibility(isBackgroundVisible);
      }
    } catch {}
  }, [backgroundColor, isBackgroundVisible, visualizerRef]);

  // Function to convert frontend feature names to backend analysis keys
  const getAnalysisKeyFromFeatureId = (featureId: string): string => {
    // Frontend feature IDs are like "drums-rms-volume", "bass-loudness", etc.
    // Backend analysis data has keys like "rms", "loudness", etc.
    const parts = featureId.split('-');
    if (parts.length >= 2) {
      // Remove the stem type prefix and get the feature name
      const featureName = parts.slice(1).join('-');
      
      // Map frontend feature names to backend analysis keys
      const featureMapping: Record<string, string> = {
        'rms-volume': 'rms',
        'loudness': 'loudness',
        'spectral-centroid': 'spectralCentroid',
        'spectral-rolloff': 'spectralRolloff',
        'spectral-flux': 'spectralFlux',
        'mfcc-1': 'mfcc_0', // Meyda uses 0-indexed MFCC
        'mfcc-2': 'mfcc_1',
        'mfcc-3': 'mfcc_2',
        'perceptual-spread': 'perceptualSpread',
        'energy': 'energy',
        'zcr': 'zcr',
        'beat-intensity': 'beatIntensity',
        'rhythm-pattern': 'rhythmPattern',
        'attack-time': 'attackTime',
        'chroma-vector': 'chromaVector',
        'harmonic-content': 'harmonicContent',
        'sub-bass': 'subBass',
        'warmth': 'warmth',
        'spectral-complexity': 'spectralComplexity',
        'texture': 'texture',
        'pitch-height': 'pitchHeight',
        'pitch-movement': 'pitchMovement',
        'melody-complexity': 'melodyComplexity',
        'expression': 'expression'
      };
      
      return featureMapping[featureName] || featureName;
    }
    return featureId; // Fallback to original if no prefix
  };

  // Function to get the stem type from a feature ID
  const getStemTypeFromFeatureId = (featureId: string): string | null => {
    const parts = featureId.split('-');
    if (parts.length >= 2) {
      return parts[0]; // First part is the stem type
    }
    return null;
  };

  // Track when visualizer ref becomes available
  useEffect(() => {
    if (visualizerRef.current) {
      debugLog.log('🎛️ Visualizer ref available:', {
        hasRef: !!visualizerRef.current,
        availableEffects: visualizerRef.current?.getAllEffects?.()?.map((e: any) => e.id) || [],
        selectedEffects: Object.keys(selectedEffects).filter(k => selectedEffects[k])
      });
    } else {
      debugLog.log('🎛️ Visualizer ref not available yet');
    }
  }, [visualizerRef.current, selectedEffects]);

  // Real-time feature mapping and visualizer update loop
  useEffect(() => {
    let cachedMappings: [string, string][] = [];
    let lastUpdateTime = 0;
    let frameCount = 0;

    const animationLoop = () => {
      if (!isPlaying || !visualizerRef.current) {
        animationFrameId.current = requestAnimationFrame(animationLoop);
        return;
      }
      
      // 30FPS CAP
      const now = performance.now();
      const elapsed = now - lastUpdateTime;
      const targetFrameTime = 1000 / 30;
      
      if (elapsed < targetFrameTime) {
        animationFrameId.current = requestAnimationFrame(animationLoop);
        return;
      }
      
      lastUpdateTime = now;
      frameCount++;
      
      // Get current audio time
      const time = stemAudio.currentTime;
      setCurrentTime(time);
      
      // Sync calculation (keep your existing code)
      const audioContextTime = stemAudio.getAudioContextTime?.() || 0;
      const scheduledStartTime = stemAudio.scheduledStartTimeRef?.current || 0;
      const measuredLatency = stemAudio.getAudioLatency?.() || 0;
      const audioPlaybackTime = Math.max(0, audioContextTime - scheduledStartTime);
      let syncTime = Math.max(0, audioPlaybackTime - measuredLatency + (syncOffsetMs / 1000));
      
      // 🔥 FIX: Handle audio looping by wrapping syncTime to analysis duration
      if (audioAnalysis.cachedAnalysis.length > 0) {
        const analysisDuration = audioAnalysis.cachedAnalysis[0]?.metadata?.duration || 1;
        if (analysisDuration > 0) {
          syncTime = syncTime % analysisDuration; // Wrap time to loop within analysis duration
        }
      }

      // Cache mappings
      if (cachedMappings.length !== Object.keys(mappings).length) {
        cachedMappings = Object.entries(mappings)
          .filter(([, mapping]) => mapping.featureId !== null)
          .map(([paramKey, mapping]) => [paramKey, mapping.featureId!]) as [string, string][];
      }

      // 🔥 THE FIX: Use enhancedAudioAnalysis instead of cachedStemAnalysis
      if (audioAnalysis.cachedAnalysis && audioAnalysis.cachedAnalysis.length > 0) {
        for (const [paramKey, featureId] of cachedMappings) {
          if (!featureId) continue;

          // Parse feature ID: "drums-rms"
          const featureStemType = getStemTypeFromFeatureId(featureId);
          if (!featureStemType) continue;

          // 🔥 CHANGED: Use audioAnalysis.getFeatureValue from consolidated hook
          // Find the analysis for this stem type to get its file ID
          const stemAnalysis = audioAnalysis.cachedAnalysis?.find(
            a => a.stemType === featureStemType
          );
          if (!stemAnalysis) continue;

          // Use the hook's getFeatureValue which properly handles both Float32Arrays and time-indexed arrays
          const rawValue = audioAnalysis.getFeatureValue(
            stemAnalysis.fileMetadataId,
            featureId,
            syncTime,
            featureStemType
          );

          if (rawValue === null || rawValue === undefined) continue;

          // Parse parameter key: "metaballs-glowIntensity"
          const [effectId, ...paramParts] = paramKey.split('-');
          const paramName = paramParts.join('-');
          
          if (!effectId || !paramName) continue;

          // Scale to parameter range with modulation amount attenuation
          const maxValue = getSliderMax(paramName);
          // Bipolar attenuverter: mapping.modulationAmount in [0..1] maps to [-1..+1] around noon
          // Range clamp to ±0.5 (±50%) so modulation isn't too extreme
          const knobFull = (mappings[paramKey]?.modulationAmount ?? 0.5) * 2 - 1; // -1..+1
          const knob = Math.max(-0.5, Math.min(0.5, knobFull));
          const baseValue = baseParameterValues[paramKey] ?? (activeSliderValues[paramKey] ?? 0);
          const delta = rawValue * knob * maxValue; // modulation contribution
          const scaledValue = Math.max(0, Math.min(maxValue, baseValue + delta));

          // Update visualizer
          visualizerRef.current.updateEffectParameter(effectId, paramName, scaledValue);
          
          // Update React state occasionally
          if (frameCount % 10 === 0) {
            setModulatedParameterValues(prev => ({ ...prev, [paramKey]: scaledValue }));
          }
        }
      }
      
      // Handle timeline-specific audio triggers (e.g., Image Slideshow trigger)
      if (layers.length > 0 && audioAnalysis.cachedAnalysis.length > 0) {
        layers.forEach(layer => {
          if (layer.settings && layer.settings.triggerSourceId) {
            const featureId = layer.settings.triggerSourceId;
            const featureStemType = getStemTypeFromFeatureId(featureId);
            
            if (featureStemType) {
              const stemAnalysis = audioAnalysis.cachedAnalysis?.find(
                a => a.stemType === featureStemType
              );
              
              if (stemAnalysis) {
                const rawValue = audioAnalysis.getFeatureValue(
                  stemAnalysis.fileMetadataId,
                  featureId,
                  syncTime,
                  featureStemType
                );
                
                // Push trigger value to the effect instance via updateEffectParameter
                // The ImageSlideshowEffect expects 'triggerValue' to be updated
                if (rawValue !== undefined) {
                  visualizerRef.current.updateEffectParameter(layer.id, 'triggerValue', rawValue);
                  // Debug log every 60 frames (roughly once per second at 60fps)
                  if (Math.floor(syncTime * 60) % 60 === 0) {
                    console.log('🖼️ Updating triggerValue:', { layerId: layer.id, featureId, rawValue, syncTime });
                  }
                }
              } else {
                console.warn('🖼️ No stem analysis found for feature:', featureId, 'stemType:', featureStemType);
              }
            } else {
              console.warn('🖼️ Could not determine stem type for feature:', featureId);
            }
          } else if (layer.effectType === 'imageSlideshow') {
            // Debug: log when triggerSourceId is missing
            if (Math.floor(syncTime * 60) % 300 === 0) { // Every 5 seconds
              console.warn('🖼️ ImageSlideshow layer has no triggerSourceId:', layer.id, layer.settings);
            }
          }
        });
      }


      animationFrameId.current = requestAnimationFrame(animationLoop);
    };

    animationFrameId.current = requestAnimationFrame(animationLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [
    isPlaying, 
    mappings, 
    audioAnalysis.cachedAnalysis,
    stemAudio, 
    syncOffsetMs
  ]);
  
  const getSliderMax = (paramName: string) => {
    if (paramName === 'base-radius') return 1.0;
    if (paramName === 'animation-speed') return 2.0;
    if (paramName === 'glow-intensity') return 3.0;
    if (paramName === 'hud-opacity') return 1.0;
    if (paramName === 'max-particles') return 200;
    if (paramName === 'connection-distance') return 5.0;
    if (paramName === 'particle-size') return 50;
    return 100; // Default max for other numeric parameters
  };

  const getSliderStep = (paramName: string) => {
    if (paramName === 'base-radius') return 0.1;
    if (paramName === 'animation-speed') return 0.1;
    if (paramName === 'glow-intensity') return 0.1;
    if (paramName === 'hud-opacity') return 0.1;
    if (paramName === 'max-particles') return 10;
    if (paramName === 'connection-distance') return 0.1;
    if (paramName === 'particle-size') return 5;
    return 1; // Default step for other numeric parameters
  };

  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    const paramKey = `${effectId}-${paramName}`;
    // Slider sets the base value regardless of mapping
    setBaseParameterValues(prev => ({ ...prev, [paramKey]: value }));
    setActiveSliderValues(prev => ({ ...prev, [paramKey]: value }));
    
    // Update the effect instance directly
    if (visualizerRef.current) {
        visualizerRef.current.updateEffectParameter(effectId, paramName, value);
    }
  };

  const effectModals = Object.entries(openEffectModals).map(([effectId, isOpen], index) => {
    if (!isOpen) return null;
    const effectInstance = effects.find(e => e.id === effectId);
    if (!effectInstance) return null;

    // Special case for Image Slideshow to show Collection Manager
    if (effectId === 'imageSlideshow') {
      const initialPos = { x: 100 + (index * 50), y: 100 + (index * 50) };
      // Find the layer with this effect type - the effect instance uses the layer ID, not the effect type ID
      const slideshowLayer = layers.find(l => l.type === 'effect' && l.effectType === 'imageSlideshow');
      const layerId = slideshowLayer?.id || effectId; // Fallback to effectId if no layer found
      
      return (
        <PortalModal
          key={effectId}
          title="Slideshow Collections"
          isOpen={isOpen}
          onClose={() => handleCloseEffectModal(effectId)}
          initialPosition={initialPos}
          bounds="#editor-bounds"
          modalWidth={520}
          className="w-[520px]"
        >
          <div className="max-w-full">
            <CollectionManager
              projectId={currentProjectId || ''}
              availableFiles={projectFiles?.files || []}
              onSelectCollection={(imageUrls, collectionId) => {
                // Use layerId instead of effectId - the effect instance is keyed by layer ID
                console.log('🖼️ Collection selected, updating effect with layerId:', layerId, 'imageUrls count:', imageUrls.length);
                handleParameterChange(layerId, 'images', imageUrls);
                setActiveCollectionId(collectionId);
              }}
              selectedCollectionId={activeCollectionId}
            />
            <div className="mt-4 pt-4 border-t border-white/10">
                <Label className="text-xs uppercase text-stone-400 mb-2 block">Playback Settings</Label>
                
                <div className="space-y-4">
                  <DroppableParameter
                    parameterId={`${layerId}-triggerValue`}
                    label="Advance Trigger"
                    mappedFeatureId={slideshowLayer?.settings?.triggerSourceId || mappings[`${layerId}-triggerValue`]?.featureId}
                    mappedFeatureName={slideshowLayer?.settings?.triggerSourceId ? featureNames[slideshowLayer.settings.triggerSourceId] : (mappings[`${layerId}-triggerValue`]?.featureId ? featureNames[mappings[`${layerId}-triggerValue`]?.featureId!] : undefined)}
                    modulationAmount={mappings[`${layerId}-triggerValue`]?.modulationAmount ?? 0.5}
                    baseValue={baseParameterValues[`${layerId}-triggerValue`] ?? 0}
                    modulatedValue={modulatedParameterValues[`${layerId}-triggerValue`] ?? 0}
                    sliderMax={1}
                    onFeatureDrop={handleMapFeature}
                    onFeatureUnmap={handleUnmapFeature}
                    onModulationAmountChange={handleModulationAmountChange}
                    dropZoneStyle="inlayed"
                  >
                     <div className="h-2 bg-stone-800 rounded overflow-hidden mt-1">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-75"
                            style={{ width: `${(modulatedParameterValues[`${layerId}-triggerValue`] || 0) * 100}%` }}
                        />
                     </div>
                     <div className="text-[10px] text-stone-500 mt-1">
                        {(slideshowLayer?.settings?.triggerSourceId || mappings[`${layerId}-triggerValue`]?.featureId)
                            ? "Mapped to audio analysis" 
                            : "Drag 'Transients' here to trigger slides"}
                     </div>
                  </DroppableParameter>

                  <div className="space-y-1">
                    <Label className="text-xs">Threshold</Label>
                    <Slider
                        value={[activeSliderValues[`${layerId}-threshold`] ?? 0.5]}
                        onValueChange={([val]) => {
                            setActiveSliderValues(prev => ({ ...prev, [`${layerId}-threshold`]: val }));
                            handleParameterChange(layerId, 'threshold', val);
                        }}
                        min={0}
                        max={1.0}
                        step={0.01}
                    />
                    <div className="text-[10px] text-stone-500 mt-1">
                      Trigger fires when value exceeds threshold (current: {(activeSliderValues[`${layerId}-threshold`] ?? 0.5).toFixed(2)})
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Scale</Label>
                    <Slider
                        value={[activeSliderValues[`${layerId}-scale`] ?? 1.0]}
                        onValueChange={([val]) => {
                            setActiveSliderValues(prev => ({ ...prev, [`${layerId}-scale`]: val }));
                            handleParameterChange(layerId, 'scale', val);
                        }}
                        min={0.1}
                        max={3.0}
                        step={0.1}
                    />
                  </div>
                </div>
            </div>
          </div>
        </PortalModal>
      );
    }

    const sortedParams = Object.entries(effectInstance.parameters || {}).sort(([, a], [, b]) => {
      if (typeof a === 'boolean' && typeof b !== 'boolean') return -1;
      if (typeof a !== 'boolean' && typeof b === 'boolean') return 1;
      return 0;
    });
    if (sortedParams.length === 0) return null;
    const initialPos = {
      x: 100 + (index * 50),
      y: 100 + (index * 50)
    };
    return (
      <PortalModal
        key={effectId}
        title={effectInstance.name.replace(' Effect', '')}
        isOpen={isOpen}
        onClose={() => handleCloseEffectModal(effectId)}
        initialPosition={initialPos}
        bounds="#editor-bounds"
      >
        <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
          {sortedParams.map(([paramName, value]) => {
            if (typeof value === 'boolean') {
              return (
                <div key={paramName} className="flex items-center justify-between">
                  <Label className="text-white/80 text-xs font-mono">{paramName}</Label>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) => handleParameterChange(effectId, paramName, checked)}
                  />
                </div>
              );
            }
            if (typeof value === 'number') {
              const paramKey = `${effectId}-${paramName}`;
              const mapping = mappings[paramKey];
              const mappedFeatureId = mapping?.featureId || null;
              const mappedFeatureName = mappedFeatureId ? featureNames[mappedFeatureId] : undefined;
              const modulationAmount = mapping?.modulationAmount ?? 0.5;
              const baseVal = activeSliderValues[paramKey] ?? value;
              return (
                <DroppableParameter
                  key={paramKey}
                  parameterId={paramKey}
                  label={paramName}
                  mappedFeatureId={mappedFeatureId}
                  mappedFeatureName={mappedFeatureName}
                  modulationAmount={modulationAmount}
                  baseValue={baseParameterValues[paramKey] ?? baseVal}
                  modulatedValue={modulatedParameterValues[paramKey] ?? baseVal}
                  sliderMax={getSliderMax(paramName)}
                  onFeatureDrop={handleMapFeature}
                  onFeatureUnmap={handleUnmapFeature}
                  onModulationAmountChange={handleModulationAmountChange}
                  className="mb-2"
                  dropZoneStyle="inlayed"
                  showTagOnHover
                >
                                            <Slider
                            value={[activeSliderValues[paramKey] ?? value]}
                            onValueChange={([val]) => {
                              setActiveSliderValues(prev => ({ ...prev, [paramKey]: val }));
                              handleParameterChange(effectId, paramName, val);
                            }}
                            min={0}
                            max={getSliderMax(paramName)}
                            step={getSliderStep(paramName)}
                            className="w-full"
                            disabled={!!mappedFeatureId} // Disable manual control when mapped
                          />
                </DroppableParameter>
              );
            }
            if ((paramName === 'highlightColor' || paramName === 'particleColor') && Array.isArray(value)) {
              const displayName = paramName === 'highlightColor' ? 'Highlight Color' : 'Particle Color';
              return (
                <div key={paramName} className="space-y-2">
                  <Label className="text-white/90 text-sm font-medium flex items-center justify-between">
                    {displayName}
                    <span className="ml-2 w-6 h-6 rounded-full border border-white/40 inline-block" style={{ background: `rgb(${value.map((v) => Math.round(v * 255)).join(',')})` }} />
                  </Label>
                  <input
                    type="color"
                    value={`#${value.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`}
                    onChange={e => {
                      const hex = e.target.value;
                      const rgb = [
                        parseInt(hex.slice(1, 3), 16) / 255,
                        parseInt(hex.slice(3, 5), 16) / 255,
                        parseInt(hex.slice(5, 7), 16) / 255
                      ];
                      handleParameterChange(effectId, paramName, rgb);
                    }}
                    className="w-12 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                  />
                </div>
              );
            }
            return null;
          })}
          {/* Effect Enabled Toggle - Remove border and adjust spacing */}
          <div className="pt-2 mt-2">
            <div className="flex items-center justify-between">
              <Label className="text-white/80 text-xs font-mono">Effect Enabled</Label>
              <Switch 
                checked={selectedEffects[effectId]}
                onCheckedChange={(checked) => {
                  setSelectedEffects(prev => ({
                    ...prev,
                    [effectId]: checked
                  }));
                }}
              />
            </div>
          </div>
        </div>
      </PortalModal>
    );
  });

  // Helper to infer stem type from file name
  const getStemTypeFromFileName = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.includes('bass')) return 'bass';
    if (lower.includes('drum')) return 'drums';
    if (lower.includes('vocal')) return 'vocals';
    return 'other';
  };

  // Find the selected stem and its type
  const selectedStem = availableStems.find(stem => stem.id === activeTrackId);
  // Use the actual stem_type from the database, fallback to filename inference
  const selectedStemType = selectedStem 
    ? (selectedStem.stem_type || getStemTypeFromFileName(selectedStem.file_name))
    : undefined;

  // Helper to get the master stem (if available)
  const getMasterStem = () => availableStems.find(stem => stem.is_master);

  // Helper to get the correct duration (master audio if available, else fallback)
  const getCurrentDuration = () => {
    if (hasStems && stemAudio.duration && stemAudio.duration > 0) {
      return stemAudio.duration;
    }
    return (midiData || sampleMidiData).file.duration;
  };

  // Keep timeline store duration in sync with audio/midi duration
  useEffect(() => {
    try {
      const d = getCurrentDuration();
      if (typeof d === 'number' && isFinite(d) && d > 0) {
        setDuration(d);
      }
    } catch {}
  }, [hasStems, stemAudio.duration, midiData, sampleMidiData, setDuration]);

  // Update currentTime from stemAudio if stems are loaded
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    const update = () => {
      if (hasStems) {
        const duration = getCurrentDuration();
        let displayTime = stemAudio.currentTime;
        
        // If looping is enabled, show position within the current loop cycle
        if (stemAudio.isLooping && duration > 0) {
          displayTime = stemAudio.currentTime % duration;
        }
        
        setCurrentTime(displayTime);
      }
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, hasStems, stemAudio]);


  // In the render, use the sorted stems
  const sortedAvailableStems = sortStemsWithMasterLast(availableStems);

  // Log audio files before building stemUrlMap
  useEffect(() => {
    debugLog.log('[CreativeVisualizerPage] projectAudioFiles.files:', projectAudioFiles?.files);
  }, [projectAudioFiles?.files]);

  // State for asynchronously built stemUrlMap
  const [asyncStemUrlMap, setAsyncStemUrlMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchUrls() {
      if (!projectAudioFiles?.files) return;
      const audioFiles = projectAudioFiles.files.filter(f => f.file_type === 'audio' && f.upload_status === 'completed');
      
      // Debug: Log file structure
      debugLog.log('fetchUrls - projectAudioFiles.files:', projectAudioFiles.files);
      debugLog.log('fetchUrls - audioFiles:', audioFiles);
      
      const entries = await Promise.all(audioFiles.map(async f => {
        let url = f.downloadUrl;
        if (!url && getDownloadUrlMutation) {
          try {
            // Debug: Check if f.id exists
            if (!f.id) {
              debugLog.error('fetchUrls - File missing ID:', f);
              return [f.id, null];
            }
            
            debugLog.log('fetchUrls - Getting download URL for file:', { id: f.id, name: f.file_name });
            const result = await getDownloadUrlMutation.mutateAsync({ fileId: f.id });
            url = result.downloadUrl;
          } catch (err) {
            debugLog.error('[CreativeVisualizerPage] Failed to fetch downloadUrl for', f.id, err);
          }
        }
        return [f.id, url];
      }));
      const map = Object.fromEntries(entries.filter(([id, url]) => !!url));
      setAsyncStemUrlMap(map);
      if (Object.keys(map).length > 0) {
        debugLog.log('[CreativeVisualizerPage] asyncStemUrlMap populated:', map);
      } else {
        debugLog.log('[CreativeVisualizerPage] asyncStemUrlMap is empty');
      }
    }
    fetchUrls();
  }, [projectAudioFiles?.files]);

  const stemUrlsReady = Object.keys(asyncStemUrlMap).length > 0;

  // Don't render anything until we're on the client side
  if (!isClient) {
    return (
      <div className="flex h-screen bg-stone-800 text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-sm text-stone-300">Loading...</div>
        </div>
      </div>
    );
  }

  // If no project is selected, show the picker
  if (!currentProjectId && !useDemoData) {
    return (
      <>
        {showPicker && (
          <ProjectPickerModal
            isOpen={showPicker}
            onClose={() => router.push('/dashboard')}
            onSelect={handleProjectSelect}
            onCreateNew={handleCreateNew}
          />
        )}
        {showCreateModal && (
          <ProjectCreationModal
            isOpen={showCreateModal}
            onClose={handleCloseCreateModal}
          />
        )}
        <div className="flex h-screen bg-stone-800 text-white items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-sm text-stone-300">Please create or select a project.</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <HudOverlayProvider 
      cachedAnalysis={audioAnalysis.cachedAnalysis}
      stemAudio={stemAudio}
      stemUrlMap={asyncStemUrlMap}
    >
      {showPicker && (
        <ProjectPickerModal
          isOpen={showPicker}
          onClose={() => router.push('/dashboard')}
          onSelect={handleProjectSelect}
          onCreateNew={handleCreateNew}
        />
      )}
      {showCreateModal && (
        <ProjectCreationModal
          isOpen={showCreateModal}
          onClose={handleCloseCreateModal}
        />
      )}
      <DndProvider backend={HTML5Backend}>
        {/* Main visualizer UI */}
        <div className="flex h-screen bg-stone-800 text-white min-w-0 creative-visualizer-text">
          <CollapsibleSidebar>
            <div className="space-y-4">
              <MappingSourcesPanel 
                activeTrackId={activeTrackId || undefined}
                className="mb-4"
                selectedStemType={selectedStemType}
                currentTime={currentTime}
                cachedAnalysis={audioAnalysis.cachedAnalysis}
                isPlaying={isPlaying}
              />
              <FileSelector 
                onFileSelected={handleFileSelected}
                selectedFileId={selectedFileId || undefined}
                useDemoData={useDemoData}
                onDemoModeChange={handleDemoModeChange}
                projectId={currentProjectId || undefined}
                projectName={projectData?.name}
              />
            </div>
          </CollapsibleSidebar>
          <main className="flex-1 flex overflow-hidden min-w-0">
            {/* Editor bounds container with proper positioning context */}
            <div 
              id="editor-bounds" 
              className="relative flex-1 flex flex-col overflow-hidden min-w-0"
              style={{ 
                height: '100vh',
                position: 'relative',
                contain: 'layout'
              }}
            >
          {/* Top Control Bar */}
          <div className="p-2 bg-stone-900/50 border-b border-white/10">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <Button 
                  onClick={handlePlayPause} 
                  size="sm" 
                    disabled={stemLoadingState}
                  className={`font-mono text-xs uppercase tracking-wider px-4 py-2 transition-all duration-300 ${
                      stemLoadingState 
                      ? 'bg-stone-600 text-stone-400 cursor-not-allowed' 
                      : 'bg-stone-700 hover:bg-stone-600'
                  }`}
                >
                    {stemLoadingState ? (
                    <>
                      <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
                      LOADING
                    </>
                  ) : (
                    <>
                      {isPlaying ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                      {isPlaying ? 'PAUSE' : 'PLAY'}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                    disabled={stemLoadingState}
                  onClick={() => stemAudio.setLooping(!stemAudio.isLooping)}
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-3 py-1 ${
                      stemLoadingState 
                      ? 'opacity-50 cursor-not-allowed' 
                      : stemAudio.isLooping ? 'bg-emerald-900/20 border-emerald-600 text-emerald-300' : ''
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  🔄 {stemAudio.isLooping ? 'LOOP' : 'LOOP'}
                </Button>
                <Button 
                  variant="outline" 
                    disabled={stemLoadingState}
                  onClick={handleReset} 
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 px-3 py-1 ${
                      stemLoadingState ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  RESET
                </Button>
                  
                  {/* Stats Section - Compact layout */}
                  <div className="flex items-center gap-1 overflow-hidden">
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <span className="font-creative-mono">{currentTime.toFixed(1)}</span><span className="font-creative-mono">S</span> / <span className="font-creative-mono">{getCurrentDuration().toFixed(1)}</span><span className="font-creative-mono">S</span>
                </div>
                {/* BPM on the left, FPS on the right */}
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  BPM: <span className="font-creative-mono">{(() => {
                    const masterId = projectAudioFiles?.files?.find(f => f.is_master)?.id;
                    const ca = audioAnalysis.cachedAnalysis || [];
                    const master = masterId ? ca.find((a: any) => a.fileMetadataId === masterId) : null;
                    const candidate: any = master ?? ca[0];
                    const bpmVal = candidate?.bpm ?? candidate?.metadata?.bpm ?? candidate?.analysisData?.bpm;
                    return typeof bpmVal === 'number' && isFinite(bpmVal) ? Math.round(bpmVal) : '—';
                  })()}</span>
                </div>
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  FPS: <span className="font-creative-mono">{fps}</span>
                </div>
                {hasStems && (
                  <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    STEMS: <span className="font-creative-mono">{availableStems.length}</span>
                  </div>
                )}
                
              </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <AspectRatioSelector
                  currentAspectRatio={visualizerAspectRatio}
                  onAspectRatioChange={setVisualizerAspectRatio}
                  disabled={stemLoadingState}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowVideoComposition(!showVideoComposition)} 
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-2 py-1 ${
                    showVideoComposition ? 'bg-emerald-900/20 border-emerald-600 text-emerald-300' : ''
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                    🎬 {showVideoComposition ? 'COMP' : 'VIDEO'}
                </Button>
                
                {/* Test Video Composition Controls */}
                {showVideoComposition && (
                  <TestVideoComposition
                    onAddLayer={addLayer}
                    className="ml-2"
                  />
                )}
                  
                </div>
              </div>
            </div>
            
            {/* Visualizer Area - Scrollable Layout */}
            <div className="flex-1 flex flex-col overflow-hidden bg-stone-900 relative">
              <div className="flex-1 flex flex-col min-h-0 px-4 overflow-y-auto">
                {/* Visualizer Container - Responsive with aspect ratio */}
                <div className="flex-shrink-0 mb-4">
                  <div 
                    className="relative mx-auto bg-stone-900 rounded-lg overflow-hidden shadow-lg flex items-center justify-center"
                    style={{ 
                      height: 'min(calc(100vh - 400px), 60vh)', // Reduced height to make room for stem panel
                      minHeight: '200px',
                      width: '100%',
                      maxWidth: '100%'
                    }}
                  >
                  <ThreeVisualizer
                      midiData={midiData || sampleMidiData}
                      settings={settings}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      layers={layers}
                      selectedLayerId={selectedLayerId}
                      onLayerSelect={selectLayer}
                      onPlayPause={handlePlayPause}
                      onSettingsChange={setSettings}
                      onFpsUpdate={setFps}
                      selectedEffects={selectedEffects}
                      aspectRatio={visualizerAspectRatio}
                          // Modal and mapping props
                          openEffectModals={openEffectModals}
                          onCloseEffectModal={handleCloseEffectModal}
                          mappings={mappings}
                          featureNames={featureNames}
                          onMapFeature={handleMapFeature}
                          onUnmapFeature={handleUnmapFeature}
                          onModulationAmountChange={handleModulationAmountChange}
                          activeSliderValues={activeSliderValues}
                          setActiveSliderValues={setActiveSliderValues}
                      onSelectedEffectsChange={() => {}} // <-- Added no-op
                      visualizerRef={visualizerRef}
                  />

                  {/* Video Composition Layer Container */}
                  {showVideoComposition && (
                    <LayerContainer
                      layers={layers}
                      width={visualizerAspectRatio === 'mobile' ? 400 : 1280}
                      height={visualizerAspectRatio === 'mobile' ? 711 : 720}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      audioFeatures={{
                        frequencies: new Array(256).fill(0.5),
                        timeData: new Array(256).fill(0.5),
                        volume: 0.5,
                        bass: 0.5,
                        mid: 0.5,
                        treble: 0.5
                      }}
                      midiData={{
                        activeNotes: [],
                        currentTime: currentTime,
                        tempo: 120,
                        totalNotes: 0,
                        trackActivity: {}
                      }}
                      onLayerUpdate={updateLayer}
                      onLayerDelete={deleteLayer}
                    />
                  )}

                  {/* HUD Overlays positioned relative to visualizer */}
                  <div id="hud-overlays" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
                    {/* Overlays will be rendered here by the HudOverlayProvider */}
                  </div>

                      {/* Visualizer content only - no modals here */}
                </div>
                </div>
                
                {/* Unified Timeline */}
                <div className="flex-shrink-0 mb-4">
                  <UnifiedTimeline
                    stems={sortedAvailableStems}
                    masterStemId={projectAudioFiles?.files?.find(f => f.is_master)?.id ?? null}
                    onStemSelect={handleStemSelect}
                    activeTrackId={activeTrackId}
                    soloedStems={stemAudio.soloedStems}
                    onToggleSolo={stemAudio.toggleStemSolo}
                    analysisProgress={audioAnalysis.analysisProgress}
                    cachedAnalysis={audioAnalysis.cachedAnalysis || []}
                    stemLoadingState={audioAnalysis.isLoading}
                    stemError={audioAnalysis.error}
                    onSeek={useTimelineStore.getState().setCurrentTime}
                    className="bg-stone-800 border border-gray-700"
                  />
                </div>
            </div>
          </div>

              {/* Effect parameter modals - positioned relative to editor-bounds */}
              {effectModals}
            </div>

            {/* Right Effects Sidebar */}
            <CollapsibleEffectsSidebar>
              <EffectsLibrarySidebarWithHud
                effects={effects}
                selectedEffects={selectedEffects}
                onEffectToggle={handleSelectEffect}
                onEffectDoubleClick={handleEffectDoubleClick}
                isVisible={true}
                stemUrlsReady={stemUrlsReady}
              />
            </CollapsibleEffectsSidebar>



        </main>
      </div>
      </DndProvider>
    </HudOverlayProvider>
  );
}

export default function CreativeVisualizerPageWithSuspense() {
  return (
    <Suspense>
      <CreativeVisualizerPage />
    </Suspense>
  );
}
```

## File: /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/components/assets/CollectionManager.tsx
```typescript
import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Check, Plus, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AssetCollection {
  id: string;
  name: string;
  created_at: string;
  type?: string;
}

interface CollectionManagerProps {
    projectId: string;
    availableFiles: any[]; // Files from projectFiles query
  onSelectCollection: (imageUrls: string[], collectionId: string) => void;
    selectedCollectionId?: string;
  }
  
  export function CollectionManager({ 
    projectId, 
    availableFiles, 
    onSelectCollection,
    selectedCollectionId 
  }: CollectionManagerProps) {
    const { toast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedFilesForNew, setSelectedFilesForNew] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [viewingCollectionId, setViewingCollectionId] = useState<string | null>(null);
  
    // TRPC Hooks
    const utils = trpc.useUtils();
  
  const { data: collections, isLoading } = trpc.asset.getProjectCollections.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const createCollectionMutation = trpc.asset.createCollection.useMutation();
  const addFileToCollectionMutation = trpc.asset.addFileToCollection.useMutation();
  const getDownloadUrlMutation = trpc.file.getDownloadUrl.useMutation();

  // Fetch details for a specific collection when selected/viewed
  const { data: activeCollectionDetails } = trpc.asset.getCollection.useQuery(
    { collectionId: viewingCollectionId! },
    { enabled: !!viewingCollectionId }
  );

  // Filter for only images
  const imageFiles = availableFiles.filter(f => 
    f.file_type === 'image' || 
    f.mime_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(f.file_name)
  );

  const handleCreateCollection = async () => {
    if (selectedFilesForNew.size === 0) {
      toast({ title: "No images selected", description: "Select at least one image to create a collection.", variant: "destructive" });
      return;
    }

    try {
      // Fallback to an auto-generated name if user left it blank
      const baseName = newCollectionName.trim() || 'Slideshow Collection';
      const suffix = collections && collections.length > 0 ? ` #${collections.length + 1}` : '';
      const finalName = `${baseName}${suffix}`;

      // 1. Create Collection
      const collection = await createCollectionMutation.mutateAsync({
        projectId,
        name: finalName,
        type: 'image_slideshow'
      });

      // 2. Add Selected Files
      const fileIds = Array.from(selectedFilesForNew);
      // We add them sequentially to preserve order (simplistic approach)
      for (const fileId of fileIds) {
        await addFileToCollectionMutation.mutateAsync({
          collectionId: collection.id,
          fileId
        });
      }

      toast({ title: "Collection Created", description: `"${finalName}" created with ${fileIds.length} images.` });
      
      // Reset
      setNewCollectionName('');
      setSelectedFilesForNew(new Set());
      setIsCreating(false);
      utils.asset.getProjectCollections.invalidate();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to create collection", variant: "destructive" });
    }
  };

  const selectRange = (startId: string, endId: string) => {
    const startIndex = imageFiles.findIndex(file => file.id === startId);
    const endIndex = imageFiles.findIndex(file => file.id === endId);
    if (startIndex === -1 || endIndex === -1) return;
    const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const next = new Set(selectedFilesForNew);
    for (let i = from; i <= to; i++) {
      next.add(imageFiles[i].id);
    }
    setSelectedFilesForNew(next);
  };

  const toggleFileSelection = (fileId: string) => {
    const next = new Set(selectedFilesForNew);
    if (next.has(fileId)) next.delete(fileId);
    else next.add(fileId);
    setSelectedFilesForNew(next);
    setLastSelectedId(fileId);
  };

  const handleFileClick = (event: React.MouseEvent<HTMLDivElement>, fileId: string) => {
    if (event.shiftKey && lastSelectedId && lastSelectedId !== fileId) {
      selectRange(lastSelectedId, fileId);
      setLastSelectedId(fileId);
      return;
    }
    toggleFileSelection(fileId);
  };

  const handleSelectAll = () => {
    if (selectedFilesForNew.size === imageFiles.length) {
      setSelectedFilesForNew(new Set());
      return;
    }
    setSelectedFilesForNew(new Set(imageFiles.map(file => file.id)));
  };

  const handleSelectCollectionForUse = async (collectionId: string) => {
    try {
      // We need to fetch the collection details to get the files
      // We can't rely on 'activeCollectionDetails' because we might click 'Select' from the list
      // So we fetch manually via query client or reuse the procedure if we had a way,
      // but simplest is to use the activeCollectionDetails if we are viewing it, 
      // or trigger a fetch.
      // For better UX, let's just load the images.
      
      // Actually, we need to resolve URLs for the client-side visualizer.
      // Let's fetch the collection items first.
      const data = await utils.client.asset.getCollection.query({ collectionId });
      
      if (!data || !data.items) {
        toast({ title: "Error", description: "Collection is empty or invalid", variant: "destructive" });
        return;
      }

      // Resolve URLs in parallel for faster loading
      const urlPromises = data.items
        .filter((item: any) => item.file)
        .map((item: any) => 
          getDownloadUrlMutation.mutateAsync({ fileId: item.file!.id })
            .then(res => res.downloadUrl)
            .catch(err => {
              console.error('Failed to get download URL for file:', item.file!.id, err);
              return null;
            })
        );
      
      const downloadUrls = await Promise.all(urlPromises);
      const urls = downloadUrls.filter((url): url is string => url !== null);

      onSelectCollection(urls, collectionId);
      toast({ title: "Collection Selected", description: `Loaded ${urls.length} images for slideshow.` });

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load collection images", variant: "destructive" });
    }
  };

  if (isCreating) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Collection Name</Label>
          <Input 
            value={newCollectionName} 
            onChange={e => setNewCollectionName(e.target.value)}
            placeholder="e.g., Summer Vibes"
            className="bg-stone-950 border-stone-800"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Select Images ({selectedFilesForNew.size})</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAll}
              className="uppercase tracking-wide text-[10px] px-2"
            >
              {selectedFilesForNew.size === imageFiles.length ? 'Clear' : 'Select All'}
            </Button>
          </div>
          <div className="h-48 border border-stone-800 rounded-md bg-stone-950 p-2 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              {imageFiles.length === 0 ? (
                <div className="col-span-3 text-center text-xs text-stone-500 py-4">
                  No images found in project. Upload some first!
                </div>
              ) : (
                imageFiles.map(file => (
                  <div 
                    key={file.id}
                    onClick={(event) => handleFileClick(event, file.id)}
                    className={cn(
                      "relative aspect-square cursor-pointer rounded-md overflow-hidden border-2 transition-all",
                      selectedFilesForNew.has(file.id) 
                        ? "border-green-500 opacity-100" 
                        : "border-transparent opacity-60 hover:opacity-80"
                    )}
                  >
                    {/* Thumbnail or Placeholder */}
                    <div className="absolute inset-0 bg-stone-800 flex items-center justify-center">
                       {file.thumbnail_url ? (
                         <img 
                           src={file.thumbnail_url} 
                           alt={file.file_name} 
                           className="w-full h-full object-cover"
                         />
                       ) : (
                         <ImageIcon className="w-6 h-6 text-stone-400" />
                       )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                        <p className="text-[10px] truncate text-white">{file.file_name}</p>
                    </div>
                    {selectedFilesForNew.has(file.id) && (
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1" 
            onClick={handleCreateCollection}
            disabled={createCollectionMutation.isLoading || selectedFilesForNew.size === 0}
          >
            {createCollectionMutation.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase text-stone-400">Collections</Label>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setIsCreating(true)}>
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
      ) : (
        <div className="h-48 overflow-y-auto pr-1">
          <div className="space-y-2 pr-2">
            {collections?.length === 0 ? (
              <div className="text-center text-xs text-stone-500 py-4">
                No collections yet. Create one to start your slideshow!
              </div>
            ) : (
              collections?.map((collection: AssetCollection) => (
                <Card 
                  key={collection.id}
                  className={cn(
                    "p-2 flex items-center justify-between cursor-pointer transition-colors hover:bg-stone-800 bg-stone-900 border-stone-800",
                    selectedCollectionId === collection.id ? "border-blue-500 bg-stone-800" : ""
                  )}
                  onClick={() => handleSelectCollectionForUse(collection.id)}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-stone-200">{collection.name}</span>
                    <span className="text-[10px] text-stone-500">
                       {/* We could show item count if we joined it, but basic list for now */}
                       {new Date(collection.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedCollectionId === collection.id && (
                    <Check className="w-4 h-4 text-blue-500" />
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

## File: /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/components/midi/three-visualizer.tsx
```typescript
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Settings, Maximize, Download } from 'lucide-react';
import { cn, debugLog } from '@/lib/utils';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
import '@/lib/visualizer/effects/EffectDefinitions';
import { MIDIData, VisualizationSettings } from '@/types/midi';
import { VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualEffect, AspectRatioConfig } from '@/types/visualizer';
import { PortalModal } from '@/components/ui/portal-modal';
import { EffectCarousel } from '@/components/ui/effect-carousel';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DroppableParameter } from '@/components/ui/droppable-parameter';
import { getAspectRatioConfig, calculateCanvasSize } from '@/lib/visualizer/aspect-ratios';
import { Layer } from '@/types/video-composition';

interface ThreeVisualizerProps {
  midiData: MIDIData;
  settings: VisualizationSettings;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSettingsChange: (settings: VisualizationSettings) => void;
  onFpsUpdate?: (fps: number) => void;
  className?: string;
  selectedEffects: Record<string, boolean>;
  onSelectedEffectsChange: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  aspectRatio?: string; // Changed from 'mobile' | 'youtube' to string for modularity
  // Modal and mapping props
  openEffectModals: Record<string, boolean>;
  onCloseEffectModal: (effectId: string) => void;
  mappings: Record<string, { featureId: string | null; modulationAmount: number }>;
  featureNames: Record<string, string>;
  onMapFeature: (parameterId: string, featureId: string) => void;
  onUnmapFeature: (parameterId: string) => void;
  onModulationAmountChange?: (parameterId: string, amount: number) => void;
  activeSliderValues: Record<string, number>;
  setActiveSliderValues: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  visualizerRef?: React.RefObject<VisualizerManager> | ((instance: VisualizerManager | null) => void);
  layers: Layer[];
  selectedLayerId?: string | null;
  onLayerSelect?: (layerId: string) => void;
  onLayerUpdate?: (layerId: string, updates: Partial<Layer>) => void;
}

export function ThreeVisualizer({
  midiData,
  settings,
  currentTime,
  isPlaying,
  onPlayPause,
  onSettingsChange,
  onFpsUpdate,
  className,
  selectedEffects,
  onSelectedEffectsChange,
  aspectRatio = 'mobile',
  openEffectModals,
  onCloseEffectModal,
  mappings,
  featureNames,
  onMapFeature,
  onUnmapFeature,
  onModulationAmountChange,
  activeSliderValues,
  setActiveSliderValues,
  visualizerRef: externalVisualizerRef,
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate
}: ThreeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalVisualizerRef = useRef<VisualizerManager | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 711 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const effectInstancesRef = useRef<{ [id: string]: VisualEffect }>({});
  
  // Get aspect ratio configuration
  const aspectRatioConfig = getAspectRatioConfig(aspectRatio);
  
  // Resize observer for container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Calculate canvas size when container size or aspect ratio changes
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      const newCanvasSize = calculateCanvasSize(
        containerSize.width,
        containerSize.height,
        aspectRatioConfig
      );
      setCanvasSize(newCanvasSize);
    }
  }, [containerSize, aspectRatioConfig]);
  
  // Update visualizer when canvas size changes
  useEffect(() => {
    if (internalVisualizerRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
      const visualizer = internalVisualizerRef.current;
      visualizer.handleViewportResize(canvasSize.width, canvasSize.height);
      debugLog.log('🎨 Canvas resized to:', canvasSize.width, 'x', canvasSize.height, 'aspect:', canvasSize.width / canvasSize.height);
    }
  }, [canvasSize]);

  // Initialize visualizer
  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    try {
      debugLog.log('🎭 Initializing ThreeVisualizer with aspect ratio:', aspectRatio);
    
    const config: VisualizerConfig = {
      canvas: {
          width: canvasSize.width,
          height: canvasSize.height,
        pixelRatio: Math.min(window.devicePixelRatio, 2)
      },
        aspectRatio: aspectRatioConfig,
      performance: {
          targetFPS: 60,
          enableBloom: true,
          enableShadows: false
      },
      midi: {
        velocitySensitivity: 1.0,
        noteTrailDuration: 2.0,
        trackColorMapping: {}
      }
    };

      internalVisualizerRef.current = new VisualizerManager(canvasRef.current, config);
      

      
      // Enable selected effects
      Object.entries(selectedEffects).forEach(([effectId, enabled]) => {
        if (enabled) {
          internalVisualizerRef.current?.enableEffect(effectId);
        } else {
          internalVisualizerRef.current?.disableEffect(effectId);
        }
      });

      setIsInitialized(true);
      debugLog.log('✅ ThreeVisualizer initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      debugLog.error('❌ Failed to initialize ThreeVisualizer:', err);
    }
  }, [canvasSize, aspectRatioConfig]);

  // FIX: Sync visualizer with timeline state (layers and currentTime)
  useEffect(() => {
    const vizManager = internalVisualizerRef.current;
    if (vizManager) {
      // This is the crucial link that was missing.
      // It continuously sends the latest timeline data to the visualizer.
      vizManager.updateTimelineState(layers, currentTime);
    }
  }, [layers, currentTime]);

  // Dynamic scene synchronization
  useEffect(() => {
    if (!internalVisualizerRef.current) return;
    const manager = internalVisualizerRef.current;
    debugLog.log('[ThreeVisualizer] layers prop:', layers, layers.map(l => l.type));
    const effectLayers = layers.filter(l => l.type === 'effect');
    debugLog.log('[ThreeVisualizer] effectLayers:', effectLayers);
    const currentIds = Object.keys(effectInstancesRef.current);
    const newIds = effectLayers.map(l => l.id);

    // Remove effects not in layers
    for (const id of currentIds) {
      if (!newIds.includes(id)) {
        manager.removeEffect(id);
        delete effectInstancesRef.current[id];
        debugLog.log(`[ThreeVisualizer] Removed effect instance: ${id}`);
      }
    }

    // Add new effects from layers using registry system
    for (const layer of effectLayers) {
      if (!effectInstancesRef.current[layer.id]) {
        debugLog.log('[ThreeVisualizer] Creating effect for layer:', layer);
        const effect = EffectRegistry.createEffect(layer.effectType || 'metaballs', layer.settings);
        if (effect) {
          effectInstancesRef.current[layer.id] = effect;
          // Add effect with the unique layer ID from the timeline
          manager.addEffect(layer.id, effect);
          debugLog.log(`[ThreeVisualizer] Added effect instance: ${layer.id} (${layer.effectType}) with effect ID: ${effect.id}`);
        } else {
          debugLog.warn(`[ThreeVisualizer] Failed to create effect: ${layer.effectType} for layer: ${layer.id}`);
        }
      }
    }

    // If no effect layers, remove all effects
    if (effectLayers.length === 0) {
      for (const id of Object.keys(effectInstancesRef.current)) {
        manager.removeEffect(id);
        delete effectInstancesRef.current[id];
        debugLog.log(`[ThreeVisualizer] Removed effect instance (all cleared): ${id}`);
      }
    }
  }, [layers, internalVisualizerRef.current]);

  // Expose visualizer ref to parent
  useEffect(() => {
    if (externalVisualizerRef && internalVisualizerRef.current) {
      if (typeof externalVisualizerRef === 'function') {
        externalVisualizerRef(internalVisualizerRef.current);
      } else if (externalVisualizerRef && 'current' in externalVisualizerRef) {
        (externalVisualizerRef as any).current = internalVisualizerRef.current;
      }
    }
  }, [externalVisualizerRef, isInitialized]);

  // Handle play/pause
  useEffect(() => {
    if (!internalVisualizerRef.current) return;

    if (isPlaying) {
      internalVisualizerRef.current.play();
    } else {
      internalVisualizerRef.current.pause();
    }
  }, [isPlaying]);

  // Update MIDI data
  useEffect(() => {
    if (!internalVisualizerRef.current || !midiData) return;
    
         const liveMidiData: LiveMIDIData = {
       currentTime,
       activeNotes: midiData.tracks.flatMap(track => 
         track.notes.filter(note => 
           note.start <= currentTime && note.start + note.duration >= currentTime
         ).map(note => ({
           note: note.pitch,
           velocity: note.velocity,
           track: track.id,
           startTime: note.start
         }))
       ),
       tempo: 120, // Default tempo
       totalNotes: midiData.tracks.reduce((sum, track) => sum + track.notes.length, 0),
       trackActivity: midiData.tracks.reduce((acc, track) => {
         acc[track.id] = track.notes.filter(note => 
           note.start <= currentTime && note.start + note.duration >= currentTime
         ).length > 0;
         return acc;
       }, {} as Record<string, boolean>)
     };
    
    internalVisualizerRef.current.updateMIDIData(liveMidiData);
  }, [midiData, currentTime]);

  // Update FPS
  useEffect(() => {
    if (!internalVisualizerRef.current || !onFpsUpdate) return;

    const interval = setInterval(() => {
      const fps = internalVisualizerRef.current?.getFPS() || 60;
      onFpsUpdate(fps);
    }, 1000);

    return () => clearInterval(interval);
  }, [onFpsUpdate]);

 

  // Handle effect parameter changes
  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    if (!internalVisualizerRef.current) return;
    
    internalVisualizerRef.current.updateEffectParameter(effectId, paramName, value);
    
    // Update active slider values
      const paramKey = `${effectId}-${paramName}`;
    setActiveSliderValues(prev => ({ ...prev, [paramKey]: value }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (internalVisualizerRef.current) {
        internalVisualizerRef.current.dispose();
      }
    };
  }, []);

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  // Helper: is the project truly empty (all layers are empty image lanes)?
  const allLayersEmpty = layers.length === 0 || layers.every(l => l.type === 'image' && !l.src);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center",
        className
      )}
      style={{
        minHeight: '200px',
        aspectRatio: `${aspectRatioConfig.width}/${aspectRatioConfig.height}`
      }}
    >
      {/* Canvas container with proper sizing */}
      <div 
        className="relative bg-stone-900 rounded-lg overflow-hidden shadow-lg"
        style={{
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          maxWidth: '100%',
          maxHeight: '100%',
          pointerEvents: 'auto', // Ensure overlays receive pointer events
          zIndex: 10 // Ensure overlays are above the canvas
        }}
        >
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-full h-full"
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            pointerEvents: 'none', // Only the canvas ignores pointer events
            zIndex: 1
          }}
        />
        {/* Show prompt if all layers are empty */}
        {allLayersEmpty && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-auto">
            <span className="text-white/60 text-sm font-mono text-center select-none">
              Add your first layer
            </span>
          </div>
        )}
        {/* Modals are now rendered within the full-width edit canvas */}
        {Object.entries(openEffectModals).map(([effectId, isOpen], index) => {
          if (!isOpen) return null;
          // Use getEffectByType to find the first instance of this effect type
          const effectInstance = internalVisualizerRef.current?.getEffectByType(effectId);
          if (!effectInstance) return null;
          const sortedParams = Object.entries(effectInstance.parameters).sort(([, a], [, b]) => {
            if (typeof a === 'boolean' && typeof b !== 'boolean') return -1;
            if (typeof a !== 'boolean' && typeof b === 'boolean') return 1;
            return 0;
          });
          const initialPos = {
            x: 100 + (index * 50),
            y: 100 + (index * 50)
          };
          return (
            <PortalModal
              key={effectId}
              title={effectInstance.name.replace(' Effect', '')}
              isOpen={isOpen}
              onClose={() => onCloseEffectModal(effectId)}
              initialPosition={initialPos}
              bounds="#editor-bounds"
            >
              <div className="space-y-4">
                <div className="text-sm text-white/80 mb-4">{effectInstance.description}</div>
                {sortedParams.length === 0 ? (
                  <div className="text-white/60 text-xs font-mono text-center py-4">No configurable parameters.</div>
                ) : (
                  sortedParams.map(([paramName, value]) => {
                    if (typeof value === 'boolean') {
                      return (
                        <div key={paramName} className="flex items-center justify-between">
                          <Label className="text-white/80 text-xs font-mono">{paramName}</Label>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => handleParameterChange(effectId, paramName, checked)}
                          />
                        </div>
                      );
                    }
                    if (typeof value === 'number') {
                      const paramKey = `${effectId}-${paramName}`;
                      const mapping = mappings[paramKey];
                      const mappedFeatureId = mapping?.featureId || null;
                      const mappedFeatureName = mappedFeatureId ? featureNames[mappedFeatureId] : undefined;
                      const modulationAmount = mapping?.modulationAmount || 1.0;
                      return (
                        <DroppableParameter
                          key={paramKey}
                          parameterId={paramKey}
                          label={paramName}
                          mappedFeatureId={mappedFeatureId}
                          mappedFeatureName={mappedFeatureName}
                          modulationAmount={modulationAmount}
                          onFeatureDrop={onMapFeature}
                          onFeatureUnmap={onUnmapFeature}
                          onModulationAmountChange={onModulationAmountChange}
                          className="mb-2"
                          dropZoneStyle="inlayed"
                          showTagOnHover
                        >
                          <Slider
                            value={[activeSliderValues[paramKey] ?? value]}
                            onValueChange={([val]) => {
                              setActiveSliderValues(prev => ({ ...prev, [paramKey]: val }));
                              handleParameterChange(effectId, paramName, val);
                            }}
                            min={0}
                            max={getSliderMax(paramName)}
                            step={getSliderStep(paramName)}
                            className="w-full"
                          />
                        </DroppableParameter>
                      );
                    }
                    if ((paramName === 'highlightColor' || paramName === 'particleColor') && Array.isArray(value)) {
                      const displayName = paramName === 'highlightColor' ? 'Highlight Color' : 'Particle Color';
                      return (
                        <div key={paramName} className="space-y-2">
                          <Label className="text-white/90 text-sm font-medium flex items-center justify-between">
                            {displayName}
                            <span className="ml-2 w-6 h-6 rounded-full border border-white/40 inline-block" style={{ background: `rgb(${value.map((v) => Math.round(v * 255)).join(',')})` }} />
                          </Label>
                          <input
                            type="color"
                            value={`#${value.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`}
                            onChange={e => {
                              const hex = e.target.value;
                              const rgb = [
                                parseInt(hex.slice(1, 3), 16) / 255,
                                parseInt(hex.slice(3, 5), 16) / 255,
                                parseInt(hex.slice(5, 7), 16) / 255
                              ];
                              handleParameterChange(effectId, paramName, rgb);
                            }}
                            className="w-12 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                          />
                        </div>
                      );
                    }
                    return null;
                  })
                )}
                <div className="pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-white/80 text-xs font-mono">Effect Enabled</Label>
                    <Switch 
                      checked={selectedEffects[effectId]}
                      onCheckedChange={(checked) => {
                        onSelectedEffectsChange(prev => ({
                          ...prev,
                          [effectId]: checked
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </PortalModal>
          );
        })}
      </div>
    </div>
  );
}

// Custom hook to force re-render
const useForceUpdate = () => {
  const [, setValue] = useState(0);
  return () => setValue(value => value + 1); 
};

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 z-50">
      <Card className="bg-red-800/80 text-white p-4 max-w-md">
      <h3 className="text-lg font-semibold">An Error Occurred</h3>
      <p className="text-sm">{message}</p>
      <Button onClick={() => window.location.reload()} variant="secondary" className="mt-4">
        Refresh Page
      </Button>
      </Card>
    </div>
  );
}

function MainContent({ children, onMouseEnter, onMouseLeave }: { children: React.ReactNode, onMouseEnter: () => void, onMouseLeave: () => void }) {
  return (
    <div 
      className="relative aspect-[9/16] max-w-sm mx-auto bg-stone-900 rounded-lg overflow-hidden shadow-2xl" // removed border
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

function Canvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
}

// Utility: getSliderMax for effect parameter sliders
function getSliderMax(paramName: string) {
  switch (paramName) {
    case 'animationSpeed': return 5.0;
    case 'noiseIntensity': return 2.0;
    case 'glowIntensity': return 2.0;
    case 'strength': return 2.0;
    case 'radius': return 2.0;
    case 'threshold': return 1.0;
    case 'particleLifetime': return 10;
    case 'particleSize': return 50;
    case 'glowSoftness': return 5;
    case 'particleSpawning': return 1.0;
    case 'spawnThreshold': return 1.0;
    case 'audioSpawnThreshold': return 1.0;
    case 'audioSpawnRate': return 1.0;
    case 'audioSpawnCooldown': return 1.0;
    case 'audioParticleSize': return 50;
    case 'audioSpawnIntensity': return 2.0;
    case 'connectionDistance': return 5.0;
    case 'maxParticles': return 200;
    case 'connectionOpacity': return 1.0;
    default: return 1;
  }
}

// Utility: getSliderStep for effect parameter sliders
function getSliderStep(paramName: string) {
  switch (paramName) {
    case 'animationSpeed': return 0.05;
    case 'noiseIntensity': return 0.1;
    case 'glowIntensity': return 0.1;
    case 'strength': return 0.1;
    case 'radius': return 0.05;
    case 'threshold': return 0.01;
    case 'glowSoftness': return 0.1;
    case 'particleSpawning': return 0.01;
    case 'spawnThreshold': return 0.01;
    case 'audioSpawnThreshold': return 0.01;
    case 'audioSpawnRate': return 0.01;
    case 'audioSpawnCooldown': return 0.01;
    case 'audioParticleSize': return 0.1;
    case 'audioSpawnIntensity': return 0.01;
    default: return 0.01;
  }
}
```

## File: /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/components/ui/portal-modal.tsx
```typescript
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Draggable from 'react-draggable';
import { cn } from '@/lib/utils';
import { debugLog } from '@/lib/utils';

interface PortalModalProps {
  children: React.ReactNode;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  className?: string;
  bounds?: string;
  portalContainerId?: string;
  modalWidth?: number;
}

export function PortalModal({
  children,
  title,
  isOpen,
  onClose,
  initialPosition = { x: 0, y: 0 },
  className,
  bounds = '#editor-bounds',
  portalContainerId = 'modal-portal-root',
  modalWidth = 288, // default width in px (was Tailwind w-72)
}: PortalModalProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [boundingBox, setBoundingBox] = useState<{ left: number; top: number; right: number; bottom: number } | null>(null);

  // Calculate and update bounds
  const updateBounds = useCallback(() => {
    if (!bounds) return;
    
    const boundsEl = document.querySelector(bounds);
    if (!boundsEl) return;

    const boundsRect = boundsEl.getBoundingClientRect();
    const modalHeight = nodeRef.current?.offsetHeight || 400; // Fallback height

    setBoundingBox({
      left: Math.floor(boundsRect.left),
      top: Math.floor(boundsRect.top),
      right: Math.floor(boundsRect.right - modalWidth),
      bottom: Math.floor(boundsRect.bottom - modalHeight)
    });
  }, [bounds, modalWidth]);

  // Set up bounds calculation and window resize handler
  useEffect(() => {
    if (!isOpen) return;

    // Initial bounds calculation
    updateBounds();

    // Recalculate on resize
    window.addEventListener('resize', updateBounds);
    
    // Set up mutation observer to watch for DOM changes that might affect bounds
    const observer = new MutationObserver(updateBounds);
    const boundsEl = document.querySelector(bounds || '');
    if (boundsEl) {
      observer.observe(boundsEl, { 
        attributes: true,
        childList: true,
        subtree: true 
      });
    }

    return () => {
      window.removeEventListener('resize', updateBounds);
      observer.disconnect();
    };
  }, [isOpen, bounds, updateBounds]);

  // Create portal container
  useEffect(() => {
    let container = document.getElementById(portalContainerId);
    if (!container) {
      container = document.createElement('div');
      container.id = portalContainerId;
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '50';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    return () => {
      // Only cleanup if this is the last modal being closed
      if (container && container.childNodes.length === 0) {
        // Use a small delay to ensure all cleanup is complete
        setTimeout(() => {
          if (container && container.childNodes.length === 0 && container.parentNode) {
            try {
        document.body.removeChild(container);
            } catch (error) {
              // Container might have already been removed, ignore the error
              debugLog.warn('Portal container cleanup error:', error);
            }
          }
        }, 100);
      }
    };
  }, [portalContainerId]);

  if (!isOpen || !portalContainer) return null;

  const modalContent = (
    <div style={{ pointerEvents: 'auto' }}>
      <Draggable
        nodeRef={nodeRef}
        handle=".drag-handle"
        defaultPosition={initialPosition}
        bounds={boundingBox || undefined}
        onStart={updateBounds}
        onDrag={updateBounds}
      >
        <div 
          ref={nodeRef} 
          className={cn(
            "absolute top-0 left-0 rounded-lg shadow-2xl",
            "bg-white/10 backdrop-blur-xl border border-white/20",
            className
          )}
          style={{
            width: modalWidth,
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))'
          }}
        >
          {/* Title Bar */}
          <div className="drag-handle cursor-move bg-white p-1 rounded-t-md border-b border-black/30 flex items-center gap-1.5 h-7">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-4 h-4 border border-black/80 flex-shrink-0 bg-white hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center group relative"
              aria-label="Close"
            >
              <div className="absolute w-full h-0.5 bg-black transform rotate-45 scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
              <div className="absolute w-full h-0.5 bg-black transform -rotate-45 scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
            </button>

            {/* Title Text and Lines */}
            <div className="flex-grow flex items-center justify-center gap-1.5 overflow-hidden">
              <div className="space-y-0.5 flex-grow">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-px bg-black"></div>
                ))}
              </div>
              <span className="flex-shrink-0 bg-white px-1 text-xs font-mono font-bold text-black">{title}</span>
              <div className="space-y-0.5 flex-grow">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-px bg-black"></div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="p-4 rounded-b-md bg-transparent">
            {children}
          </div>
        </div>
      </Draggable>
    </div>
  );

  return createPortal(modalContent, portalContainer);
}
```

## File: /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/components/video-composition/UnifiedTimeline.tsx
```typescript
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { DndContext, DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, Plus, Video, Image, Zap, Music, FileAudio, FileMusic, Settings, Trash2, Eye, EyeOff, Palette } from 'lucide-react';
import { useProjectSettingsStore } from '@/stores/projectSettingsStore';
import { cn } from '@/lib/utils';
import type { Layer } from '@/types/video-composition';
import { useTimelineStore } from '@/stores/timelineStore';
import { StemWaveform, WaveformData } from '@/components/stem-visualization/stem-waveform';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { HudOverlayProvider, HudOverlayConfig, useHudOverlayContext } from '@/components/hud/HudOverlayManager';
import { debugLog } from '@/lib/utils';

// New, more constrained max zoom level
const MAX_ZOOM_LEVEL = 3; // 300%

// Converts a linear slider value (0-100) to a logarithmic zoom level
const sliderToZoom = (sliderValue: number, minZoom: number): number => {
  const minp = 0;
  const maxp = 100;
  // minv is now dynamic based on the calculated minimum zoom to fit the timeline
  const minv = Math.log(minZoom);
  const maxv = Math.log(MAX_ZOOM_LEVEL);
  const scale = (maxv - minv) / (maxp - minp);
  return Math.exp(minv + scale * (sliderValue - minp));
};

// Converts a logarithmic zoom level back to a linear slider value (0-100)
const zoomToSlider = (zoomValue: number, minZoom: number): number => {
  const minp = 0;
  const maxp = 100;
  const minv = Math.log(minZoom);
  const maxv = Math.log(MAX_ZOOM_LEVEL);
  const scale = (maxv - minv) / (maxp - minp);
  // Ensure we don't take log of zero or negative
  const safeZoom = Math.max(minZoom, zoomValue);
  return (Math.log(safeZoom) - minv) / scale + minp;
};

// Consistent row sizing across headers and lanes
const ROW_HEIGHT = 32; // h-8
const HEADER_ROW_HEIGHT = 32; // header rows height

interface EffectClip {
  id: string;
  effectId: string;
  name: string;
  startTime: number;
  endTime: number;
  parameters: Record<string, any>;
}

interface Stem {
  id: string;
  file_name: string;
  is_master?: boolean;
  stem_type?: string;
  analysis_status?: string;
}

interface UnifiedTimelineProps {
  // Audio/MIDI stems (external to timeline state)
  stems?: Stem[];
  masterStemId?: string | null;
  onStemSelect?: (stemId: string) => void;
  activeTrackId?: string | null;
  soloedStems?: Set<string>;
  onToggleSolo?: (stemId: string) => void;
  analysisProgress?: Record<string, { progress: number; message: string } | null>;
  cachedAnalysis?: any[]; // Using any for now to avoid complex type imports
  stemLoadingState?: boolean;
  stemError?: string | null;

  // Optional external seek override (store used by default)
  onSeek?: (time: number) => void;
  
  // Collapsible sections
  className?: string;
}

// Header for composition layers in the fixed left column
const CompositionLayerHeader: React.FC<{ layer: Layer }> = ({ layer }) => {
  const { selectLayer, deleteLayer, selectedLayerId } = useTimelineStore();
  const isEffect = layer.type === 'effect';
  const isEmpty = !isEffect && !layer.src;
  const isSelected = selectedLayerId === layer.id;

  return (
    <div
      className={cn(
        'flex items-center px-2 border-b border-stone-700/50',
        isSelected ? 'bg-stone-700/50' : 'bg-transparent'
      )}
      style={{ height: `${ROW_HEIGHT}px` }}
      onClick={() => selectLayer(layer.id)}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isEmpty ? (
          <Plus className="h-4 w-4 text-stone-500" />
        ) : layer.type === 'video' ? (
          <Video className="h-4 w-4 text-emerald-400" />
        ) : layer.type === 'image' ? (
          <Image className="h-4 w-4 text-blue-400" />
        ) : (
          <Zap className="h-4 w-4 text-purple-400" />
        )}
        <span className="text-sm font-medium text-stone-300 truncate">{layer.name}</span>
      </div>
      {layer.isDeletable !== false && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-stone-400 hover:text-red-400"
          onClick={(e) => {
            e.stopPropagation();
            deleteLayer(layer.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

// Simple header row for stems in the fixed left column
const StemTrackHeader: React.FC<{
  id: string;
  name: string;
  isActive: boolean;
  isSoloed: boolean;
  onClick: () => void;
  onToggleSolo?: () => void;
  isMaster: boolean;
}> = ({ id, name, isActive, isSoloed, onClick, onToggleSolo, isMaster }) => {
  return (
    <div
      className={cn(
        'flex items-center px-2 border-b border-stone-700/50',
        isActive ? 'bg-stone-700/50' : 'bg-transparent'
      )}
      style={{ height: `${ROW_HEIGHT}px` }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Music className="h-4 w-4 text-stone-400" />
        <span className="text-sm font-medium text-stone-300 truncate">
          {name} {isMaster ? '(Master)' : ''}
        </span>
      </div>
      {onToggleSolo && (
        <button
          className={cn(
            'text-[10px] px-2 py-0.5 rounded border',
            isSoloed
              ? 'text-yellow-300 border-yellow-400'
              : 'text-stone-400 border-stone-600'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSolo();
          }}
        >
          SOLO
        </button>
      )}
    </div>
  );
};

interface TimelineSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  itemCount: number;
  itemType: string;
}

interface StemTrackProps {
  id: string;
  name: string;
  waveformData: any | null; // Can be from cachedAnalysis or real-time
  isLoading: boolean;
  isActive: boolean;
  onClick: () => void;
  isSoloed: boolean;
  onToggleSolo: () => void;
  isMaster: boolean;
  onSeek?: (time: number) => void;
  currentTime: number;
  stemType: string;
  isPlaying: boolean;
  analysisStatus?: string;
  analysisProgress?: { progress: number; message: string } | null;
}

const TimelineSection: React.FC<TimelineSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  itemCount,
  itemType
}) => {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-1 px-2 bg-black border-b border-stone-700 text-xs font-mono font-bold text-white uppercase tracking-widest hover:bg-stone-900 transition-colors"
        style={{ borderRadius: 0 }}
      >
        <div className="flex items-center gap-2">{icon}<span>{title}</span></div>
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-normal">{itemCount} {itemType}</span>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-stone-400" />
          ) : (
            <ChevronDown className="h-3 w-3 text-stone-400" />
          )}
        </div>
      </button>
      {isExpanded && <div className="pl-2">{children}</div>}
    </div>
  );
};

// Droppable Lane Component
const DroppableLane: React.FC<{
  layer: Layer;
  index: number;
  startX: number;
  width: number;
  isActive: boolean;
  isSelected: boolean;
  isEmptyLane: boolean;
  onLayerSelect: (layerId: string) => void;
  onLayerDelete: (layerId: string) => void;
  onAssetDrop: (item: any, targetLayerId: string) => void;
  currentTime: number;
  duration: number;
  yOffset: number;
}> = ({
  layer,
  index,
  startX,
  width,
  isActive,
  isSelected,
  isEmptyLane,
  onLayerSelect,
  onLayerDelete,
  onAssetDrop,
  currentTime,
  duration,
  yOffset
}) => {
  const isEffect = layer.type === 'effect';
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['VIDEO_FILE', 'IMAGE_FILE', 'EFFECT_CARD'],
    drop: (item: any) => {
      if (isEmptyLane) {
        onAssetDrop(item, layer.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const dropRef = useCallback((node: HTMLDivElement | null) => {
    if (isEmptyLane) {
      drop(node);
    }
  }, [drop, isEmptyLane]);

  return (
    <div
      ref={dropRef}
      className={cn(
        "absolute border border-stone-700 cursor-pointer flex items-center px-2 transition-all rounded-md",
        isEmptyLane
          ? isOver && canDrop
            ? "bg-emerald-950 border-emerald-400 text-emerald-400"
            : "bg-stone-800/50 border-dashed border-stone-600 text-stone-400 hover:bg-stone-700/50 hover:border-stone-500"
          : isSelected
            ? "bg-white text-black border-white"
            : isActive
              ? isEffect 
                ? "bg-purple-400 text-black border-purple-500"
                : "bg-emerald-500 text-black border-emerald-400"
              : "bg-stone-700 text-stone-100 border-stone-700 hover:bg-stone-600 hover:text-white hover:border-white"
      )}
      style={{ 
        left: `${startX}px`, 
        width: `${width}px`, 
        minWidth: '60px',
        top: `${yOffset + index * ROW_HEIGHT}px`,
        height: `${ROW_HEIGHT}px`
      }}
      onClick={e => { 
        e.stopPropagation(); 
        onLayerSelect(layer.id);
      }}
      onDoubleClick={e => { 
        e.stopPropagation(); 
        onLayerSelect(layer.id);
      }}
    >
      <div className="flex items-center gap-1">
        {isEmptyLane ? (
          <>
            <Plus className="h-3 w-3" />
            <span className="truncate font-medium">
              {isOver && canDrop ? "Drop here" : "Empty Lane"}
            </span>
          </>
        ) : (
          <>
            {layer.type === 'video' ? <Video className="h-3 w-3" /> : 
             layer.type === 'image' ? <Image className="h-3 w-3" /> : 
             <Zap className="h-3 w-3" />}
            <span className="truncate font-medium">{layer.name}</span>
          </>
        )}
      </div>
      {!isEmptyLane && (
        <span className="ml-2 text-[10px] text-stone-400">
          {(layer.startTime || 0).toFixed(1)}s - {(layer.endTime || duration).toFixed(1)}s
        </span>
      )}
      <button
        className="ml-auto px-1 text-stone-400 hover:text-red-500 border-none bg-transparent focus:outline-none text-xs rounded"
        onClick={e => { 
          e.stopPropagation(); 
          onLayerDelete(layer.id);
        }}
        aria-label="Delete layer"
      >×</button>
    </div>
  );
};

// Waveform lane for the right column, sized to ROW_HEIGHT
type StemTrackLaneProps = {
  waveformData: any | null;
  isLoading: boolean;
  analysisProgress?: { progress: number; message: string } | null;
  duration: number;
  currentTime: number;
  onSeek?: (time: number) => void;
  isPlaying: boolean;
};

const StemTrackLane: React.FC<StemTrackLaneProps> = ({
  waveformData,
  isLoading,
  analysisProgress,
  duration,
  currentTime,
  onSeek,
  isPlaying
}) => {
  const zoom = useTimelineStore(state => state.zoom);
  return (
    <div className={cn('flex items-center w-full border-b border-stone-700/50')} style={{ height: `${ROW_HEIGHT}px` }}>
      <div className="flex-1 min-w-0 px-0 overflow-hidden h-full">
        {analysisProgress ? (
          <div className="w-full h-full flex flex-col justify-center">
            <div className="w-full bg-stone-700 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${analysisProgress.progress * 100}%` }}></div>
            </div>
            <p className="text-[10px] text-stone-400 truncate mt-1">{analysisProgress.message}</p>
          </div>
        ) : (
          <div className="w-full h-full">
            <StemWaveform
              waveformData={waveformData}
              duration={duration}
              currentTime={currentTime}
              onSeek={onSeek}
              isPlaying={isPlaying}
              isLoading={isLoading}
              zoom={zoom}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// LayerClip component for draggable timeline clips and droppable empty lanes
const LayerClip: React.FC<{
  layer: Layer;
  index: number;
  onAssetDrop: (item: any, targetLayerId: string) => void;
  activeDragLayerId: string | null;
  postDropTransform?: { id: string; x: number; y: number } | null;
  destinationAnimateId?: string | null;
}> = ({ layer, index, onAssetDrop, activeDragLayerId, postDropTransform, destinationAnimateId }) => {
  const { zoom, selectLayer, selectedLayerId, updateLayer } = useTimelineStore();

  const isSelected = selectedLayerId === layer.id;
  const isEffect = layer.type === 'effect';
  const isEmpty = !isEffect && !layer.src;
  const isSlideshow = layer.effectType === 'imageSlideshow';

  // --- Draggable Hooks ---
  // 1. For the main body of the clip
  const { attributes, listeners, setNodeRef: setBodyRef, transform } = useDraggable({
    id: layer.id,
    disabled: isEmpty,
  });

  // 2. For the left resize handle
  const { setNodeRef: setLeftHandleRef, listeners: leftHandleListeners } = useDraggable({
    id: `${layer.id}::handle-left`,
    disabled: isEmpty,
  });

  // 3. For the right resize handle
  const { setNodeRef: setRightHandleRef, listeners: rightHandleListeners } = useDraggable({
    id: `${layer.id}::handle-right`,
    disabled: isEmpty,
  });

  // --- react-dnd hook for dropping new assets onto empty lanes OR slideshow layers ---
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['VIDEO_FILE', 'IMAGE_FILE', 'EFFECT_CARD', 'feature', 'AUDIO_STEM'],
    drop: (item: any) => { 
      if (isEmpty) {
        onAssetDrop(item, layer.id);
      } else if (isSlideshow) {
        if (item.type === 'IMAGE_FILE') {
           // Append image to slideshow
           const currentImages = layer.settings?.images || [];
           // Avoid duplicates if desired, or allow
           if (!currentImages.includes(item.src)) {
             updateLayer(layer.id, {
               settings: {
                 ...layer.settings,
                 images: [...currentImages, item.src]
               }
             });
             debugLog.log('Added image to slideshow:', item.src);
           }
        } else if (item.type === 'feature' || item.type === 'AUDIO_STEM') {
           // Link trigger
           const sourceId = item.id;
           // If it's a stem, we might default to a feature like 'impact' or volume
           // If it's a feature, it has a specific type.
           const triggerName = item.stemType || item.name || 'impact'; // Fallback
           
           updateLayer(layer.id, {
             settings: {
               ...layer.settings,
               triggerSourceId: sourceId,
               triggerSourceName: triggerName
               // We rely on VisualizerManager to map this sourceId to triggerValue
             }
           });
           debugLog.log('Linked trigger to slideshow:', sourceId, triggerName);
        }
      }
    },
    canDrop: (item: any) => {
      if (isEmpty) return true;
      if (isSlideshow) {
        return item.type === 'IMAGE_FILE' || item.type === 'feature' || item.type === 'AUDIO_STEM';
      }
      return false;
    },
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  });

  // Combine refs for dnd-kit dragging and react-dnd dropping
  const combinedRef = (node: HTMLDivElement | null) => {
    setBodyRef(node);
    drop(node as any);
  };

  const PIXELS_PER_SECOND = 100;
  const timeToX = (time: number) => time * PIXELS_PER_SECOND * zoom;

  // Calculate snapped vertical position during drag
  let verticalOffset = 0;
  if (transform) {
    // Snap to nearest layer row
    const rowsMoved = Math.round(transform.y / ROW_HEIGHT);
    verticalOffset = rowsMoved * ROW_HEIGHT;
  }

  const isDraggingThis = activeDragLayerId === layer.id;
  const shouldDisableTransition = isDraggingThis || isEmpty || (postDropTransform && postDropTransform.id === layer.id);
  const shouldAnimateDestination = destinationAnimateId === layer.id;

  // Horizontal live preview is driven by startTime/endTime updates; avoid double-applying X.
  // Only apply vertical translation for snapping feedback during drag.
  const effectiveTransform = transform
    ? `translate3d(0px, ${verticalOffset}px, 0)`
    : (postDropTransform && postDropTransform.id === layer.id
        ? `translate3d(0px, ${postDropTransform.y}px, 0)`
        : undefined);

  const style = {
    // Apply both horizontal (free) and vertical (snapped) transforms
    transform: effectiveTransform,
    left: `${timeToX(layer.startTime)}px`,
    width: `${timeToX(layer.endTime - layer.startTime)}px`,
    top: `${HEADER_ROW_HEIGHT + (index * ROW_HEIGHT)}px`,
    height: `${ROW_HEIGHT - 4}px`,
    marginTop: '2px',
    // Enable smooth vertical animation for non-dragging clips (e.g., the target layer clip)
    // but disable it for the actively dragged clip to avoid snap-back.
    transition: shouldDisableTransition ? 'none' : (shouldAnimateDestination ? 'top 0.2s ease-out' : 'none'),
    willChange: shouldDisableTransition ? undefined : 'top',
  } as React.CSSProperties;

  return (
    <div
      ref={combinedRef}
      style={style}
      // The main body listeners are only applied when not empty
      {...(!isEmpty ? listeners : {})}
      {...(!isEmpty ? attributes : {})}
      onMouseDown={() => selectLayer(layer.id)}
      className={cn(
        "absolute flex items-center justify-center rounded border z-10 group",
        isEmpty
          ? isOver && canDrop
            ? "border-emerald-400 bg-emerald-950/80 ring-2 ring-emerald-500 z-20"
            : "border-dashed border-stone-600 bg-stone-800/50 text-stone-400"
          : "cursor-grab active:cursor-grabbing",
        !isEmpty && (isSelected
          ? "bg-white border-white text-black z-20 shadow-lg"
          : "bg-stone-700 border-stone-600 text-stone-200 hover:border-stone-400"),
        transform && verticalOffset !== 0 && "ring-2 ring-blue-400 shadow-2xl" // Visual feedback during vertical drag
      )}
    >
      <span className="text-xs font-medium truncate select-none">
        {isEmpty ? (isOver && canDrop ? 'Drop to Add' : '+ Drop Asset Here') : layer.name}
      </span>
      
      {/* --- RESIZE HANDLES (only visible on selected, non-empty clips) --- */}
      {!isEmpty && isSelected && (
        <>
          <div
            ref={setLeftHandleRef}
            {...leftHandleListeners}
            className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-white/30 rounded-l-sm z-30"
            onClick={(e) => e.stopPropagation()}
          />
          <div
            ref={setRightHandleRef}
            {...rightHandleListeners}
            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-white/30 rounded-r-sm z-30"
            onClick={(e) => e.stopPropagation()}
          />
        </>
      )}
    </div>
  );
};

// Overlay Lane Card
const OverlayCard: React.FC<{
  overlay: any;
  index: number;
  moveOverlay: (from: number, to: number) => void;
  onOpenModal: () => void;
  onDelete: () => void;
}> = ({ overlay, index, moveOverlay, onOpenModal, onDelete }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: 'HUD_OVERLAY_CARD',
    item: { index },
    collect: monitor => ({ isDragging: monitor.isDragging() })
  });
  const [, drop] = useDrop({
    accept: 'HUD_OVERLAY_CARD',
    hover: (item: any) => {
      if (item.index !== index) {
        moveOverlay(item.index, index);
        item.index = index;
      }
    }
  });
  drag(drop(ref));
  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.5 : 1,
        width: 56,
        height: 56,
        margin: 4,
        background: '#111',
        border: '2px solid #00ffff',
        borderRadius: 8,
        boxShadow: '0 0 8px #00ffff88',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        position: 'relative',
      }}
      onDoubleClick={onOpenModal}
      title={overlay.type}
    >
      <span style={{ color: '#00ffff', fontWeight: 700, fontSize: 12, textShadow: '0 0 4px #00ffff' }}>{overlay.type}</span>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{ position: 'absolute', top: 2, right: 2, background: 'none', border: 'none', color: '#00ffff', fontWeight: 900, fontSize: 14, cursor: 'pointer', padding: 0 }}
        title="Remove overlay"
      >×</button>
    </div>
  );
};

// Overlay Lane
const OverlayLane: React.FC = () => {
  const { overlays, moveOverlay, openOverlayModal, removeOverlay, addOverlay } = useHudOverlayContext();
  const [, drop] = useDrop({
    accept: ['EFFECT_CARD'],
    drop: (item: any) => {
      if (item.type === 'EFFECT_CARD' && item.category === 'Overlays') {
        addOverlay(item.id); // id should match overlay type
      }
    },
  });
  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>} style={{
      display: 'flex',
      alignItems: 'center',
      minHeight: 72,
      background: 'linear-gradient(90deg, #0ff2, #222 60%)',
      borderBottom: '2px solid #00ffff',
      position: 'relative',
      padding: '0 8px',
      marginBottom: 8,
    }}>
      <div style={{ marginRight: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#00ffff', fontWeight: 700, fontSize: 13 }}>HUD Overlays</span>
        <span title="Overlays are always visible. Drag up/down to reorder stacking. Drag from sidebar to add.">
          <svg width="16" height="16" style={{ verticalAlign: 'middle' }}><rect x="2" y="2" width="12" height="12" rx="3" fill="#00ffff33" stroke="#00ffff" strokeWidth="2" /></svg>
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 4 }}>
        {overlays.map((overlay, i) => (
          <OverlayCard
            key={overlay.id}
            overlay={overlay}
            index={i}
            moveOverlay={moveOverlay}
            onOpenModal={() => openOverlayModal(overlay.id)}
            onDelete={() => removeOverlay(overlay.id)}
          />
        ))}
      </div>
    </div>
  );
};

export const UnifiedTimeline: React.FC<UnifiedTimelineProps> = ({
  stems = [],
  masterStemId = null,
  onStemSelect,
  activeTrackId = null,
  soloedStems = new Set(),
  onToggleSolo,
  analysisProgress = {},
  cachedAnalysis = [],
  stemLoadingState = false,
  stemError = null,
  onSeek,
  className
}) => {
  const {
    layers,
    currentTime,
    duration,
    isPlaying,
    selectedLayerId,
    addLayer,
    updateLayer,
    deleteLayer,
    selectLayer,
    setCurrentTime,
    zoom,
    setZoom,
    swapLayers,
  } = useTimelineStore();
  const { backgroundColor, isBackgroundVisible, setBackgroundColor, toggleBackgroundVisibility } = useProjectSettingsStore();
  const activeDragLayerRef = useRef<Layer | null>(null); // FIX: Add ref to store layer state on drag start
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  // Keep the final drag transform for one frame after drop to prevent snap-back
  const [postDropTransform, setPostDropTransform] = useState<{ id: string; x: number; y: number } | null>(null);
  // Identify which destination layer's clip should animate into place after swap
  const [destinationAnimateId, setDestinationAnimateId] = useState<string | null>(null);
  // Live layer updates during drag (isolated from global store)
  const [liveLayerUpdate, setLiveLayerUpdate] = useState<Layer | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const timelineLanesRef = useRef<HTMLDivElement | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    composition: true, // Combined visual and effects layers
    audio: true // Changed from false to true to ensure audio section is visible by default
  });

  // Derive BPM from cached analysis (prefer master track)
  const bpm: number | null = React.useMemo(() => {
    if (!cachedAnalysis || cachedAnalysis.length === 0) return null;
    const master = masterStemId
      ? (cachedAnalysis as any[]).find(a => a.fileMetadataId === masterStemId)
      : null;
    const candidate = (master ?? (cachedAnalysis as any[])[0]) as any;
    const val = candidate?.bpm ?? candidate?.metadata?.bpm ?? candidate?.analysisData?.bpm;
    return typeof val === 'number' && isFinite(val) ? val : null;
  }, [cachedAnalysis, masterStemId]);

  // Compute grid lines for the full duration to avoid truncation on zoom/scroll
  const gridLines = React.useMemo(() => {
    const lines: Array<{ time: number; type: 'bar' | 'beat' | 'sixteenth'; x: number }> = [];
    if (!bpm || bpm <= 0) return lines;

    const PPS = 100;
    const secondsPerBeat = 60 / bpm;
    const pixelsPerBeat = secondsPerBeat * PPS * zoom;

    let stepType: 'bar' | 'beat' | 'sixteenth';
    let subdivision = 1; // beats per division
    if (pixelsPerBeat > 80) { stepType = 'sixteenth'; subdivision = 0.25; }
    else if (pixelsPerBeat > 20) { stepType = 'beat'; subdivision = 1; }
    else { stepType = 'bar'; subdivision = 4; }

    const secondsPerStep = secondsPerBeat * subdivision;
    const totalSteps = Math.ceil(duration / secondsPerStep);
    for (let i = 0; i <= totalSteps; i++) {
      const time = i * secondsPerStep;
      const x = time * PPS * zoom;
      lines.push({ time, type: stepType, x });
    }
    return lines;
  }, [bpm, duration, zoom]);

  // Default layer is now set in the store's initial state; no need to add here

  // FIX: When the project's duration changes (e.g., on audio load),
  // ensure all layers are clamped to the new duration.
  useEffect(() => {
    // Guard against running when duration is not yet finalized.
    if (duration > 0) {
      // Use the functional form of state update to get the most recent layers
      // without adding 'layers' to the dependency array.
      const currentLayers = useTimelineStore.getState().layers;
      currentLayers.forEach(layer => {
        if (layer.endTime !== duration) {
          // This now correctly resizes the initial default layer and any other
          // layers that might be out of sync.
          updateLayer(layer.id, { endTime: duration });
        }
      });
    }
  }, [duration, updateLayer]); // Only re-run when the duration itself changes.

  // Keyboard shortcut: Clear selected clip with Delete or Backspace key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Delete or Backspace key is pressed
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't trigger if user is typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }

        // Clear the clip content from the selected layer
        if (selectedLayerId) {
          const selectedLayer = layers.find(l => l.id === selectedLayerId);
          // Only clear if the layer has content (is not empty)
          const hasContent = selectedLayer && (selectedLayer.src || selectedLayer.effectType);
          if (hasContent) {
            e.preventDefault(); // Prevent browser back navigation on Backspace
            // Clear the clip by removing all content-related properties
            updateLayer(selectedLayerId, { 
              src: '',
              effectType: undefined,
              settings: undefined,
              type: 'image', // Reset to default type
              name: `Layer ${layers.indexOf(selectedLayer) + 1}` // Reset to default name
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerId, layers, updateLayer]);

  const handleAssetDrop = (item: any, targetLayerId?: string) => {
    debugLog.log('Asset dropped on timeline:', item, 'target layer:', targetLayerId);
    
    if (targetLayerId) {
      // Dropped on a specific layer
      const targetLayer = layers.find(layer => layer.id === targetLayerId);
      if (targetLayer && !targetLayer.src) {
        // Fill the empty lane with the dropped content
        const shouldUpdateName = targetLayer.name?.startsWith('Layer');
        const computedName = shouldUpdateName ? (item.name || item.id) : targetLayer.name;
        switch (item.type) {
          case 'VIDEO_FILE':
            updateLayer(targetLayerId, {
              type: 'video',
              src: item.src,
              ...(shouldUpdateName ? { name: computedName } : {})
            });
            break;
          case 'IMAGE_FILE':
            updateLayer(targetLayerId, {
              type: 'image',
              src: item.src,
              ...(shouldUpdateName ? { name: computedName } : {})
            });
            break;
          case 'EFFECT_CARD':
            // Convert effect to a layer
            updateLayer(targetLayerId, {
              type: 'effect',
              src: item.name || item.id,
              effectType: item.id,
              settings: item.parameters || {},
              ...(shouldUpdateName ? { name: computedName } : {})
            });
            break;
          default:
            debugLog.warn('Unknown asset type:', item.type);
            return;
        }
        return;
      }
    }
    
    // Fallback: check if there's an empty lane to fill
    const emptyLane = layers.find(layer => !layer.src && layer.type !== 'effect');
    
    if (emptyLane) {
      // Fill the empty lane with the dropped content
      const shouldUpdateName = emptyLane.name?.startsWith('Layer');
      const computedName = shouldUpdateName ? (item.name || item.id) : emptyLane.name;
      switch (item.type) {
        case 'VIDEO_FILE':
          updateLayer(emptyLane.id, {
            type: 'video',
            src: item.src,
            ...(shouldUpdateName ? { name: computedName } : {})
          });
          break;
        case 'IMAGE_FILE':
          updateLayer(emptyLane.id, {
            type: 'image',
            src: item.src,
            ...(shouldUpdateName ? { name: computedName } : {})
          });
          break;
        case 'EFFECT_CARD':
          // Convert effect to a layer
          updateLayer(emptyLane.id, {
            type: 'effect',
            src: item.name || item.id,
            effectType: item.id,
            settings: item.parameters || {},
            ...(shouldUpdateName ? { name: computedName } : {})
          });
          break;
        default:
          debugLog.warn('Unknown asset type:', item.type);
          return;
      }
    } else {
      // No empty lane, create a new layer
      switch (item.type) {
        case 'VIDEO_FILE':
          const videoLayer: Layer = {
            id: `video-${Date.now()}`,
            name: item.name || item.id,
            type: 'video',
            src: item.src,
            position: { x: 50, y: 50 },
            scale: { x: 1, y: 1 },
            rotation: 0,
            opacity: 1,
            audioBindings: [],
            midiBindings: [],
            zIndex: layers.length,
            blendMode: 'normal',
            startTime: 0,
            endTime: duration,
            duration: duration
          };
          addLayer(videoLayer);
          break;
        case 'IMAGE_FILE':
          const imageLayer: Layer = {
            id: `image-${Date.now()}`,
            name: item.name || item.id,
            type: 'image',
            src: item.src,
            position: { x: 50, y: 50 },
            scale: { x: 1, y: 1 },
            rotation: 0,
            opacity: 1,
            audioBindings: [],
            midiBindings: [],
            zIndex: layers.length,
            blendMode: 'normal',
            startTime: 0,
            endTime: duration,
            duration: duration
          };
          addLayer(imageLayer);
          break;
        case 'EFFECT_CARD':
          // Create a new effect layer
          const effectLayer: Layer = {
            id: `effect-${Date.now()}`,
            name: item.name || item.id,
            type: 'effect',
            src: item.name || item.id,
            effectType: item.id,
            settings: item.parameters || {},
            position: { x: 50, y: 50 },
            scale: { x: 1, y: 1 },
            rotation: 0,
            opacity: 1,
            audioBindings: [],
            midiBindings: [],
            zIndex: layers.length,
            blendMode: 'normal',
            startTime: 0,
            endTime: duration,
            duration: duration
          };
          addLayer(effectLayer);
          break;
        default:
          debugLog.warn('Unknown asset type:', item.type);
          return;
      }
    }
  };

  // FIX: Removed paddingRight state, as it caused incorrect scrolling behavior
  const userAdjustedZoomRef = useRef(false);
  const [minZoom, setMinZoom] = useState(0.1);

  const PIXELS_PER_SECOND = 100;

  const timeToX = (time: number): number => time * PIXELS_PER_SECOND * zoom;
  const xToTime = (x: number): number => {
    if (!timelineLanesRef.current) return 0;
    const rect = timelineLanesRef.current.getBoundingClientRect();
    const scrollLeft = timelineLanesRef.current.scrollLeft;
    const relativeX = x - rect.left + scrollLeft;
    return relativeX / (PIXELS_PER_SECOND * zoom);
  };

  const timelineWidth = duration * PIXELS_PER_SECOND * zoom;

  const calculateMinZoom = useCallback(() => {
    const container = timelineLanesRef.current;
    if (!container || !duration || duration <= 0) return 0.1;
    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return 0.1;
    return containerWidth / (PIXELS_PER_SECOND * duration);
  }, [duration]);

  useEffect(() => {
    const container = timelineLanesRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      const containerWidth = container.clientWidth;
      if (containerWidth <= 0 || !duration || duration <= 0) return;

      const newMinZoom = containerWidth / (PIXELS_PER_SECOND * duration);

      // Determine if we are currently at the fitted (min) zoom level
      const isCurrentlyAtMinZoom = Math.abs(zoom - minZoom) < 0.001;

      // Always update the dynamic minZoom bound
      setMinZoom(newMinZoom);

      // Keep fitting on resize if user hasn't adjusted, or if already at min zoom
      if ((!userAdjustedZoomRef.current || isCurrentlyAtMinZoom) && isFinite(newMinZoom) && newMinZoom > 0) {
        setZoom(newMinZoom);
      }
    });

    ro.observe(container);

    // Initial calculation on mount
    const initialWidth = container.clientWidth;
    if (initialWidth > 0 && duration > 0) {
      const initialMinZoom = initialWidth / (PIXELS_PER_SECOND * duration);
      setMinZoom(initialMinZoom);
      if (!userAdjustedZoomRef.current) {
        setZoom(initialMinZoom);
      }
    }

    return () => ro.disconnect();
  }, [duration, setZoom]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const time = xToTime(e.clientX);
    const clampedTime = Math.max(0, Math.min(duration, time));
    if (onSeek) onSeek(clampedTime);
    else setCurrentTime(clampedTime);
  };

  // FIX: Track target layer during drag for z-index swap on drop
  const dragTargetLayerRef = useRef<string | null>(null);

  // FIX: Capture the state of the layer when the drag begins
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const layerId = (active.id as string).split('::')[0];
    const layer = useTimelineStore.getState().layers.find(l => l.id === layerId);
    if (layer) {
      activeDragLayerRef.current = { ...layer };
      setLiveLayerUpdate({ ...layer });
      setActiveDragId(layerId);
    }
  }, []);

  // Shared drag logic for both move and end events
  const processDragEvent = useCallback((event: DragMoveEvent | DragEndEvent) => {
    const { active, delta } = event;
    const rawId = active.id as string;
    
    const initialLayer = activeDragLayerRef.current;
    if (!initialLayer) return;

    const [layerId, handle] = rawId.split('::');
    const timeDelta = delta.x / (PIXELS_PER_SECOND * zoom);

    setLiveLayerUpdate(prev => {
      if (!prev) return null;
      let newStartTime = prev.startTime;
      let newEndTime = prev.endTime;
      if (handle === 'handle-right') {
        newEndTime = Math.min(duration, Math.max(initialLayer.startTime + 0.1, initialLayer.endTime + timeDelta));
      } else if (handle === 'handle-left') {
        newStartTime = Math.max(0, Math.min(initialLayer.endTime - 0.1, initialLayer.startTime + timeDelta));
      } else {
        const clipDuration = initialLayer.endTime - initialLayer.startTime;
        newStartTime = Math.max(0, initialLayer.startTime + timeDelta);
        newStartTime = Math.min(newStartTime, duration - clipDuration);
        newEndTime = newStartTime + clipDuration;
      }
      return { ...prev, startTime: newStartTime, endTime: newEndTime } as Layer;
    });
  }, [zoom, duration]);

  // Separate handlers that explicitly pass the isDragEnd flag
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    processDragEvent(event);
  }, [processDragEvent]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const initialLayer = activeDragLayerRef.current;
    if (liveLayerUpdate && initialLayer) {
      // Commit final state to the global store
      updateLayer(liveLayerUpdate.id, {
        startTime: liveLayerUpdate.startTime,
        endTime: liveLayerUpdate.endTime,
      });

      // Handle vertical swap on drag end
      const { delta } = event;
      const rowsMoved = Math.round(delta.y / ROW_HEIGHT);
      if (rowsMoved !== 0) {
        const currentLayers = useTimelineStore.getState().layers;
        const sorted = [...currentLayers].sort((a, b) => b.zIndex - a.zIndex);
        const currentIndex = sorted.findIndex(l => l.id === initialLayer.id);
        const targetIndex = Math.max(0, Math.min(sorted.length - 1, currentIndex + rowsMoved));
        if (targetIndex !== currentIndex) {
          const targetLayer = sorted[targetIndex];
          swapLayers(initialLayer.id, targetLayer.id);
        }
      }
    }
    setActiveDragId(null);
    setLiveLayerUpdate(null);
    activeDragLayerRef.current = null;
  }, [liveLayerUpdate, updateLayer, swapLayers]);

  // Memoized snap-to-grid modifier for DnD context
  const snapToGridModifier = useCallback((args: { transform: any }) => {
    const { transform } = args;
    if (!transform || !bpm || !activeDragId) return transform;

    // Access fresh layers directly from the store
    const currentLayers = useTimelineStore.getState().layers;
    const layer = currentLayers.find(l => l.id === activeDragId);
    if (!layer) return transform;

    // Recompute grid lines based on current scroll/zoom and bpm
    const lines: Array<{ time: number; type: 'bar' | 'beat' | 'sixteenth'; x: number }> = [];
    if (timelineLanesRef.current) {
      const PPS = 100;
      const container = timelineLanesRef.current;
      const scrollLeft = container.scrollLeft;
      const viewportWidth = container.clientWidth;
      const totalWidth = duration * PPS * zoom;
      const minX = Math.max(0, scrollLeft - 50);
      const maxX = Math.min(totalWidth, scrollLeft + viewportWidth + 50);
      const secondsPerBeat = 60 / bpm;
      const pixelsPerBeat = secondsPerBeat * PPS * zoom;

      let subdivision: number = 4; // default bars (4 beats)
      let type: 'bar' | 'beat' | 'sixteenth' = 'bar';
      if (pixelsPerBeat > 80) { subdivision = 0.25; type = 'sixteenth'; }
      else if (pixelsPerBeat > 20) { subdivision = 1; type = 'beat'; }

      const secondsPerStep = secondsPerBeat * subdivision;
      const startTime = Math.max(0, (minX) / (PPS * zoom));
      const firstStepIndex = Math.floor(startTime / secondsPerStep);
      for (let i = firstStepIndex; ; i++) {
        const time = i * secondsPerStep;
        const x = time * PPS * zoom;
        if (x > maxX) break;
        lines.push({ time, type, x });
      }
    }

    const originX = layer.startTime * 100 * zoom;
    const currentX = originX + transform.x;
    const xs = lines.map(g => g.x);
    let snappedX = currentX;
    let minDist = Infinity;
    for (const gx of xs) {
      const d = Math.abs(gx - currentX);
      if (d < minDist) { minDist = d; snappedX = gx; }
    }
    const threshold = 10;
    if (minDist <= threshold) {
      return { ...transform, x: snappedX - originX };
    }
    return transform;
  }, [bpm, activeDragId, zoom, duration]);
  
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  const totalHeight = (2 * HEADER_ROW_HEIGHT) + ((sortedLayers.length + 1 + stems.length) * ROW_HEIGHT);

  return (
    <div className={cn("relative", className)}>
      {/* Zoom Slider is now a sibling, positioned absolutely */}
      <div className="absolute top-0 right-4 z-50 h-8 flex items-center gap-2 pointer-events-auto">
        <span className="text-xs text-stone-400 font-medium">Zoom</span>
        <Slider
          value={[zoomToSlider(zoom, minZoom)]}
          onValueChange={([val]) => {
            userAdjustedZoomRef.current = true;
            // Pass minZoom to the conversion function
            setZoom(sliderToZoom(val, minZoom));
          }}
          min={0}
          max={100}
          step={1}
          className="w-48"
        />
        <span className="text-xs w-12 text-center text-stone-400">{Math.round(zoom * 100)}%</span>
      </div>

      <div className="bg-stone-800 border border-stone-700 rounded-xl overflow-hidden">
        <div className="flex">
          {/* ========== COLUMN 1: TRACK HEADERS (Fixed Width) ========== */}
          <div className="w-56 flex-shrink-0 border-r border-stone-700 bg-stone-900/30">
            <div className={cn('flex items-center justify-between px-2 border-b border-stone-700', `h-[${HEADER_ROW_HEIGHT}px]`)}>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Composition</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1 text-stone-400"
                onClick={() => {
                  const newLayer: Layer = {
                    id: `layer-${Date.now()}`,
                    name: `Layer ${layers.length + 1}`,
                    type: 'image',
                    src: '',
                    zIndex: layers.length,
                    isDeletable: true,
                    startTime: 0,
                    endTime: duration,
                    duration: duration,
                    position: { x: 50, y: 50 },
                    scale: { x: 1, y: 1 },
                    rotation: 0,
                    opacity: 1,
                    audioBindings: [],
                    midiBindings: [],
                    blendMode: 'normal',
                  };
                  addLayer(newLayer);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {sortedLayers.map((layer) => (
              <CompositionLayerHeader key={layer.id} layer={layer} />
            ))}

            {/* Background control header row (rendered after layers so it sits at the bottom of the Composition section) */}
            <div
              className={cn(
                'flex items-center px-2 border-b border-stone-700/50'
              )}
              style={{ height: `${ROW_HEIGHT}px` }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Palette className="h-4 w-4 text-stone-400" />
                <span className="text-sm font-medium text-stone-300 truncate">Background</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
                  title="Change background color"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-stone-400 hover:text-white"
                  onClick={toggleBackgroundVisibility}
                  title={isBackgroundVisible ? 'Hide background' : 'Show background'}
                >
                  {isBackgroundVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className={cn('flex items-center px-2 border-t border-b border-stone-700', `h-[${HEADER_ROW_HEIGHT}px]`)}>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Audio & MIDI</span>
            </div>
            {stems.map((stem) => (
              <StemTrackHeader
                key={stem.id}
                id={stem.id}
                name={stem.file_name}
                isActive={stem.id === activeTrackId}
                isSoloed={soloedStems.has(stem.id)}
                onClick={() => onStemSelect?.(stem.id)}
                onToggleSolo={onToggleSolo ? () => onToggleSolo(stem.id) : undefined}
                isMaster={stem.id === masterStemId}
              />
            ))}
          </div>

          {/* ========== COLUMN 2: TIMELINE LANES (Scrollable & Interactive) ========== */}
          <div className="flex-1 overflow-x-auto" ref={timelineLanesRef}>
            {/* FIX: Added onDragStart for precision and onDragMove for live feedback; include snap-to-grid modifier */}
            <DndContext
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragMove={handleDragMove}
              modifiers={[snapToGridModifier]}
            >
              <div
                className="relative overflow-hidden"
                style={{ width: `${timelineWidth}px`, height: `${totalHeight}px` }}
                onClick={handleTimelineClick}
              >
                {/* BPM-Aware Grid Lines */}
                {gridLines.map((g: { time: number; type: 'bar' | 'beat' | 'sixteenth'; x: number }, idx: number) => {
                  const lineClass = cn(
                    'absolute',
                    g.type === 'bar' ? 'w-px bg-white/15' : g.type === 'beat' ? 'w-[0.5px] bg-white/10' : 'w-[0.5px] bg-white/5'
                  );
                  const compTop = HEADER_ROW_HEIGHT;
                  const compHeight = (sortedLayers.length * ROW_HEIGHT) + ROW_HEIGHT; // layers + background header
                  const audioHeaderTop = compTop + compHeight; // Audio & MIDI title row
                  const audioLanesTop = audioHeaderTop + HEADER_ROW_HEIGHT;
                  const audioLanesHeight = Math.max(0, totalHeight - audioLanesTop);
                  return (
                    <React.Fragment key={`grid-${idx}`}>
                      <div className={lineClass} style={{ left: `${g.x}px`, top: compTop, height: `${compHeight}px` }} />
                      <div className={lineClass} style={{ left: `${g.x}px`, top: audioLanesTop, height: `${audioLanesHeight}px` }} />
                    </React.Fragment>
                  );
                })}
                {sortedLayers.map((layer, index) => {
                  const displayLayer = liveLayerUpdate && liveLayerUpdate.id === layer.id ? liveLayerUpdate : layer;
                  const PIXELS_PER_SECOND = 100;
                  const leftPx = displayLayer.startTime * PIXELS_PER_SECOND * zoom;
                  const widthPx = (displayLayer.endTime - displayLayer.startTime) * PIXELS_PER_SECOND * zoom;
                  const topPx = HEADER_ROW_HEIGHT + (index * ROW_HEIGHT);
                  return (
                    <React.Fragment key={layer.id}>
                      <LayerClip
                        layer={displayLayer}
                        index={index}
                        onAssetDrop={handleAssetDrop}
                    activeDragLayerId={activeDragId}
                        postDropTransform={postDropTransform}
                        destinationAnimateId={destinationAnimateId}
                      />
                      {activeDragId === layer.id && (
                        <div
                          className={cn(
                            "absolute flex items-center justify-center rounded border border-dashed",
                            "border-stone-600 bg-stone-800/50 text-stone-400 pointer-events-none"
                          )}
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                            top: `${topPx}px`,
                            height: `${ROW_HEIGHT - 4}px`,
                            marginTop: '2px',
                            transition: 'none',
                            zIndex: 5,
                          }}
                        >
                          <span className="text-xs font-medium truncate select-none">+ Drop Asset Here</span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {stems.map((stem, index) => {
                  const analysis: any = cachedAnalysis?.find((a: any) => a.fileMetadataId === stem.id);
                  // This is the combined height of the entire composition section above the audio section
                  const compositionSectionHeight = HEADER_ROW_HEIGHT + (sortedLayers.length * ROW_HEIGHT) + ROW_HEIGHT;
                  // This is the height of the audio section header
                  const audioHeaderHeight = HEADER_ROW_HEIGHT;
                  // The top position for the first stem starts after all the above sections
                  const yPos = compositionSectionHeight + audioHeaderHeight + (index * ROW_HEIGHT);
                  return (
                    <div key={`waveform-${stem.id}`} className="absolute w-full flex items-center" style={{ top: `${yPos}px`, height: `${ROW_HEIGHT}px` }}>
                      <StemTrackLane
                        waveformData={analysis?.waveformData ?? null}
                        duration={duration}
                        currentTime={currentTime}
                        isPlaying={isPlaying}
                        isLoading={stemLoadingState}
                        analysisProgress={analysisProgress?.[stem.id]}
                        onSeek={onSeek}
                      />
                    </div>
                  );
                })}

                <div className="absolute top-0 w-0.5 h-full bg-emerald-400 z-50 pointer-events-none" style={{ left: `${timeToX(currentTime)}px` }} />
              </div>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## File: /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/lib/visualizer/effects/EffectDefinitions.ts
```typescript
import { EffectRegistry } from './EffectRegistry';
import { MetaballsEffect } from './MetaballsEffect';
import { ParticleNetworkEffect } from './ParticleNetworkEffect';
import { ImageSlideshowEffect } from './ImageSlideshowEffect';

// Register built-in effects at module import time
EffectRegistry.register({
  id: 'metaballs',
  name: 'MIDI Metaballs',
  description: 'Fluid droplet-like spheres that respond to MIDI notes',
  category: 'organic',
  version: '1.0.0',
  constructor: MetaballsEffect,
  defaultConfig: {}
});

EffectRegistry.register({
  id: 'particleNetwork',
  name: 'Particle Network',
  description: 'Glowing particle network that responds to MIDI and audio',
  category: 'particles',
  version: '1.0.0',
  constructor: ParticleNetworkEffect,
  defaultConfig: {}
});

EffectRegistry.register({
  id: 'imageSlideshow',
  name: 'Image Slideshow',
  description: 'Slideshow that advances on audio transients',
  category: 'media',
  version: '1.0.0',
  constructor: ImageSlideshowEffect,
  defaultConfig: {
    triggerValue: 0,
    threshold: 0.5,
    images: [],
    opacity: 1.0,
    scale: 1.0
  }
});

// Bloom post-processing is now handled by the compositor; remove as an effect
```

## File: /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/lib/visualizer/effects/ImageSlideshowEffect.ts
```typescript
import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';

// Always log ImageSlideshowEffect logs for debugging (bypass debugLog conditional)
const slideshowLog = {
  log: (...args: any[]) => console.log('🖼️', ...args),
  warn: (...args: any[]) => console.warn('🖼️', ...args),
  error: (...args: any[]) => console.error('🖼️', ...args),
};

export class ImageSlideshowEffect implements VisualEffect {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  parameters: {
    triggerValue: number; // Mapped input (0-1)
    threshold: number;
    images: string[]; // List of image URLs
    opacity: number;
    scale: number;
  };

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private plane: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  
  private currentImageIndex: number = -1;
  private textureCache: Map<string, THREE.Texture> = new Map();
  private loadingImages: Set<string> = new Set();
  private wasTriggered: boolean = false;
  private previousTriggerValue: number = 0; // Track previous value for edge detection
  private textureLoader = new THREE.TextureLoader();
  private aspectRatio: number = 1;
  private failureCount = 0;

  constructor(config?: any) {
    this.id = config?.id || `imageSlideshow_${Math.random().toString(36).substr(2, 9)}`;
    this.name = 'Image Slideshow';
    this.description = 'Advances images based on audio transients';
    this.enabled = true;
    this.parameters = {
      triggerValue: 0,
      threshold: 0.1, // Lower default threshold to catch more transients
      images: config?.images || [],
      opacity: 1.0,
      scale: 1.0,
      ...config
    };

    this.textureLoader.setCrossOrigin('anonymous');

    this.scene = new THREE.Scene();
    
    // Use Orthographic camera to easily fill the screen
    this.aspectRatio = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -this.aspectRatio, this.aspectRatio, 
      1, -1, 
      0.1, 100
    );
    this.camera.position.z = 1;

    this.material = new THREE.MeshBasicMaterial({ 
        color: 0x000000, // Prevent bright white flash before textures load
        transparent: true, 
        opacity: this.parameters.opacity,
        side: THREE.DoubleSide,
        map: null
    });
    
    // Create plane that fills the view (2x2 in orthographic space with height 1)
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(2 * this.aspectRatio, 2), this.material);
    this.scene.add(this.plane);
  }

  init(renderer: THREE.WebGLRenderer): void {
      slideshowLog.log('Initializing ImageSlideshowEffect', {
        effectId: this.id,
        imagesCount: this.parameters.images.length,
        sampleUrls: this.parameters.images.slice(0, 2).map(url => url.substring(0, 60) + '...')
      });
      if (this.parameters.images.length > 0) {
          slideshowLog.log('Images available at init, calling advanceSlide()');
          this.advanceSlide();
      } else {
          slideshowLog.warn('No images available at init time');
      }
  }

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
      if (!this.enabled) return;

      // If images were added after init, load the first one immediately
      if (this.currentImageIndex === -1 && this.parameters.images.length > 0) {
          slideshowLog.log('Update: currentImageIndex is -1, images available, calling advanceSlide()');
          this.advanceSlide();
      }

      // Retry loading if no texture is displayed but images are available
      if (
        !this.material.map &&
        this.parameters.images.length > 0 &&
        this.failureCount < this.parameters.images.length * 2
      ) {
        const nextIndex = (this.currentImageIndex + 1) % this.parameters.images.length;
        const targetUrl = this.parameters.images[nextIndex];
        if (!this.loadingImages.has(targetUrl)) {
          slideshowLog.log('Update: No texture map, attempting to load:', {
            currentIndex: this.currentImageIndex,
            nextIndex,
            url: targetUrl.substring(0, 60),
            failureCount: this.failureCount
          });
          this.advanceSlide();
        } else {
          slideshowLog.log('Update: Image already loading, skipping');
        }
      } else if (!this.material.map && this.parameters.images.length === 0) {
        slideshowLog.warn('Update: No texture map and no images available');
      } else if (!this.material.map && this.failureCount >= this.parameters.images.length * 2) {
        slideshowLog.error('Update: Too many failures, giving up:', {
          failureCount: this.failureCount,
          imageCount: this.parameters.images.length
        });
      }

      // Edge detection: trigger on rising edge (when value crosses threshold going UP)
      // This prevents multiple triggers from the same transient's decaying envelope
      const currentValue = this.parameters.triggerValue;
      const threshold = this.parameters.threshold;
      
      // Detect rising edge: previous value was below threshold, current is above
      const isRisingEdge = this.previousTriggerValue <= threshold && currentValue > threshold;
      
      // Debug log trigger state occasionally
      if (Math.floor(Date.now() / 1000) % 2 === 0 && currentValue > 0) {
        slideshowLog.log('Trigger check:', {
          triggerValue: currentValue.toFixed(3),
          previousValue: this.previousTriggerValue.toFixed(3),
          threshold: threshold.toFixed(3),
          isRisingEdge,
          wasTriggered: this.wasTriggered
        });
      }
      
      if (isRisingEdge) {
          slideshowLog.log('🎯 TRIGGER FIRED! Advancing slide', {
            previousValue: this.previousTriggerValue.toFixed(3),
            currentValue: currentValue.toFixed(3),
            threshold: threshold.toFixed(3)
          });
          this.advanceSlide();
          this.wasTriggered = true;
      } else if (currentValue <= threshold) {
          // Reset trigger state when value drops below threshold
          this.wasTriggered = false;
      }
      
      // Update previous value for next frame
      this.previousTriggerValue = currentValue;

      // Update visual params
      this.material.opacity = this.parameters.opacity;
      
      // Handle manual scale changes if needed, though usually we want to fill screen
      // If scale parameter is meant to zoom the image:
      if (this.parameters.scale !== 1.0) {
          // We could apply scale to the plane
           // this.plane.scale.setScalar(this.parameters.scale);
           // But fitTextureToScreen handles basic fit.
      }
  }

  updateParameter(paramName: string, value: any): void {
    // Handle images array updates - this is called when a collection is selected
    if (paramName === 'images' && Array.isArray(value)) {
      slideshowLog.log('updateParameter called with images:', { 
        valueLength: value.length,
        valueSample: value.slice(0, 2).map((url: any) => typeof url === 'string' ? url.substring(0, 80) : String(url))
      });
      
      // Filter out empty or invalid URLs - accept any non-empty string that looks like a URL
      const validUrls = value.filter((url: any) => {
        if (typeof url !== 'string') {
          slideshowLog.warn('Invalid URL type:', typeof url, url);
          return false;
        }
        const trimmed = url.trim();
        if (trimmed.length === 0) {
          slideshowLog.warn('Empty URL string');
          return false;
        }
        // Accept http/https URLs or data URLs
        const isValid = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:');
        if (!isValid) {
          slideshowLog.warn('URL does not start with http/https/data:', trimmed.substring(0, 50));
        }
        return isValid;
      });
      
      const oldLength = this.parameters.images.length;
      const newLength = validUrls.length;
      const imagesChanged = oldLength !== newLength || 
        JSON.stringify(this.parameters.images) !== JSON.stringify(validUrls);
      
      slideshowLog.log('Images validation result:', { 
        oldCount: oldLength, 
        newCount: newLength,
        validUrls: validUrls.length,
        invalidUrls: value.length - validUrls.length,
        imagesChanged,
        sampleUrls: validUrls.slice(0, 3).map((url: string) => url.substring(0, 60) + '...')
      });
      
      if (imagesChanged) {
        if (validUrls.length === 0) {
          slideshowLog.warn('No valid image URLs provided after filtering');
          slideshowLog.warn('Original value:', value);
          return;
        }
        
        // Update the parameter with only valid URLs
        this.parameters.images = validUrls;
        
        // Reset state for new collection
        this.currentImageIndex = -1;
        this.failureCount = 0;
        
        // Clear texture cache since URLs may have changed
        this.textureCache.forEach(t => t.dispose());
        this.textureCache.clear();
        this.loadingImages.clear();
        
        // Clear current texture
        if (this.material.map) {
          this.material.map = null;
          this.material.color.setHex(0x000000); // Back to black
          this.material.needsUpdate = true;
        }
        
        // Load first image immediately
        slideshowLog.log('Loading first image from new collection, calling advanceSlide()');
        this.advanceSlide();
      } else {
        slideshowLog.log('Images array unchanged, skipping update');
      }
    } else if (paramName === 'opacity') {
      this.parameters.opacity = value;
      this.material.opacity = value;
    } else if (paramName === 'scale') {
      this.parameters.scale = value;
    } else if (paramName === 'threshold') {
      this.parameters.threshold = value;
      // Reset trigger state when threshold changes to avoid false triggers
      this.previousTriggerValue = this.parameters.triggerValue;
      this.wasTriggered = false;
    } else if (paramName === 'triggerValue') {
      // Don't update previousTriggerValue here - it's managed in update()
      this.parameters.triggerValue = value;
    }
  }

  resize(width: number, height: number) {
      this.aspectRatio = width / height;
      
      this.camera.left = -this.aspectRatio;
      this.camera.right = this.aspectRatio;
      this.camera.top = 1;
      this.camera.bottom = -1;
      this.camera.updateProjectionMatrix();
      
      // Resize plane geometry to match new aspect ratio
      this.plane.geometry.dispose();
      this.plane.geometry = new THREE.PlaneGeometry(2 * this.aspectRatio, 2);
      
      // Re-fit current texture if exists
      if (this.material.map) {
          this.fitTextureToScreen(this.material.map);
      }
  }

  private async advanceSlide() {
      if (this.parameters.images.length === 0) {
        slideshowLog.warn('advanceSlide called but images array is empty');
        return;
      }

      const nextIndex = (this.currentImageIndex + 1) % this.parameters.images.length;
      const imageUrl = this.parameters.images[nextIndex];
      
      slideshowLog.log('Advancing slide:', { 
        currentIndex: this.currentImageIndex, 
        nextIndex, 
        url: imageUrl.substring(0, 60) 
      });

      // Try to get from cache
      let texture = this.textureCache.get(imageUrl);
      
      if (!texture) {
          try {
            texture = await this.loadTexture(imageUrl);
            this.failureCount = 0;
          } catch(e) {
              slideshowLog.error("Failed to load image for slideshow", imageUrl.substring(0, 60), e);
              this.currentImageIndex = nextIndex;
              this.failureCount++;
              return;
          }
      }

      if (texture) {
          this.currentImageIndex = nextIndex;
          this.material.map = texture;
          this.material.color.setHex(0xffffff); // Reset tint so texture displays normally
          this.material.needsUpdate = true;
          
          slideshowLog.log('Slide advanced successfully:', {
            index: nextIndex,
            hasTexture: !!texture,
            textureSize: texture.image ? `${texture.image.width}x${texture.image.height}` : 'unknown'
          });
          
          this.fitTextureToScreen(texture);

          // Preload next images & cleanup
          this.cleanupCache();
          this.loadNextTextures(nextIndex);
      } else {
        slideshowLog.error('advanceSlide: texture is null after load attempt');
      }
  }

  private fitTextureToScreen(texture: THREE.Texture) {
     if (!texture.image) return;
     
     // "Cover" style fitting:
     // We want the image to cover the 2*aspect x 2 plane.
     // The plane UVs are 0..1.
     // We need to transform UVs to crop the image.
     
     const imageAspect = texture.image.width / texture.image.height;
     const screenAspect = this.aspectRatio; // width / height (camera space width is 2*aspect, height is 2)
     
     texture.matrixAutoUpdate = false;
     texture.center.set(0.5, 0.5);
     
     if (imageAspect > screenAspect) {
         // Image is wider than screen (relative to height)
         // We need to scale UVs horizontally (x)
         // scale = imageAspect / screenAspect
         texture.repeat.set(screenAspect / imageAspect, 1);
     } else {
         // Image is taller than screen (relative to width)
         // We need to scale UVs vertically (y)
         texture.repeat.set(1, imageAspect / screenAspect);
     }
  }

  private loadNextTextures(currentIndex: number) {
      // Load next 2 images
      for (let i = 1; i <= 2; i++) {
          const idx = (currentIndex + i) % this.parameters.images.length;
          const url = this.parameters.images[idx];
          if (!this.textureCache.has(url) && !this.loadingImages.has(url)) {
              this.loadTexture(url).catch(e => slideshowLog.error("Preload failed", e));
          }
      }
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
      if (this.loadingImages.has(url)) {
        slideshowLog.warn('Already loading texture:', url.substring(0, 50));
        return Promise.reject('Already loading');
      }
      this.loadingImages.add(url);
      slideshowLog.log('Loading texture:', url.substring(0, 80));
      return new Promise((resolve, reject) => {
          this.textureLoader.load(
            url, 
            (texture) => {
                this.textureCache.set(url, texture);
                this.loadingImages.delete(url);
                // Ensure texture works with resizing
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                slideshowLog.log('Texture loaded successfully:', {
                  url: url.substring(0, 50),
                  width: texture.image?.width,
                  height: texture.image?.height
                });
                resolve(texture);
            }, 
            undefined, 
            (err) => {
                this.loadingImages.delete(url);
                slideshowLog.error('Texture load failed:', url.substring(0, 80), err);
                reject(err);
            }
          );
      });
  }

  private cleanupCache() {
      // Keep current and next 2 images
      const keepIndices = new Set<number>();
      keepIndices.add(this.currentImageIndex);
      keepIndices.add((this.currentImageIndex + 1) % this.parameters.images.length);
      keepIndices.add((this.currentImageIndex + 2) % this.parameters.images.length);

      // Map URLs to keep
      const keepUrls = new Set<string>();
      keepIndices.forEach(idx => keepUrls.add(this.parameters.images[idx]));

      for (const [url, texture] of this.textureCache) {
          if (!keepUrls.has(url)) {
              texture.dispose();
              this.textureCache.delete(url);
          }
      }
  }

  getScene(): THREE.Scene { return this.scene; }
  getCamera(): THREE.Camera { return this.camera; }
  destroy(): void {
      this.plane.geometry.dispose();
      this.material.dispose();
      this.textureCache.forEach(t => t.dispose());
      this.textureCache.clear();
  }
}
```

## File: /Users/jasperhall/Desktop/Phonoglyph/apps/web/src/types/video-composition.ts
```typescript
import type { AudioAnalysisData, LiveMIDIData } from './visualizer';

export interface AudioBinding {
  feature: keyof AudioAnalysisData;
  inputRange: [number, number];
  outputRange: [number, number];
  blendMode: 'add' | 'multiply' | 'replace';
  modulationAmount?: number; // 0-1, default 1.0 (100%)
}

export interface MIDIBinding {
  source: 'velocity' | 'cc' | 'pitchBend' | 'channelPressure';
  inputRange: [number, number];
  outputRange: [number, number];
  blendMode: 'add' | 'multiply' | 'replace';
}

export interface Layer {
  id: string;
  name: string;
  isDeletable?: boolean;
  type: 'video' | 'image' | 'effect';
  src?: string;
  effectType?: EffectType;
  settings?: any;
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  opacity: number;
  audioBindings: AudioBinding[];
  midiBindings: MIDIBinding[];
  zIndex: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  startTime: number;
  endTime: number;
  duration: number;
}

export type EffectType = 'metaballs' | 'particles' | 'particleNetwork' | 'midihud' | 'bloom' | 'imageSlideshow';
export type LayerType = 'video' | 'image' | 'effect';

export interface VideoComposition {
  id: string;
  projectId: string;
  name: string;
  layers: Layer[];
  width: number;
  height: number;
  duration: number;
  fps: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LayerClip {
  id: string;
  layerId: string;
  startTime: number;
  endTime: number;
  parameters: Record<string, any>;
}

export interface CompositionTimeline {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  layers: Layer[];
  clips: LayerClip[];
}
```
