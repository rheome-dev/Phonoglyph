import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { ExportConfiguration, ExportJob, ExportStatus, FormatPreset } from '../types/export';
import { r2Client, BUCKET_NAME } from './r2-storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createId } from '@paralleldrive/cuid2';
import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export class RemotionExportService extends EventEmitter {
  private activeJobs = new Map<string, ExportJob>();
  private jobQueue: string[] = [];
  private isProcessing = false;
  private bundleLocation: string | null = null;
  
  constructor() {
    super();
    // Pre-bundle the Remotion project on service initialization
    this.initializeBundle();
  }
  
  private async initializeBundle(): Promise<void> {
    try {
      console.log('Initializing Remotion bundle...');
      this.bundleLocation = await bundle({
        entryPoint: path.resolve('./apps/video/src/index.ts'),
        onProgress: (progress) => {
          console.log(`Bundle progress: ${Math.round(progress * 100)}%`);
        }
      });
      console.log('Remotion bundle initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Remotion bundle:', error);
    }
  }
  
  async queueExport(
    userId: string,
    compositionId: string,
    config: ExportConfiguration
  ): Promise<string> {
    const jobId = createId();
    
    const job: ExportJob = {
      id: jobId,
      userId,
      compositionId,
      config: { ...config, compositionId },
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.activeJobs.set(jobId, job);
    this.jobQueue.push(jobId);
    
    console.log(`Export job ${jobId} queued for user ${userId}`);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue().catch(console.error);
    }
    
    return jobId;
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.jobQueue.length === 0) return;
    
    this.isProcessing = true;
    console.log(`Starting export queue processing. ${this.jobQueue.length} jobs in queue.`);
    
    while (this.jobQueue.length > 0) {
      const jobId = this.jobQueue.shift()!;
      const job = this.activeJobs.get(jobId);
      
      if (!job) {
        console.warn(`Job ${jobId} not found in active jobs`);
        continue;
      }
      
      try {
        console.log(`Processing export job ${jobId}`);
        await this.renderVideo(job);
        console.log(`Export job ${jobId} completed successfully`);
      } catch (error) {
        console.error(`Export job ${jobId} failed:`, error);
        this.updateJobStatus(jobId, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    this.isProcessing = false;
    console.log('Export queue processing completed');
  }
  
  private async renderVideo(job: ExportJob): Promise<void> {
    if (!this.bundleLocation) {
      throw new Error('Remotion bundle not initialized');
    }
    
    this.updateJobStatus(job.id, 'rendering', 0);
    
    try {
      // Get composition data and prepare input props
      const inputProps = await this.getCompositionProps(job.compositionId);
      
      // Get composition metadata
      const composition = await selectComposition({
        serveUrl: this.bundleLocation,
        id: 'MidiVisualizer',
        inputProps
      });
      
      // Update composition dimensions based on config
      const updatedComposition = {
        ...composition,
        width: job.config.quality.resolution.width,
        height: job.config.quality.resolution.height,
        fps: job.config.quality.framerate
      };
      
      // Configure output path
      const outputFileName = `export-${job.id}.${job.config.format.container}`;
      const outputPath = path.join('/tmp', outputFileName);
      
      // Ensure temp directory exists
      await fs.mkdir('/tmp', { recursive: true });
      
      console.log(`Rendering video to ${outputPath}`);
      
      // Render the video with progress tracking
      await renderMedia({
        composition: updatedComposition,
        serveUrl: this.bundleLocation,
        codec: this.mapVideoCodec(job.config.format.videoCodec),
        outputLocation: outputPath,
        inputProps,
        
        // Quality settings
        crf: job.config.quality.crf,
        videoBitrate: job.config.quality.bitrate ? `${job.config.quality.bitrate}k` : undefined,
        audioBitrate: job.config.audio.enabled ? `${job.config.audio.bitrate}k` : undefined,
        
        // Audio settings
        audioCodec: job.config.audio.enabled ? job.config.format.audioCodec : null,
        muted: !job.config.audio.enabled,
        
        // Progress callback
        onProgress: ({ renderedFrames, totalFrames }) => {
          const renderProgress = 0.1 + (renderedFrames / totalFrames) * 0.8; // 10% for setup, 80% for rendering
          this.updateJobStatus(job.id, 'rendering', renderProgress);
        },
        
        // Frame range
        frameRange: [0, updatedComposition.durationInFrames - 1],
        overwrite: true
      });
      
      // Get file stats
      const stats = await fs.stat(outputPath);
      const fileSize = stats.size;
      const durationSeconds = updatedComposition.durationInFrames / updatedComposition.fps;
      
      console.log(`Video rendered successfully. Size: ${fileSize} bytes, Duration: ${durationSeconds}s`);
      
      // Upload to cloud storage
      this.updateJobStatus(job.id, 'uploading', 0.9);
      
      const uploadKey = `exports/${job.userId}/${outputFileName}`;
      const uploadUrl = await this.uploadVideoToR2(outputPath, uploadKey);
      
      console.log(`Video uploaded to: ${uploadUrl}`);
      
      // Clean up local file
      await fs.unlink(outputPath);
      
      // Complete the job
      const completedJob = this.activeJobs.get(job.id);
      if (completedJob) {
        completedJob.fileSize = fileSize;
        completedJob.durationSeconds = durationSeconds;
        completedJob.completedAt = new Date();
      }
      
      this.updateJobStatus(job.id, 'completed', 1, undefined, uploadUrl);
      
    } catch (error) {
      console.error(`Rendering failed for job ${job.id}:`, error);
      throw error;
    }
  }
  
  private async getCompositionProps(compositionId: string): Promise<any> {
    // TODO: Implement actual database queries to fetch composition data
    // For now, return mock data
    return {
      midiData: {
        tracks: [],
        duration: 60000, // 60 seconds in milliseconds
        ticksPerQuarter: 480
      },
      layers: [
        {
          id: 'piano-roll-1',
          type: 'piano-roll',
          position: { x: 0, y: 0 },
          size: { width: 1920, height: 400 }
        },
        {
          id: 'waveform-1',
          type: 'waveform',
          position: { x: 0, y: 600 },
          size: { width: 1920, height: 200 }
        }
      ],
      settings: {
        backgroundColor: '#000000',
        showWaveform: true,
        showNotes: true,
        noteColors: {
          'C': '#ff6b6b',
          'D': '#4ecdc4',
          'E': '#45b7d1',
          'F': '#96ceb4',
          'G': '#ffeaa7',
          'A': '#dda0dd',
          'B': '#98d8c8'
        },
        effects: []
      }
    };
  }
  
  private mapVideoCodec(codec: string): 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores' {
    switch (codec) {
      case 'h264': return 'h264';
      case 'h265': return 'h265';
      case 'vp9': return 'vp9';
      default: return 'h264';
    }
  }
  
  private updateJobStatus(
    jobId: string,
    status: ExportStatus,
    progress?: number,
    error?: string,
    downloadUrl?: string
  ): void {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      console.warn(`Attempted to update non-existent job: ${jobId}`);
      return;
    }
    
    job.status = status;
    if (progress !== undefined) job.progress = Math.max(0, Math.min(1, progress));
    if (error) job.error = error;
    if (downloadUrl) job.downloadUrl = downloadUrl;
    job.updatedAt = new Date();
    
    // Emit progress event for real-time updates
    this.emit('export-progress', job);
    
    console.log(`Job ${jobId} status updated: ${status} (${Math.round(job.progress * 100)}%)`);
  }
  
  getJobStatus(jobId: string): ExportJob | null {
    return this.activeJobs.get(jobId) || null;
  }
  
  getUserJobs(userId: string): ExportJob[] {
    const userJobs: ExportJob[] = [];
    for (const job of this.activeJobs.values()) {
      if (job.userId === userId) {
        userJobs.push(job);
      }
    }
    return userJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }
    
    if (job.status === 'rendering') {
      // TODO: Implement actual render process cancellation
      console.log(`Cancelling rendering job ${jobId}`);
    }
    
    this.updateJobStatus(jobId, 'cancelled');
    this.jobQueue = this.jobQueue.filter(id => id !== jobId);
    
    console.log(`Job ${jobId} cancelled`);
    return true;
  }
  
  getQueueStatus(): { 
    queueLength: number; 
    activeJobs: number; 
    isProcessing: boolean;
    totalJobs: number;
  } {
    const activeJobsCount = Array.from(this.activeJobs.values())
      .filter(job => job.status === 'rendering' || job.status === 'uploading').length;
    
    return {
      queueLength: this.jobQueue.length,
      activeJobs: activeJobsCount,
      isProcessing: this.isProcessing,
      totalJobs: this.activeJobs.size
    };
  }
  
  // Upload video file to R2 storage
  private async uploadVideoToR2(filePath: string, key: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: 'video/mp4', // Default to mp4, could be made dynamic
        CacheControl: 'public, max-age=31536000', // 1 year cache
      });
      
      await r2Client.send(command);
      
      // Return a public URL or signed URL based on your R2 setup
      // For now, return the key - this would need to be a proper download URL in production
      return `https://${process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN}/${key}`;
    } catch (error) {
      console.error('Failed to upload video to R2:', error);
      throw error;
    }
  }
  
  // Cleanup old jobs (call periodically)
  cleanupOldJobs(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let removedCount = 0;
    
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.createdAt < cutoffTime && 
          (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled')) {
        this.activeJobs.delete(jobId);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old export jobs`);
    }
  }
}

// Singleton instance
export const exportService = new RemotionExportService();