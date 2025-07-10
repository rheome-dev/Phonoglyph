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
}

export function useStemAudioController(): UseStemAudioController {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [featuresByStem, setFeaturesByStem] = useState<StemFeatures>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    analysisLatency: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    frameDrops: 0
  });
  const [visualizationData, setVisualizationData] = useState<AudioAnalysisData | null>(null);
  const [deviceProfile, setDeviceProfile] = useState<string>('medium');
  const [fallbackState, setFallbackState] = useState<any>({});

  // Advanced audio analysis components
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const workerManagerRef = useRef<AudioWorkerManager | null>(null);
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
  const deviceOptimizerRef = useRef<DeviceOptimizer | null>(null);
  const fallbackSystemRef = useRef<FallbackSystem | null>(null);
  const featurePipelineRef = useRef<VisualizationFeaturePipeline | null>(null);
  
  // Audio playback components
  const audioSourcesRef = useRef<Record<string, AudioBufferSourceNode>>({});
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  const gainNodesRef = useRef<Record<string, GainNode>>({});
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  // Initialize advanced audio analysis system
  useEffect(() => {
    const initializeAudioSystem = async () => {
      try {
        // Create AudioContext
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Initialize device optimizer
        deviceOptimizerRef.current = new DeviceOptimizer();
        const deviceConfig = deviceOptimizerRef.current.getOptimizedConfig();
        setDeviceProfile(deviceOptimizerRef.current.getCurrentProfile().name);
        
        // Initialize audio processor with device-optimized config
        audioProcessorRef.current = new AudioProcessor(audioContextRef.current, deviceConfig);
        
        // Initialize worker manager
        workerManagerRef.current = new AudioWorkerManager();
        
        // Initialize performance monitor
        performanceMonitorRef.current = new PerformanceMonitor();
        
        // Initialize fallback system
        fallbackSystemRef.current = new FallbackSystem();
        
        // Initialize feature pipeline
        featurePipelineRef.current = new VisualizationFeaturePipeline();
        
        // Set up performance monitoring callbacks
        performanceMonitorRef.current.updateMetrics = (metrics) => {
          setPerformanceMetrics(prev => ({ ...prev, ...metrics }));
        };
        
        // Set up worker manager callbacks
        if (workerManagerRef.current) {
          workerManagerRef.current.setStemAnalysisCallback((stemType, analysis) => {
            setFeaturesByStem(prev => ({ ...prev, [stemType]: analysis }));
          });
          
          workerManagerRef.current.setPerformanceCallback((metrics) => {
            setPerformanceMetrics(metrics);
            if (performanceMonitorRef.current) {
              performanceMonitorRef.current.updateMetrics(metrics);
            }
          });
        }
        
        // Set up fallback system monitoring
        if (fallbackSystemRef.current) {
          setFallbackState(fallbackSystemRef.current.getFallbackState());
        }
        
        console.log('🎵 Advanced audio analysis system initialized');
        
      } catch (error) {
        console.error('❌ Failed to initialize audio analysis system:', error);
      }
    };

    initializeAudioSystem();

    // Cleanup on unmount
    return () => {
      if (audioProcessorRef.current) audioProcessorRef.current.dispose();
      if (workerManagerRef.current) workerManagerRef.current.dispose();
      if (performanceMonitorRef.current) performanceMonitorRef.current.dispose();
      if (fallbackSystemRef.current) fallbackSystemRef.current.dispose();
      if (featurePipelineRef.current) featurePipelineRef.current.reset();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const loadStems = useCallback(async (stems: Stem[]) => {
    if (stems.length === 0) return;
    
    try {
      // Use fallback system for robust stem loading
      if (!fallbackSystemRef.current) {
        throw new Error('Fallback system not initialized');
      }

      // Convert stems to ArrayBuffer format for processing
      const stemBuffers: Record<string, ArrayBuffer> = {};
      
      for (const stem of stems) {
        const buffer = await fallbackSystemRef.current.executeWithFallback(
          `load_stem_${stem.id}`,
          async () => {
            const resp = await fetch(stem.url);
            if (!resp.ok) {
              throw new Error(`Failed to load stem ${stem.id}: ${resp.status}`);
            }
            return await resp.arrayBuffer();
          },
          async () => {
            // Fallback: create mock audio buffer
            console.warn(`Using fallback audio buffer for ${stem.id}`);
            return createMockAudioBuffer(10);
          }
        );
        
        stemBuffers[stem.id] = buffer;
      }

      // Setup processing with advanced audio processor
      if (audioProcessorRef.current) {
        await audioProcessorRef.current.setupProcessing(stemBuffers);
      }

      // Setup worker-based analysis if available
      if (workerManagerRef.current && workerManagerRef.current.isWorkerReady()) {
        for (const [stemType, buffer] of Object.entries(stemBuffers)) {
          await workerManagerRef.current.setupStemAnalysis(stemType, buffer, {
            bufferSize: 512,
            analysisResolution: 1
          });
        }
      }

      // Initialize feature pipeline (no specific initialization needed)
      if (featurePipelineRef.current) {
        featurePipelineRef.current.reset();
      }

      // Decode audio buffers for playback
      const decodedBuffers: Record<string, AudioBuffer> = {};
      for (const [stemId, buffer] of Object.entries(stemBuffers)) {
        try {
          const audioBuffer = await audioContextRef.current!.decodeAudioData(buffer);
          decodedBuffers[stemId] = audioBuffer;
          
          // Create gain node for volume control
          const gainNode = audioContextRef.current!.createGain();
          gainNode.gain.value = 0.7; // Default volume
          gainNodesRef.current[stemId] = gainNode;
          
          console.log(`🎵 Decoded audio buffer for ${stemId}: ${audioBuffer.duration.toFixed(2)}s`);
        } catch (error) {
          console.error(`❌ Failed to decode audio buffer for ${stemId}:`, error);
        }
      }
      
      audioBuffersRef.current = decodedBuffers;

      setFeaturesByStem(Object.fromEntries(stems.map(s => [s.id, null])));
      console.log(`🎵 Loaded ${stems.length} stems with advanced analysis and playback`);
      
    } catch (error) {
      console.error('❌ Failed to load stems:', error);
    }
  }, []);

  const startAnalysis = useCallback(() => {
    try {
      // Start audio processor analysis
      if (audioProcessorRef.current) {
        audioProcessorRef.current.startAnalysis();
      }

      // Start worker-based analysis
      if (workerManagerRef.current && workerManagerRef.current.isWorkerReady()) {
        workerManagerRef.current.startAnalysis();
      }

      // Start performance monitoring (monitoring starts automatically)
      if (performanceMonitorRef.current) {
        // Monitoring is handled internally by the PerformanceMonitor
      }

      console.log('🎵 Advanced audio analysis started');
    } catch (error) {
      console.error('❌ Failed to start analysis:', error);
    }
  }, []);

  const stopAnalysis = useCallback(() => {
    try {
      // Stop audio processor analysis
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stopAnalysis();
      }

      // Stop worker-based analysis
      if (workerManagerRef.current) {
        workerManagerRef.current.stopAnalysis();
      }

      // Stop performance monitoring (handled by dispose)
      if (performanceMonitorRef.current) {
        // Monitoring stops when PerformanceMonitor is disposed
      }

      console.log('🎵 Advanced audio analysis stopped');
    } catch (error) {
      console.error('❌ Failed to stop analysis:', error);
    }
  }, []);

  const play = useCallback(() => {
    if (!audioContextRef.current) return;
    
    try {
      setIsPlaying(true);
      startAnalysis();
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      // Start audio playback for all loaded stems
      const currentTime = audioContextRef.current.currentTime;
      const offset = pausedTimeRef.current;
      
      Object.entries(audioBuffersRef.current).forEach(([stemId, buffer]) => {
        try {
          // Stop existing source if any
          if (audioSourcesRef.current[stemId]) {
            audioSourcesRef.current[stemId].stop();
          }
          
          // Create new source
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = buffer;
          
          // Connect to gain node and destination
          const gainNode = gainNodesRef.current[stemId];
          source.connect(gainNode);
          gainNode.connect(audioContextRef.current!.destination);
          
          // Start playback
          source.start(0, offset);
          audioSourcesRef.current[stemId] = source;
          
          console.log(`🎵 Started playback for ${stemId}`);
        } catch (error) {
          console.error(`❌ Failed to start playback for ${stemId}:`, error);
        }
      });
      
      startTimeRef.current = currentTime - offset;
      console.log('▶️ Advanced audio playback started');
    } catch (error) {
      console.error('❌ Failed to start playback:', error);
      setIsPlaying(false);
    }
  }, [startAnalysis]);

  const pause = useCallback(() => {
    try {
      setIsPlaying(false);
      stopAnalysis();
      
      // Stop all audio sources and record current position
      Object.entries(audioSourcesRef.current).forEach(([stemId, source]) => {
        try {
          source.stop();
          console.log(`⏸️ Stopped playback for ${stemId}`);
        } catch (error) {
          console.error(`❌ Failed to stop playback for ${stemId}:`, error);
        }
      });
      
      // Record current playback position for resume
      if (audioContextRef.current) {
        pausedTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      }
      
      console.log('⏸️ Advanced audio playback paused');
    } catch (error) {
      console.error('❌ Failed to pause playback:', error);
    }
  }, [stopAnalysis]);

  const stop = useCallback(() => {
    try {
      setIsPlaying(false);
      stopAnalysis();
      
      // Stop all audio sources
      Object.entries(audioSourcesRef.current).forEach(([stemId, source]) => {
        try {
          source.stop();
          console.log(`⏹️ Stopped playback for ${stemId}`);
        } catch (error) {
          console.error(`❌ Failed to stop playback for ${stemId}:`, error);
        }
      });
      
      // Reset playback position
      setCurrentTime(0);
      pausedTimeRef.current = 0;
      startTimeRef.current = 0;
      
      console.log('⏹️ Advanced audio playback stopped');
    } catch (error) {
      console.error('❌ Failed to stop playback:', error);
    }
  }, [stopAnalysis]);

  const clearStems = useCallback(() => {
    try {
      setIsPlaying(false);
      stopAnalysis();
      setCurrentTime(0);
      setFeaturesByStem({});
      setVisualizationData(null);
      
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
      if (audioProcessorRef.current) {
        audioProcessorRef.current.dispose();
      }
      
      console.log('🗑️ Advanced audio analysis and playback cleared');
    } catch (error) {
      console.error('❌ Failed to clear stems:', error);
    }
  }, [stopAnalysis]);

  // Real-time visualization data processing
  useEffect(() => {
    if (!isPlaying || !featurePipelineRef.current) return;

    const processVisualizationData = () => {
      try {
        // Get current features from all stems
        const allFeatures = Object.values(featuresByStem).filter(Boolean) as StemAnalysis[];
        
        if (allFeatures.length > 0) {
          // Convert array to record format for processing
          const featuresRecord: Record<string, StemAnalysis> = {};
          allFeatures.forEach((analysis, index) => {
            featuresRecord[`stem_${index}`] = analysis;
          });
          
          // Process features through visualization pipeline
          const visualizationParams = featurePipelineRef.current!.processFeatures(featuresRecord);
          
          // Convert VisualizationParameters to AudioAnalysisData
          const audioAnalysisData: AudioAnalysisData = {
            frequencies: new Float32Array(256).fill(visualizationParams.energy),
            timeData: new Float32Array(256).fill(visualizationParams.brightness),
            volume: visualizationParams.energy,
            bass: visualizationParams.color.warmth,
            mid: visualizationParams.movement.speed,
            treble: visualizationParams.scale
          };
          
          setVisualizationData(audioAnalysisData);
        }
      } catch (error) {
        console.error('❌ Failed to process visualization data:', error);
      }
    };

    const interval = setInterval(processVisualizationData, 16); // ~60fps
    return () => clearInterval(interval);
  }, [isPlaying, featuresByStem]);

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
    if (!deviceOptimizerRef.current || !performanceMonitorRef.current) return;

    const optimizePerformance = () => {
      try {
        const metrics = performanceMonitorRef.current!.getCurrentMetrics();
        deviceOptimizerRef.current!.updatePerformanceMetrics(
          metrics.fps,
          metrics.analysisLatency,
          metrics.memoryUsage
        );
      } catch (error) {
        console.error('❌ Failed to optimize performance:', error);
      }
    };

    const interval = setInterval(optimizePerformance, 1000); // Every second
    return () => clearInterval(interval);
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
    performanceMetrics,
    deviceProfile,
    fallbackState,
    visualizationData,
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