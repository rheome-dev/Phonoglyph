import { useRef, useState, useCallback, useEffect } from 'react';
import { PerformanceMonitor } from '@/lib/performance-monitor';
import { DeviceOptimizer } from '@/lib/device-optimizer';
import { FallbackSystem } from '@/lib/fallback-system';
import { VisualizationFeaturePipeline } from '@/lib/visualization-feature-pipeline';
import { StemAnalysis, AudioFeature, PerformanceMetrics } from '@/types/stem-audio-analysis';
import { AudioAnalysisData } from '@/types/visualizer';

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
  performanceMetrics: PerformanceMetrics;
  deviceProfile: string;
  fallbackState: any;
  visualizationData: AudioAnalysisData | null;
  stemsLoaded: boolean;
  isLooping: boolean;
  setLooping: (looping: boolean) => void;
  soloedStems: Set<string>;
  toggleStemSolo: (stemId: string) => void;
  getAudioLatency: () => number;
  getAudioContextTime: () => number;
  scheduledStartTimeRef: React.MutableRefObject<number>;
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

  // Remove all advanced system refs
  // const audioProcessorRef = useRef<AudioProcessor | null>(null);
  // const workerManagerRef = useRef<AudioWorkerManager | null>(null);
  // const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
  // const fallbackSystemRef = useRef<FallbackSystem | null>(null);
  // const featurePipelineRef = useRef<VisualizationFeaturePipeline | null>(null);
  // const deviceOptimizerRef = useRef<DeviceOptimizer | null>(null);

  // Remove advanced audio system initialization
  useEffect(() => {
    const initializeAudioSystem = async () => {
      try {
        // Create AudioContext
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Log initial audio context state
        console.log('🎵 Audio context created with state:', audioContextRef.current.state);
        console.log('🎵 Audio context sample rate:', audioContextRef.current.sampleRate);
        
        // Try to resume immediately if possible
        if (audioContextRef.current.state === 'suspended') {
          console.log('🎵 Audio context is suspended, attempting to resume...');
          try {
            await audioContextRef.current.resume();
            console.log('🎵 Audio context resumed successfully');
          } catch (resumeError) {
            console.warn('⚠️ Could not resume audio context immediately:', resumeError);
            console.log('🎵 User interaction will be required to start audio');
          }
        }
        
        // Initialize device optimizer
        // deviceOptimizerRef.current = new DeviceOptimizer(); // This line was removed
        // const deviceConfig = deviceOptimizerRef.current.getOptimizedConfig(); // This line was removed
        // setDeviceProfile(deviceOptimizerRef.current.getCurrentProfile().name); // This line was removed
        
        // Initialize audio processor with device-optimized config // This line was removed
        // audioProcessorRef.current = new AudioProcessor(audioContextRef.current, deviceConfig); // This line was removed
        
        // Initialize worker manager // This line was removed
        // workerManagerRef.current = new AudioWorkerManager(); // This line was removed
        
        // Initialize performance monitor // This line was removed
        // performanceMonitorRef.current = new PerformanceMonitor(); // This line was removed
        
        // Initialize fallback system // This line was removed
        // fallbackSystemRef.current = new FallbackSystem(); // This line was removed
        
        // Initialize feature pipeline // This line was removed
        // featurePipelineRef.current = new VisualizationFeaturePipeline(); // This line was removed
        
        // Set up performance monitoring callbacks // This line was removed
        // performanceMonitorRef.current.updateMetrics = (metrics) => { // This line was removed
        //   // setPerformanceMetrics(prev => ({ ...prev, ...metrics })); // This line was removed
        // }; // This line was removed
        
        // Set up worker manager callbacks // This line was removed
        // if (workerManagerRef.current) { // This line was removed
        //   workerManagerRef.current.setStemAnalysisCallback((stemType, analysis) => { // This line was removed
        //     setFeaturesByStem(prev => ({ ...prev, [stemType]: analysis })); // This line was removed
        //   }); // This line was removed
          
        //   workerManagerRef.current.setPerformanceCallback((metrics) => { // This line was removed
        //     // setPerformanceMetrics(metrics); // This line was removed
        //     if (performanceMonitorRef.current) { // This line was removed
        //       // performanceMonitorRef.current.updateMetrics(metrics); // This line was removed
        //     } // This line was removed
        //   }); // This line was removed
        // } // This line was removed
        
        // Set up fallback system monitoring // This line was removed
        // if (fallbackSystemRef.current) { // This line was removed
        //   // setFallbackState(fallbackSystemRef.current.getFallbackState()); // This line was removed
        // } // This line was removed
        
        console.log('🎵 Advanced audio analysis system initialized');
        
      } catch (error) {
        console.error('❌ Failed to initialize audio analysis system:', error);
      }
    };

    initializeAudioSystem();

    // Cleanup on unmount
    return () => {
      // if (audioProcessorRef.current) audioProcessorRef.current.dispose(); // This line was removed
      // if (workerManagerRef.current) workerManagerRef.current.dispose(); // This line was removed
      // if (performanceMonitorRef.current) performanceMonitorRef.current.dispose(); // This line was removed
      // if (fallbackSystemRef.current) fallbackSystemRef.current.dispose(); // This line was removed
      // if (featurePipelineRef.current) featurePipelineRef.current.reset(); // This line was removed
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const activeSoloStems = soloedStems.size > 0;

    console.log('🎵 Updating solo state:', {
      soloedStems: Array.from(soloedStems),
      activeSoloStems,
      availableStems: Object.keys(gainNodesRef.current)
    });

    Object.entries(gainNodesRef.current).forEach(([stemId, gainNode]) => {
      const isMaster = stemId === masterStemIdRef.current;
      const isSoloed = soloedStems.has(stemId);
      
      // Solo logic:
      // - If any stems are soloed, only play soloed stems
      // - If no stems are soloed, play all stems (not just master)
      const shouldPlay = activeSoloStems ? isSoloed : true;
      const targetVolume = shouldPlay ? 0.7 : 0;

      console.log(`🎵 Stem ${stemId}:`, {
        isMaster,
        isSoloed,
        shouldPlay,
        targetVolume,
        currentGain: gainNode.gain.value
      });

      // Smoothly ramp to the target volume to avoid clicks
      gainNode.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 0.1);
    });
  }, [soloedStems]);

  const toggleStemSolo = useCallback((stemId: string) => {
    console.log('🎵 Toggling solo for stem:', stemId);
    setSoloedStems(prev => {
      const newSoloed = new Set(prev);
      if (newSoloed.has(stemId)) {
        newSoloed.delete(stemId);
        console.log('🎵 Removed solo from stem:', stemId);
      } else {
        newSoloed.add(stemId);
        console.log('🎵 Added solo to stem:', stemId);
      }
      console.log('🎵 New soloed stems:', Array.from(newSoloed));
      return newSoloed;
    });
  }, []);

  // In loadStems, remove all worker/processor/feature pipeline logic, just load and decode audio buffers for playback
  const loadStems = useCallback(async (stems: Stem[], onDecode?: (stemId: string, buffer: AudioBuffer) => void) => {
    if (stems.length === 0) return;
    if (loadingRef.current || stemsLoaded) {
      console.log('⚠️ Stems already loading or loaded, skipping duplicate request');
      return;
    }
    loadingRef.current = true;
    try {
      console.log(`🎵 Starting to load ${stems.length} stems...`);
      // Only fetch and decode audio buffers
      const decodedBuffers: Record<string, AudioBuffer> = {};
      const masterStem = stems.find(s => s.isMaster);
      if (masterStem) {
        masterStemIdRef.current = masterStem.id;
      } else if (stems.length > 0) {
        // Fallback: if no master is flagged, assume the first one is.
        masterStemIdRef.current = stems[0].id;
        console.warn('⚠️ No master stem designated. Defaulting to first stem:', stems[0].id);
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
          
          console.log(`🎵 Decoded audio buffer for ${stem.id}: ${audioBuffer.duration.toFixed(2)}s`);
          
          if (onDecode) {
            onDecode(stem.id, audioBuffer);
          }
        } catch (error) {
          console.error(`❌ Failed to decode audio buffer for ${stem.id}:`, error);
        }
      }

      // Store all decoded buffers
      audioBuffersRef.current = decodedBuffers;
      setStemsLoaded(true);
      loadingRef.current = false;
      // REMOVED VERBOSE LOGGING
      // console.log(`✅ Successfully loaded ${stems.length} stems`);
      
    } catch (error) {
      console.error('❌ Failed to load stems:', error);
      loadingRef.current = false;
    }
  }, []);

  // Remove startAnalysis and stopAnalysis logic

  const play = useCallback(async () => {
    if (!audioContextRef.current || !stemsLoaded) {
      console.warn('⚠️ Cannot play: AudioContext not ready or stems not loaded');
      return;
    }

    try {
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Stop any currently playing sources
      Object.values(audioSourcesRef.current).forEach(source => {
        try {
          source.stop();
        } catch (e) {
          // Source might already be stopped
        }
      });
      audioSourcesRef.current = {};

      // Reset finished stems tracking
      finishedStemsRef.current.clear();
      isIntentionallyStoppingRef.current = false;

      // Schedule playback to start slightly in the future for sync
      const now = audioContextRef.current.currentTime;
      const scheduleDelay = 0.1; // 100ms in the future
      const scheduledStartTime = now + scheduleDelay;
      scheduledStartTimeRef.current = scheduledStartTime;
      startTimeRef.current = scheduledStartTime;

      const activeSoloStems = soloedStems.size > 0;

      console.log('🎵 Starting playback with solo state:', {
        activeSoloStems,
        soloedStems: Array.from(soloedStems)
      });

      // Apply current solo state to all gain nodes immediately
      Object.entries(gainNodesRef.current).forEach(([stemId, gainNode]) => {
        const isSoloed = soloedStems.has(stemId);
        const shouldPlay = activeSoloStems ? isSoloed : true;
        const targetVolume = shouldPlay ? 0.7 : 0;
        
        console.log(`🎵 Setting initial gain for ${stemId}:`, {
          isSoloed,
          shouldPlay,
          targetVolume
        });
        
        gainNode.gain.setValueAtTime(targetVolume, audioContextRef.current!.currentTime);
      });

      Object.entries(audioBuffersRef.current).forEach(([stemId, buffer]) => {
        const source = audioContextRef.current!.createBufferSource();
        const gainNode = gainNodesRef.current[stemId];
        
        const isMaster = stemId === masterStemIdRef.current;
        const isSoloed = soloedStems.has(stemId);

        // Play logic:
        // - If any stem is soloed, play only soloed stems.
        // - If no stems are soloed, play all stems (not just master).
        const shouldPlay = activeSoloStems ? isSoloed : true;

        console.log(`🎵 Creating source for ${stemId}:`, {
          isMaster,
          isSoloed,
          shouldPlay,
          activeSoloStems
        });

        // Always start the source, but control volume via gain
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current!.destination);
        
        // Set up loop handling
        source.onended = () => {
          if (!isIntentionallyStoppingRef.current && isLooping) {
            finishedStemsRef.current.add(stemId);
            
            // Determine which stems we expect to end
            const stemsThatShouldBePlaying = new Set<string>();
            if (activeSoloStems) {
              soloedStems.forEach(id => stemsThatShouldBePlaying.add(id));
            } else {
              // If no stems are soloed, all stems should be playing
              Object.keys(audioBuffersRef.current).forEach(id => stemsThatShouldBePlaying.add(id));
            }

            // If all *active* stems have finished, restart them
            const allActiveFinished = [...stemsThatShouldBePlaying].every(id => finishedStemsRef.current.has(id));

            if (allActiveFinished) {
              console.log('🔄 All active stems finished, restarting...');
              finishedStemsRef.current.clear();
              // Schedule next playback at the correct time
              const nextStartTime = scheduledStartTimeRef.current + buffer.duration;
              scheduledStartTimeRef.current = nextStartTime;
              startTimeRef.current = nextStartTime;
              Object.entries(audioBuffersRef.current).forEach(([loopStemId, loopBuffer]) => {
                const loopSource = audioContextRef.current!.createBufferSource();
                const loopGainNode = gainNodesRef.current[loopStemId];
                const isLoopMaster = loopStemId === masterStemIdRef.current;
                const isLoopSoloed = soloedStems.has(loopStemId);
                const shouldLoopPlay = activeSoloStems ? isLoopSoloed : true;
                if (shouldLoopPlay) {
                  loopGainNode.gain.setValueAtTime(0.7, audioContextRef.current!.currentTime);
                } else {
                  loopGainNode.gain.setValueAtTime(0, audioContextRef.current!.currentTime);
                }
                loopSource.buffer = loopBuffer;
                loopSource.connect(loopGainNode);
                loopGainNode.connect(audioContextRef.current!.destination);
                loopSource.onended = source.onended; // Reuse the same onended logic
                loopSource.start(nextStartTime);
                audioSourcesRef.current[loopStemId] = loopSource;
              });
            }
          }
        };
        
        source.start(scheduledStartTime);
        audioSourcesRef.current[stemId] = source;
      });

      setIsPlaying(true);
      // REMOVED VERBOSE LOGGING
      // console.log('🎵 Audio playback started');

      // Start time updates
      timeUpdateIntervalRef.current = setInterval(() => {
        if (audioContextRef.current && isPlaying) {
          const currentTime = audioContextRef.current.currentTime - scheduledStartTimeRef.current;
          setCurrentTime(Math.max(0, currentTime));
        }
      }, 16); // ~60fps

    } catch (error) {
      console.error('❌ Failed to start audio playback:', error);
      setIsPlaying(false);
    }
  }, [stemsLoaded, isLooping, soloedStems]);

  const pause = useCallback(() => {
    isIntentionallyStoppingRef.current = true;
    
    // Stop all audio sources
    Object.values(audioSourcesRef.current).forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source might already be stopped
      }
    });
    audioSourcesRef.current = {};

    // Clear time update interval
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }

    // Store current time for resume
    pausedTimeRef.current = currentTime;
    setIsPlaying(false);
    // REMOVED VERBOSE LOGGING
    // console.log('⏸️ Audio playback paused');

    // DISABLED: Real-time audio analysis
    // if (audioProcessorRef.current) {
    //   audioProcessorRef.current.stopAnalysis();
    // }
    // if (workerManagerRef.current) {
    //   workerManagerRef.current.stopAnalysis();
    // }
  }, [currentTime]);

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
          console.error(`❌ Failed to stop playback for ${stemId}:`, error);
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
      console.error('❌ Failed to stop playback:', error);
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
      
      console.log('🗑️ Advanced audio analysis and playback cleared');
    } catch (error) {
      console.error('❌ Failed to clear stems:', error);
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
  //       console.error('❌ Failed to process visualization data:', error);
  //     }
  //   };

  //   const interval = setInterval(processVisualizationData, 16); // ~60fps
  //   return () => clearInterval(interval);
  // }, [isPlaying, featuresByStem]);

  // OPTIMIZED REAL-TIME TIME TRACKING
  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;

    // Use requestAnimationFrame for more accurate timing, but cap at 30fps
    let animationFrameId: number;
    let lastUpdateTime = 0;
    const targetFrameTime = 1000 / 30; // 33.33ms for 30fps
    
    const updateTime = () => {
      try {
        const now = performance.now();
        const elapsed = now - lastUpdateTime;
        
        // Only update if enough time has passed (30fps cap)
        if (elapsed >= targetFrameTime) {
          const currentAudioTime = audioContextRef.current!.currentTime - startTimeRef.current;
          setCurrentTime(Math.max(0, currentAudioTime));
          lastUpdateTime = now;
        }
        
        animationFrameId = requestAnimationFrame(updateTime);
      } catch (error) {
        console.error('❌ Failed to update time:', error);
      }
    };

    animationFrameId = requestAnimationFrame(updateTime);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);

  // Add user interaction handler to resume audio context
  useEffect(() => {
    const handleUserInteraction = async () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        console.log('🎵 User interaction detected, resuming audio context...');
        try {
          await audioContextRef.current.resume();
          console.log('🎵 Audio context resumed via user interaction');
        } catch (error) {
          console.error('❌ Failed to resume audio context on user interaction:', error);
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
    //     console.error('❌ Failed to optimize performance:', error); // This line was removed
    //   } // This line was removed
    // }; // This line was removed

    // const interval = setInterval(optimizePerformance, 1000); // Every second // This line was removed
    // return () => clearInterval(interval); // This line was removed
  }, []);

  const setStemVolume = useCallback((stemId: string, volume: number) => {
    const gainNode = gainNodesRef.current[stemId];
    if (gainNode) {
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      console.log(`🎵 Set volume for ${stemId}: ${volume}`);
    }
  }, []);

  const getStemVolume = useCallback((stemId: string): number => {
    const gainNode = gainNodesRef.current[stemId];
    return gainNode ? gainNode.gain.value : 0.7;
  }, []);

  // Test audio output function
  const testAudioOutput = useCallback(async () => {
    if (!audioContextRef.current) {
      console.warn('⚠️ No audio context available for test');
      return;
    }

    try {
      console.log('🎵 Testing audio output...');
      
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
      
      console.log('🎵 Test tone played - you should hear a 440Hz tone for 0.5 seconds');
    } catch (error) {
      console.error('❌ Audio output test failed:', error);
    }
  }, []);

  // Helper function to get the maximum duration of all loaded stems
  const getMaxDuration = useCallback((): number => {
    const durations = Object.values(audioBuffersRef.current).map(buffer => buffer.duration);
    return Math.max(...durations, 0);
  }, []);

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
    performanceMetrics: {
      fps: 0,
      analysisLatency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      frameDrops: 0
    },
    deviceProfile: 'medium',
    fallbackState: {},
    visualizationData,
    stemsLoaded,
    isLooping,
    setLooping: setIsLooping,
    soloedStems,
    toggleStemSolo,
    getAudioLatency, // <-- add this
    getAudioContextTime, // <-- add this
    scheduledStartTimeRef // <-- expose for mapping loop
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