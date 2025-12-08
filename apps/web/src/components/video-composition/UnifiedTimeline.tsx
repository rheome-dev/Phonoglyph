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