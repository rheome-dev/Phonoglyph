import { RemotionExportManager, ExportConfiguration, ExportProgress } from './RemotionExportManager';
import { AudioFeatureData } from '../visualizer/core/AudioTextureManager';
import { MIDIData } from '@/types/midi';
import { Layer } from '@/types/video-composition';

/**
 * ExportService - Integration layer between Phonoglyph and Remotion export
 * 
 * This service bridges the gap between your existing cached analysis system
 * and the new Remotion export pipeline, providing a clean API for the UI.
 */

export interface ExportRequest {
  // Project data
  projectId: string;
  projectName: string;
  
  // Audio and MIDI data
  audioFile: string;
  midiData: MIDIData;
  cachedAnalysis: any[]; // From useCachedStemAnalysis
  
  // Composition layers
  videoLayers: Layer[];
  imageLayers: Layer[];
  effectLayers: Layer[];
  
  // Export settings
  configuration: ExportConfiguration;
}

export interface ExportJob {
  id: string;
  projectId: string;
  status: 'queued' | 'preparing' | 'analyzing' | 'rendering' | 'encoding' | 'complete' | 'failed';
  progress: ExportProgress;
  createdAt: Date;
  completedAt?: Date;
  outputPath?: string;
  error?: string;
}

export class ExportService {
  private static instance: ExportService;
  private activeJobs: Map<string, { manager: RemotionExportManager; job: ExportJob }> = new Map();
  private jobQueue: ExportRequest[] = [];
  private isProcessing = false;
  
