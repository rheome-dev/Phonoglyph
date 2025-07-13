'use client';

import React, { useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Music, ChevronDown, ChevronUp, Plus, Settings } from 'lucide-react';
import { StemWaveform, WaveformData } from './stem-waveform';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface EffectClip {
  id: string;
  effectId: string;
  name: string;
  startTime: number;
  endTime: number;
  parameters: Record<string, any>;
}

interface StemWaveformPanelProps {
  stems: Array<{
    id: string;
    file_name: string;
    is_master?: boolean;
    stem_type?: string;
    analysis_status?: string;
  }>;
  masterStemId: string | null;
  currentTime: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
  className?: string;
  onStemSelect?: (stemId: string) => void;
  activeTrackId?: string | null;
  soloedStems: Set<string>;
  onToggleSolo: (stemId:string) => void;
  analysisProgress?: Record<string, { progress: number; message: string } | null>;
  cachedAnalysis: any[]; // Using any for now to avoid complex type imports
  isLoading: boolean;
  error: string | null;
  // New props for effects timeline
  effectClips?: EffectClip[];
  onEffectClipAdd?: (effect: any) => void;
  onEffectClipRemove?: (clipId: string) => void;
  onEffectClipEdit?: (clipId: string) => void;
}

interface StemTrackProps {
  id: string;
  name: string;
  waveformData: any | null; // Can be from cachedAnalysis or real-time
  isLoading: boolean; // From useCachedStemAnalysis
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

// Effects Timeline Component
const EffectsTimeline: React.FC<{
  effectClips: EffectClip[];
  currentTime: number;
  onEffectClipEdit: (clipId: string) => void;
  onEffectClipRemove: (clipId: string) => void;
  onEffectClipAdd?: (effect: any) => void;
}> = ({ effectClips, currentTime, onEffectClipEdit, onEffectClipRemove, onEffectClipAdd }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'EFFECT_CARD',
    drop: (item: any) => {
      // Handle effect drop - this will be handled by parent
      console.log('Effect dropped:', item);
      // Call the parent handler if provided
      if (onEffectClipAdd) {
        onEffectClipAdd(item);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const dropRef = React.useCallback((node: HTMLDivElement | null) => {
    drop(node);
  }, [drop]);

  const timeToX = (time: number) => {
    // Convert time to x position (simplified)
    return time * 100; // 100px per second
  };

  const xToTime = (x: number) => {
    // Convert x position to time
    return x / 100;
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-stone-400" />
          <span className="text-sm font-medium text-stone-200">Effects Timeline</span>
        </div>
        <Badge variant="outline" className="text-xs text-stone-400">
          {effectClips.length} effects
        </Badge>
      </div>
      
      <div
        ref={dropRef}
        className={cn(
          "relative h-16 bg-stone-800/50 border-2 border-dashed rounded-lg transition-all",
          isOver && canDrop 
            ? "border-emerald-400 bg-emerald-900/20" 
            : "border-stone-600 hover:border-stone-500"
        )}
      >
        {/* Drop zone indicator */}
        {isOver && canDrop && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-emerald-400 text-sm font-medium">
              Drop effect here
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {effectClips.length === 0 && !isOver && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-stone-500">
              <Plus className="h-6 w-6 mx-auto mb-2" />
              <div className="text-xs">Drag effects here to add to timeline</div>
            </div>
          </div>
        )}
        
        {/* Effect clips */}
        {effectClips.map((clip) => {
          const startX = timeToX(clip.startTime);
          const width = timeToX(clip.endTime - clip.startTime);
          const isActive = currentTime >= clip.startTime && currentTime <= clip.endTime;
          
          return (
            <div
              key={clip.id}
              className={cn(
                "absolute top-2 h-12 rounded border-2 cursor-pointer transition-all",
                "hover:scale-105 hover:shadow-lg",
                isActive 
                  ? "bg-emerald-500/80 border-emerald-400 shadow-emerald-400/50" 
                  : "bg-stone-700/80 border-stone-600 hover:border-stone-500"
              )}
              style={{
                left: `${startX}px`,
                width: `${width}px`,
                minWidth: '60px'
              }}
              onDoubleClick={() => onEffectClipEdit(clip.id)}
            >
              <div className="flex items-center justify-between h-full px-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">
                    {clip.name}
                  </div>
                  <div className="text-xs text-stone-400">
                    {clip.startTime.toFixed(1)}s - {clip.endTime.toFixed(1)}s
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-stone-400 hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEffectClipRemove(clip.id);
                  }}
                >
                  ×
                </Button>
              </div>
            </div>
          );
        })}
        
        {/* Current time indicator */}
        <div
          className="absolute top-0 w-0.5 h-full bg-red-500 pointer-events-none z-10"
          style={{ left: `${timeToX(currentTime)}px` }}
        />
      </div>
    </div>
  );
};

const StemTrack: React.FC<StemTrackProps> = ({
    id,
    name,
    waveformData,
    isLoading,
    isActive,
    onClick,
    isSoloed,
    onToggleSolo,
    isMaster,
    onSeek,
    currentTime,
    stemType,
    isPlaying,
    analysisStatus,
    analysisProgress,
  }) => {
    const getStatusText = () => {
      if (waveformData) return null; // Has data, no text needed
      if (isLoading) return 'Loading...';
      if (analysisStatus === 'pending' || analysisStatus === 'processing') return 'Analyzing...';
      return 'No analysis data.';
    };

    const statusText = getStatusText();

    return (
    <div
      className={cn(
        "flex items-center group bg-stone-900/50 cursor-pointer transition-all border-l-4",
        isActive ? "border-emerald-400 bg-emerald-900/30" : "border-transparent hover:bg-stone-800/40"
      )}
      onClick={onClick}
    >
      <div className="w-56 px-3 py-2 flex items-center justify-between gap-2 border-r border-stone-700/50 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-200 truncate group-hover:text-emerald-400" title={name}>{name}</p>
          {waveformData && <p className="text-xs text-stone-400">{waveformData.duration.toFixed(2)}s</p>}
          {isLoading && !waveformData && <Badge variant="secondary" className="mt-1 text-xs">Loading...</Badge>}
        </div>
        
        {isMaster ? (
          <Badge variant="outline" className="border-amber-400 text-amber-400">MASTER</Badge>
        ) : (
          <Button
            variant={isSoloed ? "secondary" : "ghost"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSolo();
            }}
            className={cn(
              "transition-all px-3 font-semibold",
              isSoloed ? "bg-yellow-400/80 text-black hover:bg-yellow-400" : "text-stone-400 hover:text-white hover:bg-stone-700"
            )}
          >
            Solo
          </Button>
        )}
      </div>

      <div className="flex-1 min-w-0 px-2">
          {analysisProgress ? (
            <div className="w-full bg-stone-700 rounded-full h-2.5 my-auto">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${analysisProgress.progress * 100}%` }}></div>
              <p className="text-xs text-stone-400 truncate">{analysisProgress.message}</p>
            </div>
          ) : (
            <StemWaveform
              waveformData={waveformData}
              duration={waveformData?.duration || 1}
              currentTime={currentTime}
              onSeek={onSeek}
              isPlaying={isPlaying}
              isLoading={isLoading}
            />
          )}
        </div>
        
    </div>
  );
};
StemTrack.displayName = 'StemTrack';


export const StemWaveformPanel: React.FC<StemWaveformPanelProps> = ({
  stems,
  currentTime,
  isPlaying,
  onSeek,
  className,
  onStemSelect,
  activeTrackId,
  soloedStems,
  onToggleSolo,
  masterStemId,
  analysisProgress,
  cachedAnalysis,
  isLoading,
  error,
  effectClips = [],
  onEffectClipAdd,
  onEffectClipRemove,
  onEffectClipEdit,
}) => {

  return (
    <Card className={cn("bg-stone-900/70 border border-stone-700 rounded-lg overflow-hidden backdrop-blur-sm", className)}>
      <CardContent className="p-2 space-y-1">
        {/* Effects Timeline */}
        <EffectsTimeline
          effectClips={effectClips}
          currentTime={currentTime}
          onEffectClipEdit={onEffectClipEdit || (() => {})}
          onEffectClipRemove={onEffectClipRemove || (() => {})}
          onEffectClipAdd={onEffectClipAdd}
        />
        
        {/* Stem tracks */}
        {stems.map((stem) => {
          const analysis = cachedAnalysis.find((a: any) => a.fileMetadataId === stem.id);
          const progress = analysisProgress?.[stem.id];
          return (
            <StemTrack
              key={stem.id}
              id={stem.id}
              name={stem.file_name}
              waveformData={analysis?.waveformData ?? null}
              isLoading={isLoading}
              isActive={stem.id === activeTrackId}
              onClick={() => onStemSelect?.(stem.id)}
              isSoloed={soloedStems.has(stem.id)}
              onToggleSolo={() => onToggleSolo(stem.id)}
              isMaster={stem.id === masterStemId}
              onSeek={onSeek}
              currentTime={currentTime}
              stemType={analysis?.stemType ?? stem.stem_type ?? 'unknown'}
              isPlaying={isPlaying}
              analysisStatus={stem.analysis_status}
              analysisProgress={progress}
            />
          );
        })}
        {error && <p className="text-xs text-red-500 p-2">{error}</p>}
      </CardContent>
    </Card>
  );
}; 