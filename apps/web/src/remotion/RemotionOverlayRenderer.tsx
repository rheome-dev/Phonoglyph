import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
import { HudOverlay } from '@/components/hud/HudOverlay';
import type { Layer } from '@/types/video-composition';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { extractAudioDataAtTime } from './RayboxComposition';

type RemotionOverlayRendererProps = {
  layers: Layer[];
  audioAnalysisData: CachedAudioAnalysisData[];
  masterAudioUrl?: string;
};

// Helper: get feature keys for overlay type (copied from HudOverlayManager)
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

const STEREO_WINDOW_SIZE = 256;

/**
 * Fill an interleaved Float32Array [L0,R0,L1,R1,...] with a stereo window from
 * a decoded AudioBuffer at a given time. Writes into the caller's `out` buffer
 * so a single allocation can be reused across all frames in a Lambda chunk
 * (avoids both per-frame GC churn and upfront pre-computation cost).
 */
function fillStereoWindow(
  buffer: AudioBuffer,
  currentTime: number,
  out: Float32Array,
): void {
  const windowSize = out.length >> 1;
  const sampleRate = buffer.sampleRate;
  const playbackTime = buffer.duration > 0 ? currentTime % buffer.duration : 0;
  const currentSample = Math.floor(playbackTime * sampleRate);
  const start = currentSample - windowSize;
  const end = currentSample;
  const numChannels = buffer.numberOfChannels;
  const leftChannel = buffer.getChannelData(0);
  const rightChannel = numChannels >= 2 ? buffer.getChannelData(1) : leftChannel;

  if (start < 0) {
    for (let i = 0; i < windowSize; i++) {
      const idx = i < end ? buffer.length + start + i : i - end;
      out[i * 2] = leftChannel[idx] ?? 0;
      out[i * 2 + 1] = rightChannel[idx] ?? 0;
    }
  } else if (end > buffer.length) {
    for (let i = 0; i < windowSize; i++) {
      const srcIdx = start + i < buffer.length ? start + i : i - (end - buffer.length);
      out[i * 2] = leftChannel[srcIdx] ?? 0;
      out[i * 2 + 1] = rightChannel[srcIdx] ?? 0;
    }
  } else {
    for (let i = 0; i < windowSize; i++) {
      out[i * 2] = leftChannel[start + i];
      out[i * 2 + 1] = rightChannel[start + i];
    }
  }
}

