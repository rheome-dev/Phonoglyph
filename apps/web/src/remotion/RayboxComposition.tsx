import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  Audio,
  delayRender,
  continueRender,
  random,
} from 'remotion';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
// Import EffectDefinitions to ensure effects are registered
import '@/lib/visualizer/effects/EffectDefinitions';
import type { RayboxCompositionProps } from './Root';
import type { AudioAnalysisData as SimpleAudioAnalysisData } from '@/types/visualizer';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { parseParamKey } from '@/lib/visualizer/paramKeys';
import { debugLog } from '@/lib/utils';
import { RemotionOverlayRenderer } from './RemotionOverlayRenderer';

const VALID_STEMS = new Set(['master', 'drums', 'bass', 'vocals', 'other']);

/**
 * Default decay times for stateless peaks calculation.
 * Fast decay for drums, medium for bass/vocals/melody.
 */
const DEFAULT_PEAK_DECAY_TIMES: Record<string, number> = {
  'drums-peaks': 0.3,   // Fast decay for drums
  'bass-peaks': 0.5,    // Medium decay for bass
  'vocals-peaks': 0.4,  // Medium-fast for vocals
  'melody-peaks': 0.5,  // Medium for melody
  'master-peaks': 0.4,  // Default
  'other-peaks': 0.5,
};

const DEFAULT_DECAY_TIME = 0.5;

/**
 * Physics constants for momentum accumulator model.
 *
 * Unlike the old damped spring (wobble) model, this creates organic directional drift:
 * - Peak hits → parameter gets bumped in a random direction (±1)
 * - No spring-back/return-to-zero by default
 * - Decay adds inertia (slows rate of change, doesn't pull back to zero)
 * - Soft bounds gently push back toward base value at extremes
 */
const MOMENTUM_LOOKBACK_MULTIPLIER = 3; // Look back decayTime * this for transients
const SOFT_BOUND_STRENGTH = 0.3;        // How strongly to pull back at extremes

/**
 * Default sensitivity values for peaks features.
 * 0.5 = 50% (keep upper half of transients by intensity)
 * 1.0 = 100% (keep all transients)
 */
const DEFAULT_PEAK_SENSITIVITIES: Record<string, number> = {
  'drums-peaks': 0.5,
  'bass-peaks': 0.5,
  'vocals-peaks': 0.5,
  'melody-peaks': 0.5,
  'master-peaks': 0.5,
  'other-peaks': 0.5,
};

/**
 * Helper to filter transients by sensitivity.
 * Ported from MappingSourcesPanel.tsx filterTransientsBySensitivity.
 *
 * @param sensitivity - 0-1 range, where 1 keeps all transients, 0 keeps only the strongest
 */
function filterTransientsBySensitivity(
  transients: Array<{ time: number; intensity: number; type?: string }>,
  sensitivity: number
): Array<{ time: number; intensity: number; type?: string }> {
  if (!transients || transients.length === 0) return transients;
  const clamped = Math.max(0, Math.min(1, sensitivity));
  if (clamped >= 0.999) return transients;

  const intensities = transients
    .map(t => t.intensity)
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (!intensities.length) return transients;

  const index = Math.floor((1 - clamped) * (intensities.length - 1));
  const threshold = intensities[index];

  return transients.filter(t => (Number.isFinite(t.intensity) ? t.intensity : 0) >= threshold);
}

/**
 * Stateless peaks calculation for Remotion/Lambda rendering using momentum accumulator model.
 *
 * Algorithm (Momentum Accumulator):
 * 1. Filter transients by sensitivity (remove quiet "noise" peaks)
 * 2. For each transient in lookback window, add directional impulse (random ±1 per transient)
 * 3. Impulses decay exponentially but don't oscillate (no sine wave = no wobble)
 * 4. Apply soft bounds to gently push back toward base value at extremes
 *
 * Key differences from old wobble model:
 * - No oscillation (monotonic decay instead of sin wave)
 * - Random direction per transient creates organic drift
 * - Soft bounds instead of hard clamp
 * - Value drifts naturally, doesn't snap back to zero
 *
 * @param userDecayTimes - User-configured decay times from the export payload
 * @param userSensitivities - User-configured sensitivity values (0-1)
 * @param baseValue - The user's slider base value (default 0.5)
 */
