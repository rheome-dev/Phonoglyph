import { useRef, useState, useCallback, useEffect } from 'react';
import { AudioProcessor } from '@/lib/audio-processor';
import { AudioWorkerManager } from '@/lib/audio-worker-manager';
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
  loadStems: (stems: Stem[]) => Promise<void>;
  clearStems: () => void;
  setStemVolume: (stemId: string, volume: number) => void;
  getStemVolume: (stemId: string) => number;
  performanceMetrics: PerformanceMetrics;
  deviceProfile: string;
  fallbackState: any;
  visualizationData: AudioAnalysisData | null;
  stemsLoaded: boolean;
  isLooping: boolean;
  setLooping: (looping: boolean) => void;
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
  
  // Track which stems have finished playing
  const finishedStemsRef = useRef<Set<string>>(new Set());

  // Refs for audio context and buffers
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  const audioSourcesRef = useRef<Record<string, AudioBufferSourceNode>>({});
  const gainNodesRef = useRef<Record<string, GainNode>>({});
  const startTimeRef = useRef(0);
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

  // In loadStems, remove all worker/processor/feature pipeline logic, just load and decode audio buffers for playback
  const loadStems = useCallback(async (stems: Stem[]) => {
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
      for (const stem of stems) {
        try {
          const resp = await fetch(stem.url);
          if (!resp.ok) throw new Error(`Failed to load stem ${stem.id}: ${resp.status}`);
          const buffer = await resp.arrayBuffer();
          const audioBuffer = await audioContextRef.current!.decodeAudioData(buffer);
          decodedBuffers[stem.id] = audioBuffer;
          // Create gain node for volume control
          const gainNode = audioContextRef.current!.createGain();
          gainNode.gain.value = 0.7;
          gainNodesRef.current[stem.id] = gainNode;
          console.log(`🎵 Decoded audio buffer for ${stem.id}: ${audioBuffer.duration.toFixed(2)}s`);
        } catch (error) {
          console.error(`❌ Failed to decode audio buffer for ${stem.id}:`, error);
        }
      }
      audioBuffersRef.current = decodedBuffers;
      setStemsLoaded(true);
      setFeaturesByStem(Object.fromEntries(stems.map(s => [s.id, null])));
      console.log(`🎵 Successfully loaded ${stems.length} stems for playback`);
      console.log('📊 Loaded audio buffers:', Object.keys(decodedBuffers).map(id => ({
        id,
        duration: decodedBuffers[id].duration.toFixed(2) + 's',
        sampleRate: decodedBuffers[id].sampleRate,
        numberOfChannels: decodedBuffers[id].numberOfChannels
      })));
    } catch (error) {
      console.error('❌ Failed to load stems:', error);
      setStemsLoaded(false);
    } finally {
      loadingRef.current = false;
    }
  }, [stemsLoaded]);

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

      // Create and start new audio sources
      const startTime = audioContextRef.current.currentTime;
      startTimeRef.current = startTime;

      Object.entries(audioBuffersRef.current).forEach(([stemId, buffer]) => {
        const source = audioContextRef.current!.createBufferSource();
        const gainNode = gainNodesRef.current[stemId];
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current!.destination);
        
        // Set up loop handling
        source.onended = () => {
          if (!isIntentionallyStoppingRef.current && isLooping) {
            finishedStemsRef.current.add(stemId);
            
            // If all stems have finished, restart them
            if (finishedStemsRef.current.size === Object.keys(audioBuffersRef.current).length) {
              console.log('🔄 All stems finished, restarting...');
              finishedStemsRef.current.clear();
              play(); // Restart playback
            }
          }
        };
        
        source.start(startTime);
        audioSourcesRef.current[stemId] = source;
      });

      setIsPlaying(true);
      console.log('🎵 Audio playback started');

      // Start time updates
      timeUpdateIntervalRef.current = setInterval(() => {
        if (audioContextRef.current && isPlaying) {
          const currentTime = audioContextRef.current.currentTime - startTimeRef.current;
          setCurrentTime(Math.max(0, currentTime));
        }
      }, 16); // ~60fps

      // DISABLED: Real-time audio analysis
      // if (audioProcessorRef.current) {
      //   audioProcessorRef.current.startAnalysis();
      // }
      // if (workerManagerRef.current && workerManagerRef.current.isWorkerReady()) {
      //   workerManagerRef.current.startAnalysis();
      // }

    } catch (error) {
      console.error('❌ Failed to start audio playback:', error);
      setIsPlaying(false);
    }
  }, [stemsLoaded, isLooping]);

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
    console.log('⏸️ Audio playback paused');

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

  // Real-time time tracking for audio playback
  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;

    const updateTime = () => {
      try {
        const currentAudioTime = audioContextRef.current!.currentTime - startTimeRef.current;
        setCurrentTime(Math.max(0, currentAudioTime));
      } catch (error) {
        console.error('❌ Failed to update time:', error);
      }
    };

    const interval = setInterval(updateTime, 100); // Update 10 times per second
    return () => clearInterval(interval);
  }, [isPlaying]);

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

  // Helper function to get the maximum duration of all loaded stems
  const getMaxDuration = useCallback((): number => {
    const durations = Object.values(audioBuffersRef.current).map(buffer => buffer.duration);
    return Math.max(...durations, 0);
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
    performanceMetrics: { // This line was removed
      fps: 0,
      analysisLatency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      frameDrops: 0
    },
    deviceProfile: 'medium', // This line was removed
    fallbackState: {}, // This line was removed
    visualizationData,
    stemsLoaded,
    isLooping,
    setLooping: setIsLooping,
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