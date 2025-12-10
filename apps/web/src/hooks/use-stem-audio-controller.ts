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
  getStereoWindow: (stemId: string, windowSize: number) => { left: number[], right: number[] } | null;
}

export function useStemAudioController(): UseStemAudioController {
  const [isPlaying, setIsPlaying] = useState(false);
  const [featuresByStem, setFeaturesByStem] = useState<StemFeatures>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [visualizationData, setVisualizationData] = useState<AudioAnalysisData | null>(null);
  
  // Add state to track if stems are already loaded and worker is set up
  const [stemsLoaded, setStemsLoaded] = useState(false);
  const [workerSetupComplete, setWorkerSetupComplete] = useState(false);
  const loadingRef = useRef(false);
  const [isLooping, setIsLooping] = useState(true); // Default to looping
  const [soloedStems, setSoloedStems] = useState<Set<string>>(new Set());
  const masterStemIdRef = useRef<string | null>(null);

  // Track which stems have finished playing
  const finishedStemsRef = useRef<Set<string>>(new Set());

  // Refs for audio context and buffers
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  const audioSourcesRef = useRef<Record<string, AudioBufferSourceNode>>({});
  const gainNodesRef = useRef<Record<string, GainNode>>({});
  const startTimeRef = useRef(0);
  const scheduledStartTimeRef = useRef(0); // Scheduled start time for precise sync
  const pausedTimeRef = useRef(0);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isIntentionallyStoppingRef = useRef(false);



  // Remove advanced audio system initialization
  useEffect(() => {
    const initializeAudioSystem = async () => {
      try {
        // Create AudioContext
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Log initial audio context state
        debugLog.log('🎵 Audio context created with state:', audioContextRef.current.state);
        debugLog.log('🎵 Audio context sample rate:', audioContextRef.current.sampleRate);
        
        // Try to resume immediately if possible
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

    // Cleanup on unmount
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
        // If any stem is soloed, only it should be audible.
        targetVolume = isSoloed ? 0.7 : 0;
      } else {
        // If no stems are soloed, only the master should be audible.
        targetVolume = (stemId === masterStemId) ? 0.7 : 0;
      }

      // Smoothly ramp the volume to the new target.
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

  // In loadStems, remove all worker/processor/feature pipeline logic, just load and decode audio buffers for playback
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
      // Only fetch and decode audio buffers
      const decodedBuffers: Record<string, AudioBuffer> = {};
      const masterStem = stems.find(s => s.isMaster);
      if (masterStem) {
        masterStemIdRef.current = masterStem.id;
        debugLog.log('🎵 Master stem identified:', masterStem.id, masterStem.label);
      } else if (stems.length > 0) {
        // Fallback: if no master is flagged, assume the first one is.
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
          
          // Create gain node for volume control
          const gainNode = audioContextRef.current!.createGain();
          gainNode.gain.value = 0.7; // Default volume
          gainNodesRef.current[stem.id] = gainNode;
          
          debugLog.log(`🎵 Decoded audio buffer for ${stem.id}: ${audioBuffer.duration.toFixed(2)}s`);
          
          if (onDecode) {
            onDecode(stem.id, audioBuffer);
          }
        } catch (error) {
          debugLog.error(`❌ Failed to decode audio buffer for ${stem.id}:`, error);
        }
      }

      // Store all decoded buffers (MERGE instead of replace)
      audioBuffersRef.current = { ...audioBuffersRef.current, ...decodedBuffers };
      setStemsLoaded(true);
      loadingRef.current = false;
      // REMOVED VERBOSE LOGGING
      // debugLog.log(`✅ Successfully loaded ${stems.length} stems`);
      
    } catch (error) {
      debugLog.error('❌ Failed to load stems:', error);
      loadingRef.current = false;
    }
  }, []);

  // Remove startAnalysis and stopAnalysis logic

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
        try { source.stop(); } catch (e) { /* Ignore */ }
      });
      audioSourcesRef.current = {};

      const now = audioContextRef.current.currentTime;
      const scheduleDelay = 0.1;
      const scheduledStartTime = now + scheduleDelay;
      
      // Use pausedTimeRef to resume from the correct position
      const offset = pausedTimeRef.current;
      startTimeRef.current = scheduledStartTime - offset;
      scheduledStartTimeRef.current = scheduledStartTime - offset;

      const activeSoloStems = soloedStems.size > 0;
      const masterId = masterStemIdRef.current;

      Object.entries(audioBuffersRef.current).forEach(([stemId, buffer]) => {
        const source = audioContextRef.current!.createBufferSource();
        const gainNode = gainNodesRef.current[stemId];
        
        const isSoloed = soloedStems.has(stemId);
        
        // Determine initial volume based on solo state
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
        
        // *** THE KEY FIX ***
        // Use the Web Audio API's native looping.
        source.loop = isLooping;
        
        // Remove the complex onended handler entirely as it's no longer needed.
        source.onended = () => {
          // Can be used for cleanup if a track is stopped manually
          if (isIntentionallyStoppingRef.current) {
            delete audioSourcesRef.current[stemId];
          }
        };
        
        source.start(scheduledStartTime, offset); // Start at scheduled time from the correct offset
        audioSourcesRef.current[stemId] = source;
      });

      pausedTimeRef.current = 0; // Reset paused time
      setIsPlaying(true);
      isIntentionallyStoppingRef.current = false;

      // Start time updates
      timeUpdateIntervalRef.current = setInterval(() => {
        if (audioContextRef.current && isPlaying) {
          const elapsedTime = audioContextRef.current.currentTime - startTimeRef.current;
          // 🔥 FIX: Handle looping by wrapping currentTime to audio duration
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
      try { source.stop(); } catch (e) { /* Ignore */ }
    });
    
    audioSourcesRef.current = {};

    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
    
    // Correctly calculate and store the paused time
    pausedTimeRef.current = audioContextRef.current!.currentTime - startTimeRef.current;
    setIsPlaying(false);
  }, [isPlaying]);

  const stop = useCallback(() => {
    try {
      setIsPlaying(false);
      // stopAnalysis(); // This line was removed
      
      // Set flag to indicate intentional stopping
      isIntentionallyStoppingRef.current = true;
      
      // Stop all audio sources and clear them
      Object.entries(audioSourcesRef.current).forEach(([stemId, source]) => {
        try {
          source.stop();
        } catch (error) {
          debugLog.error(`❌ Failed to stop playback for ${stemId}:`, error);
        }
      });
      
      // Clear all audio sources to prevent layering
      audioSourcesRef.current = {};
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isIntentionallyStoppingRef.current = false;
      }, 100);
      
      // Reset playback position
      setCurrentTime(0);
      pausedTimeRef.current = 0;
      startTimeRef.current = 0;
    } catch (error) {
      debugLog.error('❌ Failed to stop playback:', error);
    }
  }, []); // This line was removed

  const clearStems = useCallback(() => {
    try {
      setIsPlaying(false);
      // stopAnalysis(); // This line was removed
      setCurrentTime(0);
      setFeaturesByStem({});
      setVisualizationData(null);
      
      // Reset loading state
      setStemsLoaded(false);
      setWorkerSetupComplete(false);
      loadingRef.current = false;
      
      // Stop and clear all audio sources
      Object.entries(audioSourcesRef.current).forEach(([stemId, source]) => {
        try {
          source.stop();
        } catch (error) {
          // Ignore errors when stopping already stopped sources
        }
      });
      
      // Clear audio references
      audioSourcesRef.current = {};
      audioBuffersRef.current = {};
      gainNodesRef.current = {};
      pausedTimeRef.current = 0;
      startTimeRef.current = 0;
      
      // Clear audio processor
      // if (audioProcessorRef.current) { // This line was removed
      //   audioProcessorRef.current.dispose(); // This line was removed
      // } // This line was removed
      
      debugLog.log('🗑️ Advanced audio analysis and playback cleared');
    } catch (error) {
      debugLog.error('❌ Failed to clear stems:', error);
    }
  }, []); // This line was removed

  // DISABLED: Real-time visualization data processing (now using cached analysis)
  // useEffect(() => {
  //   if (!isPlaying || !featurePipelineRef.current) return;

  //   const processVisualizationData = () => {
  //     try {
  //       // Get current features from all stems
  //       const allFeatures = Object.values(featuresByStem).filter(Boolean) as StemAnalysis[];
        
  //       if (allFeatures.length > 0) {
  //         // Convert array to record format for processing
  //         const featuresRecord: Record<string, StemAnalysis> = {};
  //         allFeatures.forEach((analysis, index) => {
  //           featuresRecord[`stem_${index}`] = analysis;
  //         });
          
  //         // Process features through visualization pipeline
  //         const visualizationParams = featurePipelineRef.current!.processFeatures(featuresRecord);
          
  //         // Convert VisualizationParameters to AudioAnalysisData
  //         const audioAnalysisData: AudioAnalysisData = {
  //           frequencies: new Array(256).fill(visualizationParams.energy),
  //           timeData: new Array(256).fill(visualizationParams.brightness),
  //           volume: visualizationParams.energy,
  //           bass: visualizationParams.color.warmth,
  //           mid: visualizationParams.movement.speed,
  //           treble: visualizationParams.scale
  //         };
          
  //         setVisualizationData(audioAnalysisData);
  //       }
  //     } catch (error) {
  //       debugLog.error('❌ Failed to process visualization data:', error);
  //     }
  //   };

  //   const interval = setInterval(processVisualizationData, 16); // ~60fps
  //   return () => clearInterval(interval);
  // }, [isPlaying, featuresByStem]);

  // OPTIMIZED REAL-TIME TIME TRACKING
  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;

    let animationFrameId: number;
    const updateTime = () => {
      try {
        const elapsedTime = audioContextRef.current!.currentTime - startTimeRef.current;
        
        // **FIX 2: HANDLE LOOPING BY WRAPPING THE CURRENT TIME**
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
  }, [isPlaying]); // Dependency array is correct, no need to add more

  // Add user interaction handler to resume audio context
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

    // Listen for user interactions that should enable audio
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

  // Adaptive performance optimization
  useEffect(() => {
    // if (!deviceOptimizerRef.current || !performanceMonitorRef.current) return; // This line was removed

    // const optimizePerformance = () => { // This line was removed
    //   try { // This line was removed
    //     const metrics = performanceMonitorRef.current!.getCurrentMetrics(); // This line was removed
    //     deviceOptimizerRef.current!.updatePerformanceMetrics( // This line was removed
    //       metrics.fps, // This line was removed
    //       metrics.analysisLatency, // This line was removed
    //       metrics.memoryUsage // This line was removed
    //     ); // This line was removed
    //   } catch (error) { // This line was removed
    //     debugLog.error('❌ Failed to optimize performance:', error); // This line was removed
    //   } // This line was removed
    // }; // This line was removed

    // const interval = setInterval(optimizePerformance, 1000); // Every second // This line was removed
    // return () => clearInterval(interval); // This line was removed
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

  // Test audio output function
  const testAudioOutput = useCallback(async () => {
    if (!audioContextRef.current) {
      debugLog.warn('⚠️ No audio context available for test');
      return;
    }

    try {
      debugLog.log('🎵 Testing audio output...');
      
      // Create a simple test tone
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime); // A4 note
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime); // Low volume
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

  // Helper function to get the maximum duration of all loaded stems
  const getMaxDuration = useCallback((): number => {
    const durations = Object.values(audioBuffersRef.current).map(buffer => buffer.duration);
    return Math.max(...durations, 0);
  }, []);

  // Helper function to get the master stem duration if available
  const getMasterDuration = useCallback((): number => {
    const masterId = masterStemIdRef.current;
    if (masterId && audioBuffersRef.current[masterId]) {
      return audioBuffersRef.current[masterId].duration;
    }
    return getMaxDuration();
  }, [getMaxDuration]);

  // Expose audio context latency and time
  const getAudioLatency = useCallback((): number => {
    const ctx = audioContextRef.current;
    if (!ctx) return 0;
    // baseLatency is always present, outputLatency is optional
    return (ctx.baseLatency || 0) + (ctx.outputLatency || 0);
  }, []);

  const getAudioContextTime = useCallback((): number => {
    return audioContextRef.current ? audioContextRef.current.currentTime : 0;
  }, []);

  // Helper: Get a real-time stereo window for a stem
  // currentTime is the loop-aware playback time (0 to duration, wraps on loop)
  const getStereoWindow = useCallback((stemId: string, windowSize: number = 1024, currentTimeOverride?: number) => {
    const buffer = audioBuffersRef.current[stemId];
    if (!buffer) {
      debugLog.warn('[getStereoWindow] No buffer for stemId', stemId, 'Available buffers:', Object.keys(audioBuffersRef.current));
      return null;
    }
    
    const numChannels = buffer.numberOfChannels;
    const bufferDuration = buffer.duration;
    const sampleRate = buffer.sampleRate;
    
    // Use provided currentTime (which is loop-aware) or calculate from audio context
    let playbackTime: number;
    if (currentTimeOverride !== undefined) {
      // Use the provided currentTime which is already loop-aware
      playbackTime = currentTimeOverride;
    } else {
      // Calculate from audio context, handling looping
      const elapsedTime = (audioContextRef.current?.currentTime || 0) - startTimeRef.current;
      const masterDuration = getMasterDuration();
      playbackTime = masterDuration > 0 ? (elapsedTime % masterDuration) : Math.max(0, elapsedTime);
    }
    
    // Ensure playbackTime is within buffer bounds (handle looping)
    playbackTime = playbackTime % bufferDuration;
    if (playbackTime < 0) playbackTime += bufferDuration;
    
    // Calculate sample position in the buffer
    const currentSample = Math.floor(playbackTime * sampleRate);
    const start = currentSample - windowSize;
    const end = currentSample;
    
    let left: number[] = [];
    let right: number[] = [];
    
    try {
      if (numChannels === 1) {
        // Mono: duplicate to both channels
        const channel = buffer.getChannelData(0);
        
        // Handle wrapping around buffer boundaries for looping
        if (start < 0) {
          // Need to wrap: get samples from end of buffer + beginning
          const samplesFromEnd = Math.abs(start);
          const samplesFromStart = end; // Number of samples from start of buffer
          
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
          // Need to wrap: get samples from end + beginning
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
          // Normal case: all samples within buffer bounds
          const channelData = Array.from(channel.slice(start, end));
          left = channelData;
          right = channelData;
        }
      } else {
        // Stereo: get both channels
        const leftChannel = buffer.getChannelData(0);
        const rightChannel = buffer.getChannelData(1);
        
        // Handle wrapping around buffer boundaries for looping
        if (start < 0) {
          // Need to wrap: get samples from end of buffer + beginning
          const samplesFromEnd = Math.abs(start);
          const samplesFromStart = end; // Number of samples from start of buffer
          
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
          // Need to wrap: get samples from end + beginning
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
          // Normal case: all samples within buffer bounds
          left = Array.from(leftChannel.slice(start, end));
          right = Array.from(rightChannel.slice(start, end));
        }
      }
    } catch (err) {
      debugLog.error('[getStereoWindow] Error accessing buffer:', err, { stemId, buffer, start, end, currentSample, playbackTime });
      return null;
    }
    
    // Pad if needed to reach windowSize (shouldn't happen with proper wrapping, but safety check)
    if (left.length < windowSize) {
      const padding = windowSize - left.length;
      left = Array(padding).fill(0).concat(left);
      right = Array(padding).fill(0).concat(right);
    }
    
    // Trim if longer than windowSize (shouldn't happen, but safety check)
    if (left.length > windowSize) {
      left = left.slice(-windowSize);
      right = right.slice(-windowSize);
    }
    
    return { left, right };
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
    getAudioLatency, // <-- add this
    getAudioContextTime, // <-- add this
    scheduledStartTimeRef, // <-- expose for mapping loop
    duration: getMasterDuration(), // <-- expose duration
    getStereoWindow, // <-- expose real-time stereo window
  };
}

// Helper function to create mock audio buffer for fallback
function createMockAudioBuffer(durationSeconds: number = 10): ArrayBuffer {
  const sampleRate = 44100;
  const samples = durationSeconds * sampleRate;
  const buffer = new ArrayBuffer(samples * 4); // 32-bit float
  const view = new Float32Array(buffer);
  
  // Generate realistic audio data
  for (let i = 0; i < samples; i++) {
    view[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5; // 440Hz tone
  }
  
  return buffer;
} 