  private constructor() {}
  
  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }
  
  /**
   * Queue a new export job
   */
  public async queueExport(request: ExportRequest): Promise<string> {
    const jobId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const job: ExportJob = {
      id: jobId,
      projectId: request.projectId,
      status: 'queued',
      progress: {
        phase: 'preparing',
        progress: 0,
        currentFrame: 0,
        totalFrames: 0,
        estimatedTimeRemaining: 0,
        message: 'Export queued...'
      },
      createdAt: new Date()
    };
    
    // Create export manager
    const manager = new RemotionExportManager();
    
    // Store job
    this.activeJobs.set(jobId, { manager, job });
    
    // Add to queue
    this.jobQueue.push(request);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    console.log(`📋 Export job queued: ${jobId}`);
    return jobId;
  }
  
  /**
   * Get job status
   */
  public getJobStatus(jobId: string): ExportJob | null {
    const jobData = this.activeJobs.get(jobId);
    return jobData ? { ...jobData.job } : null;
  }
  
  /**
   * Cancel export job
   */
  public cancelExport(jobId: string): boolean {
    const jobData = this.activeJobs.get(jobId);
    if (!jobData) return false;
    
    // Cancel the export
    jobData.manager.cancelExport();
    
    // Update job status
    jobData.job.status = 'failed';
    jobData.job.error = 'Cancelled by user';
    
    // Clean up
    jobData.manager.dispose();
    this.activeJobs.delete(jobId);
    
    console.log(`🛑 Export job cancelled: ${jobId}`);
    return true;
  }
  
  /**
   * Process the export queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.jobQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.jobQueue.length > 0) {
      const request = this.jobQueue.shift()!;
      await this.processExportRequest(request);
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Process a single export request
   */
  private async processExportRequest(request: ExportRequest): Promise<void> {
    // Find the job for this request
    const jobEntry = Array.from(this.activeJobs.entries()).find(
      ([_, { job }]) => job.projectId === request.projectId
    );
    
    if (!jobEntry) {
      console.error('❌ Job not found for export request');
      return;
    }
    
    const [jobId, { manager, job }] = jobEntry;
    
    try {
      // Update job status
      job.status = 'preparing';
      
      // Convert cached analysis to AudioFeatureData format
      const audioFeatureData = this.convertCachedAnalysisToFeatureData(request.cachedAnalysis);
      
      // Load data into export manager
      manager.loadAudioAnalysis(audioFeatureData);
      manager.loadMidiData(request.midiData);
      manager.configure(request.configuration);
      
      // Start export with progress tracking
      const outputPath = await manager.startExport((progress) => {
        job.progress = progress;
        job.status = progress.phase as any;
        
        // Emit progress event (could be WebSocket, EventEmitter, etc.)
        this.emitProgressUpdate(jobId, job);
      });
      
      // Mark as complete
      job.status = 'complete';
      job.completedAt = new Date();
      job.outputPath = outputPath;
      
      console.log(`✅ Export completed: ${jobId} -> ${outputPath}`);
      
    } catch (error) {
      console.error(`❌ Export failed: ${jobId}`, error);
      
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
    }
    
    // Clean up manager after completion/failure
    setTimeout(() => {
      manager.dispose();
      this.activeJobs.delete(jobId);
    }, 60000); // Keep job info for 1 minute for status queries
  }
  
  /**
   * Convert cached analysis from useCachedStemAnalysis to AudioFeatureData format
   */
  private convertCachedAnalysisToFeatureData(cachedAnalysis: any[]): AudioFeatureData {
    const audioFeatureData: AudioFeatureData = {};
    
    for (const analysis of cachedAnalysis) {
      if (!analysis.analysisData || !analysis.stemType) continue;
      
      const stemType = analysis.stemType;
      audioFeatureData[stemType] = {};
      
      // Convert each feature array
      for (const [featureName, featureArray] of Object.entries(analysis.analysisData)) {
        if (Array.isArray(featureArray)) {
          audioFeatureData[stemType][featureName] = featureArray as number[];
        }
      }
    }
    
    return audioFeatureData;
  }
  
  /**
   * Emit progress update (placeholder for real implementation)
   */
  private emitProgressUpdate(jobId: string, job: ExportJob): void {
    // In a real implementation, this would emit to WebSocket, EventEmitter, etc.
    // For now, just log progress
    if (job.progress.progress > 0) {
      console.log(`📊 Export progress [${jobId}]: ${Math.round(job.progress.progress * 100)}% - ${job.progress.message}`);
    }
  }
  
  /**
   * Get all active jobs
   */
  public getActiveJobs(): ExportJob[] {
    return Array.from(this.activeJobs.values()).map(({ job }) => ({ ...job }));
  }
  
  /**
   * Clean up completed jobs older than specified time
   */
  public cleanupOldJobs(maxAgeMs: number = 3600000): void { // Default: 1 hour
    const cutoff = new Date(Date.now() - maxAgeMs);
    
    for (const [jobId, { job, manager }] of this.activeJobs.entries()) {
      if (job.completedAt && job.completedAt < cutoff) {
        manager.dispose();
        this.activeJobs.delete(jobId);
        console.log(`🧹 Cleaned up old export job: ${jobId}`);
      }
    }
  }
  
  /**
   * Get export presets for common social media formats
   */
  public static getExportPresets(): Record<string, Partial<ExportConfiguration>> {
    return {
      'youtube-1080p': {
        width: 1920,
        height: 1080,
        fps: 30,
        format: 'mp4',
        codec: 'h264',
        quality: 'high',
        preset: 'youtube'
      },
      'instagram-square': {
        width: 1080,
        height: 1080,
        fps: 30,
        format: 'mp4',
        codec: 'h264',
        quality: 'medium',
        preset: 'instagram'
      },
      'tiktok-vertical': {
        width: 1080,
        height: 1920,
        fps: 30,
        format: 'mp4',
        codec: 'h264',
        quality: 'medium',
        preset: 'tiktok'
      },
      'twitter-720p': {
        width: 1280,
        height: 720,
        fps: 30,
        format: 'mp4',
        codec: 'h264',
        quality: 'medium',
        preset: 'twitter'
      },
      'high-quality-export': {
        width: 1920,
        height: 1080,
        fps: 60,
        format: 'mov',
        codec: 'prores',
        quality: 'ultra',
        antialiasing: true,
        motionBlur: true
      }
    };
  }
}

// Singleton instance
export const exportService = ExportService.getInstance();
