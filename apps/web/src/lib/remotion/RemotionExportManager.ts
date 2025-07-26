import { AudioFeatureData } from '../visualizer/core/AudioTextureManager';
import { MIDIData, LiveMIDIData } from '@/types/midi';
import { AudioAnalysisData } from '@/types/visualizer';

/**
 * RemotionExportManager - High-quality video export pipeline
 * 
 * This implements the modV analysis recommendation for separate preview/export pipelines:
 * - Real-time preview: Optimized for 60fps with quality compromises
 * - Export pipeline: Frame-perfect synchronization with maximum quality
 * 
 * Key differences from real-time rendering:
 * - No frame rate constraints (can take time to render each frame perfectly)
 * - Uses cached audio analysis for precise synchronization
 * - Higher quality settings (anti-aliasing, resolution, effects)
 * - Deterministic frame-by-frame rendering
 */

export interface ExportConfiguration {
  // Video settings
  width: number;
  height: number;
  fps: number;
  duration: number;
  
  // Quality settings
  quality: 'draft' | 'medium' | 'high' | 'ultra';
  antialiasing: boolean;
  motionBlur: boolean;
  
  // Audio settings
  audioFile: string;
  audioOffset: number; // ms
  
  // Export format
  format: 'mp4' | 'webm' | 'mov' | 'gif';
  codec: 'h264' | 'h265' | 'vp9' | 'prores';
  
  // Social media presets
  preset?: 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'custom';
}

export interface ExportProgress {
  phase: 'preparing' | 'analyzing' | 'rendering' | 'encoding' | 'complete' | 'error';
  progress: number; // 0-1
  currentFrame: number;
  totalFrames: number;
  estimatedTimeRemaining: number; // seconds
  message: string;
  error?: string;
}

export interface FrameRenderData {
  frameNumber: number;
  timestamp: number; // seconds
  audioFeatures: Record<string, number>; // Interpolated features for this exact frame
  midiData: LiveMIDIData; // MIDI state at this exact frame
  visualParameters: Record<string, any>; // Pre-calculated visual parameters
}

export class RemotionExportManager {
  private audioAnalysisData: AudioFeatureData | null = null;
  private midiData: MIDIData | null = null;
  private exportConfig: ExportConfiguration | null = null;
  
  // Frame-perfect data cache
  private frameDataCache: Map<number, FrameRenderData> = new Map();
  private precomputedFrames: boolean = false;
  
  // Progress tracking
  private progressCallback: ((progress: ExportProgress) => void) | null = null;
  
  constructor() {
    console.log('🎬 RemotionExportManager initialized');
  }
  
  /**
   * Load audio analysis data for export
   */
  public loadAudioAnalysis(analysisData: AudioFeatureData): void {
    this.audioAnalysisData = analysisData;
    this.precomputedFrames = false; // Reset cache when new data is loaded
    console.log('✅ Audio analysis loaded for export');
  }
  
  /**
   * Load MIDI data for export
   */
  public loadMidiData(midiData: MIDIData): void {
    this.midiData = midiData;
    this.precomputedFrames = false; // Reset cache when new data is loaded
    console.log('✅ MIDI data loaded for export');
  }
  
  /**
   * Configure export settings
   */
  public configure(config: ExportConfiguration): void {
    this.exportConfig = config;
    this.precomputedFrames = false; // Reset cache when config changes
    
    // Apply preset configurations
    if (config.preset) {
      this.applyPreset(config.preset);
    }
    
    console.log('⚙️ Export configuration set:', config);
  }
  
  /**
   * Apply social media preset configurations
   */
  private applyPreset(preset: string): void {
    if (!this.exportConfig) return;
    
    const presets = {
      youtube: { width: 1920, height: 1080, fps: 30, format: 'mp4' as const, codec: 'h264' as const },
      instagram: { width: 1080, height: 1080, fps: 30, format: 'mp4' as const, codec: 'h264' as const },
      tiktok: { width: 1080, height: 1920, fps: 30, format: 'mp4' as const, codec: 'h264' as const },
      twitter: { width: 1280, height: 720, fps: 30, format: 'mp4' as const, codec: 'h264' as const }
    };
    
    const presetConfig = presets[preset as keyof typeof presets];
    if (presetConfig) {
      Object.assign(this.exportConfig, presetConfig);
    }
  }
  
