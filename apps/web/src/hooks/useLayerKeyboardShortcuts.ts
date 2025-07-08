import { useEffect } from 'react';
import { useLayerStore } from '@/lib/stores/layerStore';

export const useLayerKeyboardShortcuts = () => {
  const {
    selectedLayerIds,
    removeLayer,
    duplicateLayer,
    toggleLayerVisibility,
    toggleLayerMute,
    moveLayerToTop,
    moveLayerToBottom,
    clearSelection
  } = useLayerStore();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.contentEditable === 'true')
      ) {
        return;
      }
      
      const selectedId = selectedLayerIds[0];
      
      switch (e.code) {
        case 'Delete':
        case 'Backspace':
          if (selectedLayerIds.length > 0) {
            e.preventDefault();
            selectedLayerIds.forEach(removeLayer);
          }
          break;
          
        case 'KeyD':
          if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            if (selectedId) {
              duplicateLayer(selectedId);
            }
          }
          break;
          
        case 'KeyV':
          if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            if (selectedId) {
              toggleLayerVisibility(selectedId);
            }
          }
          break;
          
        case 'KeyM':
          if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            if (selectedId) {
              toggleLayerMute(selectedId);
            }
          }
          break;
          
        case 'BracketRight': // ]
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (selectedId) {
              moveLayerToTop(selectedId);
            }
          }
          break;
          
        case 'BracketLeft': // [
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (selectedId) {
              moveLayerToBottom(selectedId);
            }
          }
          break;
          
        case 'Escape':
          if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            clearSelection();
          }
          break;
          
        case 'KeyA':
          if (e.metaKey || e.ctrlKey) {
            // Prevent default select all and let the user select all layers
            // This would need to be implemented in the store
            e.preventDefault();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedLayerIds,
    removeLayer,
    duplicateLayer,
    toggleLayerVisibility,
    toggleLayerMute,
    moveLayerToTop,
    moveLayerToBottom,
    clearSelection
  ]);
};