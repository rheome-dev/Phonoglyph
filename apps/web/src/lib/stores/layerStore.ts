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

export interface MIDIBinding {
  id: string;
  midiCC: number;
  targetProperty: string;
  minValue: number;
  maxValue: number;
  curve: 'linear' | 'exponential' | 'logarithmic';
}

interface LayerStore {
  layers: Layer[];
  selectedLayerIds: string[];
  draggedLayerId: string | null;
  
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
      }
    }),
    { 
      name: 'layer-store',
      partialize: (state: LayerStore) => ({ layers: state.layers })
    }
  )
);