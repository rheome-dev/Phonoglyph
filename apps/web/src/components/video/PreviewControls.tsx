import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Repeat, 
  Maximize2,
  Settings,
  Clock,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PreviewControlsProps {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  fps?: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (frame: number) => void;
  onStop: () => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  isLooping?: boolean;
  onToggleLoop?: () => void;
  onToggleFullscreen?: () => void;
  onOpenSettings?: () => void;
  isBuffering?: boolean;
  syncStatus?: 'excellent' | 'good' | 'poor' | 'critical';
  className?: string;
}

export const PreviewControls: React.FC<PreviewControlsProps> = ({
  isPlaying,
  currentFrame,
  totalFrames,
  fps = 30,
  onPlay,
  onPause,
  onSeek,
  onStop,
  volume = 1,
  onVolumeChange,
  isLooping = false,
  onToggleLoop,
  onToggleFullscreen,
  onOpenSettings,
  isBuffering = false,
  syncStatus = 'excellent',
  className
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [tempFrame, setTempFrame] = useState(currentFrame);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Auto-hide volume slider after 3 seconds
  useEffect(() => {
    if (showVolumeSlider) {
      const timer = setTimeout(() => {
        setShowVolumeSlider(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showVolumeSlider, lastInteraction]);
  
  // Sync temp frame with actual frame when not dragging
  useEffect(() => {
    if (!isDragging) {
      setTempFrame(currentFrame);
    }
  }, [currentFrame, isDragging]);
  
  const formatTime = useCallback((frame: number) => {
    const totalSeconds = frame / fps;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const frameNumber = Math.floor(frame % fps);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${frameNumber.toString().padStart(2, '0')}`;
  }, [fps]);
  
  const formatDuration = useCallback((totalFrames: number) => {
    const totalSeconds = totalFrames / fps;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [fps]);
  
  const handleTimelineChange = useCallback((values: number[]) => {
    const frame = values[0];
    setTempFrame(frame);
    if (!isDragging) {
      onSeek(frame);
    }
    setLastInteraction(Date.now());
  }, [isDragging, onSeek]);
  
  const handleTimelinePointerDown = useCallback(() => {
    setIsDragging(true);
    setLastInteraction(Date.now());
  }, []);
  
  const handleTimelineCommit = useCallback((values: number[]) => {
    const frame = values[0];
    setIsDragging(false);
    onSeek(frame);
    setLastInteraction(Date.now());
  }, [onSeek]);
  
  const handleSkipBackward = useCallback(() => {
    const skipAmount = fps; // Skip 1 second back
    const newFrame = Math.max(0, currentFrame - skipAmount);
    onSeek(newFrame);
    setLastInteraction(Date.now());
  }, [currentFrame, fps, onSeek]);
  
  const handleSkipForward = useCallback(() => {
    const skipAmount = fps; // Skip 1 second forward
    const newFrame = Math.min(totalFrames - 1, currentFrame + skipAmount);
    onSeek(newFrame);
    setLastInteraction(Date.now());
  }, [currentFrame, totalFrames, fps, onSeek]);
  
  const handleVolumeToggle = useCallback(() => {
    if (onVolumeChange) {
      onVolumeChange(volume > 0 ? 0 : 1);
    }
    setShowVolumeSlider(true);
    setLastInteraction(Date.now());
  }, [volume, onVolumeChange]);
  
  const handleVolumeChange = useCallback((values: number[]) => {
    if (onVolumeChange) {
      onVolumeChange(values[0] / 100);
    }
    setLastInteraction(Date.now());
  }, [onVolumeChange]);
  
  const getSyncStatusColor = (status: typeof syncStatus) => {
    switch (status) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-yellow-500';
      case 'poor': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getSyncStatusText = (status: typeof syncStatus) => {
    switch (status) {
      case 'excellent': return 'Perfect sync';
      case 'good': return 'Good sync';
      case 'poor': return 'Sync drift';
      case 'critical': return 'Sync issues';
      default: return 'Unknown';
    }
  };
  
  const currentTimeDisplay = isDragging ? tempFrame : currentFrame;
  const progress = totalFrames > 0 ? (currentTimeDisplay / totalFrames) * 100 : 0;
  
  return (
    <TooltipProvider>
      <Card className={`bg-stone-200/95 backdrop-blur-md border-stone-400 p-3 ${className}`}>
        {/* Timeline Section */}
        <div className="mb-3">
          <div className="relative" ref={timelineRef}>
            <Slider
              value={[currentTimeDisplay]}
              max={Math.max(1, totalFrames - 1)}
              step={1}
              onValueChange={handleTimelineChange}
              onValueCommit={handleTimelineCommit}
              onPointerDown={handleTimelinePointerDown}
              className="w-full cursor-pointer"
              disabled={isBuffering}
            />
            
            {/* Progress indicator */}
            <div 
              className="absolute top-2 h-2 bg-blue-400 rounded-full transition-all duration-150 pointer-events-none"
              style={{ 
                width: `${progress}%`,
                opacity: isDragging ? 0.8 : 0.6 
              }}
            />
            
            {/* Buffering indicator */}
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          
          {/* Time Display */}
          <div className="flex justify-between items-center text-xs text-stone-600 mt-2">
            <div className="flex items-center gap-2">
              <span className="font-mono">{formatTime(currentTimeDisplay)}</span>
              <span className="text-stone-400">/</span>
              <span className="font-mono text-stone-500">{formatDuration(totalFrames)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Sync Status */}
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${getSyncStatusColor(syncStatus)}`} />
                    <span className="text-xs">{syncStatus.toUpperCase()}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getSyncStatusText(syncStatus)}</p>
                </TooltipContent>
              </Tooltip>
              
              {/* FPS Display */}
              <Badge variant="outline" className="text-xs">
                {fps}fps
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Transport Controls */}
        <div className="flex items-center justify-between">
          {/* Main Transport */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSkipBackward}
                  className="h-8 w-8 p-0"
                  disabled={isBuffering}
                >
                  <SkipBack size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Skip back 1 second</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Play/Pause Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                {isPlaying ? (
                  <Button
                    size="sm"
                    onClick={onPause}
                    className="h-10 w-10 p-0 bg-stone-600 hover:bg-stone-700"
                    disabled={isBuffering}
                  >
                    <Pause size={20} />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={onPlay}
                    className="h-10 w-10 p-0 bg-stone-600 hover:bg-stone-700"
                    disabled={isBuffering}
                  >
                    <Play size={20} />
                  </Button>
                )}
              </TooltipTrigger>
              <TooltipContent>
                <p>{isPlaying ? 'Pause' : 'Play'}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onStop}
                  className="h-8 w-8 p-0"
                  disabled={isBuffering}
                >
                  <Square size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Stop and reset</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSkipForward}
                  className="h-8 w-8 p-0"
                  disabled={isBuffering}
                >
                  <SkipForward size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Skip forward 1 second</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Secondary Controls */}
          <div className="flex items-center gap-2">
            {/* Loop Toggle */}
            {onToggleLoop && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={isLooping ? "default" : "ghost"}
                    onClick={onToggleLoop}
                    className="h-8 w-8 p-0"
                  >
                    <Repeat size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isLooping ? 'Disable loop' : 'Enable loop'}</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Volume Control */}
            {onVolumeChange && (
              <div className="relative flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleVolumeToggle}
                      className="h-8 w-8 p-0"
                    >
                      {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{volume === 0 ? 'Unmute' : 'Mute'}</p>
                  </TooltipContent>
                </Tooltip>
                
                {/* Volume Slider */}
                {showVolumeSlider && (
                  <div className="absolute bottom-full right-0 mb-2 p-2 bg-white rounded-lg shadow-lg border">
                    <div className="h-20 flex items-center">
                      <Slider
                        value={[volume * 100]}
                        max={100}
                        step={1}
                        orientation="vertical"
                        onValueChange={handleVolumeChange}
                        className="h-16"
                      />
                    </div>
                    <div className="text-xs text-center mt-1 text-stone-600">
                      {Math.round(volume * 100)}%
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Fullscreen Toggle */}
            {onToggleFullscreen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onToggleFullscreen}
                    className="h-8 w-8 p-0"
                  >
                    <Maximize2 size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle fullscreen</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Settings */}
            {onOpenSettings && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onOpenSettings}
                    className="h-8 w-8 p-0"
                  >
                    <Settings size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Preview settings</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        
        {/* Performance Indicator (optional debug info) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 pt-2 border-t border-stone-300">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>Frame: {currentFrame}</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity size={12} />
                <span>Sync: {getSyncStatusText(syncStatus)}</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
};

export default PreviewControls;