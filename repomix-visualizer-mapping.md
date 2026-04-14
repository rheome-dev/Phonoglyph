This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where comments have been removed, empty lines have been removed.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: apps/web/src/hooks/use-audio-features.ts, apps/web/src/hooks/use-stem-audio-controller.ts, apps/web/src/hooks/use-audio-analysis.ts, apps/web/src/hooks/use-feature-value.ts, apps/web/src/lib/visualizer/core/AudioTextureManager.ts, apps/web/src/lib/visualizer/core/VisualizerManager.ts, apps/web/src/lib/visualizer/core/MediaLayerManager.ts, apps/web/src/lib/visualizer/core/MultiLayerCompositor.ts, apps/web/src/app/creative-visualizer/**/*, apps/web/src/remotion/**/*.ts, apps/web/src/remotion/**/*.tsx, apps/web/src/types/audio-analysis*.ts, apps/web/src/stores/*.ts
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Code comments have been removed from supported file types
- Empty lines have been removed from all files
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
apps/
  web/
    src/
      app/
        creative-visualizer/
          page.tsx
      hooks/
        use-audio-analysis.ts
        use-audio-features.ts
        use-feature-value.ts
        use-stem-audio-controller.ts
      lib/
        visualizer/
          core/
            AudioTextureManager.ts
            MediaLayerManager.ts
            MultiLayerCompositor.ts
            VisualizerManager.ts
      remotion/
        Debug.tsx
        index.ts
        RayboxComposition.tsx
        RemotionOverlayRenderer.tsx
        Root.tsx
      stores/
        projectSettingsStore.ts
        timelineStore.ts
        visualizerStore.ts
      types/
        audio-analysis-data.ts
        audio-analysis.ts
```

# Files

## File: apps/web/src/hooks/use-audio-features.ts
```typescript
'use client';
import { useMemo } from 'react';
export interface AudioFeature {
  id: string;
  name: string;
  description: string;
  category: 'rhythm' | 'pitch' | 'intensity' | 'timbre';
  stemType?: string;
  isEvent?: boolean;
}
export function useAudioFeatures(
  trackId?: string,
  stemType?: string,
  cachedAnalysis?: any[]
): AudioFeature[] {
  return useMemo(() => {
    if (!trackId || !stemType || !cachedAnalysis || cachedAnalysis.length === 0) {
      return [];
    }
    const analysis = cachedAnalysis.find(a => a.fileMetadataId === trackId && a.stemType === stemType);
    if (!analysis || !analysis.analysisData) {
      return [];
    }
    const features: AudioFeature[] = [];
    const { analysisData } = analysis;
    if (analysisData.rms || analysisData.volume) {
      features.push({
        id: `${stemType}-volume`,
        name: 'Volume',
        description: 'The root-mean-square value, representing overall loudness.',
        category: 'intensity',
        stemType: stemType,
        isEvent: false
      });
    }
    if (analysisData.chroma) {
      features.push({
        id: `${stemType}-pitch`,
        name: 'Pitch',
        description: 'The dominant musical pitch class (C, C#, D, etc.).',
        category: 'pitch',
        stemType: stemType,
        isEvent: true
      });
    }
    if (analysisData.transients && Array.isArray(analysisData.transients) && analysisData.transients.length > 0) {
      features.push({
        id: `${stemType}-peaks`,
        name: 'Peaks',
        description: 'The intensity of detected transients or onsets.',
        category: 'rhythm',
        stemType: stemType,
        isEvent: true
      });
    }
    return features;
  }, [trackId, stemType, cachedAnalysis]);
}
```

## File: apps/web/src/hooks/use-feature-value.ts
```typescript
import { useState, useEffect } from 'react';
export function useFeatureValue(featureId: string | null): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!featureId) {
      setValue(0);
      return;
    }
    let animationId: number;
    let time = 0;
    const updateValue = () => {
      time += 0.016;
      let newValue = 0;
      if (featureId.includes('rms')) {
        newValue = 0.3 + 0.4 * Math.sin(time * 2) + 0.1 * Math.random();
      } else if (featureId.includes('spectral')) {
        newValue = 0.4 + 0.3 * Math.sin(time * 0.5) + 0.2 * Math.cos(time * 1.5);
      } else if (featureId.includes('loudness')) {
        newValue = 0.2 + 0.6 * Math.abs(Math.sin(time * 3)) + 0.1 * Math.random();
      } else {
        newValue = 0.5 + 0.3 * Math.sin(time) + 0.1 * Math.random();
      }
      newValue = Math.max(0, Math.min(1, newValue));
      setValue(newValue);
      animationId = requestAnimationFrame(updateValue);
    };
    animationId = requestAnimationFrame(updateValue);
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [featureId]);
  return value;
}
```

## File: apps/web/src/hooks/use-stem-audio-controller.ts
```typescript
import { useRef, useState, useCallback, useEffect } from 'react';
import { StemAnalysis, AudioFeature } from '@/types/stem-audio-analysis';
import { AudioAnalysisData } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';
interface Stem {
  id: string;
  url: string;
  label?: string;
  isMaster: boolean;
}
interface StemFeatures {
  [stemId: string]: StemAnalysis | null;
}
interface UseStemAudioController {
  play: () => void;
  pause: () => void;
  stop: () => void;
  isPlaying: boolean;
  featuresByStem: StemFeatures;
  currentTime: number;
  setCurrentTime: (t: number) => void;
  loadStems: (stems: Stem[], onDecode?: (stemId: string, buffer: AudioBuffer) => void) => Promise<void>;
  clearStems: () => void;
  setStemVolume: (stemId: string, volume: number) => void;
  getStemVolume: (stemId: string) => number;
  testAudioOutput: () => Promise<void>;
  visualizationData: AudioAnalysisData | null;
  stemsLoaded: boolean;
  isLooping: boolean;
  setLooping: (looping: boolean) => void;
  soloedStems: Set<string>;
  toggleStemSolo: (stemId: string) => void;
  getAudioLatency: () => number;
  getAudioContextTime: () => number;
  scheduledStartTimeRef: React.MutableRefObject<number>;
  duration: number;
  getStereoWindow: (stemId: string, windowSize: number, currentTimeOverride?: number) => { left: number[], right: number[] } | null;
  getAudioBuffer: (stemId: string, windowSize: number, currentTimeOverride?: number) => Float32Array | null;
}
export function useStemAudioController(): UseStemAudioController {
  const [isPlaying, setIsPlaying] = useState(false);
  const [featuresByStem, setFeaturesByStem] = useState<StemFeatures>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [visualizationData, setVisualizationData] = useState<AudioAnalysisData | null>(null);
  const [stemsLoaded, setStemsLoaded] = useState(false);
  const [workerSetupComplete, setWorkerSetupComplete] = useState(false);
  const loadingRef = useRef(false);
  const [isLooping, setIsLooping] = useState(true);
  const [soloedStems, setSoloedStems] = useState<Set<string>>(new Set());
  const masterStemIdRef = useRef<string | null>(null);
  const finishedStemsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  const audioSourcesRef = useRef<Record<string, AudioBufferSourceNode>>({});
  const gainNodesRef = useRef<Record<string, GainNode>>({});
  const startTimeRef = useRef(0);
  const scheduledStartTimeRef = useRef(0);
  const pausedTimeRef = useRef(0);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isIntentionallyStoppingRef = useRef(false);
  useEffect(() => {
    const initializeAudioSystem = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        debugLog.log('🎵 Audio context created with state:', audioContextRef.current.state);
        debugLog.log('🎵 Audio context sample rate:', audioContextRef.current.sampleRate);
        if (audioContextRef.current.state === 'suspended') {
          debugLog.log('🎵 Audio context is suspended, attempting to resume...');
          try {
            await audioContextRef.current.resume();
            debugLog.log('🎵 Audio context resumed successfully');
          } catch (resumeError) {
            debugLog.warn('⚠️ Could not resume audio context immediately:', resumeError);
            debugLog.log('🎵 User interaction will be required to start audio');
          }
        }
        debugLog.log('🎵 Advanced audio analysis system initialized');
      } catch (error) {
        debugLog.error('❌ Failed to initialize audio analysis system:', error);
      }
    };
    initializeAudioSystem();
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);
  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;
    const audioContext = audioContextRef.current;
    const activeSoloStems = soloedStems.size > 0;
    const masterStemId = masterStemIdRef.current;
    Object.entries(gainNodesRef.current).forEach(([stemId, gainNode]) => {
      const isSoloed = soloedStems.has(stemId);
      let targetVolume = 0;
      if (activeSoloStems) {
        targetVolume = isSoloed ? 0.7 : 0;
      } else {
        targetVolume = (stemId === masterStemId) ? 0.7 : 0;
      }
      gainNode.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 0.1);
    });
  }, [soloedStems, isPlaying]);
  const toggleStemSolo = useCallback((stemId: string) => {
    setSoloedStems(prev => {
      const newSoloed = new Set(prev);
      if (newSoloed.has(stemId)) {
        newSoloed.delete(stemId);
      } else {
        newSoloed.add(stemId);
      }
      return newSoloed;
    });
  }, []);
  const loadStems = useCallback(async (stems: Stem[], onDecode?: (stemId: string, buffer: AudioBuffer) => void) => {
    if (stems.length === 0) return;
    if (loadingRef.current || stemsLoaded) {
      debugLog.log('⚠️ Stems already loading or loaded, skipping duplicate request');
      return;
    }
    loadingRef.current = true;
    try {
      debugLog.log(`🎵 Starting to load ${stems.length} stems...`);
      debugLog.log('🎵 Stem master info:', stems.map(s => ({ id: s.id, label: s.label, isMaster: s.isMaster })));
      const decodedBuffers: Record<string, AudioBuffer> = {};
      const masterStem = stems.find(s => s.isMaster);
      if (masterStem) {
        masterStemIdRef.current = masterStem.id;
        debugLog.log('🎵 Master stem identified:', masterStem.id, masterStem.label);
      } else if (stems.length > 0) {
        masterStemIdRef.current = stems[0].id;
        debugLog.warn('⚠️ No master stem designated. Defaulting to first stem:', stems[0].id);
      }
      for (const stem of stems) {
        try {
          const resp = await fetch(stem.url);
          if (!resp.ok) throw new Error(`Failed to load stem ${stem.id}: ${resp.status}`);
          const buffer = await resp.arrayBuffer();
          const audioBuffer = await audioContextRef.current!.decodeAudioData(buffer);
          decodedBuffers[stem.id] = audioBuffer;
          const gainNode = audioContextRef.current!.createGain();
          gainNode.gain.value = 0.7;
          gainNodesRef.current[stem.id] = gainNode;
          debugLog.log(`🎵 Decoded audio buffer for ${stem.id}: ${audioBuffer.duration.toFixed(2)}s`);
          if (onDecode) {
            onDecode(stem.id, audioBuffer);
          }
        } catch (error) {
          debugLog.error(`❌ Failed to decode audio buffer for ${stem.id}:`, error);
        }
      }
      audioBuffersRef.current = { ...audioBuffersRef.current, ...decodedBuffers };
      setStemsLoaded(true);
      loadingRef.current = false;
    } catch (error) {
      debugLog.error('❌ Failed to load stems:', error);
      loadingRef.current = false;
    }
  }, []);
  const play = useCallback(async () => {
    if (!audioContextRef.current || !stemsLoaded) {
      debugLog.warn('⚠️ Cannot play: AudioContext not ready or stems not loaded');
      return;
    }
    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      Object.values(audioSourcesRef.current).forEach(source => {
        try { source.stop(); } catch (e) {  }
      });
      audioSourcesRef.current = {};
      const now = audioContextRef.current.currentTime;
      const scheduleDelay = 0.1;
      const scheduledStartTime = now + scheduleDelay;
      const offset = pausedTimeRef.current;
      startTimeRef.current = scheduledStartTime - offset;
      scheduledStartTimeRef.current = scheduledStartTime - offset;
      const activeSoloStems = soloedStems.size > 0;
      const masterId = masterStemIdRef.current;
      Object.entries(audioBuffersRef.current).forEach(([stemId, buffer]) => {
        const source = audioContextRef.current!.createBufferSource();
        const gainNode = gainNodesRef.current[stemId];
        const isSoloed = soloedStems.has(stemId);
        let initialVolume = 0;
        if (activeSoloStems) {
            initialVolume = isSoloed ? 0.7 : 0;
        } else {
            initialVolume = (stemId === masterId) ? 0.7 : 0;
        }
        gainNode.gain.setValueAtTime(initialVolume, audioContextRef.current!.currentTime);
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current!.destination);
        source.loop = isLooping;
        source.onended = () => {
          if (isIntentionallyStoppingRef.current) {
            delete audioSourcesRef.current[stemId];
          }
        };
        source.start(scheduledStartTime, offset);
        audioSourcesRef.current[stemId] = source;
      });
      pausedTimeRef.current = 0;
      setIsPlaying(true);
      isIntentionallyStoppingRef.current = false;
      timeUpdateIntervalRef.current = setInterval(() => {
        if (audioContextRef.current && isPlaying) {
          const elapsedTime = audioContextRef.current.currentTime - startTimeRef.current;
          const masterDuration = getMasterDuration();
          const currentTime = masterDuration > 0 ? elapsedTime % masterDuration : Math.max(0, elapsedTime);
          setCurrentTime(currentTime);
        }
      }, 16);
    } catch (error) {
      debugLog.error('❌ Failed to start audio playback:', error);
      setIsPlaying(false);
    }
  }, [stemsLoaded, isLooping, soloedStems]);
  const pause = useCallback(() => {
    if (!isPlaying) return;
    isIntentionallyStoppingRef.current = true;
    Object.values(audioSourcesRef.current).forEach(source => {
      try { source.stop(); } catch (e) {  }
    });
    audioSourcesRef.current = {};
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
    pausedTimeRef.current = audioContextRef.current!.currentTime - startTimeRef.current;
    setIsPlaying(false);
  }, [isPlaying]);
  const stop = useCallback(() => {
    try {
      setIsPlaying(false);
      isIntentionallyStoppingRef.current = true;
      Object.entries(audioSourcesRef.current).forEach(([stemId, source]) => {
        try {
          source.stop();
        } catch (error) {
          debugLog.error(`❌ Failed to stop playback for ${stemId}:`, error);
        }
      });
      audioSourcesRef.current = {};
      setTimeout(() => {
        isIntentionallyStoppingRef.current = false;
      }, 100);
      setCurrentTime(0);
      pausedTimeRef.current = 0;
      startTimeRef.current = 0;
    } catch (error) {
      debugLog.error('❌ Failed to stop playback:', error);
    }
  }, []);
  const clearStems = useCallback(() => {
    try {
      setIsPlaying(false);
      setCurrentTime(0);
      setFeaturesByStem({});
      setVisualizationData(null);
      setStemsLoaded(false);
      setWorkerSetupComplete(false);
      loadingRef.current = false;
      Object.entries(audioSourcesRef.current).forEach(([stemId, source]) => {
        try {
          source.stop();
        } catch (error) {
        }
      });
      audioSourcesRef.current = {};
      audioBuffersRef.current = {};
      gainNodesRef.current = {};
      pausedTimeRef.current = 0;
      startTimeRef.current = 0;
      debugLog.log('🗑️ Advanced audio analysis and playback cleared');
    } catch (error) {
      debugLog.error('❌ Failed to clear stems:', error);
    }
  }, []);
  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;
    let animationFrameId: number;
    const updateTime = () => {
      try {
        const elapsedTime = audioContextRef.current!.currentTime - startTimeRef.current;
        const masterDuration = getMasterDuration();
        const currentAudioTime = masterDuration > 0 ? elapsedTime % masterDuration : Math.max(0, elapsedTime);
        setCurrentTime(currentAudioTime);
        animationFrameId = requestAnimationFrame(updateTime);
      } catch (error) {
        debugLog.error('❌ Failed to update time:', error);
      }
    };
    animationFrameId = requestAnimationFrame(updateTime);
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);
  useEffect(() => {
    const handleUserInteraction = async () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        debugLog.log('🎵 User interaction detected, resuming audio context...');
        try {
          await audioContextRef.current.resume();
          debugLog.log('🎵 Audio context resumed via user interaction');
        } catch (error) {
          debugLog.error('❌ Failed to resume audio context on user interaction:', error);
        }
      }
    };
    const events = ['click', 'touchstart', 'keydown', 'mousedown'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true, passive: true });
    });
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, []);
  useEffect(() => {
  }, []);
  const setStemVolume = useCallback((stemId: string, volume: number) => {
    const gainNode = gainNodesRef.current[stemId];
    if (gainNode) {
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      debugLog.log(`🎵 Set volume for ${stemId}: ${volume}`);
    }
  }, []);
  const getStemVolume = useCallback((stemId: string): number => {
    const gainNode = gainNodesRef.current[stemId];
    return gainNode ? gainNode.gain.value : 0.7;
  }, []);
  const testAudioOutput = useCallback(async () => {
    if (!audioContextRef.current) {
      debugLog.warn('⚠️ No audio context available for test');
      return;
    }
    try {
      debugLog.log('🎵 Testing audio output...');
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.5);
      debugLog.log('🎵 Test tone played - you should hear a 440Hz tone for 0.5 seconds');
    } catch (error) {
      debugLog.error('❌ Audio output test failed:', error);
    }
  }, []);
  const getMaxDuration = useCallback((): number => {
    const durations = Object.values(audioBuffersRef.current).map(buffer => buffer.duration);
    return Math.max(...durations, 0);
  }, []);
  const getMasterDuration = useCallback((): number => {
    const masterId = masterStemIdRef.current;
    if (masterId && audioBuffersRef.current[masterId]) {
      return audioBuffersRef.current[masterId].duration;
    }
    return getMaxDuration();
  }, [getMaxDuration]);
  const getAudioLatency = useCallback((): number => {
    const ctx = audioContextRef.current;
    if (!ctx) return 0;
    return (ctx.baseLatency || 0) + (ctx.outputLatency || 0);
  }, []);
  const getAudioContextTime = useCallback((): number => {
    return audioContextRef.current ? audioContextRef.current.currentTime : 0;
  }, []);
  const getStereoWindow = useCallback((stemId: string, windowSize: number = 1024, currentTimeOverride?: number) => {
    const buffer = audioBuffersRef.current[stemId];
    if (!buffer) {
      debugLog.warn('[getStereoWindow] No buffer for stemId', stemId, 'Available buffers:', Object.keys(audioBuffersRef.current));
      return null;
    }
    const numChannels = buffer.numberOfChannels;
    const bufferDuration = buffer.duration;
    const sampleRate = buffer.sampleRate;
    let playbackTime: number;
    if (currentTimeOverride !== undefined) {
      playbackTime = currentTimeOverride;
    } else {
      const elapsedTime = (audioContextRef.current?.currentTime || 0) - startTimeRef.current;
      const masterDuration = getMasterDuration();
      playbackTime = masterDuration > 0 ? (elapsedTime % masterDuration) : Math.max(0, elapsedTime);
    }
    playbackTime = playbackTime % bufferDuration;
    if (playbackTime < 0) playbackTime += bufferDuration;
    const currentSample = Math.floor(playbackTime * sampleRate);
    const start = currentSample - windowSize;
    const end = currentSample;
    let left: number[] = [];
    let right: number[] = [];
    try {
      if (numChannels === 1) {
        const channel = buffer.getChannelData(0);
        if (start < 0) {
          const samplesFromEnd = Math.abs(start);
          const samplesFromStart = end;
          if (samplesFromEnd > 0 && samplesFromEnd <= buffer.length) {
            const endSamples = Array.from(channel.slice(buffer.length - samplesFromEnd, buffer.length));
            left = left.concat(endSamples);
            right = right.concat(endSamples);
          }
          if (samplesFromStart > 0 && samplesFromStart <= buffer.length) {
            const startSamples = Array.from(channel.slice(0, samplesFromStart));
            left = left.concat(startSamples);
            right = right.concat(startSamples);
          }
        } else if (end > buffer.length) {
          const samplesBeforeWrap = buffer.length - start;
          const samplesAfterWrap = end - buffer.length;
          if (samplesBeforeWrap > 0) {
            const beforeWrap = Array.from(channel.slice(start, buffer.length));
            left = left.concat(beforeWrap);
            right = right.concat(beforeWrap);
          }
          if (samplesAfterWrap > 0 && samplesAfterWrap <= buffer.length) {
            const afterWrap = Array.from(channel.slice(0, samplesAfterWrap));
            left = left.concat(afterWrap);
            right = right.concat(afterWrap);
          }
        } else {
          const channelData = Array.from(channel.slice(start, end));
          left = channelData;
          right = channelData;
        }
      } else {
        const leftChannel = buffer.getChannelData(0);
        const rightChannel = buffer.getChannelData(1);
        if (start < 0) {
          const samplesFromEnd = Math.abs(start);
          const samplesFromStart = end;
          if (samplesFromEnd > 0 && samplesFromEnd <= buffer.length) {
            const endLeft = Array.from(leftChannel.slice(buffer.length - samplesFromEnd, buffer.length));
            const endRight = Array.from(rightChannel.slice(buffer.length - samplesFromEnd, buffer.length));
            left = left.concat(endLeft);
            right = right.concat(endRight);
          }
          if (samplesFromStart > 0 && samplesFromStart <= buffer.length) {
            const startLeft = Array.from(leftChannel.slice(0, samplesFromStart));
            const startRight = Array.from(rightChannel.slice(0, samplesFromStart));
            left = left.concat(startLeft);
            right = right.concat(startRight);
          }
        } else if (end > buffer.length) {
          const samplesBeforeWrap = buffer.length - start;
          const samplesAfterWrap = end - buffer.length;
          if (samplesBeforeWrap > 0) {
            const beforeLeft = Array.from(leftChannel.slice(start, buffer.length));
            const beforeRight = Array.from(rightChannel.slice(start, buffer.length));
            left = left.concat(beforeLeft);
            right = right.concat(beforeRight);
          }
          if (samplesAfterWrap > 0 && samplesAfterWrap <= buffer.length) {
            const afterLeft = Array.from(leftChannel.slice(0, samplesAfterWrap));
            const afterRight = Array.from(rightChannel.slice(0, samplesAfterWrap));
            left = left.concat(afterLeft);
            right = right.concat(afterRight);
          }
        } else {
          left = Array.from(leftChannel.slice(start, end));
          right = Array.from(rightChannel.slice(start, end));
        }
      }
    } catch (err) {
      debugLog.error('[getStereoWindow] Error accessing buffer:', err, { stemId, buffer, start, end, currentSample, playbackTime });
      return null;
    }
    if (left.length < windowSize) {
      const padding = windowSize - left.length;
      left = Array(padding).fill(0).concat(left);
      right = Array(padding).fill(0).concat(right);
    }
    if (left.length > windowSize) {
      left = left.slice(-windowSize);
      right = right.slice(-windowSize);
    }
    return { left, right };
  }, [getMasterDuration]);
  const getAudioBuffer = useCallback((stemId: string, windowSize: number = 512, currentTimeOverride?: number) => {
    const buffer = audioBuffersRef.current[stemId];
    if (!buffer) {
      debugLog.warn('[getAudioBuffer] No buffer for stemId', stemId, 'Available buffers:', Object.keys(audioBuffersRef.current));
      return null;
    }
    const numChannels = buffer.numberOfChannels;
    const bufferDuration = buffer.duration;
    const sampleRate = buffer.sampleRate;
    let playbackTime: number;
    if (currentTimeOverride !== undefined) {
      playbackTime = currentTimeOverride;
    } else {
      const elapsedTime = (audioContextRef.current?.currentTime || 0) - startTimeRef.current;
      const masterDuration = getMasterDuration();
      playbackTime = masterDuration > 0 ? (elapsedTime % masterDuration) : Math.max(0, elapsedTime);
    }
    playbackTime = playbackTime % bufferDuration;
    if (playbackTime < 0) playbackTime += bufferDuration;
    const currentSample = Math.floor(playbackTime * sampleRate);
    const start = Math.max(0, currentSample - windowSize);
    const end = Math.min(buffer.length, currentSample);
    try {
      const channel = buffer.getChannelData(0);
      const samples = new Float32Array(end - start);
      for (let i = 0; i < samples.length; i++) {
        const idx = start + i;
        if (idx >= 0 && idx < channel.length) {
          samples[i] = channel[idx];
        } else {
          const wrappedIdx = idx < 0 ? channel.length + idx : idx % channel.length;
          samples[i] = channel[wrappedIdx];
        }
      }
      return samples;
    } catch (err) {
      debugLog.error('[getAudioBuffer] Error accessing buffer:', err, { stemId, start, end, currentSample, playbackTime });
      return null;
    }
  }, [getMasterDuration]);
  return {
    play,
    pause,
    stop,
    isPlaying,
    featuresByStem,
    currentTime,
    setCurrentTime,
    loadStems,
    clearStems,
    setStemVolume,
    getStemVolume,
    testAudioOutput,
    visualizationData,
    stemsLoaded,
    isLooping,
    setLooping: setIsLooping,
    soloedStems,
    toggleStemSolo,
    getAudioLatency,
    getAudioContextTime,
    scheduledStartTimeRef,
    duration: getMasterDuration(),
    getStereoWindow,
    getAudioBuffer,
  };
}
function createMockAudioBuffer(durationSeconds: number = 10): ArrayBuffer {
  const sampleRate = 44100;
  const samples = durationSeconds * sampleRate;
  const buffer = new ArrayBuffer(samples * 4);
  const view = new Float32Array(buffer);
  for (let i = 0; i < samples; i++) {
    view[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5;
  }
  return buffer;
}
```

## File: apps/web/src/lib/visualizer/core/AudioTextureManager.ts
```typescript
import * as THREE from 'three';
export interface AudioFeatureData {
  features: Record<string, number[]>;
  duration: number;
  sampleRate: number;
  stemTypes: string[];
}
export interface AudioFeatureMapping {
  featureIndex: number;
  stemType: string;
  featureName: string;
  minValue: number;
  maxValue: number;
}
export class AudioTextureManager {
  private audioTexture: THREE.DataTexture;
  private featureTexture: THREE.DataTexture;
  private timeTexture: THREE.DataTexture;
  private audioData: Float32Array;
  private featureData: Float32Array;
  private timeData: Float32Array;
  private readonly textureWidth = 256;
  private readonly textureHeight = 64;
  private readonly maxFeatures = 256;
  private featureMappings: AudioFeatureMapping[] = [];
  private featureIndexMap: Map<string, number> = new Map();
  constructor() {
    this.audioData = new Float32Array(this.textureWidth * this.textureHeight * 4);
    this.featureData = new Float32Array(this.textureHeight * 4);
    this.timeData = new Float32Array(4);
    this.audioTexture = new THREE.DataTexture(
      this.audioData,
      this.textureWidth,
      this.textureHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.audioTexture.needsUpdate = true;
    this.audioTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.audioTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.audioTexture.magFilter = THREE.LinearFilter;
    this.audioTexture.minFilter = THREE.LinearFilter;
    this.featureTexture = new THREE.DataTexture(
      this.featureData,
      4,
      this.textureHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.featureTexture.needsUpdate = true;
    this.featureTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.featureTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.featureTexture.magFilter = THREE.NearestFilter;
    this.featureTexture.minFilter = THREE.NearestFilter;
    this.timeTexture = new THREE.DataTexture(
      this.timeData,
      1,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.timeTexture.needsUpdate = true;
    this.timeTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.timeTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.timeTexture.magFilter = THREE.NearestFilter;
    this.timeTexture.minFilter = THREE.NearestFilter;
  }
  public loadAudioAnalysis(analysisData: AudioFeatureData): void {
    this.buildFeatureMapping(analysisData);
    this.packFeaturesIntoTexture(analysisData);
  }
  private buildFeatureMapping(analysisData: AudioFeatureData): void {
    this.featureMappings = [];
    this.featureIndexMap.clear();
    let featureIndex = 0;
    for (const stemType of analysisData.stemTypes) {
      const stemFeatures = analysisData.features[stemType];
      if (!stemFeatures) continue;
      const featureNames = ['rms', 'spectralCentroid', 'spectralRolloff', 'zcr'];
      for (const featureName of featureNames) {
        if (featureIndex >= this.maxFeatures) break;
        const mapping: AudioFeatureMapping = {
          featureIndex,
          stemType,
          featureName,
          minValue: 0,
          maxValue: 1
        };
        this.featureMappings.push(mapping);
        this.featureIndexMap.set(`${stemType}-${featureName}`, featureIndex);
        featureIndex++;
      }
    }
    this.packFeatureMetadata();
  }
  private packFeatureMetadata(): void {
    for (let i = 0; i < this.featureMappings.length; i++) {
      const mapping = this.featureMappings[i];
      const row = Math.floor(i / 4);
      const col = i % 4;
      const index = row * 4 + col;
      this.featureData[index * 4 + 0] = mapping.featureIndex;
      this.featureData[index * 4 + 1] = this.hashString(mapping.stemType);
      this.featureData[index * 4 + 2] = this.hashString(mapping.featureName);
      this.featureData[index * 4 + 3] = mapping.maxValue - mapping.minValue;
    }
    this.featureTexture.needsUpdate = true;
  }
  private packFeaturesIntoTexture(analysisData: AudioFeatureData): void {
    this.audioData.fill(0);
    for (const mapping of this.featureMappings) {
      const stemFeatures = analysisData.features[mapping.stemType];
      if (!stemFeatures) continue;
      const featureData = this.extractFeatureData(stemFeatures, mapping.featureName);
      if (!featureData) continue;
      const row = Math.floor(mapping.featureIndex / 4);
      const channel = mapping.featureIndex % 4;
      for (let timeIndex = 0; timeIndex < Math.min(this.textureWidth, featureData.length); timeIndex++) {
        const textureIndex = (timeIndex + row * this.textureWidth) * 4 + channel;
        const normalizedValue = this.normalizeValue(featureData[timeIndex], mapping.minValue, mapping.maxValue);
        this.audioData[textureIndex] = normalizedValue;
      }
    }
    this.audioTexture.needsUpdate = true;
  }
  private extractFeatureData(stemFeatures: number[], featureName: string): number[] | null {
    return stemFeatures;
  }
  public updateTime(currentTime: number, duration: number): void {
    this.timeData[0] = currentTime;
    this.timeData[1] = duration;
    this.timeData[2] = currentTime / duration;
    this.timeData[3] = 0;
    this.timeTexture.needsUpdate = true;
  }
  public getShaderUniforms(): Record<string, THREE.Uniform> {
    return {
      uAudioTexture: new THREE.Uniform(this.audioTexture),
      uFeatureTexture: new THREE.Uniform(this.featureTexture),
      uTimeTexture: new THREE.Uniform(this.timeTexture),
      uAudioTextureSize: new THREE.Uniform(new THREE.Vector2(this.textureWidth, this.textureHeight)),
      uFeatureTextureSize: new THREE.Uniform(new THREE.Vector2(4, this.textureHeight))
    };
  }
  public generateShaderCode(): string {
    return `
      uniform sampler2D uAudioTexture;
      uniform sampler2D uFeatureTexture;
      uniform sampler2D uTimeTexture;
      uniform vec2 uAudioTextureSize;
      uniform vec2 uFeatureTextureSize;
      float sampleAudioFeature(float featureIndex) {
        vec4 timeData = texture2D(uTimeTexture, vec2(0.5));
        float normalizedTime = timeData.z;
        float rowIndex = floor(featureIndex / 4.0);
        vec2 uv = vec2(normalizedTime, rowIndex / uAudioTextureSize.y);
        vec4 featureData = texture2D(uAudioTexture, uv);
        // Extract correct channel based on feature index
        float channelIndex = mod(featureIndex, 4.0);
        if (channelIndex < 0.5) return featureData.r;
        else if (channelIndex < 1.5) return featureData.g;
        else if (channelIndex < 2.5) return featureData.b;
        else return featureData.a;
      }
      float sampleAudioFeatureByName(float stemTypeHash, float featureNameHash) {
        // Find feature index by name (simplified - in practice you'd use a lookup table)
        for (float i = 0.0; i < uFeatureTextureSize.y; i++) {
          vec2 featureUv = vec2(0.5, (i + 0.5) / uFeatureTextureSize.y);
          vec4 featureInfo = texture2D(uFeatureTexture, featureUv);
          if (featureInfo.y == stemTypeHash && featureInfo.z == featureNameHash) {
            return sampleAudioFeature(featureInfo.x);
          }
        }
        return 0.0;
      }
    `;
  }
  public getFeatureValue(stemType: string, featureName: string): number {
    const key = `${stemType}-${featureName}`;
    const featureIndex = this.featureIndexMap.get(key);
    if (featureIndex === undefined) return 0;
    const row = Math.floor(featureIndex / 4);
    const channel = featureIndex % 4;
    const timeIndex = Math.floor(this.timeData[2] * this.textureWidth);
    const textureIndex = (timeIndex + row * this.textureWidth) * 4 + channel;
    return this.audioData[textureIndex] || 0;
  }
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) / 2147483647;
  }
  private normalizeValue(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }
  public dispose(): void {
    this.audioTexture.dispose();
    this.featureTexture.dispose();
    this.timeTexture.dispose();
  }
}
```

## File: apps/web/src/lib/visualizer/core/MediaLayerManager.ts
```typescript
import * as THREE from 'three';
export interface MediaLayerConfig {
  id: string;
  type: 'canvas' | 'video' | 'image';
  source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | string;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add' | 'subtract';
  opacity: number;
  zIndex: number;
  audioBindings?: {
    feature: string;
    property: 'opacity' | 'scale' | 'rotation' | 'position';
    inputRange: [number, number];
    outputRange: [number, number];
    blendMode: 'multiply' | 'add' | 'replace';
  }[];
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
}
export interface AudioFeatures {
  [key: string]: number;
}
export class MediaLayerManager {
  private mediaLayers: Map<string, MediaLayerConfig> = new Map();
  private layerMaterials: Map<string, THREE.ShaderMaterial> = new Map();
  private layerTextures: Map<string, THREE.Texture> = new Map();
  private layerMeshes: Map<string, THREE.Mesh> = new Map();
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera as THREE.OrthographicCamera;
    this.renderer = renderer;
  }
  public addMediaLayer(config: MediaLayerConfig): void {
    this.mediaLayers.set(config.id, config);
    const texture = this.createTextureFromSource(config.source, config.type);
    this.layerTextures.set(config.id, texture);
    const material = this.createMaterial(config, texture);
    this.layerMaterials.set(config.id, material);
    const mesh = this.createMesh(config, material);
    this.layerMeshes.set(config.id, mesh);
    this.scene.add(mesh);
  }
  public removeMediaLayer(id: string): void {
    const mesh = this.layerMeshes.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      this.layerMeshes.delete(id);
    }
    const material = this.layerMaterials.get(id);
    if (material) {
      material.dispose();
      this.layerMaterials.delete(id);
    }
    const texture = this.layerTextures.get(id);
    if (texture) {
      texture.dispose();
      this.layerTextures.delete(id);
    }
    this.mediaLayers.delete(id);
  }
  public updateWithAudioFeatures(audioFeatures: AudioFeatures): void {
    for (const [id, config] of this.mediaLayers) {
      if (!config.audioBindings) continue;
      const material = this.layerMaterials.get(id);
      if (!material) continue;
      for (const binding of config.audioBindings) {
        const featureValue = audioFeatures[binding.feature];
        if (featureValue === undefined) continue;
        const mappedValue = this.mapRange(
          featureValue,
          binding.inputRange[0], binding.inputRange[1],
          binding.outputRange[0], binding.outputRange[1]
        );
        switch (binding.property) {
          case 'opacity':
            material.uniforms.uOpacity.value = mappedValue;
            break;
          case 'scale':
            material.uniforms.uScale.value.set(mappedValue, mappedValue);
            break;
          case 'rotation':
            material.uniforms.uRotation.value = mappedValue;
            break;
          case 'position':
            material.uniforms.uPosition.value.set(
              config.position.x + mappedValue,
              config.position.y + mappedValue
            );
            break;
        }
      }
    }
  }
  public updateTextures(): void {
    for (const [id, texture] of this.layerTextures) {
      if (texture instanceof THREE.VideoTexture) {
        texture.needsUpdate = true;
      }
    }
  }
  private createTextureFromSource(
    source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | string,
    type: string
  ): THREE.Texture {
    switch (type) {
      case 'video':
        if (typeof source === 'string') {
          const video = document.createElement('video');
          video.src = source;
          video.loop = true;
          video.muted = true;
          video.play();
          return new THREE.VideoTexture(video);
        } else if (source instanceof HTMLVideoElement) {
          return new THREE.VideoTexture(source);
        }
        break;
      case 'image':
        if (typeof source === 'string') {
          return new THREE.TextureLoader().load(source);
        } else if (source instanceof HTMLImageElement) {
          return new THREE.Texture(source);
        }
        break;
      case 'canvas':
        if (source instanceof HTMLCanvasElement) {
          return new THREE.CanvasTexture(source);
        }
        break;
    }
    return new THREE.Texture();
  }
  private createMaterial(config: MediaLayerConfig, texture: THREE.Texture): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: `
        uniform vec2 uPosition;
        uniform vec2 uScale;
        uniform float uRotation;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 pos = position;
          // Apply scale
          pos.xy *= uScale;
          // Apply rotation
          float c = cos(uRotation);
          float s = sin(uRotation);
          mat2 rotationMatrix = mat2(c, -s, s, c);
          pos.xy = rotationMatrix * pos.xy;
          // Apply position
          pos.xy += uPosition;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          gl_FragColor = vec4(texel.rgb, texel.a * uOpacity);
        }
      `,
      uniforms: {
        tDiffuse: new THREE.Uniform(texture),
        uOpacity: new THREE.Uniform(config.opacity),
        uPosition: new THREE.Uniform(new THREE.Vector2(config.position.x, config.position.y)),
        uScale: new THREE.Uniform(new THREE.Vector2(config.scale.x, config.scale.y)),
        uRotation: new THREE.Uniform(config.rotation)
      },
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
  }
  private createMesh(config: MediaLayerConfig, material: THREE.ShaderMaterial): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(config.position.x, config.position.y, -config.zIndex);
    mesh.scale.set(config.scale.x, config.scale.y, 1);
    mesh.rotation.z = config.rotation;
    return mesh;
  }
  private mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }
  public getMediaLayer(id: string): MediaLayerConfig | undefined {
    return this.mediaLayers.get(id);
  }
  public getMediaLayerIds(): string[] {
    return [...this.mediaLayers.keys()];
  }
  public updateLayerConfig(id: string, updates: Partial<MediaLayerConfig>): void {
    const config = this.mediaLayers.get(id);
    if (!config) return;
    Object.assign(config, updates);
    const material = this.layerMaterials.get(id);
    if (material) {
      if (updates.opacity !== undefined) {
        material.uniforms.uOpacity.value = updates.opacity;
      }
      if (updates.position !== undefined) {
        material.uniforms.uPosition.value.set(updates.position.x, updates.position.y);
      }
      if (updates.scale !== undefined) {
        material.uniforms.uScale.value.set(updates.scale.x, updates.scale.y);
      }
      if (updates.rotation !== undefined) {
        material.uniforms.uRotation.value = updates.rotation;
      }
    }
    const mesh = this.layerMeshes.get(id);
    if (mesh) {
      if (updates.position !== undefined) {
        mesh.position.set(updates.position.x, updates.position.y, -config.zIndex);
      }
      if (updates.scale !== undefined) {
        mesh.scale.set(updates.scale.x, updates.scale.y, 1);
      }
      if (updates.rotation !== undefined) {
        mesh.rotation.z = updates.rotation;
      }
      if (updates.zIndex !== undefined) {
        mesh.position.z = -updates.zIndex;
      }
    }
  }
  public dispose(): void {
    for (const [id] of this.mediaLayers) {
      this.removeMediaLayer(id);
    }
    this.mediaLayers.clear();
    this.layerMaterials.clear();
    this.layerTextures.clear();
    this.layerMeshes.clear();
  }
}
```

## File: apps/web/src/stores/projectSettingsStore.ts
```typescript
'use client';
import { create } from 'zustand';
interface ProjectSettingsState {
  backgroundColor: string;
  isBackgroundVisible: boolean;
}
interface ProjectSettingsActions {
  setBackgroundColor: (color: string) => void;
  toggleBackgroundVisibility: () => void;
  setIsBackgroundVisible: (visible: boolean) => void;
}
export const useProjectSettingsStore = create<ProjectSettingsState & ProjectSettingsActions>((set) => ({
  backgroundColor: '#000000',
  isBackgroundVisible: true,
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  toggleBackgroundVisibility: () => set((state) => ({ isBackgroundVisible: !state.isBackgroundVisible })),
  setIsBackgroundVisible: (visible) => set({ isBackgroundVisible: visible }),
}));
```

## File: apps/web/src/stores/timelineStore.ts
```typescript
'use client';
import { create } from 'zustand';
import type { Layer } from '@/types/video-composition';
interface TimelineState {
  layers: Layer[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  selectedLayerId: string | null;
  zoom: number;
}
interface TimelineActions {
  setLayers: (layers: Layer[]) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  deleteLayer: (layerId: string) => void;
  selectLayer: (layerId: string | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setZoom: (zoom: number) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  swapLayers: (layerIdA: string, layerIdB: string) => void;
}
export const useTimelineStore = create<TimelineState & TimelineActions>((set) => ({
  layers: [
    {
      id: `layer-default-${Date.now()}`,
      name: 'Layer 1',
      type: 'image',
      src: '',
      zIndex: 0,
      isDeletable: true,
      startTime: 0,
      endTime: 120, // This will be updated when a project with a duration is loaded
      duration: 120,
      position: { x: 50, y: 50 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      opacity: 1,
      audioBindings: [],
      midiBindings: [],
      blendMode: 'normal',
    } as Layer,
  ],
  currentTime: 0,
  duration: 120,
  isPlaying: false,
  selectedLayerId: null,
  zoom: 1,
  setLayers: (layers) => set({ layers }),
  addLayer: (layer) => set((state) => {
    const maxZIndex = state.layers.reduce(
      (max, l) => (l.zIndex > max ? l.zIndex : max),
      -1
    );
    const newLayer = { ...layer, zIndex: maxZIndex + 1 } as Layer;
    return { layers: [...state.layers, newLayer] };
  }),
  updateLayer: (layerId, updates) => set((state) => ({
    layers: state.layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l)),
  })),
  deleteLayer: (layerId) => set((state) => ({
    layers: state.layers.filter((l) => l.id !== layerId),
    selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
  })),
  selectLayer: (layerId) => set({ selectedLayerId: layerId }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setZoom: (zoom) => set({ zoom: Math.max(0.01, Math.min(3, zoom)) }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  swapLayers: (layerIdA, layerIdB) => set((state) => {
    const layerA = state.layers.find(l => l.id === layerIdA);
    const layerB = state.layers.find(l => l.id === layerIdB);
    if (!layerA || !layerB) {
      return state;
    }
    const originalZIndexA = layerA.zIndex;
    const newLayers = state.layers.map(layer => {
      if (layer.id === layerIdA) {
        return { ...layer, zIndex: layerB.zIndex };
      }
      if (layer.id === layerIdB) {
        return { ...layer, zIndex: originalZIndexA };
      }
      return layer;
    });
    return { layers: newLayers };
  }),
}));
```

## File: apps/web/src/stores/visualizerStore.ts
```typescript
'use client';
import { create } from 'zustand';
import { getNestedParam, setNestedParam } from '@/lib/visualizer/paramKeys';
export interface FeatureMapping {
  featureId: string | null;
  modulationAmount: number;
}
export interface AudioAnalysisSettings {
  transientDecay: number;
  transientSensitivity: number;
}
interface VisualizerState {
  aspectRatio: string;
  selectedEffects: Record<string, boolean>;
  audioAnalysisSettings: AudioAnalysisSettings;
  featureDecayTimes: Record<string, number>;
  featureSensitivities: Record<string, number>;
  mappings: Record<string, FeatureMapping>;
  baseParameterValues: Record<string, Record<string, any>>;
  activeSliderValues: Record<string, Record<string, any>>;
}
interface VisualizerActions {
  setAspectRatio: (ratio: string) => void;
  setSelectedEffects: (effects: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setAudioAnalysisSettings: (settings: Partial<AudioAnalysisSettings>) => void;
  setFeatureDecayTime: (featureId: string, decayTime: number) => void;
  setFeatureSensitivity: (featureId: string, sensitivity: number) => void;
  setMappings: (mappings: Record<string, FeatureMapping> | ((prev: Record<string, FeatureMapping>) => Record<string, FeatureMapping>)) => void;
  setBaseParameterValues: (values: Record<string, Record<string, any>> | ((prev: Record<string, Record<string, any>>) => Record<string, Record<string, any>>)) => void;
  setActiveSliderValues: (values: Record<string, Record<string, any>> | ((prev: Record<string, Record<string, any>>) => Record<string, Record<string, any>>)) => void;
  setBaseParam: (effectInstanceId: string, paramName: string, value: any) => void;
  setActiveParam: (effectInstanceId: string, paramName: string, value: any) => void;
  updateMapping: (id: string, mapping: FeatureMapping) => void;
  removeMapping: (id: string) => void;
  reset: () => void;
}
const DEFAULT_STATE: VisualizerState = {
  aspectRatio: 'mobile',
  selectedEffects: {},
  audioAnalysisSettings: {
    transientDecay: 0.5,
    transientSensitivity: 0.5,
  },
  featureDecayTimes: {},
  featureSensitivities: {},
  mappings: {},
  baseParameterValues: {},
  activeSliderValues: {},
};
export const useVisualizerStore = create<VisualizerState & VisualizerActions>((set) => ({
  ...DEFAULT_STATE,
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  setSelectedEffects: (updater) => set((state) => ({
    selectedEffects: typeof updater === 'function' ? updater(state.selectedEffects) : updater
  })),
  setAudioAnalysisSettings: (settings) => set((state) => ({
    audioAnalysisSettings: { ...state.audioAnalysisSettings, ...settings }
  })),
  setFeatureDecayTime: (featureId, decayTime) => set((state) => ({
    featureDecayTimes: { ...state.featureDecayTimes, [featureId]: decayTime }
  })),
  setFeatureSensitivity: (featureId, sensitivity) => set((state) => ({
    featureSensitivities: { ...state.featureSensitivities, [featureId]: sensitivity }
  })),
  setMappings: (updater) => set((state) => ({
    mappings: typeof updater === 'function' ? updater(state.mappings) : updater
  })),
  setBaseParameterValues: (updater) => set((state) => ({
    baseParameterValues: typeof updater === 'function' ? updater(state.baseParameterValues) : updater
  })),
  setActiveSliderValues: (updater) => set((state) => ({
    activeSliderValues: typeof updater === 'function' ? updater(state.activeSliderValues) : updater
  })),
  setBaseParam: (effectInstanceId, paramName, value) => set((state) => ({
    baseParameterValues: setNestedParam(state.baseParameterValues, effectInstanceId, paramName, value)
  })),
  setActiveParam: (effectInstanceId, paramName, value) => set((state) => ({
    activeSliderValues: setNestedParam(state.activeSliderValues, effectInstanceId, paramName, value)
  })),
  updateMapping: (id, mapping) => set((state) => ({
    mappings: { ...state.mappings, [id]: mapping }
  })),
  removeMapping: (id) => set((state) => {
    const newMappings = { ...state.mappings };
    delete newMappings[id];
    return { mappings: newMappings };
  }),
  reset: () => set(DEFAULT_STATE),
}));
```

## File: apps/web/src/remotion/index.ts
```typescript
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';
registerRoot(RemotionRoot);
```

## File: apps/web/src/types/audio-analysis-data.ts
```typescript
export interface TransientData {
  time: number;
  intensity: number;
  type?: string;
  frequency?: number;
}
export interface FeatureNormalizationMeta {
  [featureName: string]: {
    originalMin: number;
    originalMax: number;
    wasNormalized: boolean;
  };
}
export interface ChromaData {
  time: number;
  pitch: number;
  confidence: number;
  chroma: number[];
}
export interface WaveformData {
  points: number[];
  sampleRate: number;
  duration: number;
  markers: Array<{ time: number; type: 'beat' | 'onset' | 'peak' | 'drop'; intensity: number; frequency?: number }>;
}
export interface AudioAnalysisData {
  id: string;
  fileMetadataId: string;
  stemType: string;
  analysisData: {
    frameTimes?: Float32Array | number[];
    rms: Float32Array | number[];
    loudness: Float32Array | number[];
    spectralCentroid: Float32Array | number[];
    spectralRolloff?: Float32Array | number[];
    spectralFlatness?: Float32Array | number[];
    zcr?: Float32Array | number[];
    fft: Float32Array | number[];
    fftFrequencies?: Float32Array | number[];
    amplitudeSpectrum?: Float32Array | number[];
    volume?: Float32Array | number[];
    bass?: Float32Array | number[];
    mid?: Float32Array | number[];
    treble?: Float32Array | number[];
    features?: Float32Array | number[];
    markers?: Float32Array | number[];
    frequencies?: Float32Array | number[];
    timeData?: Float32Array | number[];
    stereoWindow_left?: Float32Array | number[];
    stereoWindow_right?: Float32Array | number[];
    transients?: TransientData[];
    chroma?: ChromaData[];
    bpm?: number;
    normalizationMeta?: FeatureNormalizationMeta;
  };
  waveformData: WaveformData;
  metadata: {
    sampleRate: number;
    duration: number;
    bufferSize: number;
    featuresExtracted: string[];
    analysisDuration: number;
    bpm?: number;
  };
  bpm?: number;
}
```

## File: apps/web/src/hooks/use-audio-analysis.ts
```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import { analyze as detectBpm } from 'web-audio-beat-detector';
import { trpc } from '@/lib/trpc';
import { debugLog } from '@/lib/utils';
import type { WorkerResponse } from '@/types/worker-messages';
import type { AudioAnalysisData } from '@/types/audio-analysis-data';
export const featureDecayTimesRef = { current: {} as Record<string, number> };
const MOMENTUM_LOOKBACK_MULTIPLIER = 3;
const SOFT_BOUND_STRENGTH = 0.3;
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
export interface UseAudioAnalysis {
  cachedAnalysis: AudioAnalysisData[];
  isLoading: boolean;
  analysisProgress: Record<string, { progress: number; message: string }>;
  error: string | null;
  loadAnalysis: (fileIds: string[], stemType?: string) => Promise<void>;
  analyze: (fileId: string, audioBuffer: AudioBuffer, stemType: string) => void;
  analyzeAudioBuffer: (fileId: string, audioBuffer: AudioBuffer, stemType: string) => void;
  getAnalysis: (fileId: string, stemType?: string) => AudioAnalysisData | null;
  getFeatureValue: (fileId: string, feature: string, time: number, stemType?: string) => number;
}
export function useAudioAnalysis(): UseAudioAnalysis {
  const [cachedAnalysis, setCachedAnalysis] = useState<AudioAnalysisData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<Record<string, { progress: number; message: string }>>({});
  const workerRef = useRef<Worker | null>(null);
  const [queryState, setQueryState] = useState<{ fileIds: string[]; stemType?: string }>({ fileIds: [] });
  const lastTransientRefs = useRef<Record<string, { time: number; intensity: number }>>({});
  const {
    data: cachedData,
    isLoading: isQueryLoading,
    error: queryError,
  } = trpc.stem.getCachedAnalysis.useQuery(
    { fileIds: queryState.fileIds, stemType: queryState.stemType },
    { enabled: queryState.fileIds.length > 0 }
  );
  const cacheMutation = trpc.stem.cacheClientSideAnalysis.useMutation({
    onSuccess: (data) => {
      if (data.cached) {
        debugLog.log('✅ Analysis cached on server:', data);
      }
    },
    onError: (error) => {
      debugLog.error('❌ Failed to cache analysis:', error);
    }
  });
  useEffect(() => {
    setIsLoading(isQueryLoading);
    if (queryError) {
      setError(queryError.message);
    } else if (cachedData) {
      const newAnalyses = (Array.isArray(cachedData) ? cachedData : [cachedData])
        .filter(Boolean) as unknown as AudioAnalysisData[];
      setCachedAnalysis(prev => {
        const existingKeys = new Set(prev.map(a => `${a.fileMetadataId}-${a.stemType}`));
        const trulyNew = newAnalyses.filter(a =>
          a && a.fileMetadataId && !existingKeys.has(`${a.fileMetadataId}-${a.stemType}`)
        );
        if (trulyNew.length > 0) {
          debugLog.log('📥 Loaded from cache:', trulyNew.map(a => `${a.fileMetadataId} (${a.stemType})`));
          return [...prev, ...trulyNew];
        }
        return prev;
      });
      setError(null);
    }
  }, [cachedData, isQueryLoading, queryError]);
  const loadAnalysis = useCallback(async (fileIds: string[], stemType?: string) => {
    if (!fileIds || fileIds.length === 0) return;
    const idsToFetch = fileIds.filter(id =>
      !cachedAnalysis.some(a => a.fileMetadataId === id && (!stemType || a.stemType === stemType))
    );
    if (idsToFetch.length > 0) {
      debugLog.log('🔍 Loading from cache:', idsToFetch, stemType);
      setQueryState({ fileIds: idsToFetch, stemType });
    } else {
      debugLog.log('✅ All analyses already loaded');
    }
  }, [cachedAnalysis]);
  const analyze = useCallback(async (fileId: string, audioBuffer: AudioBuffer, stemType: string) => {
    if (analysisProgress[fileId]) {
      debugLog.log('⏭️ Analysis already in progress:', fileId);
      return;
    }
    const existing = cachedAnalysis.find(a => a.fileMetadataId === fileId && a.stemType === stemType);
    if (existing) {
      debugLog.log('⏭️ Analysis already exists:', fileId, stemType);
      return;
    }
    debugLog.log('🎵 Starting analysis:', fileId, stemType);
    setAnalysisProgress(prev => ({
      ...prev,
      [fileId]: { progress: 0, message: 'Detecting BPM and analyzing...' }
    }));
    let bpm: number | null = null;
    try {
      const detected = await detectBpm(audioBuffer as unknown as AudioBuffer);
      if (Number.isFinite(detected)) bpm = detected as number;
    } catch (err) {
      debugLog.warn ? debugLog.warn('BPM detection unavailable for this audio') : debugLog.log('BPM detection unavailable for this audio');
      bpm = null;
    }
    const worker = new Worker(new URL('../app/workers/audio-analysis.worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, data } = (event.data as WorkerResponse) || ({} as any);
      if (type === 'ANALYSIS_COMPLETE') {
        const result = (data as any).result as AudioAnalysisData;
        const merged: AudioAnalysisData = {
          ...result,
          analysisData: bpm !== null ? { ...result.analysisData, bpm } : { ...result.analysisData },
          metadata: bpm !== null ? { ...result.metadata, bpm } : { ...result.metadata },
          ...(bpm !== null ? { bpm } : {}),
        };
        setCachedAnalysis(prev => [
          ...prev.filter(a => !(a.fileMetadataId === fileId && a.stemType === merged.stemType)),
          merged,
        ]);
        setAnalysisProgress(prev => {
          const { [fileId]: _removed, ...rest } = prev;
          return rest;
        });
        cacheMutation.mutate(merged as any);
        worker.terminate();
      } else if (type === 'ANALYSIS_PROGRESS') {
        setAnalysisProgress(prev => ({
          ...prev,
          [fileId]: { progress: data.progress, message: data.message }
        }));
      } else if (type === 'ANALYSIS_ERROR') {
        debugLog.error(`❌ Analysis error for ${fileId}:`, data.error);
        setAnalysisProgress(prev => ({
          ...prev,
          [fileId]: { progress: 1, message: `Error: ${data.error}` }
        }));
        setError(`Analysis failed for ${fileId}: ${data.error}`);
        worker.terminate();
      }
    };
    const channelDataCopy = new Float32Array(audioBuffer.getChannelData(0));
    worker.postMessage({
      type: 'ANALYZE_BUFFER',
      data: {
        fileId,
        channelData: channelDataCopy,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
        stemType,
        enhancedAnalysis: true,
      }
    });
  }, [analysisProgress, cachedAnalysis, cacheMutation, debugLog]);
  const getAnalysis = useCallback((fileId: string, stemType?: string): AudioAnalysisData | null => {
    const targetStemType = stemType ?? 'master';
    return cachedAnalysis.find(a =>
      a.fileMetadataId === fileId && a.stemType === targetStemType
    ) ?? null;
  }, [cachedAnalysis]);
  const getFeatureValue = useCallback((
    fileId: string,
    feature: string,
    time: number,
    stemType?: string
  ): number => {
    const featureParts = feature.includes('-') ? feature.split('-') : [feature];
    const parsedStem = featureParts.length > 1 ? featureParts[0] : (stemType ?? 'master');
    const analysis = getAnalysis(fileId, parsedStem);
    if (!analysis?.analysisData || time < 0 || time > analysis.metadata.duration) {
      return 0;
    }
    const { analysisData } = analysis;
    const featureName = featureParts.length > 1 ? featureParts.slice(1).join('-') : feature;
    if (featureName === 'peaks') {
      const decayTime = featureDecayTimesRef.current[feature] ?? 0.5;
      const baseValue = 0.5;
      const relevantTransients = analysisData.transients || [];
      const envelopeKey = `${fileId}-${feature}`;
      const storedTransient = lastTransientRefs.current[envelopeKey];
      if (storedTransient && (time < storedTransient.time - 0.5)) {
        delete lastTransientRefs.current[envelopeKey];
      }
      const latestTransient = relevantTransients.reduce((latest: any, t: any) => {
        if (t.time <= time && (!latest || t.time > latest.time)) {
          return t;
        }
        return latest;
      }, null);
      if (latestTransient) {
        if (!storedTransient || latestTransient.time > storedTransient.time) {
          lastTransientRefs.current[envelopeKey] = { time: latestTransient.time, intensity: latestTransient.intensity };
        }
      }
      const lookbackWindow = decayTime * MOMENTUM_LOOKBACK_MULTIPLIER;
      let totalMomentum = 0;
      for (const transient of relevantTransients) {
        const elapsed = time - transient.time;
        if (elapsed < 0 || elapsed > lookbackWindow) continue;
        const direction = seededRandom(transient.time * 1000) > 0.5 ? 1 : -1;
        const decayFactor = Math.exp(-elapsed / decayTime);
        totalMomentum += transient.intensity * direction * decayFactor;
      }
      const projectedValue = baseValue + totalMomentum;
      if (projectedValue > 1) {
        const overshoot = projectedValue - 1;
        totalMomentum -= overshoot * SOFT_BOUND_STRENGTH;
      } else if (projectedValue < 0) {
        const undershoot = -projectedValue;
        totalMomentum += undershoot * SOFT_BOUND_STRENGTH;
      }
      return Math.max(0, Math.min(1, baseValue + totalMomentum));
    }
    if (featureName === 'pitch') {
      const chroma = analysisData.chroma?.find(c => Math.abs(c.time - time) < 0.05);
      return chroma?.pitch ? chroma.pitch / 11 : 0;
    }
    if (featureName === 'brightness' || featureName === 'confidence') {
      const chroma = analysisData.chroma?.find(c => Math.abs(c.time - time) < 0.05);
      return chroma?.confidence ?? 0;
    }
    const getTimeSeriesValue = (arr: Float32Array | number[] | undefined): number => {
      if (!arr || arr.length === 0) return 0;
      const times = (analysisData as any).frameTimes as Float32Array | number[] | undefined;
      if (!times || times.length === 0) return 0;
      let lo = 0;
      let hi = Math.min(times.length - 1, arr.length - 1);
      while (lo < hi) {
        const mid = (lo + hi + 1) >>> 1;
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
  }, [getAnalysis]);
  return {
    cachedAnalysis,
    isLoading,
    analysisProgress,
    error,
    loadAnalysis,
    analyze,
    analyzeAudioBuffer: analyze,
    getAnalysis,
    getFeatureValue,
  };
}
```

## File: apps/web/src/types/audio-analysis.ts
```typescript
export interface AnalysisParams {
  transientThreshold: number;
  onsetThreshold: number;
  chromaSmoothing: number;
  rmsWindowSize: number;
  pitchConfidence: number;
  minNoteDuration: number;
}
export interface TransientData {
  time: number;
  intensity: number;
  type?: string;
}
export interface ChromaData {
  time: number;
  pitch: number;
  confidence: number;
  note: string;
}
export interface RMSData {
  time: number;
  value: number;
}
export type AnalysisMethod = 'original' | 'enhanced' | 'both';
export interface FullAudioAnalysis {
  bpm: number;
  transients: TransientData[];
}
```

## File: apps/web/src/lib/visualizer/core/MultiLayerCompositor.ts
```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { TexturePass } from 'three/examples/jsm/postprocessing/TexturePass.js';
export interface LayerRenderTarget {
  id: string;
  renderTarget: THREE.WebGLRenderTarget;
  scene: THREE.Scene;
  camera: THREE.Camera;
  enabled: boolean;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add' | 'subtract';
  opacity: number;
  zIndex: number;
  material?: THREE.ShaderMaterial;
}
export interface CompositorConfig {
  width: number;
  height: number;
  enableAntialiasing?: boolean;
  pixelRatio?: number;
}
export class MultiLayerCompositor {
  private renderer: THREE.WebGLRenderer;
  private config: CompositorConfig;
  private layers: Map<string, LayerRenderTarget> = new Map();
  private layerOrder: string[] = [];
  private mainRenderTarget: THREE.WebGLRenderTarget;
  private tempRenderTarget: THREE.WebGLRenderTarget;
  private accumulationTargets: Map<string, THREE.WebGLRenderTarget> = new Map();
  private quadGeometry: THREE.PlaneGeometry;
  private quadCamera: THREE.OrthographicCamera;
  private blendShaders: Map<string, string> = new Map();
  private postProcessingComposer!: EffectComposer;
  private texturePass!: TexturePass;
  private fxaaPass?: ShaderPass;
  constructor(renderer: THREE.WebGLRenderer, config: CompositorConfig) {
    this.renderer = renderer;
    this.config = {
      enableAntialiasing: true,
      pixelRatio: window.devicePixelRatio || 1,
      ...config
    };
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);
    this.mainRenderTarget = this.createRenderTarget();
    this.tempRenderTarget = this.createRenderTarget();
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.initializeBlendShaders();
    this.initializePostProcessing();
  }
  public createLayer(
    id: string,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: Partial<Omit<LayerRenderTarget, 'id' | 'scene' | 'camera'>> = {}
  ): LayerRenderTarget {
    const renderTarget = this.createRenderTarget();
    const layer: LayerRenderTarget = {
      id,
      renderTarget,
      scene,
      camera,
      enabled: true,
      blendMode: 'normal',
      opacity: 1.0,
      zIndex: 0,
      ...options
    };
    this.layers.set(id, layer);
    this.layerOrder.push(id);
    this.sortLayers();
    return layer;
  }
  private createRenderTarget(): THREE.WebGLRenderTarget {
    const RTClass: any = THREE.WebGLRenderTarget;
    return new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
        samples: 4
      }
    );
  }
  public removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.renderTarget.dispose();
      this.layers.delete(id);
      this.layerOrder = this.layerOrder.filter(layerId => layerId !== id);
    }
    const accTarget = this.accumulationTargets.get(id);
    if (accTarget) {
      accTarget.dispose();
      this.accumulationTargets.delete(id);
    }
  }
  public updateLayer(id: string, updates: Partial<LayerRenderTarget>): void {
    const layer = this.layers.get(id);
    if (layer) {
      Object.assign(layer, updates);
      if (updates.zIndex !== undefined) {
        this.sortLayers();
      }
    }
  }
  private sortLayers(): void {
    this.layerOrder.sort((a, b) => {
      const layerA = this.layers.get(a);
      const layerB = this.layers.get(b);
      return (layerA?.zIndex || 0) - (layerB?.zIndex || 0);
    });
  }
  public render(): void {
    let renderedLayers = 0;
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;
      const objectCount = layer.scene.children.length;
      if (renderedLayers < 10) {
        console.log(`🎨 [MultiLayerCompositor] Rendering layer ${layerId}:`, {
          enabled: layer.enabled,
          objectCount,
          children: layer.scene.children.map(c => c.type),
          zIndex: layer.zIndex
        });
      }
      this.renderer.setRenderTarget(layer.renderTarget);
      this.renderer.clear(true, true, true);
      this.renderer.render(layer.scene, layer.camera);
      renderedLayers++;
    }
    if (renderedLayers === 0) {
      console.warn('⚠️ [MultiLayerCompositor] No layers rendered!');
    }
    this.compositeLayersToMain();
    this.texturePass.map = this.mainRenderTarget.texture;
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.renderer.setRenderTarget(null);
    this.renderer.clear(true, true, true);
    this.postProcessingComposer.render();
    this.renderer.autoClear = autoClear;
  }
  private compositeLayersToMain(): void {
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.renderer.setRenderTarget(this.mainRenderTarget);
    this.renderer.clear(true, true, true);
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;
      this.renderLayerWithBlending(layer);
    }
    this.renderer.autoClear = autoClear;
  }
  private renderLayerWithBlending(layer: LayerRenderTarget): void {
    const blendShader = this.getBlendModeShader(layer.blendMode);
    let blendMode: THREE.Blending = THREE.NormalBlending;
    if (layer.blendMode === 'add') {
      blendMode = THREE.AdditiveBlending as THREE.Blending;
    } else if (layer.blendMode === 'multiply') {
      blendMode = THREE.MultiplyBlending as THREE.Blending;
    } else if (layer.blendMode === 'screen') {
      blendMode = THREE.CustomBlending as THREE.Blending;
    }
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: blendShader,
      uniforms: {
        tDiffuse: new THREE.Uniform(layer.renderTarget.texture),
        opacity: new THREE.Uniform(layer.opacity)
      },
      transparent: true,
      blending: blendMode,
      depthTest: false,
      depthWrite: false,
      premultipliedAlpha: true
    });
    const mesh = new THREE.Mesh(this.quadGeometry, material);
    const scene = new THREE.Scene();
    scene.background = null;
    scene.add(mesh);
    this.renderer.render(scene, this.quadCamera);
    material.dispose();
    mesh.geometry.dispose();
  }
  private initializePostProcessing(): void {
    const renderTarget = new THREE.WebGLRenderTarget(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
        stencilBuffer: false,
        depthBuffer: false
      }
    );
    this.postProcessingComposer = new EffectComposer(this.renderer, renderTarget);
    this.postProcessingComposer.renderToScreen = true;
    this.texturePass = new TexturePass(this.mainRenderTarget.texture);
    if (this.texturePass.material) {
      this.texturePass.material.transparent = true;
      this.texturePass.material.blending = THREE.NormalBlending;
      this.texturePass.material.depthTest = false;
      this.texturePass.material.depthWrite = false;
    }
    this.postProcessingComposer.addPass(this.texturePass);
    const AlphaPreservingFXAAShader = {
      uniforms: THREE.UniformsUtils.clone(FXAAShader.uniforms),
      vertexShader: FXAAShader.vertexShader,
      fragmentShader: FXAAShader.fragmentShader.replace(
        'gl_FragColor = vec4( rgb, luma );',
        'gl_FragColor = vec4( rgb, texture2D( tDiffuse, vUv ).a );'
      )
    };
    this.fxaaPass = new ShaderPass(AlphaPreservingFXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    this.fxaaPass.uniforms['resolution'].value.set(1 / (this.config.width * pixelRatio), 1 / (this.config.height * pixelRatio));
    if (this.fxaaPass.material) {
      this.fxaaPass.material.transparent = true;
      this.fxaaPass.material.blending = THREE.NormalBlending;
      this.fxaaPass.material.depthTest = false;
      this.fxaaPass.material.depthWrite = false;
    }
    this.postProcessingComposer.addPass(this.fxaaPass);
  }
  private initializeBlendShaders(): void {
    this.blendShaders.set('normal', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texel.rgb, texel.a * opacity);
      }
    `);
    this.blendShaders.set('multiply', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texel.rgb * texel.rgb, texel.a * opacity);
      }
    `);
    this.blendShaders.set('screen', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(1.0 - (1.0 - texel.rgb) * (1.0 - texel.rgb), texel.a * opacity);
      }
    `);
    this.blendShaders.set('overlay', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 base = vec3(0.5);
        vec3 overlay = mix(
          2.0 * base * texel.rgb,
          1.0 - 2.0 * (1.0 - base) * (1.0 - texel.rgb),
          step(0.5, base)
        );
        gl_FragColor = vec4(overlay, texel.a * opacity);
      }
    `);
    this.blendShaders.set('add', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texel.rgb + texel.rgb, texel.a * opacity);
      }
    `);
    this.blendShaders.set('subtract', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(max(texel.rgb - texel.rgb, 0.0), texel.a * opacity);
      }
    `);
  }
  private getBlendModeShader(blendMode: string): string {
    return this.blendShaders.get(blendMode) || this.blendShaders.get('normal')!;
  }
  public getLayer(id: string): LayerRenderTarget | undefined {
    return this.layers.get(id);
  }
  public getLayerIds(): string[] {
    return [...this.layerOrder];
  }
  public getAccumulatedTextureBeforeLayer(layerId: string): THREE.Texture | null {
    const targetIndex = this.layerOrder.indexOf(layerId);
    if (targetIndex === -1 || targetIndex === 0) {
      return null;
    }
    let accumulationTarget = this.accumulationTargets.get(layerId);
    if (!accumulationTarget) {
      accumulationTarget = this.createRenderTarget();
      this.accumulationTargets.set(layerId, accumulationTarget);
    }
    const previousRenderTarget = this.renderer.getRenderTarget();
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.renderer.setRenderTarget(accumulationTarget);
    this.renderer.clear(true, true, true);
    for (let i = 0; i < targetIndex; i++) {
      const prevLayerId = this.layerOrder[i];
      const layer = this.layers.get(prevLayerId);
      if (!layer || !layer.enabled) continue;
      this.renderLayerWithBlending(layer);
    }
    this.renderer.setRenderTarget(previousRenderTarget);
    this.renderer.autoClear = autoClear;
    return accumulationTarget.texture;
  }
  public resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    this.mainRenderTarget.setSize(width, height);
    this.tempRenderTarget.setSize(width, height);
    for (const target of this.accumulationTargets.values()) {
      target.setSize(width, height);
    }
    for (const layer of this.layers.values()) {
      layer.renderTarget.setSize(width, height);
    }
    if (this.postProcessingComposer) {
      this.postProcessingComposer.setSize(width, height);
    }
    if (this.fxaaPass) {
      const pixelRatio = this.renderer.getPixelRatio();
      (this.fxaaPass.uniforms as any).resolution.value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
    }
  }
  public dispose(): void {
    this.mainRenderTarget.dispose();
    this.tempRenderTarget.dispose();
    for (const layer of this.layers.values()) {
      layer.renderTarget.dispose();
    }
    for (const target of this.accumulationTargets.values()) {
      target.dispose();
    }
    this.accumulationTargets.clear();
    this.quadGeometry.dispose();
    this.layers.clear();
    this.layerOrder = [];
  }
}
```

## File: apps/web/src/remotion/Debug.tsx
```typescript
import React from 'react';
import { Composition } from 'remotion';
import { RayboxComposition } from './RayboxComposition';
import type { RayboxCompositionProps } from './Root';
export let TEST_PAYLOAD: any = null;
try {
  TEST_PAYLOAD = require('./debug-payload.json');
} catch {
  TEST_PAYLOAD = null;
}
if (TEST_PAYLOAD) {
  console.log('🔍 [Debug.tsx] TEST_PAYLOAD loaded:', {
    hasLayers: !!TEST_PAYLOAD.layers,
    layersCount: TEST_PAYLOAD.layers?.length || 0,
    hasAudioAnalysis: !!TEST_PAYLOAD.audioAnalysisData,
    audioAnalysisCount: TEST_PAYLOAD.audioAnalysisData?.length || 0,
    hasMasterAudioUrl: !!TEST_PAYLOAD.masterAudioUrl,
    keys: Object.keys(TEST_PAYLOAD),
    payloadSize: JSON.stringify(TEST_PAYLOAD).length,
  });
} else {
  console.warn(
    '🔍 [Debug.tsx] TEST_PAYLOAD not available. debug-payload.json is optional and intended for local debugging only.',
  );
}
const DebugComposition: React.FC<RayboxCompositionProps> = (remotionProps) => {
  console.log('🔍 [DebugComposition] Component rendering');
  console.log('🔍 [DebugComposition] Remotion props received:', {
    layersCount: remotionProps?.layers?.length || 0,
    audioAnalysisCount: remotionProps?.audioAnalysisData?.length || 0
  });
  console.log('🔍 [DebugComposition] TEST_PAYLOAD available:', {
    hasPayload: !!TEST_PAYLOAD,
    layersCount: TEST_PAYLOAD?.layers?.length || 0,
    audioAnalysisCount: TEST_PAYLOAD?.audioAnalysisData?.length || 0,
    hasMasterAudioUrl: !!TEST_PAYLOAD?.masterAudioUrl,
  });
  if (!TEST_PAYLOAD) {
    console.warn(
      '🔍 [DebugComposition] TEST_PAYLOAD is not set – debug-payload.json is missing. Rendering fallback empty composition.',
    );
    return <RayboxComposition layers={[]} audioAnalysisData={[]} visualizationSettings={{} as any} masterAudioUrl="" />;
  }
  const props = TEST_PAYLOAD as RayboxCompositionProps;
  console.log('🔍 [DebugComposition] Spreading TEST_PAYLOAD as props:', {
    layersCount: props.layers?.length || 0,
    audioAnalysisCount: props.audioAnalysisData?.length || 0,
    hasMappings: !!props.mappings,
    mappingsCount: props.mappings ? Object.keys(props.mappings).length : 0,
    hasBaseParameterValues: !!props.baseParameterValues,
    baseParamLayerCount: props.baseParameterValues ? Object.keys(props.baseParameterValues).length : 0,
  });
  return <RayboxComposition {...props} />;
};
export const DebugRoot = () => {
  console.log('🔍 [DebugRoot] Rendering composition');
  console.log('🔍 [DebugRoot] TEST_PAYLOAD at render time:', {
    hasPayload: !!TEST_PAYLOAD,
    layersCount: TEST_PAYLOAD?.layers?.length || 0,
    audioAnalysisCount: TEST_PAYLOAD?.audioAnalysisData?.length || 0,
    payloadSize: TEST_PAYLOAD ? JSON.stringify(TEST_PAYLOAD).length : 0,
    firstLayerId: TEST_PAYLOAD?.layers?.[0]?.id,
  });
  // Try using defaultProps again, but with more logging
  const propsToPass = (TEST_PAYLOAD || {
    layers: [],
    audioAnalysisData: [],
    visualizationSettings: {} as any,
    masterAudioUrl: '',
  }) as unknown as RayboxCompositionProps;
  console.log('🔍 [DebugRoot] Props to pass:', {
    layersCount: propsToPass.layers?.length || 0,
    audioAnalysisCount: propsToPass.audioAnalysisData?.length || 0
  });
  return (
    <Composition
      id="Debug"
      component={DebugComposition}
      width={1080}
      height={1920}
      fps={60}
      durationInFrames={600}
      defaultProps={propsToPass}
    />
  );
};
```

## File: apps/web/src/lib/visualizer/core/VisualizerManager.ts
```typescript
import * as THREE from 'three';
import { getRemotionEnvironment } from 'remotion';
import { VisualEffect, VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualizerControls } from '@/types/visualizer';
import { MultiLayerCompositor } from './MultiLayerCompositor';
import { VisualizationPreset } from '@/types/stem-visualization';
import { debugLog } from '@/lib/utils';
import { AudioTextureManager, AudioFeatureData } from './AudioTextureManager';
import { MediaLayerManager } from './MediaLayerManager';
export class VisualizerManager {
  private static instanceCounter = 0;
  private instanceId: number;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private animationId: number | null = null;
  private clock: THREE.Clock;
  private effects: Map<string, VisualEffect> = new Map();
  private isPlaying = false;
  private lastTime = 0;
  private timelineLayers: any[] = [];
  private timelineCurrentTime: number = 0;
  private currentFrame: number = 0;
  private currentFPS: number = 60;
  private deterministicTime: number = 0;
  private audioContext: AudioContext | null = null;
  private audioSources: AudioBufferSourceNode[] = [];
  private currentAudioBuffer: AudioBuffer | null = null;
  private multiLayerCompositor!: MultiLayerCompositor;
  private backgroundMaterial!: THREE.MeshBasicMaterial;
  private backgroundMesh!: THREE.Mesh;
  private audioTextureManager: AudioTextureManager | null = null;
  private mediaLayerManager: MediaLayerManager | null = null;
  private frameCount = 0;
  private debugFrameCount = 0;
  private fps = 60;
  private lastFPSUpdate = 0;
  private consecutiveSlowFrames = 0;
  private maxSlowFrames = 10;
  private visualParams = {
    globalScale: 1.0,
    rotationSpeed: 0.0,
    colorIntensity: 1.0,
    emissionIntensity: 1.0,
    positionOffset: 0.0,
    heightScale: 1.0,
    hueRotation: 0.0,
    brightness: 1.0,
    complexity: 0.5,
    particleSize: 1.0,
    opacity: 1.0,
    animationSpeed: 1.0,
    particleCount: 5000
  };
  constructor(canvas: HTMLCanvasElement, config: VisualizerConfig) {
    debugLog.log('🎭 VisualizerManager constructor called');
    this.instanceId = ++VisualizerManager.instanceCounter;
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.initScene(config);
    this.setupEventListeners();
    this.initCompositor(config);
    this.initAudioTextureManager();
    this.initMediaLayerManager();
    debugLog.log('🎭 VisualizerManager constructor complete');
  }
  private initScene(config: VisualizerConfig) {
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.Fog(0x000000, 10, 50);
  const initialAspectRatio = config.aspectRatio
    ? config.aspectRatio.width / config.aspectRatio.height
    : 1;
  this.camera = new THREE.PerspectiveCamera(
    75,
    initialAspectRatio,
    0.1,
    1000
  );
    this.camera.position.set(0, 0, 5);
    const isRendering = getRemotionEnvironment().isRendering;
    try {
      const existingContext = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      if (existingContext) {
        debugLog.log('🔄 Found existing WebGL context, will attempt to reuse');
      }
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: !isRendering,
        alpha: true,
        preserveDrawingBuffer: isRendering,
        powerPreference: isRendering ? 'high-performance' : 'default',
        failIfMajorPerformanceCaveat: false
      });
      const gl = this.renderer.getContext();
      if (!gl) {
        throw new Error('Failed to create WebGL context. WebGL may not be supported in this environment.');
      }
      const isWebGL2 = gl instanceof WebGL2RenderingContext;
      debugLog.log('✅ WebGL Renderer created successfully');
      debugLog.log('🔧 WebGL Context:', isWebGL2 ? 'WebGL 2' : 'WebGL 1');
      debugLog.log('🎬 Remotion rendering mode:', isRendering);
    } catch (error) {
      debugLog.error('❌ Primary WebGL renderer failed:', error);
      try {
        debugLog.log('🔄 Attempting fallback renderer with minimal settings...');
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: !isRendering,
          alpha: true,
          preserveDrawingBuffer: isRendering,
          powerPreference: isRendering ? 'high-performance' : 'low-power',
          failIfMajorPerformanceCaveat: false
        });
        const fallbackGl = this.renderer.getContext();
        if (!fallbackGl) {
          throw new Error('Fallback renderer failed to create WebGL context');
        }
        const isWebGL2 = fallbackGl instanceof WebGL2RenderingContext;
        debugLog.log('✅ Fallback renderer created successfully');
        debugLog.log('🔧 Fallback WebGL Context:', isWebGL2 ? 'WebGL 2' : 'WebGL 1');
      } catch (fallbackError) {
        debugLog.error('❌ Fallback renderer also failed:', fallbackError);
        const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(`WebGL initialization failed: ${errorMessage}. This may indicate a headless rendering environment issue. Check remotion.config.ts for GL backend settings.`);
      }
    }
    this.renderer.setSize(config.canvas.width, config.canvas.height);
    const devicePixelRatio = typeof window !== 'undefined' && window.devicePixelRatio
      ? window.devicePixelRatio
      : 1;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, config.canvas.pixelRatio || 1));
    this.renderer.setClearColor(0x000000, 1);
    const clearColor = this.renderer.getClearColor(new THREE.Color());
    const clearAlpha = this.renderer.getClearAlpha();
    debugLog.log('🎮 VisualizerManager: Renderer clear color =', clearColor.getHex().toString(16), 'alpha =', clearAlpha);
    debugLog.log('🎮 Renderer configured with size:', config.canvas.width, 'x', config.canvas.height);
    this.renderer.setAnimationLoop(null);
    this.renderer.info.autoReset = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  private initCompositor(config: VisualizerConfig) {
    this.multiLayerCompositor = new MultiLayerCompositor(this.renderer, {
      width: config.canvas.width,
      height: config.canvas.height,
      enableAntialiasing: true,
      pixelRatio: Math.min(window.devicePixelRatio, config.canvas.pixelRatio || 2)
    });
    const backgroundScene = new THREE.Scene();
    const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.backgroundMaterial);
    backgroundScene.add(this.backgroundMesh);
    this.multiLayerCompositor.createLayer('backgroundColor', backgroundScene, backgroundCamera, {
      zIndex: -100,
      enabled: true
    });
    this.multiLayerCompositor.createLayer('base', this.scene, this.camera, { zIndex: -1, enabled: true });
  }
  private initAudioTextureManager() {
    this.audioTextureManager = new AudioTextureManager();
    debugLog.log('🎵 AudioTextureManager initialized');
  }
  private initMediaLayerManager() {
    this.mediaLayerManager = new MediaLayerManager(this.scene, this.camera, this.renderer);
    debugLog.log('🎬 MediaLayerManager initialized');
  }
  private async initAudioAnalyzer() {
    if (!this.audioContext) {
      debugLog.log('🎵 Creating AudioContext after user interaction...');
      this.audioContext = new AudioContext();
      await this.audioContext.resume();
    }
    try {
      debugLog.log('🎵 Audio analyzer initialization (placeholder)');
    } catch (error) {
      debugLog.error('❌ Failed to initialize audio analyzer:', error);
    }
  }
  private setupEventListeners() {
    const handleResize = () => {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      this.handleViewportResize(width, height);
    };
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isPlaying) {
        this.pause();
      }
    });
    this.canvas.addEventListener('webglcontextlost', (event) => {
      debugLog.warn('⚠️ WebGL context lost!');
      event.preventDefault();
      this.pause();
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      debugLog.log('✅ WebGL context restored, reinitializing...');
      debugLog.log('🔄 Please refresh the page to restore full functionality');
    });
  }
  public addEffect(layerId: string, effect: VisualEffect) {
    debugLog.log(`➕ [VisualizerManager] Adding effect: ${layerId}, type: ${effect.constructor.name}`);
    try {
      debugLog.log(`🎨 Adding effect: ${effect.name} (for layer ${layerId})`);
      effect.init(this.renderer);
      if ('setCompositor' in effect && typeof (effect as any).setCompositor === 'function') {
        debugLog.log(`🔗 [VisualizerManager] Setting compositor for effect: ${effect.name} (${effect.id})`);
        (effect as any).setCompositor(this.multiLayerCompositor, layerId);
      }
      this.effects.set(layerId, effect);
      this.multiLayerCompositor.createLayer(layerId, effect.getScene(), effect.getCamera(), {
        zIndex: this.effects.size,
        enabled: effect.enabled
      });
      debugLog.log(`✅ Added effect: ${effect.name}. Total effects: ${this.effects.size}`);
    } catch (error) {
      debugLog.error(`❌ Failed to add effect ${effect.name}:`, error);
    }
  }
  public addEffectWithId(effect: VisualEffect, customId: string) {
    try {
      debugLog.log(`🎨 Adding effect with custom ID: ${effect.name} (${customId})`);
      this.effects.set(customId, effect);
      debugLog.log(`✅ Added effect reference with custom ID: ${effect.name} (${customId}). Total effects: ${this.effects.size}`);
    } catch (error) {
      debugLog.error(`❌ Failed to add effect ${effect.name} with custom ID ${customId}:`, error);
    }
  }
  public removeEffect(effectId: string) {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.destroy();
      this.effects.delete(effectId);
      this.multiLayerCompositor.removeLayer(effectId);
      debugLog.log(`✅ Removed effect and compositor layer: ${effect.name}. Remaining effects: ${this.effects.size}`);
    }
  }
  getEffect(effectId: string): VisualEffect | undefined {
    return this.effects.get(effectId);
  }
  getAllEffects(): VisualEffect[] {
    return Array.from(this.effects.values());
  }
  getLayerIdsByEffectType(effectType: string): string[] {
    const layerIds: string[] = [];
    this.effects.forEach((effect, layerId) => {
      if (effect.id === effectType) {
        layerIds.push(layerId);
      }
    });
    return layerIds;
  }
  getEffectByType(effectType: string): VisualEffect | undefined {
    for (const [_, effect] of this.effects) {
      if (effect.id === effectType) {
        return effect;
      }
    }
    return undefined;
  }
  enableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = true;
      this.multiLayerCompositor.updateLayer(effectId, { enabled: true });
      debugLog.log(`✅ Enabled effect: ${effect.name} (${effectId})`);
    } else {
      debugLog.warn(`⚠️ Effect not found: ${effectId}`);
    }
  }
  disableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = false;
      this.multiLayerCompositor.updateLayer(effectId, { enabled: false });
      debugLog.log(`❌ Disabled effect: ${effect.name} (${effectId})`);
    }
  }
  play(): void {
    const isRendering = getRemotionEnvironment().isRendering;
    if (isRendering) {
      debugLog.log(`🎬 Play() called during Remotion rendering - animation loop disabled`);
      return;
    }
    debugLog.log(`🎬 Play() called. Current state: isPlaying=${this.isPlaying}, effects=${this.effects.size}`);
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.clock.start();
      this.animate();
      debugLog.log(`🎬 Animation started`);
      this.audioSources.forEach((source, index) => {
        try {
          source.start(0);
          debugLog.log(`🎵 Started audio source ${index}`);
        } catch (error) {
          debugLog.warn(`⚠️ Audio source ${index} already playing or ended`);
        }
      });
    }
  }
  pause(): void {
    this.isPlaying = false;
    this.clock.stop();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.audioSources.forEach((source, index) => {
      try {
        source.stop();
        debugLog.log(`🎵 Stopped audio source ${index}`);
      } catch (error) {
        debugLog.warn(`⚠️ Audio source ${index} already stopped`);
      }
    });
  }
  stop(): void {
    this.pause();
    this.clock.elapsedTime = 0;
  }
  public update(frame: number, fps: number): void {
    this.currentFrame = frame;
    this.currentFPS = fps;
    const timeInSeconds = frame / fps;
    this.deterministicTime = timeInSeconds;
    this.timelineCurrentTime = timeInSeconds;
    this.effects.forEach((effect, layerId) => {
      if ('uniforms' in effect && effect.uniforms && (effect as any).uniforms.uTime) {
        (effect as any).uniforms.uTime.value = timeInSeconds;
      }
      if ('setSeed' in effect && typeof (effect as any).setSeed === 'function') {
        (effect as any).setSeed(frame);
      }
      if (typeof (effect as any).updateWithTime === 'function') {
        (effect as any).updateWithTime(timeInSeconds);
      } else {
        effect.update(1 / fps);
      }
    });
    if (getRemotionEnvironment().isRendering && frame > 0) {
    }
  }
  public renderFrame(time: number, deltaTime: number): void {
    const isRendering = getRemotionEnvironment().isRendering;
    const effectiveTime = isRendering ? this.deterministicTime : time / 1000;
    let activeEffectCount = 0;
    if (this.effects.size === 0) {
      debugLog.warn('⚠️ [VisualizerManager] No effects registered. Effects count:', this.effects.size);
    }
    if (this.timelineLayers.length === 0) {
      debugLog.warn('⚠️ [VisualizerManager] No timeline layers. Timeline layers count:', this.timelineLayers.length);
    }
    this.effects.forEach((effect, layerId) => {
      const effectLayer = this.timelineLayers.find(l => l.id === layerId);
      const isLayerActive = effect.enabled && effectLayer
        ? (this.timelineCurrentTime >= effectLayer.startTime && this.timelineCurrentTime <= effectLayer.endTime)
        : false;
      if (this.debugFrameCount < 5 && effectLayer) {
        debugLog.log(`🎬 [Frame ${this.debugFrameCount}] Layer ${layerId}:`, {
          enabled: effect.enabled,
          currentTime: this.timelineCurrentTime,
          startTime: effectLayer.startTime,
          endTime: effectLayer.endTime,
          isActive: isLayerActive
        });
      }
      this.multiLayerCompositor.updateLayer(layerId, { enabled: isLayerActive });
      if (isLayerActive) {
          activeEffectCount++;
          try {
            if (isRendering && this.deterministicTime !== undefined) {
              if ('uniforms' in effect && effect.uniforms && (effect as any).uniforms.uTime) {
                (effect as any).uniforms.uTime.value = this.deterministicTime;
              }
              if (typeof (effect as any).updateWithTime === 'function') {
                (effect as any).updateWithTime(this.deterministicTime);
              } else {
                effect.update(deltaTime);
              }
            } else {
              effect.update(deltaTime);
            }
          } catch (error) {
            debugLog.error(`❌ Effect ${layerId} update failed:`, error);
          }
      }
    });
    if (this.debugFrameCount < 5) {
      debugLog.log(`🎬 [Frame ${this.debugFrameCount}] Active effects: ${activeEffectCount}, Total effects: ${this.effects.size}, Timeline time: ${this.timelineCurrentTime.toFixed(3)}s`);
    }
    this.debugFrameCount++;
    if (this.audioTextureManager && this.currentAudioData) {
      const audioFeatureData: AudioFeatureData = {
        features: {
          'main': [this.currentAudioData.volume, this.currentAudioData.bass, this.currentAudioData.mid, this.currentAudioData.treble]
        },
        duration: 0,
        sampleRate: 44100,
        stemTypes: ['main']
      };
      this.audioTextureManager.updateTime(this.timelineCurrentTime, 0);
    }
    if (this.mediaLayerManager) {
      this.mediaLayerManager.updateTextures();
    }
    this.multiLayerCompositor.render();
  }
  private animate = () => {
    if (!this.isPlaying) return;
    this.animationId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const elapsed = now - this.lastTime;
    const targetFrameTime = 1000 / 30;
    if (elapsed < targetFrameTime) {
      return;
    }
    const frameTime = elapsed;
    if (frameTime > 100) {
      this.consecutiveSlowFrames++;
      if (this.consecutiveSlowFrames >= this.maxSlowFrames) {
        debugLog.error(`🚨 Emergency pause: ${this.maxSlowFrames} consecutive slow frames detected. Pausing to prevent browser freeze.`);
        this.pause();
        setTimeout(() => {
          debugLog.log('💡 Tip: Try refreshing the page or closing other browser tabs to improve performance.');
        }, 1000);
        return;
      }
      this.lastTime = now;
      return;
    } else {
      this.consecutiveSlowFrames = 0;
    }
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const currentTime = now;
    this.frameCount++;
    if (currentTime - this.lastFPSUpdate > 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
      this.frameCount = 0;
      this.lastFPSUpdate = currentTime;
    }
    if (this.frameCount % 300 === 0) {
      const memInfo = this.getMemoryUsage();
      if (memInfo.geometries > 100 || memInfo.textures > 50) {
        debugLog.warn(`⚠️ High memory usage detected: ${memInfo.geometries} geometries, ${memInfo.textures} textures`);
      }
    }
    this.renderFrame(currentTime, deltaTime);
    this.lastTime = currentTime;
  };
  public updateTimelineState(layers: any[], currentTime: number): void {
    this.timelineLayers = layers;
    this.timelineCurrentTime = currentTime;
    if (this.multiLayerCompositor) {
      layers.forEach(layer => {
        if (typeof layer.zIndex === 'number') {
          this.multiLayerCompositor.updateLayer(layer.id, { zIndex: layer.zIndex });
        }
      });
    }
  }
  updateMIDIData(midiData: LiveMIDIData): void {
    this.currentMidiData = midiData;
    debugLog.log('🎵 MIDI data received:', midiData);
  }
  updateAudioData(audioData: AudioAnalysisData): void {
    this.currentAudioData = audioData;
    debugLog.log('🎵 Audio data received:', audioData);
  }
  public setAudioData(data: AudioAnalysisData): void {
    this.currentAudioData = data;
  }
  updateEffectParameter(effectId: string, paramName: string, value: any): void {
    let effect = this.effects.get(effectId);
    const isMetaballs = effectId === 'layer-1765752490965';
    if (!effect) {
      const layerIds = this.getLayerIdsByEffectType(effectId);
      if (layerIds.length > 0) {
        layerIds.forEach(layerId => {
          const effectInstance = this.effects.get(layerId);
          if (effectInstance && effectInstance.parameters.hasOwnProperty(paramName)) {
            const oldValue = (effectInstance.parameters as any)[paramName];
            (effectInstance.parameters as any)[paramName] = value;
            if (isMetaballs) {
              debugLog.log('🔧 [VisualizerManager] Updated effect parameter (by type):', {
                effectId,
                layerId,
                paramName,
                oldValue,
                newValue: value,
                hasUpdateMethod: typeof (effectInstance as any).updateParameter === 'function',
              });
            }
            if (typeof (effectInstance as any).updateParameter === 'function') {
              (effectInstance as any).updateParameter(paramName, value);
            }
          } else if (isMetaballs) {
            debugLog.warn('🔧 [VisualizerManager] Parameter not found (by type):', {
              effectId,
              layerId,
              paramName,
              availableParams: effectInstance ? Object.keys(effectInstance.parameters) : [],
            });
          }
        });
        return;
      }
      if (isMetaballs) {
        debugLog.warn(`🔧 [VisualizerManager] Effect ${effectId} not found (neither as layer ID nor effect type)`);
      }
      debugLog.warn(`⚠️ Effect ${effectId} not found (neither as layer ID nor effect type)`);
      return;
    }
    if (effect.parameters.hasOwnProperty(paramName)) {
      const oldValue = (effect.parameters as any)[paramName];
      (effect.parameters as any)[paramName] = value;
      if (isMetaballs) {
        debugLog.log('🔧 [VisualizerManager] Updated effect parameter (direct):', {
          effectId,
          paramName,
          oldValue,
          newValue: value,
          hasUpdateMethod: typeof (effect as any).updateParameter === 'function',
          currentParams: Object.keys(effect.parameters),
        });
      }
      if (typeof (effect as any).updateParameter === 'function') {
        (effect as any).updateParameter(paramName, value);
        if (isMetaballs) {
          debugLog.log('🔧 [VisualizerManager] Called updateParameter method');
        }
      }
    } else {
      if (isMetaballs) {
        debugLog.warn('🔧 [VisualizerManager] Parameter not found (direct):', {
          effectId,
          paramName,
          availableParams: Object.keys(effect.parameters),
        });
      }
      debugLog.warn(`⚠️ Parameter ${paramName} not found in effect ${effectId}`);
    }
  }
  private currentMidiData?: LiveMIDIData;
  private currentAudioData?: AudioAnalysisData;
  getFPS(): number {
    return this.fps;
  }
  getMemoryUsage(): { geometries: number; textures: number; programs: number } {
    return {
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      programs: this.renderer.info.programs?.length || 0
    };
  }
  dispose(): void {
    debugLog.log(`🗑️ VisualizerManager.dispose() called. Effects: ${this.effects.size}`);
    this.stop();
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.dispose();
    }
    debugLog.log(`🗑️ Disposing ${this.effects.size} effects`);
    this.effects.forEach(effect => effect.destroy());
    this.effects.clear();
    debugLog.log(`🗑️ Effects cleared. Remaining: ${this.effects.size}`);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof Array) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    this.renderer.dispose();
  }
  public async loadAudioBuffer(buffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    try {
      debugLog.log('Audio buffer length:', buffer.byteLength);
      debugLog.log('First 16 bytes:', Array.from(new Uint8Array(buffer.slice(0, 16))));
      this.currentAudioBuffer = await this.audioContext.decodeAudioData(buffer);
      const audioSource = this.audioContext.createBufferSource();
      audioSource.buffer = this.currentAudioBuffer;
      audioSource.connect(this.audioContext.destination);
      if (!this.audioSources) {
        this.audioSources = [];
      }
      this.audioSources.push(audioSource);
    } catch (error) {
      debugLog.error('❌ Failed to load audio buffer:', error);
      throw error;
    }
  }
  public setGlobalScale(value: number) {
    this.visualParams.globalScale = value;
    this.effects.forEach(effect => {
      if ('setScale' in effect) {
        (effect as any).setScale(value);
      }
    });
  }
  public setRotationSpeed(value: number) {
    this.visualParams.rotationSpeed = value;
    this.effects.forEach(effect => {
      if ('setRotationSpeed' in effect) {
        (effect as any).setRotationSpeed(value);
      }
    });
  }
  public setColorIntensity(value: number) {
    this.visualParams.colorIntensity = value;
    this.effects.forEach(effect => {
      if ('setColorIntensity' in effect) {
        (effect as any).setColorIntensity(value);
      }
    });
  }
  public setEmissionIntensity(value: number) {
    this.visualParams.emissionIntensity = value;
    this.effects.forEach(effect => {
      if ('setEmissionIntensity' in effect) {
        (effect as any).setEmissionIntensity(value);
      }
    });
  }
  public setPositionOffset(value: number) {
    this.visualParams.positionOffset = value;
    this.effects.forEach(effect => {
      if ('setPositionOffset' in effect) {
        (effect as any).setPositionOffset(value);
      }
    });
  }
  public setHeightScale(value: number) {
    this.visualParams.heightScale = value;
    this.effects.forEach(effect => {
      if ('setHeightScale' in effect) {
        (effect as any).setHeightScale(value);
      }
    });
  }
  public setHueRotation(value: number) {
    this.visualParams.hueRotation = value;
    this.effects.forEach(effect => {
      if ('setHueRotation' in effect) {
        (effect as any).setHueRotation(value);
      }
    });
  }
  public setBrightness(value: number) {
    this.visualParams.brightness = value;
    this.effects.forEach(effect => {
      if ('setBrightness' in effect) {
        (effect as any).setBrightness(value);
      }
    });
  }
  public setComplexity(value: number) {
    this.visualParams.complexity = value;
    this.effects.forEach(effect => {
      if ('setComplexity' in effect) {
        (effect as any).setComplexity(value);
      }
    });
  }
  public setParticleSize(value: number) {
    this.visualParams.particleSize = value;
    this.effects.forEach(effect => {
      if ('setParticleSize' in effect) {
        (effect as any).setParticleSize(value);
      }
    });
  }
  public setOpacity(value: number) {
    this.visualParams.opacity = value;
    this.effects.forEach(effect => {
      if ('setOpacity' in effect) {
        (effect as any).setOpacity(value);
      }
    });
  }
  public setAnimationSpeed(value: number) {
    this.visualParams.animationSpeed = value;
    this.effects.forEach(effect => {
      if ('setAnimationSpeed' in effect) {
        (effect as any).setAnimationSpeed(value);
      }
    });
  }
  public setParticleCount(value: number) {
    this.visualParams.particleCount = value;
    this.effects.forEach(effect => {
      if ('setParticleCount' in effect) {
        (effect as any).setParticleCount(value);
      }
    });
  }
  public updateSettings(settings: Record<string, number>) {
    Object.entries(settings).forEach(([key, value]) => {
      switch (key) {
        case 'globalIntensity':
          this.setColorIntensity(value);
          this.setEmissionIntensity(value);
          break;
        case 'smoothingFactor':
          this.effects.forEach(effect => {
            if ('setSmoothingFactor' in effect) {
              (effect as any).setSmoothingFactor(value);
            }
          });
          break;
        case 'responsiveness':
          this.effects.forEach(effect => {
            if ('setResponsiveness' in effect) {
              (effect as any).setResponsiveness(value);
            }
          });
          break;
      }
    });
  }
  public handleViewportResize(canvasWidth: number, canvasHeight: number) {
    this.renderer.setSize(canvasWidth, canvasHeight);
    this.camera.aspect = canvasWidth / canvasHeight;
    this.camera.updateProjectionMatrix();
    this.effects.forEach(effect => {
      if ('uniforms' in effect && (effect as any).uniforms?.uResolution) {
        (effect as any).uniforms.uResolution.value.set(canvasWidth, canvasHeight);
      }
      if ('resize' in effect && typeof (effect as any).resize === 'function') {
        (effect as any).resize(canvasWidth, canvasHeight);
      }
    });
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.resize(canvasWidth, canvasHeight);
    }
    debugLog.log('🎨 Responsive resize:', canvasWidth, canvasHeight, 'aspect:', this.camera.aspect);
  }
  public createCompositionLayer() {
    const aspectRatio = this.camera.aspect;
    const frustumSize = 2;
    const orthographicCamera = new THREE.OrthographicCamera(
      frustumSize * aspectRatio / -2,
      frustumSize * aspectRatio / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    orthographicCamera.position.set(0, 0, 1);
    orthographicCamera.lookAt(0, 0, 0);
    const compositionScene = new THREE.Scene();
    return {
      scene: compositionScene,
      camera: orthographicCamera,
      addVideoLayer: (video: HTMLVideoElement, position: {x: number, y: number}, scale: {x: number, y: number}) => {
        const texture = new THREE.VideoTexture(video);
        const plane = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(plane, material);
        mesh.position.set(position.x, position.y, 0);
        mesh.scale.set(scale.x, scale.y, 1);
        compositionScene.add(mesh);
        return mesh;
      },
      addImageLayer: (image: HTMLImageElement, position: {x: number, y: number}, scale: {x: number, y: number}) => {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        const texture = loader.load(image.src, undefined, undefined, (err) => {
            console.error("Error loading texture:", image.src, err);
        });
        const plane = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const mesh = new THREE.Mesh(plane, material);
        mesh.position.set(position.x, position.y, 0);
        mesh.scale.set(scale.x, scale.y, 1);
        compositionScene.add(mesh);
        return mesh;
      }
    };
  }
  public getAudioTextureManager(): AudioTextureManager | null {
    return this.audioTextureManager;
  }
  public getMediaLayerManager(): MediaLayerManager | null {
    return this.mediaLayerManager;
  }
  public getCompositor(): MultiLayerCompositor {
    return this.multiLayerCompositor;
  }
  public loadAudioAnalysisForGPU(analysisData: AudioFeatureData): void {
    if (this.audioTextureManager) {
      this.audioTextureManager.loadAudioAnalysis(analysisData);
      debugLog.log('🎵 Audio analysis loaded into GPU textures');
    }
  }
  public setBackgroundColor(color: THREE.ColorRepresentation): void {
    if (this.backgroundMaterial) {
      this.backgroundMaterial.color.set(color);
      debugLog.log('🎨 Background color set to:', color);
    }
  }
  public setBackgroundVisibility(visible: boolean): void {
    if (this.backgroundMesh) {
      this.backgroundMesh.visible = visible;
      debugLog.log('🎨 Background visibility set to:', visible);
    }
  }
}
```

## File: apps/web/src/remotion/RemotionOverlayRenderer.tsx
```typescript
import React, { useMemo, useCallback } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { HudOverlay } from '@/components/hud/HudOverlay';
import type { Layer } from '@/types/video-composition';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { extractAudioDataAtTime } from './RayboxComposition';
type RemotionOverlayRendererProps = {
  layers: Layer[];
  audioAnalysisData: CachedAudioAnalysisData[];
};
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
export const RemotionOverlayRenderer: React.FC<RemotionOverlayRendererProps> = ({
  layers,
  audioAnalysisData,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width: videoWidth, height: videoHeight } = useVideoConfig();
  const videoDuration = fps > 0 ? durationInFrames / fps : 30;
  const currentTime = fps > 0 ? frame / fps : 0;
  const cachedAnalysis = audioAnalysisData as CachedAudioAnalysisData[];
  const overlayLayers = useMemo(
    () => layers.filter((layer) => layer.type === 'overlay'),
    [layers],
  );
  const activeOverlays = useMemo(
    () =>
      overlayLayers.filter(
        (layer) =>
          currentTime >= (layer.startTime ?? 0) &&
          currentTime <= (layer.endTime ?? Number.POSITIVE_INFINITY),
      ),
    [overlayLayers, currentTime],
  );
  const getFeatureDataForOverlay = useCallback(
    (layer: Layer) => {
      const settings = (layer as any).settings || {};
      const stemId = settings.stemId || settings.stem?.id;
      if (!stemId || cachedAnalysis.length === 0) {
        return null;
      }
      let analysis = cachedAnalysis.find((a) => a.fileMetadataId === stemId);
      if (!analysis) {
        const requestedStemType = settings.stemType || 'master';
        analysis = cachedAnalysis.find(a => a.stemType === requestedStemType);
      }
      if (!analysis || !analysis.analysisData) {
        return null;
      }
      const overlayType = layer.effectType as string;
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
      const analysisDuration =
        metadataDuration ?? derivedDurationFromFrames ?? analysisDurationField ?? videoDuration;
      const progress = Math.max(0, Math.min(currentTime / analysisDuration, 1));
      if (overlayType === 'spectrogram' || overlayType === 'spectrumAnalyzer') {
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );
        if (extracted?.frequencies?.length) {
          const buffer: Array<Float32Array> = [];
          const numHistoryFrames = 5;
          for (let i = numHistoryFrames; i >= 0; i--) {
            const t = currentTime - (i * 0.05);
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
      if (overlayType === 'stereometer') {
        const stereoLeft = (analysis.analysisData as any).stereoWindow_left;
        const stereoRight = (analysis.analysisData as any).stereoWindow_right;
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );
        if (extracted?.timeData?.length) {
          const half = Math.floor(extracted.timeData.length / 2);
          const left = extracted.timeData.slice(0, half);
          const right = extracted.timeData.slice(half) || extracted.timeData.slice(0, half);
          return {
            stereoWindow: {
              left,
              right,
            },
          };
        }
        if (stereoLeft && stereoRight && Array.isArray(stereoLeft) && Array.isArray(stereoRight)) {
          return {
            stereoWindow: {
              left: stereoLeft,
              right: stereoRight,
            },
          };
        }
        return null;
      }
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
      if (overlayType === 'chromaWheel') {
        if (analysis.analysisData.chroma && Array.isArray(analysis.analysisData.chroma)) {
          return { chroma: analysis.analysisData.chroma };
        }
        return null;
      }
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
      let featureArr: number[] | null = null;
      for (const key of featureKeys) {
        const arr = (analysis.analysisData as any)[key];
        if (arr && Array.isArray(arr) && arr.length > 0) {
          featureArr = arr;
          break;
        }
      }
      if (!featureArr) {
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
      if (overlayType === 'waveform' || overlayType === 'oscilloscope') {
        const windowSize = 100;
        const endIdx = idx + 1;
        const startIdx = Math.max(0, endIdx - windowSize);
        return featureArr.slice(startIdx, endIdx);
      }
      if (overlayType === 'peakMeter') {
        return featureArr[idx] || 0;
      }
      return featureArr[idx];
    },
    [cachedAnalysis, currentTime],
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
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            frame={frame}
            fps={fps}
            onOpenModal={() => { }}
            onUpdate={() => { }}
            isSelected={false}
            onSelect={() => { }}
          />
        );
      })}
    </div>
  );
};
```

## File: apps/web/src/remotion/Root.tsx
```typescript
import { type CalculateMetadataFunction, Composition } from 'remotion';
import { RayboxComposition } from './RayboxComposition';
import type { AudioAnalysisData } from '@/types/audio-analysis-data';
import type { Layer } from '@/types/video-composition';
import type { VisualizationSettings } from 'phonoglyph-types';
type VisualizationSettingsWithAspect = VisualizationSettings & { aspectRatio?: string };
type AspectRatioKey =
  | 'mobile'
  | 'tiktok'
  | 'youtube'
  | 'instagram'
  | 'landscape'
  | '16:9'
  | '9:16'
  | '1:1';
const ASPECT_RATIO_DIMENSIONS: Record<AspectRatioKey, { width: number; height: number }> = {
  mobile: { width: 1080, height: 1920 },
  tiktok: { width: 1080, height: 1920 },
  youtube: { width: 1920, height: 1080 },
  instagram: { width: 1080, height: 1080 },
  landscape: { width: 1920, height: 1200 },
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
};
let TEST_PAYLOAD: RayboxCompositionProps | null = null;
try {
  const payload = require('./debug-payload.json') as unknown;
  TEST_PAYLOAD = payload as RayboxCompositionProps;
} catch (e) {
  console.warn('⚠️ Could not load debug-payload.json:', e);
  try {
    const debugModule = require('./Debug') as { TEST_PAYLOAD?: unknown };
    TEST_PAYLOAD = debugModule.TEST_PAYLOAD as RayboxCompositionProps;
  } catch (e2) {
    console.warn('⚠️ Could not load Debug module:', e2);
  }
}
export interface RayboxCompositionProps extends Record<string, unknown> {
  layers: Layer[];
  audioAnalysisData: AudioAnalysisData[];
  visualizationSettings: VisualizationSettingsWithAspect;
  masterAudioUrl: string;
  mappings?: Record<string, { featureId: string | null; modulationAmount: number }>;
  baseParameterValues?: Record<string, Record<string, any>>;
  featureDecayTimes?: Record<string, number>;
  featureSensitivities?: Record<string, number>;
  analysisUrl?: string;
}
const defaultProps: RayboxCompositionProps = {
  layers: [],
  audioAnalysisData: [],
  visualizationSettings: {
    colorScheme: 'mixed',
    pixelsPerSecond: 50,
    showTrackLabels: true,
    showVelocity: true,
    minKey: 21,
    maxKey: 108,
  },
  masterAudioUrl: '',
};
const resolveAspectRatioDimensions = (
  rawAspectRatio: string | undefined,
): { width: number; height: number } => {
  if (!rawAspectRatio) {
    return ASPECT_RATIO_DIMENSIONS['9:16'];
  }
  const normalized = rawAspectRatio.toLowerCase();
  if (normalized in ASPECT_RATIO_DIMENSIONS) {
    return ASPECT_RATIO_DIMENSIONS[normalized as AspectRatioKey];
  }
  if (normalized.includes(':')) {
    const [widthPart, heightPart] = normalized.split(':');
    const widthRatio = Number(widthPart);
    const heightRatio = Number(heightPart);
    if (
      Number.isFinite(widthRatio) &&
      Number.isFinite(heightRatio) &&
      widthRatio > 0 &&
      heightRatio > 0
    ) {
      if (widthRatio >= heightRatio) {
        const width = 1920;
        return { width, height: Math.round((heightRatio / widthRatio) * width) };
      }
      const height = 1920;
      return { width: Math.round((widthRatio / heightRatio) * height), height };
    }
  }
  return ASPECT_RATIO_DIMENSIONS['9:16'];
};
const calculateMetadata: CalculateMetadataFunction<RayboxCompositionProps> = async ({
  props,
}) => {
  const safeFps = 60;
  let finalAudioData = props.audioAnalysisData;
  if (props.analysisUrl) {
    console.log('☁️ Fetching heavy analysis from R2...');
    try {
      const res = await fetch(props.analysisUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch analysis data: ${res.status} ${res.statusText}`);
      }
      finalAudioData = await res.json();
      console.log(`✅ Fetched ${finalAudioData.length} analysis entries from R2`);
    } catch (error) {
      console.error('❌ Failed to fetch analysis data from R2:', error);
      finalAudioData = [];
    }
  }
  if (!props.layers || props.layers.length === 0) {
    console.log(
      '⚠️ calculateMetadata received EMPTY layers. Check debug-payload.json!',
    );
  } else {
    console.log(
      `✅ calculateMetadata: ${props.layers.length} layers, Aspect: ${props.visualizationSettings?.aspectRatio}`,
    );
  }
  const layers = props?.layers ?? [];
  const { width, height } = resolveAspectRatioDimensions(
    props.visualizationSettings?.aspectRatio,
  );
  const durationFromProps = (props as Partial<{ duration?: number }>).duration;
  let duration =
    typeof durationFromProps === 'number' && !Number.isNaN(durationFromProps)
      ? durationFromProps
      : undefined;
  if (duration == null || Number.isNaN(duration)) {
    if (layers.length > 0) {
      const layerEndTimes = layers
        .map((l) => l.endTime)
        .filter((t) => typeof t === 'number' && !Number.isNaN(t));
      if (layerEndTimes.length > 0) {
        duration = Math.max(...layerEndTimes);
      }
    }
  }
  if ((duration == null || !Number.isFinite(duration) || duration <= 0) && finalAudioData.length > 0) {
    duration = finalAudioData[0]?.metadata?.duration || 30;
  }
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    duration = 30;
  }
  return {
    durationInFrames: Math.ceil(duration * safeFps),
    width,
    height,
    props: {
      ...props,
      audioAnalysisData: finalAudioData,
    },
  };
};
export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="RayboxMain"
        component={RayboxComposition}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="Debug"
        component={RayboxComposition}
        width={1080}
        height={1920}
        fps={60}
        defaultProps={TEST_PAYLOAD ?? defaultProps}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
```

## File: apps/web/src/remotion/RayboxComposition.tsx
```typescript
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
import '@/lib/visualizer/effects/EffectDefinitions';
import type { RayboxCompositionProps } from './Root';
import type { AudioAnalysisData as SimpleAudioAnalysisData } from '@/types/visualizer';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { parseParamKey } from '@/lib/visualizer/paramKeys';
import { debugLog } from '@/lib/utils';
import { RemotionOverlayRenderer } from './RemotionOverlayRenderer';
const VALID_STEMS = new Set(['master', 'drums', 'bass', 'vocals', 'other']);
const DEFAULT_PEAK_DECAY_TIMES: Record<string, number> = {
  'drums-peaks': 0.3,
  'bass-peaks': 0.5,
  'vocals-peaks': 0.4,
  'melody-peaks': 0.5,
  'master-peaks': 0.4,
  'other-peaks': 0.5,
};
const DEFAULT_DECAY_TIME = 0.5;
const MOMENTUM_LOOKBACK_MULTIPLIER = 3;
const SOFT_BOUND_STRENGTH = 0.3;
const DEFAULT_PEAK_SENSITIVITIES: Record<string, number> = {
  'drums-peaks': 0.5,
  'bass-peaks': 0.5,
  'vocals-peaks': 0.5,
  'melody-peaks': 0.5,
  'master-peaks': 0.5,
  'other-peaks': 0.5,
};
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
  const sensitivity = userSensitivities?.[featureId]
    ?? DEFAULT_PEAK_SENSITIVITIES[featureId]
    ?? 0.5;
  const filteredTransients = filterTransientsBySensitivity(transients, sensitivity);
  if (frameForDebug !== undefined && frameForDebug < 5) {
    console.log(`[Peaks Debug] frame=${frameForDebug} ${featureId}: ${transients.length} → ${filteredTransients.length} transients (sensitivity=${sensitivity})`);
  }
  if (!filteredTransients || filteredTransients.length === 0) {
    return baseValue;
  }
  const decayTime = userDecayTimes?.[featureId]
    ?? DEFAULT_PEAK_DECAY_TIMES[featureId]
    ?? DEFAULT_DECAY_TIME;
  const lookbackWindow = decayTime * MOMENTUM_LOOKBACK_MULTIPLIER;
  let totalMomentum = 0;
  for (const transient of filteredTransients) {
    const elapsed = time - transient.time;
    if (elapsed < 0 || elapsed > lookbackWindow) continue;
    const direction = random(`peak-${transient.time}`) > 0.5 ? 1 : -1;
    const decayFactor = Math.exp(-elapsed / decayTime);
    totalMomentum += transient.intensity * direction * decayFactor;
  }
  const projectedValue = baseValue + totalMomentum;
  if (projectedValue > 1) {
    const overshoot = projectedValue - 1;
    totalMomentum -= overshoot * SOFT_BOUND_STRENGTH;
  } else if (projectedValue < 0) {
    const undershoot = -projectedValue;
    totalMomentum += undershoot * SOFT_BOUND_STRENGTH;
  }
  const result = Math.max(0, Math.min(1, baseValue + totalMomentum));
  if (frameForDebug !== undefined && (frameForDebug < 10 || frameForDebug % 60 === 0)) {
    console.log(`[Peaks Debug] frame=${frameForDebug} time=${time.toFixed(3)} featureId=${featureId} → value=${result.toFixed(4)} (baseValue=${baseValue.toFixed(2)}, decayTime=${decayTime.toFixed(2)})`);
  }
  return result;
}
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
    const fullFeatureId = `${parsedStem}-peaks`;
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
      baseValue ?? 0.5
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
export function extractAudioDataAtTime(
  cachedAnalysis: CachedAudioAnalysisData[] | undefined,
  fileId: string | undefined,
  time: number,
  stemType?: string
): SimpleAudioAnalysisData | null {
  if (!cachedAnalysis || !fileId || cachedAnalysis.length === 0) {
    return null;
  }
  const volume = getFeatureValueFromCached(cachedAnalysis, fileId, 'volume', time, stemType);
  const bass = getFeatureValueFromCached(cachedAnalysis, fileId, 'bass', time, stemType);
  const mid = getFeatureValueFromCached(cachedAnalysis, fileId, 'mid', time, stemType);
  const treble = getFeatureValueFromCached(cachedAnalysis, fileId, 'treble', time, stemType);
  const spectralCentroid = getFeatureValueFromCached(cachedAnalysis, fileId, 'spectral-centroid', time, stemType);
  let analysis = cachedAnalysis.find(
    a => a.fileMetadataId === fileId && a.stemType === (stemType ?? 'master')
  );
  if (!analysis) {
    analysis = cachedAnalysis.find(a => a.stemType === (stemType ?? 'master'));
  }
  if (!analysis) {
    return null;
  }
  const fft = analysis.analysisData.fft;
  const frameTimes = analysis.analysisData.frameTimes;
  let frequencies: number[] = [];
  let timeData: number[] = [];
  const stereoWindowLeft = (analysis.analysisData as any).stereoWindow_left;
  const stereoWindowRight = (analysis.analysisData as any).stereoWindow_right;
  const hasRealStereoData = stereoWindowLeft && stereoWindowRight &&
    Array.isArray(stereoWindowLeft) && Array.isArray(stereoWindowRight) &&
    stereoWindowLeft.length > 0 && stereoWindowRight.length > 0;
  if (hasRealStereoData) {
    const samplesPerFrame = stereoWindowLeft.length > 0 ? 1024 : 256;
    const totalFrames = Math.floor(stereoWindowLeft.length / samplesPerFrame);
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
    const startIdx = frameIndex * samplesPerFrame;
    const endIdx = Math.min(startIdx + samplesPerFrame, stereoWindowLeft.length);
    if (startIdx < stereoWindowLeft.length) {
      timeData = [
        ...stereoWindowLeft.slice(startIdx, endIdx),
        ...stereoWindowRight.slice(startIdx, endIdx)
      ];
    }
  } else if (fft && Array.isArray(fft) && fft.length > 0) {
    let effectiveFrameTimes = frameTimes;
    let binsPerFrame = 1;
    if (!effectiveFrameTimes || !Array.isArray(effectiveFrameTimes) || effectiveFrameTimes.length === 0) {
      const duration = (analysis.analysisData as any).analysisDuration || analysis.metadata?.duration || 30;
      const numFrames = Math.min(fft.length, 256);
      effectiveFrameTimes = Array.from({ length: numFrames }, (_, i) => (i / numFrames) * duration);
      binsPerFrame = Math.floor(fft.length / numFrames);
    } else {
      binsPerFrame = Math.floor(fft.length / effectiveFrameTimes.length);
    }
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
        const numSamples = Math.min(binsPerFrame, 256);
        timeData = [];
        for (let i = 0; i < numSamples; i++) {
          const fftIdx = Math.min(startIdx + i, fft.length - 1);
          const mag = fft[fftIdx] || 0;
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
  const [handle] = useState(() => delayRender('Initializing Visualizer', { timeoutInMilliseconds: 120000 }));
  const isInitializedRef = useRef(false);
  const actualLayers = layers || [];
  const actualAudioAnalysisData = audioAnalysisData || [];
  useLayoutEffect(() => {
    if (isInitializedRef.current) return;
    if (!canvasRef.current) {
      console.warn('[RayboxComposition] Canvas ref not ready, waiting for next render');
      return;
    }
    let isNewManager = false;
    let safetyTimeout: NodeJS.Timeout | null = null;
    if (!visualizerManagerRef.current) {
      try {
        console.log('[RayboxComposition] Creating VisualizerManager...');
        visualizerManagerRef.current = new VisualizerManager(canvasRef.current, {
          canvas: { width, height, pixelRatio: 1 },
          performance: { targetFPS: fps, enableShadows: false },
          midi: { velocitySensitivity: 1.0, noteTrailDuration: 2.0, trackColorMapping: {} },
        });
        isNewManager = true;
        effectInstancesRef.current.clear();
        console.log('[RayboxComposition] VisualizerManager created successfully');
      } catch (e) {
        console.error('[RayboxComposition] Failed to initialize VisualizerManager:', e);
        isInitializedRef.current = true;
        continueRender(handle);
        return;
      }
    }
    const manager = visualizerManagerRef.current;
    if (manager) {
      manager.handleViewportResize(width, height);
      if (visualizationSettings) {
        manager.updateSettings(visualizationSettings as unknown as Record<string, number>);
      }
      const effectLayers = actualLayers.filter((l) => l.type === 'effect' && l.effectType);
      console.log(`[RayboxComposition] Creating ${effectLayers.length} effects...`);
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
    const waitForAssets = async () => {
      try {
        const asyncEffects = Array.from(effectInstancesRef.current.values()).filter(
          (effect) => typeof (effect as any).waitForImages === 'function',
        );
        console.log(`[RayboxComposition] Waiting for ${asyncEffects.length} effects with images...`);
        if (asyncEffects.length > 0) {
          await Promise.race([
            Promise.all(asyncEffects.map((effect) => (effect as any).waitForImages())),
            new Promise((r) => setTimeout(r, 8000)),
          ]);
        }
        console.log('[RayboxComposition] Asset loading complete');
      } catch (e) {
        console.warn('[RayboxComposition] Asset waiting warning:', e);
      } finally {
        if (!isInitializedRef.current) {
          isInitializedRef.current = true;
          console.log('[RayboxComposition] Calling continueRender from waitForAssets');
          continueRender(handle);
        }
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
          safetyTimeout = null;
        }
      }
    };
    waitForAssets().catch((err) => {
      console.error('[RayboxComposition] waitForAssets failed:', err);
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        continueRender(handle);
      }
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }
    });
    safetyTimeout = setTimeout(() => {
      if (!isInitializedRef.current) {
        console.warn('[RayboxComposition] Safety timeout: forcing continueRender after 15s');
        isInitializedRef.current = true;
        continueRender(handle);
      }
    }, 15000);
    return () => {
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
    };
  }, [width, height, fps]);
  useLayoutEffect(() => {
    if (!isInitializedRef.current || !visualizerManagerRef.current) return;
    const manager = visualizerManagerRef.current;
    const effectLayers = actualLayers.filter((l) => l.type === 'effect' && l.effectType);
    for (const layer of effectLayers) {
      const hasRef = effectInstancesRef.current.has(layer.id);
      const managerHasEffect =
        typeof manager.getEffect === 'function' ? !!manager.getEffect(layer.id) : false;
      if (!hasRef || !managerHasEffect) {
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
  }, [actualLayers, baseParameterValues]);
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
    const stemMap = new Map(actualAudioAnalysisData.map(a => [a.stemType, a.fileMetadataId]));
    const fileId = actualAudioAnalysisData.find((a) => a.stemType === 'master')?.fileMetadataId;
    const audioData = extractAudioDataAtTime(
      actualAudioAnalysisData as unknown as CachedAudioAnalysisData[],
      fileId || 'unknown',
      time,
      'master',
    );
    if (frame === 0) {
      console.log('[MAPPING DEBUG] mappings:', mappings);
      console.log('[MAPPING DEBUG] actualLayers:', actualLayers.map(l => l.id));
      console.log('[MAPPING DEBUG] audioAnalysisData:', actualAudioAnalysisData.length, 'entries');
    }
    if (mappings && Object.keys(mappings).length > 0) {
      const getSliderMax = (p: string): number => {
        const paramMaxMap: Record<string, number> = {
          opacity: 1.0,
          scale: 1.0,
          baseRadius: 1.0,
          threshold: 1.0,
          triggerValue: 1.0,
          contrast: 2.0,
          gamma: 2.2,
          rotation: 360,
          speed: 100,
        };
        return paramMaxMap[p] ?? 100;
      };
      Object.entries(mappings).forEach(([paramKey, mapping]) => {
        if (!mapping?.featureId) return;
        const parsed = parseParamKey(paramKey);
        if (!parsed) return;
        const { effectInstanceId: layerId, paramName } = parsed;
        let baseValue = baseParameterValues?.[layerId]?.[paramName];
        if (baseValue === undefined)
          baseValue = actualLayers.find((l) => l.id === layerId)?.settings?.[paramName];
        if (baseValue === undefined) baseValue = 0;
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
        const featureStemType = mapping.featureId.split('-')[0] || 'master';
        const targetFileId = stemMap.get(featureStemType) || fileId || 'unknown';
        const rawValue = getFeatureValueFromCached(
          actualAudioAnalysisData as unknown as CachedAudioAnalysisData[],
          targetFileId,
          mapping.featureId,
          time,
          undefined,
          featureDecayTimes,
          featureSensitivities,
          frame,
        );
        const maxValue = getSliderMax(paramName);
        const knob = Math.max(-0.5, Math.min(0.5, (mapping.modulationAmount ?? 0.5) * 2 - 1));
        const delta = rawValue * knob * maxValue;
        const finalValue = Math.max(0, Math.min(maxValue, baseValue + delta));
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
    visualizerManagerRef.current.update(frame, fps);
    visualizerManagerRef.current.getCompositor().render();
    if (canvasRef.current) {
      const gl = canvasRef.current.getContext('webgl2') || canvasRef.current.getContext('webgl');
      if (gl) {
        gl.flush();
        gl.finish();
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
```

## File: apps/web/src/app/creative-visualizer/page.tsx
```typescript
'use client';
import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Zap, Palette, Settings2, Eye, EyeOff, Info, Map as MapIcon, Download } from 'lucide-react';
import { ThreeVisualizer } from '@/components/midi/three-visualizer';
import { EffectsLibrarySidebar, EffectUIData } from '@/components/ui/EffectsLibrarySidebar';
import { CollapsibleEffectsSidebar } from '@/components/layout/collapsible-effects-sidebar';
import { FileSelector } from '@/components/midi/file-selector';
import { MIDIData, VisualizationSettings, DEFAULT_VISUALIZATION_SETTINGS } from '@/types/midi';
import { VisualizationPreset, StemVisualizationMapping } from '@/types/stem-visualization';
import { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { trpc } from '@/lib/trpc';
import { CollapsibleSidebar } from '@/components/layout/collapsible-sidebar';
import { ProjectPickerModal } from '@/components/projects/project-picker-modal';
import { debugLog } from '@/lib/utils';
import { ProjectCreationModal } from '@/components/projects/project-creation-modal';
import { useStemAudioController } from '@/hooks/use-stem-audio-controller';
import { useAudioAnalysis } from '@/hooks/use-audio-analysis';
import { PortalModal } from '@/components/ui/portal-modal';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MappingSourcesPanel } from '@/components/ui/MappingSourcesPanel';
import { DroppableParameter } from '@/components/ui/droppable-parameter';
import { useTimelineStore } from '@/stores/timelineStore';
import { UnifiedTimeline } from '@/components/video-composition/UnifiedTimeline';
import type { Layer } from '@/types/video-composition';
import { useFeatureValue } from '@/hooks/use-feature-value';
import { HudOverlayRenderer } from '@/components/hud/HudOverlayManager';
import { AspectRatioSelector } from '@/components/ui/aspect-ratio-selector';
import { getAspectRatioConfig } from '@/lib/visualizer/aspect-ratios';
import { useProjectSettingsStore } from '@/stores/projectSettingsStore';
import { useVisualizerStore } from '@/stores/visualizerStore';
import { makeParamKey, parseParamKey } from '@/lib/visualizer/paramKeys';
import { CollectionManager } from '@/components/assets/CollectionManager';
import { AutoSaveProvider, useAutoSaveContext } from '@/components/auto-save/auto-save-provider';
import { AutoSaveIndicator } from '@/components/auto-save/auto-save-indicator';
import { AutoSaveTopBar } from '@/components/auto-save/auto-save-top-bar';
import { getProjectExportPayload } from '@/lib/export-utils';
const EffectsLibrarySidebarWithHud: React.FC<{
  effects: any[];
  selectedEffects: Record<string, boolean>;
  onEffectToggle: (effectId: string) => void;
  onEffectDoubleClick: (effectId: string) => void;
  isVisible: boolean;
  stemUrlsReady: boolean;
  editingEffectId?: string | null;
  editingEffectInstance?: {
    id: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
  } | null;
  activeSliderValues?: Record<string, Record<string, any>>;
  baseParameterValues?: Record<string, Record<string, any>>;
  onParameterChange?: (effectId: string, paramName: string, value: any) => void;
  onBack?: () => void;
  mappings?: Record<string, { featureId: string | null; modulationAmount: number }>;
  featureNames?: Record<string, string>;
  onMapFeature?: (parameterId: string, featureId: string, stemType?: string) => void;
  onUnmapFeature?: (parameterId: string) => void;
  onModulationAmountChange?: (parameterId: string, amount: number) => void;
  projectId?: string;
  availableFiles?: any[];
  activeCollectionId?: string;
  setActiveCollectionId?: (id: string | undefined) => void;
  modulatedParameterValues?: Record<string, number>;
  layers?: Layer[];
  setActiveParam?: (effectId: string, paramName: string, value: any) => void;
  aspectRatio?: string;
  masterStemId?: string | null;
  availableStems?: Array<{ id: string; file_name: string; stem_type?: string; is_master?: boolean }>;
  onLayerUpdate?: (layerId: string, updates: Partial<Layer>) => void;
}> = ({
  effects,
  selectedEffects,
  onEffectToggle,
  onEffectDoubleClick,
  isVisible,
  stemUrlsReady,
  editingEffectId,
  editingEffectInstance,
  activeSliderValues,
  baseParameterValues,
  onParameterChange,
  onBack,
  mappings,
  featureNames,
  onMapFeature,
  onUnmapFeature,
  onModulationAmountChange,
  projectId,
  availableFiles,
  activeCollectionId,
  setActiveCollectionId,
  modulatedParameterValues,
  layers: layersProp,
  setActiveParam,
  aspectRatio = 'mobile',
  masterStemId,
  availableStems,
  onLayerUpdate
}) => {
  const { addLayer, duration, layers } = useTimelineStore((state) => ({
    addLayer: state.addLayer,
    duration: state.duration,
    layers: state.layers,
  }));
  const overlayCount = layers.filter((l) => l.type === 'overlay').length;
  const handleEffectDoubleClick = (effectId: string) => {
    if (!stemUrlsReady) {
      debugLog.warn('[EffectsLibrarySidebarWithHud] Overlay creation blocked: stem URLs not ready');
      return;
    }
    const effect = effects.find(e => e.id === effectId);
    if (effect && effect.category === 'Overlays') {
      const overlayTypeMap: Record<string, string> = {
        'waveform': 'waveform',
        'spectrogram': 'spectrogram',
        'peakMeter': 'peakMeter',
        'stereometer': 'stereometer',
        'oscilloscope': 'oscilloscope',
        'spectrumAnalyzer': 'spectrumAnalyzer',
        'vuMeter': 'vuMeter',
        'chromaWheel': 'chromaWheel',
        'consoleFeed': 'consoleFeed',
      };
      const overlayType = overlayTypeMap[effectId];
      if (overlayType) {
        debugLog.log('🎯 Adding HUD overlay to timeline:', overlayType, 'with master stem:', masterStemId);
        const overlayWidthPct = 40;
        const overlayHeightPct = 25;
        const paddingPct = 5;
        const offsetStepPct = 8;
        const posXPct = paddingPct + (overlayCount * offsetStepPct) % (100 - overlayWidthPct - paddingPct * 2);
        const posYPct = paddingPct + (overlayCount * offsetStepPct) % (100 - overlayHeightPct - paddingPct * 2);
        const newOverlayId = `overlay-${Date.now()}`;
        const newLayer: Layer = {
          id: newOverlayId,
          name: `Overlay ${overlayCount + 1}`,
          type: 'overlay',
          effectType: overlayType as any,
          src: '',
          position: { x: posXPct, y: posYPct },
          scale: { x: overlayWidthPct, y: overlayHeightPct }, // Percentages!
          rotation: 0,
          opacity: 1,
          audioBindings: [],
          midiBindings: [],
          zIndex: 0,
          blendMode: 'normal',
          startTime: 0,
          endTime: duration,
          duration,
          settings: {
            stemId: masterStemId || undefined,
          },
        };
        addLayer(newLayer);
        onEffectDoubleClick(newOverlayId);
        return;
      }
    }
    onEffectDoubleClick(effectId);
  };
  const editingEffect = editingEffectId ? effects.find(e => e.id === editingEffectId) : null;
  return (
    <EffectsLibrarySidebar
      effects={effects}
      selectedEffects={selectedEffects}
      onEffectToggle={onEffectToggle}
      onEffectDoubleClick={handleEffectDoubleClick}
      isVisible={isVisible}
      editingEffectId={editingEffectId}
      editingEffect={editingEffect}
      editingEffectInstance={editingEffectInstance}
      activeSliderValues={activeSliderValues}
      baseParameterValues={baseParameterValues}
      onParameterChange={onParameterChange}
      onBack={onBack}
      mappings={mappings}
      featureNames={featureNames}
      onMapFeature={onMapFeature}
      onUnmapFeature={onUnmapFeature}
      onModulationAmountChange={onModulationAmountChange}
      projectId={projectId}
      availableFiles={availableFiles}
      activeCollectionId={activeCollectionId}
      setActiveCollectionId={setActiveCollectionId}
      modulatedParameterValues={modulatedParameterValues}
      layers={layersProp || layers}
      setActiveParam={setActiveParam}
      availableStems={availableStems}
      masterStemId={masterStemId}
      onLayerUpdate={onLayerUpdate}
    />
  );
};
const createSampleMIDIData = (): MIDIData => {
  const notes: any[] = [];
  const melodyPattern = [60, 64, 67, 72, 69, 65, 62, 60, 67, 64, 69, 72, 74, 67, 64, 60];
  for (let i = 0; i < melodyPattern.length; i++) {
    notes.push({
      id: `melody-${i}`,
      start: i * 0.5,
      duration: 0.4,
      pitch: melodyPattern[i],
      velocity: 60 + Math.random() * 40,
      track: 'melody',
      noteName: `Note${melodyPattern[i]}`,
    });
  }
  const chordTimes = [2, 4, 6, 8];
  chordTimes.forEach((time, idx) => {
    const chordNotes = [48, 52, 55];
    chordNotes.forEach((note, noteIdx) => {
      notes.push({
        id: `chord-${idx}-${noteIdx}`,
        start: time,
        duration: 1.5,
        pitch: note,
        velocity: 40 + Math.random() * 30,
        track: 'melody',
        noteName: `Chord${note}`,
      });
    });
  });
  return {
    file: {
      name: 'Creative Demo.mid',
      size: 1024,
      duration: 10.0,
      ticksPerQuarter: 480,
      timeSignature: [4, 4],
      keySignature: 'C Major'
    },
    tracks: [
      { id: 'melody', name: 'Synth Lead', instrument: 'Synthesizer', channel: 1, color: '#84a98c', visible: true, notes: notes },
      { id: 'bass', name: 'Bass Synth', instrument: 'Bass', channel: 2, color: '#6b7c93', visible: true, notes: [
          { id: 'b1', start: 0.0, duration: 1.0, pitch: 36, velocity: 100, track: 'bass', noteName: 'C2' },
          { id: 'b2', start: 1.0, duration: 1.0, pitch: 40, velocity: 95, track: 'bass', noteName: 'E2' },
          { id: 'b3', start: 2.0, duration: 1.0, pitch: 43, velocity: 90, track: 'bass', noteName: 'G2' },
          { id: 'b4', start: 3.0, duration: 1.0, pitch: 48, velocity: 85, track: 'bass', noteName: 'C3' },
          { id: 'b5', start: 4.0, duration: 2.0, pitch: 36, velocity: 100, track: 'bass', noteName: 'C2' },
        ]
      },
      { id: 'drums', name: 'Drums', instrument: 'Drum Kit', channel: 10, color: '#b08a8a', visible: true, notes: [
          { id: 'd1', start: 0.0, duration: 0.1, pitch: 36, velocity: 120, track: 'drums', noteName: 'Kick' },
          { id: 'd2', start: 0.5, duration: 0.1, pitch: 42, velocity: 80, track: 'drums', noteName: 'HiHat' },
          { id: 'd3', start: 1.0, duration: 0.1, pitch: 38, velocity: 100, track: 'drums', noteName: 'Snare' },
          { id: 'd4', start: 1.5, duration: 0.1, pitch: 42, velocity: 70, track: 'drums', noteName: 'HiHat' },
          { id: 'd5', start: 2.0, duration: 0.1, pitch: 36, velocity: 127, track: 'drums', noteName: 'Kick' },
          { id: 'd6', start: 2.5, duration: 0.1, pitch: 42, velocity: 85, track: 'drums', noteName: 'HiHat' },
          { id: 'd7', start: 3.0, duration: 0.1, pitch: 38, velocity: 110, track: 'drums', noteName: 'Snare' },
          { id: 'd8', start: 3.5, duration: 0.1, pitch: 42, velocity: 75, track: 'drums', noteName: 'HiHat' },
        ]
      }
    ],
    tempoChanges: [
      { tick: 0, bpm: 120, microsecondsPerQuarter: 500000 }
    ]
  };
};
const transformBackendToFrontendMidiData = (backendData: any): MIDIData => {
  return {
    file: {
      name: backendData.file.name,
      size: backendData.file.size,
      duration: backendData.file.duration,
      ticksPerQuarter: backendData.file.ticksPerQuarter,
      timeSignature: backendData.file.timeSignature,
      keySignature: backendData.file.keySignature
    },
    tracks: backendData.tracks.map((track: any) => ({
      id: String(track.id),
      name: track.name,
      instrument: track.instrument,
      channel: track.channel,
      color: track.color,
      visible: true,
      notes: track.notes.map((note: any) => ({
        id: note.id,
        start: note.startTime,
        duration: note.duration,
        pitch: note.note,
        velocity: note.velocity,
        track: String(track.id),
        noteName: note.name,
      }))
    })),
    tempoChanges: backendData.tempoChanges
  };
};
function CreativeVisualizerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [useDemoData, setUseDemoData] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [settings, setSettings] = useState<VisualizationSettings>(DEFAULT_VISUALIZATION_SETTINGS);
  const {
    layers,
    currentTime,
    isPlaying,
    selectedLayerId,
    addLayer,
    updateLayer,
    deleteLayer,
    selectLayer,
    setCurrentTime,
    setDuration,
    togglePlay,
    setPlaying,
  } = useTimelineStore();
  const [fps, setFps] = useState(60);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<VisualizationPreset>({
    id: 'default',
    name: 'Default',
    description: 'Default visualization preset',
    category: 'custom',
    tags: ['default'],
    mappings: {},
    defaultSettings: {
      masterIntensity: 1.0,
      transitionSpeed: 1.0,
      backgroundAlpha: 0.1,
      particleCount: 100,
      qualityLevel: 'medium'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    usageCount: 0
  });
  const {
    selectedEffects,
    setSelectedEffects,
    aspectRatio: visualizerAspectRatio,
    setAspectRatio: setVisualizerAspectRatio,
    mappings,
    setMappings,
    baseParameterValues,
    activeSliderValues,
    setBaseParameterValues,
    setActiveSliderValues,
    setBaseParam,
    setActiveParam
  } = useVisualizerStore();
  const [openEffectModals, setOpenEffectModals] = useState<Record<string, boolean>>({
    'metaballs': false,
    'particleNetwork': false
  });
  const [editingEffectId, setEditingEffectId] = useState<string | null>(null);
  const [featureNames, setFeatureNames] = useState<Record<string, string>>({});
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | undefined>();
  const [modulatedParameterValues, setModulatedParameterValues] = useState<Record<string, number>>({});
  const previousLayerIdsRef = useRef<string[]>([]);
  useEffect(() => {
    const prevIds = previousLayerIdsRef.current;
    const currentIds = layers.map(l => l.id);
    const removedIds =
      prevIds.length === 0
        ? currentIds.length === 0
          ? []
          : Object.keys(mappings)
              .map(key => parseParamKey(key)?.effectInstanceId)
              .filter((id): id is string => !!id && !currentIds.includes(id))
        : prevIds.filter(id => !currentIds.includes(id));
    if (removedIds.length > 0) {
      setMappings(prev => {
        let mutated = false;
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          const parsed = parseParamKey(key);
          if (parsed && removedIds.includes(parsed.effectInstanceId)) {
            delete next[key];
            mutated = true;
          }
        });
        return mutated ? next : prev;
      });
      setBaseParameterValues(prev => {
        let mutated = false;
        const next = { ...prev };
        removedIds.forEach(id => {
          if (id in next) {
            delete next[id];
            mutated = true;
          }
        });
        return mutated ? next : prev;
      });
      setActiveSliderValues(prev => {
        let mutated = false;
        const next = { ...prev };
        removedIds.forEach(id => {
          if (id in next) {
            delete next[id];
            mutated = true;
          }
        });
        return mutated ? next : prev;
      });
    }
    previousLayerIdsRef.current = currentIds;
  }, [layers, setMappings, setBaseParameterValues, setActiveSliderValues]);
  const [syncOffsetMs, setSyncOffsetMs] = useState(0);
  const [syncMetrics, setSyncMetrics] = useState({
    audioLatency: 0,
    visualLatency: 0,
    syncDrift: 0,
    frameTime: 0,
    lastUpdate: 0
  });
  const [sampleMidiData] = useState<MIDIData>(createSampleMIDIData());
  const stemAudio = useStemAudioController();
  const audioAnalysis = useAudioAnalysis();
  useEffect(() => {
    if (!isPlaying) return;
    const updateSyncMetrics = () => {
      const now = performance.now();
      const audioTime = stemAudio.currentTime;
      const visualTime = currentTime;
      const audioLatency = stemAudio.getAudioLatency ? stemAudio.getAudioLatency() * 1000 : 0;
      const frameTime = now - syncMetrics.lastUpdate;
      setSyncMetrics({
        audioLatency,
        visualLatency: frameTime,
        syncDrift: Math.abs(audioTime - visualTime) * 1000,
        frameTime,
        lastUpdate: now
      });
    };
    const interval = setInterval(updateSyncMetrics, 100);
    return () => clearInterval(interval);
  }, [isPlaying, stemAudio.currentTime, currentTime, syncMetrics.lastUpdate]);
  const [showPicker, setShowPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isLoadingStemsRef = useRef(false);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const currentAnalysisRef = useRef(audioAnalysis.cachedAnalysis);
  useEffect(() => {
    currentAnalysisRef.current = audioAnalysis.cachedAnalysis;
  }, [audioAnalysis.cachedAnalysis]);
  const getDownloadUrlMutation = trpc.file.getDownloadUrl.useMutation();
  const fetchQueueRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);
  const fetchedIdsRef = useRef<Set<string>>(new Set());
  const {
    data: projectData,
    isLoading: projectLoading,
    error: projectError
  } = trpc.project.get.useQuery(
    { id: currentProjectId! },
    { enabled: !!currentProjectId }
  );
  const {
    data: projectFiles,
    isLoading: projectFilesLoading
  } = trpc.file.getUserFiles.useQuery(
    {
      limit: 1000,
      fileType: 'all',
      projectId: currentProjectId || undefined
    },
    { enabled: !!currentProjectId }
  );
  const {
    data: projectAudioFiles
  } = trpc.file.getUserFiles.useQuery(
    {
      limit: 1000,
      fileType: 'audio',
      projectId: currentProjectId || undefined
    },
    { enabled: !!currentProjectId }
  );
  const {
    data: fileData,
    isLoading: fileLoading,
    error: fileError
  } = trpc.midi.getVisualizationData.useQuery(
    { fileId: selectedFileId! },
    { enabled: !!selectedFileId && !useDemoData }
  );
  useEffect(() => {
    const fileId = searchParams.get('fileId');
    const projectId = searchParams.get('projectId');
    if (projectId) {
      setCurrentProjectId(projectId);
      setUseDemoData(false);
    }
    if (fileId) {
      setSelectedFileId(fileId);
      setUseDemoData(false);
    }
    if (!projectId && !fileId) {
      setUseDemoData(true);
    }
    const projectIdFromParams = searchParams.get('projectId');
    if (!projectIdFromParams) {
      setShowPicker(true);
    } else {
      setShowPicker(false);
    }
    setIsInitialized(true);
  }, [searchParams]);
  useEffect(() => {
    if (!projectFiles?.files || !isInitialized || layers.length === 0) return;
    const refreshAssets = () => {
      let updatesMade = false;
      const files = projectFiles.files;
      const fileIdMap = new Map(files.map(f => [f.id, f.downloadUrl]));
      const updatedLayers = layers.map(layer => {
        if (layer.effectType === 'imageSlideshow' && layer.settings?.images?.length > 0) {
          const currentImages = layer.settings.images as string[];
          let newImages: string[] = [];
          let layerModified = false;
          if (layer.settings.collectionId) {
            const collectionFiles = files.filter(f => f.collection_id === layer.settings.collectionId && f.downloadUrl);
            if (collectionFiles.length > 0) {
              newImages = collectionFiles.map(f => f.downloadUrl) as string[];
              if (JSON.stringify(newImages) !== JSON.stringify(currentImages)) {
                debugLog.log('🔄 Strategy 0 (Collection) matched for layer', layer.id);
                layerModified = true;
              }
            }
          }
          if (!layerModified && layer.settings.imageIds && Array.isArray(layer.settings.imageIds)) {
            newImages = layer.settings.imageIds.map((id: string) => fileIdMap.get(id)).filter(Boolean) as string[];
            if (newImages.length > 0 && JSON.stringify(newImages) !== JSON.stringify(currentImages)) {
              debugLog.log('🔄 Strategy 1 (IDs) matched for layer', layer.id);
              layerModified = true;
            }
          }
          if (!layerModified && (!newImages || newImages.length === 0)) {
            newImages = currentImages.map(url => {
              if (!url.includes('cloudflarestorage') && !url.includes('phonoglyph')) return url;
              const urlFilename = url.split('?')[0].split('/').pop();
              if (!urlFilename) return url;
              const found = files.find(f => {
                if (!f.downloadUrl) return false;
                const fileFilename = f.downloadUrl.split('?')[0].split('/').pop();
                return fileFilename && (fileFilename.includes(urlFilename) || urlFilename.includes(fileFilename));
              });
              return (found && found.downloadUrl) ? found.downloadUrl : url;
            });
            if (JSON.stringify(newImages) !== JSON.stringify(currentImages)) {
              debugLog.log('🔄 Strategy 2 (Filename) matched for layer', layer.id);
              layerModified = true;
            }
          }
          if (layerModified && newImages.length > 0) {
            updatesMade = true;
            return {
              ...layer,
              settings: {
                ...layer.settings,
                images: newImages
              }
            };
          }
        }
        return layer;
      });
      if (updatesMade) {
        debugLog.log('✅ Asset Refresher applied updates to layers');
        updatedLayers.forEach(l => {
          const original = layers.find(old => old.id === l.id);
          if (original && JSON.stringify(original.settings) !== JSON.stringify(l.settings)) {
            updateLayer(l.id, { settings: l.settings });
          }
        });
      }
    };
    const timer = setTimeout(refreshAssets, 100);
    return () => clearTimeout(timer);
  }, [projectFiles?.files, isInitialized, layers.length, updateLayer]);
  function sortStemsWithMasterLast(stems: any[]) {
    return [...stems].sort((a, b) => {
      if (a.is_master && !b.is_master) return 1;
      if (!a.is_master && b.is_master) return -1;
      return 0;
    });
  }
  useEffect(() => {
    if (projectAudioFiles?.files && currentProjectId && isInitialized && !audioAnalysis.isLoading) {
      let cancelled = false;
      const loadStemsWithUrls = async () => {
        if (isLoadingStemsRef.current) return;
        isLoadingStemsRef.current = true;
        try {
          const audioFiles = projectAudioFiles.files.filter(file =>
            file.file_type === 'audio' && file.upload_status === 'completed'
          );
          if (audioFiles.length > 0) {
            debugLog.log('Found audio files, preparing to load:', audioFiles.map(f => f.file_name));
            debugLog.log('Master stem info:', audioFiles.map(f => ({ name: f.file_name, is_master: f.is_master })));
            debugLog.log('Audio file structure sample:', audioFiles[0]);
            const sortedAudioFiles = sortStemsWithMasterLast(audioFiles.map(f => ({
              ...f,
              stemType: f.stem_type || getStemTypeFromFileName(f.file_name)
            })));
            const stemsToLoad = await Promise.all(
              sortedAudioFiles.map(async file => {
                if (!file.id) {
                  debugLog.error('File missing ID:', file);
                  throw new Error(`File missing ID: ${file.file_name}`);
                }
                debugLog.log('Getting download URL for file:', { id: file.id, name: file.file_name });
                const result = await getDownloadUrlMutation.mutateAsync({ fileId: file.id });
                return {
                  id: file.id,
                  url: result.downloadUrl,
                  label: file.file_name,
                  isMaster: file.is_master || false,
                  stemType: file.stemType
                };
              })
            );
            if (!cancelled) {
              const nonMasterStems = stemsToLoad.filter(s => !s.isMaster);
              const masterStems = stemsToLoad.filter(s => s.isMaster);
              await stemAudio.loadStems(nonMasterStems, (stemId, audioBuffer) => {
                const stem = nonMasterStems.find(s => s.id === stemId);
                const currentAnalysis = currentAnalysisRef.current;
                const hasAnalysis = currentAnalysis.some(a => a.fileMetadataId === stemId);
                debugLog.log('🎵 Stem loaded callback:', {
                  stemId,
                  stemType: stem?.stemType,
                  hasAnalysis,
                  cachedAnalysisCount: currentAnalysis.length,
                  cachedAnalysisIds: currentAnalysis.map(a => a.fileMetadataId)
                });
                if (stem && !hasAnalysis) {
                  debugLog.log('🎵 Triggering analysis for stem:', stemId, stem.stemType);
                  audioAnalysis.analyzeAudioBuffer(stemId, audioBuffer, stem.stemType);
                } else {
                  debugLog.log('🎵 Skipping analysis for stem:', stemId, 'reason:', !stem ? 'no stem found' : 'analysis already exists');
                }
              });
              if (masterStems.length > 0) {
                await stemAudio.loadStems(masterStems, (stemId, audioBuffer) => {
                  const stem = masterStems.find(s => s.id === stemId);
                  const currentAnalysis = currentAnalysisRef.current;
                  const hasAnalysis = currentAnalysis.some(a => a.fileMetadataId === stemId);
                  debugLog.log('🎵 Master stem loaded callback:', {
                    stemId,
                    stemType: stem?.stemType,
                    hasAnalysis,
                    cachedAnalysisCount: currentAnalysis.length,
                    cachedAnalysisIds: currentAnalysis.map(a => a.fileMetadataId)
                  });
                  if (stem && !hasAnalysis) {
                    debugLog.log('🎵 Triggering analysis for master stem:', stemId, stem.stemType);
                    audioAnalysis.analyzeAudioBuffer(stemId, audioBuffer, stem.stemType);
                  } else {
                    debugLog.log('🎵 Skipping analysis for master stem:', stemId, 'reason:', !stem ? 'no stem found' : 'analysis already exists');
                  }
                });
              }
            }
          } else {
            debugLog.log('No completed audio files found in project.');
          }
        } catch (error) {
          if (!cancelled) {
            debugLog.error('Failed to load stems:', error);
          }
        } finally {
          if (!cancelled) {
            isLoadingStemsRef.current = false;
          }
        }
      };
      loadStemsWithUrls();
      return () => {
        cancelled = true;
        isLoadingStemsRef.current = false;
      };
    }
  }, [projectAudioFiles?.files, currentProjectId, isInitialized, audioAnalysis.isLoading]);
  const availableStems = projectAudioFiles?.files?.filter(file =>
    file.file_type === 'audio' && file.upload_status === 'completed'
  ) || [];
  useEffect(() => {
    const idsToLoad = new Set(availableStems.map(s => s.id));
    layers.forEach(layer => {
      if (layer.type === 'overlay') {
        const s = (layer as any).settings;
        const stemId = s?.stemId || s?.stem?.id;
        if (stemId) idsToLoad.add(stemId);
      }
    });
    const uniqueIds = Array.from(idsToLoad);
    if (uniqueIds.length > 0) {
      audioAnalysis.loadAnalysis(uniqueIds);
    }
  }, [availableStems.length, layers.length]);
  const midiData = useDemoData ? sampleMidiData : (fileData?.midiData ? transformBackendToFrontendMidiData(fileData.midiData) : undefined);
  const visualizationSettings = useDemoData ? DEFAULT_VISUALIZATION_SETTINGS : (fileData?.settings || DEFAULT_VISUALIZATION_SETTINGS);
  const handleFileSelected = (fileId: string) => {
    setSelectedFileId(fileId);
    setUseDemoData(false);
    setCurrentTime(0);
    setPlaying(false);
    const params = new URLSearchParams(searchParams);
    params.set('fileId', fileId);
    router.push(`/creative-visualizer?${params.toString()}`, { scroll: false });
  };
  const handleDemoModeChange = useCallback((demoMode: boolean) => {
    setUseDemoData(demoMode);
    setCurrentTime(0);
    setPlaying(false);
    if (demoMode) {
      const params = new URLSearchParams(searchParams);
      params.delete('fileId');
      const newUrl = params.toString() ? `/creative-visualizer?${params.toString()}` : '/creative-visualizer';
      router.push(newUrl, { scroll: false });
    }
  }, [searchParams, router]);
  const handlePlayPause = async () => {
    if (isPlaying) {
      stemAudio.pause();
      setPlaying(false);
    } else {
      if (hasStems) {
        try {
          await stemAudio.play();
          setPlaying(true);
        } catch (error) {
          debugLog.error('Failed to start audio playback:', error);
          setPlaying(false);
        }
      } else {
        setPlaying(true);
      }
    }
  };
  const handleReset = () => {
    stemAudio.stop();
    setPlaying(false);
    setCurrentTime(0);
  };
  const triggerRenderMutation = trpc.render.triggerRender.useMutation();
  const getStatus = trpc.render.getRenderStatus.useMutation();
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const handleExport = async () => {
    if (!currentProjectId) {
      alert('No project selected. Please select a project first.');
      return;
    }
    if (!projectFiles?.files) {
      alert('No files found in project.');
      return;
    }
    try {
      setIsRendering(true);
      setRenderProgress(0);
      const payload = getProjectExportPayload(
        currentProjectId,
        audioAnalysis.cachedAnalysis || [],
        projectFiles.files,
        asyncStemUrlMap
      );
      console.log('Export Payload:', payload);
      const result = await triggerRenderMutation.mutateAsync(payload);
      console.log('Render result:', result);
      const { renderId, bucketName } = result;
      while (true) {
        await new Promise(r => setTimeout(r, 5000));
        try {
          const status = await getStatus.mutateAsync({ renderId, bucketName });
          const progressPercent = Math.round((status.overallProgress || 0) * 100);
          setRenderProgress(progressPercent);
          if (status.fatalErrorEncountered) {
            throw new Error('Render failed with a fatal error');
          }
          if (status.done && status.outputFile) {
            setIsDownloadReady(true);
            const link = document.createElement('a');
            link.href = status.outputFile;
            link.download = 'render.mp4';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            await new Promise(r => setTimeout(r, 2000));
            setIsRendering(false);
            setRenderProgress(0);
            setIsDownloadReady(false);
            break;
          }
        } catch (error) {
          console.warn('Polling error, retrying...', error);
          continue;
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsRendering(false);
      setRenderProgress(0);
      setIsDownloadReady(false);
    }
  };
  const handleProjectSelect = (projectId: string) => {
    setCurrentProjectId(projectId);
    setShowPicker(false);
    const params = new URLSearchParams(searchParams);
    params.set('projectId', projectId);
    router.push(`/creative-visualizer?${params.toString()}`);
  };
  const handleCreateNew = () => {
    setShowPicker(false);
    setShowCreateModal(true);
  };
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };
  const hasStems = availableStems.length > 0 && stemAudio.stemsLoaded;
  const stemLoadingState = availableStems.length > 0 && !stemAudio.stemsLoaded;
  const effects: EffectUIData[] = [
    {
      id: 'metaballs',
      name: 'Metaballs Effect',
      description: 'Organic, fluid-like visualizations that respond to audio intensity',
      category: 'Generative',
      rarity: 'Rare',
      image: '/effects/generative/metaballs.png',
      parameters: {}
    },
    {
      id: 'particleNetwork',
      name: 'Particle Effect',
      description: 'Dynamic particle systems that react to rhythm and pitch',
      category: 'Generative',
      rarity: 'Mythic',
      image: '/effects/generative/particles.png',
      parameters: {}
    },
    {
      id: 'imageSlideshow',
      name: 'Image Slideshow',
      description: 'Rhythmic image slideshow triggered by audio transients',
      category: 'Generative',
      rarity: 'Common',
      image: '/effects/generative/imageSlideshow.png',
      parameters: {
         triggerValue: 0,
         threshold: 0.5,
         opacity: 1.0,
         position: { x: 0.5, y: 0.5 },
         size: { width: 1.0, height: 1.0 },
         images: []
      }
    },
    {
      id: 'asciiFilter',
      name: 'ASCII Filter',
      description: 'Converts input to ASCII art with audio-reactive parameters',
      category: 'Stylize',
      rarity: 'Rare',
      parameters: {
        textSize: 0.4,
        gamma: 1.2,
        opacity: 0.87,
        contrast: 1.4,
        invert: 0.0,
        hideBackground: false,
        color: [1.0, 1.0, 1.0]
      }
    },
    {
      id: 'chromaticAbberation',
      name: 'Chromatic Abberation',
      description: 'RGB color channel offset for lens distortion effect',
      category: 'Stylize',
      rarity: 'Common',
      parameters: {
        amount: 0.2,
        direction: 0.0
      }
    },
    {
      id: 'crt',
      name: 'CRT Monitor',
      description: 'Vintage CRT monitor effect with phosphors and scanlines',
      category: 'Stylize',
      rarity: 'Rare',
      parameters: {
        curvature: 0.0,
        scanlines: 0.5,
        vignetteIntensity: 0.5,
        noise: 0.5
      }
    },
    {
      id: 'dither',
      name: 'Dither',
      description: 'Ordered dithering for retro pixelart look',
      category: 'Stylize',
      rarity: 'Common',
      parameters: {
        bayerMatrix: 4,
        colors: 16,
        scale: 1.0
      }
    },
    {
      id: 'glitch',
      name: 'Digital Glitch',
      description: 'VHS-style digital glitch with corruption and aberration',
      category: 'Stylize',
      rarity: 'Rare',
      parameters: {
        blockSize: 0.5,
        offset: 0.5,
        chromatic: 0.5,
        frequency: 0.5
      }
    },
    {
      id: 'grain',
      name: 'Film Grain',
      description: 'Adds film grain noise for vintage look',
      category: 'Stylize',
      rarity: 'Common',
      parameters: {
        amount: 0.5,
        size: 1.0,
        colorized: false,
        luminance: false
      }
    },
    {
      id: 'halftone',
      name: 'Halftone',
      description: 'CMYK halftone printing effect',
      category: 'Stylize',
      rarity: 'Rare',
      parameters: {
        dotSize: 0.75,
        angle: 0.0,
        shape: 'circle',
        smoothness: 0.75
      }
    },
    {
      id: 'pixelate',
      name: 'Pixelate',
      description: 'Mosaic pixelation effect',
      category: 'Stylize',
      rarity: 'Common',
      parameters: {
        pixelSize: 0.5,
        shape: 'square'
      }
    },
    {
      id: 'posterize',
      name: 'Posterize',
      description: 'Reduces color levels for poster art effect',
      category: 'Stylize',
      rarity: 'Common',
      parameters: {
        levels: 8,
        gamma: 1.0
      }
    },
    {
      id: 'blur',
      name: 'Gaussian Blur',
      description: 'Smooth Gaussian blur with configurable intensity',
      category: 'Blur',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        radius: 5.0,
        quality: 1.0
      }
    },
    {
      id: 'radialBlur',
      name: 'Radial Blur',
      description: 'Rotational blur around a center point',
      category: 'Blur',
      rarity: 'Rare',
      parameters: {
        intensity: 0.4,
        centerX: 0.5,
        centerY: 0.5,
        angle: 10.0
      }
    },
    {
      id: 'bokeh',
      name: 'Bokeh Blur',
      description: 'Depth-of-field bokeh blur effect',
      category: 'Blur',
      rarity: 'Mythic',
      parameters: {
        intensity: 0.5,
        focalDepth: 0.5,
        aperture: 0.8
      }
    },
    {
      id: 'diffusion',
      name: 'Diffusion',
      description: 'Soft diffusion glow effect',
      category: 'Blur',
      rarity: 'Rare',
      parameters: {
        intensity: 0.5,
        size: 1.5
      }
    },
    {
      id: 'fog',
      name: 'Fog',
      description: 'Animated fog effect with noise',
      category: 'Blur',
      rarity: 'Rare',
      parameters: {
        density: 0.3,
        speed: 0.5,
        color: [1.0, 1.0, 1.0]
      }
    },
    {
      id: 'progressiveBlur',
      name: 'Progressive Blur',
      description: 'Blur that increases with distance from center',
      category: 'Blur',
      rarity: 'Rare',
      parameters: {
        intensity: 0.6,
        centerX: 0.5,
        centerY: 0.5
      }
    },
    {
      id: 'bulge',
      name: 'Bulge',
      description: 'Bulge/pinch distortion effect',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.4
      }
    },
    {
      id: 'fbm',
      name: 'FBM Distortion',
      description: 'Fluid marble-like distortion using Fractal Brownian Motion',
      category: 'Distort',
      rarity: 'Rare',
      parameters: {
        intensity: 0.5,
        speed: 0.5,
        scale: 1.0
      }
    },
    {
      id: 'liquify',
      name: 'Liquify',
      description: 'Sine-based liquid distortion effect',
      category: 'Distort',
      rarity: 'Rare',
      parameters: {
        intensity: 0.5,
        frequency: 1.0,
        speed: 0.5
      }
    },
    {
      id: 'noise',
      name: 'BCC Noise',
      description: 'Body-Centered Cubic noise distortion',
      category: 'Distort',
      rarity: 'Rare',
      parameters: {
        intensity: 0.5,
        scale: 1.0,
        speed: 0.5
      }
    },
    {
      id: 'polar',
      name: 'Polar',
      description: 'Cartesian to polar coordinates transformation',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 1.0,
        rotation: 0.0,
        centerX: 0.5,
        centerY: 0.5
      }
    },
    {
      id: 'ripple',
      name: 'Ripple',
      description: 'Concentric ripple distortion',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.05,
        frequency: 10.0,
        speed: 1.0,
        centerX: 0.5,
        centerY: 0.5
      }
    },
    {
      id: 'sineWaves',
      name: 'Sine Waves',
      description: 'Sinusoidal wave distortion',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        frequency: 20.0,
        speed: 0.5,
        waveX: true,
        waveY: true
      }
    },
    {
      id: 'skybox',
      name: 'Skybox Projection',
      description: 'Equirectangular 360 projection',
      category: 'Distort',
      rarity: 'Rare',
      parameters: {
        fov: 90.0,
        rotationX: 0.5,
        rotationY: 0.5,
        zoom: 1.0
      }
    },
    {
      id: 'stretch',
      name: 'Stretch',
      description: 'Directional stretch/compression distortion',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        angle: 0.0,
        centerX: 0.5,
        centerY: 0.5
      }
    },
    {
      id: 'swirl',
      name: 'Swirl',
      description: 'Swirl/twist distortion effect',
      category: 'Distort',
      rarity: 'Rare',
      parameters: {
        intensity: 0.8,
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.4
      }
    },
    {
      id: 'trail',
      name: 'Trail',
      description: 'Motion trail / afterimage effect',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        decay: 0.9
      }
    },
    {
      id: 'waterRipples',
      name: 'Water Ripples',
      description: 'Water surface ripple simulation',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        speed: 1.0
      }
    },
    {
      id: 'waves',
      name: 'Noise Waves',
      description: 'Perlin noise wave distortion',
      category: 'Distort',
      rarity: 'Common',
      parameters: {
        intensity: 0.5,
        speed: 1.0
      }
    },
    {
      id: 'circle',
      name: 'Circle',
      description: 'Circular mask overlay',
      category: 'Misc',
      rarity: 'Common',
      parameters: {
        radius: 0.25,
        feather: 0.1,
        centerX: 0.5,
        centerY: 0.5,
        color: '#661aff',
        opacity: 1.0
      }
    },
    {
      id: 'glitter',
      name: 'Glitter',
      description: 'Voronoi-based sparkle effect',
      category: 'Misc',
      rarity: 'Rare',
      parameters: {
        intensity: 1.0,
        scale: 1.0,
        speed: 0.5
      }
    },
    {
      id: 'gradientFill',
      name: 'Gradient Fill',
      description: 'Two-color gradient fill overlay',
      category: 'Misc',
      rarity: 'Common',
      parameters: {
        color1: '#ff00ff',
        color2: '#00ffff',
        angle: 45.0,
        opacity: 1.0
      }
    },
    {
      id: 'noiseFill',
      name: 'Noise Fill',
      description: 'Procedural noise fill overlay',
      category: 'Misc',
      rarity: 'Common',
      parameters: {
        scale: 2.0,
        speed: 0.5,
        contrast: 1.0,
        opacity: 1.0
      }
    },
    {
      id: 'pattern',
      name: 'Pattern',
      description: 'Procedural pattern generator',
      category: 'Misc',
      rarity: 'Common',
      parameters: {
        scale: 1.0,
        speed: 0.5,
        contrast: 1.0,
        opacity: 1.0
      }
    },
    {
      id: 'replicate',
      name: 'Replicate',
      description: 'Trail and aberration effect',
      category: 'Misc',
      rarity: 'Rare',
      parameters: {
        spacing: 0.35,
        speed: 0.5,
        rotation: 0.0,
        opacity: 1.0
      }
    },
    {
      id: 'video',
      name: 'Video Overlay',
      description: 'Video texture overlay (requires video assignment)',
      category: 'Misc',
      rarity: 'Rare',
      parameters: {
        opacity: 1.0
      }
    },
    {
      id: 'wisps',
      name: 'Wisps',
      description: 'Flowing smoke/wisp effect',
      category: 'Misc',
      rarity: 'Common',
      parameters: {
        speed: 0.5,
        scale: 1.0,
        intensity: 1.0,
        color: '#ffffff'
      }
    },
    {
      id: 'beam',
      name: 'Beam',
      description: 'Animated scanning light beam',
      category: 'Light',
      rarity: 'Rare',
      parameters: {
        intensity: 1.0,
        speed: 0.5,
        width: 0.5,
        angle: 0.0,
        color: '#661aff'
      }
    },
    {
      id: 'bloom',
      name: 'Bloom',
      description: 'High-quality bloom effect',
      category: 'Light',
      rarity: 'Mythic',
      parameters: {
        intensity: 1.0,
        threshold: 0.5,
        radius: 1.0
      }
    },
    {
      id: 'godRays',
      name: 'God Rays',
      description: 'Volumetric light scattering',
      category: 'Light',
      rarity: 'Mythic',
      parameters: {
        intensity: 1.0,
        decay: 0.96,
        density: 0.5,
        weight: 0.4,
        lightX: 0.5,
        lightY: 0.5
      }
    },
    {
      id: 'lightTrail',
      name: 'Light Trail',
      description: 'Mouse/Touch light trail effect',
      category: 'Light',
      rarity: 'Rare',
      parameters: {
        intensity: 1.0,
        trailLength: 0.8,
        color: '#0082f7'
      }
    },
    {
      id: 'waterCaustics',
      name: 'Water Caustics',
      description: 'Water surface caustics simulation',
      category: 'Light',
      rarity: 'Rare',
      parameters: {
        intensity: 0.8,
        speed: 0.5,
        refraction: 0.5,
        color: '#99b3e6'
      }
    },
    {
      id: 'waveform',
      name: 'Waveform Overlay',
      description: 'Real-time audio waveform visualization',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    {
      id: 'spectrogram',
      name: 'Spectrogram Overlay',
      description: 'Frequency vs time visualization with color mapping',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    {
      id: 'peakMeter',
      name: 'Peak/LUFS Meter',
      description: 'Professional audio level metering with peak and LUFS measurements',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    {
      id: 'stereometer',
      name: 'Stereometer Overlay',
      description: 'Stereo field visualization and correlation meter',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    {
      id: 'oscilloscope',
      name: 'Oscilloscope Overlay',
      description: 'Real-time waveform oscilloscope with pitch tracking',
      category: 'Overlays',
      rarity: 'Mythic',
      parameters: {}
    },
    {
      id: 'spectrumAnalyzer',
      name: 'Spectrum Analyzer',
      description: 'FFT-based frequency spectrum visualization',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    {
      id: 'vuMeter',
      name: 'VU Meter',
      description: 'Classic VU meter with needle and bar styles',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    {
      id: 'chromaWheel',
      name: 'Chroma Wheel',
      description: '12-note chroma wheel for pitch class visualization',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    {
      id: 'consoleFeed',
      name: 'Data Feed',
      description: 'Live data feed for MIDI, LUFS, FFT, and more',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    }
  ];
  const handleSelectEffect = (effectId: string) => {
    setSelectedEffects(prev => ({
      ...prev,
      [effectId]: !prev[effectId]
    }));
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: true
    }));
  };
  const handleEffectDoubleClick = (effectId: string) => {
    const existingLayer = layers.find(l => l.id === effectId);
    if (existingLayer) {
      console.log('🎯 [handleEffectDoubleClick] Opening inspector for existing layer:', effectId);
      setEditingEffectId(effectId);
    } else {
      const effectDef = effects.find(e => e.id === effectId);
      if (!effectDef) {
        console.warn('Effect definition not found:', effectId);
        return;
      }
      const newLayerId = `effect-${effectId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const { duration, addLayer, selectLayer } = useTimelineStore.getState();
      console.log('🆕 [handleEffectDoubleClick] Creating new effect layer:', {
        effectType: effectId,
        newLayerId,
        existingMappingKeys: Object.keys(mappings).filter(k => k.includes(effectId))
      });
      addLayer({
        id: newLayerId,
        name: effectDef.name || effectId,
        type: 'effect',
        effectType: effectId,
        src: effectDef.name || effectId,
        settings: {},
        zIndex: 0,
        isDeletable: true,
        startTime: 0,
        endTime: duration,
        duration: duration,
        position: { x: 50, y: 50 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        opacity: 1,
        audioBindings: [],
        midiBindings: [],
        blendMode: 'normal',
      } as Layer);
      selectLayer(newLayerId);
      setEditingEffectId(newLayerId);
      console.log('✅ [handleEffectDoubleClick] New layer created and inspector opened:', newLayerId);
    }
  };
  const handleBackFromInspector = () => {
    setEditingEffectId(null);
  };
  const getEditingEffectInstance = () => {
    if (!editingEffectId) return null;
    const overlayLayer = layers.find(l => l.id === editingEffectId && l.type === 'overlay');
    if (overlayLayer) {
      const overlayParameters: Record<string, Record<string, any>> = {
        waveform: {
          color: overlayLayer.settings?.color || '#4db3fa',
          lineWidth: overlayLayer.settings?.lineWidth || 1,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          dropShadow: overlayLayer.settings?.dropShadow || false,
          shadowColor: overlayLayer.settings?.shadowColor || '#000000',
          shadowBlur: overlayLayer.settings?.shadowBlur || 8,
          outline: overlayLayer.settings?.outline || false,
          outlineColor: overlayLayer.settings?.outlineColor || '#ffffff',
          outlineWidth: overlayLayer.settings?.outlineWidth || 1,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        spectrogram: {
          colorMap: overlayLayer.settings?.colorMap || 'Classic',
          showFrequencyLabels: overlayLayer.settings?.showFrequencyLabels || false,
          brightness: overlayLayer.settings?.brightness || 1,
          contrast: overlayLayer.settings?.contrast || 1,
          scrollSpeed: overlayLayer.settings?.scrollSpeed || 1,
          fftSize: overlayLayer.settings?.fftSize || 2048,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          dropShadow: overlayLayer.settings?.dropShadow || false,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        peakMeter: {
          peakColor: overlayLayer.settings?.peakColor || '#ff0000',
          holdTime: overlayLayer.settings?.holdTime || 1000,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        stereometer: {
          traceColor: overlayLayer.settings?.traceColor || '#00ffff',
          glowIntensity: overlayLayer.settings?.glowIntensity || 0.5,
          pointSize: overlayLayer.settings?.pointSize || 2,
          showGrid: overlayLayer.settings?.showGrid || false,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        oscilloscope: {
          followPitch: overlayLayer.settings?.followPitch || false,
          color: overlayLayer.settings?.color || '#00ff00',
          glowIntensity: overlayLayer.settings?.glowIntensity || 0,
          amplitude: overlayLayer.settings?.amplitude || 1,
          traceWidth: overlayLayer.settings?.traceWidth || 2,
          showGrid: overlayLayer.settings?.showGrid || false,
          gridColor: overlayLayer.settings?.gridColor || '#333333',
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
          lissajous: overlayLayer.settings?.lissajous || false,
        },
        spectrumAnalyzer: {
          barColor: overlayLayer.settings?.barColor || '#00ffff',
          showFrequencyLabels: overlayLayer.settings?.showFrequencyLabels || false,
          fftSize: overlayLayer.settings?.fftSize || 2048,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        vuMeter: {
          color: overlayLayer.settings?.color || '#00ff00',
          style: overlayLayer.settings?.style || 'Needle',
          meterType: overlayLayer.settings?.meterType || 'RMS',
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        chromaWheel: {
          colorScheme: overlayLayer.settings?.colorScheme || 'Classic',
          showNoteNames: overlayLayer.settings?.showNoteNames || false,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
        consoleFeed: {
          dataSource: overlayLayer.settings?.dataSource || 'All',
          fontSize: overlayLayer.settings?.fontSize || 12,
          fontColor: overlayLayer.settings?.fontColor || '#00ff00',
          maxLines: overlayLayer.settings?.maxLines || 50,
          scrollSpeed: overlayLayer.settings?.scrollSpeed || 1,
          cornerRadius: overlayLayer.settings?.cornerRadius ?? 0,
          glassmorphism: overlayLayer.settings?.glassmorphism || false,
        },
      };
      const effectDef = effects.find(e => e.id === overlayLayer.effectType);
      const overlayType = overlayLayer.effectType as string;
      return {
        id: overlayLayer.id,
        name: effectDef?.name || overlayLayer.name,
        description: effectDef?.description || `${overlayType} overlay visualization`,
        parameters: overlayParameters[overlayType] || {}
      };
    }
    if (visualizerRef.current) {
      const effectByLayerId = visualizerRef.current.getEffect?.(editingEffectId);
      if (effectByLayerId) {
        const effectLayer = layers.find(l => l.id === editingEffectId);
        const effectDef = effectLayer ? effects.find(e => e.id === effectLayer.effectType) : null;
        return {
          id: editingEffectId,
          name: effectByLayerId.name,
          description: effectDef?.description || effectByLayerId.description || '',
          parameters: effectByLayerId.parameters
        };
      }
    }
    // Fallback: look up the layer and use its settings
    // This handles cases where the effect hasn't been instantiated in the visualizer yet
    const effectLayer = layers.find(l => l.id === editingEffectId);
    if (effectLayer && effectLayer.type === 'effect') {
      const effectDef = effects.find(e => e.id === effectLayer.effectType);
      return {
        id: effectLayer.id,
        name: effectDef?.name || effectLayer.name,
        description: effectDef?.description || '',
        parameters: effectLayer.settings || effectDef?.parameters || {}
      };
    }
    return null;
  };
  // Effect clip timeline is merged into layers via store; per-effect UI remains via modals
  const handleCloseEffectModal = (effectId: string) => {
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: false
    }));
  };
  // Video composition handlers moved into store (addLayer, updateLayer, deleteLayer, selectLayer)
  // Feature mapping handlers
  const handleMapFeature = (parameterId: string, featureId: string, stemType?: string) => {
    console.log('🎛️ [page.tsx] handleMapFeature called:', {
      parameterId,
      featureId,
      stemType,
      timestamp: Date.now()
    });
    const parsed = parseParamKey(parameterId);
    if (!parsed) {
      console.error('❌ [page.tsx] Invalid parameterId format (cannot parse):', parameterId);
      return;
    }
    const { effectInstanceId: layerOrEffectId, paramName } = parsed;
    console.log('🎛️ [page.tsx] Creating mapping:', {
      parameterId,
      featureId,
      parameterName: paramName,
      layerOrEffectId,
      parsedCorrectly: layerOrEffectId && paramName
    });
    setMappings(prev => ({
      ...prev,
      [parameterId]: {
        featureId,
        modulationAmount: 0.5 // Default to 50% (noon)
      }
    }));
    // Special handling for ImageSlideshow triggerValue: also save to layer.settings.triggerSourceId
    if (paramName === 'triggerValue') {
      const slideshowLayer = layers.find(l => l.id === layerOrEffectId && l.type === 'effect' && l.effectType === 'imageSlideshow');
      if (slideshowLayer) {
        console.log('🖼️ [page.tsx] Saving triggerSourceId to layer settings:', {
          layerId: layerOrEffectId,
          featureId,
          currentSettings: slideshowLayer.settings
        });
        updateLayer(slideshowLayer.id, {
          ...slideshowLayer,
          settings: {
            ...slideshowLayer.settings,
            triggerSourceId: featureId
          }
        });
        console.log('🖼️ [page.tsx] Layer updated, new settings should include triggerSourceId:', featureId);
      } else {
        console.warn('🖼️ [page.tsx] Could not find slideshow layer for triggerValue mapping:', {
          layerOrEffectId,
          availableLayers: layers.filter(l => l.type === 'effect').map(l => ({ id: l.id, effectType: l.effectType }))
        });
      }
    }
    const featureName = featureId.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    setFeatureNames(prev => ({ ...prev, [featureId]: featureName }));
    debugLog.log('🎛️ Mapping created successfully');
  };
  const handleUnmapFeature = (parameterId: string) => {
    const parsed = parseParamKey(parameterId);
    if (!parsed) {
      console.error('❌ [page.tsx] Invalid parameterId format (cannot parse) in handleUnmapFeature:', parameterId);
      return;
    }
    const { effectInstanceId: layerOrEffectId, paramName } = parsed;
    debugLog.log('🎛️ Removing mapping:', {
      parameterId,
      currentMapping: mappings[parameterId]
    });
    setMappings(prev => ({
      ...prev,
      [parameterId]: {
        featureId: null,
        modulationAmount: 0.5
      }
    }));
    if (paramName === 'triggerValue') {
      const slideshowLayer = layers.find(l => l.id === layerOrEffectId && l.type === 'effect' && l.effectType === 'imageSlideshow');
      if (slideshowLayer) {
        console.log('🖼️ Removing triggerSourceId from layer settings:', layerOrEffectId);
        updateLayer(slideshowLayer.id, {
          ...slideshowLayer,
          settings: {
            ...slideshowLayer.settings,
            triggerSourceId: undefined
          }
        });
      }
    }
    debugLog.log('🎛️ Mapping removed successfully');
  };
  const handleModulationAmountChange = (parameterId: string, amount: number) => {
    setMappings(prev => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        modulationAmount: amount
      }
    }));
  };
  const handleStemSelect = (stemId: string) => {
    debugLog.log('🎛️ Selecting stem:', {
      stemId,
      previousActiveTrack: activeTrackId,
      availableAnalyses: audioAnalysis.cachedAnalysis?.map(a => ({
        id: a.fileMetadataId,
        stemType: a.stemType,
        hasData: !!a.analysisData,
        features: a.analysisData ? Object.keys(a.analysisData) : []
      })) || []
    });
    setActiveTrackId(stemId);
    const selectedAnalysis = audioAnalysis.cachedAnalysis?.find(a => a.fileMetadataId === stemId);
    if (selectedAnalysis) {
      debugLog.log('🎛️ Selected stem analysis:', {
        stemId,
        stemType: selectedAnalysis.stemType,
        duration: selectedAnalysis.metadata.duration,
        features: selectedAnalysis.analysisData ? Object.keys(selectedAnalysis.analysisData) : [],
        sampleValues: selectedAnalysis.analysisData ?
          Object.entries(selectedAnalysis.analysisData).reduce((acc, [feature, data]) => {
            if (Array.isArray(data) && data.length > 0) {
              acc[feature] = {
                length: data.length,
                firstValue: data[0],
                lastValue: data[data.length - 1],
                sampleValues: data.slice(0, 5)
              };
            }
            return acc;
          }, {} as Record<string, any>) : {}
      });
    } else {
      debugLog.warn('🎛️ No analysis found for selected stem:', stemId);
    }
  };
  const visualizerRef = useRef<any>(null);
  const animationFrameId = useRef<number>();
  const { backgroundColor, isBackgroundVisible } = useProjectSettingsStore();
  useEffect(() => {
    const manager = visualizerRef.current;
    if (!manager) return;
    try {
      if (typeof manager.setBackgroundColor === 'function') {
        manager.setBackgroundColor(backgroundColor);
      }
      if (typeof manager.setBackgroundVisibility === 'function') {
        manager.setBackgroundVisibility(isBackgroundVisible);
      }
    } catch {}
  }, [backgroundColor, isBackgroundVisible, visualizerRef]);
  const getAnalysisKeyFromFeatureId = (featureId: string): string => {
    const parts = featureId.split('-');
    if (parts.length >= 2) {
      const featureName = parts.slice(1).join('-');
      const featureMapping: Record<string, string> = {
        'rms-volume': 'rms',
        'loudness': 'loudness',
        'spectral-centroid': 'spectralCentroid',
        'spectral-rolloff': 'spectralRolloff',
        'spectral-flux': 'spectralFlux',
        'mfcc-1': 'mfcc_0',
        'mfcc-2': 'mfcc_1',
        'mfcc-3': 'mfcc_2',
        'perceptual-spread': 'perceptualSpread',
        'energy': 'energy',
        'zcr': 'zcr',
        'beat-intensity': 'beatIntensity',
        'rhythm-pattern': 'rhythmPattern',
        'attack-time': 'attackTime',
        'chroma-vector': 'chromaVector',
        'harmonic-content': 'harmonicContent',
        'sub-bass': 'subBass',
        'warmth': 'warmth',
        'spectral-complexity': 'spectralComplexity',
        'texture': 'texture',
        'pitch-height': 'pitchHeight',
        'pitch-movement': 'pitchMovement',
        'melody-complexity': 'melodyComplexity',
        'expression': 'expression'
      };
      return featureMapping[featureName] || featureName;
    }
    return featureId;
  };
  const getStemTypeFromFeatureId = (featureId: string): string | null => {
    const parts = featureId.split('-');
    if (parts.length >= 2) {
      return parts[0];
    }
    return null;
  };
  useEffect(() => {
    if (visualizerRef.current) {
      debugLog.log('🎛️ Visualizer ref available:', {
        hasRef: !!visualizerRef.current,
        availableEffects: visualizerRef.current?.getAllEffects?.()?.map((e: any) => e.id) || [],
        selectedEffects: Object.keys(selectedEffects).filter(k => selectedEffects[k])
      });
    } else {
      debugLog.log('🎛️ Visualizer ref not available yet');
    }
  }, [visualizerRef.current, selectedEffects]);
  const layersRef = useRef(layers);
  const mappingsRef = useRef(mappings);
  const baseParameterValuesRef = useRef(baseParameterValues);
  const activeSliderValuesRef = useRef(activeSliderValues);
  const cachedAnalysisRef = useRef(audioAnalysis.cachedAnalysis);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { mappingsRef.current = mappings; }, [mappings]);
  useEffect(() => { baseParameterValuesRef.current = baseParameterValues; }, [baseParameterValues]);
  useEffect(() => { activeSliderValuesRef.current = activeSliderValues; }, [activeSliderValues]);
  useEffect(() => { cachedAnalysisRef.current = audioAnalysis.cachedAnalysis; }, [audioAnalysis.cachedAnalysis]);
  useEffect(() => {
    let cachedMappings: [string, string][] = [];
    let lastUpdateTime = 0;
    let frameCount = 0;
    const animationLoop = () => {
      if (!isPlaying || !visualizerRef.current) {
        animationFrameId.current = requestAnimationFrame(animationLoop);
        return;
      }
      const now = performance.now();
      const elapsed = now - lastUpdateTime;
      const targetFrameTime = 1000 / 30;
      if (elapsed < targetFrameTime) {
        animationFrameId.current = requestAnimationFrame(animationLoop);
        return;
      }
      lastUpdateTime = now;
      frameCount++;
      const currentLayers = layersRef.current;
      const currentMappings = mappingsRef.current;
      const currentBaseValues = baseParameterValuesRef.current;
      const currentActiveSliderValues = activeSliderValuesRef.current;
      const currentCachedAnalysis = cachedAnalysisRef.current;
      const time = stemAudio.currentTime;
      setCurrentTime(time);
      const audioContextTime = stemAudio.getAudioContextTime?.() || 0;
      const scheduledStartTime = stemAudio.scheduledStartTimeRef?.current || 0;
      const measuredLatency = stemAudio.getAudioLatency?.() || 0;
      const audioPlaybackTime = Math.max(0, audioContextTime - scheduledStartTime);
      let syncTime = Math.max(0, audioPlaybackTime - measuredLatency + (syncOffsetMs / 1000));
      if (currentCachedAnalysis.length > 0) {
        const analysisDuration = currentCachedAnalysis[0]?.metadata?.duration || 1;
        if (analysisDuration > 0) {
          syncTime = syncTime % analysisDuration;
        }
      }
      const newCachedMappings = Object.entries(currentMappings)
          .filter(([, mapping]) => mapping.featureId !== null)
          .map(([paramKey, mapping]) => [paramKey, mapping.featureId!]) as [string, string][];
      const mappingsChanged = cachedMappings.length !== newCachedMappings.length ||
        cachedMappings.some(([key, val], idx) => {
          const newMapping = newCachedMappings[idx];
          return !newMapping || newMapping[0] !== key || newMapping[1] !== val;
        }) ||
        newCachedMappings.some(([key, val], idx) => {
          const oldMapping = cachedMappings[idx];
          return !oldMapping || oldMapping[0] !== key || oldMapping[1] !== val;
        });
      if (mappingsChanged) {
        const oldMappings = new Map(cachedMappings);
        cachedMappings = newCachedMappings;
        const newMappings = cachedMappings.filter(([key, featureId]) =>
          !oldMappings.has(key) || oldMappings.get(key) !== featureId
        );
        const opacityMappings = cachedMappings.filter(([key]) => {
          const parsed = parseParamKey(key);
          return parsed?.paramName === 'opacity';
        });
        if (newMappings.length > 0) {
        }
      }
      if (currentCachedAnalysis && currentCachedAnalysis.length > 0) {
        const hasOpacityMapping = cachedMappings.some(([key]) => parseParamKey(key)?.paramName === 'opacity');
        if (hasOpacityMapping && frameCount % 60 === 0) {
          console.log('🎚️ Audio mapping loop active:', {
            cachedMappingsCount: cachedMappings.length,
            opacityMappings: cachedMappings.filter(([key]) => parseParamKey(key)?.paramName === 'opacity').map(([key, id]) => ({ key, id })),
            cachedAnalysisCount: currentCachedAnalysis.length,
            syncTime: syncTime.toFixed(3),
            isPlaying
          });
        }
        const effectTypeNames = ['metaballs', 'particleNetwork', 'imageSlideshow', 'asciiFilter'];
        for (const [paramKey, featureId] of cachedMappings) {
          if (!featureId) continue;
          const parsedKey = parseParamKey(paramKey);
          if (!parsedKey) continue;
          const { effectInstanceId: effectId, paramName } = parsedKey;
          if (effectTypeNames.includes(effectId)) {
            continue;
          }
          const featureStemType = getStemTypeFromFeatureId(featureId);
          if (!featureStemType) {
            if (paramName === 'opacity' && frameCount % 60 === 0) {
              console.warn('⚠️ Could not get stem type from featureId:', { paramKey, featureId });
            }
            continue;
          }
          const stemAnalysis = currentCachedAnalysis?.find(
            a => a.stemType === featureStemType
          );
          if (!stemAnalysis) {
            if (paramName === 'opacity' && frameCount % 60 === 0) {
              console.warn('⚠️ Stem analysis not found:', { paramKey, featureId, featureStemType, availableStems: currentCachedAnalysis.map(a => a.stemType) });
            }
            continue;
          }
          const rawValue = audioAnalysis.getFeatureValue(
            stemAnalysis.fileMetadataId,
            featureId,
            syncTime,
            featureStemType
          );
          if (rawValue === null || rawValue === undefined) {
            if (paramName === 'opacity' && frameCount % 60 === 0) {
              console.warn('⚠️ Raw value is null/undefined:', { paramKey, featureId, syncTime: syncTime.toFixed(3) });
            }
            continue;
          }
          const maxValue = getSliderMax(paramName);
          const knobFull = (currentMappings[paramKey]?.modulationAmount ?? 0.5) * 2 - 1;
          const knob = Math.max(-0.5, Math.min(0.5, knobFull));
          const baseValue = (currentBaseValues[effectId]?.[paramName] ?? (currentActiveSliderValues[effectId]?.[paramName] ?? 0));
          const delta = rawValue * knob * maxValue;
          const scaledValue = Math.max(0, Math.min(maxValue, baseValue + delta));
          if (paramName === 'opacity' && frameCount % 30 === 0) {
            console.log('🎚️ Audio mapping calculating opacity:', {
              paramKey,
              effectId,
              paramName,
              featureId,
              rawValue,
              baseValue,
              knob,
              delta,
              scaledValue,
              maxValue,
              syncTime: syncTime.toFixed(3)
            });
          }
          visualizerRef.current.updateEffectParameter(effectId, paramName, scaledValue);
          if (frameCount % 10 === 0) {
            setModulatedParameterValues(prev => ({ ...prev, [paramKey]: scaledValue }));
          }
        }
      } else {
        if (cachedMappings.length > 0 && frameCount % 120 === 0) {
          console.warn('⚠️ Audio mapping loop not running:', {
            cachedMappingsCount: cachedMappings.length,
            hasCachedAnalysis: !!currentCachedAnalysis,
            cachedAnalysisLength: currentCachedAnalysis?.length || 0,
            isPlaying
          });
        }
      }
      if (currentLayers.length > 0 && currentCachedAnalysis.length > 0) {
        currentLayers.forEach(layer => {
          if (layer.settings && layer.settings.triggerSourceId) {
            const featureId = layer.settings.triggerSourceId;
            const featureStemType = getStemTypeFromFeatureId(featureId);
            if (featureStemType) {
              const stemAnalysis = currentCachedAnalysis?.find(
                a => a.stemType === featureStemType
              );
              if (stemAnalysis) {
                const rawValue = audioAnalysis.getFeatureValue(
                  stemAnalysis.fileMetadataId,
                  featureId,
                  syncTime,
                  featureStemType
                );
                if (rawValue !== undefined) {
                  if (frameCount % 30 === 0) {
                    console.log('🖼️ [page.tsx] Updating triggerValue:', {
                      layerId: layer.id,
                      featureId,
                      rawValue: rawValue.toFixed(4),
                      syncTime: syncTime.toFixed(2),
                      hasVisualizer: !!visualizerRef.current
                    });
                  }
                  visualizerRef.current?.updateEffectParameter(layer.id, 'triggerValue', rawValue);
                } else {
                  if (frameCount % 60 === 0) {
                    console.warn('🖼️ [page.tsx] rawValue is undefined for trigger:', { layerId: layer.id, featureId });
                  }
                }
              } else {
                if (frameCount % 60 === 0) {
                  console.warn('🖼️ [page.tsx] No stemAnalysis found for trigger:', { layerId: layer.id, featureId, featureStemType });
                }
              }
            } else {
              if (frameCount % 60 === 0) {
                console.warn('🖼️ [page.tsx] No featureStemType for trigger:', { layerId: layer.id, featureId });
              }
            }
          } else {
            if (frameCount % 60 === 0 && layer.type === 'effect' && layer.effectType === 'imageSlideshow') {
              console.log('🖼️ [page.tsx] Slideshow layer has no triggerSourceId:', {
                layerId: layer.id,
                settings: layer.settings
              });
            }
          }
        });
      }
      animationFrameId.current = requestAnimationFrame(animationLoop);
    };
    animationFrameId.current = requestAnimationFrame(animationLoop);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [
    isPlaying,
    stemAudio,
    syncOffsetMs
  ]);
  const getSliderMax = (paramName: string) => {
    if (paramName === 'base-radius') return 1.0;
    if (paramName === 'animation-speed') return 2.0;
    if (paramName === 'glow-intensity') return 3.0;
    if (paramName === 'hud-opacity') return 1.0;
    if (paramName === 'opacity') return 1.0;
    if (paramName === 'max-particles') return 200;
    if (paramName === 'connection-distance') return 5.0;
    if (paramName === 'particle-size') return 50;
    if (paramName === 'textSize') return 1.0;
    if (paramName === 'gamma') return 2.2;
    if (paramName === 'contrast') return 2.0;
    if (paramName === 'invert') return 1.0;
    if (paramName === 'intensity') return 2.0;
    if (paramName === 'threshold') return 1.0;
    if (paramName === 'softness') return 1.0;
    if (paramName === 'radius') return 1.0;
    return 100;
  };
  const getSliderStep = (paramName: string) => {
    if (paramName === 'base-radius') return 0.1;
    if (paramName === 'animation-speed') return 0.1;
    if (paramName === 'glow-intensity') return 0.1;
    if (paramName === 'hud-opacity') return 0.1;
    if (paramName === 'opacity') return 0.01;
    if (paramName === 'max-particles') return 10;
    if (paramName === 'connection-distance') return 0.1;
    if (paramName === 'particle-size') return 5;
    if (paramName === 'textSize') return 0.01;
    if (paramName === 'gamma') return 0.01;
    if (paramName === 'contrast') return 0.01;
    if (paramName === 'invert') return 1.0;
    if (paramName === 'intensity') return 0.01;
    if (paramName === 'threshold') return 0.01;
    if (paramName === 'softness') return 0.01;
    if (paramName === 'radius') return 0.01;
    return 1;
  };
  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    const paramKey = makeParamKey(effectId, paramName);
    setBaseParam(effectId, paramName, value);
    setActiveParam(effectId, paramName, value);
    if (visualizerRef.current) {
        visualizerRef.current.updateEffectParameter(effectId, paramName, value);
    }
    const effectLayer = layers.find(l => l.id === effectId && l.type === 'effect');
    if (effectLayer) {
      updateLayer(effectLayer.id, {
        ...effectLayer,
        settings: {
          ...effectLayer.settings,
          [paramName]: value
        }
      });
    }
    const overlayLayer = layers.find(l => l.id === effectId && l.type === 'overlay');
    if (overlayLayer) {
      updateLayer(overlayLayer.id, {
        ...overlayLayer,
        settings: {
          ...overlayLayer.settings,
          [paramName]: value
        }
      });
    }
  };
  const effectModals: React.ReactNode[] = [];
  const getStemTypeFromFileName = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.includes('bass')) return 'bass';
    if (lower.includes('drum')) return 'drums';
    if (lower.includes('vocal')) return 'vocals';
    return 'other';
  };
  const selectedStem = availableStems.find(stem => stem.id === activeTrackId);
  const selectedStemType = selectedStem
    ? (selectedStem.stem_type || getStemTypeFromFileName(selectedStem.file_name))
    : undefined;
  const getMasterStem = () => availableStems.find(stem => stem.is_master);
  const getCurrentDuration = () => {
    if (hasStems && stemAudio.duration && stemAudio.duration > 0) {
      return stemAudio.duration;
    }
    return (midiData || sampleMidiData).file.duration;
  };
  useEffect(() => {
    try {
      const d = getCurrentDuration();
      if (typeof d === 'number' && isFinite(d) && d > 0) {
        setDuration(d);
      }
    } catch {}
  }, [hasStems, stemAudio.duration, midiData, sampleMidiData, setDuration]);
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    const update = () => {
      if (hasStems) {
        const duration = getCurrentDuration();
        let displayTime = stemAudio.currentTime;
        if (stemAudio.isLooping && duration > 0) {
          displayTime = stemAudio.currentTime % duration;
        }
        setCurrentTime(displayTime);
      }
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, hasStems, stemAudio]);
  const allStemsForUI = React.useMemo(() => {
    const baseStems = sortStemsWithMasterLast(availableStems);
    const recoveredStems = (audioAnalysis.cachedAnalysis || [])
      .filter(a => !baseStems.find(s => s.id === a.fileMetadataId))
      .map(a => ({
        id: a.fileMetadataId,
        file_name: `Recovered ${a.stemType || 'Stem'}`,
        stem_type: a.stemType,
        is_master: false
      }));
    return [...baseStems, ...recoveredStems];
  }, [availableStems, audioAnalysis.cachedAnalysis]);
  useEffect(() => {
    debugLog.log('[CreativeVisualizerPage] projectAudioFiles.files:', projectAudioFiles?.files);
  }, [projectAudioFiles?.files]);
  const [asyncStemUrlMap, setAsyncStemUrlMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!projectAudioFiles?.files || !isInitialized || !getDownloadUrlMutation) return;
    const processQueue = async () => {
      if (isFetchingRef.current) return;
      const neededIds = new Set<string>();
      projectAudioFiles.files.forEach(f => {
        if (f.upload_status === 'completed' && !f.downloadUrl) {
          neededIds.add(f.id);
        }
      });
      layers.forEach(layer => {
        if (layer.type === 'overlay') {
          const s = (layer as any).settings;
          const stemId = s?.stemId || s?.stem?.id;
          const currentUrl = asyncStemUrlMap[stemId] || s?.stem?.url;
          const isExpired = currentUrl && (
            (currentUrl.includes('cloudflarestorage') && !asyncStemUrlMap[stemId]) ||
            currentUrl.includes('phonoglyph-uploads') ||
            currentUrl.includes('X-Amz-Signature')
          );
          if (stemId && (!currentUrl || isExpired)) {
            neededIds.add(stemId);
          }
        }
        if (layer.effectType === 'imageSlideshow' && layer.settings?.imageIds) {
          layer.settings.imageIds.forEach((id: string) => {
            const currentUrl = layer.settings?.images?.[layer.settings.imageIds.indexOf(id)];
            const isExpired = currentUrl && (
              currentUrl.includes('cloudflarestorage') ||
              currentUrl.includes('phonoglyph-uploads') ||
              currentUrl.includes('X-Amz-Signature')
            );
            if (id && (!currentUrl || isExpired)) {
              neededIds.add(id);
            }
          });
        }
      });
      const uniqueIds = Array.from(neededIds).filter(id => !fetchedIdsRef.current.has(id));
      if (uniqueIds.length === 0) return;
      isFetchingRef.current = true;
      const BATCH_SIZE = 3;
      const DELAY_MS = 200;
      try {
        for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
          const batch = uniqueIds.slice(i, i + BATCH_SIZE);
          debugLog.log(`🔌 Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}:`, batch);
          const results = await Promise.allSettled(
            batch.map(id => getDownloadUrlMutation.mutateAsync({ fileId: id }))
          );
          const newUrls: Record<string, string> = {};
          results.forEach((res, index) => {
            const id = batch[index];
            fetchedIdsRef.current.add(id);
            if (res.status === 'fulfilled' && res.value.downloadUrl) {
              newUrls[id] = res.value.downloadUrl;
            }
          });
          if (Object.keys(newUrls).length > 0) {
            setAsyncStemUrlMap(prev => ({ ...prev, ...newUrls }));
            layers.forEach(layer => {
              if (layer.type === 'overlay') {
                const settings = (layer as any).settings || {};
                const stemId = settings.stemId || settings.stem?.id;
                if (stemId && newUrls[stemId]) {
                  updateLayer(layer.id, {
                    settings: {
                      ...settings,
                      stem: {
                        ...(settings.stem || {}),
                        id: stemId,
                        url: newUrls[stemId]
                      }
                    }
                  });
                }
              }
            });
          }
          if (i + BATCH_SIZE < uniqueIds.length) {
            await new Promise(r => setTimeout(r, DELAY_MS));
          }
        }
      } catch (e) {
        debugLog.error("Batch fetch failed", e);
      } finally {
        isFetchingRef.current = false;
      }
    };
    const timer = setTimeout(processQueue, 1000);
    return () => clearTimeout(timer);
  }, [projectAudioFiles?.files, layers, isInitialized, getDownloadUrlMutation, asyncStemUrlMap, updateLayer]);
  const stemUrlsReady = Object.keys(asyncStemUrlMap).length > 0;
  if (!isClient) {
    return (
      <div className="flex h-screen bg-stone-800 text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-sm text-stone-300">Loading...</div>
        </div>
      </div>
    );
  }
  if (!currentProjectId && !useDemoData) {
    return (
      <>
        {showPicker && (
          <ProjectPickerModal
            isOpen={showPicker}
            onClose={() => router.push('/dashboard')}
            onSelect={handleProjectSelect}
            onCreateNew={handleCreateNew}
          />
        )}
        {showCreateModal && (
          <ProjectCreationModal
            isOpen={showCreateModal}
            onClose={handleCloseCreateModal}
          />
        )}
        <div className="flex h-screen bg-stone-800 text-white items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-sm text-stone-300">Please create or select a project.</div>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      {showPicker && (
        <ProjectPickerModal
          isOpen={showPicker}
          onClose={() => router.push('/dashboard')}
          onSelect={handleProjectSelect}
          onCreateNew={handleCreateNew}
        />
      )}
      {showCreateModal && (
        <ProjectCreationModal
          isOpen={showCreateModal}
          onClose={handleCloseCreateModal}
        />
      )}
      {currentProjectId ? (
        <AutoSaveProvider projectId={currentProjectId}>
          <DndProvider backend={HTML5Backend}>
            {}
            <div className="flex h-screen bg-stone-800 text-white min-w-0 creative-visualizer-text">
          <CollapsibleSidebar>
            <div className="space-y-4">
              <MappingSourcesPanel
                activeTrackId={activeTrackId || undefined}
                className="mb-4"
                selectedStemType={selectedStemType}
                currentTime={currentTime}
                cachedAnalysis={audioAnalysis.cachedAnalysis}
                isPlaying={isPlaying}
              />
              <FileSelector
                onFileSelected={handleFileSelected}
                selectedFileId={selectedFileId || undefined}
                useDemoData={useDemoData}
                onDemoModeChange={handleDemoModeChange}
                projectId={currentProjectId || undefined}
                projectName={projectData?.name}
              />
            </div>
          </CollapsibleSidebar>
          <main className="flex-1 flex overflow-hidden min-w-0">
            {}
            <div
              id="editor-bounds"
              className="relative flex-1 flex flex-col overflow-hidden min-w-0"
              style={{
                height: '100vh',
                position: 'relative',
                contain: 'layout'
              }}
            >
          {}
          <div className="p-2 bg-stone-900/50 border-b border-white/10">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <Button
                  onClick={handlePlayPause}
                  size="sm"
                    disabled={stemLoadingState}
                  className={`font-mono text-xs uppercase tracking-wider px-4 py-2 transition-all duration-300 ${
                      stemLoadingState
                      ? 'bg-stone-600 text-stone-400 cursor-not-allowed'
                      : 'bg-stone-700 hover:bg-stone-600'
                  }`}
                >
                    {stemLoadingState ? (
                    <>
                      <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
                      LOADING
                    </>
                  ) : (
                    <>
                      {isPlaying ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                      {isPlaying ? 'PAUSE' : 'PLAY'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                    disabled={stemLoadingState}
                  onClick={() => stemAudio.setLooping(!stemAudio.isLooping)}
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-3 py-1 ${
                      stemLoadingState
                      ? 'opacity-50 cursor-not-allowed'
                      : stemAudio.isLooping ? 'bg-emerald-900/20 border-emerald-600 text-emerald-300' : ''
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  🔄 {stemAudio.isLooping ? 'LOOP' : 'LOOP'}
                </Button>
                <Button
                  variant="outline"
                    disabled={stemLoadingState}
                  onClick={handleReset}
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 px-3 py-1 ${
                      stemLoadingState ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  RESET
                </Button>
                  {}
                  <div className="flex items-center gap-1 overflow-hidden">
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <span className="font-creative-mono">{currentTime.toFixed(1)}</span><span className="font-creative-mono">S</span> / <span className="font-creative-mono">{getCurrentDuration().toFixed(1)}</span><span className="font-creative-mono">S</span>
                </div>
                {}
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  BPM: <span className="font-creative-mono">{(() => {
                    const masterId = projectAudioFiles?.files?.find(f => f.is_master)?.id;
                    const ca = audioAnalysis.cachedAnalysis || [];
                    const master = masterId ? ca.find((a: any) => a.fileMetadataId === masterId) : null;
                    const candidate: any = master ?? ca[0];
                    const bpmVal = candidate?.bpm ?? candidate?.metadata?.bpm ?? candidate?.analysisData?.bpm;
                    return typeof bpmVal === 'number' && isFinite(bpmVal) ? Math.round(bpmVal) : '—';
                  })()}</span>
                </div>
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  FPS: <span className="font-creative-mono">{fps}</span>
                </div>
              </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <AutoSaveTopBar />
                <AspectRatioSelector
                  currentAspectRatio={visualizerAspectRatio}
                  onAspectRatioChange={setVisualizerAspectRatio}
                  disabled={stemLoadingState}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={isRendering}
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-2 py-1 ${
                    isRendering ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  <Download className="h-3 w-3 mr-1" />
                  {isDownloadReady
                    ? 'DOWNLOAD READY'
                    : isRendering
                      ? `RENDERING... ${renderProgress}%`
                      : 'EXPORT'}
                </Button>
                </div>
              </div>
            </div>
            {}
            <div className="flex-1 flex flex-col overflow-hidden bg-stone-900 relative">
              <div className="flex-1 flex flex-col min-h-0 px-4 overflow-y-auto">
                {}
                <div className="flex-shrink-0 mb-4">
                  <div
                    className="relative mx-auto bg-stone-900 rounded-lg overflow-hidden shadow-lg flex items-center justify-center"
                    style={{
                      height: 'min(calc(100vh - 400px), 60vh)',
                      minHeight: '200px',
                      width: '100%',
                      maxWidth: '100%'
                    }}
                  >
                  <ThreeVisualizer
                      midiData={midiData || sampleMidiData}
                      settings={settings}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      layers={layers}
                      selectedLayerId={selectedLayerId}
                      onLayerSelect={selectLayer}
                      onPlayPause={handlePlayPause}
                      onSettingsChange={setSettings}
                      onFpsUpdate={setFps}
                      selectedEffects={selectedEffects}
                      aspectRatio={visualizerAspectRatio}
                          openEffectModals={openEffectModals}
                          onCloseEffectModal={handleCloseEffectModal}
                          mappings={mappings}
                          featureNames={featureNames}
                          onMapFeature={handleMapFeature}
                          onUnmapFeature={handleUnmapFeature}
                          onModulationAmountChange={handleModulationAmountChange}
                          activeSliderValues={activeSliderValues}
                          baseParameterValues={baseParameterValues}
                          setActiveSliderValues={setActiveSliderValues}
                          setBaseParam={setBaseParam}
                          onLayerUpdate={updateLayer}
                      onSelectedEffectsChange={() => {}}
                      visualizerRef={visualizerRef}
                  >
                    {}
                    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                      <HudOverlayRenderer
                        stemUrlMap={asyncStemUrlMap}
                        cachedAnalysis={audioAnalysis.cachedAnalysis || []}
                      />
                    </div>
                  </ThreeVisualizer>
                      {}
                </div>
                </div>
                {}
                <div className="flex-shrink-0 mb-4">
                  <UnifiedTimeline
                    stems={allStemsForUI}
                    masterStemId={projectAudioFiles?.files?.find(f => f.is_master)?.id ?? null}
                    onStemSelect={handleStemSelect}
                    activeTrackId={activeTrackId}
                    soloedStems={stemAudio.soloedStems}
                    onToggleSolo={stemAudio.toggleStemSolo}
                    analysisProgress={audioAnalysis.analysisProgress}
                    cachedAnalysis={audioAnalysis.cachedAnalysis || []}
                    stemLoadingState={audioAnalysis.isLoading}
                    stemError={audioAnalysis.error}
                    onSeek={useTimelineStore.getState().setCurrentTime}
                    onLayerDoubleClick={handleEffectDoubleClick}
                    className="bg-stone-800 border border-gray-700"
                  />
                </div>
            </div>
          </div>
              {}
              {effectModals}
            </div>
            {}
            <CollapsibleEffectsSidebar
              expandedWidth={
                (editingEffectId === 'imageSlideshow' ||
                 layers.find(l => l.id === editingEffectId && l.effectType === 'imageSlideshow'))
                  ? 'w-[360px]'
                  : 'w-[260px]'
              }
            >
              <EffectsLibrarySidebarWithHud
                effects={effects}
                selectedEffects={selectedEffects}
                onEffectToggle={handleSelectEffect}
                onEffectDoubleClick={handleEffectDoubleClick}
                isVisible={true}
                stemUrlsReady={stemUrlsReady}
                editingEffectId={editingEffectId}
                editingEffectInstance={getEditingEffectInstance()}
                activeSliderValues={activeSliderValues}
                baseParameterValues={baseParameterValues}
                onParameterChange={handleParameterChange}
                onBack={handleBackFromInspector}
                mappings={mappings}
                featureNames={featureNames}
                onMapFeature={handleMapFeature}
                onUnmapFeature={handleUnmapFeature}
                onModulationAmountChange={handleModulationAmountChange}
                projectId={currentProjectId || ''}
                availableFiles={projectFiles?.files || []}
                activeCollectionId={activeCollectionId}
                setActiveCollectionId={setActiveCollectionId}
                modulatedParameterValues={modulatedParameterValues}
                layers={layers}
                setActiveParam={setActiveParam}
                aspectRatio={visualizerAspectRatio}
                masterStemId={projectAudioFiles?.files?.find(f => f.is_master)?.id ?? null}
                availableStems={allStemsForUI}
                onLayerUpdate={updateLayer}
              />
            </CollapsibleEffectsSidebar>
        </main>
      </div>
      </DndProvider>
        </AutoSaveProvider>
      ) : (
        <DndProvider backend={HTML5Backend}>
          {}
          <div className="flex h-screen bg-stone-800 text-white min-w-0 creative-visualizer-text">
            <CollapsibleSidebar>
              <div className="space-y-4">
                <MappingSourcesPanel
                  activeTrackId={activeTrackId || undefined}
                  className="mb-4"
                  selectedStemType={selectedStemType}
                  currentTime={currentTime}
                  cachedAnalysis={audioAnalysis.cachedAnalysis}
                  isPlaying={isPlaying}
                />
                <FileSelector
                  onFileSelected={handleFileSelected}
                  selectedFileId={selectedFileId || undefined}
                  useDemoData={useDemoData}
                  onDemoModeChange={handleDemoModeChange}
                  projectId={currentProjectId || undefined}
                  projectName={projectData?.name}
                />
              </div>
            </CollapsibleSidebar>
            <main className="flex-1 flex overflow-hidden min-w-0">
              <div className="flex-1 flex items-center justify-center text-stone-400">
                <p>Please select or create a project to begin</p>
              </div>
            </main>
          </div>
        </DndProvider>
      )}
    </>
  );
}
export default function CreativeVisualizerPageWithSuspense() {
  return (
    <Suspense>
      <CreativeVisualizerPage />
    </Suspense>
  );
}
```
