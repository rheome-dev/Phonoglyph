'use client';

import React from 'react';
import { Plus, Film, Image, Sparkles, Folder } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Layer, VideoLayer, ImageLayer, EffectLayer, GroupLayer, LayerTransform, VisualizationSettings, MIDIBinding } from '@/lib/stores/layerStore';

interface AddLayerMenuProps {
  onAddLayer: (layer: Omit<Layer, 'id' | 'zIndex'>) => string;
}

function getDefaultTransform(): LayerTransform {
  return {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    anchorX: 0.5,
    anchorY: 0.5
  };
}

function getDefaultEffectSettings(effectType: string): VisualizationSettings {
  switch (effectType) {
    case 'metaballs':
      return {
        ballCount: 12,
        ballSize: 0.8,
        colorScheme: 'warm',
        intensity: 0.7
      };
    case 'particles':
      return {
        particleCount: 200,
        connectionDistance: 100,
        nodeSize: 2,
        colorScheme: 'cool'
      };
    case 'midihud':
      return {
        showNoteNames: true,
        showVelocity: true,
        colorScheme: 'rainbow',
        fadeTime: 2000
      };
    case 'bloom':
      return {
        intensity: 0.5,
        threshold: 0.8,
        radius: 0.4
      };
    default:
      return {};
  }
}

export const AddLayerMenu: React.FC<AddLayerMenuProps> = ({ onAddLayer }) => {
  const createVideoLayer = () => {
    const videoLayer: Omit<VideoLayer, 'id' | 'zIndex'> = {
      name: 'New Video Layer',
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
      transform: getDefaultTransform()
    };
    onAddLayer(videoLayer);
  };
  
  const createImageLayer = () => {
    const imageLayer: Omit<ImageLayer, 'id' | 'zIndex'> = {
      name: 'New Image Layer',
      type: 'image',
      visible: true,
      muted: false,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      startTime: 0,
      endTime: 60,
      assetId: '',
      transform: getDefaultTransform()
    };
    onAddLayer(imageLayer);
  };
  
  const createEffectLayer = (effectType: 'metaballs' | 'particles' | 'midihud' | 'bloom') => {
    const effectLayer: Omit<EffectLayer, 'id' | 'zIndex'> = {
      name: `${effectType.charAt(0).toUpperCase() + effectType.slice(1)} Effect`,
      type: 'effect',
      visible: true,
      muted: false,
      locked: false,
      opacity: 0.8,
      blendMode: 'screen',
      startTime: 0,
      endTime: 60,
      effectType,
      settings: getDefaultEffectSettings(effectType),
      midiBindings: []
    };
    onAddLayer(effectLayer);
  };
  
  const createGroupLayer = () => {
    const groupLayer: Omit<GroupLayer, 'id' | 'zIndex'> = {
      name: 'New Group',
      type: 'group',
      visible: true,
      muted: false,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      startTime: 0,
      endTime: 60,
      childIds: [],
      collapsed: false
    };
    onAddLayer(groupLayer);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-7 w-7 p-0 bg-stone-600 hover:bg-stone-700">
          <Plus size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-stone-200 border-stone-400">
        <DropdownMenuItem onClick={createVideoLayer}>
          <Film size={14} className="mr-2" />
          Video Layer
        </DropdownMenuItem>
        <DropdownMenuItem onClick={createImageLayer}>
          <Image size={14} className="mr-2" />
          Image Layer
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => createEffectLayer('metaballs')}>
          <Sparkles size={14} className="mr-2" />
          Metaballs Effect
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => createEffectLayer('particles')}>
          <Sparkles size={14} className="mr-2" />
          Particle Network
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => createEffectLayer('midihud')}>
          <Sparkles size={14} className="mr-2" />
          MIDI HUD
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => createEffectLayer('bloom')}>
          <Sparkles size={14} className="mr-2" />
          Bloom Effect
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={createGroupLayer}>
          <Folder size={14} className="mr-2" />
          Group Layer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};