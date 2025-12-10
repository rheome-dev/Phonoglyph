import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ChevronLeft, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DroppableParameter } from '@/components/ui/droppable-parameter';
import { makeParamKey } from '@/lib/visualizer/paramKeys';
import { CollectionManager } from '@/components/assets/CollectionManager';
import type { Layer } from '@/types/video-composition';

// Extended interface to support categorization and rarity for the UI
export interface EffectUIData {
  id: string;
  name: string;
  description: string;
  category: 'Generative' | 'Overlays' | 'Filters';
  rarity: 'Common' | 'Rare' | 'Mythic';
  parameters?: Record<string, any>;
  image?: string;
}

interface EffectsLibrarySidebarProps {
  effects: EffectUIData[];
  selectedEffects: Record<string, boolean>;
  onEffectToggle: (effectId: string) => void;
  onEffectDoubleClick: (effectId: string) => void;
  isVisible: boolean;
  className?: string;
  // Inspector mode props
  editingEffectId?: string | null;
  editingEffect?: EffectUIData | null;
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
  // Mapping props
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
}

// Helper: getSliderMax for effect parameter sliders
function getSliderMax(paramName: string) {
  switch (paramName) {
    case 'animationSpeed': return 5.0;
    case 'noiseIntensity': return 2.0;
    case 'glowIntensity': return 2.0;
    case 'strength': return 2.0;
    case 'radius': return 2.0;
    case 'threshold': return 1.0;
    case 'particleLifetime': return 10;
    case 'particleSize': return 50;
    case 'glowSoftness': return 5;
    case 'particleSpawning': return 1.0;
    case 'spawnThreshold': return 1.0;
    case 'audioSpawnThreshold': return 1.0;
    case 'audioSpawnRate': return 1.0;
    case 'audioSpawnCooldown': return 1.0;
    case 'audioParticleSize': return 50;
    case 'audioSpawnIntensity': return 2.0;
    case 'connectionDistance': return 5.0;
    case 'maxParticles': return 200;
    case 'connectionOpacity': return 1.0;
    case 'opacity': return 1.0;
    // Bloom Filter parameters
    case 'intensity': return 2.0;
    case 'softness': return 1.0;
    // ASCII Filter parameters
    case 'textSize': return 1.0;
    case 'gamma': return 2.2;
    case 'contrast': return 2.0;
    case 'invert': return 1.0;
    default: return 1;
  }
}

// Helper: getSliderStep for effect parameter sliders
function getSliderStep(paramName: string) {
  switch (paramName) {
    case 'animationSpeed': return 0.05;
    case 'noiseIntensity': return 0.1;
    case 'glowIntensity': return 0.1;
    case 'strength': return 0.1;
    case 'radius': return 0.05;
    case 'threshold': return 0.01;
    case 'glowSoftness': return 0.1;
    case 'particleSpawning': return 0.01;
    case 'spawnThreshold': return 0.01;
    case 'audioSpawnThreshold': return 0.01;
    case 'audioSpawnRate': return 0.01;
    case 'audioSpawnCooldown': return 0.01;
    case 'audioParticleSize': return 0.1;
    case 'audioSpawnIntensity': return 0.01;
    case 'opacity': return 0.01;
    // Bloom Filter parameters
    case 'intensity': return 0.01;
    case 'softness': return 0.01;
    // ASCII Filter parameters
    case 'textSize': return 0.01;
    case 'gamma': return 0.01;
    case 'contrast': return 0.01;
    case 'invert': return 1.0;
    default: return 0.01;
  }
}

