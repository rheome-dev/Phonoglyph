'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Zap, Palette, Settings2, Eye, EyeOff, Info, Map } from 'lucide-react';
import { ThreeVisualizer } from '@/components/midi/three-visualizer';
import { EffectCarousel } from '@/components/ui/effect-carousel';
import { MappingEditor } from '@/components/stem-visualization/mapping-editor';
import { FileSelector } from '@/components/midi/file-selector';
import { MIDIData, VisualizationSettings, DEFAULT_VISUALIZATION_SETTINGS } from '@/types/midi';
import { VisualizationPreset, StemVisualizationMapping } from '@/types/stem-visualization';
import { AudioAnalysisData } from '@/types/visualizer';
import { trpc } from '@/lib/trpc';
import { CollapsibleSidebar } from '@/components/layout/collapsible-sidebar';
import { ProjectPickerModal } from '@/components/projects/project-picker-modal';
import { ProjectCreationModal } from '@/components/projects/project-creation-modal';
import { useStemAudioController } from '@/hooks/use-stem-audio-controller';
import { useCachedStemAnalysis } from '@/hooks/use-cached-stem-analysis';
import { StemWaveformPanel } from '@/components/stem-visualization/stem-waveform-panel';
import { DEFAULT_PRESETS } from '@/lib/default-visualization-mappings';
import { DraggableModal } from '@/components/ui/draggable-modal';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

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

