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
 * Calculate spectral centroid from amplitude spectrum array.
 * Returns the weighted average frequency in Hz.
 */
function calculateCentroid(spectrum: number[], sampleRate: number): number {
  if (!spectrum || spectrum.length === 0) return 0;
  
  const nyquist = sampleRate / 2;
  const binWidth = nyquist / spectrum.length;
  let weightedSum = 0;
  let magnitudeSum = 0;
  
  for (let i = 0; i < spectrum.length; i++) {
    const magnitude = spectrum[i] || 0;
    const frequency = i * binWidth;
    weightedSum += frequency * magnitude;
    magnitudeSum += magnitude;
  }
  
  return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
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
        if (Array.isArray(value)) {
          const sanitizedArray = value.map(v => (typeof v === 'number' && isFinite(v) ? v : 0));
          if (feature === 'chroma') {
            const dominantChromaIndex = sanitizedArray.indexOf(Math.max(...sanitizedArray));
            featureFrames[feature].push(dominantChromaIndex);
          } else {
            featureFrames[feature].push(sanitizedArray[0] || 0); // e.g., for mfcc
          }
        } else {
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

  // Final cleanup and shaping
  const flatFeatures: Record<string, any> = { ...featureFrames, frameTimes };
  return flatFeatures as Record<string, number[] | number>;
}

function performEnhancedAnalysis(
  fullAnalysis: Record<string, number[] | number>,
  channelData: Float32Array,
  sampleRate: number,
  stemType: string,
  analysisParams?: any
): { time: number; intensity: number; type: string }[] {

  const params = Object.assign({
    onsetThreshold: 0.15,
    peakWindow: 5,
    peakMultiplier: 1.5,
    // Classification thresholds are now hardcoded based on research
    // (see classification logic below)
  }, analysisParams || {});

  const { frameTimes, spectralFlux } = fullAnalysis;

  if (!spectralFlux || !Array.isArray(spectralFlux) || spectralFlux.length === 0) {
    return [];
  }

  const finiteFlux = (spectralFlux as number[]).filter(isFinite);
  if (finiteFlux.length === 0) return [];
  
  const maxFlux = Math.max(1e-6, ...finiteFlux);
  const normFlux = (spectralFlux as number[]).map(v => isFinite(v) ? v / maxFlux : 0);

  const peaks: { frameIndex: number; time: number; intensity: number }[] = [];
  const w = Math.max(1, params.peakWindow | 0);
  for (let i = w; i < normFlux.length - w; i++) {
    const isPeak = normFlux[i] > params.onsetThreshold;
    if (isPeak) {
      let isLocalMax = true;
      for (let j = -w; j <= w; j++) {
        if (j !== 0 && normFlux[i] < normFlux[i + j]) {
          isLocalMax = false;
          break;
        }
      }
      if (isLocalMax) {
        const frameTimesArray = Array.isArray(frameTimes) ? frameTimes : [];
        peaks.push({ frameIndex: i, time: frameTimesArray[i] ?? i * (512 / sampleRate), intensity: normFlux[i] });
        i += w;
      }
    }
  }

  const transients: { time: number; intensity: number; type: string }[] = [];
  
  // DEBUG: Log the sampleRate being used
  console.log(`[worker] DEBUG: performEnhancedAnalysis called with sampleRate=${sampleRate}, channelData.length=${channelData.length}, stemType=${stemType}`);
  
  for (const peak of peaks) {
    let type = 'generic';
    
    if (stemType === 'drums') {
      const peakSamplePosition = Math.floor(peak.time * sampleRate);
      // Use larger snippet to capture full envelope (~93ms at 44.1kHz)
      const snippetSize = 4096;
      // Start slightly before peak to capture attack
      const snippetStart = Math.max(0, peakSamplePosition - 256);
      
      if (snippetStart + snippetSize < channelData.length) {
        const fullSnippet = channelData.slice(snippetStart, snippetStart + snippetSize);
        
        try {
          // *** Analyze attack for sharpness/ZCR ***
          // Attack: high-frequency transients (clicks, snaps) - first ~11ms
          const attackWindowSize = 512;
          const attackSnippet = fullSnippet.slice(0, attackWindowSize);
          
          const attackFeatures = (Meyda as any).extract(
            ['perceptualSharpness', 'zcr', 'rms'],
            attackSnippet,
            { 
              sampleRate: sampleRate,
              bufferSize: attackWindowSize
            }
          );
          
          if (!attackFeatures) continue;
          
          const { perceptualSharpness, zcr, rms: attackRms } = attackFeatures;
          const normalizedZcr = zcr / attackWindowSize;
          
          // *** MULTI-WINDOW ANALYSIS FOR BODY FREQUENCIES ***
          // Analyze 3 different time windows to catch the true fundamental
          // Kicks have low-frequency body that appears later (~23-70ms after peak)
          const bodyWindows = [
            { start: 1024, size: 1024, label: 'early' },   // ~23ms after peak
            { start: 2048, size: 1024, label: 'mid' },     // ~46ms after peak
            { start: 3072, size: 512, label: 'late' }       // ~70ms after peak (smaller for tail)
          ];
          
          let minCentroid = Infinity;
          let maxRms = attackRms || 0;
          let bestWindow = 'none';
          
          for (const window of bodyWindows) {
            if (window.start + window.size > fullSnippet.length) continue;
            
            const bodySnippet = fullSnippet.slice(window.start, window.start + window.size);
            const bodyFeatures = (Meyda as any).extract(
              ['amplitudeSpectrum', 'rms'],
              bodySnippet,
              { 
                sampleRate: sampleRate,
                bufferSize: window.size
              }
            );
            
            if (bodyFeatures?.amplitudeSpectrum) {
              const spectrumArray = toArray(bodyFeatures.amplitudeSpectrum);
              if (spectrumArray) {
                const centroid = calculateCentroid(spectrumArray, sampleRate);
                // Validate centroid is finite and positive before using it
                if (centroid > 0 && isFinite(centroid) && centroid < minCentroid) {
                  minCentroid = centroid;
                  bestWindow = window.label;
                }
                if (bodyFeatures.rms > maxRms) {
                  maxRms = bodyFeatures.rms;
                }
              }
            }
          }
          
          // Skip classification if no valid body window was found
          if (minCentroid === Infinity || !isFinite(minCentroid)) {
            if (peak.frameIndex === 0 || peak.frameIndex % 10 === 0) {
              console.log(`[worker] Skipping drum at ${peak.time.toFixed(3)}s: no valid body window`);
            }
            continue; // Skip this peak
          }
          
          // Use minimum centroid found (catches kick fundamentals)
          const spectralCentroid = minCentroid;
          const rms = maxRms;
          
          // DEBUG: Log the analysis
          if (peak.frameIndex === 0 || peak.frameIndex % 10 === 0) {
            console.log(`[worker] DEBUG: Multi-window analysis - centroid=${spectralCentroid.toFixed(0)}Hz (${bestWindow} window), rms=${rms.toFixed(3)}, sharp=${perceptualSharpness.toFixed(2)}, zcr=${normalizedZcr.toFixed(2)}`);
          }
            
          // *** REVISED CLASSIFICATION THRESHOLDS ***
          // Based on research: Kick body 50-150Hz, Snare body 1500-4000Hz, Hat 7000-12000Hz
          // Scores are normalized to 0-7 range for fair comparison
          const scores = { kick: 0, snare: 0, hat: 0 };

          // Kick: LOW centroid (< 1500Hz) + HIGH RMS
          // Kicks have fundamental 50-150Hz, but processed/compressed kicks can be up to 1500Hz
          // Emphasize low frequency content
          if (spectralCentroid < 1500 && rms > 0.03) {
            const freqScore = (1500 - spectralCentroid) / 1500; // 0-1, lower freq = higher score
            const rmsScore = Math.min(rms / 0.03, 1.5); // Cap at 1.5 to avoid dominating
            scores.kick = (freqScore * 2.0 + rmsScore) * 2; // Scale to 0-7
          }

          // Snare: MID centroid (1000-5000Hz) + HIGH sharpness
          // Snares have dual-band energy (low body ~150-250Hz + high rattle 3-8kHz)
          // Balanced scoring across frequency, sharpness, and loudness
          if (spectralCentroid > 1000 && spectralCentroid < 5000 && perceptualSharpness > 0.3) {
            const sharpScore = Math.min(perceptualSharpness / 0.5, 1.5); // 0-1.5
            const rmsScore = Math.min(rms / 0.03, 1.0); // 0-1
            scores.snare = (sharpScore * 2 + rmsScore) * 2; // Scale to 0-7
          }

          // Hat: HIGH centroid (> 5000Hz) + HIGH ZCR
          // Hats are mostly high-frequency noise (6-16kHz)
          // Emphasize high frequency and noisiness (ZCR)
          if (spectralCentroid > 5000 && normalizedZcr > 0.2) {
            const freqScore = Math.min(spectralCentroid / 8000, 1.5); // 0-1.5
            const zcrScore = Math.min(normalizedZcr / 0.3, 1.5); // 0-1.5
            scores.hat = (freqScore + zcrScore * 2) * 2; // Scale to 0-7, weight ZCR more
          }

          // Determine the winner
          const maxScore = Math.max(scores.kick, scores.snare, scores.hat);
          if (maxScore > 0) {
            if (scores.kick === maxScore) type = 'kick';
            else if (scores.snare === maxScore) type = 'snare';
            else if (scores.hat === maxScore) type = 'hat';
          }
          
          console.log(`[worker] Drum at ${peak.time.toFixed(3)}s: ${type} | centroid=${spectralCentroid.toFixed(0)}Hz (${bestWindow} window) | rms=${rms.toFixed(3)} | sharp=${perceptualSharpness.toFixed(2)} | zcr=${normalizedZcr.toFixed(2)} | scores=${JSON.stringify(scores)}`);
        } catch (error) {
          console.error(`[worker] Meyda snippet analysis failed at ${peak.time}s:`, error);
        }
      }
    }
    
    transients.push({ time: peak.time, intensity: peak.intensity, type });
  }

  const summary = transients.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`[worker] Finished classification for ${stemType}. Summary:`, summary);

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
      (self as any).postMessage({ type: 'ANALYSIS_COMPLETE', data: { fileId, result } });
    } catch (error: any) {
      (self as any).postMessage({ type: 'ANALYSIS_ERROR', data: { fileId, error: error?.message || 'Analysis failed' } });
    }
  }
};