function calculatePeaksValueStateless(
  transients: Array<{ time: number; intensity: number; type?: string }>,
  time: number,
  featureId: string,
  userDecayTimes?: Record<string, number>,
  userSensitivities?: Record<string, number>,
  frameForDebug?: number,
  baseValue: number = 0.5
): number {
  if (!transients || transients.length === 0) return baseValue;

  // Priority: user-configured > hardcoded defaults > fallback
  const sensitivity = userSensitivities?.[featureId]
    ?? DEFAULT_PEAK_SENSITIVITIES[featureId]
    ?? 0.5; // Default to 50%

  // Filter transients by sensitivity BEFORE processing
  const filteredTransients = filterTransientsBySensitivity(transients, sensitivity);

  // DEBUG: Log sensitivity filtering
  if (frameForDebug !== undefined && frameForDebug < 5) {
    console.log(`[Peaks Debug] frame=${frameForDebug} ${featureId}: ${transients.length} → ${filteredTransients.length} transients (sensitivity=${sensitivity})`);
  }

  // If no transients remain after filtering, return base value
  if (!filteredTransients || filteredTransients.length === 0) {
    return baseValue;
  }

  // Priority: user-configured > hardcoded defaults > fallback
  const decayTime = userDecayTimes?.[featureId]
    ?? DEFAULT_PEAK_DECAY_TIMES[featureId]
    ?? DEFAULT_DECAY_TIME;

  // Lookback window based on decay time
  const lookbackWindow = decayTime * MOMENTUM_LOOKBACK_MULTIPLIER;

  // MOMENTUM ACCUMULATOR: Sum directional impulses that decay over time
  let totalMomentum = 0;

  for (const transient of filteredTransients) {
    const elapsed = time - transient.time;

    // Skip future or too-old transients
    if (elapsed < 0 || elapsed > lookbackWindow) continue;

    // Deterministic direction from seeded random using Remotion's random()
    // This ensures same result across renders
    const direction = random(`peak-${transient.time}`) > 0.5 ? 1 : -1;

    // Exponential decay - impulse fades over time but doesn't oscillate
    // (No sine wave = no wobble, just monotonic decay)
    const decayFactor = Math.exp(-elapsed / decayTime);

    // Accumulate momentum (no sine wave = no wobble)
    totalMomentum += transient.intensity * direction * decayFactor;
  }

  // Soft bounds: reduce momentum if it would push too far from [0, 1]
  const projectedValue = baseValue + totalMomentum;

  if (projectedValue > 1) {
    const overshoot = projectedValue - 1;
    totalMomentum -= overshoot * SOFT_BOUND_STRENGTH;
  } else if (projectedValue < 0) {
    const undershoot = -projectedValue;
    totalMomentum += undershoot * SOFT_BOUND_STRENGTH;
  }

  const result = Math.max(0, Math.min(1, baseValue + totalMomentum));

  // DEBUG: Log computed value
  if (frameForDebug !== undefined && (frameForDebug < 10 || frameForDebug % 60 === 0)) {
    console.log(`[Peaks Debug] frame=${frameForDebug} time=${time.toFixed(3)} featureId=${featureId} → value=${result.toFixed(4)} (baseValue=${baseValue.toFixed(2)}, decayTime=${decayTime.toFixed(2)})`);
  }

  return result;
}

/**
 * Helper function to extract audio feature values at a specific time from cached analysis data.
 * Adapted from use-audio-analysis.ts getFeatureValue logic.
 *
 * @param userDecayTimes - User-configured decay times for peaks features
 * @param userSensitivities - User-configured sensitivity values for peaks features
 * @param frameForDebug - Optional frame number for debug logging
 * @param baseValue - Base value from user's slider (for momentum accumulator model)
 */
