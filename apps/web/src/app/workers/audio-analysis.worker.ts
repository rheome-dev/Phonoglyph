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
      // Tuned thresholds based on actual data analysis
      // Kicks have low-frequency content but high-frequency attack transients
      kickCentroidMax: 2000,   // More lenient - kicks often 500-2000Hz due to attack
      kickRmsMin: 0.06,         // Kicks are loud, but allow some variation
      
      // Snares have mid-to-high frequency content with sharp attacks
      snareCentroidMin: 1500,   // Lowered from 1000 - snares can start lower
      snareCentroidMax: 8000,   // Raised from 6000 - snares can have high harmonics
      snareSharpnessMin: 0.4,   // Lowered from 0.5 - more forgiving
      snareRmsMin: 0.03,        // Lowered from 0.05 - more forgiving

      // Hats are very high frequency with lots of zero-crossings
      hatCentroidMin: 6000,     // Lowered from 7000 - more forgiving
      hatZcrMin: 0.25,          // Lowered from 0.3 - more forgiving
      hatRmsMin: 0.01,          // Hats can be quieter (unchanged)
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
  // Use a longer snippet to capture both attack and body frequencies
  // For kicks/snares: attack is high-freq, body is low-freq
  // We need to analyze both to get accurate classification
  const snippetSize = 2048; // Increased from 1024 to capture more of the envelope
  const attackWindowSize = 512; // Analyze first 512 samples for attack
  const bodyWindowStart = 512; // Analyze body starting at 512 samples (after attack)
  const bodyWindowSize = 1024; // Analyze 1024 samples of body
  
  // DEBUG: Log the sampleRate being used
  console.log(`[worker] DEBUG: performEnhancedAnalysis called with sampleRate=${sampleRate}, channelData.length=${channelData.length}, stemType=${stemType}`);
  
  for (const peak of peaks) {
    let type = 'generic';
    
    if (stemType === 'drums') {
      const peakSamplePosition = Math.floor(peak.time * sampleRate);
      // Center the snippet on the peak, but include more samples after (body)
      const snippetStart = Math.max(0, peakSamplePosition - (attackWindowSize / 2));
      
      if (snippetStart + snippetSize < channelData.length) {
        const fullSnippet = channelData.slice(snippetStart, snippetStart + snippetSize);
        const attackSnippet = fullSnippet.slice(0, attackWindowSize);
        const bodySnippet = fullSnippet.slice(bodyWindowStart, bodyWindowStart + bodyWindowSize);
        
        try {
          // *** Analyze both attack and body for accurate classification ***
          // Attack: high-frequency transients (clicks, snaps)
          // Body: fundamental frequencies (kick body ~60-100Hz, snare body ~1000-2000Hz)
          
          // Analyze attack window (first 512 samples)
          const attackFeatures = (Meyda as any).extract(
            ['amplitudeSpectrum', 'perceptualSharpness', 'zcr', 'rms'],
            attackSnippet,
            { 
              sampleRate: sampleRate,
              bufferSize: attackWindowSize
            }
          );
          
          // Analyze body window (samples 512-1536, after attack)
          const bodyFeatures = (Meyda as any).extract(
            ['amplitudeSpectrum', 'rms'],
            bodySnippet,
            { 
              sampleRate: sampleRate,
              bufferSize: bodyWindowSize
            }
          );
          
          // DEBUG: Log the parameters being passed to Meyda
          if (peak.frameIndex === 0 || peak.frameIndex % 10 === 0) {
            console.log(`[worker] DEBUG: Analyzing snippet - attackSize=${attackWindowSize}, bodySize=${bodyWindowSize}, fullSnippetSize=${fullSnippet.length}`);
          }
          
          if (attackFeatures && bodyFeatures) {
            const { rms: attackRms, perceptualSharpness, zcr } = attackFeatures;
            const { rms: bodyRms, amplitudeSpectrum: bodySpectrum } = bodyFeatures;
            const normalizedZcr = zcr / attackWindowSize;
            
            // Use body frequency for classification (more characteristic of the drum type)
            // But keep attack features for sharpness and ZCR
            const amplitudeSpectrum = bodySpectrum;
            const rms = Math.max(attackRms, bodyRms); // Use the louder of the two
            
            // *** CRITICAL FIX: Manually calculate spectralCentroid with correct frequency mapping ***
            // Meyda's stateless extract may not respect bufferSize, so we calculate it ourselves
            // Meyda returns TypedArrays (Float32Array), which need to be converted to regular arrays
            let spectralCentroid = 0;
            const spectrumArray = toArray(amplitudeSpectrum);
            
            // DEBUG: Check what Meyda returned
            if (peak.frameIndex === 0 || peak.frameIndex % 10 === 0) {
              console.log(`[worker] DEBUG: Meyda returned - hasAmplitudeSpectrum=${!!amplitudeSpectrum}, type=${typeof amplitudeSpectrum}, isArray=${Array.isArray(amplitudeSpectrum)}, isTypedArray=${ArrayBuffer.isView(amplitudeSpectrum)}, converted=${spectrumArray !== null}, length=${amplitudeSpectrum?.length ?? 'N/A'}`);
              if (spectrumArray && spectrumArray.length > 0) {
                console.log(`[worker] DEBUG: First 5 spectrum values:`, spectrumArray.slice(0, 5));
              }
            }
            
            if (spectrumArray && spectrumArray.length > 0) {
              const spectrumLength = spectrumArray.length;
              const actualFFTSize = spectrumLength * 2; // Meyda returns half the FFT size
              const nyquist = sampleRate / 2;
              const binWidth = nyquist / spectrumLength;
              
              let weightedSum = 0;
              let magnitudeSum = 0;
              
              for (let i = 0; i < spectrumLength; i++) {
                const magnitude = spectrumArray[i] || 0;
                const frequency = i * binWidth;
                weightedSum += frequency * magnitude;
                magnitudeSum += magnitude;
              }
              
              // Calculate centroid in Hz
              spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
              
              // DEBUG: Log the manual calculation
              if (peak.frameIndex === 0 || peak.frameIndex % 10 === 0) {
                console.log(`[worker] DEBUG: Manual centroid calculation - spectrumLength=${spectrumLength}, actualFFTSize=${actualFFTSize}, binWidth=${binWidth.toFixed(2)}Hz, weightedSum=${weightedSum.toFixed(3)}, magnitudeSum=${magnitudeSum.toFixed(3)}, calculatedCentroid=${spectralCentroid.toFixed(0)}Hz`);
              }
            } else {
              // DEBUG: Log why calculation failed
              if (peak.frameIndex === 0 || peak.frameIndex % 10 === 0) {
                console.log(`[worker] DEBUG: Cannot calculate centroid - amplitudeSpectrum is missing or invalid`);
              }
            }
            
            // *** Score-based classification system ***
            // Uses weighted scoring to allow partial matches
            const scores = { kick: 0, snare: 0, hat: 0 };

            // Score Kick: Low frequency + high RMS
            if (rms > c.kickRmsMin && spectralCentroid < c.kickCentroidMax) {
              const rmsScore = rms / c.kickRmsMin;
              const freqScore = 1 - (spectralCentroid / c.kickCentroidMax); // Lower is better
              scores.kick = rmsScore + freqScore;
            }

            // Score Snare: Mid-high frequency + sharpness + decent RMS
            // More forgiving - allow partial matches
            let snareMatchCount = 0;
            let snareScoreSum = 0;
            if (spectralCentroid > c.snareCentroidMin && spectralCentroid < c.snareCentroidMax) {
              snareMatchCount++;
              snareScoreSum += 1.0; // Frequency match
            }
            if (perceptualSharpness > c.snareSharpnessMin) {
              snareMatchCount++;
              snareScoreSum += perceptualSharpness / c.snareSharpnessMin;
            }
            if (rms > c.snareRmsMin) {
              snareMatchCount++;
              snareScoreSum += rms / c.snareRmsMin;
            }
            // Require at least 2 out of 3 criteria
            if (snareMatchCount >= 2) {
              scores.snare = snareScoreSum;
            }

            // Score Hat: Very high frequency + high ZCR + any RMS
            let hatMatchCount = 0;
            let hatScoreSum = 0;
            if (spectralCentroid > c.hatCentroidMin) {
              hatMatchCount++;
              hatScoreSum += spectralCentroid / c.hatCentroidMin; // Higher is better
            }
            if (normalizedZcr > c.hatZcrMin) {
              hatMatchCount++;
              hatScoreSum += normalizedZcr / c.hatZcrMin;
            }
            if (rms > c.hatRmsMin) {
              hatMatchCount++;
              hatScoreSum += rms / c.hatRmsMin;
            }
            // Require at least 2 out of 3 criteria
            if (hatMatchCount >= 2) {
              scores.hat = hatScoreSum;
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


