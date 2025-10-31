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
  drums: ['rms', 'zcr', 'spectralCentroid', 'spectralFlux', 'energy', 'perceptualSharpness'],
  bass: ['rms', 'loudness', 'spectralCentroid'],
  vocals: ['rms', 'loudness', 'mfcc', 'chroma'],
  other: ['rms', 'loudness', 'spectralCentroid', 'chroma'],
  master: ['rms', 'loudness', 'spectralCentroid', 'spectralRolloff', 'spectralFlatness', 'zcr', 'perceptualSpread', 'amplitudeSpectrum', 'spectralFlux', 'perceptualSharpness', 'energy', 'chroma'],
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
    if (f === 'loudness') {
      featureFrames.loudness = { specific: [], total: [] };
    } else {
      featureFrames[f] = [];
    }
  });
  featureFrames.fft = [];
  featureFrames.fftFrequencies = [];
  featureFrames.amplitudeSpectrum = [];
  featureFrames.stereoWindow_left = [];
  featureFrames.stereoWindow_right = [];
  featureFrames.volume = [];
  featureFrames.bass = [];
  featureFrames.mid = [];
  featureFrames.treble = [];
  featureFrames.features = [];

  if (featuresToExtract.length === 0) {
    if (onProgress) onProgress(1);
    return {
      features: [],
      markers: [],
      frequencies: [],
      timeData: [],
      volume: [],
      bass: [],
      mid: [],
      treble: [],
      stereoWindow_left: [],
      stereoWindow_right: [],
      fft: [],
      fftFrequencies: [],
    } as Record<string, number[] | number>;
  }

  const bufferSize = 1024;
  const hopSize = 512;
  let currentPosition = 0;
  const totalSteps = Math.max(1, Math.floor((channelData.length - bufferSize) / hopSize));

  while (currentPosition + bufferSize <= channelData.length) {
    const buffer = channelData.slice(currentPosition, currentPosition + bufferSize);
    let features: any = null;
    try {
      features = (Meyda as any).extract(featuresToExtract, buffer);
      if (features) {
        for (const feature of featuresToExtract) {
          if (feature === 'loudness') {
            if (features.loudness && features.loudness.total !== undefined) {
              featureFrames.loudness.specific.push(features.loudness.specific);
              featureFrames.loudness.total.push(features.loudness.total);
            } else {
              featureFrames.loudness.specific.push([]);
              featureFrames.loudness.total.push(0);
            }
          } else if (feature === 'amplitudeSpectrum') {
            const amplitudeData = features.amplitudeSpectrum;
            if (amplitudeData && Array.isArray(amplitudeData) && amplitudeData.length > 0) {
              featureFrames.amplitudeSpectrum.push([...amplitudeData]);
            } else if (amplitudeData && typeof amplitudeData === 'object' && !Array.isArray(amplitudeData)) {
              let magnitudes: number[] = [];
              if (amplitudeData.real && amplitudeData.imag && Array.isArray(amplitudeData.real) && Array.isArray(amplitudeData.imag)) {
                for (let i = 0; i < Math.min(amplitudeData.real.length, amplitudeData.imag.length); i++) {
                  const real = amplitudeData.real[i];
                  const imag = amplitudeData.imag[i];
                  if (typeof real === 'number' && typeof imag === 'number') {
                    const magnitude = Math.sqrt(real * real + imag * imag);
                    magnitudes.push(magnitude);
                  }
                }
              } else if (amplitudeData.length !== undefined) {
                magnitudes = Array.from(amplitudeData);
              }
              featureFrames.amplitudeSpectrum.push(magnitudes);
            } else {
              featureFrames.amplitudeSpectrum.push([]);
            }
          } else {
            const value = features[feature];
            if (Array.isArray(value)) {
              // For array features like chroma or mfcc, push the whole array
              featureFrames[feature].push(value);
            } else {
              // For single-value features, push the number
              let numericValue = 0;
              if (typeof value === 'number') {
                numericValue = value;
              } else if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'number') {
                numericValue = value.value;
              }
              featureFrames[feature].push(numericValue);
            }
          }
        }
      }
    } catch (error) {
      // Expose underlying Meyda extraction error for diagnosis
      // eslint-disable-next-line no-console
      console.error('Meyda extraction failed:', error);
      features = {};
    }

    if (features) {
      const rms = features.rms || 0;
      featureFrames.volume.push(rms);
      const spectralCentroid = features.spectralCentroid || 0;
      featureFrames.bass.push(spectralCentroid < 200 ? rms : 0);
      featureFrames.mid.push(spectralCentroid >= 200 && spectralCentroid < 2000 ? rms : 0);
      featureFrames.treble.push(spectralCentroid >= 2000 ? rms : 0);
      const allFeatures = Object.values(features).flat().filter((v) => typeof v === 'number');
      featureFrames.features.push(allFeatures.length > 0 ? (allFeatures[0] as number) : 0);
    }

    const N = 1024;
    const leftWindow = buffer.slice(-N);
    featureFrames.stereoWindow_left = Array.from(leftWindow);
    featureFrames.stereoWindow_right = Array.from(leftWindow);
    const frameStartTime = currentPosition / sampleRate;
    frameTimes.push(frameStartTime);
    currentPosition += hopSize;
    if (onProgress) onProgress(currentPosition / channelData.length);
  }

  const flatFeatures: Record<string, any> = {};
  flatFeatures.frameTimes = Array.from(frameTimes);

  for (const key in featureFrames) {
    if (key === 'loudness' && featureFrames.loudness.total) {
      flatFeatures.loudness = featureFrames.loudness.total;
    } else if (key === 'amplitudeSpectrum') {
      // Use the last frame's spectrum as representative FFT
      flatFeatures.fft = featureFrames.amplitudeSpectrum.length > 0
        ? featureFrames.amplitudeSpectrum[featureFrames.amplitudeSpectrum.length - 1]
        : [];
      if (flatFeatures.fft.length > 0) {
        const fftFrequencies: number[] = [];
        for (let i = 0; i < flatFeatures.fft.length; i++) {
          fftFrequencies.push((i * sampleRate) / 1024);
        }
        flatFeatures.fftFrequencies = fftFrequencies;
      }
    } else {
      // Copy through all other features as extracted
      flatFeatures[key] = featureFrames[key];
    }
  }

  return flatFeatures as Record<string, number[] | number>;
}

