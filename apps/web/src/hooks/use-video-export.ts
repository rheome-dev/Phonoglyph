import { useState, useEffect, useCallback } from 'react';
import { exportService, ExportRequest, ExportJob, ExportService } from '@/lib/remotion/ExportService';
import { ExportConfiguration } from '@/lib/remotion/RemotionExportManager';
import { MIDIData } from '@/types/midi';
import { Layer } from '@/types/video-composition';

/**
 * useVideoExport - React hook for video export functionality
 * 
 * This hook provides a clean interface for the UI to interact with
 * the Remotion export pipeline, integrating with the existing
 * cached analysis system.
 */

export interface UseVideoExportOptions {
  // Auto-refresh job status interval (ms)
  refreshInterval?: number;
  
  // Auto-cleanup completed jobs after this time (ms)
  cleanupInterval?: number;
}

export interface UseVideoExportReturn {
  // Export functions
  startExport: (request: Omit<ExportRequest, 'projectId'>) => Promise<string>;
  cancelExport: (jobId: string) => boolean;
  
  // Job management
  activeJobs: ExportJob[];
  getJobStatus: (jobId: string) => ExportJob | null;
  
  // Export presets
  presets: Record<string, Partial<ExportConfiguration>>;
  
  // State
  isExporting: boolean;
  lastExportId: string | null;
  
  // Utilities
  createExportRequest: (
    midiData: MIDIData,
    cachedAnalysis: any[],
    layers: { video: Layer[]; image: Layer[]; effect: Layer[] },
    config: ExportConfiguration
  ) => Omit<ExportRequest, 'projectId'>;
}

export function useVideoExport(
  projectId: string,
  options: UseVideoExportOptions = {}
): UseVideoExportReturn {
  const {
    refreshInterval = 1000, // 1 second
    cleanupInterval = 3600000 // 1 hour
  } = options;
  
  const [activeJobs, setActiveJobs] = useState<ExportJob[]>([]);
  const [lastExportId, setLastExportId] = useState<string | null>(null);
  
  // Derived state
  const isExporting = activeJobs.some(job => 
    ['queued', 'preparing', 'analyzing', 'rendering', 'encoding'].includes(job.status)
  );
  
  // Refresh active jobs periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const jobs = exportService.getActiveJobs();
      setActiveJobs(jobs);
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);
  
  // Cleanup old jobs periodically
  useEffect(() => {
    const interval = setInterval(() => {
      exportService.cleanupOldJobs(cleanupInterval);
    }, cleanupInterval);
    
    return () => clearInterval(interval);
  }, [cleanupInterval]);
  
  // Start export
  const startExport = useCallback(async (request: Omit<ExportRequest, 'projectId'>): Promise<string> => {
    const fullRequest: ExportRequest = {
      ...request,
      projectId
    };
    
    const jobId = await exportService.queueExport(fullRequest);
    setLastExportId(jobId);
    
    // Immediately refresh jobs to show the new one
    const jobs = exportService.getActiveJobs();
    setActiveJobs(jobs);
    
    return jobId;
  }, [projectId]);
  
  // Cancel export
  const cancelExport = useCallback((jobId: string): boolean => {
    const success = exportService.cancelExport(jobId);
    
    if (success) {
      // Refresh jobs to reflect cancellation
      const jobs = exportService.getActiveJobs();
      setActiveJobs(jobs);
    }
    
    return success;
  }, []);
  
  // Get job status
  const getJobStatus = useCallback((jobId: string): ExportJob | null => {
    return exportService.getJobStatus(jobId);
  }, []);
  
  // Create export request helper
  const createExportRequest = useCallback((
    midiData: MIDIData,
    cachedAnalysis: any[],
    layers: { video: Layer[]; image: Layer[]; effect: Layer[] },
    config: ExportConfiguration
  ): Omit<ExportRequest, 'projectId'> => {
    // Determine audio file from MIDI data or provide default
    const audioFile = '/path/to/audio.mp3'; // This would come from your audio system
    
    // Generate project name
    const projectName = `Export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    
    return {
      projectName,
      audioFile,
      midiData,
      cachedAnalysis,
      videoLayers: layers.video,
      imageLayers: layers.image,
      effectLayers: layers.effect,
      configuration: config
    };
  }, []);
  
  // Get export presets
  const presets = ExportService.getExportPresets();
  
  return {
    startExport,
    cancelExport,
    activeJobs,
    getJobStatus,
    presets,
    isExporting,
    lastExportId,
    createExportRequest
  };
}

/**
 * Helper hook for export progress tracking
 */
export function useExportProgress(jobId: string | null) {
  const [progress, setProgress] = useState<ExportJob | null>(null);
  
  useEffect(() => {
    if (!jobId) {
      setProgress(null);
      return;
    }
    
    const interval = setInterval(() => {
      const job = exportService.getJobStatus(jobId);
      setProgress(job);
      
      // Stop polling if job is complete or failed
      if (job && ['complete', 'failed'].includes(job.status)) {
        clearInterval(interval);
      }
    }, 500); // Poll every 500ms for smooth progress updates
    
    return () => clearInterval(interval);
  }, [jobId]);
  
  return progress;
}

/**
 * Helper hook for export presets with validation
 */
export function useExportPresets() {
  const presets = ExportService.getExportPresets();
  
  const validateConfiguration = useCallback((config: Partial<ExportConfiguration>): string[] => {
    const errors: string[] = [];
    
    if (!config.width || config.width < 1) {
      errors.push('Width must be greater than 0');
    }
    
    if (!config.height || config.height < 1) {
      errors.push('Height must be greater than 0');
    }
    
    if (!config.fps || config.fps < 1 || config.fps > 120) {
      errors.push('FPS must be between 1 and 120');
    }
    
    if (!config.duration || config.duration < 0.1) {
      errors.push('Duration must be at least 0.1 seconds');
    }
    
    if (!config.format || !['mp4', 'webm', 'mov', 'gif'].includes(config.format)) {
      errors.push('Invalid format specified');
    }
    
    return errors;
  }, []);
  
  const applyPreset = useCallback((
    presetName: string,
    baseConfig: Partial<ExportConfiguration> = {}
  ): ExportConfiguration => {
    const preset = presets[presetName];
    if (!preset) {
      throw new Error(`Unknown preset: ${presetName}`);
    }
    
    // Merge preset with base config
    const merged = {
      ...baseConfig,
      ...preset,
      // Ensure required fields have defaults
      audioOffset: 0,
      antialiasing: true,
      motionBlur: false,
      ...baseConfig,
      ...preset
    } as ExportConfiguration;
    
    // Validate the final configuration
    const errors = validateConfiguration(merged);
    if (errors.length > 0) {
      throw new Error(`Invalid configuration: ${errors.join(', ')}`);
    }
    
    return merged;
  }, [presets, validateConfiguration]);
  
  return {
    presets,
    validateConfiguration,
    applyPreset,
    presetNames: Object.keys(presets)
  };
}