  /**
   * Pre-compute all frame data for deterministic rendering
   * This is the key optimization: instead of computing features in real-time,
   * we pre-calculate everything for frame-perfect synchronization
   */
  public async precomputeFrameData(progressCallback?: (progress: number) => void): Promise<void> {
    if (!this.exportConfig || !this.audioAnalysisData || !this.midiData) {
      throw new Error('Missing required data for frame precomputation');
    }
    
    const { fps, duration } = this.exportConfig;
    const totalFrames = Math.ceil(duration * fps);
    
    console.log(`🔄 Pre-computing ${totalFrames} frames for export...`);
    
    this.frameDataCache.clear();
    
    for (let frame = 0; frame < totalFrames; frame++) {
      const timestamp = frame / fps;
      
      // Pre-compute audio features for this exact timestamp
      const audioFeatures = this.interpolateAudioFeatures(timestamp);
      
      // Pre-compute MIDI state for this exact timestamp
      const midiData = this.computeMidiState(timestamp);
      
      // Pre-compute visual parameters (this eliminates real-time calculation overhead)
      const visualParameters = this.computeVisualParameters(audioFeatures, midiData, timestamp);
      
      const frameData: FrameRenderData = {
        frameNumber: frame,
        timestamp,
        audioFeatures,
        midiData,
        visualParameters
      };
      
      this.frameDataCache.set(frame, frameData);
      
      // Report progress
      if (progressCallback && frame % 10 === 0) {
        progressCallback(frame / totalFrames);
      }
    }
    
    this.precomputedFrames = true;
    console.log(`✅ Pre-computed ${totalFrames} frames for export`);
  }
  
  /**
   * Interpolate audio features for exact timestamp
   * This provides frame-perfect audio synchronization
   */
  private interpolateAudioFeatures(timestamp: number): Record<string, number> {
    if (!this.audioAnalysisData) return {};
    
    const features: Record<string, number> = {};
    
    // Process each stem type
    for (const [stemType, stemData] of Object.entries(this.audioAnalysisData)) {
      for (const [featureName, featureArray] of Object.entries(stemData)) {
        if (!Array.isArray(featureArray)) continue;
        
        // Calculate exact index for this timestamp
        // Assuming feature data represents the full duration
        const progress = timestamp / (this.exportConfig?.duration || 1);
        const index = progress * (featureArray.length - 1);
        
        // Linear interpolation between adjacent samples
        const lowerIndex = Math.floor(index);
        const upperIndex = Math.min(lowerIndex + 1, featureArray.length - 1);
        const fraction = index - lowerIndex;
        
        const lowerValue = featureArray[lowerIndex] || 0;
        const upperValue = featureArray[upperIndex] || 0;
        const interpolatedValue = lowerValue + (upperValue - lowerValue) * fraction;
        
        const featureKey = `${stemType}-${featureName}`;
        features[featureKey] = interpolatedValue;
      }
    }
    
    return features;
  }
  
  /**
   * Compute MIDI state for exact timestamp
   */
  private computeMidiState(timestamp: number): LiveMIDIData {
    if (!this.midiData) {
      return {
        activeNotes: [],
        currentTime: timestamp,
        tempo: 120,
        totalNotes: 0,
        trackActivity: {}
      };
    }
    
    // Find all notes active at this timestamp
    const activeNotes = this.midiData.tracks.flatMap(track =>
      track.notes
        .filter(note => note.start <= timestamp && note.start + note.duration >= timestamp)
        .map(note => ({
          note: note.pitch,
          velocity: note.velocity,
          startTime: note.start,
          track: track.id
        }))
    );
    
    // Calculate track activity
    const trackActivity: Record<string, boolean> = {};
    this.midiData.tracks.forEach(track => {
      trackActivity[track.id] = track.notes.some(note =>
        note.start <= timestamp && note.start + note.duration >= timestamp
      );
    });
    
    return {
      activeNotes,
      currentTime: timestamp,
      tempo: this.midiData.tempoChanges[0]?.bpm || 120,
      totalNotes: this.midiData.tracks.reduce((sum, track) => sum + track.notes.length, 0),
      trackActivity
    };
  }
  