export default function CreativeVisualizerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [useDemoData, setUseDemoData] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [settings, setSettings] = useState<VisualizationSettings>(DEFAULT_VISUALIZATION_SETTINGS);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(60);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<VisualizationPreset>(DEFAULT_PRESETS[0]);
  const [performanceMode, setPerformanceMode] = useState<'master-only' | 'all-stems'>('master-only');

  // Effects carousel state
  const [selectedEffects, setSelectedEffects] = useState<Record<string, boolean>>({
    'metaballs': true,
    'midiHud': true,
    'particleNetwork': true
  });

  // Visualizer aspect ratio toggle state
  const [visualizerAspectRatio, setVisualizerAspectRatio] = useState<'mobile' | 'youtube'>('mobile');

  // Effect parameter modal state
  const [openEffectModals, setOpenEffectModals] = useState<Record<string, boolean>>({
    'metaballs': false,
    'midiHud': false,
    'particleNetwork': false
  });

  const [sampleMidiData] = useState<MIDIData>(createSampleMIDIData());
  const stemAudio = useStemAudioController();
  const cachedStemAnalysis = useCachedStemAnalysis();
  
  // Enhanced audio analysis data
  const [audioAnalysisData, setAudioAnalysisData] = useState<any>(null);
  
  const [showPicker, setShowPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isLoadingStemsRef = useRef(false);

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

  // Fetch project files to get available stems
  const { 
    data: projectFiles, 
    isLoading: projectFilesLoading 
  } = trpc.file.getUserFiles.useQuery(
    { 
      limit: 20, 
      fileType: 'all',
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

  // Load stems when project files are available
  useEffect(() => {
    if (!isInitialized || !projectFiles?.files || !currentProjectId || isLoadingStemsRef.current || stemAudio.stemsLoaded) {
      return;
    }

    const audioFiles = projectFiles.files.filter(file => 
      file.file_type === 'audio' && file.upload_status === 'completed'
    );

    if (audioFiles.length > 0) {
      let cancelled = false;
      isLoadingStemsRef.current = true;
      
      const loadStemsWithUrls = async () => {
        try {
          // Add delay to prevent rapid successive calls
          await new Promise(resolve => setTimeout(resolve, 200));
          
          if (cancelled) {
            return;
          }

          // Process files sequentially with retry logic to avoid overwhelming the API
          const stems: Array<{ id: string; url: string; label: string }> = [];
          
          // Sort files to prioritize master track (usually contains "master" or "mix" in filename)
          const sortedFiles = [...audioFiles].sort((a, b) => {
            const aName = a.file_name.toLowerCase();
            const bName = b.file_name.toLowerCase();
            
            // Master track gets priority
            if (aName.includes('master') || aName.includes('mix') || aName.includes('full')) return -1;
            if (bName.includes('master') || bName.includes('mix') || bName.includes('full')) return 1;
            
            return 0;
          });
          
          // In performance mode, only load the first (master) track
          const filesToProcess = performanceMode === 'master-only' ? sortedFiles.slice(0, 1) : sortedFiles;
          
          for (const file of filesToProcess) {
            if (cancelled) {
              break;
            }
            
            // Skip if we already have this stem loaded
            const stemId = file.file_name.toLowerCase().replace(/\.[^/.]+$/, '');
            if (stems.some(s => s.id === stemId)) {
              continue;
            }
            
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries && !cancelled) {
              try {
                const downloadUrlResult = await getDownloadUrlMutation.mutateAsync({ fileId: file.id });
                
                stems.push({
                  id: file.file_name.toLowerCase().replace(/\.[^/.]+$/, ''),
                  url: downloadUrlResult.downloadUrl,
                  label: file.file_name
                });
                break; // Success, exit retry loop
              } catch (error) {
                retryCount++;
                
                if (retryCount >= maxRetries) {
                  console.error(`Failed to get download URL for file ${file.file_name} after ${maxRetries} attempts`);
                  // Don't add to stems array, continue with next file
                } else {
                  // Wait before retry with exponential backoff
                  const waitTime = Math.pow(2, retryCount) * 1000;
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                }
              }
            }
          }
          
          if (!cancelled && stems.length > 0) {
            try {
              await stemAudio.loadStems(stems);
            } catch (stemError) {
              console.error('Failed to load stems into audio controller:', stemError);
            }
          } else if (stems.length === 0) {
            console.warn('No valid stems could be loaded');
          } else if (cancelled) {
            console.log('Stem loading was cancelled');
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Failed to load stems:', error);
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
  }, [projectFiles?.files, currentProjectId, isInitialized, performanceMode]); // Removed cachedAnalysis from dependencies

  // Load cached analysis after stems are loaded
  useEffect(() => {
    if (stemAudio.stemsLoaded && projectFiles?.files) {
      const audioFiles = projectFiles.files.filter(file => 
        file.file_type === 'audio' && file.upload_status === 'completed'
      );
      
      if (audioFiles.length > 0) {
        cachedStemAnalysis.loadAnalysis(audioFiles.map(stem => stem.id));
      }
    }
  }, [stemAudio.stemsLoaded, projectFiles?.files]);

  // Update audio analysis data from cached analysis
  useEffect(() => {
    const cachedData = cachedStemAnalysis.cachedAnalysis;
    if (cachedData) {
      setAudioAnalysisData(cachedData);
    } else if (stemAudio.visualizationData) {
      setAudioAnalysisData(stemAudio.visualizationData);
    }
  }, [cachedStemAnalysis.cachedAnalysis, stemAudio.visualizationData]);



  const midiData = useDemoData ? sampleMidiData : (fileData?.midiData ? transformBackendToFrontendMidiData(fileData.midiData) : undefined);
  const visualizationSettings = useDemoData ? DEFAULT_VISUALIZATION_SETTINGS : (fileData?.settings || DEFAULT_VISUALIZATION_SETTINGS);

  const handleFileSelected = (fileId: string) => {
    setSelectedFileId(fileId);
    setUseDemoData(false);
    setCurrentTime(0);
    setIsPlaying(false);
    
    const params = new URLSearchParams(searchParams);
    params.set('fileId', fileId);
    router.push(`/creative-visualizer?${params.toString()}`, { scroll: false });
  };

  const handleDemoModeChange = useCallback((demoMode: boolean) => {
    setUseDemoData(demoMode);
    setCurrentTime(0);
    setIsPlaying(false);
    
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
      setIsPlaying(false);
    } else {
      // Only start if we have stems loaded
      if (hasStems) {
        try {
          await stemAudio.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Failed to start audio playback:', error);
          setIsPlaying(false);
        }
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handleReset = () => {
    stemAudio.stop();
    setIsPlaying(false);
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
    setShowPicker(true);
  };

  const availableStems = projectFiles?.files?.filter(file => 
    file.file_type === 'audio' && file.upload_status === 'completed'
  ) || [];


  // Load all analyses when stems are available
  useEffect(() => {
    if (availableStems.length > 0) {
      const stemIds = availableStems.map(stem => stem.id);
      cachedStemAnalysis.loadAnalysis(stemIds);
    }
  }, [availableStems.length, availableStems.map(stem => stem.id).join(',')]);

  // Check if stems are actually loaded in the audio controller, not just available in the project
  const hasStems = availableStems.length > 0 && stemAudio.stemsLoaded;
  
  // Check if we're currently loading stems
  const stemLoadingState = availableStems.length > 0 && !stemAudio.stemsLoaded;

  // Effects data for carousel
  const effects = [
    { id: 'metaballs', name: 'Metaballs Effect', description: 'Organic, fluid-like visualizations that respond to audio intensity' },
    { id: 'midiHud', name: 'HUD Effect', description: 'Technical overlay displaying real-time audio analysis and MIDI data' },
    { id: 'particleNetwork', name: 'Particle Effect', description: 'Dynamic particle systems that react to rhythm and pitch' }
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

  const handleCloseEffectModal = (effectId: string) => {
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: false
    }));
  };

  const handlePresetChange = (preset: VisualizationPreset) => {
    setCurrentPreset(preset);
  };

  const handleMappingUpdate = (stemType: string, mapping: StemVisualizationMapping) => {
    // Update the current preset with new mapping
    const updatedPreset = {
      ...currentPreset,
      mappings: {
        ...currentPreset.mappings,
        [stemType]: mapping
      }
    };
    setCurrentPreset(updatedPreset);
  };

  const handleStemMute = (stemType: string, muted: boolean) => {
    // Handle stem muting
    // TODO: Implement stem muting functionality
  };

  const handleStemSolo = (stemType: string, solo: boolean) => {
    // Handle stem solo
    // TODO: Implement stem solo functionality
  };



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
      {/* Main visualizer UI */}
      <div className="flex h-screen bg-stone-800 text-white min-w-0">
        <CollapsibleSidebar>
          <FileSelector 
            onFileSelected={handleFileSelected}
            selectedFileId={selectedFileId || undefined}
            useDemoData={useDemoData}
            onDemoModeChange={handleDemoModeChange}
            projectId={currentProjectId || undefined}
            projectName={projectData?.name}
          />
        </CollapsibleSidebar>
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Project Header */}
          {projectData && (
            <div className="px-4 py-3 bg-stone-950/80 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard')}
                    className="text-stone-400 hover:text-white hover:bg-stone-800/50"
                  >
                    ← Back to Dashboard
                  </Button>
                  <div className="h-4 w-px bg-stone-600" />
                  <h1 className="text-lg font-semibold text-white">{projectData.name}</h1>
                  {projectData.description && (
                    <span className="text-sm text-stone-400">- {projectData.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className="text-xs uppercase tracking-wide border-stone-600 text-stone-300"
                  >
                    {projectData.privacy_setting}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          {/* Top Control Bar */}
          <div className="p-4 bg-stone-900/50 border-b border-white/10">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                <Button 
                  onClick={handlePlayPause} 
                  size="lg" 
                  disabled={stemLoadingState}
                  className={`font-sans text-sm uppercase tracking-wider px-6 py-3 transition-all duration-300 ${
                    stemLoadingState 
                      ? 'bg-stone-600 text-stone-400 cursor-not-allowed' 
                      : 'bg-stone-700 hover:bg-stone-600'
                  }`}
                >
                  {stemLoadingState ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
                      LOADING AUDIO
                    </>
                  ) : (
                    <>
                      {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      {isPlaying ? 'PAUSE' : 'PLAY'}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={stemLoadingState}
                  onClick={() => stemAudio.setLooping(!stemAudio.isLooping)}
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-sans text-xs uppercase tracking-wider ${
                    stemLoadingState 
                      ? 'opacity-50 cursor-not-allowed' 
                      : stemAudio.isLooping ? 'bg-emerald-900/20 border-emerald-600 text-emerald-300' : ''
                  }`}
                  style={{ borderRadius: '8px' }}
                >
                  🔄 {stemAudio.isLooping ? 'LOOP ON' : 'LOOP OFF'}
                </Button>
                <Button 
                  variant="outline" 
                  disabled={stemLoadingState}
                  onClick={handleReset} 
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 ${
                    stemLoadingState ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  RESET
                </Button>
                
                {/* Stats Section - Compact layout */}
                <div className="flex items-center gap-1 overflow-hidden">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-2 rounded-lg text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {currentTime.toFixed(1)}S / {(midiData || sampleMidiData).file.duration.toFixed(1)}S
                  </div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-2 rounded-lg text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    FPS: {fps}
                  </div>
                  {stemAudio.performanceMetrics && (
                    <div className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-2 rounded-lg text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      LAT: {stemAudio.performanceMetrics.analysisLatency.toFixed(1)}ms
                    </div>
                  )}
                  {stemAudio.deviceProfile && (
                    <div className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-2 rounded-lg text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      {stemAudio.deviceProfile.toUpperCase()}
                    </div>
                  )}
                  <div className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-2 rounded-lg text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    NOTES: {(midiData || sampleMidiData).tracks.reduce((sum, track) => sum + track.notes.length, 0)}
                  </div>
                  {hasStems && (
                    <div className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-2 rounded-lg text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      STEMS: {availableStems.length}
                    </div>
                  )}
                  <Badge className="bg-emerald-900/80 text-emerald-200 text-xs uppercase tracking-wide px-3 py-1 border border-emerald-700">
                    <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    LIVE
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPerformanceMode(performanceMode === 'master-only' ? 'all-stems' : 'master-only')}
                  disabled={stemLoadingState}
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-sans text-xs uppercase tracking-wider px-2 py-1 ${
                    performanceMode === 'master-only' ? 'bg-amber-900/20 border-amber-600 text-amber-300' : ''
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  ⚡ {performanceMode === 'master-only' ? 'MASTER' : 'ALL'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setVisualizerAspectRatio(visualizerAspectRatio === 'mobile' ? 'youtube' : 'mobile')}
                  className="bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-sans text-xs uppercase tracking-wider px-2 py-1"
                  style={{ borderRadius: '6px' }}
                >
                  📱 {visualizerAspectRatio === 'mobile' ? 'MOB' : 'YT'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsMapMode(!isMapMode)} 
                  disabled={!hasStems}
                  className="bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-sans text-xs uppercase tracking-wider px-2 py-1" 
                  style={{ borderRadius: '6px' }}
                >
                  {isMapMode ? <Zap className="h-3 w-3 mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                  {isMapMode ? 'EXIT' : 'MAP'}
                </Button>
              </div>
            </div>
          </div>
          {/* Visualizer Area */}
          <div className="flex-1 overflow-hidden bg-stone-900 relative">
              <div className="h-full overflow-y-auto px-4">
                <div className="min-w-0 w-full">
                  <div 
                    className={`relative mx-auto bg-stone-900 rounded-lg overflow-hidden shadow-lg flex items-center justify-center ${
                      visualizerAspectRatio === 'mobile' ? 'max-w-md' : 'max-w-4xl'
                    }`}
                    style={{ height: '400px' }}
                  >
                    <ThreeVisualizer
                      midiData={midiData || sampleMidiData}
                      settings={settings}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      onPlayPause={handlePlayPause}
                      onSettingsChange={setSettings}
                      onFpsUpdate={setFps}
                      selectedEffects={selectedEffects}
                      audioAnalysisData={audioAnalysisData}
                      aspectRatio={visualizerAspectRatio}
                    />
                  </div>

                  <div className="mt-4">
                    <StemWaveformPanel
                      stems={availableStems}
                      currentTime={stemAudio.currentTime}
                      isPlaying={stemAudio.isPlaying}
                      onSeek={stemAudio.setCurrentTime}
                      className="bg-gray-800/50 border border-gray-700"
                    />
                  </div>

                  {/* Effects Carousel */}
                  <div className="mt-4 pb-4">
                    <h3 className="text-lg font-semibold mb-2 text-gray-300">Visual Effects Library</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Drag or scroll to explore effects → Select effects to configure and activate
                    </p>
                    <EffectCarousel
                      effects={effects}
                      onSelectEffect={handleSelectEffect}
                      selectedEffects={selectedEffects}
                    />
                  </div>

                  {/* Effect Parameter Modals */}
                  {effects.map((effect, index) => {
                    const initialPos = {
                      x: 100 + (index * 50),
                      y: 100 + (index * 50)
                    };
                    
                    return (
                      <DraggableModal
                        key={effect.id}
                        title={effect.name.replace(' Effect', '')}
                        isOpen={openEffectModals[effect.id]}
                        onClose={() => handleCloseEffectModal(effect.id)}
                        initialPosition={initialPos}
                      >
                        <div className="space-y-4">
                          <div className="text-sm text-gray-300 mb-4">
                            {effect.description}
                          </div>
                          
                          {/* Effect-specific parameters */}
                          {effect.id === 'metaballs' && (
                            <>
                              <div className="space-y-2">
                                <Label className="text-white/80 text-xs font-mono">Base Radius</Label>
                                <Slider
                                  defaultValue={[0.5]}
                                  min={0.1}
                                  max={1.0}
                                  step={0.1}
                                  className="w-full"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white/80 text-xs font-mono">Animation Speed</Label>
                                <Slider
                                  defaultValue={[1.0]}
                                  min={0.1}
                                  max={2.0}
                                  step={0.1}
                                  className="w-full"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white/80 text-xs font-mono">Glow Intensity</Label>
                                <Slider
                                  defaultValue={[1.5]}
                                  min={0.5}
                                  max={3.0}
                                  step={0.1}
                                  className="w-full"
                                />
                              </div>
                            </>
                          )}
                          
                          {effect.id === 'midiHud' && (
                            <>
                              <div className="flex items-center justify-between">
                                <Label className="text-white/80 text-xs font-mono">Show Track Info</Label>
                                <Switch defaultChecked={true} />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label className="text-white/80 text-xs font-mono">Show Velocity</Label>
                                <Switch defaultChecked={true} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white/80 text-xs font-mono">HUD Opacity</Label>
                                <Slider
                                  defaultValue={[0.8]}
                                  min={0.1}
                                  max={1.0}
                                  step={0.1}
                                  className="w-full"
                                />
                              </div>
                            </>
                          )}
                          
                          {effect.id === 'particleNetwork' && (
                            <>
                              <div className="space-y-2">
                                <Label className="text-white/80 text-xs font-mono">Max Particles</Label>
                                <Slider
                                  defaultValue={[100]}
                                  min={50}
                                  max={200}
                                  step={10}
                                  className="w-full"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white/80 text-xs font-mono">Connection Distance</Label>
                                <Slider
                                  defaultValue={[2.0]}
                                  min={1.0}
                                  max={5.0}
                                  step={0.1}
                                  className="w-full"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white/80 text-xs font-mono">Particle Size</Label>
                                <Slider
                                  defaultValue={[20]}
                                  min={10}
                                  max={50}
                                  step={5}
                                  className="w-full"
                                />
                              </div>
                            </>
                          )}
                          
                          {/* Common controls */}
                          <div className="pt-4 border-t border-gray-600">
                            <div className="flex items-center justify-between">
                              <Label className="text-white/80 text-xs font-mono">Effect Enabled</Label>
                              <Switch 
                                checked={selectedEffects[effect.id]}
                                onCheckedChange={(checked) => {
                                  setSelectedEffects(prev => ({
                                    ...prev,
                                    [effect.id]: checked
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </DraggableModal>
                    );
                  })}
                </div>

                {/* Mapping Editor Modal */}
                {isMapMode && (
                  <div className="fixed inset-0 bg-black/80 z-50 flex">
                    <div className="w-1/3 bg-stone-900 border-l border-white/10 overflow-y-auto">
                      <MappingEditor
                        currentPreset={currentPreset}
                        onPresetChange={handlePresetChange}
                        onMappingUpdate={handleMappingUpdate}
                        onStemMute={handleStemMute}
                        onStemSolo={handleStemSolo}
                        isPlaying={isPlaying}
                        className="h-full"
                      />
                    </div>
                    <div className="flex-1" />
                  </div>
                )}
              </div>
          </div>
        </main>
      </div>
    </>
  );
}