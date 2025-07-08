import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { useLayerStore } from '@/lib/stores/layerStore';
import { PreviewPerformanceOptimizer } from '@/lib/preview/performanceOptimizer';
import { PreviewSyncManager } from '@/lib/preview/syncManager';
import { Card } from '@/components/ui/card';
import { PreviewControls } from './PreviewControls';
import { PictureInPictureWindow } from './PictureInPictureWindow';
import { PreviewLoadingState } from './PreviewLoadingState';
import { PreviewErrorState } from './PreviewErrorState';
import { PreviewOverlay } from './PreviewOverlay';
import { MidiVisualizerComposition } from '@video/src/MidiVisualizerVideo';

interface MIDIData {
  tracks: Array<{
    notes: Array<{
      time: number;
      duration: number;
      note: number;
      velocity: number;
    }>;
    instrument?: string;
    name?: string;
  }>;
  duration: number;
  ticksPerQuarter: number;
  timeSignature: {
    numerator: number;
    denominator: number;
  };
}

interface UnifiedPreviewProps {
  midiData: MIDIData;
  audioSrc?: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  volume?: number;
  className?: string;
  onError?: (error: Error) => void;
  onLoadingChange?: (loading: boolean) => void;
  onPlayStateChange?: (playing: boolean) => void;
}