function getFeatureValueFromCached(
  cachedAnalysis: CachedAudioAnalysisData[],
  fileId: string,
  feature: string,
  time: number,
  stemType?: string,
  userDecayTimes?: Record<string, number>,
  userSensitivities?: Record<string, number>,
  frameForDebug?: number,
  baseValue?: number,
): number {
  let parsedStem = stemType ?? 'master';
  let featureName = feature;

  if (feature.includes('-')) {
    const parts = feature.split('-');
    const potentialStem = parts[0];

    if (VALID_STEMS.has(potentialStem.toLowerCase())) {
      parsedStem = potentialStem;
      featureName = parts.slice(1).join('-');
    }
  }

  let analysis = cachedAnalysis.find(
    (a) => a.fileMetadataId === fileId && a.stemType === parsedStem,
  );

  if (!analysis) {
    analysis = cachedAnalysis.find((a) => a.stemType === parsedStem);
  }

  if (!analysis?.analysisData) return 0;
  const { analysisData } = analysis;

  const getTimeSeriesValue = (arr: any) => {
    if (!arr || arr.length === 0) return 0;
    const times = analysisData.frameTimes as number[];
    if (!times || times.length === 0) return 0;

    let lo = 0,
      hi = times.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (times[mid] <= time) lo = mid;
      else hi = mid - 1;
    }
    return arr[lo] ?? 0;
  };

  const normalizedFeature = featureName.toLowerCase().replace(/-/g, '');

  // Handle peaks/transients case - stateless calculation
  if (normalizedFeature === 'peaks') {
    const transients = (analysisData as any).transients;
    if (!transients || !Array.isArray(transients)) {
      if (frameForDebug !== undefined && frameForDebug < 5) {
        console.log(`[Peaks Debug] frame=${frameForDebug} NO TRANSIENTS for ${parsedStem}-peaks (transients=${transients})`);
      }
      return 0;
    }

    // Construct full feature ID for decay time lookup
    const fullFeatureId = `${parsedStem}-peaks`;

    // DEBUG: Log first transient time to verify correct stem data
    if (frameForDebug !== undefined && frameForDebug < 5) {
      console.log(`[Peaks Debug] frame=${frameForDebug} ${fullFeatureId} has ${transients.length} transients, first at t=${transients[0]?.time?.toFixed(3)}`);
    }

    return calculatePeaksValueStateless(
      transients,
      time,
      fullFeatureId,
      userDecayTimes,
      userSensitivities,
      frameForDebug,
      baseValue ?? 0.5  // Default to 0.5 if not provided
    );
  }

  switch (normalizedFeature) {
    case 'rms':
      return getTimeSeriesValue(analysisData.rms);
    case 'volume':
      return getTimeSeriesValue(analysisData.rms ?? analysisData.volume);
    case 'loudness':
      return getTimeSeriesValue(analysisData.loudness);
    case 'spectralcentroid':
      return getTimeSeriesValue(analysisData.spectralCentroid);
    case 'spectralrolloff':
      return getTimeSeriesValue(analysisData.spectralRolloff);
    case 'spectralflux':
      return getTimeSeriesValue((analysisData as any).spectralFlux);
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

  // Check for real stereo window data first (per-frame extraction)
  const stereoWindowLeft = (analysis.analysisData as any).stereoWindow_left;
  const stereoWindowRight = (analysis.analysisData as any).stereoWindow_right;
  const hasRealStereoData = stereoWindowLeft && stereoWindowRight &&
    Array.isArray(stereoWindowLeft) && Array.isArray(stereoWindowRight) &&
    stereoWindowLeft.length > 0 && stereoWindowRight.length > 0;

  if (hasRealStereoData) {
    // Calculate samples per frame for the flattened stereo window arrays
    const samplesPerFrame = stereoWindowLeft.length > 0 ? 1024 : 256; // Default to 1024 (N value from worker)
    const totalFrames = Math.floor(stereoWindowLeft.length / samplesPerFrame);

    // Find the frame index closest to the current time
    let effectiveFrameTimes = frameTimes;
    if (!effectiveFrameTimes || !Array.isArray(effectiveFrameTimes) || effectiveFrameTimes.length === 0) {
      const duration = (analysis.analysisData as any).analysisDuration || analysis.metadata?.duration || 30;
      effectiveFrameTimes = Array.from({ length: totalFrames }, (_, i) => (i / totalFrames) * duration);
    }

    let frameIndex = 0;
    for (let i = 0; i < effectiveFrameTimes.length; i++) {
      if (effectiveFrameTimes[i] <= time) {
        frameIndex = i;
      } else {
        break;
      }
    }

    // Extract the stereo window for this frame
    const startIdx = frameIndex * samplesPerFrame;
    const endIdx = Math.min(startIdx + samplesPerFrame, stereoWindowLeft.length);

    if (startIdx < stereoWindowLeft.length) {
      timeData = [
        ...stereoWindowLeft.slice(startIdx, endIdx),
        ...stereoWindowRight.slice(startIdx, endIdx)
      ];
    }
  } else if (fft && Array.isArray(fft) && fft.length > 0) {
    // Fallback: Generate time-domain approximation from FFT magnitudes (only if no real stereo data)
    // FIX: Add linear interpolation fallback when frameTimes is missing
    // This handles compressed payloads where frameTimes is not included
    let effectiveFrameTimes = frameTimes;
    let binsPerFrame = 1;

    if (!effectiveFrameTimes || !Array.isArray(effectiveFrameTimes) || effectiveFrameTimes.length === 0) {
      // Generate synthetic linear frameTimes based on analysis duration
      const duration = (analysis.analysisData as any).analysisDuration || analysis.metadata?.duration || 30;
      const numFrames = Math.min(fft.length, 256); // Assume reasonable frame count
      effectiveFrameTimes = Array.from({ length: numFrames }, (_, i) => (i / numFrames) * duration);
      binsPerFrame = Math.floor(fft.length / numFrames);
    } else {
      // [CHANGE 2] Dynamically calculate bin size instead of hardcoding 256
      binsPerFrame = Math.floor(fft.length / effectiveFrameTimes.length);
    }

    // Find the frame index closest to the current time
    let frameIndex = 0;
    for (let i = 0; i < effectiveFrameTimes.length; i++) {
      if (effectiveFrameTimes[i] <= time) {
        frameIndex = i;
      } else {
        break;
      }
    }

    if (binsPerFrame > 0) {
      const startIdx = frameIndex * binsPerFrame;
      const endIdx = Math.min(startIdx + binsPerFrame, fft.length);

      if (startIdx < fft.length) {
        frequencies = Array.from(fft.slice(startIdx, endIdx));
        // FIX: Generate time-domain approximation from FFT magnitudes
        // This is needed for stereometer which requires timeData
        // Generate a sine wave approximation from FFT magnitudes
        const numSamples = Math.min(binsPerFrame, 256);
        timeData = [];
        for (let i = 0; i < numSamples; i++) {
          // Create a simple approximation using the FFT magnitude
          const fftIdx = Math.min(startIdx + i, fft.length - 1);
          const mag = fft[fftIdx] || 0;
          // Add some variation based on index to simulate waveform
          const wave = Math.sin(i * 0.1) * mag * 0.3 + Math.cos(i * 0.05) * mag * 0.2;
          timeData.push(Math.max(-1, Math.min(1, wave)));
        }
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
  audioAnalysisData,
  visualizationSettings,
  masterAudioUrl,
  mappings,
  baseParameterValues,
  featureDecayTimes,
  featureSensitivities,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerManagerRef = useRef<VisualizerManager | null>(null);
  const effectInstancesRef = useRef<Map<string, any>>(new Map());
  const [handle] = useState(() => delayRender('Initializing Visualizer'));
  const isInitializedRef = useRef(false);

  const actualLayers = layers || [];
  const actualAudioAnalysisData = audioAnalysisData || [];

  // 1. Initialize Visualizer (useLayoutEffect) - runs once on mount
  useLayoutEffect(() => {
    if (!canvasRef.current || isInitializedRef.current) return;
    
    let isNewManager = false;

    if (!visualizerManagerRef.current) {
      try {
        visualizerManagerRef.current = new VisualizerManager(canvasRef.current, {
          canvas: { width, height, pixelRatio: 1 },
          performance: { targetFPS: fps, enableShadows: false },
          midi: { velocitySensitivity: 1.0, noteTrailDuration: 2.0, trackColorMapping: {} },
        });
        isNewManager = true;
        // If a new manager is created, any cached effect refs are stale.
        effectInstancesRef.current.clear();
      } catch (e) {
        console.error('Failed to initialize VisualizerManager:', e);
        // Log error but continue - let the render attempt to proceed
        // The canvas will just be black if WebGL fails, but won't crash the render
        continueRender(handle);
        return;
      }
    }

    const manager = visualizerManagerRef.current;
    if (manager) {
      // Ensure renderer matches latest dimensions to avoid aspect ratio glitches.
      manager.handleViewportResize(width, height);

      if (visualizationSettings) {
        manager.updateSettings(visualizationSettings as unknown as Record<string, number>);
      }

      const effectLayers = actualLayers.filter((l) => l.type === 'effect' && l.effectType);
      for (const layer of effectLayers) {
        const hasRef = effectInstancesRef.current.has(layer.id);
        const managerHasEffect =
          typeof manager.getEffect === 'function' ? !!manager.getEffect(layer.id) : false;

        if (!hasRef || !managerHasEffect || isNewManager) {
          const baseValues = baseParameterValues?.[layer.id] || {};
          const mergedSettings = { ...layer.settings, ...baseValues };
          const effectType = layer.effectType as string;
          const effect = EffectRegistry.createEffect(effectType, mergedSettings);
          if (effect) {
            effectInstancesRef.current.set(layer.id, effect);
            manager.addEffect(layer.id, effect);
          }
        }
      }
    }

    // Wait for assets to load before continuing
    const waitForAssets = async () => {
      try {
        const asyncEffects = Array.from(effectInstancesRef.current.values()).filter(
          (effect) => typeof (effect as any).waitForImages === 'function',
        );

        if (asyncEffects.length > 0) {
          // 10s timeout safety to prevent hanging forever on bad URLs
          await Promise.race([
            Promise.all(asyncEffects.map((effect) => (effect as any).waitForImages())),
            new Promise((r) => setTimeout(r, 10000)),
          ]);
        }
      } catch (e) {
        console.warn('⚠️ Asset waiting warning:', e);
      } finally {
        isInitializedRef.current = true;
        continueRender(handle);
      }
    };

    waitForAssets();
  }, [width, height, fps, actualLayers]); // Include actualLayers to update effects on change

  // 2. Render Loop (useLayoutEffect) - runs on every frame
  useLayoutEffect(() => {
    if (!visualizerManagerRef.current || !isInitializedRef.current) return;
    
    const time = frame / fps;
    const deltaTime = 1 / fps;
    const shouldLogMapping = frame < 3 || frame % Math.max(1, Math.round(fps)) === 0;
    const mappingLogEntries: Array<{
      paramKey: string;
      layerId: string;
      paramName: string;
      baseValue: number;
      rawValue: number;
      knob: number;
      delta: number;
      finalValue: number;
    }> = [];

    // 1. Map StemTypes to IDs for lookup
    const stemMap = new Map(actualAudioAnalysisData.map(a => [a.stemType, a.fileMetadataId]));
    
    const fileId = actualAudioAnalysisData.find((a) => a.stemType === 'master')?.fileMetadataId;
    const audioData = extractAudioDataAtTime(
      actualAudioAnalysisData as unknown as CachedAudioAnalysisData[],
      fileId || 'unknown',
      time,
      'master',
    );

    // DEBUG: Check if mappings exist - ALWAYS LOG TO TERMINAL
    if (frame === 0) {
      console.log('[MAPPING DEBUG] mappings:', mappings);
      console.log('[MAPPING DEBUG] actualLayers:', actualLayers.map(l => l.id));
      console.log('[MAPPING DEBUG] audioAnalysisData:', actualAudioAnalysisData.length, 'entries');
    }
    if (mappings && Object.keys(mappings).length > 0) {
      // Map parameter names to their valid max ranges
      const getSliderMax = (p: string): number => {
        const paramMaxMap: Record<string, number> = {
          // 0-1 range parameters
          opacity: 1.0,
          scale: 1.0,
          baseRadius: 1.0,
          threshold: 1.0,
          triggerValue: 1.0,
          // 0-2 range parameters
          contrast: 2.0,
          gamma: 2.2,
          // 0-100 range parameters (for legacy)
          rotation: 360,
          speed: 100,
        };
        return paramMaxMap[p] ?? 100; // Default to 100 for unknown params
      };

      Object.entries(mappings).forEach(([paramKey, mapping]) => {
        if (!mapping?.featureId) return;
        const parsed = parseParamKey(paramKey);
        if (!parsed) return;
        const { effectInstanceId: layerId, paramName } = parsed;

        // IMPORTANT: For mapped parameters, we must use STATIC base values only.
        // Do NOT read from effectInstancesRef.current.get(layerId)?.parameters
        // because those are dynamically updated each frame, causing accumulation.
        let baseValue = baseParameterValues?.[layerId]?.[paramName];
        if (baseValue === undefined)
          baseValue = actualLayers.find((l) => l.id === layerId)?.settings?.[paramName];
        // Default to 0 for unmapped base values - this prevents accumulation
        // since modulation is additive (baseValue + delta)
        if (baseValue === undefined) baseValue = 0;

        // DEBUG
        if (frame < 5) {
          console.log(`[DEBUG] Mapping ${paramKey}:`, {
            layerId,
            paramName,
            baseValue,
            hasBaseInParams: !!baseParameterValues?.[layerId],
            baseParamKeys: Object.keys(baseParameterValues || {}),
            layerIds: actualLayers.map(l => l.id),
          });
        }

        // FIX: Find the correct fileId based on the feature prefix (e.g. "bass-rms")
        const featureStemType = mapping.featureId.split('-')[0] || 'master';
        const targetFileId = stemMap.get(featureStemType) || fileId || 'unknown';

        const rawValue = getFeatureValueFromCached(
          actualAudioAnalysisData as unknown as CachedAudioAnalysisData[],
          targetFileId, // Pass real ID!
          mapping.featureId,
          time,
          undefined, // stemType - let function parse from featureId
          featureDecayTimes, // User-configured decay times
          featureSensitivities, // User-configured sensitivities
          frame, // For debug logging
        );

        const maxValue = getSliderMax(paramName);
        const knob = Math.max(-0.5, Math.min(0.5, (mapping.modulationAmount ?? 0.5) * 2 - 1));
        const delta = rawValue * knob * maxValue;
        const finalValue = Math.max(0, Math.min(maxValue, baseValue + delta));

        // DEBUG: Enhanced logging for triggerValue mapping
        if (frame < 5 || (paramName === 'triggerValue' && frame % 30 === 0)) {
          console.log(`[Mapping Calc] frame=${frame} ${paramKey}:`, {
            featureId: mapping.featureId,
            targetFileId,
            rawValue: rawValue.toFixed(4),
            baseValue,
            knob: knob.toFixed(4),
            maxValue,
            delta: delta.toFixed(4),
            finalValue: finalValue.toFixed(4),
          });
        }

        if (!Number.isNaN(finalValue)) {
          visualizerManagerRef.current?.updateEffectParameter(layerId, paramName, finalValue);
          if (shouldLogMapping) {
            mappingLogEntries.push({
              paramKey,
              layerId,
              paramName,
              baseValue,
              rawValue,
              knob,
              delta,
              finalValue,
            });
          }
        }
      });
    }

    if (shouldLogMapping && mappingLogEntries.length > 0) {
      debugLog.log('🎚️ Audio mapping frame snapshot', {
        frame,
        time: Number(time.toFixed(3)),
        entries: mappingLogEntries,
      });
    }

    visualizerManagerRef.current.updateTimelineState(actualLayers, time);
    if (audioData) visualizerManagerRef.current.setAudioData(audioData);
    
    // 2. Deterministic Update - sets uTime and all effect states based on frame/fps
    // This ensures frame 100 looks identical whether rendered on laptop, AWS Lambda in Virginia, or Oregon
    visualizerManagerRef.current.update(frame, fps);
    
    // 3. Final Draw - render all layers via compositor (don't use deprecated renderFrame)
    visualizerManagerRef.current.getCompositor().render();
    
    // 4. Flush WebGL - ensure canvas is ready for Remotion capture
    if (canvasRef.current) {
      const gl = canvasRef.current.getContext('webgl2') || canvasRef.current.getContext('webgl');
      if (gl) {
        gl.flush(); // Flush all pending commands to the GPU
        gl.finish(); // Force all WebGL commands to complete before returning
      }
    }
  }, [frame, fps, actualLayers, actualAudioAnalysisData, mappings, baseParameterValues, visualizationSettings]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%' }} />
      {masterAudioUrl && <Audio src={masterAudioUrl} />}
      <RemotionOverlayRenderer
        layers={actualLayers}
        audioAnalysisData={actualAudioAnalysisData as unknown as CachedAudioAnalysisData[]}
      />
    </div>
  );
};






