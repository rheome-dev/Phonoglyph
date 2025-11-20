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