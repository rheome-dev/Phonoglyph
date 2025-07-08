'use client';

import React from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLayerStore, VideoLayer, EffectLayer } from '@/lib/stores/layerStore';
import { LayerItem } from './LayerItem';
import { LayerControls } from './LayerControls';
import { AddLayerMenu } from './AddLayerMenu';
import { MIDIBindingPanel } from '../midi/MIDIBindingPanel';

export const LayerStack: React.FC = () => {
  const { 
    layers, 
    selectedLayerIds, 
    reorderLayers,
    addLayer,
    setDraggedLayer,
    addMIDIBinding,
    removeMIDIBinding,
    updateMIDIBinding,
    getMIDIBindings
  } = useLayerStore();
  
  // Add demo layers if empty
  React.useEffect(() => {
    if (layers.length === 0) {
      // Add some demo layers to showcase the interface
      addLayer({
        name: 'Background Video',
        type: 'video',
        visible: true,
        muted: false,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        startTime: 0,
        endTime: 60,
        assetId: '',
        playbackRate: 1,
        volume: 1,
        trimStart: 0,
        trimEnd: 0,
        transform: {
          x: 0, y: 0, scaleX: 1, scaleY: 1,
          rotation: 0, anchorX: 0.5, anchorY: 0.5
        }
      } as Omit<VideoLayer, 'id' | 'zIndex'>);
      
      addLayer({
        name: 'Particle Effects',
        type: 'effect',
        visible: true,
        muted: false,
        locked: false,
        opacity: 0.8,
        blendMode: 'screen',
        startTime: 0,
        endTime: 60,
        effectType: 'particles',
        settings: {
          particleCount: 150,
          connectionDistance: 80,
          nodeSize: 2,
          colorScheme: 'cool'
        },
        midiBindings: []
      } as Omit<EffectLayer, 'id' | 'zIndex'>);
      
      addLayer({
        name: 'MIDI Visualization',
        type: 'effect',
        visible: true,
        muted: false,
        locked: false,
        opacity: 0.9,
        blendMode: 'normal',
        startTime: 0,
        endTime: 60,
        effectType: 'midihud',
        settings: {
          showNoteNames: true,
          showVelocity: true,
          colorScheme: 'rainbow',
          fadeTime: 2000
        },
        midiBindings: []
      } as Omit<EffectLayer, 'id' | 'zIndex'>);
    }
  }, [layers.length, addLayer]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  // Sort layers by z-index (highest first for display)
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  
  const handleDragStart = (event: any) => {
    setDraggedLayer(event.active.id);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedLayer(null);
    
    if (over && active.id !== over.id) {
      const oldIndex = sortedLayers.findIndex(l => l.id === active.id);
      const newIndex = sortedLayers.findIndex(l => l.id === over.id);
      reorderLayers(oldIndex, newIndex);
    }
  };
  
  const selectedLayer = selectedLayerIds.length === 1 ? layers.find(l => l.id === selectedLayerIds[0]) : null;
  const selectedLayerBindings = selectedLayer ? getMIDIBindings(selectedLayer.id) : [];

  return (
    <div className="w-80 space-y-4">
      {/* Layer Stack */}
      <Card className="bg-stone-200/90 backdrop-blur-md border-stone-400 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-stone-700 uppercase tracking-wide text-sm">
              Layers
            </CardTitle>
            <AddLayerMenu onAddLayer={addLayer} />
          </div>
          
          {/* Layer Controls */}
          <LayerControls selectedLayerIds={selectedLayerIds} />
        </CardHeader>
        
        <CardContent className="flex-1 min-h-0 overflow-hidden">
          <div className="space-y-1 max-h-full overflow-y-auto">
            <DndContext 
              sensors={sensors} 
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={sortedLayers.map(l => l.id)} 
                strategy={verticalListSortingStrategy}
              >
                {sortedLayers.map((layer) => (
                  <LayerItem 
                    key={layer.id} 
                    layer={layer}
                    isSelected={selectedLayerIds.includes(layer.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            
            {layers.length === 0 && (
              <div className="text-center text-stone-600 py-8">
                <div className="text-4xl mb-4">🎬</div>
                <p className="text-sm mb-2">No layers yet</p>
                <p className="text-xs text-stone-500">Add video, image, or effect layers to begin</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* MIDI Binding Panel - Only show when a single layer is selected */}
      {selectedLayer && (
        <MIDIBindingPanel
          layerId={selectedLayer.id}
          bindings={selectedLayerBindings}
          onAddBinding={(binding) => addMIDIBinding(selectedLayer.id, binding)}
          onUpdateBinding={(bindingId, updates) => updateMIDIBinding(selectedLayer.id, bindingId, updates)}
          onRemoveBinding={(bindingId) => removeMIDIBinding(selectedLayer.id, bindingId)}
          onTestBinding={(bindingId) => {
            // Test binding functionality - would trigger a demo value
            console.log(`Testing binding ${bindingId} for layer ${selectedLayer.id}`);
          }}
        />
      )}
    </div>
  );
};