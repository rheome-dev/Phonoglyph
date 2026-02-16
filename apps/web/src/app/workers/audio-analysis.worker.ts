// Audio Analysis Worker (TypeScript) - no BPM detection here
// Focused on frame-by-frame feature extraction using Meyda

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Meyda types may not include worker context usage explicitly
import Meyda from 'meyda';

type AnalyzeBufferMessage = {
  type: 'ANALYZE_BUFFER';
  data: {
    fileId: string;
    channelData: Float32Array;
    sampleRate: number;
    duration: number;
    stemType: string;
    enhancedAnalysis?: boolean;
    analysisParams?: Record<string, unknown>;
  };
};

type WorkerMessage = AnalyzeBufferMessage | { type: string; data?: unknown };

const STEM_FEATURES: Record<string, string[]> = {
  // All stem types now request amplitudeSpectrum
  drums: ['rms', 'zcr', 'spectralCentroid', 'amplitudeSpectrum', 'energy', 'perceptualSharpness', 'loudness'],
  bass: ['rms', 'loudness', 'spectralCentroid', 'amplitudeSpectrum'],
  vocals: ['rms', 'loudness', 'mfcc', 'chroma', 'amplitudeSpectrum'],
  other: ['rms', 'loudness', 'spectralCentroid', 'chroma', 'amplitudeSpectrum'],
  master: ['rms', 'loudness', 'spectralCentroid', 'spectralRolloff', 'spectralFlatness', 'zcr', 'perceptualSpread', 'amplitudeSpectrum', 'perceptualSharpness', 'energy', 'chroma'],
};

const FEATURES_TO_NORMALIZE = [
  'rms',
  'volume',
  'loudness',
  'bass',
  'mid',
  'treble',
  'spectralCentroid',
  'spectralRolloff',
  'spectralFlux',
  'zcr',
  'energy',
  'perceptualSharpness',
  'perceptualSpread',
] as const;

/**
 * Helper function to check if a value is an array-like object (regular array or TypedArray)
 * and convert it to a regular array for processing.
 * Meyda returns TypedArrays (Float32Array), which need to be converted before use.
 */
function toArray(value: any): number[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  // ArrayBuffer.isView() checks for TypedArrays (Float32Array, Uint8Array, etc.)
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>);
  // Fallback: check if it has length and numeric indices
  if (typeof value === 'object' && 'length' in value && typeof value.length === 'number') {
    return Array.from(value as unknown as ArrayLike<number>);
  }
  return null;
}

/**
 * Normalize a feature array to 0-1 range based on min/max values across the entire track.
 */
function normalizeFeatureArray(arr: Float32Array | number[]): Float32Array {
  if (!arr || arr.length === 0) return new Float32Array(0);

  let min = Infinity;
  let max = -Infinity;

  // Find min/max in single pass
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }

  // Avoid division by zero
  const range = max - min;
  if (range === 0) {
    // All values identical - return array of 0s or 1s based on value
    return new Float32Array(arr.length).fill(max > 0 ? 1 : 0);
  }

  // Normalize to 0-1
  const normalized = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    normalized[i] = (arr[i] - min) / range;
  }

  return normalized;
}

/**
 * Recursively sanitize an object to ensure all TypedArrays are converted to regular arrays.
 * This is critical for JSON.stringify to work properly in the API step.
 */
function sanitizeForJSON(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  // Convert TypedArrays to regular arrays
  if (ArrayBuffer.isView(obj) && !(obj instanceof DataView)) {
    return Array.from(obj as unknown as ArrayLike<number>);
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForJSON);
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeForJSON(obj[key]);
      }
    }
    return sanitized;
  }
  
  // Primitives pass through
  return obj;
}

function generateWaveformData(channelData: Float32Array, duration: number, points = 1024) {
  const totalSamples = channelData.length;
  const samplesPerPoint = Math.max(1, Math.floor(totalSamples / points));
  const waveform = new Float32Array(points);

  for (let i = 0; i < points; i++) {
    const start = i * samplesPerPoint;
    const end = Math.min(start + samplesPerPoint, totalSamples);
    let max = 0;
    for (let j = start; j < end; j++) {
      const sample = Math.abs(channelData[j] ?? 0);
      if (sample > max) max = sample;
    }
    waveform[i] = max;
  }

  return {
    points: Array.from(waveform),
    duration: duration,
    sampleRate: Math.max(1, Math.floor(channelData.length / Math.max(0.000001, duration))),
    markers: [] as Array<{ time: number; type: string; intensity: number; frequency?: number }>,
  };
}

