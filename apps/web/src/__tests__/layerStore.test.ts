import { describe, test, expect, beforeEach } from 'vitest';
import { useLayerStore, Layer, VideoLayer, ImageLayer, EffectLayer, GroupLayer } from '@/lib/stores/layerStore';

describe('Layer Store', () => {
  beforeEach(() => {
    useLayerStore.setState({ 
      layers: [], 
      selectedLayerIds: [],
      draggedLayerId: null
    });
  });

  describe('Adding Layers', () => {
    test('should add video layer with correct z-index', () => {
      const store = useLayerStore.getState();
      
      const id1 = store.addLayer({
        name: 'Layer 1',
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
      
      const id2 = store.addLayer({
        name: 'Layer 2', 
        type: 'image',
        visible: true,
        muted: false,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        startTime: 0,
        endTime: 60,
        assetId: '',
        transform: {
          x: 0, y: 0, scaleX: 1, scaleY: 1, 
          rotation: 0, anchorX: 0.5, anchorY: 0.5
        }
      } as Omit<ImageLayer, 'id' | 'zIndex'>);
      
      const layers = useLayerStore.getState().layers;
      expect(layers).toHaveLength(2);
      expect(layers.find(l => l.id === id2)?.zIndex).toBeGreaterThan(
        layers.find(l => l.id === id1)?.zIndex || 0
      );
    });

    test('should add effect layer with correct default settings', () => {
      const store = useLayerStore.getState();
      
      const effectId = store.addLayer({
        name: 'Metaballs Effect',
        type: 'effect',
        visible: true,
        muted: false,
        locked: false,
        opacity: 0.8,
        blendMode: 'screen',
        startTime: 0,
        endTime: 60,
        effectType: 'metaballs',
        settings: {
          ballCount: 12,
          ballSize: 0.8,
          colorScheme: 'warm',
          intensity: 0.7
        },
        midiBindings: []
      } as Omit<EffectLayer, 'id' | 'zIndex'>);
      
      const layers = useLayerStore.getState().layers;
      const effectLayer = layers.find(l => l.id === effectId) as EffectLayer;
      
      expect(effectLayer).toBeDefined();
      expect(effectLayer.type).toBe('effect');
      expect(effectLayer.effectType).toBe('metaballs');
      expect(effectLayer.settings.ballCount).toBe(12);
    });
  });

  describe('Layer Reordering', () => {
    test('should reorder layers correctly', () => {
      const store = useLayerStore.getState();
      
      const id1 = store.addLayer({
        name: 'Layer 1', type: 'video', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', playbackRate: 1, volume: 1, trimStart: 0, trimEnd: 0,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<VideoLayer, 'id' | 'zIndex'>);
      
      const id2 = store.addLayer({
        name: 'Layer 2', type: 'image', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<ImageLayer, 'id' | 'zIndex'>);
      
      const id3 = store.addLayer({
        name: 'Layer 3', type: 'effect', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        effectType: 'particles', settings: {}, midiBindings: []
      } as Omit<EffectLayer, 'id' | 'zIndex'>);
      
      // Move first layer to bottom (index 0 to 2)
      store.reorderLayers(0, 2);
      
      const layers = useLayerStore.getState().layers;
      const sortedNames = layers
        .sort((a, b) => b.zIndex - a.zIndex)
        .map(l => l.name);
        
      expect(sortedNames).toEqual(['Layer 2', 'Layer 3', 'Layer 1']);
    });
  });

  describe('Layer Selection', () => {
    test('should select single layer', () => {
      const store = useLayerStore.getState();
      
      const layerId = store.addLayer({
        name: 'Test Layer', type: 'video', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', playbackRate: 1, volume: 1, trimStart: 0, trimEnd: 0,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<VideoLayer, 'id' | 'zIndex'>);
      
      store.selectLayer(layerId);
      
      expect(useLayerStore.getState().selectedLayerIds).toEqual([layerId]);
    });

    test('should support multi-selection', () => {
      const store = useLayerStore.getState();
      
      const id1 = store.addLayer({
        name: 'Layer 1', type: 'video', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', playbackRate: 1, volume: 1, trimStart: 0, trimEnd: 0,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<VideoLayer, 'id' | 'zIndex'>);
      
      const id2 = store.addLayer({
        name: 'Layer 2', type: 'image', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<ImageLayer, 'id' | 'zIndex'>);
      
      store.selectLayer(id1);
      store.selectLayer(id2, true); // Add to selection
      
      expect(useLayerStore.getState().selectedLayerIds).toContain(id1);
      expect(useLayerStore.getState().selectedLayerIds).toContain(id2);
    });
  });

  describe('Layer Properties', () => {
    test('should toggle layer visibility', () => {
      const store = useLayerStore.getState();
      
      const layerId = store.addLayer({
        name: 'Test Layer', type: 'video', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', playbackRate: 1, volume: 1, trimStart: 0, trimEnd: 0,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<VideoLayer, 'id' | 'zIndex'>);
      
      store.toggleLayerVisibility(layerId);
      
      const layer = useLayerStore.getState().layers.find(l => l.id === layerId);
      expect(layer?.visible).toBe(false);
    });

    test('should set layer opacity', () => {
      const store = useLayerStore.getState();
      
      const layerId = store.addLayer({
        name: 'Test Layer', type: 'video', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', playbackRate: 1, volume: 1, trimStart: 0, trimEnd: 0,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<VideoLayer, 'id' | 'zIndex'>);
      
      store.setLayerOpacity(layerId, 0.5);
      
      const layer = useLayerStore.getState().layers.find(l => l.id === layerId);
      expect(layer?.opacity).toBe(0.5);
    });

    test('should clamp opacity values', () => {
      const store = useLayerStore.getState();
      
      const layerId = store.addLayer({
        name: 'Test Layer', type: 'video', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', playbackRate: 1, volume: 1, trimStart: 0, trimEnd: 0,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<VideoLayer, 'id' | 'zIndex'>);
      
      store.setLayerOpacity(layerId, 1.5); // Should clamp to 1
      let layer = useLayerStore.getState().layers.find(l => l.id === layerId);
      expect(layer?.opacity).toBe(1);
      
      store.setLayerOpacity(layerId, -0.5); // Should clamp to 0
      layer = useLayerStore.getState().layers.find(l => l.id === layerId);
      expect(layer?.opacity).toBe(0);
    });
  });

  describe('Group Operations', () => {
    test('should create group from multiple layers', () => {
      const store = useLayerStore.getState();
      
      const id1 = store.addLayer({
        name: 'Layer 1', type: 'video', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', playbackRate: 1, volume: 1, trimStart: 0, trimEnd: 0,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<VideoLayer, 'id' | 'zIndex'>);
      
      const id2 = store.addLayer({
        name: 'Layer 2', type: 'image', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<ImageLayer, 'id' | 'zIndex'>);
      
      const groupId = store.groupLayers([id1, id2], 'Test Group');
      
      const layers = useLayerStore.getState().layers;
      const group = layers.find(l => l.id === groupId) as GroupLayer;
      const child1 = layers.find(l => l.id === id1);
      const child2 = layers.find(l => l.id === id2);
      
      expect(group).toBeDefined();
      expect(group.type).toBe('group');
      expect(group.childIds).toContain(id1);
      expect(group.childIds).toContain(id2);
      expect(child1?.groupId).toBe(groupId);
      expect(child2?.groupId).toBe(groupId);
    });

    test('should ungroup layers correctly', () => {
      const store = useLayerStore.getState();
      
      const id1 = store.addLayer({
        name: 'Layer 1', type: 'video', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', playbackRate: 1, volume: 1, trimStart: 0, trimEnd: 0,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<VideoLayer, 'id' | 'zIndex'>);
      
      const id2 = store.addLayer({
        name: 'Layer 2', type: 'image', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<ImageLayer, 'id' | 'zIndex'>);
      
      const groupId = store.groupLayers([id1, id2], 'Test Group');
      store.ungroupLayers(groupId);
      
      const layers = useLayerStore.getState().layers;
      const group = layers.find(l => l.id === groupId);
      const child1 = layers.find(l => l.id === id1);
      const child2 = layers.find(l => l.id === id2);
      
      expect(group).toBeUndefined();
      expect(child1?.groupId).toBeUndefined();
      expect(child2?.groupId).toBeUndefined();
    });
  });

  describe('Layer Duplication', () => {
    test('should duplicate layer with correct properties', () => {
      const store = useLayerStore.getState();
      
      const originalId = store.addLayer({
        name: 'Original Layer', type: 'video', visible: true, muted: false,
        locked: false, opacity: 0.8, blendMode: 'multiply', startTime: 0, endTime: 60,
        assetId: 'test-asset', playbackRate: 1.5, volume: 0.7, trimStart: 1, trimEnd: 59,
        transform: { x: 10, y: 20, scaleX: 1.2, scaleY: 0.8, rotation: 45, anchorX: 0.3, anchorY: 0.7 }
      } as Omit<VideoLayer, 'id' | 'zIndex'>);
      
      const duplicateId = store.duplicateLayer(originalId);
      
      const layers = useLayerStore.getState().layers;
      const original = layers.find(l => l.id === originalId) as VideoLayer;
      const duplicate = layers.find(l => l.id === duplicateId) as VideoLayer;
      
      expect(duplicate).toBeDefined();
      expect(duplicate.name).toBe('Original Layer Copy');
      expect(duplicate.type).toBe(original.type);
      expect(duplicate.opacity).toBe(original.opacity);
      expect(duplicate.blendMode).toBe(original.blendMode);
      expect(duplicate.assetId).toBe(original.assetId);
      expect(duplicate.transform).toEqual(original.transform);
    });
  });

  describe('Layer Removal', () => {
    test('should remove layer and clean up group references', () => {
      const store = useLayerStore.getState();
      
      const id1 = store.addLayer({
        name: 'Layer 1', type: 'video', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', playbackRate: 1, volume: 1, trimStart: 0, trimEnd: 0,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<VideoLayer, 'id' | 'zIndex'>);
      
      const id2 = store.addLayer({
        name: 'Layer 2', type: 'image', visible: true, muted: false,
        locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
        assetId: '', transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
      } as Omit<ImageLayer, 'id' | 'zIndex'>);
      
      const groupId = store.groupLayers([id1, id2], 'Test Group');
      store.removeLayer(id1); // Remove one child
      
      const layers = useLayerStore.getState().layers;
      const group = layers.find(l => l.id === groupId) as GroupLayer;
      
      expect(layers.find(l => l.id === id1)).toBeUndefined();
      expect(group.childIds).not.toContain(id1);
      expect(group.childIds).toContain(id2);
    });
  });
});

describe('Bulk Operations', () => {
  test('should set property for multiple layers', () => {
    const store = useLayerStore.getState();
    
    const id1 = store.addLayer({
      name: 'Layer 1', type: 'video', visible: true, muted: false,
      locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
      assetId: '', playbackRate: 1, volume: 1, trimStart: 0, trimEnd: 0,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
    } as Omit<VideoLayer, 'id' | 'zIndex'>);
    
    const id2 = store.addLayer({
      name: 'Layer 2', type: 'image', visible: true, muted: false,
      locked: false, opacity: 1, blendMode: 'normal', startTime: 0, endTime: 60,
      assetId: '', transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 }
    } as Omit<ImageLayer, 'id' | 'zIndex'>);
    
    store.setMultipleLayersProperty([id1, id2], 'opacity', 0.5);
    
    const layers = useLayerStore.getState().layers;
    const layer1 = layers.find(l => l.id === id1);
    const layer2 = layers.find(l => l.id === id2);
    
    expect(layer1?.opacity).toBe(0.5);
    expect(layer2?.opacity).toBe(0.5);
  });
});