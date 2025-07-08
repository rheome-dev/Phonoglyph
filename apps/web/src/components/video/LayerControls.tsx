'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Volume2, VolumeX, Copy, Trash2, Group, Ungroup } from 'lucide-react';
import { useLayerStore } from '@/lib/stores/layerStore';

interface LayerControlsProps {
  selectedLayerIds: string[];
}

export const LayerControls: React.FC<LayerControlsProps> = ({ selectedLayerIds }) => {
  const {
    layers,
    removeLayer,
    duplicateLayer,
    toggleLayerVisibility,
    toggleLayerMute,
    groupLayers,
    ungroupLayers,
    setMultipleLayersProperty
  } = useLayerStore();
  
  const selectedLayers = layers.filter(layer => selectedLayerIds.includes(layer.id));
  const hasSelection = selectedLayerIds.length > 0;
  const hasMultipleSelection = selectedLayerIds.length > 1;
  
  // Check if all selected layers are visible/muted
  const allVisible = selectedLayers.every(layer => layer.visible);
  const allMuted = selectedLayers.every(layer => layer.muted);
  
  // Check if any selected layer is a group
  const hasGroupSelected = selectedLayers.some(layer => layer.type === 'group');
  
  const handleBulkVisibilityToggle = () => {
    selectedLayerIds.forEach(layerId => {
      toggleLayerVisibility(layerId);
    });
  };
  
  const handleBulkMuteToggle = () => {
    selectedLayerIds.forEach(layerId => {
      const layer = layers.find(l => l.id === layerId);
      if (layer && (layer.type === 'video' || layer.type === 'effect')) {
        toggleLayerMute(layerId);
      }
    });
  };
  
  const handleBulkDelete = () => {
    selectedLayerIds.forEach(layerId => {
      removeLayer(layerId);
    });
  };
  
  const handleBulkDuplicate = () => {
    selectedLayerIds.forEach(layerId => {
      duplicateLayer(layerId);
    });
  };
  
  const handleGroupLayers = () => {
    if (hasMultipleSelection) {
      groupLayers(selectedLayerIds, `Group ${Date.now()}`);
    }
  };
  
  const handleUngroupLayers = () => {
    selectedLayerIds.forEach(layerId => {
      const layer = layers.find(l => l.id === layerId);
      if (layer && layer.type === 'group') {
        ungroupLayers(layerId);
      }
    });
  };
  
  if (!hasSelection) {
    return (
      <div className="text-xs text-stone-500 text-center py-2">
        Select layers to see controls
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 py-2">
      {/* Visibility Toggle */}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={handleBulkVisibilityToggle}
        title={allVisible ? 'Hide selected layers' : 'Show selected layers'}
      >
        {allVisible ? (
          <EyeOff size={14} className="text-stone-600" />
        ) : (
          <Eye size={14} className="text-stone-600" />
        )}
      </Button>
      
      {/* Mute Toggle */}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={handleBulkMuteToggle}
        title={allMuted ? 'Unmute selected layers' : 'Mute selected layers'}
      >
        {allMuted ? (
          <Volume2 size={14} className="text-stone-600" />
        ) : (
          <VolumeX size={14} className="text-stone-600" />
        )}
      </Button>
      
      <div className="w-px h-4 bg-stone-400 mx-1" />
      
      {/* Duplicate */}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={handleBulkDuplicate}
        title="Duplicate selected layers"
      >
        <Copy size={14} className="text-stone-600" />
      </Button>
      
      {/* Delete */}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={handleBulkDelete}
        title="Delete selected layers"
      >
        <Trash2 size={14} className="text-red-600" />
      </Button>
      
      <div className="w-px h-4 bg-stone-400 mx-1" />
      
      {/* Group/Ungroup */}
      {hasMultipleSelection && !hasGroupSelected && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleGroupLayers}
          title="Group selected layers"
        >
          <Group size={14} className="text-stone-600" />
        </Button>
      )}
      
      {hasGroupSelected && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleUngroupLayers}
          title="Ungroup selected groups"
        >
          <Ungroup size={14} className="text-stone-600" />
        </Button>
      )}
      
      {/* Selection Info */}
      <div className="ml-auto text-xs text-stone-600">
        {selectedLayerIds.length} selected
      </div>
    </div>
  );
};