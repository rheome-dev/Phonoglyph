import React, { useEffect, useRef, useState } from 'react';
import { useCurrentFrame, useVideoConfig, Audio, delayRender, continueRender } from 'remotion';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
// Import EffectDefinitions to ensure effects are registered
import '@/lib/visualizer/effects/EffectDefinitions';
import type { VisualizerConfig } from '@/types/visualizer';
import type { RayboxCompositionProps } from './Root';
import type { AudioAnalysisData as SimpleAudioAnalysisData } from '@/types/visualizer';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { debugLog } from '@/lib/utils';
import { parseParamKey } from '@/lib/visualizer/paramKeys';
import { RemotionOverlayRenderer } from './RemotionOverlayRenderer';

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
  let analysis = cachedAnalysis.find(
    a => a.fileMetadataId === fileId && a.stemType === parsedStem
  );

  // FALLBACK: If strict ID match fails, try matching by stemType only
  // This handles cases where the debug payload has mismatched IDs
  if (!analysis) {
    analysis = cachedAnalysis.find(a => a.stemType === parsedStem);
  }

  if (!analysis?.analysisData) {
    return 0;
  }

  const frameTimes = analysis.analysisData.frameTimes as
    | Float32Array
    | number[]
    | undefined;
  const derivedDurationFromFrames =
    frameTimes && frameTimes.length > 0
      ? (frameTimes as any)[frameTimes.length - 1]
      : undefined;
  const metadataDuration = (analysis as any).metadata?.duration as
    | number
    | undefined;
  const analysisDuration = (analysis.analysisData as any)
    .analysisDuration as number | undefined;

  const duration =
    metadataDuration ?? derivedDurationFromFrames ?? analysisDuration ?? 0;

  if (time < 0 || (duration > 0 && time > duration)) {
    return 0;
  }

  const { analysisData } = analysis;
  const featureName = featureParts.length > 1 ? featureParts.slice(1).join('-') : feature;

  // Time-series features - timestamp-based indexing using analysisData.frameTimes
  const getTimeSeriesValue = (
    arr: Float32Array | number[] | undefined
  ): number => {
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
      // FALLBACK FIX: Prefer RMS if available, as volume can be 0-filled in some analysis passes
      return getTimeSeriesValue(analysisData.rms ?? analysisData.volume);
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
 * Exported so Remotion-specific overlay renderer can reuse audio sampling logic.
 */
export function extractAudioDataAtTime(
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
  let analysis = cachedAnalysis.find(
    a => a.fileMetadataId === fileId && a.stemType === (stemType ?? 'master')
  );

  // FALLBACK: If strict ID match fails, try matching by stemType only
  if (!analysis) {
    analysis = cachedAnalysis.find(a => a.stemType === (stemType ?? 'master'));
  }

  if (!analysis) {
    return null;
  }

  // Extract frequency data (FFT) at the current time
  const fft = analysis.analysisData.fft;
  const frameTimes = analysis.analysisData.frameTimes;
  let frequencies: number[] = [];
  let timeData: number[] = [];

  if (fft && frameTimes && Array.isArray(fft) && Array.isArray(frameTimes) && frameTimes.length > 0) {
    // Find the frame index closest to the current time
    let frameIndex = 0;
    for (let i = 0; i < frameTimes.length; i++) {
      if (frameTimes[i] <= time) {
        frameIndex = i;
      } else {
        break;
      }
    }

    // If FFT is a flat array (e.g., from older analysis or compressed payload)
    if (fft.length === frameTimes.length * 256) { // Assuming 256 bins per frame
      const startIdx = frameIndex * 256;
      const endIdx = Math.min(startIdx + 256, fft.length);
      frequencies = Array.from(fft.slice(startIdx, endIdx));
      timeData = frequencies.map((_, i) => fft[startIdx + i] || 0); // Still approximate timeData from FFT
    } else {
      // Likely array of arrays
      frequencies = fft[frameIndex] || [];
      // If timeData is also an array of arrays, extract it similarly
      if (Array.isArray(analysis.analysisData.timeData) && analysis.analysisData.timeData[frameIndex]) {
        timeData = analysis.analysisData.timeData[frameIndex];
      } else {
        // Fallback: approximate timeData from frequencies if not available
        timeData = frequencies.map((_, i) => frequencies[i] || 0);
      }
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
  mappings,
  baseParameterValues,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerManagerRef = useRef<VisualizerManager | null>(null);
  const effectInstancesRef = useRef<Map<string, any>>(new Map());
  const [handle] = useState(() => delayRender('Waiting for assets'));
  const assetsLoadedRef = useRef(false);

  // DEBUG: If props are empty, try to load from global TEST_PAYLOAD
  // This is a fallback for local debugging when Remotion serialization fails
  let actualLayers = layers;
  let actualAudioAnalysisData = audioAnalysisData;
  let actualMasterAudioUrl = masterAudioUrl;

  if ((!layers || layers.length === 0) && typeof window !== 'undefined') {
    try {
      // Try to import TEST_PAYLOAD dynamically
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const debugModule = require('../remotion/Debug');
      if (debugModule.TEST_PAYLOAD) {
        console.log('🔧 [RayboxComposition] Using TEST_PAYLOAD fallback - props were empty');
        actualLayers = debugModule.TEST_PAYLOAD.layers || [];
        actualAudioAnalysisData = debugModule.TEST_PAYLOAD.audioAnalysisData || [];
        actualMasterAudioUrl = debugModule.TEST_PAYLOAD.masterAudioUrl || '';
        console.log('🔧 [RayboxComposition] Fallback loaded:', {
          layersCount: actualLayers.length,
          audioAnalysisCount: actualAudioAnalysisData.length,
          hasMasterAudioUrl: !!actualMasterAudioUrl
        });
      }
    } catch (e) {
      console.warn('⚠️ [RayboxComposition] Could not load TEST_PAYLOAD fallback:', e);
    }
  }

  // Debug: Log props on mount/update
  useEffect(() => {
    console.log('📦 [RayboxComposition] Props received:', {
      layersCount: layers?.length || 0,
      audioAnalysisDataCount: audioAnalysisData?.length || 0,
      hasMasterAudioUrl: !!masterAudioUrl,
      frame,
      time: frame / fps
    });
    console.log('📦 [RayboxComposition] Using actual props:', {
      layersCount: actualLayers?.length || 0,
      audioAnalysisDataCount: actualAudioAnalysisData?.length || 0,
      hasMasterAudioUrl: !!actualMasterAudioUrl
    });
    if (actualLayers && actualLayers.length > 0) {
      console.log('📦 [RayboxComposition] Layer types:', actualLayers.map(l => ({ id: l.id, type: l.type, effectType: l.effectType })));
    }
  }, []);

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

      // Initial timeline sync (even if layers are empty initially)
      visualizerManagerRef.current.updateTimelineState(actualLayers, 0);

    } catch (error) {
      debugLog.error('❌ [RayboxComposition] Failed to initialize:', error);
    }

    return () => {
      visualizerManagerRef.current?.dispose();
      visualizerManagerRef.current = null;
      effectInstancesRef.current.clear();
    };
  }, [width, height, fps]);

  // 1b. Initialize effects when layers are available
  useEffect(() => {
    console.log('🔄 [RayboxComposition] Effect init useEffect triggered:', {
      hasManager: !!visualizerManagerRef.current,
      layersCount: actualLayers?.length || 0,
      layers: actualLayers
    });

    if (!visualizerManagerRef.current) {
      console.warn('⚠️ [RayboxComposition] VisualizerManager not initialized yet');
      return;
    }

    if (!actualLayers || actualLayers.length === 0) {
      console.warn('⚠️ [RayboxComposition] No layers provided');
      return;
    }

    try {
      // Initialize layers
      const effectLayers = actualLayers.filter(layer => layer.type === 'effect' && layer.effectType);

      console.log(`🎨 [RayboxComposition] Initializing ${effectLayers.length} effect layers from ${layers.length} total layers`);

      for (const layer of effectLayers) {
        if (!effectInstancesRef.current.has(layer.id) && layer.effectType) {
          console.log(`🎨 [RayboxComposition] Creating effect: ${layer.effectType} for layer ${layer.id}`);
          console.log(`🎨 [RayboxComposition] Available effects:`, EffectRegistry.getRegisteredEffectIds());

          // Try to create the effect with better error handling
          let effect = null;
          try {
            // [FIX] Merge baseParameterValues into settings to ensure we have the latest values
            // This is crucial for arrays like 'images' which might be empty in layer.settings but present in baseParameterValues
            const baseValues = baseParameterValues?.[layer.id] || {};
            const mergedSettings = { ...layer.settings, ...baseValues };

            effect = EffectRegistry.createEffect(layer.effectType, mergedSettings);
          } catch (error) {
            console.error(`❌ [RayboxComposition] Exception creating effect ${layer.effectType}:`, error);
          }

          if (effect) {
            effectInstancesRef.current.set(layer.id, effect);
            visualizerManagerRef.current.addEffect(layer.id, effect);
            console.log(`✅ [RayboxComposition] Added effect: ${layer.effectType} (${layer.id})`);
          } else {
            console.warn(`⚠️ [RayboxComposition] Failed to create effect: ${layer.effectType} for layer ${layer.id}`);
            console.warn(`⚠️ [RayboxComposition] Effect might not be registered. Check EffectDefinitions import.`);
          }
        }
      }
    } catch (error) {
      console.error('❌ [RayboxComposition] Failed to initialize effects:', error);
      debugLog.error('❌ [RayboxComposition] Failed to initialize effects:', error);
    }
  }, [actualLayers]);

  // 2. Handle Layer/Effect Updates (if props change during dev, or for structure)
  useEffect(() => {
    if (!visualizerManagerRef.current) return;
    visualizerManagerRef.current.updateTimelineState(actualLayers, frame / fps);
  }, [actualLayers, frame, fps]);

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
    const cachedAnalysis = actualAudioAnalysisData as unknown as CachedAudioAnalysisData[];

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

    // B. Apply audio feature mappings to effect parameters
    // This mimics the mapping application logic from page.tsx
    // Mappings are now included in the payload via getProjectExportPayload
    if (mappings && Object.keys(mappings).length > 0) {
      // Helper to get slider max value (same as page.tsx)
      const getSliderMax = (paramName: string): number => {
        if (paramName === 'baseRadius' || paramName === 'base-radius') return 1.0;
        if (paramName === 'animationSpeed' || paramName === 'animation-speed') return 2.0;
        if (paramName === 'opacity') return 1.0;
        if (paramName === 'textSize') return 1.0;
        if (paramName === 'gamma') return 2.2;
        if (paramName === 'contrast') return 2.0;
        return 100; // Default
      };

      // Helper to get stem type from feature ID
      const getStemTypeFromFeatureId = (featureId: string): string => {
        const parts = featureId.split('-');
        if (parts.length > 1) {
          const stemType = parts[0];
          if (['master', 'drums', 'bass', 'vocals', 'other'].includes(stemType)) {
            return stemType;
          }
        }
        return 'master'; // Default
      };

      // Apply each mapping
      Object.entries(mappings).forEach(([paramKey, mapping]) => {
        if (!mapping?.featureId) return;

        const parsed = parseParamKey(paramKey);
        if (!parsed) return;

        const { effectInstanceId: layerId, paramName } = parsed;
        const featureId = mapping.featureId;
        const featureStemType = getStemTypeFromFeatureId(featureId);

        // Find the stem analysis
        const stemAnalysis = cachedAnalysis.find(a => a.stemType === featureStemType);
        if (!stemAnalysis) return;

        // Get feature value at current time
        const rawValue = getFeatureValueFromCached(
          cachedAnalysis,
          stemAnalysis.fileMetadataId,
          featureId,
          time,
          featureStemType || undefined
        );

        if (rawValue === null || rawValue === undefined) return;

        // Calculate modulated value (same logic as page.tsx)
        const maxValue = getSliderMax(paramName);
        const knobFull = (mapping.modulationAmount ?? 0.5) * 2 - 1;
        const knob = Math.max(-0.5, Math.min(0.5, knobFull));

        // [CHANGE 3] Fix Base Value Lookup
        // If baseParameterValues doesn't have the value, get it from the live effect instance
        // This fixes the "Static" or "Off scale" issue where values defaulted to 0
        let baseValue = baseParameterValues?.[layerId]?.[paramName];

        if (baseValue === undefined) {
          const effectInstance = effectInstancesRef.current.get(layerId);
          // Retrieve internal parameter value if accessible
          if (effectInstance && effectInstance.parameters) {
            baseValue = effectInstance.parameters[paramName];
          }
        }

        // Final fallback if still undefined
        if (baseValue === undefined) {
          // Try to get default from slider max logic if applicable, or just 0
          // But 0 might be wrong for things like opacity (default 1) or scale (default 1)
          // So we should be careful.
          if (paramName === 'opacity' || paramName === 'scale' || paramName === 'baseRadius') {
            baseValue = 1.0;
          } else {
            baseValue = 0;
          }
        }

        const delta = rawValue * knob * maxValue;
        const scaledValue = Math.max(0, Math.min(maxValue, baseValue + delta));

        // Update effect parameter
        if (visualizerManagerRef.current) {
          visualizerManagerRef.current.updateEffectParameter(layerId, paramName, scaledValue);
        }
      });
    }

    // C. Inject Data & Render
    visualizerManagerRef.current.setAudioData(audioData);
    visualizerManagerRef.current.renderFrame(time * 1000, deltaTime);

  }, [frame, fps, actualLayers, actualAudioAnalysisData]);

  // 4. Wait for assets (Images)
  useEffect(() => {
    if (assetsLoadedRef.current) return;

    const waitForAssets = async () => {
      try {
        // Find all slideshow effects
        const slideshowEffects = Array.from(effectInstancesRef.current.values())
          .filter(effect => effect.id && effect.id.startsWith('imageSlideshow'));

        // Also check by constructor name if possible, or just rely on the loop above
        // The loop above relies on 'imageSlideshow' prefix in ID which might not be robust if ID is custom
        // Better to check for waitForImages method

        const asyncEffects = Array.from(effectInstancesRef.current.values())
          .filter(effect => typeof (effect as any).waitForImages === 'function');

        if (asyncEffects.length > 0) {
          console.log(`⏳ [RayboxComposition] Waiting for ${asyncEffects.length} async effects...`);
          await Promise.all(asyncEffects.map(effect => (effect as any).waitForImages()));
          console.log(`✅ [RayboxComposition] All assets loaded`);
        }
      } catch (e) {
        console.error('❌ [RayboxComposition] Error waiting for assets:', e);
      } finally {
        assetsLoadedRef.current = true;
        continueRender(handle);
      }
    };

    // We need to wait for effects to be initialized first
    if (visualizerManagerRef.current && effectInstancesRef.current.size > 0) {
      // Small timeout to ensure everything is settled
      const t = setTimeout(() => {
        waitForAssets();
      }, 100);
      return () => clearTimeout(t);
    } else if (actualLayers && actualLayers.length === 0) {
      // No layers, just continue
      assetsLoadedRef.current = true;
      continueRender(handle);
    } else {
      // If we have layers but effects aren't ready, we might be in the very first render cycle
      // The effect init useEffect should run and populate effectInstancesRef
      // We'll retry in a bit if we're still blocked
      const t = setTimeout(() => {
        if (!assetsLoadedRef.current) {
          waitForAssets();
        }
      }, 1000); // 1s fallback
      return () => clearTimeout(t);
    }
  }, [actualLayers, handle]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      <RemotionOverlayRenderer
        layers={actualLayers}
        audioAnalysisData={actualAudioAnalysisData as unknown as CachedAudioAnalysisData[]}
        currentFrame={frame}
        fps={fps}
      />
      {/* 4. Render Only Master Audio */}
      {actualMasterAudioUrl && <Audio src={actualMasterAudioUrl} />}
    </div>
  );
};