function performFullAnalysis(
  channelData: Float32Array,
  sampleRate: number,
  stemType: string,
  onProgress?: (p: number) => void
) {
  const isSingleAudioFile = stemType !== 'master' && !['drums', 'bass', 'vocals'].includes(stemType);
  const effectiveStemType = isSingleAudioFile ? 'master' : stemType;
  const featuresToExtract = STEM_FEATURES[effectiveStemType] || STEM_FEATURES['other'];

  const featureFrames: Record<string, any> = {};
  const frameTimes: number[] = [];
  featuresToExtract.forEach((f) => {
    featureFrames[f] = [];
  });
  // Add manual and derived features
  featureFrames.spectralFlux = [];
  featureFrames.volume = [];
  featureFrames.bass = [];
  featureFrames.mid = [];
  featureFrames.treble = [];

  const bufferSize = 1024;
  const hopSize = 512;
  let currentPosition = 0;
  let previousSpectrum: number[] | null = null;

  while (currentPosition + bufferSize <= channelData.length) {
    const buffer = channelData.slice(currentPosition, currentPosition + bufferSize);
    let features: any = null;

    try {
      // Use stateless Meyda.extract with configuration object for amplitudeSpectrum
      features = (Meyda as any).extract(featuresToExtract, buffer, {
        sampleRate: sampleRate,
        bufferSize: bufferSize,
        windowingFunction: 'hanning'
      });
    } catch (error) {
      features = {}; // Ensure features is an object to prevent further errors
    }

    // --- Manual spectral flux calculation (stateful) ---
    // Use toArray helper to normalize TypedArrays to regular arrays
    const currentSpectrum = toArray(features?.amplitudeSpectrum);
    let flux = 0;
    
    if (previousSpectrum && currentSpectrum && previousSpectrum.length > 0 && currentSpectrum.length > 0) {
      const len = Math.min(previousSpectrum.length, currentSpectrum.length);
      for (let i = 0; i < len; i++) {
        const diff = (currentSpectrum[i] || 0) - (previousSpectrum[i] || 0);
        if (diff > 0) flux += diff;
      }
    }
    
    previousSpectrum = currentSpectrum && currentSpectrum.length > 0 ? currentSpectrum : null;
    featureFrames.spectralFlux.push(flux);

    // Process and sanitize all extracted features
    if (features) {
      for (const feature of featuresToExtract) {
        const value = features[feature];
        // Convert TypedArrays (like Float32Array from amplitudeSpectrum) to regular arrays
        const arrayValue = toArray(value);
        
        if (arrayValue !== null) {
          // It's an array (regular or converted from TypedArray)
          const sanitizedArray = arrayValue.map(v => (typeof v === 'number' && isFinite(v) ? v : 0));
          if (feature === 'chroma') {
            const dominantChromaIndex = sanitizedArray.indexOf(Math.max(...sanitizedArray));
            featureFrames[feature].push(dominantChromaIndex);
          } else if (feature === 'amplitudeSpectrum') {
            // For amplitudeSpectrum, we need to store the full array, not just the first value
            // But since we're storing per-frame, we'll store the first value for now
            // If full spectrum is needed, it should be stored differently
            featureFrames[feature].push(sanitizedArray[0] || 0);
          } else {
            featureFrames[feature].push(sanitizedArray[0] || 0); // e.g., for mfcc
          }
        } else if (Array.isArray(value)) {
          // Fallback: regular array that toArray didn't catch (shouldn't happen, but safe)
          const sanitizedArray = value.map(v => (typeof v === 'number' && isFinite(v) ? v : 0));
          if (feature === 'chroma') {
            const dominantChromaIndex = sanitizedArray.indexOf(Math.max(...sanitizedArray));
            featureFrames[feature].push(dominantChromaIndex);
          } else {
            featureFrames[feature].push(sanitizedArray[0] || 0);
          }
        } else {
          // Single numeric value
          const sanitizedValue = (typeof value === 'number' && isFinite(value)) ? value : 0;
          featureFrames[feature].push(sanitizedValue);
        }
      }
      // Derived features
      const rms = features.rms || 0;
      const spectralCentroid = features.spectralCentroid || 0;
      featureFrames.volume.push(rms);
      featureFrames.bass.push(spectralCentroid < 200 ? rms : 0);
      featureFrames.mid.push(spectralCentroid >= 200 && spectralCentroid < 2000 ? rms : 0);
      featureFrames.treble.push(spectralCentroid >= 2000 ? rms : 0);
    } else {
      // If features object is null or empty, push default values to maintain array alignment
      featuresToExtract.forEach(f => featureFrames[f].push(0));
      featureFrames.volume.push(0);
      featureFrames.bass.push(0);
      featureFrames.mid.push(0);
      featureFrames.treble.push(0);
    }

    const frameStartTime = currentPosition / sampleRate;
    frameTimes.push(frameStartTime);
    currentPosition += hopSize;
    if (onProgress) onProgress(currentPosition / channelData.length);
  }

  // Final cleanup and shaping - ensure all TypedArrays are converted to regular arrays
  const flatFeatures: Record<string, any> = { ...featureFrames, frameTimes };
  
  // Recursively convert any remaining TypedArrays to regular arrays
  const sanitizedFeatures = sanitizeForJSON(flatFeatures);
  return sanitizedFeatures as Record<string, number[] | number>;
}

