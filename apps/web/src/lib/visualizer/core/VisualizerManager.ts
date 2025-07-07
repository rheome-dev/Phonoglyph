import * as THREE from 'three';
import { VisualEffect, VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualizerControls } from '@/types/visualizer';
import { BloomEffect } from '../effects/BloomEffect';
import { AudioAnalyzer } from '@/lib/audio-analyzer';
import { VisualizationPreset } from '@/types/stem-visualization';

export class VisualizerManager {
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
  private audioContext: AudioContext;
  private audioAnalyzer: AudioAnalyzer | null = null;
  private currentAudioBuffer: AudioBuffer | null = null;
  
  // Bloom post-processing
  private bloomEffect: BloomEffect | null = null;
  
  // Performance monitoring
  private frameCount = 0;
  private fps = 60;
  private lastFPSUpdate = 0;
  private consecutiveSlowFrames = 0;
  private maxSlowFrames = 10; // Emergency pause after 10 consecutive slow frames
  
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
    console.log('🎭 VisualizerManager constructor called');
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.audioContext = new AudioContext();
    
    this.initScene(config);
    this.setupEventListeners();
    this.initBloomEffect();
    this.initAudioAnalyzer();
    console.log('🎭 VisualizerManager constructor complete');
  }
  
  private initScene(config: VisualizerConfig) {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // Pure black for bloom effect
    this.scene.fog = new THREE.Fog(0x000000, 10, 50);
    
    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      config.canvas.width / config.canvas.height,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 5);
    
    // Renderer setup with error handling and fallbacks
    try {
      // First, check if canvas already has a context to avoid conflicts
      const existingContext = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      if (existingContext) {
        console.log('🔄 Found existing WebGL context, will attempt to reuse');
      }
      
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'default', // Changed from high-performance to reduce resource usage
        failIfMajorPerformanceCaveat: false // Allow software rendering
      });
      
      console.log('✅ WebGL Renderer created successfully');
      console.log('🔧 WebGL Context:', this.renderer.getContext());
    } catch (error) {
      console.error('❌ Primary WebGL renderer failed:', error);
      
      // Try minimal fallback settings
      try {
        console.log('🔄 Attempting fallback renderer with minimal settings...');
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: false,
          alpha: true,
          powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: false
        });
        console.log('✅ Fallback renderer created successfully');
      } catch (fallbackError) {
        console.error('❌ Fallback renderer also failed:', fallbackError);
        throw new Error('WebGL is not available. Please refresh the page and try again. If the problem persists, try closing other browser tabs or restarting your browser.');
      }
    }
    
    this.renderer.setSize(config.canvas.width, config.canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.canvas.pixelRatio));
    this.renderer.setClearColor(0x000000, 1); // Pure black background
    
    console.log('🎮 Renderer configured with size:', config.canvas.width, 'x', config.canvas.height);
    
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
    console.log('✨ Bloom post-processing initialized');
  }
  
  private initAudioAnalyzer() {
    try {
      this.audioAnalyzer = new AudioAnalyzer(this.audioContext);
      this.audioAnalyzer.setAnalysisCallback((data) => {
        this.currentAudioData = data;
      });
      console.log('🎵 Audio analyzer initialized');
    } catch (error) {
      console.error('❌ Failed to initialize audio analyzer:', error);
    }
  }
  
  private setupEventListeners() {
    // Handle window resize
    const handleResize = () => {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      
      // Update bloom effect size
      if (this.bloomEffect) {
        this.bloomEffect.handleResize(width, height);
      }
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
      console.log('✅ WebGL context restored, reinitializing...');
      // Context restoration would require reinitializing all GPU resources
      // For now, we'll just log and suggest a page refresh
      console.log('🔄 Please refresh the page to restore full functionality');
    });
  }
  
  // Effect management
  public addEffect(effect: VisualEffect) {
    try {
    effect.init(this.scene, this.camera, this.renderer);
    this.effects.set(effect.id, effect);
      console.log(`✅ Added effect: ${effect.name}`);
    } catch (error) {
      console.error(`❌ Failed to add effect ${effect.name}:`, error);
    }
  }
  
  public removeEffect(effectId: string) {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.destroy();
      this.effects.delete(effectId);
      console.log(`✅ Removed effect: ${effect.name}`);
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
    }
  }
  
  disableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = false;
    }
  }
  
  // Playback control
  play(): void {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.clock.start();
      this.animate();
    }
  }
  
  pause(): void {
    this.isPlaying = false;
    this.clock.stop();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  stop(): void {
    this.pause();
    this.clock.elapsedTime = 0;
  }
  
  private animate = () => {
    if (!this.isPlaying) return;
    
    this.animationId = requestAnimationFrame(this.animate);
    
    // Implement 30fps cap by skipping frames
    const now = performance.now();
    const elapsed = now - this.lastTime;
    const targetFrameTime = 1000 / 30; // 33.33ms for 30fps
    
    if (elapsed < targetFrameTime) {
      return; // Skip this frame to maintain 30fps cap
    }
    
    // Emergency performance check - skip frame if last frame took too long
    const frameTime = elapsed;
    if (frameTime > 50) { // If frame takes more than 50ms (20fps), skip next frame
      this.consecutiveSlowFrames++;
      console.warn(`⚠️ Long frame detected: ${frameTime.toFixed(1)}ms (${this.consecutiveSlowFrames}/${this.maxSlowFrames}), skipping to prevent freeze`);
      
      // Emergency pause if too many consecutive slow frames
      if (this.consecutiveSlowFrames >= this.maxSlowFrames) {
        console.error(`🚨 Emergency pause: ${this.maxSlowFrames} consecutive slow frames detected. Pausing to prevent browser freeze.`);
        this.pause();
        // Suggest recovery action
        setTimeout(() => {
          console.log('💡 Tip: Try refreshing the page or closing other browser tabs to improve performance.');
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
    
    // Debug every 120 frames (roughly 4 seconds at 30fps)
    if (this.frameCount % 120 === 0) {
      console.log(`🎬 Frame ${this.frameCount}: ${this.effects.size} effects, ${this.scene.children.length} scene children`);
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
        console.warn(`⚠️ High memory usage detected: ${memInfo.geometries} geometries, ${memInfo.textures} textures`);
      }
    }
    
    // Update all enabled effects with throttling for performance
    let activeEffectCount = 0;
    const maxEffectsPerFrame = 3; // Limit concurrent effect updates
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
          console.error(`❌ Effect ${effect.id} update failed:`, error);
          // Disable problematic effect to prevent further issues
          effect.enabled = false;
        }
      } else if (effect.enabled) {
        activeEffectCount++; // Count but don't update this frame
      }
    });
    
    // Log if we have no active effects (reduced frequency)
    if (activeEffectCount === 0 && this.frameCount % 120 === 0) {
      console.warn('⚠️ No active effects found!');
    }
    
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
    const frequencies = new Float32Array(256);
    const timeData = new Float32Array(256);
    
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
    return this.currentMidiData || {
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
    this.currentMidiData = midiData;
  }
  
  updateAudioData(audioData: AudioAnalysisData): void {
    // Store audio data to be used in next animation frame
    this.currentAudioData = audioData;
  }
  
  updateEffectParameter(effectId: string, paramName: string, value: any): void {
    const effect = this.effects.get(effectId);
    if (effect && effect.parameters.hasOwnProperty(paramName)) {
      (effect.parameters as any)[paramName] = value;
      console.log(`🎛️ Updated ${effectId}.${paramName} = ${value}`);
      
      // If the effect has an updateParameter method, call it for immediate updates
      if (typeof (effect as any).updateParameter === 'function') {
        (effect as any).updateParameter(paramName, value);
      }
    }
  }
  
  private currentMidiData?: LiveMIDIData;
  private currentAudioData?: AudioAnalysisData;
  
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
  
  // Cleanup
  dispose(): void {
    this.stop();
    
    // Dispose bloom effect
    if (this.bloomEffect) {
      this.bloomEffect.destroy();
      this.bloomEffect = null;
    }
    
    // Dispose all effects
    this.effects.forEach(effect => effect.destroy());
    this.effects.clear();
    
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
    try {
      this.currentAudioBuffer = await this.audioContext.decodeAudioData(buffer);
      if (this.audioAnalyzer && this.currentAudioBuffer) {
        await this.audioAnalyzer.analyzeStem(this.currentAudioBuffer);
        console.log('🎵 Audio analysis started');
      }
    } catch (error) {
      console.error('❌ Failed to load audio buffer:', error);
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
} 