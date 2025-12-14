import React, { useEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig, Audio } from 'remotion';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
import type { VisualizerConfig } from '@/types/visualizer';
import type { RayboxCompositionProps } from './Root';
import type { AudioAnalysisData as SimpleAudioAnalysisData } from '@/types/visualizer';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { debugLog } from '@/lib/utils';

/**
 * Helper function to extract audio feature values at a specific time from cached analysis data.
 * Adapted from use-audio-analysis.ts getFeatureValue logic.
 */
function getFeatureValueFromCached(
  cachedAnalysis: CachedAudioAnalysisData[],
  fileId: string,
  feature: string,
  time: number,
  stemType?: string
): number {
  const featureParts = feature.includes('-') ? feature.split('-') : [feature];
  const parsedStem = featureParts.length > 1 ? featureParts[0] : (stemType ?? 'master');
  const analysis = cachedAnalysis.find(
    a => a.fileMetadataId === fileId && a.stemType === parsedStem
  );

  if (!analysis?.analysisData || time < 0 || time > analysis.metadata.duration) {
    return 0;
  }

  const { analysisData } = analysis;
  const featureName = featureParts.length > 1 ? featureParts.slice(1).join('-') : feature;

  // Time-series features - timestamp-based indexing using analysisData.frameTimes
  const getTimeSeriesValue = (arr: Float32Array | number[] | undefined): number => {
    if (!arr || arr.length === 0) return 0;
    const times = analysisData.frameTimes as Float32Array | number[] | undefined;
    if (!times || times.length === 0) return 0;
    // Binary search: find last index with times[idx] <= time
    let lo = 0;
    let hi = Math.min(times.length - 1, arr.length - 1);
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1; // upper mid to avoid infinite loop
      const tmid = (times as any)[mid];
      if (tmid <= time) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    const index = Math.max(0, Math.min(arr.length - 1, lo));
    return arr[index] ?? 0;
  };

  switch (featureName) {
    case 'rms':
      return getTimeSeriesValue(analysisData.rms);
    case 'volume':
      return getTimeSeriesValue(analysisData.volume ?? analysisData.rms);
    case 'loudness':
      return getTimeSeriesValue(analysisData.loudness);
    case 'spectral-centroid':
    case 'spectralcentroid':
      return getTimeSeriesValue(analysisData.spectralCentroid);
    case 'spectral-rolloff':
    case 'spectralrolloff':
      return getTimeSeriesValue(analysisData.spectralRolloff);
    case 'bass':
      return getTimeSeriesValue(analysisData.bass);
    case 'mid':
      return getTimeSeriesValue(analysisData.mid);
    case 'treble':
      return getTimeSeriesValue(analysisData.treble);
    default:
      return 0;
  }
}

/**
 * Convert cached audio analysis data to simple AudioAnalysisData format at a specific time.
 */
function extractAudioDataAtTime(
  cachedAnalysis: CachedAudioAnalysisData[] | undefined,
  fileId: string | undefined,
  time: number,
  stemType?: string
): SimpleAudioAnalysisData | null {
  if (!cachedAnalysis || !fileId || cachedAnalysis.length === 0) {
    return null;
  }

  // Extract feature values at the current time
  const volume = getFeatureValueFromCached(cachedAnalysis, fileId, 'volume', time, stemType);
  const bass = getFeatureValueFromCached(cachedAnalysis, fileId, 'bass', time, stemType);
  const mid = getFeatureValueFromCached(cachedAnalysis, fileId, 'mid', time, stemType);
  const treble = getFeatureValueFromCached(cachedAnalysis, fileId, 'treble', time, stemType);
  const spectralCentroid = getFeatureValueFromCached(cachedAnalysis, fileId, 'spectral-centroid', time, stemType);

  // Get frequencies and timeData from the analysis
  const analysis = cachedAnalysis.find(
    a => a.fileMetadataId === fileId && a.stemType === (stemType ?? 'master')
  );

  if (!analysis) {
    return null;
  }

  // Extract frequency data (FFT) at the current time
  const fft = analysis.analysisData.fft;
  const frameTimes = analysis.analysisData.frameTimes;
  let frequencies: number[] = [];
  let timeData: number[] = [];

  if (fft && frameTimes && Array.isArray(fft)) {
    // Find the frame index closest to the current time
    let frameIndex = 0;
    if (Array.isArray(frameTimes)) {
      for (let i = 0; i < frameTimes.length; i++) {
        if (frameTimes[i] <= time) {
          frameIndex = i;
        } else {
          break;
        }
      }
    }

    // Extract frequency bins (assuming fft is a flat array of frequency bins per frame)
    // This is a simplified extraction - actual structure may vary
    const binsPerFrame = 256; // Typical FFT size
    const startIdx = frameIndex * binsPerFrame;
    const endIdx = Math.min(startIdx + binsPerFrame, fft.length);
    
    if (startIdx < fft.length) {
      frequencies = Array.from(fft.slice(startIdx, endIdx));
      timeData = frequencies.map((_, i) => fft[startIdx + i] || 0);
    }
  }

  return {
    frequencies: frequencies.length > 0 ? frequencies : new Array(256).fill(0),
    timeData: timeData.length > 0 ? timeData : new Array(256).fill(0),
    volume,
    bass,
    mid,
    treble,
  };
}