function performEnhancedAnalysis(
  fullAnalysis: Record<string, number[] | number>,
  channelData: Float32Array,
  sampleRate: number,
  stemType: string,
  analysisParams?: any
): { time: number; intensity: number }[] {

  const params = Object.assign({
    onsetThreshold: 0.08,   // base normalized threshold (more sensitive)
    peakWindow: 4,          // frames on each side for local max
    peakMultiplier: 1.25,   // how much above local mean a peak must be
  }, analysisParams || {});

  const { frameTimes, spectralFlux, volume, rms } = fullAnalysis as any;

  if (!spectralFlux || !Array.isArray(spectralFlux) || spectralFlux.length === 0) {
    return [];
  }

  const rawFlux = (spectralFlux as number[]).map(v => (isFinite(v) && v > 0 ? v : 0));
  const finiteFlux = rawFlux.filter(isFinite);
  if (finiteFlux.length === 0) return [];

  // Use overall max for stable normalization
  const maxFlux = Math.max(1e-6, ...finiteFlux);
  const normFlux = rawFlux.map(v => v / maxFlux);

  // Lightweight smoothing to reduce spurious tiny peaks (especially hi-hats)
  const smoothFlux: number[] = new Array(normFlux.length);
  const smoothRadius = 1;
  for (let i = 0; i < normFlux.length; i++) {
    let sum = 0;
    let count = 0;
    for (let k = -smoothRadius; k <= smoothRadius; k++) {
      const idx = i + k;
      if (idx >= 0 && idx < normFlux.length) {
        sum += normFlux[idx];
        count++;
      }
    }
    smoothFlux[i] = count > 0 ? sum / count : normFlux[i];
  }

  // Volume gating and weighting to better capture low/mid-frequency hits
  const volArray: number[] = Array.isArray(volume)
    ? (volume as number[]).map(v => (isFinite(v) && v > 0 ? v : 0))
    : Array.isArray(rms)
      ? (rms as number[]).map((v: number) => (isFinite(v) && v > 0 ? v : 0))
      : [];
  const volFinite = volArray.filter(isFinite);
  const avgVolume = volFinite.length ? volFinite.reduce((a, b) => a + b, 0) / volFinite.length : 0;
  const volumeGate = avgVolume * 0.15; // require at least 15% of average loudness (more forgiving)

  // Normalize volume to blend with spectral flux
  const volMax = volFinite.length ? Math.max(1e-6, ...volFinite) : 1e-6;
  const normVol: number[] = volArray.map(v => v / volMax);

  // Combined onset strength: spectral flux (captures HF detail) + volume (captures LF/mid hits)
  const combinedFlux: number[] = smoothFlux.map((f, i) => {
    const nv = normVol[i] ?? 0;
    // Slightly favor spectral flux but still give volume strong influence
    return f * 0.7 + nv * 0.4;
  });

  const peaks: { frameIndex: number; time: number; intensity: number }[] = [];
  const w = Math.max(1, params.peakWindow | 0);
  for (let i = w; i < combinedFlux.length - w; i++) {
    const f = combinedFlux[i];
    if (f < params.onsetThreshold) continue;

    // Local mean around i
    let localSum = 0;
    let localCount = 0;
    for (let j = -w; j <= w; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < combinedFlux.length) {
        localSum += combinedFlux[idx];
        localCount++;
      }
    }
    const localMean = localCount > 0 ? localSum / localCount : 0;
    if (f < localMean * params.peakMultiplier) continue;

    // Basic volume gate (ignore very quiet events)
    if (volArray.length && (volArray[i] ?? 0) < volumeGate) continue;

    let isPeak = true;
    if (isPeak) {
      let isLocalMax = true;
      for (let j = -w; j <= w; j++) {
        const idx = i + j;
        if (idx === i || idx < 0 || idx >= combinedFlux.length) continue;
        if (combinedFlux[i] < combinedFlux[idx]) {
          isLocalMax = false;
          break;
        }
      }
      if (isLocalMax) {
        const frameTimesArray = Array.isArray(frameTimes) ? frameTimes : [];
        peaks.push({
          frameIndex: i,
          time: frameTimesArray[i] ?? i * (512 / sampleRate),
          intensity: f
        });
        i += w;
      }
    }
  }

  // Convert peaks to transients (default to 'generic' type since we don't classify)
  const transients: { time: number; intensity: number; type: string }[] = peaks.map(peak => ({
    time: peak.time,
    intensity: peak.intensity,
    type: 'generic' // Default type since we don't perform drum classification
  }));

  return transients;
}