  /**
   * Pre-compute visual parameters to eliminate real-time calculation
   */
  private computeVisualParameters(
    audioFeatures: Record<string, number>,
    midiData: LiveMIDIData,
    timestamp: number
  ): Record<string, any> {
    // This would contain pre-calculated values for all visual effects
    // Based on the current parameter mappings
    
    const parameters: Record<string, any> = {};
    
    // Example: Pre-calculate metaball parameters
    parameters.metaballs = {
      intensity: Math.max(0.8, (midiData.activeNotes.length / 3.0) * 1.2),
      animationSpeed: 1.0,
      baseRadius: 0.3 + (audioFeatures['drums-rms'] || 0) * 0.2,
      noiseIntensity: 0.2 + (audioFeatures['master-spectralCentroid'] || 0) * 0.3
    };
    
    // Example: Pre-calculate particle parameters
    parameters.particles = {
      count: Math.min(1000, midiData.activeNotes.length * 50),
      size: 1.0 + (audioFeatures['bass-rms'] || 0) * 2.0,
      speed: 0.5 + (audioFeatures['vocals-spectralRolloff'] || 0) * 1.5
    };
    
    return parameters;
  }
  
  /**
   * Get pre-computed frame data for Remotion rendering
   */
  public getFrameData(frameNumber: number): FrameRenderData | null {
    if (!this.precomputedFrames) {
      console.warn('⚠️ Frame data not pre-computed. Call precomputeFrameData() first.');
      return null;
    }
    
    return this.frameDataCache.get(frameNumber) || null;
  }
  
  /**
   * Start export process
   */
  public async startExport(progressCallback: (progress: ExportProgress) => void): Promise<string> {
    this.progressCallback = progressCallback;
    
    try {
      // Phase 1: Preparation
      progressCallback({
        phase: 'preparing',
        progress: 0,
        currentFrame: 0,
        totalFrames: 0,
        estimatedTimeRemaining: 0,
        message: 'Preparing export...'
      });
      
      if (!this.precomputedFrames) {
        // Phase 2: Analysis
        progressCallback({
          phase: 'analyzing',
          progress: 0,
          currentFrame: 0,
          totalFrames: 0,
          estimatedTimeRemaining: 0,
          message: 'Analyzing audio and MIDI data...'
        });
        
        await this.precomputeFrameData((progress) => {
          progressCallback({
            phase: 'analyzing',
            progress: progress * 0.5, // Analysis is 50% of this phase
            currentFrame: 0,
            totalFrames: 0,
            estimatedTimeRemaining: 0,
            message: `Pre-computing frame data... ${Math.round(progress * 100)}%`
          });
        });
      }
      
      // Phase 3: Rendering (would integrate with Remotion CLI)
      const exportPath = await this.renderWithRemotion();
      
      // Phase 4: Complete
      progressCallback({
        phase: 'complete',
        progress: 1,
        currentFrame: 0,
        totalFrames: 0,
        estimatedTimeRemaining: 0,
        message: 'Export complete!'
      });
      
      return exportPath;
      
    } catch (error) {
      progressCallback({
        phase: 'error',
        progress: 0,
        currentFrame: 0,
        totalFrames: 0,
        estimatedTimeRemaining: 0,
        message: 'Export failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }
  
  /**
   * Render with Remotion (placeholder for actual Remotion integration)
   */
  private async renderWithRemotion(): Promise<string> {
    // This would integrate with Remotion CLI for actual rendering
    // For now, return a placeholder path
    
    console.log('🎬 Starting Remotion render...');
    
    // Simulate rendering progress
    const totalFrames = this.frameDataCache.size;
    for (let frame = 0; frame < totalFrames; frame++) {
      // Simulate frame rendering time
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (this.progressCallback) {
        this.progressCallback({
          phase: 'rendering',
          progress: frame / totalFrames,
          currentFrame: frame,
          totalFrames,
          estimatedTimeRemaining: ((totalFrames - frame) * 0.01),
          message: `Rendering frame ${frame + 1} of ${totalFrames}...`
        });
      }
    }
    
    // Return placeholder export path
    return `/exports/video-${Date.now()}.mp4`;
  }
  
  /**
   * Cancel ongoing export
   */
  public cancelExport(): void {
    // Implementation would cancel Remotion process
    console.log('🛑 Export cancelled');
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    this.frameDataCache.clear();
    this.audioAnalysisData = null;
    this.midiData = null;
    this.exportConfig = null;
    this.progressCallback = null;
  }
}
