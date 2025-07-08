import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface BaseLayer {
  id: string;
  name: string;
  type: 'video' | 'image' | 'effect' | 'group';
  visible: boolean;
  muted: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  zIndex: number;
  groupId?: string;
  startTime: number;
  endTime: number;
}

export interface VideoLayer extends BaseLayer {
  type: 'video';
  assetId: string;
  playbackRate: number;
  volume: number;
  trimStart: number;
  trimEnd: number;
  transform: LayerTransform;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  assetId: string;
  transform: LayerTransform;
}

export interface EffectLayer extends BaseLayer {
  type: 'effect';
  effectType: 'metaballs' | 'particles' | 'midihud' | 'bloom';
  settings: VisualizationSettings;
  midiBindings: MIDIBinding[];
}

export interface GroupLayer extends BaseLayer {
  type: 'group';
  childIds: string[];
  collapsed: boolean;
}

export type Layer = VideoLayer | ImageLayer | EffectLayer | GroupLayer;
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';

export interface LayerTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  anchorX: number;
  anchorY: number;
}

export interface VisualizationSettings {
  [key: string]: any;
}

// Enhanced MIDI binding interface
export interface MIDIBinding {
  id: string;
  name: string;
  layerId: string;
  targetProperty: VideoProperty;
  midiSource: MIDISource;
  mapping: ParameterMapping;
  curve: CurveType;
  enabled: boolean;
  weight: number;
  blendMode: BindingBlendMode;
}

export interface MIDISource {
  type: 'note_velocity' | 'note_on_off' | 'cc' | 'pitch_bend' | 'channel_pressure' | 'aftertouch';
  channel?: number;
  note?: number;
  controller?: number;
  trackIndex?: number;
}

export interface VideoProperty {
  type: 'transform' | 'visual' | 'timing';
  property: string;
  component?: string;
}

export interface ParameterMapping {
  inputMin: number;
  inputMax: number;
  outputMin: number;
  outputMax: number;
  clamp: boolean;
  invert: boolean;
}

export type CurveType = 'linear' | 'exponential' | 'logarithmic' | 'smooth' | 'steps' | 'custom';
export type BindingBlendMode = 'replace' | 'add' | 'multiply' | 'max' | 'min' | 'average';

interface LayerStore {
  layers: Layer[];
  selectedLayerIds: string[];
  draggedLayerId: string | null;
  
  // MIDI bindings
  midiBindings: Map<string, MIDIBinding[]>; // layerId -> bindings[]
  
  // Layer CRUD
  addLayer: (layer: Omit<Layer, 'id' | 'zIndex'>) => string;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  duplicateLayer: (layerId: string) => string;
  
  // Layer ordering
  reorderLayers: (sourceIndex: number, targetIndex: number) => void;
  moveLayerToTop: (layerId: string) => void;
  moveLayerToBottom: (layerId: string) => void;
  
  // Layer selection
  selectLayer: (layerId: string, addToSelection?: boolean) => void;
  selectMultipleLayers: (layerIds: string[]) => void;
  clearSelection: () => void;
  
  // Layer visibility and state
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerMute: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerBlendMode: (layerId: string, blendMode: BlendMode) => void;
  
  // Group operations
  groupLayers: (layerIds: string[], groupName: string) => string;
  ungroupLayers: (groupId: string) => void;
  toggleGroupCollapse: (groupId: string) => void;
  
  // Bulk operations
  setMultipleLayersProperty: <K extends keyof Layer>(
    layerIds: string[], 
    property: K, 
    value: Layer[K]
  ) => void;
  
  // Drag state
  setDraggedLayer: (layerId: string | null) => void;
  
  // MIDI binding management
  addMIDIBinding: (layerId: string, binding: Omit<MIDIBinding, 'id'>) => string;
  removeMIDIBinding: (layerId: string, bindingId: string) => void;
  updateMIDIBinding: (layerId: string, bindingId: string, updates: Partial<MIDIBinding>) => void;
  getMIDIBindings: (layerId: string) => MIDIBinding[];
}

// Helper functions
function generateLayerId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

