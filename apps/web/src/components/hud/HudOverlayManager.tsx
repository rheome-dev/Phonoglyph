'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { HudOverlay } from './HudOverlay';
import { useTimelineStore } from '@/stores/timelineStore';
import { useStemAudioController } from '@/hooks/use-stem-audio-controller';
import type { Layer } from '@/types/video-composition';

type HudOverlayRendererProps = {
  stemUrlMap?: Record<string, string>;
  cachedAnalysis?: any[];
};

const getOverlayStem = (layer: Layer, stemUrlMap: Record<string, string>) => {
  const settings = (layer as any).settings || {};
  const stemId = settings.stemId || settings.stem?.id;
  if (!stemId) return null;
  const url = stemUrlMap[stemId] || settings.stem?.url || '';
  return { id: stemId, url };
};

// Helper: get feature keys for overlay type
function getFeatureKeyForOverlay(type: string): string[] {
  switch (type) {
    case 'waveform':
    case 'oscilloscope':
      return ['rms', 'loudness'];
    case 'spectrogram':
    case 'spectrumAnalyzer':
      return ['fft', 'spectralCentroid', 'rms', 'loudness'];
    case 'peakMeter':
      return ['rms', 'loudness'];
    case 'stereometer':
      return ['spectralCentroid', 'rms'];
    case 'vuMeter':
      return ['rms', 'loudness'];
    case 'chromaWheel':
      return ['chroma', 'rms'];
    default:
      return ['rms'];
  }
}