export const UnifiedPreview: React.FC<UnifiedPreviewProps> = ({
  midiData,
  audioSrc,
  width = 1920,
  height = 1080,
  autoPlay = false,
  loop = false,
  volume = 1,
  className,
  onError,
  onLoadingChange,
  onPlayStateChange
}) => {
  // Player and UI state
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPip, setShowPip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(volume);
  const [isLooping, setIsLooping] = useState(loop);
  
  // Layer store
  const {
    layers,
    compositionSettings,
    selectedLayerId,
    previewQuality,
    setCurrentTime,
    setIsPlaying: setStoreIsPlaying,
    selectLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    setPreviewQuality
  } = useLayerStore();
  
  // Performance and sync managers
  const performanceOptimizer = useRef(new PreviewPerformanceOptimizer());
  const syncManager = useRef(new PreviewSyncManager());
  
  // Calculate composition duration from MIDI data
  const durationInFrames = useMemo(() => {
    if (!midiData || !midiData.tracks.length) return 30 * 60; // Default 1 minute
    
    const maxTime = Math.max(
      ...midiData.tracks.flatMap(track => 
        track.notes.map(note => note.time + note.duration)
      ),
      midiData.duration || 0
    );
    
    return Math.ceil(maxTime * compositionSettings.fps);
  }, [midiData, compositionSettings.fps]);
  
  // Quality-based rendering optimizations
  const getPreviewScale = useCallback(() => {
    switch (previewQuality) {
      case 'draft': return 0.25;
      case 'medium': return 0.5;
      case 'high': return 1.0;
      default: return 0.5;
    }
  }, [previewQuality]);
  
  const getPreviewProps = useCallback(() => {
    const scale = getPreviewScale();
    return {
      width: Math.floor(width * scale),
      height: Math.floor(height * scale),
      fps: previewQuality === 'draft' ? 15 : compositionSettings.fps,
      renderLoading: () => <PreviewLoadingState />,
      errorFallback: ({ error }: { error: Error }) => <PreviewErrorState error={error} />
    };
  }, [width, height, previewQuality, compositionSettings.fps, getPreviewScale]);
  
  // Composition props that update in real-time
  const compositionProps = useMemo(() => ({
    midiData,
    audioSrc,
    layers: layers.filter(layer => layer.visible),
    currentFrame,
    quality: previewQuality,
    width: compositionSettings.width,
    height: compositionSettings.height,
    fps: compositionSettings.fps
  }), [
    midiData,
    audioSrc,
    layers,
    currentFrame,
    previewQuality,
    compositionSettings
  ]);
  
  // Player event handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setStoreIsPlaying(true);
    playerRef.current?.play();
    syncManager.current.startMonitoring();
    onPlayStateChange?.(true);
  }, [setStoreIsPlaying, onPlayStateChange]);
  
  const handlePause = useCallback(() => {
    setIsPlaying(false);
    setStoreIsPlaying(false);
    playerRef.current?.pause();
    syncManager.current.stopMonitoring();
    onPlayStateChange?.(false);
  }, [setStoreIsPlaying, onPlayStateChange]);
  
  const handleSeek = useCallback((frame: number) => {
    const clampedFrame = Math.max(0, Math.min(frame, durationInFrames - 1));
    setCurrentFrame(clampedFrame);
    setCurrentTime(clampedFrame / compositionSettings.fps);
    playerRef.current?.seekTo(clampedFrame);
    
    // Update sync manager
    const time = clampedFrame / compositionSettings.fps;
    syncManager.current.updateVideoPosition(clampedFrame, compositionSettings.fps);
  }, [durationInFrames, compositionSettings.fps, setCurrentTime]);
  
  const handleStop = useCallback(() => {
    handlePause();
    handleSeek(0);
  }, [handlePause, handleSeek]);
  
  const handleFrameUpdate = useCallback((frame: number) => {
    setCurrentFrame(frame);
    setCurrentTime(frame / compositionSettings.fps);
    
    // Update performance monitoring
    performanceOptimizer.current.updateFrameTime();
    
    // Update sync manager
    syncManager.current.updateVideoPosition(frame, compositionSettings.fps);
  }, [compositionSettings.fps, setCurrentTime]);
  
  const handleVolumeChange = useCallback((newVolume: number) => {
    setCurrentVolume(newVolume);
    // Note: Volume control would need to be implemented in the audio layer
    // This could dispatch an event for audio components to listen to
    window.dispatchEvent(new CustomEvent('preview-volume-change', {
      detail: { volume: newVolume }
    }));
  }, []);
  
  const handleToggleLoop = useCallback(() => {
    setIsLooping(!isLooping);
  }, [isLooping]);
  
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);
  
  const handleError = useCallback((error: Error) => {
    console.error('Preview error:', error);
    setError(error);
    setIsLoading(false);
    onError?.(error);
  }, [onError]);
  
  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
    onLoadingChange?.(loading);
  }, [onLoadingChange]);
  
  // Performance optimization effects
  useEffect(() => {
    const optimizer = performanceOptimizer.current;
    
    // Listen for performance settings changes
    const handleSettingsChange = (event: CustomEvent) => {
      const settings = event.detail;
      if (settings.quality !== previewQuality) {
        setPreviewQuality(settings.quality);
      }
    };
    
    window.addEventListener('preview-settings-changed', handleSettingsChange as EventListener);
    
    return () => {
      window.removeEventListener('preview-settings-changed', handleSettingsChange as EventListener);
      optimizer.dispose();
    };
  }, [previewQuality, setPreviewQuality]);
  
  // Sync manager effects
  useEffect(() => {
    const manager = syncManager.current;
    
    // Listen for sync events
    const handleSyncCorrection = (event: CustomEvent) => {
      const { target, amount } = event.detail;
      if (target === 'video') {
        const correctedFrame = currentFrame + (amount * compositionSettings.fps);
        handleSeek(correctedFrame);
      }
    };
    
    window.addEventListener('sync-correction', handleSyncCorrection as EventListener);
    
    return () => {
      window.removeEventListener('sync-correction', handleSyncCorrection as EventListener);
      manager.dispose();
    };
  }, [currentFrame, compositionSettings.fps, handleSeek]);
  
  // Auto-play effect
  useEffect(() => {
    if (autoPlay && !isPlaying && !error) {
      const timer = setTimeout(() => {
        handlePlay();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, isPlaying, error, handlePlay]);
  
  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Get sync status for display
  const syncHealth = syncManager.current.getSyncHealth();
  const performanceMetrics = performanceOptimizer.current.getPerformanceMetrics();
  
  if (error) {
    return <PreviewErrorState error={error} onRetry={() => setError(null)} />;
  }
  
  return (
    <div className={`relative ${className}`}>
      {/* Main Preview */}
      <Card className="bg-black border-stone-400 overflow-hidden">
        <div 
          className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
          style={{ aspectRatio: `${width}/${height}` }}
        >
          <Player
            ref={playerRef}
            component={MidiVisualizerComposition}
            inputProps={compositionProps}
            durationInFrames={durationInFrames}
            compositionWidth={width}
            compositionHeight={height}
            {...getPreviewProps()}
            controls={false}
            loop={isLooping}
            style={{
              width: '100%',
              height: '100%',
              background: compositionSettings.backgroundColor || 'linear-gradient(45deg, #0f172a, #1e293b)'
            }}
            onPlay={handlePlay}
            onPause={handlePause}
            onFrameUpdate={(e) => {
              if (typeof e === 'number') {
                handleFrameUpdate(e);
              } else if (e && typeof e.detail === 'object' && 'frame' in e.detail) {
                handleFrameUpdate(e.detail.frame);
              }
            }}
            onTimeUpdate={(e) => {
              if (e && typeof e.detail === 'object' && 'frame' in e.detail) {
                handleFrameUpdate(Math.floor(e.detail.frame));
              }
            }}
            onError={handleError}
            onLoad={() => handleLoadingChange(false)}
            onBuffer={() => handleLoadingChange(true)}
          />
          
          {/* Preview Overlay Controls */}
          <PreviewOverlay
            isFullscreen={isFullscreen}
            isPlaying={isPlaying}
            isPipMode={showPip}
            quality={previewQuality}
            syncStatus={syncHealth.status}
            performanceScore={performanceMetrics.fps}
            onToggleFullscreen={handleToggleFullscreen}
            onTogglePip={() => setShowPip(!showPip)}
            onQualityChange={setPreviewQuality}
            onOpenSettings={() => setShowSettings(true)}
            className={isFullscreen ? '' : 'opacity-0 hover:opacity-100 transition-opacity duration-200'}
          />
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <PreviewLoadingState />
            </div>
          )}
        </div>
      </Card>
      
      {/* Transport Controls */}
      {!isFullscreen && (
        <PreviewControls
          isPlaying={isPlaying}
          currentFrame={currentFrame}
          totalFrames={durationInFrames}
          fps={compositionSettings.fps}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
          onStop={handleStop}
          volume={currentVolume}
          onVolumeChange={handleVolumeChange}
          isLooping={isLooping}
          onToggleLoop={handleToggleLoop}
          onToggleFullscreen={handleToggleFullscreen}
          onOpenSettings={() => setShowSettings(true)}
          isBuffering={isLoading}
          syncStatus={syncHealth.status}
          className="mt-2"
        />
      )}
      
      {/* Picture-in-Picture Window */}
      {showPip && (
        <PictureInPictureWindow
          onClose={() => setShowPip(false)}
          layers={layers}
          currentFrame={currentFrame}
          fps={compositionSettings.fps}
          onLayerToggle={toggleLayerVisibility}
          onLayerOpacityChange={setLayerOpacity}
          onLayerSelect={selectLayer}
          selectedLayerId={selectedLayerId}
        />
      )}
      
      {/* Settings Panel (would be implemented separately) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-white p-6 w-96 max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">Preview Settings</h3>
            {/* Settings content would go here */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-stone-600 text-white rounded hover:bg-stone-700"
              >
                Close
              </button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 p-2 bg-stone-100 rounded text-xs font-mono">
          <div className="grid grid-cols-2 gap-2">
            <div>Frame: {currentFrame}/{durationInFrames}</div>
            <div>FPS: {performanceMetrics.fps.toFixed(1)}</div>
            <div>Quality: {previewQuality}</div>
            <div>Sync: {syncHealth.status}</div>
            <div>Layers: {layers.filter(l => l.visible).length}/{layers.length}</div>
            <div>Memory: {performanceMetrics.memoryUsage.toFixed(1)}MB</div>
          </div>
        </div>
      )}
    </div>
  );
};