export const RayboxComposition: React.FC<RayboxCompositionProps> = ({
  layers,
  audioAnalysisData, // This is the full cached analysis array
  visualizationSettings,
  masterAudioUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerManagerRef = useRef<VisualizerManager | null>(null);
  const effectInstancesRef = useRef<Map<string, any>>(new Map());

  // 1. Initialize VisualizerManager (Once)
  useEffect(() => {
    if (!canvasRef.current || visualizerManagerRef.current) return;

    try {
      const config: VisualizerConfig = {
        canvas: { width, height, pixelRatio: 1 }, // pixelRatio 1 ensures deterministic rendering
        performance: { targetFPS: fps, enableBloom: true, enableShadows: false },
        midi: { velocitySensitivity: 1.0, noteTrailDuration: 2.0, trackColorMapping: {} },
      };

      visualizerManagerRef.current = new VisualizerManager(canvasRef.current, config);

      // Initialize layers
      const effectLayers = layers.filter(layer => layer.type === 'effect' && layer.effectType);

      for (const layer of effectLayers) {
        if (!effectInstancesRef.current.has(layer.id) && layer.effectType) {
          const effect = EffectRegistry.createEffect(layer.effectType, layer.settings || {});
          if (effect) {
            effectInstancesRef.current.set(layer.id, effect);
            visualizerManagerRef.current.addEffect(layer.id, effect);
          }
        }
      }

      // Initial timeline sync
      visualizerManagerRef.current.updateTimelineState(layers, 0);

    } catch (error) {
      debugLog.error('❌ [RayboxComposition] Failed to initialize:', error);
    }

    return () => {
      visualizerManagerRef.current?.dispose();
      visualizerManagerRef.current = null;
      effectInstancesRef.current.clear();
    };
  }, [width, height, fps]);

  // 2. Handle Layer/Effect Updates (if props change during dev, or for structure)
  useEffect(() => {
    if (!visualizerManagerRef.current) return;
    visualizerManagerRef.current.updateTimelineState(layers, frame / fps);
  }, [layers, frame, fps]);

  // 3. Render Frame Loop
  useEffect(() => {
    if (!visualizerManagerRef.current) return;

    const time = frame / fps;
    const deltaTime = 1 / fps;

    // A. Determine which fileId to use for the "Main" audio data injection.
    // Usually this is the master track, but overlays might look up specific stems via their layer settings.
    // For the global 'currentAudioData' used by general effects, we prioritize the Master.
    let audioData: SimpleAudioAnalysisData;

    // We assume the backend passes the cached analysis array
    const cachedAnalysis = audioAnalysisData as unknown as CachedAudioAnalysisData[];

    // Find the master analysis (usually indicated by stemType 'master' or isMaster flag in metadata)
    // If no explicit master, fallback to the first available analysis
    const masterAnalysis = cachedAnalysis.find(a => a.stemType === 'master') || cachedAnalysis[0];
    const fileId = masterAnalysis?.fileMetadataId;

    if (fileId) {
      // Extract data for this specific frame
      const extracted = extractAudioDataAtTime(cachedAnalysis, fileId, time, 'master');
      audioData = extracted || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 };
    } else {
      audioData = { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 };
    }

    // B. Inject Data & Render
    visualizerManagerRef.current.setAudioData(audioData);
    visualizerManagerRef.current.renderFrame(time * 1000, deltaTime);

  }, [frame, fps, layers, audioAnalysisData]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {/* 4. Render Only Master Audio */}
      {masterAudioUrl && <Audio src={masterAudioUrl} />}
    </div>
  );
};

