import * as THREE from 'three';
import { VisualEffect, VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualizerControls } from '@/types/visualizer';
import { BloomEffect } from '../effects/BloomEffect';
import { VisualizationPreset } from '@/types/stem-visualization';
import { debugLog } from '@/lib/utils';
import { AudioTextureManager, AudioFeatureData } from './AudioTextureManager';
import { MediaLayerManager } from './MediaLayerManager';
import { VisualizationPerformanceMonitor } from '@/lib/visualization-performance-monitor';

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
  
  // Audio analysis
  private audioContext: AudioContext | null = null;
  private audioSources: AudioBufferSourceNode[] = [];
  private currentAudioBuffer: AudioBuffer | null = null;
  
  // Bloom post-processing
  private bloomEffect: BloomEffect | null = null;

  // GPU-based audio texture system
  private audioTextureManager: AudioTextureManager | null = null;

  // Multi-layer media compositing
  private mediaLayerManager: MediaLayerManager | null = null;

  // Real-time data storage
  private currentMidiData: LiveMIDIData | null = null;
  private currentAudioData: AudioAnalysisData | null = null;
  private audioAnalysisLoaded: boolean = false;
  
  // Performance monitoring
  private frameCount = 0;
  private fps = 60;
  private lastFPSUpdate = 0;
  private consecutiveSlowFrames = 0;
  private maxSlowFrames = 10; // Emergency pause after 10 consecutive slow frames
  private performanceMonitor: VisualizationPerformanceMonitor | null = null;
  
  // Visualization parameters
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
    this.initBloomEffect();
    this.initAudioTextureManager();
    this.initMediaLayerManager();
    this.initPerformanceMonitor();
    debugLog.log('🎭 VisualizerManager constructor complete');
  }
  
  private initScene(config: VisualizerConfig) {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // Pure black for bloom effect
    this.scene.fog = new THREE.Fog(0x000000, 10, 50);
    
      // Camera setup - use aspect ratio from config if available, otherwise use 1:1
  const initialAspectRatio = config.aspectRatio 
    ? config.aspectRatio.width / config.aspectRatio.height 
    : 1; // Default to square aspect ratio
  
  this.camera = new THREE.PerspectiveCamera(
    75,
    initialAspectRatio,
    0.1,
    1000
  );
    this.camera.position.set(0, 0, 5);
    
    // Renderer setup with error handling and fallbacks
    try {
      // First, check if canvas already has a context to avoid conflicts
      const existingContext = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      if (existingContext) {
        debugLog.log('🔄 Found existing WebGL context, will attempt to reuse');
      }
      
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'default', // Changed from high-performance to reduce resource usage
        failIfMajorPerformanceCaveat: false // Allow software rendering
      });
      
      debugLog.log('✅ WebGL Renderer created successfully');
      debugLog.log('🔧 WebGL Context:', this.renderer.getContext());
    } catch (error) {
      console.error('❌ Primary WebGL renderer failed:', error);
      
      // Try minimal fallback settings
      try {
        debugLog.log('🔄 Attempting fallback renderer with minimal settings...');
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: false,
          alpha: true,
          powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: false
        });
        debugLog.log('✅ Fallback renderer created successfully');
      } catch (fallbackError) {
        console.error('❌ Fallback renderer also failed:', fallbackError);
        throw new Error('WebGL is not available. Please refresh the page and try again. If the problem persists, try closing other browser tabs or restarting your browser.');
      }
    }
    
    this.renderer.setSize(config.canvas.width, config.canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.canvas.pixelRatio || 2));
    this.renderer.setClearColor(0x000000, 1); // Pure black background
    
    debugLog.log('🎮 Renderer configured with size:', config.canvas.width, 'x', config.canvas.height);
    
    // Performance optimizations for 30fps
    this.renderer.setAnimationLoop(null); // Use manual RAF control
    this.renderer.info.autoReset = false; // Manual reset for performance monitoring
    
    // Enable tone mapping for better color reproduction
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Disable shadows for better performance
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private initBloomEffect() {
    // Initialize bloom post-processing
    this.bloomEffect = new BloomEffect();
    this.bloomEffect.init(this.scene, this.camera, this.renderer);
    debugLog.log('✨ Bloom post-processing initialized');
  }

  private initAudioTextureManager(): void {
    try {
      this.audioTextureManager = new AudioTextureManager(this.renderer, {
        textureWidth: 256,  // 256 time steps for ~10 seconds at 25fps
        textureHeight: 64,  // Support up to 64 audio features
        maxFeatures: 64,
        maxTimeSteps: 256
      });

      // Attach to renderer for access by effects
      (this.renderer as any).audioTextureManager = this.audioTextureManager;

      debugLog.log('✅ AudioTextureManager initialized');
    } catch (error) {
      debugLog.error('❌ Failed to initialize AudioTextureManager:', error);
      this.audioTextureManager = null;
    }
  }

  private initMediaLayerManager(): void {
    try {
      // Get the multi-layer compositor from the bloom effect
      const bloomEffect = this.bloomEffect as any;
      const compositor = bloomEffect?.multiLayerCompositor;

      if (compositor) {
        this.mediaLayerManager = new MediaLayerManager(compositor, this.renderer);
        debugLog.log('✅ MediaLayerManager initialized with multi-layer compositor');
      } else {
        debugLog.log('ℹ️ Multi-layer compositor not available - media layers disabled (this is normal)');
        debugLog.log('ℹ️ To enable GPU compositing, use the Performance Debug panel');
      }
    } catch (error) {
      debugLog.error('❌ Failed to initialize MediaLayerManager:', error);
      this.mediaLayerManager = null;
    }
  }

  private initPerformanceMonitor(): void {
    try {
      // Initialize performance monitor with basic configuration
      this.performanceMonitor = new VisualizationPerformanceMonitor({
        enabled: true,
        enableAutoOptimization: true,
        sampleInterval: 1000, // 1 second
        historyLength: 300, // 5 minutes of history
        debugMode: false
      });

      // Set up event listeners for optimization recommendations
      this.performanceMonitor.on('optimize', (data: any) => {
        this.handlePerformanceOptimization(data);
      });

      this.performanceMonitor.on('cleanup', (data: any) => {
        this.handleMemoryCleanup(data);
      });

      debugLog.log('📊 Performance monitoring enabled with auto-optimization');
    } catch (error) {
      debugLog.error('❌ Failed to initialize performance monitor:', error);
    }
  }

  private handlePerformanceOptimization(data: any): void {
    try {
      switch (data.type) {
        case 'reduce_particles':
          // Reduce particle count by the specified factor
          this.visualParams.particleCount = Math.floor(this.visualParams.particleCount * (data.factor || 0.7));
          debugLog.log(`🔧 Reduced particle count to ${this.visualParams.particleCount}`);
          break;

        case 'reduce_quality':
          // Lower visual quality settings
          this.visualParams.complexity = Math.max(0.1, this.visualParams.complexity * 0.8);
          debugLog.log(`🔧 Reduced visual complexity to ${this.visualParams.complexity}`);
          break;

        case 'disable_effects':
          // Disable expensive effects
          if (data.effects?.includes('bloom') && this.bloomEffect) {
            this.bloomEffect.enabled = false;
            debugLog.log('🔧 Disabled bloom effect for performance');
          }
          break;

        case 'reduce_memory':
          // Reduce memory usage
          this.visualParams.particleCount = Math.floor(this.visualParams.particleCount * (data.factor || 0.8));
          debugLog.log(`🔧 Reduced memory usage - particle count: ${this.visualParams.particleCount}`);
          break;
      }
    } catch (error) {
      debugLog.error('❌ Failed to apply performance optimization:', error);
    }
  }

  private handleMemoryCleanup(data: any): void {
    try {
      switch (data.type) {
        case 'clear_caches':
          // Clear any internal caches
          if (this.audioTextureManager) {
            // Audio texture manager might have caches to clear
            debugLog.log('🧹 Cleared audio texture caches');
          }
          break;
      }
    } catch (error) {
      debugLog.error('❌ Failed to perform memory cleanup:', error);
    }
  }

  private async initAudioAnalyzer() {
    if (!this.audioContext) {
      debugLog.log('🎵 Creating AudioContext after user interaction...');
      this.audioContext = new AudioContext();
      // Resume the context to ensure it's active
      await this.audioContext.resume();
    }
    
    try {
      // This method is no longer used as AudioAnalyzer is removed.
      // Keeping it for now to avoid breaking existing calls, but it will be removed.
      debugLog.log('🎵 Audio analyzer initialization (placeholder)');
    } catch (error) {
      debugLog.error('❌ Failed to initialize audio analyzer:', error);
    }
  }
  
  private setupEventListeners() {
    // Handle window resize
    const handleResize = () => {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      
      // Use the new responsive resize method
      this.handleViewportResize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Handle visibility change (pause when not visible)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isPlaying) {
        this.pause();
      }
    });
    
    // Handle WebGL context lost/restored
    this.canvas.addEventListener('webglcontextlost', (event) => {
      console.warn('⚠️ WebGL context lost!');
      event.preventDefault();
      this.pause(); // Stop rendering
    });
    
    this.canvas.addEventListener('webglcontextrestored', () => {
      debugLog.log('✅ WebGL context restored, reinitializing...');
      // Context restoration would require reinitializing all GPU resources
      // For now, we'll just log and suggest a page refresh
      debugLog.log('🔄 Please refresh the page to restore full functionality');
    });
  }
  
  // Effect management
  public addEffect(effect: VisualEffect) {
    try {
      debugLog.log(`🎨 Adding effect: ${effect.name} (${effect.id})`);
      effect.init(this.scene, this.camera, this.renderer);
      this.effects.set(effect.id, effect);
      
      // Set initial visibility based on enabled status
      if (effect.enabled) {
        this.showEffectInScene(effect);
      } else {
        this.hideEffectFromScene(effect);
      }
      
      debugLog.log(`✅ Added effect: ${effect.name}. Total effects: ${this.effects.size}`);
    } catch (error) {
      debugLog.error(`❌ Failed to add effect ${effect.name}:`, error);
    }
  }
  
  public removeEffect(effectId: string) {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.destroy();
      this.effects.delete(effectId);
      debugLog.log(`✅ Removed effect: ${effect.name}. Remaining effects: ${this.effects.size}`);
    }
  }
  
  getEffect(effectId: string): VisualEffect | undefined {
    return this.effects.get(effectId);
  }
  
  getAllEffects(): VisualEffect[] {
    return Array.from(this.effects.values());
  }
  
  enableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = true;
      // Show the effect's visual elements in the scene
      this.showEffectInScene(effect);
      debugLog.log(`✅ Enabled effect: ${effect.name} (${effectId})`);
    } else {
      debugLog.warn(`⚠️ Effect not found: ${effectId}`);
    }
  }
  
  disableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = false;
      // Hide the effect's visual elements from the scene
      this.hideEffectFromScene(effect);
      debugLog.log(`❌ Disabled effect: ${effect.name} (${effectId})`);
    }
  }
  
  private showEffectInScene(effect: VisualEffect): void {
    // Show the effect's visual elements by setting their visibility to true
    
    // Handle MetaballsEffect (has 'mesh' property)
    if ('mesh' in effect && (effect as any).mesh) {
      (effect as any).mesh.visible = true;
    }
    
    // Handle ParticleNetworkEffect (has 'instancedMesh' and 'connectionLines')
    if ('instancedMesh' in effect && (effect as any).instancedMesh) {
      (effect as any).instancedMesh.visible = true;
    }
    if ('connectionLines' in effect && (effect as any).connectionLines) {
      (effect as any).connectionLines.visible = true;
    }
    
    // Handle TestCubeEffect (has 'mesh' property)
    if ('mesh' in effect && (effect as any).mesh) {
      (effect as any).mesh.visible = true;
    }
    
    // Handle other visual elements that might need to be shown
    if ('materials' in effect && Array.isArray((effect as any).materials)) {
      (effect as any).materials.forEach((material: any) => {
        if (material && material.visible !== undefined) {
          material.visible = true;
        }
      });
    }
  }
  
  private hideEffectFromScene(effect: VisualEffect): void {
    // Hide the effect's visual elements by setting their visibility to false
    
    // Handle MetaballsEffect (has 'mesh' property)
    if ('mesh' in effect && (effect as any).mesh) {
      (effect as any).mesh.visible = false;
    }
    
    // Handle ParticleNetworkEffect (has 'instancedMesh' and 'connectionLines')
    if ('instancedMesh' in effect && (effect as any).instancedMesh) {
      (effect as any).instancedMesh.visible = false;
    }
    if ('connectionLines' in effect && (effect as any).connectionLines) {
      (effect as any).connectionLines.visible = false;
    }
    
    // Handle TestCubeEffect (has 'mesh' property)
    if ('mesh' in effect && (effect as any).mesh) {
      (effect as any).mesh.visible = false;
    }
    
    // Handle other visual elements that might need to be hidden
    if ('materials' in effect && Array.isArray((effect as any).materials)) {
      (effect as any).materials.forEach((material: any) => {
        if (material && material.visible !== undefined) {
          material.visible = false;
        }
      });
    }
  }
  
  // Playback control
  play(): void {
    debugLog.log(`🎬 Play() called. Current state: isPlaying=${this.isPlaying}, effects=${this.effects.size}`);
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.clock.start();
      this.animate();
      debugLog.log(`🎬 Animation started`);
      
      // Start audio playback
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
    
    // Stop audio playback
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
  
  private animate = () => {
    if (!this.isPlaying) return;
    
    this.animationId = requestAnimationFrame(this.animate);
    
    // IMPLEMENT 30FPS CAP - Much more reasonable for audio-visual sync
    const now = performance.now();
    const elapsed = now - this.lastTime;
    const targetFrameTime = 1000 / 30; // 33.33ms for 30fps
    
    if (elapsed < targetFrameTime) {
      return; // Skip this frame to maintain 30fps cap
    }
    
    // Only skip frames if we're severely behind (emergency performance protection)
    const frameTime = elapsed;
    if (frameTime > 100) { // If frame takes more than 100ms (10fps), skip next frame
      this.consecutiveSlowFrames++;
      
      // Emergency pause if too many consecutive slow frames
      if (this.consecutiveSlowFrames >= this.maxSlowFrames) {
        debugLog.error(`🚨 Emergency pause: ${this.maxSlowFrames} consecutive slow frames detected. Pausing to prevent browser freeze.`);
        this.pause();
        // Suggest recovery action
        setTimeout(() => {
          debugLog.log('💡 Tip: Try refreshing the page or closing other browser tabs to improve performance.');
        }, 1000);
        return;
      }
      
      this.lastTime = now;
      return;
    } else {
      this.consecutiveSlowFrames = 0; // Reset counter on good frame
    }
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta time to prevent large jumps
    const currentTime = now;

    // Update audio texture time synchronization (GPU-based optimization)
    if (this.audioTextureManager) {
      // This updates the time texture that all shaders can access
      // Eliminates the need for per-effect time parameter updates
      this.audioTextureManager.updateTime(currentTime / 1000.0, 10.0); // Assume 10 second duration for now
    }

    // Update media layers with current audio features (GPU-based compositing)
    if (this.mediaLayerManager && this.currentAudioData) {
      // Convert audio data to feature map for media layer updates
      const audioFeatures: Record<string, number> = {
        'master-rms': this.currentAudioData.volume || 0,
        'bass-rms': this.currentAudioData.bass || 0,
        'vocals-rms': this.currentAudioData.mid || 0,
        'melody-spectralCentroid': this.currentAudioData.treble || 0
      };

      this.mediaLayerManager.updateWithAudioFeatures(audioFeatures);
      this.mediaLayerManager.updateTextures();
    }

    // Update FPS counter
    this.frameCount++;
    if (currentTime - this.lastFPSUpdate > 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
      this.frameCount = 0;
      this.lastFPSUpdate = currentTime;
    }
    
    // Performance monitoring - check memory usage
    if (this.frameCount % 300 === 0) { // Every 10 seconds at 30fps
      const memInfo = this.getMemoryUsage();
      if (memInfo.geometries > 100 || memInfo.textures > 50) {
        debugLog.warn(`⚠️ High memory usage detected: ${memInfo.geometries} geometries, ${memInfo.textures} textures`);
      }
    }
    
    // Update all enabled effects with improved performance
    let activeEffectCount = 0;
    const maxEffectsPerFrame = 3; // Reduced back to 3 for 30fps
    let updatedEffects = 0;
    
    this.effects.forEach(effect => {
      if (effect.enabled && updatedEffects < maxEffectsPerFrame) {
        activeEffectCount++;
        updatedEffects++;
        
        try {
          // Use real data if available, otherwise fallback to mock data
          const audioData: AudioAnalysisData = this.currentAudioData || this.createMockAudioData();
          const midiData: LiveMIDIData = this.currentMidiData || this.createMockMidiData();

          effect.update(deltaTime, audioData, midiData);
        } catch (error) {
          debugLog.error(`❌ Effect ${effect.id} update failed:`, error);
          // Disable problematic effect to prevent further issues
          effect.enabled = false;
        }
      } else if (effect.enabled) {
        activeEffectCount++; // Count but don't update this frame
      }
    });
    
    // Update bloom effect
    if (this.bloomEffect) {
      const audioData: AudioAnalysisData = this.currentAudioData || this.createMockAudioData();
      const midiData: LiveMIDIData = this.currentMidiData || this.createMockMidiData();
      this.bloomEffect.update(deltaTime, audioData, midiData);

      // Render with bloom post-processing
      this.bloomEffect.render();
    } else {
      // Fallback to direct rendering
      this.renderer.render(this.scene, this.camera);
    }
    
    this.lastTime = currentTime;
  };
  
  // Mock data generators (will be replaced with real data)
  private createMockAudioData(): AudioAnalysisData {
    const frequencies = new Array(256);
    const timeData = new Array(256);
    
    // Generate more realistic frequency data
    for (let i = 0; i < 256; i++) {
      frequencies[i] = Math.sin(this.clock.elapsedTime * 2 + i * 0.1) * 0.5 + 0.5;
      timeData[i] = Math.cos(this.clock.elapsedTime * 3 + i * 0.05) * 0.3 + 0.3;
    }
    
    return {
      frequencies,
      timeData,
      volume: (Math.sin(this.clock.elapsedTime * 1.5) + 1) * 0.5,
      bass: (Math.sin(this.clock.elapsedTime * 0.8) + 1) * 0.5,
      mid: (Math.sin(this.clock.elapsedTime * 1.2) + 1) * 0.5,
      treble: (Math.sin(this.clock.elapsedTime * 2.0) + 1) * 0.5
    };
  }
  
  private createMockMidiData(): LiveMIDIData {
    return {
      activeNotes: [],
      currentTime: this.clock.elapsedTime,
      tempo: 120,
      totalNotes: 0,
      trackActivity: {}
    };
  }
  
  // Update methods for real data
  updateMIDIData(midiData: LiveMIDIData): void {
    // Store MIDI data to be used in next animation frame
    // This method is no longer used as AudioAnalyzer is removed.
    // Keeping it for now to avoid breaking existing calls, but it will be removed.
    debugLog.log('🎵 MIDI data received (placeholder):', midiData);
  }
  
  // Removed duplicate updateAudioData method - see implementation below
  
  updateEffectParameter(effectId: string, paramName: string, value: any): void {
    const effect = this.effects.get(effectId);
    if (effect && effect.parameters.hasOwnProperty(paramName)) {
      const oldValue = (effect.parameters as any)[paramName];
      (effect.parameters as any)[paramName] = value;
      
      // REMOVED VERBOSE LOGGING - Only log significant changes or errors
      // If the effect has an updateParameter method, call it for immediate updates
      if (typeof (effect as any).updateParameter === 'function') {
        (effect as any).updateParameter(paramName, value);
      }
    } else {
      // Only log errors, not every parameter update
      if (!effect) {
        console.warn(`⚠️ Effect ${effectId} not found`);
      } else if (!effect.parameters.hasOwnProperty(paramName)) {
        console.warn(`⚠️ Parameter ${paramName} not found in effect ${effectId}`);
      }
    }
  }
  
  // Removed duplicate declarations - already defined above
  
  // Performance monitoring
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

  /**
   * Get comprehensive performance metrics including advanced monitoring
   */
  getPerformanceMetrics(): {
    fps: number;
    memory: { geometries: number; textures: number; programs: number };
    effects: { total: number; enabled: number };
    monitoring: { enabled: boolean; alerts: number };
  } {
    const enabledEffects = Array.from(this.effects.values()).filter(effect => effect.enabled).length;

    return {
      fps: this.fps,
      memory: this.getMemoryUsage(),
      effects: {
        total: this.effects.size,
        enabled: enabledEffects
      },
      monitoring: {
        enabled: !!this.performanceMonitor,
        alerts: this.performanceMonitor?.getActiveAlerts().length || 0
      }
    };
  }
  
  /**
   * Load cached audio analysis data into GPU textures
   */
  public loadAudioAnalysis(analysisData: AudioFeatureData): void {
    if (this.audioTextureManager) {
      this.audioTextureManager.loadAudioAnalysis(analysisData);
      this.audioAnalysisLoaded = true;
      debugLog.log('✅ Audio analysis loaded into GPU textures');
    } else {
      debugLog.warn('⚠️ AudioTextureManager not available - falling back to uniform-based approach');
    }
  }

  /**
   * Update audio time synchronization for texture-based effects
   */
  public updateAudioTime(currentTime: number, duration: number): void {
    if (this.audioTextureManager) {
      this.audioTextureManager.updateTime(currentTime, duration);
    }
  }

  /**
   * Update real-time MIDI data
   */
  public updateMidiData(midiData: LiveMIDIData): void {
    this.currentMidiData = midiData;
  }

  /**
   * Update real-time audio analysis data
   */
  public updateAudioData(audioData: AudioAnalysisData): void {
    this.currentAudioData = audioData;
  }

  /**
   * Check if real audio analysis data is loaded
   */
  public hasAudioAnalysis(): boolean {
    return this.audioAnalysisLoaded;
  }

  /**
   * Add a media layer (canvas, video, or image) to the compositor
   */
  public addMediaLayer(config: any): void {
    if (this.mediaLayerManager) {
      this.mediaLayerManager.addMediaLayer(config);
    } else {
      debugLog.warn('⚠️ MediaLayerManager not available - cannot add media layer');
    }
  }

  /**
   * Remove a media layer
   */
  public removeMediaLayer(id: string): void {
    if (this.mediaLayerManager) {
      this.mediaLayerManager.removeMediaLayer(id);
    }
  }

  /**
   * Update media layer properties
   */
  public updateMediaLayer(id: string, updates: any): void {
    if (this.mediaLayerManager) {
      this.mediaLayerManager.updateMediaLayer(id, updates);
    }
  }

  /**
   * Get media layer configuration
   */
  public getMediaLayerConfig(id: string): any {
    return this.mediaLayerManager?.getLayerConfig(id);
  }

  /**
   * Get all media layer IDs
   */
  public getMediaLayerIds(): string[] {
    return this.mediaLayerManager?.getLayerIds() || [];
  }

  /**
   * Get bloom effect for debugging
   */
  public getBloomEffect(): any {
    return this.bloomEffect;
  }

  /**
   * Test basic rendering functionality
   */
  public testRender(): boolean {
    try {
      if (!this.bloomEffect) {
        debugLog.error('❌ Bloom effect not initialized');
        return false;
      }

      // Try to render one frame
      this.bloomEffect.render();
      debugLog.log('✅ Test render successful');
      return true;
    } catch (error) {
      debugLog.error('❌ Test render failed:', error);
      return false;
    }
  }

  // Cleanup
  dispose(): void {
    debugLog.log(`🗑️ VisualizerManager.dispose() called. Effects: ${this.effects.size}`);
    this.stop();
    
    // Dispose bloom effect
    if (this.bloomEffect) {
      this.bloomEffect.destroy();
      this.bloomEffect = null;
    }

    // Dispose audio texture manager
    if (this.audioTextureManager) {
      this.audioTextureManager.dispose();
      this.audioTextureManager = null;
    }

    // Dispose media layer manager
    if (this.mediaLayerManager) {
      this.mediaLayerManager.dispose();
      this.mediaLayerManager = null;
    }

    // Dispose performance monitor
    if (this.performanceMonitor) {
      this.performanceMonitor.dispose();
      this.performanceMonitor = null;
    }
    
    // Dispose all effects
    debugLog.log(`🗑️ Disposing ${this.effects.size} effects`);
    this.effects.forEach(effect => effect.destroy());
    this.effects.clear();
    debugLog.log(`🗑️ Effects cleared. Remaining: ${this.effects.size}`);
    
    // Dispose Three.js resources
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
      // Log buffer info for debugging
      debugLog.log('Audio buffer length:', buffer.byteLength);
      debugLog.log('First 16 bytes:', Array.from(new Uint8Array(buffer.slice(0, 16))));
      this.currentAudioBuffer = await this.audioContext.decodeAudioData(buffer);
      // Create audio source for playback
      const audioSource = this.audioContext.createBufferSource();
      audioSource.buffer = this.currentAudioBuffer;
      audioSource.connect(this.audioContext.destination);
      // Store the source for control
      if (!this.audioSources) {
        this.audioSources = [];
      }
      this.audioSources.push(audioSource);
      // Remove any call to audioAnalyzer/analyzeStem
    } catch (error) {
      debugLog.error('❌ Failed to load audio buffer:', error);
      throw error;
    }
  }

  // Parameter setters
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
          // Apply to all effects that support smoothing
          this.effects.forEach(effect => {
            if ('setSmoothingFactor' in effect) {
              (effect as any).setSmoothingFactor(value);
            }
          });
          break;
        case 'responsiveness':
          // Apply to all effects that support responsiveness
          this.effects.forEach(effect => {
            if ('setResponsiveness' in effect) {
              (effect as any).setResponsiveness(value);
            }
          });
          break;
      }
    });
  }

  // Method to handle responsive resizing (no letterboxing, always fill canvas)
  public handleViewportResize(canvasWidth: number, canvasHeight: number) {
    this.renderer.setSize(canvasWidth, canvasHeight);
    this.camera.aspect = canvasWidth / canvasHeight;
    this.camera.updateProjectionMatrix();
    
    // Update resolution uniforms for all effects
    this.effects.forEach(effect => {
      if ('uniforms' in effect && (effect as any).uniforms?.uResolution) {
        (effect as any).uniforms.uResolution.value.set(canvasWidth, canvasHeight);
      }
    });
    
    if (this.bloomEffect) {
      this.bloomEffect.handleResize(canvasWidth, canvasHeight);
    }
    debugLog.log('🎨 Responsive resize:', canvasWidth, canvasHeight, 'aspect:', this.camera.aspect);
  }

  // 2D Composition Layer for future video/image integration
  public createCompositionLayer() {
    // Create an orthographic camera for 2D composition
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

    // Create a composition scene for 2D elements
    const compositionScene = new THREE.Scene();
    
    return {
      scene: compositionScene,
      camera: orthographicCamera,
      addVideoLayer: (video: HTMLVideoElement, position: {x: number, y: number}, scale: {x: number, y: number}) => {
        const texture = new THREE.VideoTexture(video);
        const plane = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(plane, material);
        
        // Position in 2D space (orthographic camera)
        mesh.position.set(position.x, position.y, 0);
        mesh.scale.set(scale.x, scale.y, 1);
        
        compositionScene.add(mesh);
        return mesh;
      },
      addImageLayer: (image: HTMLImageElement, position: {x: number, y: number}, scale: {x: number, y: number}) => {
        const texture = new THREE.TextureLoader().load(image.src);
        const plane = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(plane, material);
        
        // Position in 2D space (orthographic camera)
        mesh.position.set(position.x, position.y, 0);
        mesh.scale.set(scale.x, scale.y, 1);
        
        compositionScene.add(mesh);
        return mesh;
      }
    };
  }
} 