self.onmessage = function (event: MessageEvent<WorkerMessage>) {
  const { type, data } = event.data as any;
  if (type === 'ANALYZE_BUFFER') {
    const { fileId, channelData, sampleRate, duration, stemType, enhancedAnalysis, analysisParams } = data;
    
    // DEBUG: Log the sampleRate received from main thread
    console.log(`[worker] DEBUG: Received ANALYZE_BUFFER - fileId=${fileId}, sampleRate=${sampleRate}, channelData.length=${channelData.length}, duration=${duration}, stemType=${stemType}`);
    
    try {
      const analysis = performFullAnalysis(channelData, sampleRate, stemType, () => {});
      const waveformData = generateWaveformData(channelData, duration, 1024);
      
      // Run enhanced analysis for transients with frame-based classification
      const transients = performEnhancedAnalysis(analysis, channelData, sampleRate, stemType, analysisParams);

      // Normalize all time-series features to 0-1 range
      const normalizationMeta: Record<string, { originalMin: number; originalMax: number; wasNormalized: boolean }> = {};

      for (const feature of FEATURES_TO_NORMALIZE) {
        const arr = analysis[feature];
        if (arr && Array.isArray(arr) && arr.length > 0) {
          const min = Math.min(...arr);
          const max = Math.max(...arr);

          normalizationMeta[feature] = {
            originalMin: min,
            originalMax: max,
            wasNormalized: true,
          };

          analysis[feature] = Array.from(normalizeFeatureArray(arr));
        }
      }

      // Add normalization metadata to analysis
      (analysis as any).normalizationMeta = normalizationMeta;

      const result = {
        id: `client_${fileId}`,
        fileMetadataId: fileId,
        stemType,
        analysisData: {
          ...analysis,
          transients, // Add classified transients to the result
        },
        waveformData,
        metadata: {
          sampleRate,
          duration,
          bufferSize: 1024,
          featuresExtracted: Object.keys(analysis),
          analysisDuration: 0,
        },
      };
      
      // Final sanitization pass to ensure no TypedArrays remain
      const sanitizedResult = sanitizeForJSON(result);
      (self as any).postMessage({ type: 'ANALYSIS_COMPLETE', data: { fileId, result: sanitizedResult } });
    } catch (error: any) {
      (self as any).postMessage({ type: 'ANALYSIS_ERROR', data: { fileId, error: error?.message || 'Analysis failed' } });
    }
  }
};