export const useLayerStore = create<LayerStore>()(
  devtools(
    (set, get) => ({
      layers: [],
      selectedLayerIds: [],
      draggedLayerId: null,
      midiBindings: new Map(),
      
      addLayer: (layerData) => {
        const id = generateLayerId();
        const maxZIndex = Math.max(...get().layers.map(l => l.zIndex), 0);
        const newLayer = {
          ...layerData,
          id,
          zIndex: maxZIndex + 1
        } as Layer;
        
        set((state) => ({
          layers: [...state.layers, newLayer]
        }));
        
        return id;
      },
      
      removeLayer: (layerId) => {
        set((state) => {
          // Also remove from groups if it's a child
          const updatedLayers = state.layers
            .filter(l => l.id !== layerId)
            .map(layer => {
              if (layer.type === 'group') {
                const groupLayer = layer as GroupLayer;
                return {
                  ...groupLayer,
                  childIds: groupLayer.childIds.filter(id => id !== layerId)
                };
              }
              return layer;
            });
          
          return {
            layers: updatedLayers,
            selectedLayerIds: state.selectedLayerIds.filter(id => id !== layerId)
          };
        });
      },
      
      updateLayer: (layerId, updates) => {
        set((state) => ({
          layers: state.layers.map(layer =>
            layer.id === layerId ? { ...layer, ...updates } : layer
          )
        }));
      },
      
      duplicateLayer: (layerId) => {
        const layer = get().layers.find(l => l.id === layerId);
        if (!layer) return '';
        
                 const { id, zIndex, name, ...layerData } = layer;
         const newId = get().addLayer({
           ...layerData,
           name: `${name} Copy`
         } as Omit<Layer, 'id' | 'zIndex'>);
        
        return newId;
      },
      
      reorderLayers: (sourceIndex, targetIndex) => {
        set((state) => {
          const sortedLayers = [...state.layers].sort((a, b) => b.zIndex - a.zIndex);
          const [moved] = sortedLayers.splice(sourceIndex, 1);
          sortedLayers.splice(targetIndex, 0, moved);
          
          // Update z-index values based on new order
          const updatedLayers = state.layers.map(layer => {
            const newIndex = sortedLayers.findIndex(l => l.id === layer.id);
            return {
              ...layer,
              zIndex: sortedLayers.length - newIndex
            } as Layer;
          });
          
          return { layers: updatedLayers };
        });
      },
      
      moveLayerToTop: (layerId) => {
        const maxZIndex = Math.max(...get().layers.map(l => l.zIndex));
        get().updateLayer(layerId, { zIndex: maxZIndex + 1 });
      },
      
      moveLayerToBottom: (layerId) => {
        const minZIndex = Math.min(...get().layers.map(l => l.zIndex));
        get().updateLayer(layerId, { zIndex: minZIndex - 1 });
      },
      
      selectLayer: (layerId, addToSelection = false) => {
        set((state) => ({
          selectedLayerIds: addToSelection 
            ? [...state.selectedLayerIds, layerId]
            : [layerId]
        }));
      },
      
      selectMultipleLayers: (layerIds) => {
        set({ selectedLayerIds: layerIds });
      },
      
      clearSelection: () => {
        set({ selectedLayerIds: [] });
      },
      
      toggleLayerVisibility: (layerId) => {
        const layer = get().layers.find(l => l.id === layerId);
        if (layer) {
          get().updateLayer(layerId, { visible: !layer.visible });
        }
      },
      
      toggleLayerMute: (layerId) => {
        const layer = get().layers.find(l => l.id === layerId);
        if (layer) {
          get().updateLayer(layerId, { muted: !layer.muted });
        }
      },
      
      setLayerOpacity: (layerId, opacity) => {
        get().updateLayer(layerId, { opacity: Math.max(0, Math.min(1, opacity)) });
      },
      
      setLayerBlendMode: (layerId, blendMode) => {
        get().updateLayer(layerId, { blendMode });
      },
      
      groupLayers: (layerIds, groupName) => {
        const groupId = get().addLayer({
          name: groupName,
          type: 'group',
          visible: true,
          muted: false,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          startTime: 0,
          endTime: 60,
          childIds: layerIds,
          collapsed: false
        } as GroupLayer);
        
        // Update child layers to belong to group
        layerIds.forEach(layerId => {
          get().updateLayer(layerId, { groupId });
        });
        
        return groupId;
      },
      
      ungroupLayers: (groupId) => {
        const group = get().layers.find(l => l.id === groupId) as GroupLayer;
        if (group && group.type === 'group') {
          // Remove group reference from children
          group.childIds.forEach(layerId => {
            get().updateLayer(layerId, { groupId: undefined });
          });
          
          // Remove the group layer
          get().removeLayer(groupId);
        }
      },
      
      toggleGroupCollapse: (groupId) => {
        const group = get().layers.find(l => l.id === groupId) as GroupLayer;
        if (group && group.type === 'group') {
          get().updateLayer(groupId, { collapsed: !group.collapsed });
        }
      },
      
      setMultipleLayersProperty: (layerIds, property, value) => {
        set((state) => ({
          layers: state.layers.map(layer =>
            layerIds.includes(layer.id) 
              ? { ...layer, [property]: value }
              : layer
          )
        }));
      },
      
      setDraggedLayer: (layerId) => {
        set({ draggedLayerId: layerId });
      },
      
      // MIDI binding methods
      addMIDIBinding: (layerId, bindingData) => {
        const id = `binding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newBinding = { ...bindingData, id, layerId };
        
        set((state) => {
          const newBindings = new Map(state.midiBindings);
          const layerBindings = newBindings.get(layerId) || [];
          layerBindings.push(newBinding);
          newBindings.set(layerId, layerBindings);
          return { midiBindings: newBindings };
        });
        
        return id;
      },
      
      removeMIDIBinding: (layerId, bindingId) => {
        set((state) => {
          const newBindings = new Map(state.midiBindings);
          const layerBindings = newBindings.get(layerId) || [];
          const filteredBindings = layerBindings.filter(b => b.id !== bindingId);
          newBindings.set(layerId, filteredBindings);
          return { midiBindings: newBindings };
        });
      },
      
      updateMIDIBinding: (layerId, bindingId, updates) => {
        set((state) => {
          const newBindings = new Map(state.midiBindings);
          const layerBindings = newBindings.get(layerId) || [];
          const updatedBindings = layerBindings.map(binding =>
            binding.id === bindingId ? { ...binding, ...updates } : binding
          );
          newBindings.set(layerId, updatedBindings);
          return { midiBindings: newBindings };
        });
      },
      
      getMIDIBindings: (layerId) => {
        return get().midiBindings.get(layerId) || [];
      }
    }),
    { 
      name: 'layer-store',
      partialize: (state: LayerStore) => ({ layers: state.layers })
    }
  )
);