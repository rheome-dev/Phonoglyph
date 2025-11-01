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
    const currentSpectrum = features?.amplitudeSpectrum as any;
    let flux = 0;
    if (previousSpectrum && currentSpectrum && Array.isArray(previousSpectrum) && ArrayBuffer.isView(currentSpectrum)) {
      const prevArr = previousSpectrum;
      const currArr = Array.from(currentSpectrum as unknown as number[]);
      const len = Math.min(prevArr.length, currArr.length);
      for (let i = 0; i < len; i++) {
        const diff = (currArr[i] || 0) - (prevArr[i] || 0);
        if (diff > 0) flux += diff;
      }
      previousSpectrum = currArr;
    } else {
      previousSpectrum = currentSpectrum ? Array.from(currentSpectrum as unknown as number[]) : null;
    }
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
    classification: {
      // Tuned thresholds for more accurate classification
      kickCentroidMax: 250,   // Kicks are very low frequency
      kickRmsMin: 0.08,         // Kicks are loud
      
      snareCentroidMin: 1000,
      snareCentroidMax: 6000,
      snareSharpnessMin: 0.5,   // Snares have a sharp, noisy attack
      snareRmsMin: 0.05,        // Snares are also loud

      hatCentroidMin: 7000,     // Hats are very high frequency
      hatZcrMin: 0.3,           // Hats have a high rate of zero-crossings
      hatRmsMin: 0.01,          // Hats can be quieter
    }
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
  const c = params.classification;
  const attackSnippetSize = 1024;
  
  for (const peak of peaks) {
    let type = 'generic';
    
    if (stemType === 'drums') {
      const peakSamplePosition = Math.floor(peak.time * sampleRate);
      const snippetStart = Math.max(0, peakSamplePosition - (attackSnippetSize / 2));
      
      if (snippetStart + attackSnippetSize < channelData.length) {
        const attackSnippet = channelData.slice(snippetStart, snippetStart + attackSnippetSize);
        
        try {
          // *** THE FINAL, CRITICAL FIX ***
          // We MUST provide bufferSize to Meyda so it uses the correct FFT size
          // for its spectral calculations.
          const attackFeatures = (Meyda as any).extract(
            ['amplitudeSpectrum', 'spectralCentroid', 'perceptualSharpness', 'zcr', 'rms'],
            attackSnippet,
            { 
              sampleRate: sampleRate,
              bufferSize: attackSnippetSize // This was the missing piece
            }
          );
          
          if (attackFeatures) {
            const { rms, spectralCentroid, perceptualSharpness, zcr } = attackFeatures;
            const normalizedZcr = zcr / attackSnippetSize;
            
            // *** FIX B: Use a score-based system instead of if/else if ***
            const scores = { kick: 0, snare: 0, hat: 0 };

            // Score Kick
            if (rms > c.kickRmsMin && spectralCentroid < c.kickCentroidMax) {
              scores.kick = (rms / c.kickRmsMin) + (1 - spectralCentroid / c.kickCentroidMax);
            }
            // Score Snare
            if (rms > c.snareRmsMin && spectralCentroid > c.snareCentroidMin && spectralCentroid < c.snareCentroidMax && perceptualSharpness > c.snareSharpnessMin) {
              scores.snare = (rms / c.snareRmsMin) + (perceptualSharpness / c.snareSharpnessMin);
            }
            // Score Hat
            if (rms > c.hatRmsMin && spectralCentroid > c.hatCentroidMin && normalizedZcr > c.hatZcrMin) {
              scores.hat = (rms / c.hatRmsMin) + (normalizedZcr / c.hatZcrMin) + (spectralCentroid / c.hatCentroidMin);
            }

            // Determine the winner
            const maxScore = Math.max(scores.kick, scores.snare, scores.hat);
            if (maxScore > 0) {
              if (maxScore === scores.hat) type = 'hat';
              else if (maxScore === scores.snare) type = 'snare';
              else if (maxScore === scores.kick) type = 'kick';
            }
            
            console.log(`[worker] Drum Transient at ${peak.time.toFixed(3)}s: type=${type}, rms=${rms.toFixed(3)}, centroid=${spectralCentroid.toFixed(0)}, sharpness=${perceptualSharpness.toFixed(3)}, zcr=${normalizedZcr.toFixed(3)}, scores=${JSON.stringify(scores)}`);
          }
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