function performEnhancedAnalysis(
  fullAnalysis: Record<string, number[] | number>,
  sampleRate: number,
  analysisParams?: any
): { time: number; intensity: number; type: string }[] {
  console.log('🎵 Performing lightweight transient classification...');

  const params = Object.assign({
    onsetThreshold: 0.3,
    peakWindow: 8,
    peakMultiplier: 1.5,
    classification: {
      highEnergyThreshold: 0.2,
      highZcrThreshold: 0.2,
      snareSharpnessThreshold: 0.6,
      kickCentroidMax: 500,
      hatCentroidMin: 8000,
      snareCentroidMin: 2000,
      snareCentroidMax: 6000,
    }
  }, analysisParams || {});

  const { frameTimes, spectralFlux, spectralCentroid, perceptualSharpness, zcr, energy } = fullAnalysis;

  if (!spectralFlux || !Array.isArray(spectralFlux) || spectralFlux.length === 0) {
    console.warn('⚠️ Cannot perform enhanced analysis: spectralFlux data is missing.');
    return [];
  }

  const maxFlux = Math.max(1e-6, ...(spectralFlux as number[]));
  const normFlux = (spectralFlux as number[]).map(v => v / maxFlux);

  const peaks: { frameIndex: number; time: number; intensity: number }[] = [];
  const w = Math.max(1, params.peakWindow | 0);
  for (let i = 0; i < normFlux.length; i++) {
    const start = Math.max(0, i - w);
    const end = Math.min(normFlux.length, i + w + 1);
    let sum = 0, sumSq = 0, count = 0;
    for (let j = start; j < end; j++) { sum += normFlux[j]; sumSq += normFlux[j] * normFlux[j]; count++; }
    const mean = sum / Math.max(1, count);
    const std = Math.sqrt(Math.max(0, (sumSq / Math.max(1, count)) - mean * mean));
    const threshold = mean + params.peakMultiplier * std;
    const isLocalMax = (i === 0 || normFlux[i] > normFlux[i - 1]) && (i === normFlux.length - 1 || normFlux[i] >= normFlux[i + 1]);
    if (isLocalMax && normFlux[i] > threshold && normFlux[i] > params.onsetThreshold) {
      const frameTimesArray = Array.isArray(frameTimes) ? frameTimes : [];
      peaks.push({ frameIndex: i, time: frameTimesArray[i] ?? i, intensity: normFlux[i] });
    }
  }

  const transients: { time: number; intensity: number; type: string }[] = [];
  const c = params.classification;
  for (const peak of peaks) {
    const i = peak.frameIndex;
    const energyArray = Array.isArray(energy) ? energy : [];
    const spectralCentroidArray = Array.isArray(spectralCentroid) ? spectralCentroid : [];
    const perceptualSharpnessArray = Array.isArray(perceptualSharpness) ? perceptualSharpness : [];
    const zcrArray = Array.isArray(zcr) ? zcr : [];
    
    const peakEnergy = energyArray[i] ?? 0;
    const peakCentroid = spectralCentroidArray[i] ?? 0;
    const peakSharpness = perceptualSharpnessArray[i] ?? 0;
    const peakZcr = zcrArray[i] ?? 0;

    let type = 'generic';
    if (peakEnergy > c.highEnergyThreshold && peakCentroid < c.kickCentroidMax) {
      type = 'kick';
    } else if (peakCentroid > c.hatCentroidMin && peakZcr > c.highZcrThreshold) {
      type = 'hat';
    } else if (peakSharpness > c.snareSharpnessThreshold && peakCentroid >= c.snareCentroidMin && peakCentroid <= c.snareCentroidMax) {
      type = 'snare';
    }

    transients.push({ time: peak.time, intensity: peak.intensity, type });
  }

  return transients;
}

self.onmessage = function (event: MessageEvent<WorkerMessage>) {
  const { type, data } = event.data as any;
  if (type === 'ANALYZE_BUFFER') {
    const { fileId, channelData, sampleRate, duration, stemType, enhancedAnalysis, analysisParams } = data;
    try {
      const analysis = performFullAnalysis(channelData, sampleRate, stemType, () => {});
      const waveformData = generateWaveformData(channelData, duration, 1024);
      
      // NEW: Run enhanced analysis for transients
      const transients = performEnhancedAnalysis(analysis, sampleRate, analysisParams);

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