export const RemotionOverlayRenderer: React.FC<RemotionOverlayRendererProps> = ({
  layers,
  audioAnalysisData,
  masterAudioUrl,
}) => {
  // Use Remotion's hook directly - this gets the frame value during render
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width: videoWidth, height: videoHeight } = useVideoConfig();
  const videoDuration = fps > 0 ? durationInFrames / fps : 30; // Fallback to 30s if no duration
  const currentTime = fps > 0 ? frame / fps : 0;
  const cachedAnalysis = audioAnalysisData as CachedAudioAnalysisData[];

  // Decoded master AudioBuffer — kept in memory so we can extract stereo windows
  // lazily per-frame without pre-computing all 9000 frames upfront.
  const decodedAudioRef = useRef<AudioBuffer | null>(null);
  // Single reusable buffer — filled in-place each frame by fillStereoWindow.
  // Eliminates both per-frame allocation (GC churn) and upfront pre-computation (Lambda timeout).
  const stereoBufRef = useRef<Float32Array>(new Float32Array(STEREO_WINDOW_SIZE * 2));
  const [audioReady, setAudioReady] = useState(!masterAudioUrl);
  const [delayHandle] = useState(() => {
    // Only delay render if we have a stereometer overlay and a master audio URL
    const hasStereometer = layers.some(l => l.type === 'overlay' && l.effectType === 'stereometer');
    if (hasStereometer && masterAudioUrl) {
      return delayRender('Decoding master audio for stereometer');
    }
    return null;
  });

  useEffect(() => {
    if (!masterAudioUrl || delayHandle === null) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(masterAudioUrl);
        const arrayBuffer = await response.arrayBuffer();
        // OfflineAudioContext is available in headless Chrome (Lambda)
        const offlineCtx = new OfflineAudioContext(2, 1, 44100);
        const decoded = await offlineCtx.decodeAudioData(arrayBuffer);
        if (cancelled) return;

        decodedAudioRef.current = decoded;
        setAudioReady(true);
        continueRender(delayHandle);
      } catch (err) {
        console.error('Failed to decode master audio for stereometer:', err);
        if (!cancelled) {
          setAudioReady(true);
          continueRender(delayHandle);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [masterAudioUrl, delayHandle]);

  const overlayLayers = useMemo(
    () => layers.filter((layer) => layer.type === 'overlay'),
    [layers],
  );

  const activeOverlays = useMemo(
    () =>
      overlayLayers.filter(
        (layer) =>
          (layer.enabled !== false) &&
          currentTime >= (layer.startTime ?? 0) &&
          currentTime <= (layer.endTime ?? Number.POSITIVE_INFINITY),
      ),
    [overlayLayers, currentTime],
  );

  // Compute feature data for an overlay layer – adapted from HudOverlayManager,
  // but using cached audio analysis + extractAudioDataAtTime instead of audioController hooks.
  const getFeatureDataForOverlay = useCallback(
    (layer: Layer) => {
      const settings = (layer as any).settings || {};
      const stemId = settings.stemId || settings.stem?.id;
      const overlayType = layer.effectType as string;

      if (cachedAnalysis.length === 0) {
        return null;
      }
      // Stereometer can synthesise data without a stemId — use master stem as fallback.
      // All other overlay types need a valid stemId to look up their analysis data.
      if (!stemId && overlayType !== 'stereometer') {
        return null;
      }

      // Find the analysis for this stem
      let analysis = stemId ? cachedAnalysis.find((a) => a.fileMetadataId === stemId) : null;

      // FALLBACK: If strict ID match fails, try matching by stemType
      if (!analysis) {
        const requestedStemType = settings.stemType || 'master';
        analysis = cachedAnalysis.find(a => a.stemType === requestedStemType);
      }
      // Last resort for stereometer: use any available analysis
      if (!analysis && overlayType === 'stereometer') {
        analysis = cachedAnalysis[0] ?? null;
      }
      if (!analysis || !analysis.analysisData) {
        return null;
      }

      const featureKeys = getFeatureKeyForOverlay(overlayType);

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
      const analysisDurationField = (analysis.analysisData as any)
        .analysisDuration as number | undefined;

      // FIX: Use videoDuration as ultimate fallback instead of 1 second
      // This prevents overlays from "finishing" immediately and freezing
      const analysisDuration =
        metadataDuration ?? derivedDurationFromFrames ?? analysisDurationField ?? videoDuration;
      const progress = Math.max(0, Math.min(currentTime / analysisDuration, 1));

      // For spectrum overlays
      if (overlayType === 'spectrogram' || overlayType === 'spectrumAnalyzer') {
        // Use the shared extractor to get the FFT data for the current time
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );

        if (extracted?.frequencies?.length) {
          // For spectrogram, we might want a buffer, but for now let's return the current frame
          // If the overlay needs a buffer, it should manage it or we need to reconstruct it here
          // properly. However, the issue described is "static" rendering, which usually means
          // the data isn't updating. Returning the correct frame data fixes that.

          // If the component expects a buffer (history), we can try to generate a small one
          // by sampling previous frames, but for a single frame render, just the current
          // FFT is the most critical part.

          // Let's look at how HudOverlay uses this. It likely expects 'fft' to be the current frame.
          // The previous code was generating a fake buffer.

          // Let's reconstruct a small buffer by sampling backwards if needed, 
          // but primarily ensure 'fft' is correct.

          const buffer: Array<Float32Array> = [];
          // Sample a few frames back to give some history if needed
          const numHistoryFrames = 5;
          for (let i = numHistoryFrames; i >= 0; i--) {
            const t = currentTime - (i * 0.05); // 50ms steps
            const histExtracted = extractAudioDataAtTime(
              cachedAnalysis,
              analysis.fileMetadataId,
              Math.max(0, t),
              analysis.stemType
            );
            if (histExtracted?.frequencies) {
              buffer.push(new Float32Array(histExtracted.frequencies));
            } else {
              buffer.push(new Float32Array(extracted.frequencies.length).fill(0));
            }
          }

          return {
            fft: new Float32Array(extracted.frequencies),
            fftBuffer: buffer,
          };
        }

        return null;
      }

      // For stereometer: lazily extract the current frame's window from the
      // decoded AudioBuffer into our single reusable buffer. Each Lambda chunk
      // only pays the cost of ~20 extractions (its actual frame range) instead
      // of all 9000 upfront.
      if (overlayType === 'stereometer') {
        if (decodedAudioRef.current) {
          fillStereoWindow(decodedAudioRef.current, currentTime, stereoBufRef.current);
          return { stereoWindow: stereoBufRef.current };
        }
        return null;
      }

      // For consoleFeed: Use time-domain window as raw audio buffer
      if (overlayType === 'consoleFeed') {
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );

        if (extracted?.timeData?.length) {
          return { audioBuffer: extracted.timeData };
        }

        return null;
      }

      // For chroma wheel – use cached chroma data directly
      if (overlayType === 'chromaWheel') {
        if (analysis.analysisData.chroma && Array.isArray(analysis.analysisData.chroma)) {
          return { chroma: analysis.analysisData.chroma };
        }
        return null;
      }

      // For VU meter – derive RMS / peak from cached arrays
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

      // Generic array-based features (waveform, peakMeter, etc.)
      let featureArr: number[] | null = null;
      for (const key of featureKeys) {
        const arr = (analysis.analysisData as any)[key];
        if (arr && Array.isArray(arr) && arr.length > 0) {
          featureArr = arr;
          break;
        }
      }

      if (!featureArr) {
        // Fallback: try any available array feature
        // Note: analysis is already validated above (line 81), so it's guaranteed to be defined here
        const availableFeatures = Object.keys(analysis!.analysisData).filter(
          (key) =>
            Array.isArray((analysis!.analysisData as any)[key]) &&
            (analysis!.analysisData as any)[key].length > 0,
        );
        if (availableFeatures.length > 0) {
          featureArr = (analysis!.analysisData as any)[availableFeatures[0]];
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

      // Default: single scalar
      return featureArr[idx];
    },
    [cachedAnalysis, currentTime, decodedAudioRef, stereoBufRef],
  );

  if (activeOverlays.length === 0) {
    return null;
  }

  return (
    <div
      id="remotion-hud-overlays-container"
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
    >
      {activeOverlays.map((layer) => {
        const featureData = getFeatureDataForOverlay(layer);
        return (
          <HudOverlay
            key={layer.id}
            layer={layer}
            featureData={featureData}
            // Pass video dimensions for headless rendering - avoids 0x0 canvas issue
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            // Pass frame/fps explicitly to avoid calling hooks twice
            frame={frame}
            fps={fps}
            // No-op callbacks: overlays are not editable in Remotion render
            onOpenModal={() => { }}
            onUpdate={() => { }}
            isSelected={false}
            isInteractive={false}
            onSelect={() => { }}
          />
        );
      })}
    </div>
  );
};


