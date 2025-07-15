import React, { useState, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { HudOverlay } from './HudOverlay';
import { HudOverlayParameterModal } from './HudOverlayParameterModal';
import { useCachedStemAnalysis } from '@/hooks/use-cached-stem-analysis';
import { useStemAudioController } from '@/hooks/use-stem-audio-controller';

export interface HudOverlayConfig {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  stem: any;
  settings: Record<string, any>;
}

interface HudOverlayContextType {
  overlays: HudOverlayConfig[];
  addOverlay: (type: string) => void;
  updateOverlay: (id: string, update: Partial<HudOverlayConfig>) => void;
  removeOverlay: (id: string) => void;
  moveOverlay: (from: number, to: number) => void;
  openOverlayModal: (id: string) => void;
  modalOverlayId: string | null;
  closeOverlayModal: () => void;
}

export const HudOverlayContext = createContext<HudOverlayContextType | undefined>(undefined);
export function useHudOverlayContext() {
  const ctx = useContext(HudOverlayContext);
  if (!ctx) throw new Error('useHudOverlayContext must be used within HudOverlayProvider');
  return ctx;
}

const OVERLAY_TYPES = [
  { value: 'waveform', label: 'Waveform' },
  { value: 'spectrogram', label: 'Spectrogram' },
  { value: 'peakMeter', label: 'Peak/LUFS Meter' },
  { value: 'vuMeter', label: 'VU Meter' }, // New
  { value: 'stereometer', label: 'Stereometer' },
  { value: 'oscilloscope', label: 'Oscilloscope' },
  { value: 'spectrumAnalyzer', label: 'Spectrum Analyzer' },
  { value: 'midiMeter', label: 'MIDI Activity Meter' },
  { value: 'chromaWheel', label: 'Chroma Wheel' }, // New
  { value: 'consoleFeed', label: 'Data Feed' },
];

export const HudOverlayProvider: React.FC<{ 
  children?: React.ReactNode;
  cachedAnalysis?: any[];
  stemAudio?: any;
}> = ({ children, cachedAnalysis = [], stemAudio }) => {
  const [overlays, setOverlays] = useState<HudOverlayConfig[]>([]);
  const [modalOverlayId, setModalOverlayId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Force re-render on every animation frame for real-time overlay updates
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    let raf: number;
    const loop = () => {
      setFrame(f => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Use passed props or fallback to hooks
  const cachedStemAnalysis = useCachedStemAnalysis();
  const stemAudioController = useStemAudioController();
  
  // Use passed props if available, otherwise use hooks
  const analysisData = cachedAnalysis.length > 0 ? cachedAnalysis : cachedStemAnalysis.cachedAnalysis;
  const audioController = stemAudio || stemAudioController;

  // Debug: log when the hook data changes
  useEffect(() => {
    console.log('🎵 HudOverlayManager analysis data changed:', {
      count: analysisData.length,
      ids: analysisData.map(a => a.fileMetadataId),
      source: cachedAnalysis.length > 0 ? 'props' : 'hook'
    });
  }, [analysisData, cachedAnalysis.length]);

  // Debug: log cached analysis state
  useEffect(() => {
    if (frame % 120 === 0) { // Log every 120 frames
      console.log('🎵 HudOverlayManager cached analysis state:', {
        count: analysisData.length,
        analyses: analysisData.map(a => ({
          id: a.fileMetadataId,
          stemType: a.stemType,
          hasData: !!a.analysisData,
          features: a.analysisData ? Object.keys(a.analysisData) : []
        })),
        source: cachedAnalysis.length > 0 ? 'props' : 'hook'
      });
    }
  }, [analysisData, frame, cachedAnalysis.length]);

  // Helper: find master stem from cached analysis
  function findMasterStem() {
    if (!analysisData || analysisData.length === 0) {
      console.log('🎵 No cached analysis available for master stem selection');
      return null;
    }
    
    // First, try to find by stemType === 'master'
    let masterStem = analysisData.find(a => a.stemType === 'master');
    
    // If not found, try to find by longest duration (master is usually the longest)
    if (!masterStem && analysisData.length > 0) {
      masterStem = analysisData.reduce((longest, current) => {
        const currentDuration = current.metadata?.duration || 0;
        const longestDuration = longest?.metadata?.duration || 0;
        return currentDuration > longestDuration ? current : longest;
      }, analysisData[0]); // Provide initial value
    }
    
    // Debug log to see what we found
    if (masterStem) {
      console.log('🎵 Found master stem:', {
        id: masterStem.fileMetadataId,
        stemType: masterStem.stemType,
        duration: masterStem.metadata?.duration,
        hasAnalysis: !!masterStem.analysisData
      });
    } else {
      console.log('🎵 No master stem found, available stems:', analysisData.map(a => ({
        id: a.fileMetadataId,
        stemType: a.stemType,
        duration: a.metadata?.duration
      })));
    }
    
    return masterStem || analysisData[0]; // Fallback to first available
  }

  // Helper: get feature key for overlay type (using real analysis keys)
  function getFeatureKeyForOverlay(type: string): string[] {
    switch (type) {
      case 'waveform':
      case 'oscilloscope':
        return ['rms', 'loudness']; // Use RMS as closest to waveform
      case 'spectrogram':
      case 'spectrumAnalyzer':
        return ['spectralCentroid', 'rms', 'loudness']; // Use spectral centroid for frequency visualization
      case 'peakMeter':
        return ['rms', 'loudness'];
      case 'stereometer':
        return ['spectralCentroid', 'rms']; // Use spectral centroid for stereo effect
      case 'midiMeter':
        return ['rms', 'loudness']; // Use RMS and loudness for MIDI visualization
      default:
        return ['rms']; // Default fallback
    }
  }

  // Helper: get feature data for overlay at current time
  function getFeatureDataForOverlay(overlay: HudOverlayConfig) {
    if (!overlay.stem || !overlay.stem.id) {
      // If no stem assigned, return null (overlay will show placeholder)
      return null;
    }
    if (!analysisData || analysisData.length === 0) return null;
    
    // Debug: log what we're looking for
    if (frame % 120 === 0) { // Log every 120 frames to avoid spam
      console.log('🎵 Looking for analysis data:', {
        overlayId: overlay.id,
        overlayType: overlay.type,
        stemId: overlay.stem.id,
        availableAnalyses: analysisData.map(a => ({
          id: a.fileMetadataId,
          stemType: a.stemType,
          hasData: !!a.analysisData
        }))
      });
    }
    
    const analysis = analysisData.find(a => a.fileMetadataId === overlay.stem.id);
    if (!analysis || !analysis.analysisData) {
      if (frame % 60 === 0) { // Log every 60 frames to avoid spam
        console.log('🎵 No analysis found for stem:', overlay.stem.id, 'Available:', analysisData.map(a => a.fileMetadataId));
      }
      return null;
    }

    // Debug: log available features
    if (frame % 60 === 0) { // Log every 60 frames to avoid spam
      console.log('🎵 Available features for stem:', overlay.stem.id, Object.keys(analysis.analysisData));
    }

    const featureKeys = getFeatureKeyForOverlay(overlay.type);
    let featureArr = null;
    let featureName = null;

    // For spectrum overlays, collect frequency-related features
    if (overlay.type === 'spectrogram' || overlay.type === 'spectrumAnalyzer') {
      const spectrumFeatures = featureKeys.filter(key => analysis.analysisData[key]);
      if (spectrumFeatures.length > 0) {
        // Get current time and duration with loop handling
        const duration = analysis.metadata?.duration || 1;
        const rawCurrentTime = audioController?.currentTime || 0;
        
        // Handle looping - if audio is looping, use modulo to get position within loop
        const currentTime = audioController?.isLooping ? (rawCurrentTime % duration) : rawCurrentTime;
        const progress = Math.max(0, Math.min(currentTime / duration, 1));
        const idx = Math.floor(progress * (analysis.analysisData[spectrumFeatures[0]].length - 1));
        
        // Build array of current spectrum values
        const currentSpectrumValues = spectrumFeatures.map(key => analysis.analysisData[key][idx] || 0);
        return currentSpectrumValues;
      }
    }

    // For other overlays, find the first available feature
    for (const key of featureKeys) {
      if (analysis.analysisData[key]) {
        featureArr = analysis.analysisData[key];
        featureName = key;
        break;
      }
    }

    if (!featureArr) {
      console.log('🎵 No matching features found for overlay type:', overlay.type, 'Available:', Object.keys(analysis.analysisData));
      return null;
    }

    // Get current time and duration with loop handling
    const duration = analysis.metadata?.duration || 1;
    const rawCurrentTime = audioController?.currentTime || 0;
    
    // Handle looping - if audio is looping, use modulo to get position within loop
    const currentTime = audioController?.isLooping ? (rawCurrentTime % duration) : rawCurrentTime;
    const progress = Math.max(0, Math.min(currentTime / duration, 1));
    const idx = Math.floor(progress * (featureArr.length - 1));
    
    const value = featureArr[idx];
    if (frame % 60 === 0) { // Log every 60 frames
      console.log('🎵 Feature data for overlay:', overlay.type, 'feature:', featureName, 'value:', value, 'time:', currentTime);
    }
    
    // Return different data formats based on overlay type
    if (overlay.type === 'waveform' || overlay.type === 'oscilloscope') {
      // For waveform overlays, return a small array of recent values for visualization
      const startIdx = Math.max(0, idx - 50);
      const endIdx = Math.min(featureArr.length - 1, idx + 50);
      const recentValues = featureArr.slice(startIdx, endIdx);
      return recentValues;
    } else if (overlay.type === 'spectrogram' || overlay.type === 'spectrumAnalyzer') {
      // For spectrum overlays, we already handled this case above, so return null here
      return null;
    } else {
      // For other overlays (peak meter, stereometer, etc.), return single value
      return value;
    }
  }

  function addOverlay(type: string) {
    // Find master stem to default to
    const masterStem = findMasterStem();
    const defaultStem = masterStem ? {
      id: masterStem.fileMetadataId,
      name: masterStem.stemType || 'master',
      stemType: masterStem.stemType
    } : null;

    // If no master stem found, show a warning but still create the overlay
    if (!defaultStem) {
      console.warn('🎵 No master stem available for overlay, creating overlay without audio data');
    }

    setOverlays(prev => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        type,
        position: { x: 100 + prev.length * 40, y: 100 + prev.length * 40 },
        size: { width: 400, height: 120 },
        stem: defaultStem, // Default to master stem (or null if none available)
        settings: {},
      },
    ]);
  }
  function updateOverlay(id: string, update: Partial<HudOverlayConfig>) {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...update } : o));
  }
  function removeOverlay(id: string) {
    setOverlays(prev => prev.filter(o => o.id !== id));
  }
  function moveOverlay(from: number, to: number) {
    setOverlays(prev => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }
  function openOverlayModal(id: string) {
    setModalOverlayId(id);
  }
  function closeOverlayModal() {
    setModalOverlayId(null);
  }

  // Ensure we're on the client side before rendering portals
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <HudOverlayContext.Provider value={{ overlays, addOverlay, updateOverlay, removeOverlay, moveOverlay, openOverlayModal, modalOverlayId, closeOverlayModal }}>
      {children}
      {/* Render overlays in the visualizer container using portal - only on client */}
      {isClient && typeof window !== 'undefined' && createPortal(
        <DndProvider backend={HTML5Backend}>
          <div id="hud-overlays" style={{ position: 'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex: 20 }}>
            {overlays.map(overlay => (
              <HudOverlay
                key={overlay.id}
                {...overlay}
                featureData={getFeatureDataForOverlay(overlay)} // <-- pass feature data
                onOpenModal={() => openOverlayModal(overlay.id)}
                onUpdate={(update: Partial<HudOverlayConfig>) => updateOverlay(overlay.id, update)}
              />
            ))}
            {modalOverlayId && (
              <HudOverlayParameterModal
                overlay={overlays.find(o => o.id === modalOverlayId)!}
                onClose={closeOverlayModal}
                onUpdate={(update: Partial<HudOverlayConfig>) => updateOverlay(modalOverlayId, update)}
              />
            )}
          </div>
        </DndProvider>,
        document.getElementById('hud-overlays') || document.body
      )}
    </HudOverlayContext.Provider>
  );
};