// Draggable Effect Card Component
const DraggableEffectCard: React.FC<{
  effect: EffectUIData;
  cardStyle: any;
  onDoubleClick: () => void;
}> = ({ effect, cardStyle, onDoubleClick }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'EFFECT_CARD',
    item: {
      type: 'EFFECT_CARD',
      effectId: effect.id,
      id: effect.id,
      name: effect.name,
      category: effect.category,
      rarity: effect.rarity,
      parameters: effect.parameters
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div 
      ref={drag as any}
      className="cursor-grab"
    >
      <div
        className={cn(
          "cursor-grab active:cursor-grabbing transition-all duration-200 border relative overflow-hidden p-2 rounded-md flex flex-col",
          "hover:bg-gray-800",
          cardStyle.background,
          cardStyle.border,
          isDragging ? "opacity-50" : ""
        )}
        onDoubleClick={onDoubleClick}
      >
        {/* Rarity indicator (top right) */}
        <div className={cn("absolute top-1 right-1 w-4 h-4 border flex items-center justify-center", cardStyle.frameColor, "border-gray-600")}>
          <span className="text-black font-bold text-xs">
            {effect.rarity === 'Common' ? 'C' : effect.rarity === 'Rare' ? 'R' : 'M'}
          </span>
        </div>

        {/* Title - fixed height */}
        <div className="relative z-10 mb-1">
          <div className="flex items-center gap-1 font-mono text-[10px] font-bold tracking-wide text-white">
            <div 
              className="w-1 h-1 flex-shrink-0 border border-gray-600"
              style={{ 
                backgroundColor: '#71717a'
              }}
            />
            {effect.name.toUpperCase().replace(' EFFECT', '')}
          </div>
        </div>
        
        {/* Card art area - square and fills width */}
        <div className="relative z-10 w-full aspect-square bg-neutral-800 border border-gray-600 overflow-hidden rounded p-1">
          {effect.image ? (
            <img 
              src={effect.image} 
              alt={effect.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-xs">
                  {effect.category === 'Generative' ? '🌊' : effect.category === 'Overlays' ? '📊' : '✨'}
                </div>
                <div className="text-xs font-mono text-gray-300 uppercase tracking-wider">
                  {effect.category.slice(0, 3)}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Drag indicator */}
        <div className="absolute bottom-1 right-1 z-20">
          <div className="bg-gray-600 text-gray-900 text-xs font-bold px-1 py-0.5 border border-gray-700">
            ↙
          </div>
        </div>
      </div>
    </div>
  );
};

export function EffectsLibrarySidebar({
  effects,
  selectedEffects,
  onEffectToggle,
  onEffectDoubleClick,
  isVisible,
  className,
  // Inspector props
  editingEffectId,
  editingEffect,
  editingEffectInstance,
  activeSliderValues = {},
  baseParameterValues = {},
  onParameterChange,
  onBack,
  // Mapping props
  mappings = {},
  featureNames = {},
  onMapFeature,
  onUnmapFeature,
  onModulationAmountChange,
  // ImageSlideshow specific props
  projectId,
  availableFiles = [],
  activeCollectionId,
  setActiveCollectionId,
  modulatedParameterValues = {},
  layers = [],
  setActiveParam
}: EffectsLibrarySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Generative': true,
    'Overlays': true,
    'Filters': true
  });

  // Check if we're editing imageSlideshow (needs wider sidebar)
  const isEditingSlideshow = editingEffectId === 'imageSlideshow' || 
    (editingEffectInstance && layers.find(l => l.id === editingEffectId && l.effectType === 'imageSlideshow'));

  // Filter effects based on search query
  const filteredEffects = React.useMemo(() => {
    if (!searchQuery.trim()) return effects;
    
    const query = searchQuery.toLowerCase();
    return effects.filter(effect => 
      effect.name.toLowerCase().includes(query) ||
      effect.description.toLowerCase().includes(query) ||
      effect.category.toLowerCase().includes(query) ||
      effect.rarity.toLowerCase().includes(query)
    );
  }, [effects, searchQuery]);

  // Group filtered effects by category
  const categorizedEffects = React.useMemo(() => {
    const categories: Record<string, EffectUIData[]> = {
      'Generative': [],
      'Overlays': [],
      'Filters': []
    };

    filteredEffects.forEach(effect => {
      if (categories[effect.category]) {
        categories[effect.category].push(effect);
      }
    });

    return categories;
  }, [filteredEffects]);

  // Get card styling - all cards are now grey
  const getCardStyle = (rarity: string, isActive: boolean) => {
    return {
      name: rarity,
      background: 'bg-neutral-700',
      border: 'border-neutral-600',
      glow: 'shadow-gray-600/50',
      textColor: 'text-white',
      frameColor: 'bg-gray-500'
    };
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Render the ImageSlideshow Inspector (special case with CollectionManager)
  const renderSlideshowInspector = () => {
    if (!editingEffectId) return null;

    // Find the slideshow layer - might be editing by effectType ID or layer ID
    const slideshowLayer = layers.find(l => 
      l.id === editingEffectId || 
      (l.type === 'effect' && l.effectType === 'imageSlideshow')
    );
    const layerId = slideshowLayer?.id || editingEffectId;

    return (
      <div className="h-full flex flex-col">
        {/* Header with Back button */}
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={onBack}
              className="p-1 rounded hover:bg-gray-700 transition-colors"
              aria-label="Back to library"
            >
              <ChevronLeft className="h-4 w-4 text-gray-400" />
            </button>
            <h2 className="font-mono text-sm font-bold text-gray-100 uppercase tracking-wider">
              Image Slideshow
            </h2>
          </div>
          <p className="text-xs text-white/60 pl-6">Rhythmic image slideshow triggered by audio transients</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Collection Manager */}
          {projectId && (
            <CollectionManager
              projectId={projectId}
              availableFiles={availableFiles}
              onSelectCollection={(imageUrls, collectionId) => {
                console.log('🖼️ Collection selected, updating effect with layerId:', layerId, 'imageUrls count:', imageUrls.length);
                onParameterChange?.(layerId, 'images', imageUrls);
                setActiveCollectionId?.(collectionId);
              }}
              selectedCollectionId={activeCollectionId}
            />
          )}

          {/* Playback Settings Section */}
          <div className="pt-4 border-t border-white/10">
            <Label className="text-xs uppercase text-stone-400 mb-3 block">Playback Settings</Label>
            
            <div className="space-y-4">
              {/* Advance Trigger */}
              <DroppableParameter
                parameterId={makeParamKey(layerId, 'triggerValue')}
                label="Advance Trigger"
                mappedFeatureId={slideshowLayer?.settings?.triggerSourceId || mappings[makeParamKey(layerId, 'triggerValue')]?.featureId}
                mappedFeatureName={
                  slideshowLayer?.settings?.triggerSourceId 
                    ? featureNames[slideshowLayer.settings.triggerSourceId] 
                    : (mappings[makeParamKey(layerId, 'triggerValue')]?.featureId 
                        ? featureNames[mappings[makeParamKey(layerId, 'triggerValue')]?.featureId!] 
                        : undefined)
                }
                modulationAmount={mappings[makeParamKey(layerId, 'triggerValue')]?.modulationAmount ?? 0.5}
                baseValue={baseParameterValues[layerId]?.['triggerValue'] ?? 0}
                modulatedValue={modulatedParameterValues[makeParamKey(layerId, 'triggerValue')] ?? 0}
                sliderMax={1}
                onFeatureDrop={onMapFeature || (() => {})}
                onFeatureUnmap={onUnmapFeature || (() => {})}
                onModulationAmountChange={onModulationAmountChange}
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

              {/* Threshold */}
              <div className="space-y-1">
                <Label className="text-xs text-white/80 font-mono">Threshold</Label>
                <Slider
                  value={[activeSliderValues[layerId]?.['threshold'] ?? 0.5]}
                  onValueChange={([val]) => {
                    setActiveParam?.(layerId, 'threshold', val);
                    onParameterChange?.(layerId, 'threshold', val);
                  }}
                  min={0}
                  max={1.0}
                  step={0.01}
                />
                <div className="text-[10px] text-stone-500 mt-1">
                  Trigger fires when value exceeds threshold (current: {(activeSliderValues[layerId]?.['threshold'] ?? 0.5).toFixed(2)})
                </div>
              </div>

              {/* Opacity */}
              {(() => {
                const paramKey = makeParamKey(layerId, 'opacity');
                const opacityMapping = mappings[paramKey];
                const mappedFeatureId = opacityMapping?.featureId || null;
                const mappedFeatureName = mappedFeatureId ? featureNames[mappedFeatureId] : undefined;
                const baseVal = baseParameterValues[layerId]?.['opacity'] ?? (activeSliderValues[layerId]?.['opacity'] ?? (slideshowLayer?.settings?.opacity ?? 1.0));
                const modulatedVal = modulatedParameterValues[paramKey] ?? baseVal;
                return (
                  <DroppableParameter
                    parameterId={paramKey}
                    label="Opacity"
                    mappedFeatureId={mappedFeatureId}
                    mappedFeatureName={mappedFeatureName}
                    modulationAmount={opacityMapping?.modulationAmount ?? 0.5}
                    baseValue={baseVal}
                    modulatedValue={modulatedVal}
                    sliderMax={1.0}
                    onFeatureDrop={onMapFeature || (() => {})}
                    onFeatureUnmap={onUnmapFeature || (() => {})}
                    onModulationAmountChange={onModulationAmountChange}
                    className="mb-2"
                    dropZoneStyle="inlayed"
                    showTagOnHover
                  >
                    <div className="relative z-20">
                      <Slider
                        value={[baseVal]}
                        onValueChange={([val]) => {
                          setActiveParam?.(layerId, 'opacity', val);
                          onParameterChange?.(layerId, 'opacity', val);
                        }}
                        min={0}
                        max={1.0}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  </DroppableParameter>
                );
              })()}
            </div>
          </div>

          {/* Position & Size Section */}
          <div className="pt-4 border-t border-white/10">
            <Label className="text-xs uppercase text-stone-400 mb-3 block">Position & Size</Label>
            
            <div className="space-y-4">
              {/* Position X/Y */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-white/80 font-mono">Position X</Label>
                  <Slider
                    value={[activeSliderValues[layerId]?.['position']?.x ?? (slideshowLayer?.settings?.position?.x ?? 0.5)]}
                    onValueChange={([val]) => {
                      const currentPos = slideshowLayer?.settings?.position || { x: 0.5, y: 0.5 };
                      setActiveParam?.(layerId, 'position', { ...currentPos, x: val } as any);
                      onParameterChange?.(layerId, 'position', { ...currentPos, x: val });
                    }}
                    min={0}
                    max={1.0}
                    step={0.01}
                  />
                  <div className="text-[10px] text-stone-500 mt-1">
                    {(activeSliderValues[layerId]?.['position']?.x ?? (slideshowLayer?.settings?.position?.x ?? 0.5)).toFixed(2)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs text-white/80 font-mono">Position Y</Label>
                  <Slider
                    value={[activeSliderValues[layerId]?.['position']?.y ?? (slideshowLayer?.settings?.position?.y ?? 0.5)]}
                    onValueChange={([val]) => {
                      const currentPos = slideshowLayer?.settings?.position || { x: 0.5, y: 0.5 };
                      setActiveParam?.(layerId, 'position', { ...currentPos, y: val } as any);
                      onParameterChange?.(layerId, 'position', { ...currentPos, y: val });
                    }}
                    min={0}
                    max={1.0}
                    step={0.01}
                  />
                  <div className="text-[10px] text-stone-500 mt-1">
                    {(activeSliderValues[layerId]?.['position']?.y ?? (slideshowLayer?.settings?.position?.y ?? 0.5)).toFixed(2)}
                  </div>
                </div>
              </div>
              
              {/* Width/Height */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-white/80 font-mono">Width</Label>
                  <Slider
                    value={[activeSliderValues[layerId]?.['size']?.width ?? (slideshowLayer?.settings?.size?.width ?? 1.0)]}
                    onValueChange={([val]) => {
                      const currentSize = slideshowLayer?.settings?.size || { width: 1.0, height: 1.0 };
                      setActiveParam?.(layerId, 'size', { ...currentSize, width: val } as any);
                      onParameterChange?.(layerId, 'size', { ...currentSize, width: val });
                    }}
                    min={0.1}
                    max={1.0}
                    step={0.01}
                  />
                  <div className="text-[10px] text-stone-500 mt-1">
                    {(activeSliderValues[layerId]?.['size']?.width ?? (slideshowLayer?.settings?.size?.width ?? 1.0)).toFixed(2)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs text-white/80 font-mono">Height</Label>
                  <Slider
                    value={[activeSliderValues[layerId]?.['size']?.height ?? (slideshowLayer?.settings?.size?.height ?? 1.0)]}
                    onValueChange={([val]) => {
                      const currentSize = slideshowLayer?.settings?.size || { width: 1.0, height: 1.0 };
                      setActiveParam?.(layerId, 'size', { ...currentSize, height: val } as any);
                      onParameterChange?.(layerId, 'size', { ...currentSize, height: val });
                    }}
                    min={0.1}
                    max={1.0}
                    step={0.01}
                  />
                  <div className="text-[10px] text-stone-500 mt-1">
                    {(activeSliderValues[layerId]?.['size']?.height ?? (slideshowLayer?.settings?.size?.height ?? 1.0)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Effect Enabled Toggle */}
          <div className="pt-4 border-t border-white/20">
            <div className="flex items-center justify-between">
              <Label className="text-white/80 text-xs font-mono">Effect Enabled</Label>
              <Switch 
                checked={selectedEffects[editingEffectId] ?? selectedEffects['imageSlideshow']}
                onCheckedChange={(checked) => onEffectToggle(editingEffectId)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the Inspector panel when an effect is being edited
  const renderInspector = () => {
    if (!editingEffectId) return null;

    // Check if this is imageSlideshow (either by ID or by layer effectType)
    // imageSlideshow can render even without an instance (uses effect definition)
    if (isEditingSlideshow) {
      return renderSlideshowInspector();
    }

    // Other effects require an instance
    if (!editingEffectInstance) return null;

    const effectInstance = editingEffectInstance;
    
    // Sort parameters: booleans first, then others
    const sortedParams = Object.entries(effectInstance.parameters)
      .filter(([paramName]) => paramName !== 'sourceTexture' && paramName !== 'id')
      .sort(([, a], [, b]) => {
        if (typeof a === 'boolean' && typeof b !== 'boolean') return -1;
        if (typeof a !== 'boolean' && typeof b === 'boolean') return 1;
        return 0;
      });

    return (
      <div className="h-full flex flex-col">
        {/* Header with Back button */}
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={onBack}
              className="p-1 rounded hover:bg-gray-700 transition-colors"
              aria-label="Back to library"
            >
              <ChevronLeft className="h-4 w-4 text-gray-400" />
            </button>
            <h2 className="font-mono text-sm font-bold text-gray-100 uppercase tracking-wider">
              {effectInstance.name.replace(' Effect', '')}
            </h2>
          </div>
          <p className="text-xs text-white/60 pl-6">{effectInstance.description}</p>
        </div>

        {/* Scrollable Parameters */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {sortedParams.length === 0 ? (
            <div className="text-white/60 text-xs font-mono text-center py-4">
              No configurable parameters.
            </div>
          ) : (
            sortedParams.map(([paramName, value]) => {
              // Boolean parameters - render as Switch
              if (typeof value === 'boolean') {
                return (
                  <div key={paramName} className="flex items-center justify-between">
                    <Label className="text-white/80 text-xs font-mono">{paramName}</Label>
                    <Switch
                      checked={activeSliderValues[editingEffectId]?.[paramName] ?? value}
                      onCheckedChange={(checked) => onParameterChange?.(editingEffectId, paramName, checked)}
                    />
                  </div>
                );
              }

              // Number parameters - render as Slider with DroppableParameter
              if (typeof value === 'number') {
                const paramKey = makeParamKey(editingEffectId, paramName);
                let mapping = mappings[paramKey];
                
                // SAFEGUARD: Also check for legacy mappings stored by effect TYPE (not instance ID)
                // These should NOT be shown for specific instances - they were from old code
                // Effect types are short strings like "metaballs", "particleNetwork"
                // Instance IDs are longer like "effect-metaballs-1234567890-abc12"
                const effectTypeNames = ['metaballs', 'particleNetwork', 'imageSlideshow', 'asciiFilter', 'bloomFilter'];
                const legacyParamKey = effectTypeNames.find(t => editingEffectId.includes(t))
                  ? makeParamKey(effectTypeNames.find(t => editingEffectId.includes(t))!, paramName)
                  : null;
                
                // If we found a legacy mapping but NOT an instance-specific one, DON'T show the legacy one
                // This ensures new instances start clean
                if (!mapping && legacyParamKey && mappings[legacyParamKey]) {
                  console.log('⚠️ [Inspector] Ignoring legacy effect-type mapping:', {
                    editingEffectId,
                    paramName,
                    legacyParamKey,
                    paramKey
                  });
                  // Don't use the legacy mapping - leave mapping as undefined
                }
                
                const mappedFeatureId = mapping?.featureId || null;
                const mappedFeatureName = mappedFeatureId ? featureNames[mappedFeatureId] : undefined;
                const modulationAmount = mapping?.modulationAmount ?? 0.5;
                const sliderMax = getSliderMax(paramName);
                const baseValue = baseParameterValues[editingEffectId]?.[paramName] ?? value;
                const activeValue = activeSliderValues[editingEffectId]?.[paramName] ?? value;

                return (
                  <DroppableParameter
                    key={paramKey}
                    parameterId={paramKey}
                    label={paramName}
                    mappedFeatureId={mappedFeatureId}
                    mappedFeatureName={mappedFeatureName}
                    modulationAmount={modulationAmount}
                    baseValue={baseValue}
                    modulatedValue={activeValue}
                    sliderMax={sliderMax}
                    onFeatureDrop={onMapFeature || (() => {})}
                    onFeatureUnmap={onUnmapFeature || (() => {})}
                    onModulationAmountChange={onModulationAmountChange}
                    className="mb-2"
                    dropZoneStyle="inlayed"
                    showTagOnHover
                  >
                    <Slider
                      value={[activeValue]}
                      onValueChange={([val]) => onParameterChange?.(editingEffectId, paramName, val)}
                      min={0}
                      max={sliderMax}
                      step={getSliderStep(paramName)}
                      className="w-full"
                    />
                  </DroppableParameter>
                );
              }

              // Color parameters (arrays like highlightColor, particleColor, textColor)
              if ((paramName === 'highlightColor' || paramName === 'particleColor' || paramName === 'textColor') && Array.isArray(value)) {
                const displayName = paramName === 'highlightColor' 
                  ? 'Highlight Color' 
                  : paramName === 'particleColor' 
                    ? 'Particle Color' 
                    : 'Text Color';
                
                const currentValue = activeSliderValues[editingEffectId]?.[paramName] ?? value;
                
                return (
                  <div key={paramName} className="space-y-2">
                    <Label className="text-white/90 text-sm font-medium flex items-center justify-between">
                      {displayName}
                      <span 
                        className="ml-2 w-6 h-6 rounded-full border border-white/40 inline-block" 
                        style={{ 
                          background: `rgb(${currentValue.map((v: number) => Math.round(v * 255)).join(',')})` 
                        }} 
                      />
                    </Label>
                    <input
                      type="color"
                      value={`#${currentValue.map((v: number) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`}
                      onChange={e => {
                        const hex = e.target.value;
                        const rgb = [
                          parseInt(hex.slice(1, 3), 16) / 255,
                          parseInt(hex.slice(3, 5), 16) / 255,
                          parseInt(hex.slice(5, 7), 16) / 255
                        ];
                        onParameterChange?.(editingEffectId, paramName, rgb);
                      }}
                      className="w-12 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                    />
                  </div>
                );
              }

              return null;
            })
          )}

          {/* Effect Enabled Toggle */}
          <div className="pt-4 border-t border-white/20">
            <div className="flex items-center justify-between">
              <Label className="text-white/80 text-xs font-mono">Effect Enabled</Label>
              <Switch 
                checked={selectedEffects[editingEffectId]}
                onCheckedChange={(checked) => onEffectToggle(editingEffectId)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the Library view
  const renderLibrary = () => (
    <>
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <h2 className="font-mono text-sm font-bold text-gray-100 uppercase tracking-wider mb-2">
          Effects Library
        </h2>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search effects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-7 py-1.5 bg-gray-900 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Object.entries(categorizedEffects).map(([category, categoryEffects]) => {
          if (categoryEffects.length === 0) return null;
          
          const isExpanded = expandedCategories[category];
          
          return (
            <div key={category} className="space-y-1.5">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-2 bg-gray-900 border border-gray-700 hover:bg-gray-800 transition-colors"
              >
                <span className="font-mono text-xs font-semibold text-gray-300 uppercase tracking-wide">
                  {category}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {categoryEffects.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Category Effects Grid */}
              {isExpanded && (
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  {categoryEffects.map((effect, index) => {
                    const cardStyle = getCardStyle(effect.rarity, selectedEffects[effect.id]);
                    
                    return (
                      <DraggableEffectCard
                        key={effect.id}
                        effect={effect}
                        cardStyle={cardStyle}
                        onDoubleClick={() => onEffectDoubleClick(effect.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* No results message */}
        {filteredEffects.length === 0 && (
          <div className="text-center py-4">
            <div className="text-gray-500 text-xs">
              No effects found matching "{searchQuery}"
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearSearch}
              className="mt-2 text-xs text-gray-400 border-gray-700 hover:bg-gray-800"
            >
              Clear search
            </Button>
          </div>
        )}
      </div>
    </>
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div className={cn(
      "h-full w-full flex flex-col bg-black border-l border-gray-800",
      className
    )}>
      {editingEffectId && (editingEffectInstance || isEditingSlideshow) ? renderInspector() : renderLibrary()}
    </div>
  );
}
