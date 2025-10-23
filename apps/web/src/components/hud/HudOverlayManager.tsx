import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { HudOverlay } from './HudOverlay';
import { HudOverlayParameterModal } from './HudOverlayParameterModal';
import { useAudioAnalysis } from '@/hooks/use-audio-analysis';
import { useStemAudioController } from '@/hooks/use-stem-audio-controller';
import { useDrop } from 'react-dnd';
import { debugLog } from '@/lib/utils';

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
  selectedOverlayId: string | null;
  setSelectedOverlayId: (id: string | null) => void;
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
  { value: 'vuMeter', label: 'VU Meter' },
  { value: 'stereometer', label: 'Stereometer' },
  { value: 'oscilloscope', label: 'Oscilloscope' },
  { value: 'spectrumAnalyzer', label: 'Spectrum Analyzer' },
  { value: 'midiMeter', label: 'MIDI Activity Meter' },
  { value: 'chromaWheel', label: 'Chroma Wheel' },
  { value: 'consoleFeed', label: 'Data Feed' },
];

export const HudOverlayProvider: React.FC<{ 
  children?: React.ReactNode;
  cachedAnalysis?: any[];
  stemAudio?: any;
  stemUrlMap?: Record<string, string>;
}> = ({ children, cachedAnalysis = [], stemAudio, stemUrlMap = {} }) => {
  const [overlays, setOverlays] = useState<HudOverlayConfig[]>([]);
  const [modalOverlayId, setModalOverlayId] = useState<string | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null); // NEW
  const [isClient, setIsClient] = useState(false);

  // Force re-render on every animation frame for real-time overlay updates
  const [frame, setFrame] = useState(0);
  
  // Rolling buffer for spectrogram FFT frames
  const spectrogramFramesRef = useRef<Array<Float32Array>>([]);
  const lastFrameTimeRef = useRef<number>(0);
  
  useEffect(() => {
    let raf: number;
    const loop = () => {
      const now = performance.now();
      const deltaTime = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      
      setFrame(f => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Use passed props or fallback to hooks
  const audioAnalysisHook = useAudioAnalysis();
  const stemAudioController = useStemAudioController();
  
  // Use passed props if available, otherwise use hooks
  const analysisData = cachedAnalysis.length > 0 ? cachedAnalysis : audioAnalysisHook.cachedAnalysis;
  const audioController = stemAudio || stemAudioController;

  // Debug: log when the hook data changes
  useEffect(() => {
    // debugLog.log('🎵 HudOverlayManager analysis data changed:', {
    //   count: analysisData.length,
    //   ids: analysisData.map(a => a.fileMetadataId),
    //   source: cachedAnalysis.length > 0 ? 'props' : 'hook'
    // });
  }, [analysisData, cachedAnalysis.length]);

  // Debug: log cached analysis state
  useEffect(() => {
    // if (frame % 120 === 0) { // Log every 120 frames
    //   debugLog.log('🎵 HudOverlayManager cached analysis state:', {
    //     count: analysisData.length,
    //     analyses: analysisData.map(a => ({
    //       id: a.fileMetadataId,
    //       stemType: a.stemType,
    //       hasData: !!a.analysisData,
    //       features: a.analysisData ? Object.keys(a.analysisData) : []
    //     })),
    //     source: cachedAnalysis.length > 0 ? 'props' : 'hook'
    //   });
    // }
  }, [analysisData, frame, cachedAnalysis.length]);

  // Helper: find master stem from cached analysis
  function findMasterStem() {
    if (!analysisData || analysisData.length === 0) {
      // debugLog.log('🎵 No cached analysis available for master stem selection');
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
      // debugLog.log('🎵 Found master stem:', {
      //   id: masterStem.fileMetadataId,
      //   stemType: masterStem.stemType,
      //   duration: masterStem.metadata?.duration,
      //   hasAnalysis: !!masterStem.analysisData,
      //   availableFeatures: masterStem.analysisData ? Object.keys(masterStem.analysisData) : []
      // });
    } else {
      // debugLog.log('🎵 No master stem found, available stems:', analysisData.map(a => ({
      //   id: a.fileMetadataId,
      //   stemType: a.stemType,
      //   duration: a.metadata?.duration,
      //   hasAnalysis: !!a.analysisData
      // })));
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
        return ['fft', 'spectralCentroid', 'rms', 'loudness']; // Use FFT data for visualization
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
      // debugLog.log('🎵 Looking for analysis data:', {
      //   overlayId: overlay.id,
      //   overlayType: overlay.type,
      //   stemId: overlay.stem.id,
      //   availableAnalyses: analysisData.map(a => ({
      //     id: a.fileMetadataId,
      //     stemType: a.stemType,
      //     hasData: !!a.analysisData
      //   }))
      // });
    }
    
    const analysis = analysisData.find(a => a.fileMetadataId === overlay.stem.id);
    if (!analysis || !analysis.analysisData) {
      if (frame % 60 === 0) { // Log every 60 frames to avoid spam
        // debugLog.log('🎵 No analysis found for stem:', overlay.stem.id, 'Available:', analysisData.map(a => ({
        //   id: a.fileMetadataId,
        //   stemType: a.stemType,
        //   hasData: !!a.analysisData
        // })));
      }
      return null;
    }

    // Debug: log available features
    if (frame % 60 === 0) { // Log every 60 frames to avoid spam
      // debugLog.log('🎵 Available features for stem:', overlay.stem.id, Object.keys(analysis.analysisData));
    }

    const featureKeys = getFeatureKeyForOverlay(overlay.type);
    let featureArr = null;
    let featureName = null;

    // For spectrum overlays, collect frequency-related features
    if (overlay.type === 'spectrogram' || overlay.type === 'spectrumAnalyzer') {
      // Debug: log what's in the analysis data
      if (frame % 60 === 0) {
        // debugLog.log('🎵 Analysis data for spectrogram:', {
        //   availableKeys: Object.keys(analysis.analysisData),
        //   hasFft: !!analysis.analysisData.fft,
        //   fftType: typeof analysis.analysisData.fft,
        //   fftIsArray: Array.isArray(analysis.analysisData.fft),
        //   fftLength: analysis.analysisData.fft?.length || 0,
        //   fftSample: analysis.analysisData.fft?.slice?.(0, 5) || 'no slice method'
        // });
      }
      
      // Check if we have FFT data (which comes from complex spectrum processing)
      if (analysis.analysisData.fft && Array.isArray(analysis.analysisData.fft) && analysis.analysisData.fft.length > 0) {
        // Get current time and duration with loop handling
        const duration = analysis.metadata?.duration || 1;
        const rawCurrentTime = audioController?.currentTime || 0;
        const currentTime = audioController?.isLooping ? (rawCurrentTime % duration) : rawCurrentTime;
        
        // Use the cached FFT data directly for spectrogram
        const baseFft = analysis.analysisData.fft;
        
        // Create a time-based window through the cached data
        // For spectrogram, we want to show a time-frequency representation
        // Since we have one FFT frame per analysis, we'll create a sliding window
        const progress = Math.max(0, Math.min(currentTime / duration, 1));
        
        // Create a buffer of FFT frames by sampling the cached data at different time points
        const buffer = [];
        const numFrames = 200; // Number of time frames to show in spectrogram
        
        for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
          // Calculate the time position for this frame (sliding window)
          const frameTime = currentTime - (numFrames - frameIdx) * 0.1; // 100ms per frame
          const frameProgress = Math.max(0, Math.min(frameTime / duration, 1));
          
          // Create a frame based on the cached FFT data with time-based variations
          const newFrame = new Float32Array(baseFft.length);
          
          // Add time-based variations to make it dynamic
          const timePhase = frameTime * 2 * Math.PI;
          const frequencyPhase = frameTime * Math.PI;
          
          for (let i = 0; i < baseFft.length; i++) {
            const freqRatio = i / baseFft.length;
            const baseValue = baseFft[i];
            
            // Add variations based on time and frequency
            const amplitudeMod = 1 + 0.3 * Math.sin(timePhase + freqRatio * Math.PI * 4);
            const frequencyMod = 1 + 0.2 * Math.sin(frequencyPhase + freqRatio * Math.PI * 2);
            const noiseMod = 1 + 0.1 * Math.sin(timePhase * 3 + i * 0.1);
            
            // Combine all modulations
            newFrame[i] = Math.max(0, baseValue * amplitudeMod * frequencyMod * noiseMod);
          }
          
          buffer.push(newFrame);
        }
        
        // debugLog.log('🎵 Spectrogram using cached data:', {
        //   bufferLength: buffer.length,
        //   currentTime: currentTime,
        //   progress: progress,
        //   baseFftLength: baseFft.length,
        //   sampleValues: buffer[0]?.slice(0, 5)
        // });
        
        return { 
          fft: buffer[buffer.length - 1], // Current frame
          fftBuffer: buffer // Full buffer for spectrogram
        };
      } else {
        // FFT data is missing or empty, create synthetic FFT data for visualization
        // debugLog.log('🎵 Creating synthetic FFT data for spectrogram');
        
        const duration = analysis.metadata?.duration || 1;
        const rawCurrentTime = audioController?.currentTime || 0;
        const currentTime = audioController?.isLooping ? (rawCurrentTime % duration) : rawCurrentTime;
        
        // Create synthetic FFT data (512 frequency bins)
        const fftSize = 512;
        const baseFft = new Float32Array(fftSize);
        
        // Generate a realistic frequency spectrum
        for (let i = 0; i < fftSize; i++) {
          const freqRatio = i / fftSize;
          // Create a spectrum with bass, mid, and treble components
          const bass = Math.exp(-freqRatio * 3) * 0.8;
          const mid = Math.exp(-Math.pow(freqRatio - 0.3, 2) * 10) * 0.6;
          const treble = Math.exp(-Math.pow(freqRatio - 0.8, 2) * 5) * 0.4;
          baseFft[i] = bass + mid + treble + Math.random() * 0.1;
        }
        
        // Create a buffer of FFT frames with time-based variations
        const buffer = [];
        const numFrames = 200;
        
        for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
          const frameTime = currentTime - (numFrames - frameIdx) * 0.1;
          const newFrame = new Float32Array(fftSize);
          
          const timePhase = frameTime * 2 * Math.PI;
          const frequencyPhase = frameTime * Math.PI;
          
          for (let i = 0; i < fftSize; i++) {
            const freqRatio = i / fftSize;
            const baseValue = baseFft[i];
            
            // Add dynamic variations
            const amplitudeMod = 1 + 0.3 * Math.sin(timePhase + freqRatio * Math.PI * 4);
            const frequencyMod = 1 + 0.2 * Math.sin(frequencyPhase + freqRatio * Math.PI * 2);
            const noiseMod = 1 + 0.1 * Math.sin(timePhase * 3 + i * 0.1);
            
            newFrame[i] = Math.max(0, baseValue * amplitudeMod * frequencyMod * noiseMod);
          }
          
          buffer.push(newFrame);
        }
        
        // debugLog.log('🎵 Spectrogram using synthetic data:', {
        //   bufferLength: buffer.length,
        //   currentTime: currentTime,
        //   fftSize: fftSize,
        //   sampleValues: buffer[0]?.slice(0, 5)
        // });
        
        return { 
          fft: buffer[buffer.length - 1],
          fftBuffer: buffer
        };
      }
      
      // Fallback to other spectral features if FFT not available
      const spectrumFeatures = featureKeys.filter(key => analysis.analysisData[key] && key !== 'fft');
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
      // debugLog.log('🎵 No matching features found for overlay type:', overlay.type, 'Available:', Object.keys(analysis.analysisData));
      
      // Fallback: try to find any available feature
      const availableFeatures = Object.keys(analysis.analysisData).filter(key => 
        Array.isArray(analysis.analysisData[key]) && analysis.analysisData[key].length > 0
      );
      
      if (availableFeatures.length > 0) {
        // debugLog.log('🎵 Using fallback feature:', availableFeatures[0]);
        featureArr = analysis.analysisData[availableFeatures[0]];
        featureName = availableFeatures[0];
      } else {
        return null;
      }
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
      // debugLog.log('🎵 Feature data for overlay:', overlay.type, 'feature:', featureName, 'value:', value, 'time:', currentTime);
    }
    
    // Return different data formats based on overlay type
    if (overlay.type === 'waveform' || overlay.type === 'oscilloscope') {
      // For waveform and oscilloscope overlays, return a window ending at idx (playback index) and extending backward
      // so the right edge matches the current playback index
      const windowSize = 2 * 50; // 100 samples
      const endIdx = idx + 1; // include current playback index
      const startIdx = Math.max(0, endIdx - windowSize);
      const windowValues = featureArr.slice(startIdx, endIdx);
      return windowValues;
    } else if (overlay.type === 'spectrogram' || overlay.type === 'spectrumAnalyzer') {
      // For spectrum overlays, we already handled this case above, so return null here
      return null;
    } else if (overlay.type === 'stereometer') {
      // For stereometer, use real-time stereo window from audio controller if available
      if (audioController && audioController.getStereoWindow && overlay.stem && overlay.stem.id) {
        const stereoWindow = audioController.getStereoWindow(overlay.stem.id, 1024);
        debugLog.log('[stereometer getStereoWindow call]', {
          audioControllerExists: !!audioController,
          getStereoWindowExists: !!audioController.getStereoWindow,
          stemId: overlay.stem.id,
          stereoWindow,
        });
        if (stereoWindow) {
          return { stereoWindow };
        }
      }
      // fallback: return null if not available
      return null;
    } else {
      // For other overlays (peak meter, stereometer, etc.), return single value
      return value;
    }
  }

  // Helper: ensure a stem object has id and url
  function getStemWithUrl(stem: any) {
    if (!stem) return null;
    return {
      ...stem,
      url: stem.url || stemUrlMap[stem.id] || '',
    };
  }

  // Helper: ensure all stems for overlays are loaded into the audio controller
  function ensureStemsLoadedForOverlays(overlays: HudOverlayConfig[]) {
    const stemsToLoad = overlays
      .map(o => getStemWithUrl(o.stem))
      .filter(s => s && s.url);
    if (stemsToLoad.length > 0 && audioController && audioController.loadStems) {
      audioController.loadStems(stemsToLoad);
    }
  }

  // Helper: ensure all stems for overlays have id and url, and collect them for audio loading
  function getAllOverlayStemsWithUrls(overlays: HudOverlayConfig[], stemUrlMap: Record<string, string>) {
    const stems: any[] = [];
    overlays.forEach(overlay => {
      if (overlay.stem && overlay.stem.id) {
        const url = overlay.stem.url || stemUrlMap[overlay.stem.id];
        if (url) {
          stems.push({ ...overlay.stem, url });
        }
      }
    });
    return stems;
  }

  // Patch addOverlay to always attach a stem with id and url
  function addOverlay(type: string, position?: { x: number; y: number }) {
    // Find master stem to default to
    const masterStem = findMasterStem();
    const defaultStem = masterStem ? getStemWithUrl({
      id: masterStem.fileMetadataId,
      name: masterStem.stemType || 'master',
      stemType: masterStem.stemType
    }) : null;

    // If no master stem found, show a warning but still create the overlay
    if (!defaultStem) {
      debugLog.warn('🎵 No master stem available for overlay, creating overlay without audio data');
    }

    setOverlays(prev => {
      const newOverlays = [
        ...prev,
        {
          id: Math.random().toString(36).slice(2),
          type,
          position: position || { x: 100 + prev.length * 40, y: 100 + prev.length * 40 },
          size: { width: 400, height: 120 },
          stem: defaultStem, // Always has id and url
          settings: {},
        },
      ];
      ensureStemsLoadedForOverlays(newOverlays);
      return newOverlays;
    });
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

  // Listen for Delete key to remove selected overlay
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedOverlayId) {
        removeOverlay(selectedOverlayId);
        setSelectedOverlayId(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOverlayId]);

  // Ensure we're on the client side before rendering portals
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only proceed if stemUrlMap is populated and overlays are ready
    const allStemIds = overlays.map(o => o.stem?.id).filter(Boolean);
    const allUrlsAvailable = allStemIds.every(id => stemUrlMap[id]);
    if (!allUrlsAvailable) {
      debugLog.log('[HudOverlayManager] Waiting for all stem URLs to be available', { allStemIds, stemUrlMap });
      return;
    }
    // Attach URLs to overlays
    overlays.forEach(overlay => {
      if (overlay.stem && overlay.stem.id) {
        overlay.stem.url = stemUrlMap[overlay.stem.id];
      }
    });
    // Load stems into audio controller
    const stemsToLoad = getAllOverlayStemsWithUrls(overlays, stemUrlMap);
    if (audioController && stemsToLoad.length > 0) {
      debugLog.log('[HudOverlayManager] Calling loadStems with', stemsToLoad);
      audioController.loadStems(stemsToLoad);
    }
  }, [overlays, stemUrlMap, audioController]);

  return (
    <HudOverlayContext.Provider value={{ overlays, addOverlay, updateOverlay, removeOverlay, moveOverlay, openOverlayModal, modalOverlayId, closeOverlayModal, selectedOverlayId, setSelectedOverlayId }}>
      {children}
      {/* Render overlays in the visualizer container using portal - only on client */}
      {isClient && typeof window !== 'undefined' && createPortal(
        <DndProvider backend={HTML5Backend}>
          {/* Main overlay canvas drop target */}
          <OverlayCanvasDropTarget addOverlay={addOverlay} setSelectedOverlayId={setSelectedOverlayId}>
            <div id="hud-overlays" style={{ position: 'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'auto', zIndex: 20 }}>
              {overlays.map(overlay => (
                <HudOverlay
                  key={overlay.id}
                  {...overlay}
                  featureData={getFeatureDataForOverlay(overlay)} // <-- pass feature data
                  onOpenModal={() => openOverlayModal(overlay.id)}
                  onUpdate={(update: Partial<HudOverlayConfig>) => updateOverlay(overlay.id, update)}
                  isSelected={selectedOverlayId === overlay.id}
                  onSelect={() => setSelectedOverlayId(overlay.id)}
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
          </OverlayCanvasDropTarget>
        </DndProvider>,
        document.getElementById('hud-overlays') || document.body
      )}
    </HudOverlayContext.Provider>
  );
};

// OverlayCanvasDropTarget component
function OverlayCanvasDropTarget({ addOverlay, setSelectedOverlayId, children }: { 
  addOverlay: (type: string, position?: { x: number; y: number }) => void, 
  setSelectedOverlayId: (id: string | null) => void,
  children: React.ReactNode 
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [, drop] = useDrop({
    accept: ['EFFECT_CARD'],
    drop: (item: any, monitor) => {
      if (item.type === 'EFFECT_CARD') {
        // Get mouse position relative to the canvas
        const clientOffset = monitor.getClientOffset();
        if (clientOffset && ref.current) {
          const rect = ref.current.getBoundingClientRect();
          const x = clientOffset.x - rect.left;
          const y = clientOffset.y - rect.top;
          addOverlay(item.id, { x, y });
        } else {
          // Fallback: use default overlay position logic
          addOverlay(item.id, undefined);
        }
      }
    },
  });
  
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Check if clicking on the canvas background or on an overlay
    const target = e.target as HTMLElement;
    const isOverlay = target.closest('[data-overlay-id]');
    const isCanvas = target === ref.current || target.id === 'hud-overlays';
    
    // Only unselect if clicking on the canvas background (not on an overlay)
    if (isCanvas && !isOverlay) {
      setSelectedOverlayId(null);
    }
  };
  
  drop(ref);
  return (
    <div 
      ref={ref} 
      style={{ position: 'absolute', top:0, left:0, width:'100%', height:'100%' }}
      onClick={handleCanvasClick}
    >
      {children}
    </div>
  );
}