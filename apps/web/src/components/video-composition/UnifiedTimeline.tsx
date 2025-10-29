import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { ChevronDown, ChevronUp, Plus, Video, Image, Zap, Music, FileAudio, FileMusic, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Layer } from '@/types/video-composition';
import { useTimelineStore } from '@/stores/timelineStore';
import { StemWaveform, WaveformData } from '@/components/stem-visualization/stem-waveform';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HudOverlayProvider, HudOverlayConfig, useHudOverlayContext } from '@/components/hud/HudOverlayManager';
import { debugLog } from '@/lib/utils';

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
        <span className="text-sm font-medium text-stone-300 truncate">
          {isEmpty ? 'Empty Layer' : layer.src || layer.effectType || 'Layer'}
        </span>
      </div>
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
  return (
    <div className={cn('flex items-center w-full border-b border-stone-700/50')} style={{ height: `${ROW_HEIGHT}px` }}>
      <div className="flex-1 min-w-0 px-2 overflow-hidden h-full">
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
            />
          </div>
        )}
      </div>
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
  } = useTimelineStore();
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    composition: true, // Combined visual and effects layers
    audio: true // Changed from false to true to ensure audio section is visible by default
  });

  // Create a default empty lane if no layers exist
  useEffect(() => {
    if (layers.length === 0) {
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
      addLayer(defaultEmptyLane);
    }
  }, []); // Only run once on mount

  const handleAssetDrop = (item: any, targetLayerId?: string) => {
    debugLog.log('Asset dropped on timeline:', item, 'target layer:', targetLayerId);
    
    if (targetLayerId) {
      // Dropped on a specific layer
      const targetLayer = layers.find(layer => layer.id === targetLayerId);
      if (targetLayer && !targetLayer.src) {
        // Fill the empty lane with the dropped content
        switch (item.type) {
          case 'VIDEO_FILE':
            updateLayer(targetLayerId, {
              type: 'video',
              src: item.src
            });
            break;
          case 'IMAGE_FILE':
            updateLayer(targetLayerId, {
              type: 'image',
              src: item.src
            });
            break;
          case 'EFFECT_CARD':
            // Convert effect to a layer
            updateLayer(targetLayerId, {
              type: 'effect',
              src: item.name || item.id,
              effectType: item.id,
              settings: item.parameters || {}
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
      switch (item.type) {
        case 'VIDEO_FILE':
          updateLayer(emptyLane.id, {
            type: 'video',
            src: item.src
          });
          break;
        case 'IMAGE_FILE':
          updateLayer(emptyLane.id, {
            type: 'image',
            src: item.src
          });
          break;
        case 'EFFECT_CARD':
          // Convert effect to a layer
          updateLayer(emptyLane.id, {
            type: 'effect',
            src: item.name || item.id,
            effectType: item.id,
            settings: item.parameters || {}
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

  const timeToX = (time: number) => {
    return time * 100; // 100px per second
  };

  const xToTime = (x: number) => {
    return x / 100;
  };

  // Calculate timeline width based on duration to match audio stems
  const timelineWidth = Math.max(duration * 100, 800); // Minimum 800px width

  // Unified vertical sizing (use module-level constants)
  const compositionYOffset = HEADER_ROW_HEIGHT;
  const stemsYOffset = compositionYOffset + layers.length * ROW_HEIGHT + HEADER_ROW_HEIGHT;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = xToTime(x);
    const nextTime = Math.max(0, Math.min(duration, time));
    if (onSeek) {
      onSeek(nextTime);
    } else {
      setCurrentTime(nextTime);
    }
  };

  return (
    <div className={cn("bg-stone-800 border border-stone-700 rounded-xl overflow-hidden", className)}>
      <div className="flex">
        {/* Left column: Headers */}
        <div className="w-56 flex-shrink-0 border-r border-stone-700">
          {/* Composition header */}
          <div className="flex items-center justify-between px-2 border-b border-stone-700" style={{ height: `${HEADER_ROW_HEIGHT}px` }}>
            <span className="text-xs font-bold uppercase tracking-wider">Composition</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={() => {
                const newLayer: Layer = {
                  id: `layer-${Date.now()}`,
                  type: 'image',
                  src: '',
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
                addLayer(newLayer);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          {/* Composition layer headers */}
          {[...layers].sort((a, b) => a.zIndex - b.zIndex).map((layer) => (
            <CompositionLayerHeader key={layer.id} layer={layer} />
          ))}

          {/* Audio/MIDI header */}
          <div className="flex items-center px-2 border-t border-b border-stone-700" style={{ height: `${HEADER_ROW_HEIGHT}px` }}>
            <span className="text-xs font-bold uppercase tracking-wider">Audio & MIDI</span>
          </div>

          {/* Stem headers */}
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

        {/* Right column: Timeline lanes */}
        <div className="flex-1 overflow-x-auto" ref={timelineContainerRef}>
          <div
            className="relative"
            style={{ width: `${timelineWidth}px`, height: `${compositionYOffset + layers.length * ROW_HEIGHT + HEADER_ROW_HEIGHT + stems.length * ROW_HEIGHT}px` }}
            onClick={handleTimelineClick}
          >
            {/* Composition clips */}
            {[...layers].sort((a, b) => a.zIndex - b.zIndex).map((layer, index) => {
              const startX = timeToX(layer.startTime || 0);
              const width = timeToX((layer.endTime || duration) - (layer.startTime || 0));
              const isActive = currentTime >= (layer.startTime || 0) && currentTime <= (layer.endTime || duration);
              const isSelected = selectedLayerId === layer.id;
              const isEffect = layer.type === 'effect';
              const isEmptyLane = !isEffect && !layer.src;

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
                  onLayerSelect={selectLayer}
                  onLayerDelete={deleteLayer}
                  onAssetDrop={handleAssetDrop}
                  currentTime={currentTime}
                  duration={duration}
                  yOffset={compositionYOffset}
                />
              );
            })}

            {/* Audio waveforms */}
            {stems.map((stem, sIndex) => {
              const analysis: any = cachedAnalysis?.find((a: any) => a.fileMetadataId === stem.id);
              return (
                <div
                  key={`waveform-${stem.id}`}
                  className="absolute w-full flex items-center"
                  style={{ top: `${stemsYOffset + sIndex * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                >
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

            {/* Playhead */}
            <div
              className="absolute top-0 w-0.5 h-full bg-emerald-400 z-50 pointer-events-none"
              style={{ left: `${timeToX(currentTime)}px` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 