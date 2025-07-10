'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import { DEFAULT_PRESETS } from '@/lib/default-visualization-mappings';

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
  const [showTechnicalInfo, setShowTechnicalInfo] = useState(true);
  const [fps, setFps] = useState(60);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<VisualizationPreset>(DEFAULT_PRESETS[0]);

  // Effects carousel state
  const [selectedEffects, setSelectedEffects] = useState<Record<string, boolean>>({
    'metaballs': true,
    'midiHud': true,
    'particleNetwork': true
  });

  const [sampleMidiData] = useState<MIDIData>(createSampleMIDIData());
  const stemAudio = useStemAudioController();
  
  // Enhanced audio analysis data
  const [audioAnalysisData, setAudioAnalysisData] = useState<any>(null);
  
  const [showPicker, setShowPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
    if (!isInitialized || !projectFiles?.files || !currentProjectId) return;

    const audioFiles = projectFiles.files.filter(file => 
      file.file_type === 'audio' && file.upload_status === 'completed'
    );

    if (audioFiles.length > 0) {
      let cancelled = false;
      const loadStemsWithUrls = async () => {
        try {
          const stems = await Promise.all(
            audioFiles.map(async (file) => {
              const downloadUrlResult = await getDownloadUrlMutation.mutateAsync({ fileId: file.id });
              return {
                id: file.file_name.toLowerCase().replace(/\.[^/.]+$/, ''),
                url: downloadUrlResult.downloadUrl,
                label: file.file_name
              };
            })
          );
          if (!cancelled) {
            await stemAudio.loadStems(stems);
            console.log('🎵 Advanced audio analysis system loaded stems');
          }
        } catch (error) {
          if (!cancelled) console.error('Failed to load stems:', error);
        }
      };
      loadStemsWithUrls();
      return () => { cancelled = true; };
    }
  }, [projectFiles, currentProjectId, isInitialized, stemAudio, getDownloadUrlMutation]);

  // Update audio analysis data from stem audio controller
  useEffect(() => {
    if (stemAudio.visualizationData) {
      setAudioAnalysisData(stemAudio.visualizationData);
    }
  }, [stemAudio.visualizationData]);



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

  const handleDemoModeChange = (demoMode: boolean) => {
    setUseDemoData(demoMode);
    setCurrentTime(0);
    setIsPlaying(false);
    
    if (demoMode) {
      const params = new URLSearchParams(searchParams);
      params.delete('fileId');
      const newUrl = params.toString() ? `/creative-visualizer?${params.toString()}` : '/creative-visualizer';
      router.push(newUrl, { scroll: false });
    }
  };

  const handlePlayPause = () => {
    // Control both MIDI visualization and stem audio
    if (isPlaying) {
      stemAudio.pause();
      setIsPlaying(false);
    } else {
      // Only start if we have stems loaded
      if (hasStems) {
        stemAudio.play();
        setIsPlaying(true);
        console.log('🎵 Starting stem audio playback');
      } else {
        console.log('⚠️ No stems loaded, starting visualizer only');
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

  const hasStems = availableStems.length > 0;

  // Effects data for carousel
  const effects = [
    { id: 'metaballs', name: 'Metaballs Effect', description: 'Organic, fluid-like visualizations that respond to audio intensity' },
    { id: 'midiHud', name: 'HUD Effect', description: 'Technical overlay displaying real-time audio analysis and MIDI data' },
    { id: 'particleNetwork', name: 'Particle Effect', description: 'Dynamic particle systems that react to rhythm and pitch' }
  ];

  const handleSelectEffect = (effectId: string) => {
    setSelectedEffects(prev => ({
      ...prev,
      [effectId]: !prev[effectId]
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
    console.log(`Stem ${stemType} ${muted ? 'muted' : 'unmuted'}`);
  };

  const handleStemSolo = (stemType: string, solo: boolean) => {
    // Handle stem solo
    console.log(`Stem ${stemType} ${solo ? 'soloed' : 'unsoloed'}`);
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
      <div className="flex h-screen bg-stone-800 text-white">
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
        <main className="flex-1 flex flex-col overflow-hidden">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button onClick={handlePlayPause} size="lg" className="font-sans text-sm uppercase tracking-wider px-6 py-3 transition-all duration-300 bg-stone-700 hover:bg-stone-600">
                  {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isPlaying ? 'PAUSE' : 'PLAY'}
                </Button>
                <Button variant="outline" onClick={handleReset} className="bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  RESET
                </Button>
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
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsMapMode(!isMapMode)} 
                  disabled={!hasStems}
                  className="bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-sans text-xs uppercase tracking-wider" 
                  style={{ borderRadius: '8px' }}
                >
                  {isMapMode ? <Zap className="h-4 w-4 mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                  {isMapMode ? 'EXIT MAP' : 'MAP'}
                </Button>
              </div>
            </div>
          </div>
          {/* Visualizer Area */}
          <div className="flex-1 overflow-y-auto bg-stone-900 relative">
              <div className="h-full flex flex-col">
                <div className="flex-1">
                  <ThreeVisualizer
                      midiData={midiData || sampleMidiData}
                      settings={visualizationSettings}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      onPlayPause={handlePlayPause}
                      onSettingsChange={setSettings}
                      onFpsUpdate={setFps}
                      selectedEffects={selectedEffects}
                      audioAnalysisData={audioAnalysisData}
                  />
                </div>
                {/* Effects Carousel */}
                <div className="p-4 border-t border-white/10">
                  <EffectCarousel 
                    effects={effects}
                    selectedEffects={selectedEffects}
                    onSelectEffect={handleSelectEffect}
                  />
                </div>
              </div>

              {/* Mapping Editor Modal */}
              {isMapMode && (
                <div className="absolute inset-0 bg-black/80 z-50 flex">
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
        </main>
      </div>
    </>
  );
}