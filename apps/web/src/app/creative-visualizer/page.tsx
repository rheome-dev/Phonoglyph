'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Zap, Palette, Settings2, Eye, EyeOff, Info, Map as MapIcon, Download } from 'lucide-react';
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
import { useTimelineStore } from '@/stores/timelineStore';
import { UnifiedTimeline } from '@/components/video-composition/UnifiedTimeline';
import type { Layer } from '@/types/video-composition';
import { useFeatureValue } from '@/hooks/use-feature-value';
import { HudOverlayRenderer } from '@/components/hud/HudOverlayManager';
import { AspectRatioSelector } from '@/components/ui/aspect-ratio-selector';
import { getAspectRatioConfig } from '@/lib/visualizer/aspect-ratios';
import { useProjectSettingsStore } from '@/stores/projectSettingsStore';
import { useVisualizerStore } from '@/stores/visualizerStore';
import { makeParamKey, parseParamKey } from '@/lib/visualizer/paramKeys';
import { CollectionManager } from '@/components/assets/CollectionManager';
import { AutoSaveProvider, useAutoSaveContext } from '@/components/auto-save/auto-save-provider';
import { AutoSaveIndicator } from '@/components/auto-save/auto-save-indicator';
import { AutoSaveTopBar } from '@/components/auto-save/auto-save-top-bar';
import { getProjectExportPayload } from '@/lib/export-utils';

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
  // Inspector mode props
  editingEffectId?: string | null;
  editingEffectInstance?: { 
    id: string; 
    name: string; 
    description: string; 
    parameters: Record<string, any>;
  } | null;
  activeSliderValues?: Record<string, Record<string, any>>;
  baseParameterValues?: Record<string, Record<string, any>>;
  onParameterChange?: (effectId: string, paramName: string, value: any) => void;
  onBack?: () => void;
  mappings?: Record<string, { featureId: string | null; modulationAmount: number }>;
  featureNames?: Record<string, string>;
  onMapFeature?: (parameterId: string, featureId: string, stemType?: string) => void;
  onUnmapFeature?: (parameterId: string) => void;
  onModulationAmountChange?: (parameterId: string, amount: number) => void;
  // ImageSlideshow specific props
  projectId?: string;
  availableFiles?: any[];
  activeCollectionId?: string;
  setActiveCollectionId?: (id: string | undefined) => void;
  modulatedParameterValues?: Record<string, number>;
  layers?: Layer[];
  setActiveParam?: (effectId: string, paramName: string, value: any) => void;
  // Overlay sizing and stem inheritance props
  aspectRatio?: string;
  masterStemId?: string | null;
  availableStems?: Array<{ id: string; file_name: string; stem_type?: string; is_master?: boolean }>;
  onLayerUpdate?: (layerId: string, updates: Partial<Layer>) => void;
}> = ({ 
  effects, 
  selectedEffects, 
  onEffectToggle, 
  onEffectDoubleClick, 
  isVisible, 
  stemUrlsReady,
  editingEffectId,
  editingEffectInstance,
  activeSliderValues,
  baseParameterValues,
  onParameterChange,
  onBack,
  mappings,
  featureNames,
  onMapFeature,
  onUnmapFeature,
  onModulationAmountChange,
  // ImageSlideshow specific props
  projectId,
  availableFiles,
  activeCollectionId,
  setActiveCollectionId,
  modulatedParameterValues,
  layers: layersProp,
  setActiveParam,
  aspectRatio = 'mobile',
  masterStemId,
  availableStems,
  onLayerUpdate
}) => {
  const { addLayer, duration, layers } = useTimelineStore((state) => ({
    addLayer: state.addLayer,
    duration: state.duration,
    layers: state.layers,
  }));
  const overlayCount = layers.filter((l) => l.type === 'overlay').length;
  
  const handleEffectDoubleClick = (effectId: string) => {
    if (!stemUrlsReady) {
      debugLog.warn('[EffectsLibrarySidebarWithHud] Overlay creation blocked: stem URLs not ready');
      return;
    }
    const effect = effects.find(e => e.id === effectId);
    if (effect && effect.category === 'Overlays') {
      // Map effect ID to overlay type
      const overlayTypeMap: Record<string, string> = {
        'waveform': 'waveform',
        'spectrogram': 'spectrogram',
        'peakMeter': 'peakMeter',
        'stereometer': 'stereometer',
        'oscilloscope': 'oscilloscope',
        'spectrumAnalyzer': 'spectrumAnalyzer',
        'vuMeter': 'vuMeter',
        'chromaWheel': 'chromaWheel',
        'consoleFeed': 'consoleFeed',
      };
      
      const overlayType = overlayTypeMap[effectId];
      if (overlayType) {
        debugLog.log('🎯 Adding HUD overlay to timeline:', overlayType, 'with master stem:', masterStemId);
        
        // HudOverlay uses scale.x/y as PERCENTAGES of parent container
        // and position.x/y as PERCENTAGES for positioning
        // Default to 40% width, 25% height for a reasonable overlay size
        const overlayWidthPct = 40;
        const overlayHeightPct = 25;
        
        // Position within canvas bounds with some padding (as percentages), offset by overlay count
        const paddingPct = 5;
        const offsetStepPct = 8;
        const posXPct = paddingPct + (overlayCount * offsetStepPct) % (100 - overlayWidthPct - paddingPct * 2);
        const posYPct = paddingPct + (overlayCount * offsetStepPct) % (100 - overlayHeightPct - paddingPct * 2);
        
        const newOverlayId = `overlay-${Date.now()}`;
        const newLayer: Layer = {
          id: newOverlayId,
          name: `Overlay ${overlayCount + 1}`,
          type: 'overlay',
          effectType: overlayType as any,
          src: '',
          position: { x: posXPct, y: posYPct },
          scale: { x: overlayWidthPct, y: overlayHeightPct }, // Percentages!
          rotation: 0,
          opacity: 1,
          audioBindings: [],
          midiBindings: [],
          zIndex: 0,
          blendMode: 'normal',
          startTime: 0,
          endTime: duration,
          duration,
          settings: {
            stemId: masterStemId || undefined, // Inherit master stem by default
          },
        };
        addLayer(newLayer);
        
        // Pass the new overlay layer ID so the parent opens the inspector for THIS layer
        onEffectDoubleClick(newOverlayId);
        return; // Don't call onEffectDoubleClick again below
      }
    }
    onEffectDoubleClick(effectId);
  };

  // Find the effect metadata for the header
  const editingEffect = editingEffectId ? effects.find(e => e.id === editingEffectId) : null;
  
  return (
    <EffectsLibrarySidebar
      effects={effects}
      selectedEffects={selectedEffects}
      onEffectToggle={onEffectToggle}
      onEffectDoubleClick={handleEffectDoubleClick}
      isVisible={isVisible}
      // Inspector mode props
      editingEffectId={editingEffectId}
      editingEffect={editingEffect}
      editingEffectInstance={editingEffectInstance}
      activeSliderValues={activeSliderValues}
      baseParameterValues={baseParameterValues}
      onParameterChange={onParameterChange}
      onBack={onBack}
      mappings={mappings}
      featureNames={featureNames}
      onMapFeature={onMapFeature}
      onUnmapFeature={onUnmapFeature}
      onModulationAmountChange={onModulationAmountChange}
      // ImageSlideshow specific props
      projectId={projectId}
      availableFiles={availableFiles}
      activeCollectionId={activeCollectionId}
      setActiveCollectionId={setActiveCollectionId}
      modulatedParameterValues={modulatedParameterValues}
      layers={layersProp || layers}
      setActiveParam={setActiveParam}
      availableStems={availableStems}
      masterStemId={masterStemId}
      onLayerUpdate={onLayerUpdate}
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

  // Effects carousel state (now for timeline-based effects) - from store
  const { 
    selectedEffects, 
    setSelectedEffects,
    aspectRatio: visualizerAspectRatio,
    setAspectRatio: setVisualizerAspectRatio,
    mappings,
    setMappings,
    baseParameterValues,
    activeSliderValues,
    setActiveSliderValues,
    setBaseParam,
    setActiveParam
  } = useVisualizerStore();

  // Effect parameter modal state (kept for imageSlideshow special handling)
  const [openEffectModals, setOpenEffectModals] = useState<Record<string, boolean>>({
    'metaballs': false,
    'particleNetwork': false
  });
  
  // Inspector mode state - track which effect is being edited in the sidebar
  const [editingEffectId, setEditingEffectId] = useState<string | null>(null);

  // Feature mapping state - now from visualizerStore
  const [featureNames, setFeatureNames] = useState<Record<string, string>>({});
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | undefined>();
  // Base (user-set) parameter values from store, modulated values still local (transient)
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

  // Unified URL fetching queue system - prevents ERR_INSUFFICIENT_RESOURCES
  const fetchQueueRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);
  const fetchedIdsRef = useRef<Set<string>>(new Set());

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
      limit: 1000, // Increased from 200 to ensure we find all assets
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

  // Asset Refresher: Fix expired signed URLs for Image Slideshow layers
  useEffect(() => {
    // Only run if we have files and layers populated
    if (!projectFiles?.files || !isInitialized || layers.length === 0) return;

    const refreshAssets = () => {
      let updatesMade = false;
      const files = projectFiles.files;
      const fileIdMap = new Map(files.map(f => [f.id, f.downloadUrl]));
      
      // Iterate layers to find ImageSlideshow effects with expired/mismatched URLs
      const updatedLayers = layers.map(layer => {
        if (layer.effectType === 'imageSlideshow' && layer.settings?.images?.length > 0) {
          const currentImages = layer.settings.images as string[];
          let newImages: string[] = [];
          let layerModified = false;

          // STRATEGY 0: Collection Match (The "Manual Click" Fix)
          // If we know the collection ID, just get all fresh URLs for that collection.
          if (layer.settings.collectionId) {
            const collectionFiles = files.filter(f => f.collection_id === layer.settings.collectionId && f.downloadUrl);
            
            if (collectionFiles.length > 0) {
              // Sort by name or creation to ensure consistent order if needed, 
              // or just rely on the API order which matches the manual behavior
              newImages = collectionFiles.map(f => f.downloadUrl) as string[];
              
              // If the fresh list is different from current (expired) list, apply it
              if (JSON.stringify(newImages) !== JSON.stringify(currentImages)) {
                debugLog.log('🔄 Strategy 0 (Collection) matched for layer', layer.id);
                layerModified = true;
              }
            }
          }

          // STRATEGY 1: Stored IDs (Fallback)
          if (!layerModified && layer.settings.imageIds && Array.isArray(layer.settings.imageIds)) {
            newImages = layer.settings.imageIds.map((id: string) => fileIdMap.get(id)).filter(Boolean) as string[];
            if (newImages.length > 0 && JSON.stringify(newImages) !== JSON.stringify(currentImages)) {
              debugLog.log('🔄 Strategy 1 (IDs) matched for layer', layer.id);
              layerModified = true;
            }
          } 
          
          // STRATEGY 2: Filename Heuristic (Last Resort)
          if (!layerModified && (!newImages || newImages.length === 0)) {
            newImages = currentImages.map(url => {
              if (!url.includes('cloudflarestorage') && !url.includes('phonoglyph')) return url;
              const urlFilename = url.split('?')[0].split('/').pop();
              if (!urlFilename) return url;

              const found = files.find(f => {
                if (!f.downloadUrl) return false;
                const fileFilename = f.downloadUrl.split('?')[0].split('/').pop();
                return fileFilename && (fileFilename.includes(urlFilename) || urlFilename.includes(fileFilename));
              });
              
              return (found && found.downloadUrl) ? found.downloadUrl : url;
            });
            
            if (JSON.stringify(newImages) !== JSON.stringify(currentImages)) {
              debugLog.log('🔄 Strategy 2 (Filename) matched for layer', layer.id);
              layerModified = true;
            }
          }

          if (layerModified && newImages.length > 0) {
            updatesMade = true;
            return {
              ...layer,
              settings: {
                ...layer.settings,
                images: newImages
              }
            };
          }
        }
        return layer;
      });

      if (updatesMade) {
        debugLog.log('✅ Asset Refresher applied updates to layers');
        // Apply updates to individual layers to avoid race conditions
        updatedLayers.forEach(l => {
          const original = layers.find(old => old.id === l.id);
          if (original && JSON.stringify(original.settings) !== JSON.stringify(l.settings)) {
            updateLayer(l.id, { settings: l.settings });
          }
        });
      }
    };

    // Debounce slightly to ensure files are fully loaded
    const timer = setTimeout(refreshAssets, 100);
    return () => clearTimeout(timer);
  }, [projectFiles?.files, isInitialized, layers.length, updateLayer]);

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

  // Load analysis for ALL stems (Project Files + Overlay Layer References)
  useEffect(() => {
    // 1. Start with stems from the project
    const idsToLoad = new Set(availableStems.map(s => s.id));
    
    // 2. Add stems referenced in overlay layers
    layers.forEach(layer => {
      if (layer.type === 'overlay') {
        const s = (layer as any).settings;
        const stemId = s?.stemId || s?.stem?.id;
        if (stemId) idsToLoad.add(stemId);
      }
    });

    const uniqueIds = Array.from(idsToLoad);
    if (uniqueIds.length > 0) {
      // Only trigger if we have IDs to load
      audioAnalysis.loadAnalysis(uniqueIds);
    }
  }, [availableStems.length, layers.length]); // Depend on lengths to catch new additions



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

  const triggerRenderMutation = trpc.render.triggerRender.useMutation();
  const getStatus = trpc.render.getRenderStatus.useMutation();

  // State for rendering progress
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [isDownloadReady, setIsDownloadReady] = useState(false);

  const handleExport = async () => {
    if (!currentProjectId) {
      alert('No project selected. Please select a project first.');
      return;
    }

    // Check if we have any files at all
    if (!projectFiles?.files) {
      alert('No files found in project.');
      return;
    }

    try {
      setIsRendering(true);
      setRenderProgress(0);

      const payload = getProjectExportPayload(
        currentProjectId,
        audioAnalysis.cachedAnalysis || [],
        projectFiles.files, // Pass all files, not just audio
        asyncStemUrlMap
      );

      console.log('Export Payload:', payload);
      
      // Trigger render on Lambda
      const result = await triggerRenderMutation.mutateAsync(payload);
      
      console.log('Render result:', result);
      const { renderId, bucketName } = result;

      // Poll for completion
      while (true) {
        // Wait 5 seconds before checking status
        await new Promise(r => setTimeout(r, 5000));

        try {
          // Get render status
          const status = await getStatus.mutateAsync({ renderId, bucketName });

          // Update progress
          const progressPercent = Math.round((status.overallProgress || 0) * 100);
          setRenderProgress(progressPercent);

          // Check for fatal error
          if (status.fatalErrorEncountered) {
            throw new Error('Render failed with a fatal error');
          }

          // Check if done
          if (status.done && status.outputFile) {
            // Show download ready state
            setIsDownloadReady(true);
            
            // Trigger download
            const link = document.createElement('a');
            link.href = status.outputFile;
            link.download = 'render.mp4';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Reset after brief delay
            await new Promise(r => setTimeout(r, 2000));
            setIsRendering(false);
            setRenderProgress(0);
            setIsDownloadReady(false);
            break;
          }
        } catch (error) {
          // Handle rate limit errors and other polling errors
          console.warn('Polling error, retrying...', error);
          // Continue to next iteration (will wait 5s and try again)
          continue;
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsRendering(false);
      setRenderProgress(0);
      setIsDownloadReady(false);
    }
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
      image: '/effects/generative/imageSlideshow.png',
      parameters: {
         triggerValue: 0,
         threshold: 0.5,
         opacity: 1.0,
         position: { x: 0.5, y: 0.5 },
         size: { width: 1.0, height: 1.0 },
         images: [] 
      }
    },
    // Stylize Category Effects
    { 
      id: 'asciiFilter', 
      name: 'ASCII Filter', 
      description: 'Converts input to ASCII art with audio-reactive parameters',
      category: 'Stylize',
      rarity: 'Rare',
      parameters: {
        textSize: 0.4,
        gamma: 1.2,
        opacity: 0.87,
        contrast: 1.4,
        invert: 0.0,
        hideBackground: false,
        color: [1.0, 1.0, 1.0]
      }
    },
    { 
      id: 'chromaticAbberation', 
      name: 'Chromatic Abberation', 
      description: 'RGB color channel offset for lens distortion effect',
      category: 'Stylize',
      rarity: 'Common',
      parameters: {
        amount: 0.2,
        direction: 0.0
      }
    },
    { 
      id: 'crt', 
      name: 'CRT Monitor', 
      description: 'Vintage CRT monitor effect with phosphors and scanlines',
      category: 'Stylize',
      rarity: 'Rare',
      parameters: {
        curvature: 0.0,
        scanlines: 0.5,
        vignetteIntensity: 0.5,
        noise: 0.5
      }
    },
    { 
      id: 'dither', 
      name: 'Dither', 
      description: 'Ordered dithering for retro pixelart look',
      category: 'Stylize',
      rarity: 'Common',
      parameters: {
        bayerMatrix: 4,
        colors: 16,
        scale: 1.0
      }
    },
    { 
      id: 'glitch', 
      name: 'Digital Glitch', 
      description: 'VHS-style digital glitch with corruption and aberration',
      category: 'Stylize',
      rarity: 'Rare',
      parameters: {
        blockSize: 0.5,
        offset: 0.5,
        chromatic: 0.5,
        frequency: 0.5
      }
    },
    { 
      id: 'grain', 
      name: 'Film Grain', 
      description: 'Adds film grain noise for vintage look',
      category: 'Stylize',
      rarity: 'Common',
      parameters: {
        amount: 0.5,
        size: 1.0,
        colorized: false,
        luminance: false
      }
    },
    { 
      id: 'halftone', 
      name: 'Halftone', 
      description: 'CMYK halftone printing effect',
      category: 'Stylize',
      rarity: 'Rare',
      parameters: {
        dotSize: 0.75,
        angle: 0.0,
        shape: 'circle',
        smoothness: 0.75
      }
    },
    { 
      id: 'pixelate', 
      name: 'Pixelate', 
      description: 'Mosaic pixelation effect',
      category: 'Stylize',
      rarity: 'Common',
      parameters: {
        pixelSize: 0.5,
        shape: 'square'
      }
    },
    { 
      id: 'posterize', 
      name: 'Posterize', 
      description: 'Reduces color levels for poster art effect',
      category: 'Stylize',
      rarity: 'Common',
      parameters: {
        levels: 8,
        gamma: 1.0
      }
    },
    // Blur Category Effects
    { 
      id: 'blur', 
      name: 'Gaussian Blur', 
      description: 'Smooth Gaussian blur with configurable intensity',
      category: 'Blur',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        radius: 5.0,
        quality: 1.0
      }
    },
    { 
      id: 'radialBlur', 
      name: 'Radial Blur', 
      description: 'Rotational blur around a center point',
      category: 'Blur',
      rarity: 'Rare',
      parameters: {
        intensity: 0.4,
        centerX: 0.5,
        centerY: 0.5,
        angle: 10.0
      }
    },
    { 
      id: 'bokeh', 
      name: 'Bokeh Blur', 
      description: 'Depth-of-field bokeh blur effect',
      category: 'Blur',
      rarity: 'Mythic',
      parameters: {
        intensity: 0.5,
        focalDepth: 0.5,
        aperture: 0.8
      }
    },
    { 
      id: 'diffusion', 
      name: 'Diffusion', 
      description: 'Soft diffusion glow effect',
      category: 'Blur',
      rarity: 'Rare',
      parameters: {
        intensity: 0.5,
        size: 1.5
      }
    },
    { 
      id: 'fog', 
      name: 'Fog', 
      description: 'Animated fog effect with noise',
      category: 'Blur',
      rarity: 'Rare',
      parameters: {
        density: 0.3,
        speed: 0.5,
        color: [1.0, 1.0, 1.0]
      }
    },
    { 
      id: 'progressiveBlur', 
      name: 'Progressive Blur', 
      description: 'Blur that increases with distance from center',
      category: 'Blur',
      rarity: 'Rare',
      parameters: {
        intensity: 0.6,
        centerX: 0.5,
        centerY: 0.5
      }
    },
    // Distort Category Effects
    { 
      id: 'bulge', 
      name: 'Bulge', 
      description: 'Bulge/pinch distortion effect',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.4
      }
    },
    { 
      id: 'fbm', 
      name: 'FBM Distortion', 
      description: 'Fluid marble-like distortion using Fractal Brownian Motion',
      category: 'Distort',
      rarity: 'Rare',
      parameters: {
        intensity: 0.5,
        speed: 0.5,
        scale: 1.0
      }
    },
    { 
      id: 'liquify', 
      name: 'Liquify', 
      description: 'Sine-based liquid distortion effect',
      category: 'Distort',
      rarity: 'Rare',
      parameters: {
        intensity: 0.5,
        frequency: 1.0,
        speed: 0.5
      }
    },
    { 
      id: 'noise', 
      name: 'BCC Noise', 
      description: 'Body-Centered Cubic noise distortion',
      category: 'Distort',
      rarity: 'Rare',
      parameters: {
        intensity: 0.5,
        scale: 1.0,
        speed: 0.5
      }
    },
    { 
      id: 'polar', 
      name: 'Polar', 
      description: 'Cartesian to polar coordinates transformation',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 1.0,
        rotation: 0.0,
        centerX: 0.5,
        centerY: 0.5
      }
    },
    { 
      id: 'ripple', 
      name: 'Ripple', 
      description: 'Concentric ripple distortion',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.05,
        frequency: 10.0,
        speed: 1.0,
        centerX: 0.5,
        centerY: 0.5
      }
    },
    { 
      id: 'sineWaves', 
      name: 'Sine Waves', 
      description: 'Sinusoidal wave distortion',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        frequency: 20.0,
        speed: 0.5,
        waveX: true,
        waveY: true
      }
    },
    { 
      id: 'skybox', 
      name: 'Skybox Projection', 
      description: 'Equirectangular 360 projection',
      category: 'Distort',
      rarity: 'Rare',
      parameters: {
        fov: 90.0,
        rotationX: 0.5,
        rotationY: 0.5,
        zoom: 1.0
      }
    },
    { 
      id: 'stretch', 
      name: 'Stretch', 
      description: 'Directional stretch/compression distortion',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        angle: 0.0,
        centerX: 0.5,
        centerY: 0.5
      }
    },
    { 
      id: 'swirl', 
      name: 'Swirl', 
      description: 'Swirl/twist distortion effect',
      category: 'Distort',
      rarity: 'Rare',
      parameters: {
        intensity: 0.8,
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.4
      }
    },
    { 
      id: 'trail', 
      name: 'Trail', 
      description: 'Motion trail / afterimage effect',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        decay: 0.9
      }
    },
    { 
      id: 'waterRipples', 
      name: 'Water Ripples', 
      description: 'Water surface ripple simulation',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        speed: 1.0
      }
    },
    { 
      id: 'waves', 
      name: 'Noise Waves', 
      description: 'Perlin noise wave distortion',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        speed: 1.0
      }
    },
    // Misc Category Effects
    { 
      id: 'circle', 
      name: 'Circle', 
      description: 'Circular mask overlay',
      category: 'Misc',
      rarity: 'Common',
      parameters: {
        radius: 0.25,
        feather: 0.1,
        centerX: 0.5,
        centerY: 0.5,
        color: '#661aff',
        opacity: 1.0
      }
    },
    { 
      id: 'glitter', 
      name: 'Glitter', 
      description: 'Voronoi-based sparkle effect',
      category: 'Misc',
      rarity: 'Rare',
      parameters: {
        intensity: 1.0,
        scale: 1.0,
        speed: 0.5
      }
    },
    { 
      id: 'gradientFill', 
      name: 'Gradient Fill', 
      description: 'Two-color gradient fill overlay',
      category: 'Misc',
      rarity: 'Common',
      parameters: {
        color1: '#ff00ff',
        color2: '#00ffff',
        angle: 45.0,
        opacity: 1.0
      }
    },
    { 
      id: 'noiseFill', 
      name: 'Noise Fill', 
      description: 'Procedural noise fill overlay',
      category: 'Misc',
      rarity: 'Common',
      parameters: {
        scale: 2.0,
        speed: 0.5,
        contrast: 1.0,
        opacity: 1.0
      }
    },
    { 
      id: 'pattern', 
      name: 'Pattern', 
      description: 'Procedural pattern generator',
      category: 'Misc',
      rarity: 'Common',
      parameters: {
        scale: 1.0,
        speed: 0.5,
        contrast: 1.0,
        opacity: 1.0
      }
    },
    { 
      id: 'replicate', 
      name: 'Replicate', 
      description: 'Trail and aberration effect',
      category: 'Misc',
      rarity: 'Rare',
      parameters: {
        spacing: 0.35,
        speed: 0.5,
        rotation: 0.0,
        opacity: 1.0
      }
    },
    { 
      id: 'video', 
      name: 'Video Overlay', 
      description: 'Video texture overlay (requires video assignment)',
      category: 'Misc',
      rarity: 'Rare',
      parameters: {
        opacity: 1.0
      }
    },
    { 
      id: 'wisps', 
      name: 'Wisps', 
      description: 'Flowing smoke/wisp effect',
      category: 'Misc',
      rarity: 'Common',
      parameters: {
        speed: 0.5,
        scale: 1.0,
        intensity: 1.0,
        color: '#ffffff'
      }
    },
    // Light Category Effects
    { 
      id: 'beam', 
      name: 'Beam', 
      description: 'Animated scanning light beam',
      category: 'Light',
      rarity: 'Rare',
      parameters: {
        intensity: 1.0,
        speed: 0.5,
        width: 0.5,
        angle: 0.0,
        color: '#661aff'
      }
    },
    { 
      id: 'bloom', 
      name: 'Bloom', 
      description: 'High-quality bloom effect',
      category: 'Light',
      rarity: 'Mythic',
      parameters: {
        intensity: 1.0,
        threshold: 0.5,
        radius: 1.0
      }
    },
    { 
      id: 'godRays', 
      name: 'God Rays', 
      description: 'Volumetric light scattering',
      category: 'Light',
      rarity: 'Mythic',
      parameters: {
        intensity: 1.0,
        decay: 0.96,
        density: 0.5,
        weight: 0.4,
        lightX: 0.5,
        lightY: 0.5
      }
    },
    { 
      id: 'lightTrail', 
      name: 'Light Trail', 
      description: 'Mouse/Touch light trail effect',
      category: 'Light',
      rarity: 'Rare',
      parameters: {
        intensity: 1.0,
        trailLength: 0.8,
        color: '#0082f7'
      }
    },
    { 
      id: 'waterCaustics', 
      name: 'Water Caustics', 
      description: 'Water surface caustics simulation',
      category: 'Light',
      rarity: 'Rare',
      parameters: {
        intensity: 0.8,
        speed: 0.5,
        refraction: 0.5,
        color: '#99b3e6'
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
    // Check if this is a layer ID (from timeline clip) or an effect type (from library)
    const existingLayer = layers.find(l => l.id === effectId);
    
    if (existingLayer) {
      // Double-click on timeline clip: open inspector for this specific instance
      console.log('🎯 [handleEffectDoubleClick] Opening inspector for existing layer:', effectId);
      setEditingEffectId(effectId);
    } else {
      // Double-click on effect card in library: add new effect layer and open its inspector
      const effectDef = effects.find(e => e.id === effectId);
      if (!effectDef) {
        console.warn('Effect definition not found:', effectId);
        return;
      }
      
      // Create a new layer ID for this effect instance
      // Use timestamp + random suffix to guarantee uniqueness
      const newLayerId = `effect-${effectId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const { duration, addLayer, selectLayer } = useTimelineStore.getState();
      
      console.log('🆕 [handleEffectDoubleClick] Creating new effect layer:', {
        effectType: effectId,
        newLayerId,
        existingMappingKeys: Object.keys(mappings).filter(k => k.includes(effectId))
      });
      
      // Add new effect layer to timeline
      // IMPORTANT: Use empty settings {} - the effect class constructor defines its own defaults
      // This ensures new instances don't inherit parameters from previous instances
      addLayer({
        id: newLayerId,
        name: effectDef.name || effectId,
        type: 'effect',
        effectType: effectId,
        src: effectDef.name || effectId,
        settings: {}, // Empty - effect constructor provides defaults
        zIndex: 0,
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
      } as Layer);
      
      // Select the new layer and open its inspector
      selectLayer(newLayerId);
      setEditingEffectId(newLayerId);
      
      console.log('✅ [handleEffectDoubleClick] New layer created and inspector opened:', newLayerId);
    }
  };

  // Handler to close the sidebar Inspector and return to library view
  const handleBackFromInspector = () => {
    setEditingEffectId(null);
  };

  // Get the effect instance from the visualizer for the Inspector
  const getEditingEffectInstance = () => {
    if (!editingEffectId) return null;
    
    // Check if this is an overlay layer - overlays have their own parameter definitions
    const overlayLayer = layers.find(l => l.id === editingEffectId && l.type === 'overlay');
    if (overlayLayer) {
      // Overlay parameter definitions - these match OVERLAY_SETTINGS in HudOverlayParameterModal.tsx
      const overlayParameters: Record<string, Record<string, any>> = {
        waveform: {
          color: overlayLayer.settings?.color || '#4db3fa',
          lineWidth: overlayLayer.settings?.lineWidth || 1,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          dropShadow: overlayLayer.settings?.dropShadow || false,
          shadowColor: overlayLayer.settings?.shadowColor || '#000000',
          shadowBlur: overlayLayer.settings?.shadowBlur || 8,
          outline: overlayLayer.settings?.outline || false,
          outlineColor: overlayLayer.settings?.outlineColor || '#ffffff',
          outlineWidth: overlayLayer.settings?.outlineWidth || 1,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        spectrogram: {
          colorMap: overlayLayer.settings?.colorMap || 'Classic',
          showFrequencyLabels: overlayLayer.settings?.showFrequencyLabels || false,
          brightness: overlayLayer.settings?.brightness || 1,
          contrast: overlayLayer.settings?.contrast || 1,
          scrollSpeed: overlayLayer.settings?.scrollSpeed || 1,
          fftSize: overlayLayer.settings?.fftSize || 2048,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          dropShadow: overlayLayer.settings?.dropShadow || false,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        peakMeter: {
          peakColor: overlayLayer.settings?.peakColor || '#ff0000',
          holdTime: overlayLayer.settings?.holdTime || 1000,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        stereometer: {
          traceColor: overlayLayer.settings?.traceColor || '#00ffff',
          glowIntensity: overlayLayer.settings?.glowIntensity || 0.5,
          pointSize: overlayLayer.settings?.pointSize || 2,
          showGrid: overlayLayer.settings?.showGrid || false,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        oscilloscope: {
          followPitch: overlayLayer.settings?.followPitch || false,
          color: overlayLayer.settings?.color || '#00ff00',
          glowIntensity: overlayLayer.settings?.glowIntensity || 0,
          amplitude: overlayLayer.settings?.amplitude || 1,
          traceWidth: overlayLayer.settings?.traceWidth || 2,
          showGrid: overlayLayer.settings?.showGrid || false,
          gridColor: overlayLayer.settings?.gridColor || '#333333',
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
          lissajous: overlayLayer.settings?.lissajous || false,
        },
        spectrumAnalyzer: {
          barColor: overlayLayer.settings?.barColor || '#00ffff',
          showFrequencyLabels: overlayLayer.settings?.showFrequencyLabels || false,
          fftSize: overlayLayer.settings?.fftSize || 2048,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        vuMeter: {
          color: overlayLayer.settings?.color || '#00ff00',
          style: overlayLayer.settings?.style || 'Needle',
          meterType: overlayLayer.settings?.meterType || 'RMS',
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        chromaWheel: {
          colorScheme: overlayLayer.settings?.colorScheme || 'Classic',
          showNoteNames: overlayLayer.settings?.showNoteNames || false,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        consoleFeed: {
          dataSource: overlayLayer.settings?.dataSource || 'All',
          fontSize: overlayLayer.settings?.fontSize || 12,
          fontColor: overlayLayer.settings?.fontColor || '#00ff00',
          maxLines: overlayLayer.settings?.maxLines || 50,
          scrollSpeed: overlayLayer.settings?.scrollSpeed || 1,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
      };
      
      const effectDef = effects.find(e => e.id === overlayLayer.effectType);
      const overlayType = overlayLayer.effectType as string;
      return {
        id: overlayLayer.id,
        name: effectDef?.name || overlayLayer.name,
        description: effectDef?.description || `${overlayType} overlay visualization`,
        parameters: overlayParameters[overlayType] || {}
      };
    }
    
    // First, check if this is a layer ID and get the effect instance from the visualizer
    // This is the primary path when double-clicking timeline clips
    if (visualizerRef.current) {
      const effectByLayerId = visualizerRef.current.getEffect?.(editingEffectId);
      if (effectByLayerId) {
        // Found the effect instance by layer ID - use its live parameters
        const effectLayer = layers.find(l => l.id === editingEffectId);
        const effectDef = effectLayer ? effects.find(e => e.id === effectLayer.effectType) : null;
        return {
          id: editingEffectId,
          name: effectByLayerId.name,
          description: effectDef?.description || effectByLayerId.description || '',
          parameters: effectByLayerId.parameters
        };
      }
    }
    
    // Fallback: look up the layer and use its settings
    // This handles cases where the effect hasn't been instantiated in the visualizer yet
    const effectLayer = layers.find(l => l.id === editingEffectId);
    if (effectLayer && effectLayer.type === 'effect') {
      const effectDef = effects.find(e => e.id === effectLayer.effectType);
      return {
        id: effectLayer.id,
        name: effectDef?.name || effectLayer.name,
        description: effectDef?.description || '',
        parameters: effectLayer.settings || effectDef?.parameters || {}
      };
    }
    
    return null;
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
  const handleMapFeature = (parameterId: string, featureId: string, stemType?: string) => {
    console.log('🎛️ [page.tsx] handleMapFeature called:', {
      parameterId,
      featureId,
      stemType,
      timestamp: Date.now()
    });
    
    const parsed = parseParamKey(parameterId);
    if (!parsed) {
      console.error('❌ [page.tsx] Invalid parameterId format (cannot parse):', parameterId);
      return;
    }
    const { effectInstanceId: layerOrEffectId, paramName } = parsed;
    
    console.log('🎛️ [page.tsx] Creating mapping:', {
      parameterId,
      featureId,
      parameterName: paramName,
      layerOrEffectId,
      parsedCorrectly: layerOrEffectId && paramName
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
        console.log('🖼️ [page.tsx] Saving triggerSourceId to layer settings:', {
          layerId: layerOrEffectId,
          featureId,
          currentSettings: slideshowLayer.settings
        });
        updateLayer(slideshowLayer.id, {
          ...slideshowLayer,
          settings: {
            ...slideshowLayer.settings,
            triggerSourceId: featureId
          }
        });
        console.log('🖼️ [page.tsx] Layer updated, new settings should include triggerSourceId:', featureId);
      } else {
        console.warn('🖼️ [page.tsx] Could not find slideshow layer for triggerValue mapping:', {
          layerOrEffectId,
          availableLayers: layers.filter(l => l.type === 'effect').map(l => ({ id: l.id, effectType: l.effectType }))
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
    const parsed = parseParamKey(parameterId);
    if (!parsed) {
      console.error('❌ [page.tsx] Invalid parameterId format (cannot parse) in handleUnmapFeature:', parameterId);
      return;
    }
    const { effectInstanceId: layerOrEffectId, paramName } = parsed;
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

  // activeSliderValues now comes from visualizerStore
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

  // Refs to access latest state in animation loop without restarting it
  const layersRef = useRef(layers);
  const mappingsRef = useRef(mappings);
  const baseParameterValuesRef = useRef(baseParameterValues);
  const activeSliderValuesRef = useRef(activeSliderValues);
  const cachedAnalysisRef = useRef(audioAnalysis.cachedAnalysis);

  // Keep refs synced with state changes
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { mappingsRef.current = mappings; }, [mappings]);
  useEffect(() => { baseParameterValuesRef.current = baseParameterValues; }, [baseParameterValues]);
  useEffect(() => { activeSliderValuesRef.current = activeSliderValues; }, [activeSliderValues]);
  useEffect(() => { cachedAnalysisRef.current = audioAnalysis.cachedAnalysis; }, [audioAnalysis.cachedAnalysis]);

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
      
      // Use Refs to get latest state without closure staleness
      const currentLayers = layersRef.current;
      const currentMappings = mappingsRef.current;
      const currentBaseValues = baseParameterValuesRef.current;
      const currentActiveSliderValues = activeSliderValuesRef.current;
      const currentCachedAnalysis = cachedAnalysisRef.current;

      // Get current audio time
      const time = stemAudio.currentTime;
      setCurrentTime(time);
      
      // Sync calculation
      const audioContextTime = stemAudio.getAudioContextTime?.() || 0;
      const scheduledStartTime = stemAudio.scheduledStartTimeRef?.current || 0;
      const measuredLatency = stemAudio.getAudioLatency?.() || 0;
      const audioPlaybackTime = Math.max(0, audioContextTime - scheduledStartTime);
      let syncTime = Math.max(0, audioPlaybackTime - measuredLatency + (syncOffsetMs / 1000));
      
      // Handle audio looping by wrapping syncTime to analysis duration
      if (currentCachedAnalysis.length > 0) {
        const analysisDuration = currentCachedAnalysis[0]?.metadata?.duration || 1;
        if (analysisDuration > 0) {
          syncTime = syncTime % analysisDuration;
        }
      }

      // Cache mappings - only update when mappings actually change
      const newCachedMappings = Object.entries(currentMappings)
          .filter(([, mapping]) => mapping.featureId !== null)
          .map(([paramKey, mapping]) => [paramKey, mapping.featureId!]) as [string, string][];
        
      // Check if mappings actually changed by comparing keys and values
      const mappingsChanged = cachedMappings.length !== newCachedMappings.length ||
        cachedMappings.some(([key, val], idx) => {
          const newMapping = newCachedMappings[idx];
          return !newMapping || newMapping[0] !== key || newMapping[1] !== val;
        }) ||
        newCachedMappings.some(([key, val], idx) => {
          const oldMapping = cachedMappings[idx];
          return !oldMapping || oldMapping[0] !== key || oldMapping[1] !== val;
        });
      
      if (mappingsChanged) {
        const oldMappings = new Map(cachedMappings);
        cachedMappings = newCachedMappings;
        
        // Log when mappings are created or updated (only once)
        const newMappings = cachedMappings.filter(([key, featureId]) => 
          !oldMappings.has(key) || oldMappings.get(key) !== featureId
        );
        const opacityMappings = cachedMappings.filter(([key]) => {
          const parsed = parseParamKey(key);
          return parsed?.paramName === 'opacity';
        });
        
        if (newMappings.length > 0) {
          // Log removed to reduce console spam
        }
      }

      // General Audio Feature Mapping
      if (currentCachedAnalysis && currentCachedAnalysis.length > 0) {
        // Debug: log once per second if we have opacity mappings
        const hasOpacityMapping = cachedMappings.some(([key]) => parseParamKey(key)?.paramName === 'opacity');
        if (hasOpacityMapping && frameCount % 60 === 0) {
          console.log('🎚️ Audio mapping loop active:', {
            cachedMappingsCount: cachedMappings.length,
            opacityMappings: cachedMappings.filter(([key]) => parseParamKey(key)?.paramName === 'opacity').map(([key, id]) => ({ key, id })),
            cachedAnalysisCount: currentCachedAnalysis.length,
            syncTime: syncTime.toFixed(3),
            isPlaying
          });
        }
        
        // Known effect TYPE names (not instance IDs) - these are legacy mappings that should be skipped
        const effectTypeNames = ['metaballs', 'particleNetwork', 'imageSlideshow', 'asciiFilter'];
        
        for (const [paramKey, featureId] of cachedMappings) {
          if (!featureId) continue;

          const parsedKey = parseParamKey(paramKey);
          if (!parsedKey) continue;
          const { effectInstanceId: effectId, paramName } = parsedKey;

          // SKIP legacy mappings that use effect TYPE instead of instance ID
          // These would apply to ALL instances of that effect type, which is wrong
          if (effectTypeNames.includes(effectId)) {
            continue; // Skip this legacy mapping
          }

          const featureStemType = getStemTypeFromFeatureId(featureId);
          if (!featureStemType) {
            if (paramName === 'opacity' && frameCount % 60 === 0) {
              console.warn('⚠️ Could not get stem type from featureId:', { paramKey, featureId });
            }
            continue;
          }

          const stemAnalysis = currentCachedAnalysis?.find(
            a => a.stemType === featureStemType
          );
          if (!stemAnalysis) {
            if (paramName === 'opacity' && frameCount % 60 === 0) {
              console.warn('⚠️ Stem analysis not found:', { paramKey, featureId, featureStemType, availableStems: currentCachedAnalysis.map(a => a.stemType) });
            }
            continue;
          }

          const rawValue = audioAnalysis.getFeatureValue(
            stemAnalysis.fileMetadataId,
            featureId,
            syncTime,
            featureStemType
          );

          if (rawValue === null || rawValue === undefined) {
            if (paramName === 'opacity' && frameCount % 60 === 0) {
              console.warn('⚠️ Raw value is null/undefined:', { paramKey, featureId, syncTime: syncTime.toFixed(3) });
            }
            continue;
          }

          const maxValue = getSliderMax(paramName);
          const knobFull = (currentMappings[paramKey]?.modulationAmount ?? 0.5) * 2 - 1; 
          const knob = Math.max(-0.5, Math.min(0.5, knobFull));
          const baseValue = (currentBaseValues[effectId]?.[paramName] ?? (currentActiveSliderValues[effectId]?.[paramName] ?? 0));
          const delta = rawValue * knob * maxValue;
          const scaledValue = Math.max(0, Math.min(maxValue, baseValue + delta));

          // Log opacity mapping updates every 30 frames (~0.5 seconds at 60fps)
          if (paramName === 'opacity' && frameCount % 30 === 0) {
            console.log('🎚️ Audio mapping calculating opacity:', {
              paramKey,
              effectId,
              paramName,
              featureId,
              rawValue,
              baseValue,
              knob,
              delta,
              scaledValue,
              maxValue,
              syncTime: syncTime.toFixed(3)
            });
          }

          visualizerRef.current.updateEffectParameter(effectId, paramName, scaledValue);
          
          if (frameCount % 10 === 0) {
            setModulatedParameterValues(prev => ({ ...prev, [paramKey]: scaledValue }));
          }
        }
      } else {
        // Log when audio mapping loop doesn't run
        if (cachedMappings.length > 0 && frameCount % 120 === 0) {
          console.warn('⚠️ Audio mapping loop not running:', {
            cachedMappingsCount: cachedMappings.length,
            hasCachedAnalysis: !!currentCachedAnalysis,
            cachedAnalysisLength: currentCachedAnalysis?.length || 0,
            isPlaying
          });
        }
      }
      
      // Handle timeline-specific audio triggers (e.g., Image Slideshow trigger)
      if (currentLayers.length > 0 && currentCachedAnalysis.length > 0) {
        currentLayers.forEach(layer => {
          if (layer.settings && layer.settings.triggerSourceId) {
            const featureId = layer.settings.triggerSourceId;
            const featureStemType = getStemTypeFromFeatureId(featureId);
            
            if (featureStemType) {
              const stemAnalysis = currentCachedAnalysis?.find(
                a => a.stemType === featureStemType
              );
              
              if (stemAnalysis) {
                const rawValue = audioAnalysis.getFeatureValue(
                  stemAnalysis.fileMetadataId,
                  featureId,
                  syncTime,
                  featureStemType
                );
                
                if (rawValue !== undefined) {
                  // Debug log every 30 frames (roughly twice per second at 60fps)
                  if (frameCount % 30 === 0) {
                    console.log('🖼️ [page.tsx] Updating triggerValue:', {
                      layerId: layer.id,
                      featureId,
                      rawValue: rawValue.toFixed(4),
                      syncTime: syncTime.toFixed(2),
                      hasVisualizer: !!visualizerRef.current
                    });
                  }
                  visualizerRef.current?.updateEffectParameter(layer.id, 'triggerValue', rawValue);
                } else {
                  if (frameCount % 60 === 0) {
                    console.warn('🖼️ [page.tsx] rawValue is undefined for trigger:', { layerId: layer.id, featureId });
                  }
                }
              } else {
                if (frameCount % 60 === 0) {
                  console.warn('🖼️ [page.tsx] No stemAnalysis found for trigger:', { layerId: layer.id, featureId, featureStemType });
                }
              }
            } else {
              if (frameCount % 60 === 0) {
                console.warn('🖼️ [page.tsx] No featureStemType for trigger:', { layerId: layer.id, featureId });
              }
            }
          } else {
            // Log once per second if we have slideshow layers without triggerSourceId
            if (frameCount % 60 === 0 && layer.type === 'effect' && layer.effectType === 'imageSlideshow') {
              console.log('🖼️ [page.tsx] Slideshow layer has no triggerSourceId:', {
                layerId: layer.id,
                settings: layer.settings
              });
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
    stemAudio, 
    syncOffsetMs
    // Removed 'layers', 'mappings', etc. from deps to prevent loop restarts.
    // They are accessed via refs inside the loop.
  ]);
  
  const getSliderMax = (paramName: string) => {
    if (paramName === 'base-radius') return 1.0;
    if (paramName === 'animation-speed') return 2.0;
    if (paramName === 'glow-intensity') return 3.0;
    if (paramName === 'hud-opacity') return 1.0;
    if (paramName === 'opacity') return 1.0; // For image slideshow and other effects
    if (paramName === 'max-particles') return 200;
    if (paramName === 'connection-distance') return 5.0;
    if (paramName === 'particle-size') return 50;
    // ASCII Filter parameters
    if (paramName === 'textSize') return 1.0;
    if (paramName === 'gamma') return 2.2;
    if (paramName === 'contrast') return 2.0;
    if (paramName === 'invert') return 1.0;
    // Bloom Filter parameters
    if (paramName === 'intensity') return 2.0;
    if (paramName === 'threshold') return 1.0;
    if (paramName === 'softness') return 1.0;
    if (paramName === 'radius') return 1.0;
    return 100; // Default max for other numeric parameters
  };

  const getSliderStep = (paramName: string) => {
    if (paramName === 'base-radius') return 0.1;
    if (paramName === 'animation-speed') return 0.1;
    if (paramName === 'glow-intensity') return 0.1;
    if (paramName === 'hud-opacity') return 0.1;
    if (paramName === 'opacity') return 0.01; // Fine-grained control for opacity
    if (paramName === 'max-particles') return 10;
    if (paramName === 'connection-distance') return 0.1;
    if (paramName === 'particle-size') return 5;
    // ASCII Filter parameters
    if (paramName === 'textSize') return 0.01;
    if (paramName === 'gamma') return 0.01;
    if (paramName === 'contrast') return 0.01;
    if (paramName === 'invert') return 1.0; // Binary toggle
    // Bloom Filter parameters
    if (paramName === 'intensity') return 0.01;
    if (paramName === 'threshold') return 0.01;
    if (paramName === 'softness') return 0.01;
    if (paramName === 'radius') return 0.01;
    return 1; // Default step for other numeric parameters
  };

  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    const paramKey = makeParamKey(effectId, paramName);

    // Update nested stores
    setBaseParam(effectId, paramName, value);
    setActiveParam(effectId, paramName, value);
    
    // Update the effect instance directly
    if (visualizerRef.current) {
        visualizerRef.current.updateEffectParameter(effectId, paramName, value);
    }
    
    // Also update layer settings for persistence (especially for slideshow position/size/opacity)
    const effectLayer = layers.find(l => l.id === effectId && l.type === 'effect');
    if (effectLayer) {
      updateLayer(effectLayer.id, {
        ...effectLayer,
        settings: {
          ...effectLayer.settings,
          [paramName]: value
        }
      });
    }
    
    // Handle overlay layer settings updates
    const overlayLayer = layers.find(l => l.id === effectId && l.type === 'overlay');
    if (overlayLayer) {
      updateLayer(overlayLayer.id, {
        ...overlayLayer,
        settings: {
          ...overlayLayer.settings,
          [paramName]: value
        }
      });
    }
  };

  // Effect modals are no longer needed - all effects use the sidebar Inspector
  const effectModals: React.ReactNode[] = [];

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


  // Merge project files with any "orphaned" stems found in analysis cache (for UI labels)
  const allStemsForUI = React.useMemo(() => {
    const baseStems = sortStemsWithMasterLast(availableStems);
    
    // Find stems in cachedAnalysis that aren't in baseStems
    const recoveredStems = (audioAnalysis.cachedAnalysis || [])
      .filter(a => !baseStems.find(s => s.id === a.fileMetadataId))
      .map(a => ({
        id: a.fileMetadataId,
        file_name: `Recovered ${a.stemType || 'Stem'}`,
        stem_type: a.stemType,
        is_master: false
      }));
      
    return [...baseStems, ...recoveredStems];
  }, [availableStems, audioAnalysis.cachedAnalysis]);

  // Log audio files before building stemUrlMap
  useEffect(() => {
    debugLog.log('[CreativeVisualizerPage] projectAudioFiles.files:', projectAudioFiles?.files);
  }, [projectAudioFiles?.files]);

  // State for asynchronously built stemUrlMap
  const [asyncStemUrlMap, setAsyncStemUrlMap] = useState<Record<string, string>>({});

  // Unified URL fetching queue system - Single Source of Truth to prevent ERR_INSUFFICIENT_RESOURCES
  useEffect(() => {
    if (!projectAudioFiles?.files || !isInitialized || !getDownloadUrlMutation) return;

    const processQueue = async () => {
      if (isFetchingRef.current) return;

      // 1. Gather all IDs needed (Audio files + Overlay Stems + Image Slideshows)
      const neededIds = new Set<string>();

      // A. Audio Files in Project
      projectAudioFiles.files.forEach(f => {
        if (f.upload_status === 'completed' && !f.downloadUrl) {
          neededIds.add(f.id);
        }
      });

      // B. Overlay Stems
      layers.forEach(layer => {
        if (layer.type === 'overlay') {
          const s = (layer as any).settings;
          const stemId = s?.stemId || s?.stem?.id;
          // If we don't have a URL in our map, or the URL in settings is expired/R2-signed
          const currentUrl = asyncStemUrlMap[stemId] || s?.stem?.url;
          const isExpired = currentUrl && currentUrl.includes('cloudflarestorage') && !asyncStemUrlMap[stemId];

          if (stemId && (!currentUrl || isExpired)) {
            neededIds.add(stemId);
          }
        }

        // C. Image Slideshows (Refresh expired images)
        if (layer.effectType === 'imageSlideshow' && layer.settings?.imageIds) {
          layer.settings.imageIds.forEach((id: string) => {
            // Check if we need this ID (similar logic to overlay stems)
            const currentUrl = layer.settings?.images?.[layer.settings.imageIds.indexOf(id)];
            const isExpired = currentUrl && currentUrl.includes('cloudflarestorage');
            if (id && (!currentUrl || isExpired)) {
              neededIds.add(id);
            }
          });
        }
      });

      // Filter out IDs we've already fetched or are currently fetching
      const uniqueIds = Array.from(neededIds).filter(id => !fetchedIdsRef.current.has(id));

      if (uniqueIds.length === 0) return;

      isFetchingRef.current = true;

      // STAGE 2: SERIALIZED BATCH FETCHING
      // Strictly process 3 items at a time with a hard delay to fix ERR_INSUFFICIENT_RESOURCES
      const BATCH_SIZE = 3;
      const DELAY_MS = 200;

      try {
        for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
          const batch = uniqueIds.slice(i, i + BATCH_SIZE);
          debugLog.log(`🔌 Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}:`, batch);

          const results = await Promise.allSettled(
            batch.map(id => getDownloadUrlMutation.mutateAsync({ fileId: id }))
          );

          const newUrls: Record<string, string> = {};

          results.forEach((res, index) => {
            const id = batch[index];
            fetchedIdsRef.current.add(id); // Mark as processed regardless of success to prevent infinite loops

            if (res.status === 'fulfilled' && res.value.downloadUrl) {
              newUrls[id] = res.value.downloadUrl;
            }
          });

          // Update State incrementally
          if (Object.keys(newUrls).length > 0) {
            setAsyncStemUrlMap(prev => ({ ...prev, ...newUrls }));

            // Also update layers immediately if they needed these specific URLs
            layers.forEach(layer => {
              if (layer.type === 'overlay') {
                const settings = (layer as any).settings || {};
                const stemId = settings.stemId || settings.stem?.id;
                if (stemId && newUrls[stemId]) {
                  updateLayer(layer.id, {
                    settings: {
                      ...settings,
                      stem: {
                        ...(settings.stem || {}),
                        id: stemId,
                        url: newUrls[stemId]
                      }
                    }
                  });
                }
              }
            });
          }

          // Hard wait between batches
          if (i + BATCH_SIZE < uniqueIds.length) {
            await new Promise(r => setTimeout(r, DELAY_MS));
          }
        }
      } catch (e) {
        debugLog.error("Batch fetch failed", e);
      } finally {
        isFetchingRef.current = false;
      }
    };

    // Debounce the queue processing
    const timer = setTimeout(processQueue, 1000);
    return () => clearTimeout(timer);
  }, [projectAudioFiles?.files, layers, isInitialized, getDownloadUrlMutation, asyncStemUrlMap, updateLayer]);

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
      {currentProjectId ? (
        <AutoSaveProvider projectId={currentProjectId}>
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
                
              </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <AutoSaveTopBar />
                <AspectRatioSelector
                  currentAspectRatio={visualizerAspectRatio}
                  onAspectRatioChange={setVisualizerAspectRatio}
                  disabled={stemLoadingState}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport}
                  disabled={isRendering}
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-2 py-1 ${
                    isRendering ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  <Download className="h-3 w-3 mr-1" />
                  {isDownloadReady 
                    ? 'DOWNLOAD READY' 
                    : isRendering 
                      ? `RENDERING... ${renderProgress}%` 
                      : 'EXPORT'}
                </Button>
                  
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
                          baseParameterValues={baseParameterValues}
                          setActiveSliderValues={setActiveSliderValues}
                          setBaseParam={setBaseParam}
                          onLayerUpdate={updateLayer}
                      onSelectedEffectsChange={() => {}} // <-- Added no-op
                      visualizerRef={visualizerRef}
                  >
                    {/* HUD Overlays rendered inside canvas container so they're constrained to canvas bounds */}
                    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                      <HudOverlayRenderer 
                        stemUrlMap={asyncStemUrlMap} 
                        cachedAnalysis={audioAnalysis.cachedAnalysis || []}
                      />
                    </div>
                  </ThreeVisualizer>


                      {/* Visualizer content only - no modals here */}
                </div>
                </div>
                
                {/* Unified Timeline */}
                <div className="flex-shrink-0 mb-4">
                  <UnifiedTimeline
                    stems={allStemsForUI}
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
                    onLayerDoubleClick={handleEffectDoubleClick}
                    className="bg-stone-800 border border-gray-700"
                  />
                </div>
            </div>
          </div>

              {/* Effect parameter modals - positioned relative to editor-bounds */}
              {effectModals}
            </div>

            {/* Right Effects Sidebar */}
            <CollapsibleEffectsSidebar
              expandedWidth={
                // Wider sidebar when editing imageSlideshow
                (editingEffectId === 'imageSlideshow' || 
                 layers.find(l => l.id === editingEffectId && l.effectType === 'imageSlideshow'))
                  ? 'w-[360px]' 
                  : 'w-[260px]'
              }
            >
              <EffectsLibrarySidebarWithHud
                effects={effects}
                selectedEffects={selectedEffects}
                onEffectToggle={handleSelectEffect}
                onEffectDoubleClick={handleEffectDoubleClick}
                isVisible={true}
                stemUrlsReady={stemUrlsReady}
                // Inspector mode props
                editingEffectId={editingEffectId}
                editingEffectInstance={getEditingEffectInstance()}
                activeSliderValues={activeSliderValues}
                baseParameterValues={baseParameterValues}
                onParameterChange={handleParameterChange}
                onBack={handleBackFromInspector}
                mappings={mappings}
                featureNames={featureNames}
                onMapFeature={handleMapFeature}
                onUnmapFeature={handleUnmapFeature}
                onModulationAmountChange={handleModulationAmountChange}
                // ImageSlideshow specific props
                projectId={currentProjectId || ''}
                availableFiles={projectFiles?.files || []}
                activeCollectionId={activeCollectionId}
                setActiveCollectionId={setActiveCollectionId}
                modulatedParameterValues={modulatedParameterValues}
                layers={layers}
                setActiveParam={setActiveParam}
                aspectRatio={visualizerAspectRatio}
                masterStemId={projectAudioFiles?.files?.find(f => f.is_master)?.id ?? null}
                availableStems={allStemsForUI}
                onLayerUpdate={updateLayer}
              />
            </CollapsibleEffectsSidebar>



        </main>
      </div>
      </DndProvider>
        </AutoSaveProvider>
      ) : (
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
              <div className="flex-1 flex items-center justify-center text-stone-400">
                <p>Please select or create a project to begin</p>
              </div>
            </main>
          </div>
        </DndProvider>
      )}
    </>
  );
}

export default function CreativeVisualizerPageWithSuspense() {
  return (
    <Suspense>
      <CreativeVisualizerPage />
    </Suspense>
  );
}