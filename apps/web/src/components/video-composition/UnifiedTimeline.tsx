import React, { useState, useCallback, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { ChevronDown, ChevronUp, Plus, Video, Image, Zap, Music, FileAudio, FileMusic, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Layer } from '@/types/video-composition';
import { StemWaveform, WaveformData } from '@/components/stem-visualization/stem-waveform';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HudOverlayProvider, HudOverlayConfig, useHudOverlayContext } from '@/components/hud/HudOverlayManager';

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
  // Video composition layers
  layers: Layer[];
  onLayerAdd: (layer: Layer) => void;
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerSelect: (layerId: string) => void;
  selectedLayerId?: string;
  
  // Effects timeline (now part of layers)
  effectClips: EffectClip[];
  onEffectClipAdd: (effect: any) => void;
  onEffectClipRemove: (clipId: string) => void;
  onEffectClipEdit: (clipId: string) => void;
  
  // Audio/MIDI stems
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
  
  // Timeline state
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
  
  // Collapsible sections
  className?: string;
}

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
  onEffectClipEdit: (layerId: string) => void;
  onEffectClipRemove: (layerId: string) => void;
  onAssetDrop: (item: any, targetLayerId: string) => void;
  currentTime: number;
  duration: number;
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
  onEffectClipEdit,
  onEffectClipRemove,
  onAssetDrop,
  currentTime,
  duration
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
        top: `${index * 32 + 8}px`,
        height: '24px'
      }}
      onClick={e => { 
        e.stopPropagation(); 
        if (isEffect) {
          onEffectClipEdit(layer.id);
        } else {
          onLayerSelect(layer.id);
        }
      }}
      onDoubleClick={e => { 
        e.stopPropagation(); 
        if (isEffect) {
          onEffectClipEdit(layer.id);
        }
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
            <span className="truncate font-medium">
              {layer.type === 'video' ? 'Video' : 
               layer.type === 'image' ? 'Image' : 
               layer.src || 'Effect'}
            </span>
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
          if (isEffect) {
            onEffectClipRemove(layer.id);
          } else {
            onLayerDelete(layer.id);
          }
        }}
        aria-label="Delete layer"
      >×</button>
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
  const [{ isDragging }, drag] = useDrag({
    type: 'AUDIO_STEM',
    item: { id, name, stemType },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const getStatusText = () => {
    if (waveformData) return null; // Has data, no text needed
    if (isLoading) return 'Loading...';
    if (analysisStatus === 'pending' || analysisStatus === 'processing') return 'Analyzing...';
    return 'No analysis data.';
  };

  const statusText = getStatusText();

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      className={cn(
        "flex items-center group bg-stone-900/50 cursor-pointer transition-all border-l-4",
        isActive ? "border-emerald-400 bg-emerald-900/30" : "border-transparent hover:bg-stone-800/40"
      )}
      style={{ opacity: isDragging ? 0.5 : 1, height: '32px', minHeight: '32px' }}
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

      <div className="flex-1 min-w-0 px-2 overflow-hidden">
        {analysisProgress ? (
          <div className="w-full bg-stone-700 rounded-full h-2.5 my-auto">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${analysisProgress.progress * 100}%` }}></div>
            <p className="text-xs text-stone-400 truncate">{analysisProgress.message}</p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <StemWaveform
              waveformData={waveformData}
              duration={waveformData?.duration || 1}
              currentTime={currentTime}
              onSeek={onSeek}
              isPlaying={isPlaying}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
};
StemTrack.displayName = 'StemTrack';

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
  layers,
  onLayerAdd,
  onLayerUpdate,
  onLayerDelete,
  onLayerSelect,
  selectedLayerId,
  effectClips,
  onEffectClipAdd,
  onEffectClipRemove,
  onEffectClipEdit,
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
  currentTime,
  duration,
  isPlaying,
  onSeek,
  className
}) => {
  const [expandedSections, setExpandedSections] = useState({
    composition: true, // Combined visual and effects layers
    audio: true // Changed from false to true to ensure audio section is visible by default
  });

  // Create a default empty lane if no layers exist
  useEffect(() => {
    if (layers.length === 0 && effectClips.length === 0) {
      const defaultEmptyLane: Layer = {
        id: `layer-${Date.now()}`,
        type: 'image', // Placeholder type, will be replaced when content is dropped
        src: '', // Empty src indicates this is an empty lane
        position: { x: 50, y: 50 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        opacity: 1,
        audioBindings: [],
        midiBindings: [],
        zIndex: 0,
        blendMode: 'normal',
        startTime: 0,
        endTime: duration,
        duration: duration
      };
      onLayerAdd(defaultEmptyLane);
    }
  }, []); // Only run once on mount

  const handleAssetDrop = (item: any, targetLayerId?: string) => {
    console.log('Asset dropped on timeline:', item, 'target layer:', targetLayerId);
    
    if (targetLayerId) {
      // Dropped on a specific layer
      const targetLayer = layers.find(layer => layer.id === targetLayerId);
      if (targetLayer && !targetLayer.src) {
        // Fill the empty lane with the dropped content
        switch (item.type) {
          case 'VIDEO_FILE':
            onLayerUpdate(targetLayerId, {
              type: 'video',
              src: item.src
            });
            break;
          case 'IMAGE_FILE':
            onLayerUpdate(targetLayerId, {
              type: 'image',
              src: item.src
            });
            break;
          case 'EFFECT_CARD':
            // Convert effect to a layer
            onLayerUpdate(targetLayerId, {
              type: 'effect',
              src: item.name || item.id,
              effectType: item.id,
              settings: item.parameters || {}
            });
            break;
          default:
            console.warn('Unknown asset type:', item.type);
            return;
        }
        return;
      }
    }
    
    // Fallback: check if there's an empty lane to fill
    const emptyLane = layers.find(layer => !layer.src && layer.type !== 'effect');
    
    if (emptyLane) {
      // Fill the empty lane with the dropped content
      switch (item.type) {
        case 'VIDEO_FILE':
          onLayerUpdate(emptyLane.id, {
            type: 'video',
            src: item.src
          });
          break;
        case 'IMAGE_FILE':
          onLayerUpdate(emptyLane.id, {
            type: 'image',
            src: item.src
          });
          break;
        case 'EFFECT_CARD':
          // Convert effect to a layer
          onLayerUpdate(emptyLane.id, {
            type: 'effect',
            src: item.name || item.id,
            effectType: item.id,
            settings: item.parameters || {}
          });
          break;
        default:
          console.warn('Unknown asset type:', item.type);
          return;
      }
    } else {
      // No empty lane, create a new layer
      switch (item.type) {
        case 'VIDEO_FILE':
          const videoLayer: Layer = {
            id: `video-${Date.now()}`,
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
          onLayerAdd(videoLayer);
          break;
        case 'IMAGE_FILE':
          const imageLayer: Layer = {
            id: `image-${Date.now()}`,
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
          onLayerAdd(imageLayer);
          break;
        case 'EFFECT_CARD':
          // Create a new effect layer
          const effectLayer: Layer = {
            id: `effect-${Date.now()}`,
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
          onLayerAdd(effectLayer);
          break;
        default:
          console.warn('Unknown asset type:', item.type);
          return;
      }
    }
  };

  const timeToX = (time: number) => {
    return time * 100; // 100px per second
  };

  const xToTime = (x: number) => {
    return x / 100;
  };

  // Calculate timeline width based on duration to match audio stems
  const timelineWidth = Math.max(duration * 100, 800); // Minimum 800px width

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = xToTime(x);
    onSeek(Math.max(0, Math.min(duration, time)));
  };

  return (
    <div className={cn("bg-stone-800 border border-stone-700 font-mono text-xs rounded-xl", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-stone-700 text-white font-bold font-mono text-xs uppercase tracking-widest rounded-t-xl">
        <Zap className="h-4 w-4" /> Timeline
      </div>
      <div className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Composition Layers Section */}
            <TimelineSection
              title="Composition Layers"
              icon={<Video className="h-3 w-3" />}
              isExpanded={expandedSections.composition}
              onToggle={() => toggleSection('composition')}
              itemCount={layers.length + effectClips.length}
              itemType="layers"
            >
              <div className="space-y-1">
                {/* Add Layer Button */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const newLayer: Layer = {
                          id: `layer-${Date.now()}`,
                          type: 'image', // Placeholder type, will be replaced when content is dropped
                          src: '', // Empty src indicates this is an empty lane
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
                        onLayerAdd(newLayer);
                      }}
                      className="px-3 py-1 bg-stone-700 hover:bg-stone-600 text-white text-xs font-mono rounded border border-stone-600 transition-colors"
                    >
                      + Add Layer
                    </button>
                  </div>
                </div>

                {/* Combined Timeline */}
                <div
                  className="relative border-2 border-dashed border-stone-700 transition-all mb-1 bg-stone-800 rounded-lg overflow-hidden"
                  onClick={handleTimelineClick}
                  style={{ width: `${timelineWidth}px`, height: `${Math.max(layers.length + effectClips.length, 1) * 32 + 16}px` }}
                >
                  {(layers.length === 0 && effectClips.length === 0) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-stone-500">
                        <Plus className="h-4 w-4 mx-auto mb-1" />
                        <div className="text-xs">Add layers and drag assets to them</div>
                      </div>
                    </div>
                  )}

                  {/* Render layers in z-index order (bottom to top) */}
                  {[...layers, ...effectClips.map((clip, clipIndex) => ({
                    id: clip.id,
                    type: 'effect' as const,
                    src: clip.name,
                    position: { x: 50, y: 50 },
                    scale: { x: 1, y: 1 },
                    rotation: 0,
                    opacity: 1,
                    audioBindings: [],
                    midiBindings: [],
                    zIndex: layers.length + clipIndex, // Use numeric index instead of string id
                    blendMode: 'normal' as const,
                    startTime: clip.startTime,
                    endTime: clip.endTime,
                    duration: clip.endTime - clip.startTime
                  }))].sort((a, b) => a.zIndex - b.zIndex).map((layer, index) => {
                    const startX = timeToX(layer.startTime || 0);
                    const width = timeToX((layer.endTime || duration) - (layer.startTime || 0));
                    const isActive = currentTime >= (layer.startTime || 0) && currentTime <= (layer.endTime || duration);
                    const isSelected = selectedLayerId === layer.id;
                    const isEffect = layer.type === 'effect';
                    const isEmptyLane = !isEffect && !layer.src; // Empty lane that can accept any content
                    
                    return (
                      <DroppableLane
                        key={layer.id}
                        layer={layer}
                        index={index}
                        startX={startX}
                        width={width}
                        isActive={isActive}
                        isSelected={isSelected}
                        isEmptyLane={isEmptyLane}
                        onLayerSelect={onLayerSelect}
                        onLayerDelete={onLayerDelete}
                        onEffectClipEdit={onEffectClipEdit}
                        onEffectClipRemove={onEffectClipRemove}
                        onAssetDrop={handleAssetDrop}
                        currentTime={currentTime}
                        duration={duration}
                      />
                    );
                  })}

                  {/* Current time indicator */}
                  <div
                    className="absolute top-0 w-0.5 bg-emerald-400 pointer-events-none z-10"
                    style={{ 
                      left: `${timeToX(currentTime)}px`,
                      height: '100%'
                    }}
                  />
                </div>
              </div>
            </TimelineSection>
            {/* Audio/MIDI Section */}
            <TimelineSection
              title="Audio & MIDI"
              icon={<Music className="h-3 w-3" />}
              isExpanded={expandedSections.audio}
              onToggle={() => toggleSection('audio')}
              itemCount={stems.length}
              itemType="tracks"
            >
              <div className="space-y-1">
                {stems.map((stem) => {
                  const analysis = cachedAnalysis.find((a: any) => a.fileMetadataId === stem.id);
                  const progress = analysisProgress?.[stem.id];
                  return (
                    <StemTrack
                      key={stem.id}
                      id={stem.id}
                      name={stem.file_name}
                      waveformData={analysis?.waveformData ?? null}
                      isLoading={stemLoadingState}
                      isActive={stem.id === activeTrackId}
                      onClick={() => onStemSelect?.(stem.id)}
                      isSoloed={soloedStems.has(stem.id)}
                      onToggleSolo={() => onToggleSolo?.(stem.id)}
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
                {stems.length === 0 && (
                  <div className="h-8 bg-stone-800 border-2 border-dashed border-stone-700 flex items-center justify-center rounded-lg">
                    <div className="text-center text-stone-500">
                      <div className="flex items-center gap-2 mb-1">
                        <FileAudio className="h-3 w-3" />
                        <FileMusic className="h-3 w-3" />
                      </div>
                      <div className="text-xs">No audio stems available</div>
                    </div>
                  </div>
                )}
                {stemError && <p className="text-xs text-red-500 p-2">{stemError}</p>}
              </div>
            </TimelineSection>
            {/* HUD Overlays Section */}
            <TimelineSection
              title="HUD Overlays"
              icon={<Settings className="h-3 w-3" />}
              isExpanded={expandedSections.composition} // Assuming HUD overlays are part of composition
              onToggle={() => toggleSection('composition')}
              itemCount={0} // No direct count of overlays here, they are managed by context
              itemType="overlays"
            >
              <OverlayLane />
            </TimelineSection>
          </div>
        </div>
      </div>
    </div>
  );
}; 