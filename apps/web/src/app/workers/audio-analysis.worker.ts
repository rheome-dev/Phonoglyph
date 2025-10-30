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
  drums: ['rms', 'zcr', 'spectralCentroid'],
  bass: ['rms', 'loudness', 'spectralCentroid'],
  vocals: ['rms', 'loudness', 'mfcc'],
  other: ['rms', 'loudness', 'spectralCentroid'],
  master: ['rms', 'loudness', 'spectralCentroid', 'spectralRolloff', 'spectralFlatness', 'zcr', 'perceptualSpread', 'amplitudeSpectrum'],
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
            let numericValue = 0;
            if (typeof value === 'number') numericValue = value;
            else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') numericValue = value[0];
            else if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'number') numericValue = value.value;
            featureFrames[feature].push(numericValue);
          }
        }
      }
    } catch {
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
    if (key === 'loudness') {
      flatFeatures.loudness = featureFrames.loudness.total;
    } else if (key === 'fft') {
      flatFeatures.fft = featureFrames.fft.length > 0 ? featureFrames.fft[featureFrames.fft.length - 1] : [];
      flatFeatures.fftFrequencies = featureFrames.fftFrequencies;
    } else if (key === 'amplitudeSpectrum') {
      flatFeatures.fft = featureFrames.amplitudeSpectrum.length > 0 ? featureFrames.amplitudeSpectrum[featureFrames.amplitudeSpectrum.length - 1] : [];
      if (featureFrames.fftFrequencies.length === 0 && flatFeatures.fft.length > 0) {
        const fftFrequencies = [] as number[];
        for (let i = 0; i < flatFeatures.fft.length; i++) {
          const frequency = (i * sampleRate) / 1024;
          fftFrequencies.push(frequency);
        }
        flatFeatures.fftFrequencies = fftFrequencies;
      }
    } else if (
      key === 'stereoWindow_left' ||
      key === 'stereoWindow_right' ||
      key === 'volume' ||
      key === 'bass' ||
      key === 'mid' ||
      key === 'treble' ||
      key === 'features'
    ) {
      flatFeatures[key] = Array.isArray(featureFrames[key]) ? featureFrames[key] : [];
    } else {
      flatFeatures[key] = featureFrames[key];
    }
  }

  Object.keys(flatFeatures).forEach((k) => {
    const val = flatFeatures[k];
    if (Array.isArray(val)) {
      flatFeatures[k] = val.map((v) => (typeof v === 'number' && isFinite(v) ? v : 0));
    }
  });

  return flatFeatures as Record<string, number[] | number>;
}

self.onmessage = function (event: MessageEvent<WorkerMessage>) {
  const { type, data } = event.data as any;
  if (type === 'ANALYZE_BUFFER') {
    const { fileId, channelData, sampleRate, duration, stemType } = data;
    try {
      const analysis = performFullAnalysis(channelData, sampleRate, stemType, () => {});
      const waveformData = generateWaveformData(channelData, duration, 1024);
      const result = {
        id: `client_${fileId}`,
        fileMetadataId: fileId,
        stemType,
        analysisData: analysis,
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