export function HudOverlayRenderer({ stemUrlMap = {}, cachedAnalysis = [] }: HudOverlayRendererProps) {
  const { layers, currentTime, duration, updateLayer } = useTimelineStore((state) => ({
    layers: state.layers,
    currentTime: state.currentTime,
    duration: state.duration,
    updateLayer: state.updateLayer,
  }));

  const audioController = useStemAudioController();
  const { loadStems, getStereoWindow, getAudioBuffer } = audioController;
  
  // Force re-render on animation frame for real-time updates
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

  const overlayLayers = useMemo(
    () => layers.filter((layer) => layer.type === 'overlay'),
    [layers],
  );

  const activeOverlays = useMemo(
    () =>
      overlayLayers.filter(
        (layer) =>
          currentTime >= (layer.startTime ?? 0) &&
          currentTime <= (layer.endTime ?? Number.POSITIVE_INFINITY),
      ),
    [overlayLayers, currentTime],
  );

  useEffect(() => {
    if (!loadStems) return;
    const stems = new Map<string, { id: string; url: string; label?: string; isMaster: boolean }>();
    overlayLayers.forEach((layer) => {
      const settings = (layer as any).settings || {};
      const stemId = settings.stemId || settings.stem?.id;
      const url = stemId ? stemUrlMap[stemId] || settings.stem?.url : undefined;
      if (!stemId || !url) return;
      if (!stems.has(stemId)) {
        stems.set(stemId, {
          id: stemId,
          url,
          label: layer.name,
          isMaster: Boolean(settings.isMaster),
        });
      }
    });
    const stemsToLoad = Array.from(stems.values());
    if (stemsToLoad.length > 0) {
      loadStems(stemsToLoad);
    }
  }, [overlayLayers, stemUrlMap, loadStems]);

  // Compute feature data for an overlay layer
  const getFeatureDataForOverlay = useCallback((layer: Layer) => {
    const settings = (layer as any).settings || {};
    const stemId = settings.stemId || settings.stem?.id;
    
    if (!stemId || cachedAnalysis.length === 0) {
      return null;
    }
    
    // Find the analysis for this stem
    const analysis = cachedAnalysis.find(a => a.fileMetadataId === stemId);
    if (!analysis || !analysis.analysisData) {
      return null;
    }

    const overlayType = layer.effectType as string;
    const featureKeys = getFeatureKeyForOverlay(overlayType);
    
    // Get duration and compute progress
    const analysisDuration = analysis.metadata?.duration || duration || 1;
    const progress = Math.max(0, Math.min(currentTime / analysisDuration, 1));

    // For spectrum overlays
    if (overlayType === 'spectrogram' || overlayType === 'spectrumAnalyzer') {
      if (analysis.analysisData.fft && Array.isArray(analysis.analysisData.fft) && analysis.analysisData.fft.length > 0) {
        const baseFft = analysis.analysisData.fft;
        
        // Create a buffer of FFT frames with time-based variations
        const buffer = [];
        const numFrames = 200;
        
        for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
          const frameTime = currentTime - (numFrames - frameIdx) * 0.1;
          const newFrame = new Float32Array(baseFft.length);
          
          const timePhase = frameTime * 2 * Math.PI;
          const frequencyPhase = frameTime * Math.PI;
          
          for (let i = 0; i < baseFft.length; i++) {
            const freqRatio = i / baseFft.length;
            const baseValue = baseFft[i];
            
            const amplitudeMod = 1 + 0.3 * Math.sin(timePhase + freqRatio * Math.PI * 4);
            const frequencyMod = 1 + 0.2 * Math.sin(frequencyPhase + freqRatio * Math.PI * 2);
            const noiseMod = 1 + 0.1 * Math.sin(timePhase * 3 + i * 0.1);
            
            newFrame[i] = Math.max(0, baseValue * amplitudeMod * frequencyMod * noiseMod);
          }
          
          buffer.push(newFrame);
        }
        
        return { 
          fft: buffer[buffer.length - 1],
          fftBuffer: buffer
        };
      }
    }

    // For stereometer, use real-time stereo window if available
    if (overlayType === 'stereometer') {
      if (getStereoWindow && stemId) {
        // Pass currentTime (which is loop-aware) to getStereoWindow
        // This ensures the stereometer works correctly when audio loops
        const stereoWindow = getStereoWindow(stemId, 1024, currentTime);
        if (stereoWindow) {
          return { stereoWindow };
        }
      }
      return null;
    }

    // For consoleFeed, use real-time raw audio buffer data
    if (overlayType === 'consoleFeed') {
      if (getAudioBuffer && stemId) {
        // Get a window of raw audio samples (512 samples = ~11ms at 44.1kHz)
        const audioBuffer = getAudioBuffer(stemId, 512, currentTime);
        if (audioBuffer) {
          return { audioBuffer: Array.from(audioBuffer) };
        }
      }
      return null;
    }
    
    // For chroma wheel
    if (overlayType === 'chromaWheel') {
      if (analysis.analysisData.chroma && Array.isArray(analysis.analysisData.chroma)) {
        return { chroma: analysis.analysisData.chroma };
      }
      return null;
    }
    
    // For VU meter
    if (overlayType === 'vuMeter') {
      let rmsValue = 0;
      let peakValue = 0;
      
      if (analysis.analysisData.rms && Array.isArray(analysis.analysisData.rms)) {
        const idx = Math.floor(progress * (analysis.analysisData.rms.length - 1));
        rmsValue = analysis.analysisData.rms[idx] || 0;
      }
      if (analysis.analysisData.loudness && Array.isArray(analysis.analysisData.loudness)) {
        const idx = Math.floor(progress * (analysis.analysisData.loudness.length - 1));
        peakValue = analysis.analysisData.loudness[idx] || 0;
      }
      
      return { rms: rmsValue, peak: peakValue };
    }

    // Find the first available feature for this overlay type
    let featureArr = null;
    for (const key of featureKeys) {
      if (analysis.analysisData[key] && Array.isArray(analysis.analysisData[key])) {
        featureArr = analysis.analysisData[key];
        break;
      }
    }

    if (!featureArr) {
      // Fallback: try any available array feature
      const availableFeatures = Object.keys(analysis.analysisData).filter(key => 
        Array.isArray(analysis.analysisData[key]) && analysis.analysisData[key].length > 0
      );
      if (availableFeatures.length > 0) {
        featureArr = analysis.analysisData[availableFeatures[0]];
      }
    }

    if (!featureArr) return null;

    const idx = Math.floor(progress * (featureArr.length - 1));

    // For waveform and oscilloscope, return a window of values
    if (overlayType === 'waveform' || overlayType === 'oscilloscope') {
      const windowSize = 100;
      const endIdx = idx + 1;
      const startIdx = Math.max(0, endIdx - windowSize);
      return featureArr.slice(startIdx, endIdx);
    }
    
    // For peak meter, return single value
    if (overlayType === 'peakMeter') {
      return featureArr[idx] || 0;
    }

    // Default: return single value
    return featureArr[idx];
  }, [cachedAnalysis, currentTime, duration, getStereoWindow, getAudioBuffer]);

  return (
    <div
      id="hud-overlays-container"
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
    >
      {activeOverlays.map((layer) => {
        const stem = getOverlayStem(layer, stemUrlMap);
        const layerWithStem = stem
          ? {
              ...layer,
              settings: { ...(layer as any).settings, stem },
            }
          : layer;
        const featureData = getFeatureDataForOverlay(layer);
        return (
          <HudOverlay
            key={layer.id}
            layer={layerWithStem}
            featureData={featureData}
            frame={frame}
            fps={60}
            onOpenModal={() => {}}
            onUpdate={(updates: Partial<Layer>) => updateLayer(layer.id, updates)}
            isSelected={false}
            onSelect={() => {}}
          />
        );
      })}
    </div>
  );
}