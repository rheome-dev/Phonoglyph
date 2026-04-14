This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: apps/web/src/lib/export-utils.ts, apps/web/src/app/workers/audio-analysis.worker.ts, apps/web/src/lib/visualizer/core/**, apps/web/src/lib/visualizer/effects/EffectDefinitions.ts, apps/web/src/lib/visualizer/effects/BloomEffect.ts, apps/web/src/lib/visualizer/effects/MetaballsEffect.ts, apps/web/src/lib/visualizer/effects/VideoEffect.ts, apps/web/src/lib/visualizer/effects/CircleEffect.ts, apps/web/src/lib/visualizer/effects/SwirlEffect.ts, apps/web/src/remotion/**, apps/web/src/components/midi/**, apps/web/src/components/hud/**
- Files matching these patterns are excluded: apps/web/src/remotion/debug-payload.json
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
apps/
  web/
    src/
      app/
        workers/
          audio-analysis.worker.ts
      components/
        midi/
          file-selector.tsx
          midi-controls.tsx
          midi-timeline.tsx
          three-visualizer.tsx
      lib/
        visualizer/
          core/
            AudioTextureManager.ts
            MediaLayerManager.ts
            MultiLayerCompositor.ts
            VisualizerManager.ts
          effects/
            CircleEffect.ts
            EffectDefinitions.ts
            MetaballsEffect.ts
            SwirlEffect.ts
            VideoEffect.ts
        export-utils.ts
      remotion/
        Debug.tsx
        index.ts
        RayboxComposition.tsx
        Root.tsx
```

# Files

## File: apps/web/src/app/workers/audio-analysis.worker.ts
```typescript
// Audio Analysis Worker (TypeScript) - no BPM detection here
// Focused on frame-by-frame feature extraction using Meyda

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Meyda types may not include worker context usage explicitly
import Meyda from 'meyda';

type AnalyzeBufferMessage = {
  type: 'ANALYZE_BUFFER';
  data: {
    fileId: string;
    channelData: Float32Array;
    sampleRate: number;
    duration: number;
    stemType: string;
    enhancedAnalysis?: boolean;
    analysisParams?: Record<string, unknown>;
  };
};

type WorkerMessage = AnalyzeBufferMessage | { type: string; data?: unknown };

const STEM_FEATURES: Record<string, string[]> = {
  // All stem types now request amplitudeSpectrum
  drums: ['rms', 'zcr', 'spectralCentroid', 'amplitudeSpectrum', 'energy', 'perceptualSharpness', 'loudness'],
  bass: ['rms', 'loudness', 'spectralCentroid', 'amplitudeSpectrum'],
  vocals: ['rms', 'loudness', 'mfcc', 'chroma', 'amplitudeSpectrum'],
  other: ['rms', 'loudness', 'spectralCentroid', 'chroma', 'amplitudeSpectrum'],
  master: ['rms', 'loudness', 'spectralCentroid', 'spectralRolloff', 'spectralFlatness', 'zcr', 'perceptualSpread', 'amplitudeSpectrum', 'perceptualSharpness', 'energy', 'chroma'],
};

/**
 * Helper function to check if a value is an array-like object (regular array or TypedArray)
 * and convert it to a regular array for processing.
 * Meyda returns TypedArrays (Float32Array), which need to be converted before use.
 */
function toArray(value: any): number[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  // ArrayBuffer.isView() checks for TypedArrays (Float32Array, Uint8Array, etc.)
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>);
  // Fallback: check if it has length and numeric indices
  if (typeof value === 'object' && 'length' in value && typeof value.length === 'number') {
    return Array.from(value as unknown as ArrayLike<number>);
  }
  return null;
}

function generateWaveformData(channelData: Float32Array, duration: number, points = 1024) {
  const totalSamples = channelData.length;
  const samplesPerPoint = Math.max(1, Math.floor(totalSamples / points));
  const waveform = new Float32Array(points);

  for (let i = 0; i < points; i++) {
    const start = i * samplesPerPoint;
    const end = Math.min(start + samplesPerPoint, totalSamples);
    let max = 0;
    for (let j = start; j < end; j++) {
      const sample = Math.abs(channelData[j] ?? 0);
      if (sample > max) max = sample;
    }
    waveform[i] = max;
  }

  return {
    points: Array.from(waveform),
    duration: duration,
    sampleRate: Math.max(1, Math.floor(channelData.length / Math.max(0.000001, duration))),
    markers: [] as Array<{ time: number; type: string; intensity: number; frequency?: number }>,
  };
}

function performFullAnalysis(
  channelData: Float32Array,
  sampleRate: number,
  stemType: string,
  onProgress?: (p: number) => void
) {
  const isSingleAudioFile = stemType !== 'master' && !['drums', 'bass', 'vocals'].includes(stemType);
  const effectiveStemType = isSingleAudioFile ? 'master' : stemType;
  const featuresToExtract = STEM_FEATURES[effectiveStemType] || STEM_FEATURES['other'];

  const featureFrames: Record<string, any> = {};
  const frameTimes: number[] = [];
  featuresToExtract.forEach((f) => {
    featureFrames[f] = [];
  });
  // Add manual and derived features
  featureFrames.spectralFlux = [];
  featureFrames.volume = [];
  featureFrames.bass = [];
  featureFrames.mid = [];
  featureFrames.treble = [];

  const bufferSize = 1024;
  const hopSize = 512;
  let currentPosition = 0;
  let previousSpectrum: number[] | null = null;

  while (currentPosition + bufferSize <= channelData.length) {
    const buffer = channelData.slice(currentPosition, currentPosition + bufferSize);
    let features: any = null;

    try {
      // Use stateless Meyda.extract with configuration object for amplitudeSpectrum
      features = (Meyda as any).extract(featuresToExtract, buffer, {
        sampleRate: sampleRate,
        bufferSize: bufferSize,
        windowingFunction: 'hanning'
      });
    } catch (error) {
      features = {}; // Ensure features is an object to prevent further errors
    }

    // --- Manual spectral flux calculation (stateful) ---
    // Use toArray helper to normalize TypedArrays to regular arrays
    const currentSpectrum = toArray(features?.amplitudeSpectrum);
    let flux = 0;
    
    if (previousSpectrum && currentSpectrum && previousSpectrum.length > 0 && currentSpectrum.length > 0) {
      const len = Math.min(previousSpectrum.length, currentSpectrum.length);
      for (let i = 0; i < len; i++) {
        const diff = (currentSpectrum[i] || 0) - (previousSpectrum[i] || 0);
        if (diff > 0) flux += diff;
      }
    }
    
    previousSpectrum = currentSpectrum && currentSpectrum.length > 0 ? currentSpectrum : null;
    featureFrames.spectralFlux.push(flux);

    // Process and sanitize all extracted features
    if (features) {
      for (const feature of featuresToExtract) {
        const value = features[feature];
        if (Array.isArray(value)) {
          const sanitizedArray = value.map(v => (typeof v === 'number' && isFinite(v) ? v : 0));
          if (feature === 'chroma') {
            const dominantChromaIndex = sanitizedArray.indexOf(Math.max(...sanitizedArray));
            featureFrames[feature].push(dominantChromaIndex);
          } else {
            featureFrames[feature].push(sanitizedArray[0] || 0); // e.g., for mfcc
          }
        } else {
          const sanitizedValue = (typeof value === 'number' && isFinite(value)) ? value : 0;
          featureFrames[feature].push(sanitizedValue);
        }
      }
      // Derived features
      const rms = features.rms || 0;
      const spectralCentroid = features.spectralCentroid || 0;
      featureFrames.volume.push(rms);
      featureFrames.bass.push(spectralCentroid < 200 ? rms : 0);
      featureFrames.mid.push(spectralCentroid >= 200 && spectralCentroid < 2000 ? rms : 0);
      featureFrames.treble.push(spectralCentroid >= 2000 ? rms : 0);
    } else {
      // If features object is null or empty, push default values to maintain array alignment
      featuresToExtract.forEach(f => featureFrames[f].push(0));
      featureFrames.volume.push(0);
      featureFrames.bass.push(0);
      featureFrames.mid.push(0);
      featureFrames.treble.push(0);
    }

    const frameStartTime = currentPosition / sampleRate;
    frameTimes.push(frameStartTime);
    currentPosition += hopSize;
    if (onProgress) onProgress(currentPosition / channelData.length);
  }

  // Final cleanup and shaping
  const flatFeatures: Record<string, any> = { ...featureFrames, frameTimes };
  return flatFeatures as Record<string, number[] | number>;
}

function performEnhancedAnalysis(
  fullAnalysis: Record<string, number[] | number>,
  channelData: Float32Array,
  sampleRate: number,
  stemType: string,
  analysisParams?: any
): { time: number; intensity: number }[] {

  const params = Object.assign({
    onsetThreshold: 0.08,   // base normalized threshold (more sensitive)
    peakWindow: 4,          // frames on each side for local max
    peakMultiplier: 1.25,   // how much above local mean a peak must be
  }, analysisParams || {});

  const { frameTimes, spectralFlux, volume, rms } = fullAnalysis as any;

  if (!spectralFlux || !Array.isArray(spectralFlux) || spectralFlux.length === 0) {
    return [];
  }

  const rawFlux = (spectralFlux as number[]).map(v => (isFinite(v) && v > 0 ? v : 0));
  const finiteFlux = rawFlux.filter(isFinite);
  if (finiteFlux.length === 0) return [];

  // Use overall max for stable normalization
  const maxFlux = Math.max(1e-6, ...finiteFlux);
  const normFlux = rawFlux.map(v => v / maxFlux);

  // Lightweight smoothing to reduce spurious tiny peaks (especially hi-hats)
  const smoothFlux: number[] = new Array(normFlux.length);
  const smoothRadius = 1;
  for (let i = 0; i < normFlux.length; i++) {
    let sum = 0;
    let count = 0;
    for (let k = -smoothRadius; k <= smoothRadius; k++) {
      const idx = i + k;
      if (idx >= 0 && idx < normFlux.length) {
        sum += normFlux[idx];
        count++;
      }
    }
    smoothFlux[i] = count > 0 ? sum / count : normFlux[i];
  }

  // Volume gating and weighting to better capture low/mid-frequency hits
  const volArray: number[] = Array.isArray(volume)
    ? (volume as number[]).map(v => (isFinite(v) && v > 0 ? v : 0))
    : Array.isArray(rms)
      ? (rms as number[]).map((v: number) => (isFinite(v) && v > 0 ? v : 0))
      : [];
  const volFinite = volArray.filter(isFinite);
  const avgVolume = volFinite.length ? volFinite.reduce((a, b) => a + b, 0) / volFinite.length : 0;
  const volumeGate = avgVolume * 0.15; // require at least 15% of average loudness (more forgiving)

  // Normalize volume to blend with spectral flux
  const volMax = volFinite.length ? Math.max(1e-6, ...volFinite) : 1e-6;
  const normVol: number[] = volArray.map(v => v / volMax);

  // Combined onset strength: spectral flux (captures HF detail) + volume (captures LF/mid hits)
  const combinedFlux: number[] = smoothFlux.map((f, i) => {
    const nv = normVol[i] ?? 0;
    // Slightly favor spectral flux but still give volume strong influence
    return f * 0.7 + nv * 0.4;
  });

  const peaks: { frameIndex: number; time: number; intensity: number }[] = [];
  const w = Math.max(1, params.peakWindow | 0);
  for (let i = w; i < combinedFlux.length - w; i++) {
    const f = combinedFlux[i];
    if (f < params.onsetThreshold) continue;

    // Local mean around i
    let localSum = 0;
    let localCount = 0;
    for (let j = -w; j <= w; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < combinedFlux.length) {
        localSum += combinedFlux[idx];
        localCount++;
      }
    }
    const localMean = localCount > 0 ? localSum / localCount : 0;
    if (f < localMean * params.peakMultiplier) continue;

    // Basic volume gate (ignore very quiet events)
    if (volArray.length && (volArray[i] ?? 0) < volumeGate) continue;

    let isPeak = true;
    if (isPeak) {
      let isLocalMax = true;
      for (let j = -w; j <= w; j++) {
        const idx = i + j;
        if (idx === i || idx < 0 || idx >= combinedFlux.length) continue;
        if (combinedFlux[i] < combinedFlux[idx]) {
          isLocalMax = false;
          break;
        }
      }
      if (isLocalMax) {
        const frameTimesArray = Array.isArray(frameTimes) ? frameTimes : [];
        peaks.push({
          frameIndex: i,
          time: frameTimesArray[i] ?? i * (512 / sampleRate),
          intensity: f
        });
        i += w;
      }
    }
  }

  // Convert peaks to transients (default to 'generic' type since we don't classify)
  const transients: { time: number; intensity: number; type: string }[] = peaks.map(peak => ({
    time: peak.time,
    intensity: peak.intensity,
    type: 'generic' // Default type since we don't perform drum classification
  }));

  return transients;
}

self.onmessage = function (event: MessageEvent<WorkerMessage>) {
  const { type, data } = event.data as any;
  if (type === 'ANALYZE_BUFFER') {
    const { fileId, channelData, sampleRate, duration, stemType, enhancedAnalysis, analysisParams } = data;
    
    // DEBUG: Log the sampleRate received from main thread
    console.log(`[worker] DEBUG: Received ANALYZE_BUFFER - fileId=${fileId}, sampleRate=${sampleRate}, channelData.length=${channelData.length}, duration=${duration}, stemType=${stemType}`);
    
    try {
      const analysis = performFullAnalysis(channelData, sampleRate, stemType, () => {});
      const waveformData = generateWaveformData(channelData, duration, 1024);
      
      // Run enhanced analysis for transients with frame-based classification
      const transients = performEnhancedAnalysis(analysis, channelData, sampleRate, stemType, analysisParams);

      const result = {
        id: `client_${fileId}`,
        fileMetadataId: fileId,
        stemType,
        analysisData: {
          ...analysis,
          transients, // Add classified transients to the result
        },
        waveformData,
        metadata: {
          sampleRate,
          duration,
          bufferSize: 1024,
          featuresExtracted: Object.keys(analysis),
          analysisDuration: 0,
        },
      };
      (self as any).postMessage({ type: 'ANALYSIS_COMPLETE', data: { fileId, result } });
    } catch (error: any) {
      (self as any).postMessage({ type: 'ANALYSIS_ERROR', data: { fileId, error: error?.message || 'Analysis failed' } });
    }
  }
};
```

## File: apps/web/src/components/midi/file-selector.tsx
```typescript
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  FileMusic, 
  Upload, 
  Clock, 
  Music,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Users,
  Trash2
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useUpload } from '@/hooks/use-upload';
import { useToast } from '@/hooks/use-toast';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { DraggableFile } from '@/components/video-composition/DraggableFile';

interface FileMetadata {
  id: string;
  file_name: string;
  file_size: number;
  file_type: 'midi' | 'audio' | 'video' | 'image';
  mime_type: string;
  upload_status: 'uploading' | 'completed' | 'failed';
  processing_status?: 'pending' | 'completed' | 'failed';
  created_at: string;
  thumbnail_url?: string | null;
}

interface FileSelectorProps {
  onFileSelected: (fileId: string) => void;
  selectedFileId?: string;
  showUpload?: boolean;
  useDemoData: boolean;
  onDemoModeChange: (useDemoData: boolean) => void;
  projectId?: string;
  projectName?: string;
}

export function FileSelector({ 
  onFileSelected, 
  selectedFileId, 
  showUpload = true,
  useDemoData,
  onDemoModeChange,
  projectId,
  projectName
}: FileSelectorProps) {
  const [uploadExpanded, setUploadExpanded] = useState(false);
  const { toast } = useToast();
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch user's files (project-scoped if projectId provided)
  const { 
    data: filesData, 
    isLoading: filesLoading, 
    error: filesError,
    refetch: refetchFiles
  } = trpc.file.getUserFiles.useQuery({
    limit: 100,
    fileType: 'all', // Show all file types, not just MIDI
    projectId: projectId
  });

  // Parse MIDI file mutation
  const parseMidiMutation = trpc.midi.parseMidiFile.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "MIDI File Ready",
          description: "File parsed successfully and ready for visualization",
        });
        onFileSelected(result.midiFileId);
        onDemoModeChange(false);
        refetchFiles();
      }
    },
    onError: (error) => {
      toast({
        title: "Parsing Failed", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Upload integration
  const { addAndUploadFiles, files: uploadQueue, clearFiles } = useUpload({
    projectId: projectId, // NEW: Associate uploads with project
    onUploadComplete: (uploadFile) => {
      // Refresh the file list to show the newly uploaded file
      refetchFiles();
      
      // Only parse MIDI files
      if (uploadFile.fileId && !uploadFile.fileId.startsWith('mock_')) {
        // Check if it's a MIDI file before parsing
        const extension = uploadFile.file.name.toLowerCase().split('.').pop();
        if (extension && ['mid', 'midi'].includes(extension)) {
          parseMidiMutation.mutate({ fileId: uploadFile.fileId });
        }
      } else {
        toast({
          title: "Upload Demo",
          description: "File uploaded successfully! This is demo mode - parsing not available yet.",
          variant: "default"
        });
      }
    },
    onUploadError: (uploadFile, error) => {
      toast({
        title: "Upload Failed",
        description: `${uploadFile.file.name}: ${error}`,
        variant: "destructive"
      });
    }
  });

  const deleteFileMutation = trpc.file.deleteFile.useMutation({
    onSuccess: () => {
      toast({ title: 'File deleted', description: 'The file was deleted.' });
      setDeleteFileId(null);
      refetchFiles();
    },
    onError: (error) => {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      setDeleteFileId(null);
    },
    onSettled: () => setIsDeleting(false)
  });

  const handleDeleteFile = (fileId: string) => {
    setIsDeleting(true);
    deleteFileMutation.mutate({ fileId });
  };

  const handleFileUpload = async (files: File[]) => {
    const supportedFiles = files.filter((file: File) => {
      const ext = file.name.toLowerCase().split('.').pop();
      const midiExts = ['mid', 'midi'];
      const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
      const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      
      return [...midiExts, ...audioExts, ...videoExts, ...imageExts].includes(ext || '');
    });

    if (supportedFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please select supported files (MIDI, audio, video, or image files)",
        variant: "destructive"
      });
      return;
    }

    await addAndUploadFiles(supportedFiles);
    setUploadExpanded(false);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const StatusBadge = ({ file }: { file: FileMetadata }) => {
    let text = 'Uploading';
    let statusClass = 'pending';
    
    if (file.upload_status === 'completed') {
      if (file.file_type === 'midi') {
        if (file.processing_status === 'completed') {
          text = 'Ready';
          statusClass = 'completed';
        } else if (file.processing_status === 'failed') {
          text = 'Parse Failed';
          statusClass = 'failed';
        } else {
          text = 'Processing';
          statusClass = 'pending';
        }
      } else {
        text = 'Ready';
        statusClass = 'completed';
      }
    } else if (file.upload_status === 'failed') {
      text = 'Upload Failed';
      statusClass = 'failed';
    }
    
    return (
      <div className={`parsing-status ${statusClass}`}>
        {statusClass === 'pending' && <Loader2 className="h-3 w-3 animate-spin" />}
        {statusClass === 'completed' && <CheckCircle2 className="h-3 w-3" />}
        {statusClass === 'failed' && <AlertCircle className="h-3 w-3" />}
        {text}
      </div>
    );
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'midi': return <FileMusic className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'video': return <Play className="h-4 w-4" />;
      case 'image': return <Users className="h-4 w-4" />; // Using Users as placeholder for image
      default: return <FileMusic className="h-4 w-4" />;
    }
  };

  const userFiles = filesData?.files || [];

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-none font-mono text-xs flex flex-col min-h-0" style={{ maxHeight: 420, overflow: 'hidden' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-700 bg-stone-900 text-stone-100">
        <h3 className="text-xs font-bold tracking-widest uppercase">{projectName ? `${projectName} - Files` : 'File Library'}</h3>
      </div>
      {/* File List with proper scrolling */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: 320 }}>
        <div className="space-y-1 p-2">
          {filesError && <p className="text-red-400 text-xs">Error loading files.</p>}
          {!useDemoData && userFiles.length === 0 && !filesLoading && (
            <div className="text-center py-8 text-stone-400">
              <span className="text-2xl">📄</span>
              <p className="text-xs mt-1">No files uploaded yet</p>
            </div>
          )}
          {!useDemoData && userFiles.map((file: FileMetadata) => (
            <DraggableFile
              key={file.id}
              file={{
                id: file.id,
                name: file.file_name,
                file_type: file.file_type,
                file_size: file.file_size,
                uploading: file.upload_status === 'uploading',
              }}
              isSelected={selectedFileId === file.id}
              onClick={() => file.file_type === 'midi' && onFileSelected(file.id)}
              onDelete={() => setDeleteFileId(file.id)}
            />
          ))}
          {/* Demo data - only show when useDemoData is true */}
          {useDemoData && (
            <div className="flex items-center border border-stone-700 bg-stone-900 text-stone-100 font-mono text-xs h-8 px-2 gap-2 select-none" style={{ borderRadius: 2, minHeight: 32, maxHeight: 32 }}>
              <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">🎹</div>
              <div className="truncate flex-1 font-bold" title="Creative Demo.mid" style={{ maxWidth: 120 }}>Creative Demo.mid</div>
              <div className="uppercase tracking-widest px-1 border border-stone-700 bg-transparent" style={{ borderRadius: 1 }}>midi</div>
              <div className="text-[10px] text-stone-400 font-mono px-1">1 KB</div>
            </div>
          )}
        </div>
      </div>
      {/* Upload Zone */}
      {!useDemoData && (
        <div className="border-t border-stone-700 p-2 bg-stone-900">
          <div 
            className="w-full border-2 border-dashed border-stone-700 rounded-none text-center cursor-pointer hover:bg-stone-800 hover:text-stone-100 transition-colors py-2"
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <div className="text-lg">⬆️</div>
            <div className="font-bold">Upload Files</div>
            <div className="text-[10px]">MIDI, audio, video, or images</div>
            <input
              id="file-upload-input"
              type="file"
              multiple
              accept=".mid,.midi,.mp3,.wav,.ogg,.m4a,.aac,.mp4,.mov,.avi,.mkv,.webm,.jpg,.jpeg,.png,.gif,.bmp,.webp"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  handleFileUpload(files);
                }
              }}
            />
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={!!deleteFileId}
        onClose={() => setDeleteFileId(null)}
        onConfirm={() => deleteFileId && handleDeleteFile(deleteFileId)}
        title="Delete File?"
        description="Are you sure you want to delete this file? This action cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        confirmVariant="danger"
      />
    </div>
  );
}
```

## File: apps/web/src/components/midi/midi-controls.tsx
```typescript
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, SkipBack, SkipForward, Settings, ZoomIn, ZoomOut } from 'lucide-react';

interface VisualizationSettings {
  colorScheme: 'sage' | 'slate' | 'dusty-rose' | 'mixed';
  pixelsPerSecond: number;
  showTrackLabels: boolean;
  showVelocity: boolean;
  minKey: number;
  maxKey: number;
}

interface MidiControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
  settings: VisualizationSettings;
  onPlayPause: () => void;
  onTimeChange: (time: number) => void;
  onZoomChange: (zoom: number) => void;
  onSettingsChange: (settings: VisualizationSettings) => void;
}

export function MidiControls({
  isPlaying,
  currentTime,
  duration,
  zoom,
  settings,
  onPlayPause,
  onTimeChange,
  onZoomChange,
  onSettingsChange
}: MidiControlsProps) {
  const [showSettings, setShowSettings] = useState(false);

  const handleStop = () => {
    onTimeChange(0);
  };

  const handleSkipBack = () => {
    onTimeChange(Math.max(0, currentTime - 10));
  };

  const handleSkipForward = () => {
    onTimeChange(Math.min(duration, currentTime + 10));
  };

  const handleZoomIn = () => {
    onZoomChange(zoom * 1.2);
  };

  const handleZoomOut = () => {
    onZoomChange(zoom / 1.2);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="midi-controls flex items-center justify-between p-4 h-full">
      {/* Transport Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipBack}
          className="h-8 w-8 p-0"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlayPause}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
          className="h-8 w-8 p-0"
        >
          <Square className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipForward}
          className="h-8 w-8 p-0"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* Time Display */}
        <div className="ml-4 font-mono text-sm text-gray-600">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <Badge variant="secondary" className="font-mono text-xs min-w-[60px] text-center">
          {(zoom * 100).toFixed(0)}%
        </Badge>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="h-8 w-8 p-0 ml-2"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-full right-0 mt-2 w-80 p-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg z-50">
          <h4 className="font-semibold text-gray-900 mb-3">Visualization Settings</h4>
          
          {/* Color Scheme */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Scheme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['sage', 'slate', 'dusty-rose', 'mixed'] as const).map((scheme) => (
                <button
                  key={scheme}
                  onClick={() => onSettingsChange({ ...settings, colorScheme: scheme })}
                  className={`p-2 text-sm rounded border text-left capitalize ${
                    settings.colorScheme === scheme
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {scheme}
                </button>
              ))}
            </div>
          </div>

          {/* Pixels Per Second */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Scale: {settings.pixelsPerSecond}px/s
            </label>
            <input
              type="range"
              min={10}
              max={200}
              value={settings.pixelsPerSecond}
              onChange={(e) => onSettingsChange({ 
                ...settings, 
                pixelsPerSecond: parseInt(e.target.value) 
              })}
              className="w-full"
            />
          </div>

          {/* Toggle Options */}
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showTrackLabels}
                onChange={(e) => onSettingsChange({ 
                  ...settings, 
                  showTrackLabels: e.target.checked 
                })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Show Track Labels</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showVelocity}
                onChange={(e) => onSettingsChange({ 
                  ...settings, 
                  showVelocity: e.target.checked 
                })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Show Velocity</span>
            </label>
          </div>

          {/* Key Range */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Key Range: {settings.minKey} - {settings.maxKey}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Key</label>
                <input
                  type="number"
                  min={0}
                  max={127}
                  value={settings.minKey}
                  onChange={(e) => onSettingsChange({ 
                    ...settings, 
                    minKey: Math.min(parseInt(e.target.value), settings.maxKey)
                  })}
                  className="w-full p-1 text-sm border border-gray-200 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Key</label>
                <input
                  type="number"
                  min={0}
                  max={127}
                  value={settings.maxKey}
                  onChange={(e) => onSettingsChange({ 
                    ...settings, 
                    maxKey: Math.max(parseInt(e.target.value), settings.minKey)
                  })}
                  className="w-full p-1 text-sm border border-gray-200 rounded"
                />
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
```

## File: apps/web/src/components/midi/midi-timeline.tsx
```typescript
'use client';

import React, { useRef, useCallback } from 'react';

interface TempoChange {
  tick: number;
  bpm: number;
  microsecondsPerQuarter: number;
}

interface MidiTimelineProps {
  duration: number;
  currentTime: number;
  pixelsPerSecond: number;
  zoom: number;
  tempoChanges: TempoChange[];
  onTimeChange: (time: number) => void;
}

export function MidiTimeline({
  duration,
  currentTime,
  pixelsPerSecond,
  zoom,
  tempoChanges,
  onTimeChange
}: MidiTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  const width = Math.max(1200, duration * pixelsPerSecond * zoom);

  // Convert time to X position
  const timeToX = useCallback((time: number) => {
    return time * pixelsPerSecond * zoom;
  }, [pixelsPerSecond, zoom]);

  // Convert X position to time
  const xToTime = useCallback((x: number) => {
    return x / (pixelsPerSecond * zoom);
  }, [pixelsPerSecond, zoom]);

  // Handle timeline click
  const handleTimelineClick = useCallback((event: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = xToTime(x);
    
    onTimeChange(Math.max(0, Math.min(duration, time)));
  }, [xToTime, onTimeChange, duration]);

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);

  // Generate time markers
  const generateTimeMarkers = useCallback(() => {
    const markers = [];
    const interval = zoom > 2 ? 1 : zoom > 1 ? 5 : 10; // Adjust interval based on zoom
    
    for (let time = 0; time <= duration; time += interval) {
      const x = timeToX(time);
      const isMinute = time % 60 === 0;
      
      markers.push({
        time,
        x,
        label: formatTime(time),
        isMajor: isMinute || interval <= 1
      });
    }
    
    return markers;
  }, [duration, zoom, timeToX, formatTime]);

  const timeMarkers = generateTimeMarkers();

  return (
    <div 
      ref={timelineRef}
      className="midi-timeline relative w-full h-full bg-white/80 backdrop-blur-sm overflow-hidden cursor-pointer"
      style={{ width: `${width}px` }}
      onClick={handleTimelineClick}
    >
      {/* Time markers */}
      <div className="absolute inset-0">
        {timeMarkers.map((marker, index) => (
          <div
            key={index}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${marker.x}px` }}
          >
            {/* Tick mark */}
            <div
              className={`bg-gray-400 ${
                marker.isMajor ? 'w-0.5 h-4' : 'w-px h-2'
              }`}
            />
            
            {/* Time label */}
            {marker.isMajor && (
              <span className="text-xs text-gray-600 font-mono mt-1 select-none">
                {marker.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Tempo changes */}
      <div className="absolute top-0 w-full h-full">
        {tempoChanges.map((tempoChange, index) => {
          // Convert tick to time (simplified - would need actual conversion)
          const time = (tempoChange.tick / 480) * (60 / 120); // Assuming 480 PPQ and 120 BPM base
          const x = timeToX(time);
          
          return (
            <div
              key={index}
              className="absolute top-0 flex flex-col items-center group"
              style={{ left: `${x}px` }}
            >
              {/* Tempo marker */}
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-1" />
              
              {/* Tempo tooltip */}
              <div className="absolute top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {tempoChange.bpm} BPM
              </div>
            </div>
          );
        })}
      </div>

      {/* Current time indicator */}
      <div
        className="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events-none"
        style={{ left: `${timeToX(currentTime)}px` }}
      >
        {/* Playhead triangle */}
        <div className="absolute -top-1 -left-1 w-0 h-0 border-l-2 border-r-2 border-b-3 border-transparent border-b-red-500" />
        
        {/* Current time label */}
        <div className="absolute top-5 -left-8 bg-red-500 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Background grid lines */}
      <div className="absolute inset-0 pointer-events-none">
        {timeMarkers
          .filter(marker => marker.isMajor)
          .map((marker, index) => (
            <div
              key={index}
              className="absolute top-0 w-px h-full bg-gray-200"
              style={{ left: `${marker.x}px` }}
            />
          ))}
      </div>

      {/* Hover time indicator */}
      <div className="absolute inset-0 group">
        <div className="absolute top-0 w-px h-full bg-blue-400 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none" />
      </div>
    </div>
  );
}
```

## File: apps/web/src/lib/visualizer/core/AudioTextureManager.ts
```typescript
import * as THREE from 'three';

export interface AudioFeatureData {
  features: Record<string, number[]>;
  duration: number;
  sampleRate: number;
  stemTypes: string[];
}

export interface AudioFeatureMapping {
  featureIndex: number;
  stemType: string;
  featureName: string;
  minValue: number;
  maxValue: number;
}

export class AudioTextureManager {
  private audioTexture: THREE.DataTexture;
  private featureTexture: THREE.DataTexture;
  private timeTexture: THREE.DataTexture;
  
  // Texture layout: X = time, Y = feature index, RGBA = feature values
  private audioData: Float32Array;
  private featureData: Float32Array;
  private timeData: Float32Array;
  
  // Configuration
  private readonly textureWidth = 256;  // Time samples
  private readonly textureHeight = 64;  // Feature rows (16 features per row)
  private readonly maxFeatures = 256;   // 64 rows × 4 channels
  
  // Feature mapping
  private featureMappings: AudioFeatureMapping[] = [];
  private featureIndexMap: Map<string, number> = new Map();
  
  constructor() {
    // Initialize audio data array (256×64×4 = 65,536 values)
    this.audioData = new Float32Array(this.textureWidth * this.textureHeight * 4);
    
    // Initialize feature metadata (64×4 = 256 values)
    this.featureData = new Float32Array(this.textureHeight * 4);
    
    // Initialize time synchronization (4 values: currentTime, duration, normalizedTime, padding)
    this.timeData = new Float32Array(4);
    
    // Create GPU textures
    this.audioTexture = new THREE.DataTexture(
      this.audioData,
      this.textureWidth,
      this.textureHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.audioTexture.needsUpdate = true;
    this.audioTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.audioTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.audioTexture.magFilter = THREE.LinearFilter;
    this.audioTexture.minFilter = THREE.LinearFilter;
    
    this.featureTexture = new THREE.DataTexture(
      this.featureData,
      4,
      this.textureHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.featureTexture.needsUpdate = true;
    this.featureTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.featureTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.featureTexture.magFilter = THREE.NearestFilter;
    this.featureTexture.minFilter = THREE.NearestFilter;
    
    this.timeTexture = new THREE.DataTexture(
      this.timeData,
      1,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.timeTexture.needsUpdate = true;
    this.timeTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.timeTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.timeTexture.magFilter = THREE.NearestFilter;
    this.timeTexture.minFilter = THREE.NearestFilter;
  }
  
  /**
   * Load cached audio analysis into GPU textures
   */
  public loadAudioAnalysis(analysisData: AudioFeatureData): void {
    this.buildFeatureMapping(analysisData);
    this.packFeaturesIntoTexture(analysisData);
  }
  
  /**
   * Build feature mapping from analysis data
   */
  private buildFeatureMapping(analysisData: AudioFeatureData): void {
    this.featureMappings = [];
    this.featureIndexMap.clear();
    
    let featureIndex = 0;
    
    // Map features by stem type and feature name
    for (const stemType of analysisData.stemTypes) {
      const stemFeatures = analysisData.features[stemType];
      if (!stemFeatures) continue;
      
      // Common audio features
      const featureNames = ['rms', 'spectralCentroid', 'spectralRolloff', 'zcr'];
      
      for (const featureName of featureNames) {
        if (featureIndex >= this.maxFeatures) break;
        
        const mapping: AudioFeatureMapping = {
          featureIndex,
          stemType,
          featureName,
          minValue: 0,
          maxValue: 1
        };
        
        this.featureMappings.push(mapping);
        this.featureIndexMap.set(`${stemType}-${featureName}`, featureIndex);
        featureIndex++;
      }
    }
    
    // Pack feature metadata into texture
    this.packFeatureMetadata();
  }
  
  /**
   * Pack feature metadata into feature texture
   */
  private packFeatureMetadata(): void {
    for (let i = 0; i < this.featureMappings.length; i++) {
      const mapping = this.featureMappings[i];
      const row = Math.floor(i / 4);
      const col = i % 4;
      const index = row * 4 + col;
      
      // Store feature index, stem type hash, feature name hash, and value range
      this.featureData[index * 4 + 0] = mapping.featureIndex;
      this.featureData[index * 4 + 1] = this.hashString(mapping.stemType);
      this.featureData[index * 4 + 2] = this.hashString(mapping.featureName);
      this.featureData[index * 4 + 3] = mapping.maxValue - mapping.minValue;
    }
    
    this.featureTexture.needsUpdate = true;
  }
  
  /**
   * Pack audio features into main texture
   */
  private packFeaturesIntoTexture(analysisData: AudioFeatureData): void {
    // Clear texture data
    this.audioData.fill(0);
    
    // Pack features by time and feature index
    for (const mapping of this.featureMappings) {
      const stemFeatures = analysisData.features[mapping.stemType];
      if (!stemFeatures) continue;
      
      const featureData = this.extractFeatureData(stemFeatures, mapping.featureName);
      if (!featureData) continue;
      
      // Pack into texture: X = time, Y = feature row, RGBA = feature values
      const row = Math.floor(mapping.featureIndex / 4);
      const channel = mapping.featureIndex % 4;
      
      for (let timeIndex = 0; timeIndex < Math.min(this.textureWidth, featureData.length); timeIndex++) {
        const textureIndex = (timeIndex + row * this.textureWidth) * 4 + channel;
        const normalizedValue = this.normalizeValue(featureData[timeIndex], mapping.minValue, mapping.maxValue);
        this.audioData[textureIndex] = normalizedValue;
      }
    }
    
    this.audioTexture.needsUpdate = true;
  }
  
  /**
   * Extract specific feature data from stem features
   */
  private extractFeatureData(stemFeatures: number[], featureName: string): number[] | null {
    // This is a simplified extraction - in practice, you'd parse the actual feature data structure
    // For now, we'll use the stem features directly as if they're the requested feature
    return stemFeatures;
  }
  
  /**
   * Update time synchronization (called once per frame)
   */
  public updateTime(currentTime: number, duration: number): void {
    this.timeData[0] = currentTime;
    this.timeData[1] = duration;
    this.timeData[2] = currentTime / duration; // Normalized progress
    this.timeData[3] = 0; // Padding
    
    this.timeTexture.needsUpdate = true;
  }
  
  /**
   * Get shader uniforms for audio texture access
   */
  public getShaderUniforms(): Record<string, THREE.Uniform> {
    return {
      uAudioTexture: new THREE.Uniform(this.audioTexture),
      uFeatureTexture: new THREE.Uniform(this.featureTexture),
      uTimeTexture: new THREE.Uniform(this.timeTexture),
      uAudioTextureSize: new THREE.Uniform(new THREE.Vector2(this.textureWidth, this.textureHeight)),
      uFeatureTextureSize: new THREE.Uniform(new THREE.Vector2(4, this.textureHeight))
    };
  }
  
  /**
   * Generate shader code for audio feature access
   */
  public generateShaderCode(): string {
    return `
      uniform sampler2D uAudioTexture;
      uniform sampler2D uFeatureTexture;
      uniform sampler2D uTimeTexture;
      uniform vec2 uAudioTextureSize;
      uniform vec2 uFeatureTextureSize;
      
      float sampleAudioFeature(float featureIndex) {
        vec4 timeData = texture2D(uTimeTexture, vec2(0.5));
        float normalizedTime = timeData.z;
        
        float rowIndex = floor(featureIndex / 4.0);
        vec2 uv = vec2(normalizedTime, rowIndex / uAudioTextureSize.y);
        vec4 featureData = texture2D(uAudioTexture, uv);
        
        // Extract correct channel based on feature index
        float channelIndex = mod(featureIndex, 4.0);
        if (channelIndex < 0.5) return featureData.r;
        else if (channelIndex < 1.5) return featureData.g;
        else if (channelIndex < 2.5) return featureData.b;
        else return featureData.a;
      }
      
      float sampleAudioFeatureByName(float stemTypeHash, float featureNameHash) {
        // Find feature index by name (simplified - in practice you'd use a lookup table)
        for (float i = 0.0; i < uFeatureTextureSize.y; i++) {
          vec2 featureUv = vec2(0.5, (i + 0.5) / uFeatureTextureSize.y);
          vec4 featureInfo = texture2D(uFeatureTexture, featureUv);
          
          if (featureInfo.y == stemTypeHash && featureInfo.z == featureNameHash) {
            return sampleAudioFeature(featureInfo.x);
          }
        }
        return 0.0;
      }
    `;
  }
  
  /**
   * Get feature value by name (for debugging/testing)
   */
  public getFeatureValue(stemType: string, featureName: string): number {
    const key = `${stemType}-${featureName}`;
    const featureIndex = this.featureIndexMap.get(key);
    if (featureIndex === undefined) return 0;
    
    const row = Math.floor(featureIndex / 4);
    const channel = featureIndex % 4;
    const timeIndex = Math.floor(this.timeData[2] * this.textureWidth);
    const textureIndex = (timeIndex + row * this.textureWidth) * 4 + channel;
    
    return this.audioData[textureIndex] || 0;
  }
  
  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }
  
  /**
   * Normalize value to 0-1 range
   */
  private normalizeValue(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }
  
  /**
   * Dispose of textures
   */
  public dispose(): void {
    this.audioTexture.dispose();
    this.featureTexture.dispose();
    this.timeTexture.dispose();
  }
}
```

## File: apps/web/src/lib/visualizer/core/MediaLayerManager.ts
```typescript
import * as THREE from 'three';

export interface MediaLayerConfig {
  id: string;
  type: 'canvas' | 'video' | 'image';
  source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | string;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add' | 'subtract';
  opacity: number;
  zIndex: number;
  
  // Audio-reactive bindings
  audioBindings?: {
    feature: string;                    // 'drums-rms', 'bass-spectralCentroid'
    property: 'opacity' | 'scale' | 'rotation' | 'position';
    inputRange: [number, number];       // Audio feature range
    outputRange: [number, number];      // Visual property range
    blendMode: 'multiply' | 'add' | 'replace';
  }[];
  
  // Transform properties
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
}

export interface AudioFeatures {
  [key: string]: number;
}

export class MediaLayerManager {
  private mediaLayers: Map<string, MediaLayerConfig> = new Map();
  private layerMaterials: Map<string, THREE.ShaderMaterial> = new Map();
  private layerTextures: Map<string, THREE.Texture> = new Map();
  private layerMeshes: Map<string, THREE.Mesh> = new Map();
  
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera as THREE.OrthographicCamera;
    this.renderer = renderer;
  }
  
  /**
   * Add a media layer
   */
  public addMediaLayer(config: MediaLayerConfig): void {
    this.mediaLayers.set(config.id, config);
    
    // Create texture from media source
    const texture = this.createTextureFromSource(config.source, config.type);
    this.layerTextures.set(config.id, texture);
    
    // Create material with audio-reactive uniforms
    const material = this.createMaterial(config, texture);
    this.layerMaterials.set(config.id, material);
    
    // Create mesh
    const mesh = this.createMesh(config, material);
    this.layerMeshes.set(config.id, mesh);
    
    // Add to scene
    this.scene.add(mesh);
  }
  
  /**
   * Remove a media layer
   */
  public removeMediaLayer(id: string): void {
    const mesh = this.layerMeshes.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      this.layerMeshes.delete(id);
    }
    
    const material = this.layerMaterials.get(id);
    if (material) {
      material.dispose();
      this.layerMaterials.delete(id);
    }
    
    const texture = this.layerTextures.get(id);
    if (texture) {
      texture.dispose();
      this.layerTextures.delete(id);
    }
    
    this.mediaLayers.delete(id);
  }
  
  /**
   * Update media layer with audio features
   * @deprecated Legacy method - effects now receive modulated parameters through the mapping system
   */
  public updateWithAudioFeatures(audioFeatures: AudioFeatures): void {
    for (const [id, config] of this.mediaLayers) {
      if (!config.audioBindings) continue;
      
      const material = this.layerMaterials.get(id);
      if (!material) continue;
      
      for (const binding of config.audioBindings) {
        const featureValue = audioFeatures[binding.feature];
        if (featureValue === undefined) continue;
        
        const mappedValue = this.mapRange(
          featureValue,
          binding.inputRange[0], binding.inputRange[1],
          binding.outputRange[0], binding.outputRange[1]
        );
        
        // Apply to shader uniforms
        switch (binding.property) {
          case 'opacity':
            material.uniforms.uOpacity.value = mappedValue;
            break;
          case 'scale':
            material.uniforms.uScale.value.set(mappedValue, mappedValue);
            break;
          case 'rotation':
            material.uniforms.uRotation.value = mappedValue;
            break;
          case 'position':
            material.uniforms.uPosition.value.set(
              config.position.x + mappedValue,
              config.position.y + mappedValue
            );
            break;
        }
      }
    }
  }
  
  /**
   * Update textures (for video elements)
   */
  public updateTextures(): void {
    for (const [id, texture] of this.layerTextures) {
      if (texture instanceof THREE.VideoTexture) {
        texture.needsUpdate = true;
      }
    }
  }
  
  /**
   * Create texture from media source
   */
  private createTextureFromSource(
    source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | string,
    type: string
  ): THREE.Texture {
    switch (type) {
      case 'video':
        if (typeof source === 'string') {
          const video = document.createElement('video');
          video.src = source;
          video.loop = true;
          video.muted = true;
          video.play();
          return new THREE.VideoTexture(video);
        } else if (source instanceof HTMLVideoElement) {
          return new THREE.VideoTexture(source);
        }
        break;
        
      case 'image':
        if (typeof source === 'string') {
          return new THREE.TextureLoader().load(source);
        } else if (source instanceof HTMLImageElement) {
          return new THREE.Texture(source);
        }
        break;
        
      case 'canvas':
        if (source instanceof HTMLCanvasElement) {
          return new THREE.CanvasTexture(source);
        }
        break;
    }
    
    // Fallback to a default texture
    return new THREE.Texture();
  }
  
  /**
   * Create material with audio-reactive uniforms
   */
  private createMaterial(config: MediaLayerConfig, texture: THREE.Texture): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: `
        uniform vec2 uPosition;
        uniform vec2 uScale;
        uniform float uRotation;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          
          vec3 pos = position;
          
          // Apply scale
          pos.xy *= uScale;
          
          // Apply rotation
          float c = cos(uRotation);
          float s = sin(uRotation);
          mat2 rotationMatrix = mat2(c, -s, s, c);
          pos.xy = rotationMatrix * pos.xy;
          
          // Apply position
          pos.xy += uPosition;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uOpacity;
        varying vec2 vUv;
        
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          gl_FragColor = vec4(texel.rgb, texel.a * uOpacity);
        }
      `,
      uniforms: {
        tDiffuse: new THREE.Uniform(texture),
        uOpacity: new THREE.Uniform(config.opacity),
        uPosition: new THREE.Uniform(new THREE.Vector2(config.position.x, config.position.y)),
        uScale: new THREE.Uniform(new THREE.Vector2(config.scale.x, config.scale.y)),
        uRotation: new THREE.Uniform(config.rotation)
      },
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
  }
  
  /**
   * Create mesh for media layer
   */
  private createMesh(config: MediaLayerConfig, material: THREE.ShaderMaterial): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set initial transform
    mesh.position.set(config.position.x, config.position.y, -config.zIndex);
    mesh.scale.set(config.scale.x, config.scale.y, 1);
    mesh.rotation.z = config.rotation;
    
    return mesh;
  }
  
  /**
   * Map value from one range to another
   */
  private mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }
  
  /**
   * Get media layer by ID
   */
  public getMediaLayer(id: string): MediaLayerConfig | undefined {
    return this.mediaLayers.get(id);
  }
  
  /**
   * Get all media layer IDs
   */
  public getMediaLayerIds(): string[] {
    return [...this.mediaLayers.keys()];
  }
  
  /**
   * Update layer configuration
   */
  public updateLayerConfig(id: string, updates: Partial<MediaLayerConfig>): void {
    const config = this.mediaLayers.get(id);
    if (!config) return;
    
    Object.assign(config, updates);
    
    // Update material uniforms
    const material = this.layerMaterials.get(id);
    if (material) {
      if (updates.opacity !== undefined) {
        material.uniforms.uOpacity.value = updates.opacity;
      }
      if (updates.position !== undefined) {
        material.uniforms.uPosition.value.set(updates.position.x, updates.position.y);
      }
      if (updates.scale !== undefined) {
        material.uniforms.uScale.value.set(updates.scale.x, updates.scale.y);
      }
      if (updates.rotation !== undefined) {
        material.uniforms.uRotation.value = updates.rotation;
      }
    }
    
    // Update mesh transform
    const mesh = this.layerMeshes.get(id);
    if (mesh) {
      if (updates.position !== undefined) {
        mesh.position.set(updates.position.x, updates.position.y, -config.zIndex);
      }
      if (updates.scale !== undefined) {
        mesh.scale.set(updates.scale.x, updates.scale.y, 1);
      }
      if (updates.rotation !== undefined) {
        mesh.rotation.z = updates.rotation;
      }
      if (updates.zIndex !== undefined) {
        mesh.position.z = -updates.zIndex;
      }
    }
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    for (const [id] of this.mediaLayers) {
      this.removeMediaLayer(id);
    }
    
    this.mediaLayers.clear();
    this.layerMaterials.clear();
    this.layerTextures.clear();
    this.layerMeshes.clear();
  }
}
```

## File: apps/web/src/lib/visualizer/effects/CircleEffect.ts
```typescript
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface CircleConfig {
    radius: number; // 0.0 to 1.0
    feather: number; // 0.0 to 1.0
    centerX: number; // 0.0 to 1.0
    centerY: number; // 0.0 to 1.0
    color: string; // Hex color
    opacity: number; // 0.0 to 1.0
}

export class CircleEffect extends BaseShaderEffect {
    id = 'circle';
    name = 'Circle';
    description = 'Circular mask overlay';
    parameters: CircleConfig;

    constructor(config: Partial<CircleConfig> = {}) {
        super();
        this.parameters = {
            radius: 0.25,
            feather: 0.1,
            centerX: 0.5,
            centerY: 0.5,
            color: '#661aff',
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uRadius: { value: this.parameters.radius },
            uFeather: { value: this.parameters.feather },
            uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) },
            uColor: { value: new THREE.Color(this.parameters.color) },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uRadius;
      uniform float uFeather;
      uniform vec2 uCenter;
      uniform vec3 uColor;
      uniform float uOpacity;
      
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
        
        vec2 center = uCenter;
        vec2 pos = uv * aspectRatio;
        vec2 centerPos = center * aspectRatio;
        
        float dist = distance(pos, centerPos);
        
        float edge = uRadius;
        float feather = uFeather * 0.5;
        
        float mask = 1.0 - smoothstep(edge - feather, edge + feather, dist);
        
        vec3 finalColor = mix(bg.rgb, uColor, mask * uOpacity);
        
        gl_FragColor = vec4(finalColor, bg.a);
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uRadius.value = this.parameters.radius;
        this.uniforms.uFeather.value = this.parameters.feather;
        this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
        this.uniforms.uColor.value.set(this.parameters.color);
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'radius':
                this.parameters.radius = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.radius;
                if (this.uniforms) this.uniforms.uRadius.value = this.parameters.radius;
                break;
            case 'feather':
                this.parameters.feather = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.feather;
                if (this.uniforms) this.uniforms.uFeather.value = this.parameters.feather;
                break;
            case 'centerX':
                this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
                if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
                break;
            case 'centerY':
                this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
                if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
                break;
            case 'color':
                this.parameters.color = value;
                if (this.uniforms) this.uniforms.uColor.value.set(this.parameters.color);
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
```

## File: apps/web/src/lib/visualizer/effects/SwirlEffect.ts
```typescript
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface SwirlConfig {
  intensity: number; // 0.0 to 2.0
  centerX: number; // 0.0 to 1.0
  centerY: number; // 0.0 to 1.0
  radius: number; // 0.1 to 1.0
}

export class SwirlEffect extends BaseShaderEffect {
  id = 'swirl';
  name = 'Swirl';
  description = 'Swirl/twist distortion effect';
  parameters: SwirlConfig;

  constructor(config: Partial<SwirlConfig> = {}) {
    super();
    this.parameters = { intensity: 0.8, centerX: 0.5, centerY: 0.5, radius: 0.4, ...config };
  }

  protected getCustomUniforms(): Record<string, THREE.IUniform> {
    return {
      uIntensity: { value: this.parameters.intensity },
      uCenter: { value: new THREE.Vector2(this.parameters.centerX, this.parameters.centerY) },
      uRadius: { value: this.parameters.radius }
    };
  }

  protected getFragmentShader(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform vec2 uCenter;
      uniform float uRadius;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        vec2 tc = uv - uCenter;
        tc.x *= aspectRatio;
        
        float dist = length(tc);
        if (dist < uRadius) {
          float percent = (uRadius - dist) / uRadius;
          float theta = percent * percent * uIntensity * 8.0;
          float s = sin(theta);
          float c = cos(theta);
          tc = vec2(dot(tc, vec2(c, -s)), dot(tc, vec2(s, c)));
        }
        
        tc.x /= aspectRatio;
        gl_FragColor = texture2D(uTexture, tc + uCenter);
      }
    `;
  }

  protected syncParametersToUniforms(): void {
    if (!this.uniforms) return;
    this.uniforms.uIntensity.value = this.parameters.intensity;
    this.uniforms.uCenter.value.set(this.parameters.centerX, this.parameters.centerY);
    this.uniforms.uRadius.value = this.parameters.radius;
  }

  updateParameter(paramName: string, value: any): void {
    if (paramName === 'intensity') {
      this.parameters.intensity = typeof value === 'number' ? Math.max(0.0, Math.min(2.0, value)) : this.parameters.intensity;
      if (this.uniforms) this.uniforms.uIntensity.value = this.parameters.intensity;
    } else if (paramName === 'centerX') {
      this.parameters.centerX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerX;
      if (this.uniforms) this.uniforms.uCenter.value.x = this.parameters.centerX;
    } else if (paramName === 'centerY') {
      this.parameters.centerY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.centerY;
      if (this.uniforms) this.uniforms.uCenter.value.y = this.parameters.centerY;
    } else if (paramName === 'radius') {
      this.parameters.radius = typeof value === 'number' ? Math.max(0.1, Math.min(1.0, value)) : this.parameters.radius;
      if (this.uniforms) this.uniforms.uRadius.value = this.parameters.radius;
    }
  }
}
```

## File: apps/web/src/lib/visualizer/effects/VideoEffect.ts
```typescript
import * as THREE from 'three';
import { BaseShaderEffect } from './BaseShaderEffect';

export interface VideoConfig {
    scale: number; // 0.1 to 2.0
    rotation: number; // 0.0 to 360.0
    posX: number; // 0.0 to 1.0
    posY: number; // 0.0 to 1.0
    opacity: number; // 0.0 to 1.0
}

export class VideoEffect extends BaseShaderEffect {
    id = 'video';
    name = 'Video Overlay';
    description = 'Video texture overlay (requires video source)';
    parameters: VideoConfig;

    constructor(config: Partial<VideoConfig> = {}) {
        super();
        this.parameters = {
            scale: 1.0,
            rotation: 0.0,
            posX: 0.5,
            posY: 0.5,
            opacity: 1.0,
            ...config
        };
    }

    protected getCustomUniforms(): Record<string, THREE.IUniform> {
        return {
            uVideoTexture: { value: null }, // Needs to be bound externally
            uScale: { value: this.parameters.scale },
            uRotation: { value: (this.parameters.rotation * Math.PI) / 180.0 },
            uPosition: { value: new THREE.Vector2(this.parameters.posX, this.parameters.posY) },
            uOpacity: { value: this.parameters.opacity }
        };
    }

    protected getFragmentShader(): string {
        return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform sampler2D uVideoTexture;
      uniform vec2 uResolution;
      uniform float uScale;
      uniform float uRotation;
      uniform vec2 uPosition;
      uniform float uOpacity;
      
      varying vec2 vUv;
      
      const float PI = 3.14159265359;

      mat2 rot(float a) {
        return mat2(cos(a), -sin(a), sin(a), cos(a));
      }

      void main() {
        vec2 uv = vUv;
        vec4 bg = texture2D(uTexture, uv);
        
        float screenAspect = uResolution.x / uResolution.y;
        
        // Assume video aspect is 16:9 for now as we can't easily get it in shader without uniform
        float videoAspect = 16.0 / 9.0; 
        
        vec2 centeredUV = uv - uPosition;
        centeredUV.x *= screenAspect;
        
        centeredUV /= uScale;
        centeredUV *= rot(uRotation);
        
        centeredUV.x /= videoAspect;
        centeredUV += 0.5;
        
        if(centeredUV.x < 0.0 || centeredUV.x > 1.0 || centeredUV.y < 0.0 || centeredUV.y > 1.0) {
            gl_FragColor = bg;
            return;
        }
        
        vec4 videoColor = texture2D(uVideoTexture, centeredUV);
        
        vec3 finalColor = mix(bg.rgb, videoColor.rgb, uOpacity * videoColor.a);
        
        gl_FragColor = vec4(finalColor, max(bg.a, uOpacity * videoColor.a));
      }
    `;
    }

    protected syncParametersToUniforms(): void {
        if (!this.uniforms) return;
        this.uniforms.uScale.value = this.parameters.scale;
        this.uniforms.uRotation.value = (this.parameters.rotation * Math.PI) / 180.0;
        this.uniforms.uPosition.value.set(this.parameters.posX, this.parameters.posY);
        this.uniforms.uOpacity.value = this.parameters.opacity;
    }

    updateParameter(paramName: string, value: any): void {
        switch (paramName) {
            case 'scale':
                this.parameters.scale = typeof value === 'number' ? Math.max(0.1, Math.min(2.0, value)) : this.parameters.scale;
                if (this.uniforms) this.uniforms.uScale.value = this.parameters.scale;
                break;
            case 'rotation':
                this.parameters.rotation = typeof value === 'number' ? Math.max(0.0, Math.min(360.0, value)) : this.parameters.rotation;
                if (this.uniforms) this.uniforms.uRotation.value = (this.parameters.rotation * Math.PI) / 180.0;
                break;
            case 'posX':
                this.parameters.posX = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.posX;
                if (this.uniforms) this.uniforms.uPosition.value.x = this.parameters.posX;
                break;
            case 'posY':
                this.parameters.posY = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.posY;
                if (this.uniforms) this.uniforms.uPosition.value.y = this.parameters.posY;
                break;
            case 'opacity':
                this.parameters.opacity = typeof value === 'number' ? Math.max(0.0, Math.min(1.0, value)) : this.parameters.opacity;
                if (this.uniforms) this.uniforms.uOpacity.value = this.parameters.opacity;
                break;
        }
    }
}
```

## File: apps/web/src/remotion/index.ts
```typescript
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
```

## File: apps/web/src/lib/visualizer/core/MultiLayerCompositor.ts
```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { TexturePass } from 'three/examples/jsm/postprocessing/TexturePass.js';

export interface LayerRenderTarget {
  id: string;
  renderTarget: THREE.WebGLRenderTarget;
  scene: THREE.Scene;
  camera: THREE.Camera;
  enabled: boolean;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add' | 'subtract';
  opacity: number;
  zIndex: number;
  material?: THREE.ShaderMaterial;
}

export interface CompositorConfig {
  width: number;
  height: number;
  enableAntialiasing?: boolean;
  pixelRatio?: number;
}

export class MultiLayerCompositor {
  private renderer: THREE.WebGLRenderer;
  private config: CompositorConfig;
  
  // Layer management
  private layers: Map<string, LayerRenderTarget> = new Map();
  private layerOrder: string[] = [];
  
  // Render targets
  private mainRenderTarget: THREE.WebGLRenderTarget;
  private tempRenderTarget: THREE.WebGLRenderTarget;
  
  // Shared geometry for full-screen rendering
  private quadGeometry: THREE.PlaneGeometry;
  private quadCamera: THREE.OrthographicCamera;
  
  // Blend mode shaders
  private blendShaders: Map<string, string> = new Map();

  // Post-processing
  private postProcessingComposer!: EffectComposer;
  private texturePass!: TexturePass;
  private fxaaPass?: ShaderPass;
  
  constructor(renderer: THREE.WebGLRenderer, config: CompositorConfig) {
    this.renderer = renderer;
    this.config = {
      enableAntialiasing: true,
      pixelRatio: window.devicePixelRatio || 1,
      ...config
    };
    
    // Ensure transparent clearing for all off-screen targets
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);

    // Create render targets
    // FIX: Use WebGLRenderTarget with samples: 4 for proper MSAA antialiasing
    const RTClass: any = THREE.WebGLRenderTarget;

    this.mainRenderTarget = new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
        samples: 4 // FIX: Enable 4x MSAA
      }
    );
    
    this.tempRenderTarget = new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
        samples: 4 // FIX: Enable 4x MSAA
      }
    );
    
    // Create shared geometry and camera
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Initialize blend mode shaders
    this.initializeBlendShaders();

    // Initialize post-processing (bloom, etc.)
    this.initializePostProcessing();
  }
  
  /**
   * Create a new layer
   */
  public createLayer(
    id: string,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: Partial<Omit<LayerRenderTarget, 'id' | 'scene' | 'camera'>> = {}
  ): LayerRenderTarget {
    // FIX: Use WebGLRenderTarget with samples: 4 for proper MSAA antialiasing
    const RTClass: any = THREE.WebGLRenderTarget;

    const renderTarget = new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
        samples: 4 // FIX: Enable 4x MSAA for each layer
      }
    );
    
    const layer: LayerRenderTarget = {
      id,
      renderTarget,
      scene,
      camera,
      enabled: true,
      blendMode: 'normal',
      opacity: 1.0,
      zIndex: 0,
      ...options
    };
    
    this.layers.set(id, layer);
    this.layerOrder.push(id);
    this.sortLayers();
    
    return layer;
  }
  
  /**
   * Remove a layer
   */
  public removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.renderTarget.dispose();
      this.layers.delete(id);
      this.layerOrder = this.layerOrder.filter(layerId => layerId !== id);
    }
  }
  
  /**
   * Update layer properties
   */
  public updateLayer(id: string, updates: Partial<LayerRenderTarget>): void {
    const layer = this.layers.get(id);
    if (layer) {
      Object.assign(layer, updates);
      if (updates.zIndex !== undefined) {
        this.sortLayers();
      }
    }
  }
  
  /**
   * Sort layers by z-index
   */
  private sortLayers(): void {
    this.layerOrder.sort((a, b) => {
      const layerA = this.layers.get(a);
      const layerB = this.layers.get(b);
      return (layerA?.zIndex || 0) - (layerB?.zIndex || 0);
    });
  }
  
  /**
   * Main render method
   */
  public render(): void {
    // Step 1: Render each layer to its render target
    let renderedLayers = 0;
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;
      
      // Debug: Check if scene has objects
      const objectCount = layer.scene.children.length;
      if (renderedLayers < 10) { // Show more layers
        console.log(`🎨 [MultiLayerCompositor] Rendering layer ${layerId}:`, {
          enabled: layer.enabled,
          objectCount,
          children: layer.scene.children.map(c => c.type),
          zIndex: layer.zIndex
        });
      }
      
      this.renderer.setRenderTarget(layer.renderTarget);
      // Clear color/depth/stencil with transparent background
      this.renderer.clear(true, true, true);
      this.renderer.render(layer.scene, layer.camera);
      renderedLayers++;
    }
    
    if (renderedLayers === 0) {
      console.warn('⚠️ [MultiLayerCompositor] No layers rendered!');
    }
    
    // Step 2: Composite layers using GPU shaders
    this.compositeLayersToMain();
    
    // Step 3: Post-processing chain and final output
    // Update the texture pass input to the composited target
    this.texturePass.map = this.mainRenderTarget.texture;
    
    // Save autoClear state and disable it temporarily
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    
    this.renderer.setRenderTarget(null);
    
    // CRITICAL: Clear canvas with transparency before post-processing renders
    this.renderer.clear(true, true, true);
    
    this.postProcessingComposer.render();
    
    // Restore autoClear state
    this.renderer.autoClear = autoClear;
  }
  
  /**
   * Composite all layers to main render target
   */
  private compositeLayersToMain(): void {
    // 1. Save the renderer's current autoClear state
    const autoClear = this.renderer.autoClear;
    // 2. CRITICAL: Disable auto clearing for the compositing process
    this.renderer.autoClear = false;

    this.renderer.setRenderTarget(this.mainRenderTarget);
    
    // 3. Perform a single, manual clear at the very beginning
    this.renderer.clear(true, true, true);
    
    // 4. Composite layers in order. Now, each render will draw ON TOP of the previous one.
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;
      
      this.renderLayerWithBlending(layer);
    }

    // 5. Restore the original autoClear state for other rendering operations
    this.renderer.autoClear = autoClear;
  }
  
  /**
   * Render a single layer with blending
   */
  private renderLayerWithBlending(layer: LayerRenderTarget): void {
    const blendShader = this.getBlendModeShader(layer.blendMode);
    
    // Determine THREE.js blending mode based on layer blend mode
    let blendMode: THREE.Blending = THREE.NormalBlending;
    if (layer.blendMode === 'add') {
      blendMode = THREE.AdditiveBlending as THREE.Blending;
    } else if (layer.blendMode === 'multiply') {
      blendMode = THREE.MultiplyBlending as THREE.Blending;
    } else if (layer.blendMode === 'screen') {
      blendMode = THREE.CustomBlending as THREE.Blending;
    }
    
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: blendShader,
      uniforms: {
        tDiffuse: new THREE.Uniform(layer.renderTarget.texture),
        opacity: new THREE.Uniform(layer.opacity)
      },
      transparent: true,
      blending: blendMode,
      depthTest: false,
      depthWrite: false,
      premultipliedAlpha: true // CRITICAL FIX: Changed from false to true for proper alpha blending
    });
    
    const mesh = new THREE.Mesh(this.quadGeometry, material);
    const scene = new THREE.Scene();
    scene.background = null; // Ensure transparent background
    scene.add(mesh);
    
    this.renderer.render(scene, this.quadCamera);
    
    // Cleanup
    material.dispose();
    mesh.geometry.dispose();
  }
  
  // Initialize post-processing chain
  private initializePostProcessing(): void {
    // Create EffectComposer with alpha support
    const renderTarget = new THREE.WebGLRenderTarget(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
        stencilBuffer: false,
        depthBuffer: false
      }
    );
    
    this.postProcessingComposer = new EffectComposer(this.renderer, renderTarget);
    
    // CRITICAL: Prevent EffectComposer from clearing our transparent background
    this.postProcessingComposer.renderToScreen = true;
    
    // Feed the composited texture into the composer
    this.texturePass = new TexturePass(this.mainRenderTarget.texture);
    
    // Configure TexturePass material for alpha transparency
    if (this.texturePass.material) {
      this.texturePass.material.transparent = true;
      this.texturePass.material.blending = THREE.NormalBlending;
      this.texturePass.material.depthTest = false;
      this.texturePass.material.depthWrite = false;
    }
    
    this.postProcessingComposer.addPass(this.texturePass);

    // FXAA to reduce aliasing on lines and sprite edges
    // CRITICAL FIX: Create alpha-preserving version of FXAAShader
    const AlphaPreservingFXAAShader = {
      uniforms: THREE.UniformsUtils.clone(FXAAShader.uniforms), // Properly clone uniforms as THREE.Uniform objects
      vertexShader: FXAAShader.vertexShader,
      fragmentShader: FXAAShader.fragmentShader.replace(
        // The original shader discards alpha. Find this line:
        'gl_FragColor = vec4( rgb, luma );',
        // And replace it with a version that preserves the original alpha:
        'gl_FragColor = vec4( rgb, texture2D( tDiffuse, vUv ).a );'
      )
    };
    
    // Use the alpha-preserving shader
    this.fxaaPass = new ShaderPass(AlphaPreservingFXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    this.fxaaPass.uniforms['resolution'].value.set(1 / (this.config.width * pixelRatio), 1 / (this.config.height * pixelRatio));
    
    // Critical: Configure FXAA pass material to preserve alpha
    if (this.fxaaPass.material) {
      this.fxaaPass.material.transparent = true;
      this.fxaaPass.material.blending = THREE.NormalBlending;
      this.fxaaPass.material.depthTest = false;
      this.fxaaPass.material.depthWrite = false;
    }
    
    this.postProcessingComposer.addPass(this.fxaaPass);
  }
  
  /**
   * Initialize blend mode shaders
   */
  private initializeBlendShaders(): void {
    this.blendShaders.set('normal', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texel.rgb, texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('multiply', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texel.rgb * texel.rgb, texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('screen', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(1.0 - (1.0 - texel.rgb) * (1.0 - texel.rgb), texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('overlay', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 base = vec3(0.5);
        vec3 overlay = mix(
          2.0 * base * texel.rgb, 
          1.0 - 2.0 * (1.0 - base) * (1.0 - texel.rgb), 
          step(0.5, base)
        );
        gl_FragColor = vec4(overlay, texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('add', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texel.rgb + texel.rgb, texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('subtract', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(max(texel.rgb - texel.rgb, 0.0), texel.a * opacity);
      }
    `);
  }
  
  /**
   * Get blend mode shader
   */
  private getBlendModeShader(blendMode: string): string {
    return this.blendShaders.get(blendMode) || this.blendShaders.get('normal')!;
  }
  
  /**
   * Get layer by ID
   */
  public getLayer(id: string): LayerRenderTarget | undefined {
    return this.layers.get(id);
  }
  
  /**
   * Get all layer IDs
   */
  public getLayerIds(): string[] {
    return [...this.layerOrder];
  }

  /**
   * Get the accumulated texture from all layers before a specific layer
   * This composites all layers up to (but not including) the target layer
   */
  public getAccumulatedTextureBeforeLayer(layerId: string): THREE.Texture | null {
    const targetIndex = this.layerOrder.indexOf(layerId);
    if (targetIndex === -1 || targetIndex === 0) {
      // Layer not found or it's the first layer, return null (no previous layers)
      return null;
    }

    // Save current render target
    const previousRenderTarget = this.renderer.getRenderTarget();
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    // Use temp render target to accumulate layers before the target
    this.renderer.setRenderTarget(this.tempRenderTarget);
    this.renderer.clear(true, true, true);

    // Composite layers up to (but not including) the target layer
    for (let i = 0; i < targetIndex; i++) {
      const layerId = this.layerOrder[i];
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;
      this.renderLayerWithBlending(layer);
    }

    // Restore previous render target
    this.renderer.setRenderTarget(previousRenderTarget);
    this.renderer.autoClear = autoClear;

    return this.tempRenderTarget.texture;
  }
  
  /**
   * Resize render targets
   */
  public resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    
    // Resize all render targets
    this.mainRenderTarget.setSize(width, height);
    this.tempRenderTarget.setSize(width, height);
    
    // Resize layer render targets
    for (const layer of this.layers.values()) {
      layer.renderTarget.setSize(width, height);
    }

    // Resize post-processing
    if (this.postProcessingComposer) {
      this.postProcessingComposer.setSize(width, height);
    }
    if (this.fxaaPass) {
      const pixelRatio = this.renderer.getPixelRatio();
      (this.fxaaPass.uniforms as any).resolution.value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
    }
  }
  
  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.mainRenderTarget.dispose();
    this.tempRenderTarget.dispose();
    
    for (const layer of this.layers.values()) {
      layer.renderTarget.dispose();
    }
    
    this.quadGeometry.dispose();
    this.layers.clear();
    this.layerOrder = [];
  }
}
```

## File: apps/web/src/remotion/Debug.tsx
```typescript
import React from 'react';
import { Composition } from 'remotion';
import { RayboxComposition } from './RayboxComposition';
import type { RayboxCompositionProps } from './Root';

// Debug payload - loaded dynamically so the JSON file is optional and never required on main.
// Exported so the Remotion root can optionally wire a Debug composition when available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
export let TEST_PAYLOAD: any = null;
try {
  // This file is meant for local debugging only – it's fine if it doesn't exist in CI/main
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  TEST_PAYLOAD = require('./debug-payload.json');
} catch {
  TEST_PAYLOAD = null;
}

// Log the payload to verify it's loaded correctly
if (TEST_PAYLOAD) {
  console.log('🔍 [Debug.tsx] TEST_PAYLOAD loaded:', {
    hasLayers: !!TEST_PAYLOAD.layers,
    layersCount: TEST_PAYLOAD.layers?.length || 0,
    hasAudioAnalysis: !!TEST_PAYLOAD.audioAnalysisData,
    audioAnalysisCount: TEST_PAYLOAD.audioAnalysisData?.length || 0,
    hasMasterAudioUrl: !!TEST_PAYLOAD.masterAudioUrl,
    keys: Object.keys(TEST_PAYLOAD),
    payloadSize: JSON.stringify(TEST_PAYLOAD).length,
  });
} else {
  console.warn(
    '🔍 [Debug.tsx] TEST_PAYLOAD not available. debug-payload.json is optional and intended for local debugging only.',
  );
}

// Create a wrapper component that injects the payload
// This component receives props from Remotion but ignores them and uses TEST_PAYLOAD directly
const DebugComposition: React.FC<RayboxCompositionProps> = (remotionProps) => {
  console.log('🔍 [DebugComposition] Component rendering');
  console.log('🔍 [DebugComposition] Remotion props received:', {
    layersCount: remotionProps?.layers?.length || 0,
    audioAnalysisCount: remotionProps?.audioAnalysisData?.length || 0
  });
  console.log('🔍 [DebugComposition] TEST_PAYLOAD available:', {
    hasPayload: !!TEST_PAYLOAD,
    layersCount: TEST_PAYLOAD?.layers?.length || 0,
    audioAnalysisCount: TEST_PAYLOAD?.audioAnalysisData?.length || 0,
    hasMasterAudioUrl: !!TEST_PAYLOAD?.masterAudioUrl,
  });
  
  // Use TEST_PAYLOAD directly instead of remotionProps (which might be empty due to serialization issues)
  if (!TEST_PAYLOAD) {
    console.warn(
      '🔍 [DebugComposition] TEST_PAYLOAD is not set – debug-payload.json is missing. Rendering fallback empty composition.',
    );
    return <RayboxComposition layers={[]} audioAnalysisData={[]} visualizationSettings={{} as any} masterAudioUrl="" />;
  }

  const props = TEST_PAYLOAD as RayboxCompositionProps;
  console.log('🔍 [DebugComposition] Spreading TEST_PAYLOAD as props:', {
    layersCount: props.layers?.length || 0,
    audioAnalysisCount: props.audioAnalysisData?.length || 0,
    hasMappings: !!props.mappings,
    mappingsCount: props.mappings ? Object.keys(props.mappings).length : 0,
    hasBaseParameterValues: !!props.baseParameterValues,
    baseParamLayerCount: props.baseParameterValues ? Object.keys(props.baseParameterValues).length : 0,
  });
  
  return <RayboxComposition {...props} />;
};

export const DebugRoot = () => {
  console.log('🔍 [DebugRoot] Rendering composition');
  console.log('🔍 [DebugRoot] TEST_PAYLOAD at render time:', {
    hasPayload: !!TEST_PAYLOAD,
    layersCount: TEST_PAYLOAD?.layers?.length || 0,
    audioAnalysisCount: TEST_PAYLOAD?.audioAnalysisData?.length || 0,
    payloadSize: TEST_PAYLOAD ? JSON.stringify(TEST_PAYLOAD).length : 0,
    firstLayerId: TEST_PAYLOAD?.layers?.[0]?.id,
  });

  // Try using defaultProps again, but with more logging
  const propsToPass = (TEST_PAYLOAD || {
    layers: [],
    audioAnalysisData: [],
    visualizationSettings: {} as any,
    masterAudioUrl: '',
  }) as unknown as RayboxCompositionProps;
  console.log('🔍 [DebugRoot] Props to pass:', {
    layersCount: propsToPass.layers?.length || 0,
    audioAnalysisCount: propsToPass.audioAnalysisData?.length || 0
  });

  return (
    <Composition
      id="Debug"
      component={DebugComposition}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={300}
      defaultProps={propsToPass}
    />
  );
};
```

## File: apps/web/src/lib/visualizer/effects/MetaballsEffect.ts
```typescript
import * as THREE from 'three';
import { VisualEffect, MetaballConfig } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';


export class MetaballsEffect implements VisualEffect {
  id = 'metaballs';
  name = 'Metaballs';
  description = 'Fluid droplet-like spheres';
  enabled = true;
  parameters: MetaballConfig;

  private internalScene!: THREE.Scene;
  private internalCamera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private material!: THREE.ShaderMaterial;
  private mesh!: THREE.Mesh;
  private uniforms!: Record<string, THREE.IUniform>;

  // Camera animation state
  private baseCameraDistance = 3.0;
  private cameraHeight = 1.0;
  private cameraSmoothing = 5.0; // Higher = faster response (used with deltaTime)
  private smoothedCameraTarget = new THREE.Vector3(0, 0, 0);

  constructor(config: Partial<MetaballConfig> = {}) {
    this.parameters = {
      trailLength: 15,
      baseRadius: 0.25,
      smoothingFactor: 0.3,
      colorPalette: ['#CC66FF', '#33CCFF', '#FF9933'],
      animationSpeed: 0.8,
      noiseIntensity: 1.5,
      highlightColor: [0.8, 0.5, 1.0], // default purple
      ...config
    };
    
    this.setupUniforms();
  }


  private setupUniforms() {
    this.uniforms = {
      uTime: { value: 0.0 },
      uIntensity: { value: 1.0 },
      uResolution: { value: new THREE.Vector2(1024, 1024) },
      uCameraPos: { value: new THREE.Vector3(0.0, 0.0, 3.0) },
      uCameraTarget: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
      uBaseRadius: { value: this.parameters.baseRadius },
      uSmoothingFactor: { value: this.parameters.smoothingFactor },
      uNoiseIntensity: { value: this.parameters.noiseIntensity },
      uAnimationSpeed: { value: this.parameters.animationSpeed },
      uHighlightColor: { value: new THREE.Color(...this.parameters.highlightColor) },
    };
  }

  init(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    // Create internal scene and camera for full-screen quad
    this.internalScene = new THREE.Scene();
    this.internalScene.background = null; // Transparent background for layer compositing
    console.log('🎨 MetaballsEffect: Scene created, background =', this.internalScene.background);
    this.internalCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // Set resolution uniform based on renderer size
    const size = renderer.getSize(new THREE.Vector2());
    this.uniforms.uResolution.value.set(size.x, size.y);
    this.createMaterial();
    this.createMesh();
  }

  private createMaterial() {
    const vertexShader = `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform float uTime;
      uniform float uIntensity;
      uniform vec2 uResolution;
      uniform vec3 uCameraPos;
      uniform vec3 uCameraTarget;
      uniform float uBaseRadius;
      uniform float uSmoothingFactor;
      uniform float uNoiseIntensity;
      uniform float uAnimationSpeed;
      uniform vec3 uHighlightColor;
      varying vec2 vUv;

      const int MAX_STEPS = 32;
      const float MIN_DIST = 0.0;
      const float MAX_DIST = 50.0;
      const float EPSILON = 0.002;

      // Gooey neon palette
      vec3 neon1 = vec3(0.7, 0.2, 1.0); // purple
      vec3 neon2 = vec3(0.2, 0.7, 1.0); // blue
      vec3 neon3 = vec3(0.9, 0.3, 0.8); // pink

      // 3D noise for organic movement
      vec3 random3(vec3 c) {
        float j = 4096.0 * sin(dot(c, vec3(17.0, 59.4, 15.0)));
        vec3 r;
        r.z = fract(512.0 * j);
        j *= 0.125;
        r.x = fract(512.0 * j);
        j *= 0.125;
        r.y = fract(512.0 * j);
        return r - 0.5;
      }
      float noise(vec3 p) {
        vec3 pi = floor(p);
        vec3 pf = p - pi;
        vec3 u = pf * pf * (3.0 - 2.0 * pf);
        return mix(mix(mix(dot(random3(pi + vec3(0, 0, 0)), pf - vec3(0, 0, 0)),
                          dot(random3(pi + vec3(1, 0, 0)), pf - vec3(1, 0, 0)), u.x),
                      mix(dot(random3(pi + vec3(0, 1, 0)), pf - vec3(0, 1, 0)),
                          dot(random3(pi + vec3(1, 1, 0)), pf - vec3(1, 1, 0)), u.x), u.y),
                  mix(mix(dot(random3(pi + vec3(0, 0, 1)), pf - vec3(0, 0, 1)),
                          dot(random3(pi + vec3(1, 0, 1)), pf - vec3(1, 0, 1)), u.x),
                      mix(dot(random3(pi + vec3(0, 1, 1)), pf - vec3(0, 1, 1)),
                          dot(random3(pi + vec3(1, 1, 1)), pf - vec3(1, 1, 1)), u.x), u.y), u.z);
      }
      float smin(float a, float b, float k) {
        float h = max(k - abs(a - b), 0.0) / k;
        return min(a, b) - h * h * h * k * (1.0 / 6.0);
      }
      float sphere(vec3 p, float s) {
        return length(p) - s;
      }
      float map(vec3 pos) {
        float t = uTime * uAnimationSpeed * 0.5;
        float intensity = 0.5 + uIntensity * 0.5;
        float noiseAmt = uNoiseIntensity * 0.05;
        vec3 sphere1Pos = vec3(sin(t) * 0.8, cos(t * 1.3) * 0.6, sin(t * 0.7) * 0.4);
        vec3 sphere2Pos = vec3(cos(t * 1.1) * 0.6, sin(t * 0.9) * 0.8, cos(t * 1.4) * 0.5);
        vec3 sphere3Pos = vec3(sin(t * 1.7) * 0.4, cos(t * 0.6) * 0.3, sin(t * 1.2) * 0.6);
        vec3 sphere4Pos = vec3(cos(t * 0.8) * 0.7, sin(t * 1.5) * 0.4, cos(t) * 0.3);
        sphere1Pos += vec3(sin(t * 2.3), cos(t * 1.9), sin(t * 2.7)) * noiseAmt;
        sphere2Pos += vec3(cos(t * 1.7), sin(t * 2.1), cos(t * 1.3)) * noiseAmt;
        sphere3Pos += vec3(sin(t * 3.1), cos(t * 2.5), sin(t * 1.8)) * noiseAmt;
        sphere4Pos += vec3(cos(t * 2.9), sin(t * 1.6), cos(t * 2.2)) * noiseAmt;
        float radius1 = uBaseRadius * 1.2 + intensity * 0.2;
        float radius2 = uBaseRadius * 1.0 + intensity * 0.15;
        float radius3 = uBaseRadius * 0.8 + intensity * 0.1;
        float radius4 = uBaseRadius * 0.6 + intensity * 0.1;
        float d1 = sphere(pos - sphere1Pos, radius1);
        float d2 = sphere(pos - sphere2Pos, radius2);
        float d3 = sphere(pos - sphere3Pos, radius3);
        float d4 = sphere(pos - sphere4Pos, radius4);
        float smoothness = uSmoothingFactor;
        float result = smin(d1, d2, smoothness);
        result = smin(result, d3, smoothness);
        result = smin(result, d4, smoothness);
        return result;
      }
      vec3 calcNormal(vec3 pos) {
        vec2 e = vec2(EPSILON, 0.0);
        return normalize(vec3(
          map(pos + e.xyy) - map(pos - e.xyy),
          map(pos + e.yxy) - map(pos - e.yxy),
          map(pos + e.yyx) - map(pos - e.yyx)
        ));
      }
      float rayMarch(vec3 ro, vec3 rd) {
        float dO = MIN_DIST;
        for (int i = 0; i < MAX_STEPS; i++) {
          vec3 p = ro + rd * dO;
          float dS = map(p);
          dO += dS;
          if (dO > MAX_DIST || abs(dS) < EPSILON) break;
        }
        return dO;
      }
      vec3 getNeonColor(vec3 pos, float fresnel, float edge, float core) {
        float mix1 = 0.5 + 0.5 * sin(pos.x * 2.0 + uTime * 0.7);
        float mix2 = 0.5 + 0.5 * cos(pos.y * 2.0 + uTime * 1.1);
        vec3 color = mix(neon1, neon2, mix1);
        color = mix(color, neon3, mix2 * fresnel);
        color += vec3(1.0, 0.7, 1.0) * pow(edge, 2.5) * 1.2;
        color += uHighlightColor * pow(core, 2.0) * 0.7;
        return color;
      }

      // Thickness approximation for more liquid look
      float getThickness(vec3 pos, vec3 normal) {
        // Sample SDF in both directions to estimate thickness
        float stepSize = 0.08;
        float t1 = abs(map(pos + normal * stepSize));
        float t2 = abs(map(pos - normal * stepSize));
        return 1.0 - clamp((t1 + t2) * 2.5, 0.0, 1.0); // 0 = thin, 1 = thick
      }

      // 3D value noise with trilinear interpolation
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + .1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float valueNoise3D(vec3 p) {
        vec3 pi = floor(p);
        vec3 pf = fract(p);
        // 8 corners of the cube
        float a000 = hash(pi + vec3(0,0,0));
        float a100 = hash(pi + vec3(1,0,0));
        float a010 = hash(pi + vec3(0,1,0));
        float a110 = hash(pi + vec3(1,1,0));
        float a001 = hash(pi + vec3(0,0,1));
        float a101 = hash(pi + vec3(1,0,1));
        float a011 = hash(pi + vec3(0,1,1));
        float a111 = hash(pi + vec3(1,1,1));
        // Trilinear interpolation
        float k0 = a000;
        float k1 = a100 - a000;
        float k2 = a010 - a000;
        float k3 = a001 - a000;
        float k4 = a000 - a100 - a010 + a110;
        float k5 = a000 - a010 - a001 + a011;
        float k6 = a000 - a100 - a001 + a101;
        float k7 = -a000 + a100 + a010 - a110 + a001 - a101 - a011 + a111;
        vec3 u = pf;
        return k0 + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z;
      }

      void main() {
        vec2 uv = (vUv - 0.5) * 2.0;
        
        // Apply aspect ratio correction to prevent stretching
        float aspectRatio = uResolution.x / uResolution.y;
        uv.x *= aspectRatio;
        
        vec3 cameraPos = uCameraPos;
        vec3 cameraTarget = uCameraTarget;
        vec3 cameraDir = normalize(cameraTarget - cameraPos);
        vec3 cameraRight = normalize(cross(cameraDir, vec3(0.0, 1.0, 0.0)));
        vec3 cameraUp = cross(cameraRight, cameraDir);
        vec3 rayDir = normalize(cameraDir + uv.x * cameraRight + uv.y * cameraUp);
        float dist = rayMarch(cameraPos, rayDir);
        if (dist >= MAX_DIST) {
          discard; // ensure no background writes
        }
        vec4 finalColor = vec4(0.0);
        {
          vec3 pos = cameraPos + rayDir * dist;
          vec3 normal = calcNormal(pos);
          float fresnel = pow(1.0 - max(0.0, dot(normal, -rayDir)), 2.5);
          float edge = smoothstep(0.0, 0.08, abs(map(pos)));
          float core = 1.0 - edge;
          float thickness = getThickness(pos, normal);
          // Water droplet color using value noise and reflection vector
          vec3 reflectDir = reflect(rayDir, normal);
          // Define unique offsets for each metaball
          vec3 offsets[4];
          offsets[0] = vec3(1.3, 2.1, 0.7);
          offsets[1] = vec3(-2.2, 0.5, 1.8);
          offsets[2] = vec3(0.9, -1.4, 2.3);
          offsets[3] = vec3(-1.7, 1.2, -2.5);
          vec3 colorSum = vec3(0.0);
          for (int i = 0; i < 4; i++) {
            vec3 metaballReflect = reflectDir + offsets[i];
            float noiseVal = valueNoise3D(metaballReflect * 2.0 + uTime * (1.0 + float(i) * 0.3));
            float modFactor = 0.8 + 0.2 * float(i); // unique per metaball
            colorSum += uHighlightColor * modFactor * noiseVal;
          }
          vec3 color = colorSum / 4.0;
          color = pow(color, vec3(7.0));
          // Add a subtle neon rim from before
          color = mix(color, getNeonColor(pos, fresnel, edge, core), 0.25 * fresnel);
          // Translucency and emission
          float alpha = 0.10 + 0.12 * thickness;
          alpha += 0.25 * fresnel;
          alpha += 0.10 * pow(core, 2.0);
          alpha = clamp(alpha, 0.0, 0.70);
          // Boost brightness significantly to simulate bloom effect
          color *= 3.5;
          // Add extra glow to mimic bloom
          color += vec3(0.15) * fresnel * fresnel;
          // Premultiplied alpha for correct additive blending over transparent background
          finalColor = vec4(color * alpha, alpha);
        }
        gl_FragColor = finalColor;
      }
    `;

    // Add shader compilation error checking
    try {
          this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true
    });
    } catch (error) {
      debugLog.error('❌ Shader compilation error:', error);
      // Fallback to basic material
      this.material = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.8
      }) as any;
    }
  }

  private createMesh() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    // Let compositor handle layering; avoid depth artifacts across transparent areas
    this.material.depthWrite = false;
    this.material.depthTest = false;
    this.internalScene.add(this.mesh);
    this.mesh.position.set(0, 0, 0);
    this.mesh.scale.set(2, 2, 1); // Fill viewport
  }

  public getScene(): THREE.Scene {
    return this.internalScene;
  }

  public getCamera(): THREE.Camera {
    return this.internalCamera;
  }

  updateParameter(paramName: string, value: any): void {
    // Immediately update uniforms when parameters change
    if (!this.uniforms) return;
    
    // Update the parameter in the parameters object first (for auto-save)
    if (paramName in this.parameters) {
      (this.parameters as any)[paramName] = value;
    }
    
    switch (paramName) {
      case 'animationSpeed':
        this.uniforms.uAnimationSpeed.value = value;
        break;
      case 'baseRadius':
        this.uniforms.uBaseRadius.value = value;
        break;
      case 'smoothingFactor':
        this.uniforms.uSmoothingFactor.value = value;
        break;
      case 'noiseIntensity':
        this.uniforms.uNoiseIntensity.value = value;
        break;
      case 'highlightColor':
        // Ensure the uniform value is a THREE.Color object
        if (!(this.uniforms.uHighlightColor.value instanceof THREE.Color)) {
          this.uniforms.uHighlightColor.value = new THREE.Color(...value);
        } else {
          this.uniforms.uHighlightColor.value.set(...value);
        }
        break;
    }
  }

  update(deltaTime: number): void {
    if (!this.uniforms) return;

    // Generic: sync all parameters to uniforms (except special cases like highlightColor)
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        // Skip highlightColor - it needs special handling as THREE.Color
        if (key === 'highlightColor') {
          const colorValue = this.parameters.highlightColor;
          if (Array.isArray(colorValue)) {
            // Ensure uniform value is a THREE.Color object
            if (!(this.uniforms.uHighlightColor.value instanceof THREE.Color)) {
              this.uniforms.uHighlightColor.value = new THREE.Color(...colorValue);
            } else {
              this.uniforms.uHighlightColor.value.set(...colorValue);
            }
          }
        } else {
          this.uniforms[uniformKey].value = this.parameters[key as keyof MetaballConfig];
        }
      }
    }

    // Update time
    this.uniforms.uTime.value += deltaTime * this.parameters.animationSpeed;

    // Intensity is now static - controlled only by explicit parameter mappings
    // Default to 1.0 if no intensity parameter exists (maintains visibility)
    this.uniforms.uIntensity.value = 1.0;

    // Animate camera based on time only (no implicit audio/MIDI reactivity)
    this.updateCameraAnimation(deltaTime);

    // Update shader resolution to match actual canvas size (not bounding box)
    if (this.uniforms.uResolution && this.renderer) {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.uniforms.uResolution.value.set(size.x, size.y);
    }

    // No conditional visibility logic here
  }

  private updateCameraAnimation(deltaTime: number): void {
    const time = this.uniforms.uTime.value;
    
    // Frame-rate independent smoothing factor
    const cameraSmoothingFactor = 1 - Math.exp(-this.cameraSmoothing * deltaTime);
    
    // Pure time-based camera orbit animation (no implicit audio/MIDI reactivity)
    const cameraAngle = time * 0.3;
    const cameraElevation = Math.sin(time * 0.2) * 0.3;
    const cameraDistance = this.baseCameraDistance;

    // Calculate target camera position
    const targetCameraPos = new THREE.Vector3(
      Math.cos(cameraAngle) * cameraDistance,
      cameraElevation + this.cameraHeight,
      Math.sin(cameraAngle) * cameraDistance
    );

    // Frame-rate independent camera position smoothing
    const currentPos = this.uniforms.uCameraPos.value;
    currentPos.lerp(targetCameraPos, cameraSmoothingFactor);

    // Camera target remains centered (no implicit movement)
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    // Smooth the camera target
    this.smoothedCameraTarget.lerp(targetLookAt, cameraSmoothingFactor);
    this.uniforms.uCameraTarget.value.copy(this.smoothedCameraTarget);
  }

  destroy(): void {
    if (this.mesh) {
      this.internalScene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
  }
}
```

## File: apps/web/src/lib/export-utils.ts
```typescript
import { useTimelineStore } from '@/stores/timelineStore';
import {
  type FeatureMapping,
  useVisualizerStore,
} from '@/stores/visualizerStore';
import type { RayboxCompositionProps } from '@/remotion/Root';
import type { AudioAnalysisData } from '@/types/audio-analysis-data';
import { DEFAULT_VISUALIZATION_SETTINGS } from 'phonoglyph-types';
import type { VisualizationSettings } from 'phonoglyph-types';

/**
 * File object structure expected from project files.
 */
interface ProjectFile {
  id?: string;
  downloadUrl?: string;
  is_master?: boolean;
  file_name?: string;
  file_type?: string;
  upload_status?: string;
  [key: string]: any;
}

/**
 * Gathers all project data needed for Remotion export.
 * Actively hydrates layer assets with fresh URLs to ensure the export is self-healing.
 */
export function getProjectExportPayload(
  projectId: string,
  cachedAnalysis: AudioAnalysisData[],
  projectFiles: ProjectFile[],
  stemUrlMap: Record<string, string> = {},
): RayboxCompositionProps {
  // 1. Get Store State
  const timelineState = useTimelineStore.getState();
  const visualizerState = useVisualizerStore.getState();

  // 2. Extract and Hydrate Layers
  // Deep clone layers to avoid mutating the active store during hydration
  const rawLayers = timelineState.layers;
  const layers = JSON.parse(JSON.stringify(rawLayers)).map((layer: any) => {
    // Hydrate Image Slideshows with fresh URLs from stemUrlMap
    if (layer.effectType === 'imageSlideshow' && layer.settings) {
      const imageIds = layer.settings.imageIds as string[];

      // If we have IDs and a URL map, attempt to resolve fresh URLs
      if (Array.isArray(imageIds) && imageIds.length > 0) {
        const freshImages = imageIds
          .map((id) => stemUrlMap[id]) // Look up fresh signed URL
          .filter(Boolean); // Remove any that failed to resolve

        // Only update if we successfully resolved images
        if (freshImages.length > 0) {
          layer.settings.images = freshImages;
        }
      }
    }
    return layer;
  });

  const mappings: Record<string, FeatureMapping> = visualizerState.mappings;
  const baseParameterValues: Record<string, Record<string, any>> =
    visualizerState.baseParameterValues;

  const visualizationSettings: VisualizationSettings = {
    ...DEFAULT_VISUALIZATION_SETTINGS,
  };

  const audioAnalysisData = cachedAnalysis;

  // 3. Find Master Audio
  let masterAudioUrl = '';

  const masterFile = projectFiles.find((file) => file.is_master === true);

  if (masterFile?.id) {
    masterAudioUrl = stemUrlMap[masterFile.id] || '';
    if (!masterAudioUrl && masterFile.downloadUrl) {
      masterAudioUrl = masterFile.downloadUrl;
    }
  } else if (projectFiles.length > 0) {
    // Fallback: look for audio files
    const firstAudioFile = projectFiles.find(
      (file) => file.file_type === 'audio' || file.downloadUrl,
    );

    if (firstAudioFile?.id) {
      masterAudioUrl =
        stemUrlMap[firstAudioFile.id] || firstAudioFile.downloadUrl || '';
    } else if (firstAudioFile?.downloadUrl) {
      masterAudioUrl = firstAudioFile.downloadUrl;
    }
  }

  // 4. Return Object
  return {
    layers,
    audioAnalysisData,
    visualizationSettings,
    masterAudioUrl,
    mappings,
    baseParameterValues,
  };
}
```

## File: apps/web/src/lib/visualizer/effects/EffectDefinitions.ts
```typescript
import { EffectRegistry } from './EffectRegistry';
import { MetaballsEffect } from './MetaballsEffect';
import { ParticleNetworkEffect } from './ParticleNetworkEffect';
import { ImageSlideshowEffect } from './ImageSlideshowEffect';
import { AsciiFilterEffect } from './AsciiFilterEffect';

// Stylize category imports
import { ChromaticAbberationEffect } from './ChromaticAbberationEffect';
import { CRTEffect } from './CRTEffect';
import { DitherEffect } from './DitherEffect';
import { GlitchEffect } from './GlitchEffect';
import { GrainEffect } from './GrainEffect';
import { HalftoneEffect } from './HalftoneEffect';
import { PixelateEffect } from './PixelateEffect';
import { PosterizeEffect } from './PosterizeEffect';

// Blur category imports
import { BlurEffect } from './BlurEffect';
import { BokehEffect } from './BokehEffect';
import { DiffusionEffect } from './DiffusionEffect';
import { FogEffect } from './FogEffect';
import { ProgressiveBlurEffect } from './ProgressiveBlurEffect';
import { RadialBlurEffect } from './RadialBlurEffect';

// Distort category imports
import { BulgeEffect } from './BulgeEffect';
import { FbmEffect } from './FbmEffect';
import { LiquifyEffect } from './LiquifyEffect';
import { NoiseEffect } from './NoiseEffect';
import { PolarEffect } from './PolarEffect';
import { RippleEffect } from './RippleEffect';
import { SineWavesEffect } from './SineWavesEffect';
import { SkyboxEffect } from './SkyboxEffect';
import { StretchEffect } from './StretchEffect';
import { SwirlEffect } from './SwirlEffect';
import { TrailEffect } from './TrailEffect';
import { WaterRipplesEffect } from './WaterRipplesEffect';
import { WavesEffect } from './WavesEffect';

// Light category imports
import { BeamEffect } from './BeamEffect';
import { GodRaysEffect } from './GodRaysEffect';
import { LightTrailEffect } from './LightTrailEffect';
import { WaterCausticsEffect } from './WaterCausticsEffect';

// Misc category imports
import { CircleEffect } from './CircleEffect';
import { GlitterEffect } from './GlitterEffect';
import { GradientFillEffect } from './GradientFillEffect';
import { NoiseFillEffect } from './NoiseFillEffect';
import { PatternEffect } from './PatternEffect';
import { ReplicateEffect } from './ReplicateEffect';
import { VideoEffect } from './VideoEffect';
import { WispsEffect } from './WispsEffect';

// Register built-in effects at module import time
EffectRegistry.register({
  id: 'metaballs',
  name: 'MIDI Metaballs',
  description: 'Fluid droplet-like spheres that respond to MIDI notes',
  category: 'organic',
  version: '1.0.0',
  constructor: MetaballsEffect,
  defaultConfig: {}
});

EffectRegistry.register({
  id: 'particleNetwork',
  name: 'Particle Network',
  description: 'Glowing particle network that responds to MIDI and audio',
  category: 'particles',
  version: '1.0.0',
  constructor: ParticleNetworkEffect,
  defaultConfig: {}
});

EffectRegistry.register({
  id: 'imageSlideshow',
  name: 'Image Slideshow',
  description: 'Slideshow that advances on audio transients',
  category: 'media',
  version: '1.0.0',
  constructor: ImageSlideshowEffect,
  defaultConfig: {
    triggerValue: 0,
    threshold: 0.5,
    images: [],
    opacity: 1.0,
    position: { x: 0.5, y: 0.5 },
    size: { width: 1.0, height: 1.0 }
  }
});

// STYLIZE CATEGORY EFFECTS

EffectRegistry.register({
  id: 'asciiFilter',
  name: 'ASCII Filter',
  description: 'Converts input to ASCII art with audio-reactive parameters',
  category: 'stylize',
  version: '1.0.0',
  constructor: AsciiFilterEffect,
  defaultConfig: {
    textSize: 0.4,
    gamma: 1.2,
    opacity: 0.87,
    contrast: 1.4,
    invert: 0.0,
    hideBackground: false,
    color: [1.0, 1.0, 1.0] // White by default
  }
});

EffectRegistry.register({
  id: 'chromaticAbberation',
  name: 'Chromatic Abberation',
  description: 'RGB color channel offset for lens distortion effect',
  category: 'stylize',
  version: '1.0.0',
  constructor: ChromaticAbberationEffect,
  defaultConfig: {
    amount: 0.2,
    direction: 0.0
  }
});

EffectRegistry.register({
  id: 'crt',
  name: 'CRT Monitor',
  description: 'Vintage CRT monitor effect with phosphors and scanlines',
  category: 'stylize',
  version: '1.0.0',
  constructor: CRTEffect,
  defaultConfig: {
    curvature: 0.0,
    scanlines: 0.5,
    vignetteIntensity: 0.5,
    noise: 0.5
  }
});

EffectRegistry.register({
  id: 'dither',
  name: 'Dither',
  description: 'Ordered dithering for retro pixelart look',
  category: 'stylize',
  version: '1.0.0',
  constructor: DitherEffect,
  defaultConfig: {
    bayerMatrix: 4,
    colors: 16,
    scale: 1.0
  }
});

EffectRegistry.register({
  id: 'glitch',
  name: 'Digital Glitch',
  description: 'VHS-style digital glitch with corruption and aberration',
  category: 'stylize',
  version: '1.0.0',
  constructor: GlitchEffect,
  defaultConfig: {
    blockSize: 0.5,
    offset: 0.5,
    chromatic: 0.5,
    frequency: 0.5
  }
});

EffectRegistry.register({
  id: 'grain',
  name: 'Film Grain',
  description: 'Adds film grain noise for vintage look',
  category: 'stylize',
  version: '1.0.0',
  constructor: GrainEffect,
  defaultConfig: {
    amount: 0.5,
    size: 1.0,
    colorized: false,
    luminance: false
  }
});

EffectRegistry.register({
  id: 'halftone',
  name: 'Halftone',
  description: 'CMYK halftone printing effect',
  category: 'stylize',
  version: '1.0.0',
  constructor: HalftoneEffect,
  defaultConfig: {
    dotSize: 0.75,
    angle: 0.0,
    shape: 'circle',
    smoothness: 0.75
  }
});

EffectRegistry.register({
  id: 'pixelate',
  name: 'Pixelate',
  description: 'Mosaic pixelation effect',
  category: 'stylize',
  version: '1.0.0',
  constructor: PixelateEffect,
  defaultConfig: {
    pixelSize: 0.5,
    shape: 'square'
  }
});

EffectRegistry.register({
  id: 'posterize',
  name: 'Posterize',
  description: 'Reduces color levels for poster art effect',
  category: 'stylize',
  version: '1.0.0',
  constructor: PosterizeEffect,
  defaultConfig: {
    levels: 8,
    gamma: 1.0
  }
});

// BLUR CATEGORY EFFECTS

EffectRegistry.register({
  id: 'blur',
  name: 'Gaussian Blur',
  description: 'Smooth Gaussian blur with configurable intensity',
  category: 'blur',
  version: '1.0.0',
  constructor: BlurEffect,
  defaultConfig: {
    intensity: 0.5,
    radius: 5.0,
    quality: 1.0
  }
});

EffectRegistry.register({
  id: 'radialBlur',
  name: 'Radial Blur',
  description: 'Rotational blur around a center point',
  category: 'blur',
  version: '1.0.0',
  constructor: RadialBlurEffect,
  defaultConfig: {
    intensity: 0.4,
    centerX: 0.5,
    centerY: 0.5,
    angle: 10.0
  }
});

EffectRegistry.register({
  id: 'bokeh',
  name: 'Bokeh Blur',
  description: 'Depth-of-field bokeh blur effect',
  category: 'blur',
  version: '1.0.0',
  constructor: BokehEffect,
  defaultConfig: {
    intensity: 0.5,
    focalDepth: 0.5,
    aperture: 0.8
  }
});

EffectRegistry.register({
  id: 'diffusion',
  name: 'Diffusion',
  description: 'Soft diffusion glow effect',
  category: 'blur',
  version: '1.0.0',
  constructor: DiffusionEffect,
  defaultConfig: {
    intensity: 0.5,
    size: 1.5
  }
});

EffectRegistry.register({
  id: 'fog',
  name: 'Fog',
  description: 'Animated fog effect with noise',
  category: 'blur',
  version: '1.0.0',
  constructor: FogEffect,
  defaultConfig: {
    density: 0.3,
    speed: 0.5,
    color: [1.0, 1.0, 1.0]
  }
});

EffectRegistry.register({
  id: 'progressiveBlur',
  name: 'Progressive Blur',
  description: 'Blur that increases with distance from center',
  category: 'blur',
  version: '1.0.0',
  constructor: ProgressiveBlurEffect,
  defaultConfig: {
    intensity: 0.6,
    centerX: 0.5,
    centerY: 0.5
  }
});

// DISTORT CATEGORY EFFECTS

EffectRegistry.register({
  id: 'bulge',
  name: 'Bulge',
  description: 'Bulge/pinch distortion effect',
  category: 'distort',
  version: '1.0.0',
  constructor: BulgeEffect,
  defaultConfig: {
    intensity: 0.5,
    centerX: 0.5,
    centerY: 0.5,
    radius: 0.4
  }
});

EffectRegistry.register({
  id: 'fbm',
  name: 'FBM Distortion',
  description: 'Fluid marble-like distortion using Fractal Brownian Motion',
  category: 'distort',
  version: '1.0.0',
  constructor: FbmEffect,
  defaultConfig: {
    intensity: 0.5,
    speed: 0.5,
    scale: 1.0
  }
});

EffectRegistry.register({
  id: 'liquify',
  name: 'Liquify',
  description: 'Sine-based liquid distortion effect',
  category: 'distort',
  version: '1.0.0',
  constructor: LiquifyEffect,
  defaultConfig: {
    intensity: 0.5,
    frequency: 1.0,
    speed: 0.5
  }
});

EffectRegistry.register({
  id: 'noise',
  name: 'BCC Noise',
  description: 'Body-Centered Cubic noise distortion',
  category: 'distort',
  version: '1.0.0',
  constructor: NoiseEffect,
  defaultConfig: {
    intensity: 0.5,
    scale: 1.0,
    speed: 0.5
  }
});

EffectRegistry.register({
  id: 'polar',
  name: 'Polar',
  description: 'Cartesian to polar coordinates transformation',
  category: 'distort',
  version: '1.0.0',
  constructor: PolarEffect,
  defaultConfig: {
    intensity: 1.0,
    rotation: 0.0,
    centerX: 0.5,
    centerY: 0.5
  }
});

EffectRegistry.register({
  id: 'ripple',
  name: 'Ripple',
  description: 'Concentric ripple distortion',
  category: 'distort',
  version: '1.0.0',
  constructor: RippleEffect,
  defaultConfig: {
    intensity: 0.05,
    frequency: 10.0,
    speed: 1.0,
    centerX: 0.5,
    centerY: 0.5
  }
});

EffectRegistry.register({
  id: 'sineWaves',
  name: 'Sine Waves',
  description: 'Sinusoidal wave distortion',
  category: 'distort',
  version: '1.0.0',
  constructor: SineWavesEffect,
  defaultConfig: {
    intensity: 0.5,
    frequency: 20.0,
    speed: 0.5,
    waveX: true,
    waveY: true
  }
});

EffectRegistry.register({
  id: 'skybox',
  name: 'Skybox Projection',
  description: 'Equirectangular 360 projection',
  category: 'distort',
  version: '1.0.0',
  constructor: SkyboxEffect,
  defaultConfig: {
    fov: 90.0,
    rotationX: 0.5,
    rotationY: 0.5,
    zoom: 1.0
  }
});

EffectRegistry.register({
  id: 'stretch',
  name: 'Stretch',
  description: 'Directional stretch/compression distortion',
  category: 'distort',
  version: '1.0.0',
  constructor: StretchEffect,
  defaultConfig: {
    intensity: 0.5,
    angle: 0.0,
    centerX: 0.5,
    centerY: 0.5
  }
});

EffectRegistry.register({
  id: 'swirl',
  name: 'Swirl',
  description: 'Swirl/twist distortion effect',
  category: 'distort',
  version: '1.0.0',
  constructor: SwirlEffect,
  defaultConfig: {
    intensity: 0.8,
    centerX: 0.5,
    centerY: 0.5,
    radius: 0.4
  }
});

EffectRegistry.register({
  id: 'trail',
  name: 'Trail',
  description: 'Motion trail / afterimage effect',
  category: 'distort',
  version: '1.0.0',
  constructor: TrailEffect,
  defaultConfig: {
    intensity: 0.5,
    decay: 0.9
  }
});

EffectRegistry.register({
  id: 'waterRipples',
  name: 'Water Ripples',
  description: 'Water surface ripple simulation',
  category: 'distort',
  version: '1.0.0',
  constructor: WaterRipplesEffect,
  defaultConfig: {
    intensity: 0.5,
    speed: 1.0
  }
});

EffectRegistry.register({
  id: 'waves',
  name: 'Noise Waves',
  description: 'Perlin noise wave distortion',
  category: 'distort',
  version: '1.0.0',
  constructor: WavesEffect,
  defaultConfig: {
    intensity: 0.5,
    speed: 1.0
  }
});

// LIGHT CATEGORY EFFECTS

EffectRegistry.register({
  id: 'beam',
  name: 'Beam',
  description: 'Animated scanning light beam',
  category: 'Light',
  version: '1.0.0',
  constructor: BeamEffect,
  defaultConfig: {
    intensity: 1.0,
    speed: 0.5,
    width: 0.5,
    angle: 0.0,
    color: '#661aff'
  }
});

EffectRegistry.register({
  id: 'godRays',
  name: 'God Rays',
  description: 'Volumetric light scattering',
  category: 'Light',
  version: '1.0.0',
  constructor: GodRaysEffect,
  defaultConfig: {
    intensity: 1.0,
    decay: 0.96,
    density: 0.5,
    weight: 0.4,
    lightX: 0.5,
    lightY: 0.5
  }
});

EffectRegistry.register({
  id: 'lightTrail',
  name: 'Light Trail',
  description: 'Mouse/Touch light trail effect',
  category: 'Light',
  version: '1.0.0',
  constructor: LightTrailEffect,
  defaultConfig: {
    intensity: 1.0,
    trailLength: 0.8,
    color: '#0082f7'
  }
});

EffectRegistry.register({
  id: 'waterCaustics',
  name: 'Water Caustics',
  description: 'Water surface caustics simulation',
  category: 'Light',
  version: '1.0.0',
  constructor: WaterCausticsEffect,
  defaultConfig: {
    intensity: 0.8,
    speed: 0.5,
    refraction: 0.5,
    color: '#99b3e6'
  }
});

// MISC CATEGORY EFFECTS

EffectRegistry.register({
  id: 'circle',
  name: 'Circle',
  description: 'Circular mask overlay',
  category: 'Misc',
  version: '1.0.0',
  constructor: CircleEffect,
  defaultConfig: {
    radius: 0.25,
    feather: 0.1,
    centerX: 0.5,
    centerY: 0.5,
    color: '#661aff',
    opacity: 1.0
  }
});

EffectRegistry.register({
  id: 'glitter',
  name: 'Glitter',
  description: 'Voronoi-based sparkle effect',
  category: 'Misc',
  version: '1.0.0',
  constructor: GlitterEffect,
  defaultConfig: {
    intensity: 1.0,
    scale: 1.0,
    speed: 0.5
  }
});

EffectRegistry.register({
  id: 'gradientFill',
  name: 'Gradient Fill',
  description: 'Procedural linear gradient with OKLab mixing',
  category: 'Misc',
  version: '1.0.0',
  constructor: GradientFillEffect,
  defaultConfig: {
    color1: '#000000',
    color2: '#ffffff',
    angle: 0.0,
    speed: 0.0,
    opacity: 1.0
  }
});

EffectRegistry.register({
  id: 'noiseFill',
  name: 'Noise Fill',
  description: 'Procedural BCC noise pattern',
  category: 'Misc',
  version: '1.0.0',
  constructor: NoiseFillEffect,
  defaultConfig: {
    color1: '#ffd198',
    color2: '#9600e6',
    scale: 1.0,
    speed: 0.5,
    opacity: 1.0
  }
});

EffectRegistry.register({
  id: 'pattern',
  name: 'Pattern',
  description: 'Procedural geometric patterns',
  category: 'Misc',
  version: '1.0.0',
  constructor: PatternEffect,
  defaultConfig: {
    patternType: 0,
    scale: 1.0,
    color: '#fa1ee3',
    opacity: 1.0
  }
});

EffectRegistry.register({
  id: 'replicate',
  name: 'Replicate',
  description: 'Trail and aberration effect',
  category: 'Misc',
  version: '1.0.0',
  constructor: ReplicateEffect,
  defaultConfig: {
    spacing: 0.35,
    speed: 0.5,
    rotation: 0.0,
    opacity: 1.0
  }
});

EffectRegistry.register({
  id: 'video',
  name: 'Video Overlay',
  description: 'Video texture overlay (requires video source)',
  category: 'Misc',
  version: '1.0.0',
  constructor: VideoEffect,
  defaultConfig: {
    scale: 1.0,
    rotation: 0.0,
    posX: 0.5,
    posY: 0.5,
    opacity: 1.0
  }
});

EffectRegistry.register({
  id: 'wisps',
  name: 'Wisps',
  description: 'Flowing smoke/wisp effect',
  category: 'Misc',
  version: '1.0.0',
  constructor: WispsEffect,
  defaultConfig: {
    speed: 0.5,
    scale: 1.0,
    intensity: 1.0,
    color: '#ffffff'
  }
});
```

## File: apps/web/src/remotion/Root.tsx
```typescript
import { type CalculateMetadataFunction, Composition } from 'remotion';
import { RayboxComposition } from './RayboxComposition';
import type { Layer } from '@/types/video-composition';
import type { AudioAnalysisData } from '@/types/audio-analysis-data'; // Use the cached type
import type { VisualizationSettings } from 'phonoglyph-types';

// Import debug payload (always available for local testing)
// eslint-disable-next-line @typescript-eslint/no-require-imports
let TEST_PAYLOAD: any = null;
try {
  const debugModule = require('./Debug');
  TEST_PAYLOAD = debugModule.TEST_PAYLOAD;
} catch (e) {
  // Debug module not available, that's okay
}

export interface RayboxCompositionProps extends Record<string, unknown> {
  layers: Layer[];
  // This contains the full timeline analysis for Master + all Stems
  audioAnalysisData: AudioAnalysisData[];
  visualizationSettings: VisualizationSettings;
  // The only audio track to be rendered in the output
  masterAudioUrl: string;
  // Audio feature mappings for effect parameters
  mappings?: Record<string, { featureId: string | null; modulationAmount: number }>;
  // Base parameter values before modulation
  baseParameterValues?: Record<string, Record<string, any>>;
}

const defaultProps: RayboxCompositionProps = {
  layers: [],
  audioAnalysisData: [],
  visualizationSettings: {
    colorScheme: 'mixed',
    pixelsPerSecond: 50,
    showTrackLabels: true,
    showVelocity: true,
    minKey: 21,
    maxKey: 108,
  },
  masterAudioUrl: '',
};

const calculateMetadata: CalculateMetadataFunction<RayboxCompositionProps> = ({
  props,
}) => {
  // FPS is set on the Composition component (30), so we use that value here
  const safeFps = 30;

  const layers = props?.layers ?? [];

  // Prefer explicit duration on the payload if provided
  let duration = (props as any)?.duration as number | undefined;

  // If no explicit duration, derive from the end of the last layer
  if (duration == null || Number.isNaN(duration)) {
    if (layers.length > 0) {
      const layerEndTimes = layers
        .map((l) => l.endTime)
        .filter((t) => typeof t === 'number' && !Number.isNaN(t));

      if (layerEndTimes.length > 0) {
        duration = Math.max(...layerEndTimes);
      }
    }
  }

  // Default to 30 seconds if we couldn't determine duration
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    duration = 30;
  }

  return {
    durationInFrames: Math.ceil(duration * safeFps),
    props,
  };
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="RayboxMain"
        component={RayboxComposition}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        calculateMetadata={calculateMetadata}
      />
      {TEST_PAYLOAD && (
        <Composition
          id="Debug"
          component={RayboxComposition}
          width={1080}
          height={1920}
          fps={30}
          defaultProps={TEST_PAYLOAD as unknown as RayboxCompositionProps}
          calculateMetadata={calculateMetadata}
        />
      )}
    </>
  );
};
```

## File: apps/web/src/remotion/RayboxComposition.tsx
```typescript
import React, { useEffect, useRef, useState } from 'react';
import { useCurrentFrame, useVideoConfig, Audio, delayRender, continueRender } from 'remotion';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
// Import EffectDefinitions to ensure effects are registered
import '@/lib/visualizer/effects/EffectDefinitions';
import type { VisualizerConfig } from '@/types/visualizer';
import type { RayboxCompositionProps } from './Root';
import type { AudioAnalysisData as SimpleAudioAnalysisData } from '@/types/visualizer';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { debugLog } from '@/lib/utils';
import { parseParamKey } from '@/lib/visualizer/paramKeys';

/**
 * Helper function to extract audio feature values at a specific time from cached analysis data.
 * Adapted from use-audio-analysis.ts getFeatureValue logic.
 */
function getFeatureValueFromCached(
  cachedAnalysis: CachedAudioAnalysisData[],
  fileId: string,
  feature: string,
  time: number,
  stemType?: string
): number {
  const featureParts = feature.includes('-') ? feature.split('-') : [feature];
  const parsedStem = featureParts.length > 1 ? featureParts[0] : (stemType ?? 'master');
  let analysis = cachedAnalysis.find(
    a => a.fileMetadataId === fileId && a.stemType === parsedStem
  );

  // FALLBACK: If strict ID match fails, try matching by stemType only
  // This handles cases where the debug payload has mismatched IDs
  if (!analysis) {
    analysis = cachedAnalysis.find(a => a.stemType === parsedStem);
  }

  if (!analysis?.analysisData) {
    return 0;
  }

  const frameTimes = analysis.analysisData.frameTimes as
    | Float32Array
    | number[]
    | undefined;
  const derivedDurationFromFrames =
    frameTimes && frameTimes.length > 0
      ? (frameTimes as any)[frameTimes.length - 1]
      : undefined;
  const metadataDuration = (analysis as any).metadata?.duration as
    | number
    | undefined;
  const analysisDuration = (analysis.analysisData as any)
    .analysisDuration as number | undefined;

  const duration =
    metadataDuration ?? derivedDurationFromFrames ?? analysisDuration ?? 0;

  if (time < 0 || (duration > 0 && time > duration)) {
    return 0;
  }

  const { analysisData } = analysis;
  const featureName = featureParts.length > 1 ? featureParts.slice(1).join('-') : feature;

  // Time-series features - timestamp-based indexing using analysisData.frameTimes
  const getTimeSeriesValue = (
    arr: Float32Array | number[] | undefined
  ): number => {
    if (!arr || arr.length === 0) return 0;
    const times = analysisData.frameTimes as Float32Array | number[] | undefined;
    if (!times || times.length === 0) return 0;
    // Binary search: find last index with times[idx] <= time
    let lo = 0;
    let hi = Math.min(times.length - 1, arr.length - 1);
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1; // upper mid to avoid infinite loop
      const tmid = (times as any)[mid];
      if (tmid <= time) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    const index = Math.max(0, Math.min(arr.length - 1, lo));
    return arr[index] ?? 0;
  };

  switch (featureName) {
    case 'rms':
      return getTimeSeriesValue(analysisData.rms);
    case 'volume':
      // FALLBACK FIX: Prefer RMS if available, as volume can be 0-filled in some analysis passes
      return getTimeSeriesValue(analysisData.rms ?? analysisData.volume);
    case 'loudness':
      return getTimeSeriesValue(analysisData.loudness);
    case 'spectral-centroid':
    case 'spectralcentroid':
      return getTimeSeriesValue(analysisData.spectralCentroid);
    case 'spectral-rolloff':
    case 'spectralrolloff':
      return getTimeSeriesValue(analysisData.spectralRolloff);
    case 'bass':
      return getTimeSeriesValue(analysisData.bass);
    case 'mid':
      return getTimeSeriesValue(analysisData.mid);
    case 'treble':
      return getTimeSeriesValue(analysisData.treble);
    default:
      return 0;
  }
}

/**
 * Convert cached audio analysis data to simple AudioAnalysisData format at a specific time.
 * Exported so Remotion-specific overlay renderer can reuse audio sampling logic.
 */
export function extractAudioDataAtTime(
  cachedAnalysis: CachedAudioAnalysisData[] | undefined,
  fileId: string | undefined,
  time: number,
  stemType?: string
): SimpleAudioAnalysisData | null {
  if (!cachedAnalysis || !fileId || cachedAnalysis.length === 0) {
    return null;
  }

  // Extract feature values at the current time
  const volume = getFeatureValueFromCached(cachedAnalysis, fileId, 'volume', time, stemType);
  const bass = getFeatureValueFromCached(cachedAnalysis, fileId, 'bass', time, stemType);
  const mid = getFeatureValueFromCached(cachedAnalysis, fileId, 'mid', time, stemType);
  const treble = getFeatureValueFromCached(cachedAnalysis, fileId, 'treble', time, stemType);
  const spectralCentroid = getFeatureValueFromCached(cachedAnalysis, fileId, 'spectral-centroid', time, stemType);

  // Get frequencies and timeData from the analysis
  let analysis = cachedAnalysis.find(
    a => a.fileMetadataId === fileId && a.stemType === (stemType ?? 'master')
  );

  // FALLBACK: If strict ID match fails, try matching by stemType only
  if (!analysis) {
    analysis = cachedAnalysis.find(a => a.stemType === (stemType ?? 'master'));
  }

  if (!analysis) {
    return null;
  }

  // Extract frequency data (FFT) at the current time
  const fft = analysis.analysisData.fft;
  const frameTimes = analysis.analysisData.frameTimes;
  let frequencies: number[] = [];
  let timeData: number[] = [];

  if (fft && frameTimes && Array.isArray(fft) && Array.isArray(frameTimes) && frameTimes.length > 0) {
    // Find the frame index closest to the current time
    let frameIndex = 0;
    for (let i = 0; i < frameTimes.length; i++) {
      if (frameTimes[i] <= time) {
        frameIndex = i;
      } else {
        break;
      }
    }

    // [CHANGE 2] Dynamically calculate bin size instead of hardcoding 256
    // This prevents index out of bounds or misalignment if analysis uses 512/1024 bins
    const binsPerFrame = Math.floor(fft.length / frameTimes.length);

    if (binsPerFrame > 0) {
      const startIdx = frameIndex * binsPerFrame;
      const endIdx = Math.min(startIdx + binsPerFrame, fft.length);

      if (startIdx < fft.length) {
        frequencies = Array.from(fft.slice(startIdx, endIdx));
        // Map FFT to Time Data approximation if TimeData is missing (common in compressed payloads)
        timeData = frequencies.map((_, i) => fft[startIdx + i] || 0);
      }
    }
  }

  return {
    frequencies: frequencies.length > 0 ? frequencies : new Array(256).fill(0),
    timeData: timeData.length > 0 ? timeData : new Array(256).fill(0),
    volume,
    bass,
    mid,
    treble,
  };
}

export const RayboxComposition: React.FC<RayboxCompositionProps> = ({
  layers,
  audioAnalysisData, // This is the full cached analysis array
  visualizationSettings,
  masterAudioUrl,
  mappings,
  baseParameterValues,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerManagerRef = useRef<VisualizerManager | null>(null);
  const effectInstancesRef = useRef<Map<string, any>>(new Map());
  const [handle] = useState(() => delayRender('Waiting for assets'));
  const assetsLoadedRef = useRef(false);

  // DEBUG: If props are empty, try to load from global TEST_PAYLOAD
  // This is a fallback for local debugging when Remotion serialization fails
  let actualLayers = layers;
  let actualAudioAnalysisData = audioAnalysisData;
  let actualMasterAudioUrl = masterAudioUrl;

  if ((!layers || layers.length === 0) && typeof window !== 'undefined') {
    try {
      // Try to import TEST_PAYLOAD dynamically
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const debugModule = require('../remotion/Debug');
      if (debugModule.TEST_PAYLOAD) {
        console.log('🔧 [RayboxComposition] Using TEST_PAYLOAD fallback - props were empty');
        actualLayers = debugModule.TEST_PAYLOAD.layers || [];
        actualAudioAnalysisData = debugModule.TEST_PAYLOAD.audioAnalysisData || [];
        actualMasterAudioUrl = debugModule.TEST_PAYLOAD.masterAudioUrl || '';
        console.log('🔧 [RayboxComposition] Fallback loaded:', {
          layersCount: actualLayers.length,
          audioAnalysisCount: actualAudioAnalysisData.length,
          hasMasterAudioUrl: !!actualMasterAudioUrl
        });
      }
    } catch (e) {
      console.warn('⚠️ [RayboxComposition] Could not load TEST_PAYLOAD fallback:', e);
    }
  }

  // Debug: Log props on mount/update
  useEffect(() => {
    console.log('📦 [RayboxComposition] Props received:', {
      layersCount: layers?.length || 0,
      audioAnalysisDataCount: audioAnalysisData?.length || 0,
      hasMasterAudioUrl: !!masterAudioUrl,
      frame,
      time: frame / fps
    });
    console.log('📦 [RayboxComposition] Using actual props:', {
      layersCount: actualLayers?.length || 0,
      audioAnalysisDataCount: actualAudioAnalysisData?.length || 0,
      hasMasterAudioUrl: !!actualMasterAudioUrl
    });
    if (actualLayers && actualLayers.length > 0) {
      console.log('📦 [RayboxComposition] Layer types:', actualLayers.map(l => ({ id: l.id, type: l.type, effectType: l.effectType })));
    }
  }, []);

  // 1. Initialize VisualizerManager (Once)
  useEffect(() => {
    if (!canvasRef.current || visualizerManagerRef.current) return;

    try {
      const config: VisualizerConfig = {
        canvas: { width, height, pixelRatio: 1 }, // pixelRatio 1 ensures deterministic rendering
        performance: { targetFPS: fps, enableShadows: false },
        midi: { velocitySensitivity: 1.0, noteTrailDuration: 2.0, trackColorMapping: {} },
      };

      visualizerManagerRef.current = new VisualizerManager(canvasRef.current, config);

      // Initial timeline sync (even if layers are empty initially)
      visualizerManagerRef.current.updateTimelineState(actualLayers, 0);

    } catch (error) {
      debugLog.error('❌ [RayboxComposition] Failed to initialize:', error);
    }

    return () => {
      visualizerManagerRef.current?.dispose();
      visualizerManagerRef.current = null;
      effectInstancesRef.current.clear();
    };
  }, [width, height, fps]);

  // 1b. Initialize effects when layers are available
  useEffect(() => {
    console.log('🔄 [RayboxComposition] Effect init useEffect triggered:', {
      hasManager: !!visualizerManagerRef.current,
      layersCount: actualLayers?.length || 0,
      layers: actualLayers
    });

    if (!visualizerManagerRef.current) {
      console.warn('⚠️ [RayboxComposition] VisualizerManager not initialized yet');
      return;
    }

    if (!actualLayers || actualLayers.length === 0) {
      console.warn('⚠️ [RayboxComposition] No layers provided');
      return;
    }

    try {
      // Initialize layers
      const effectLayers = actualLayers.filter(layer => layer.type === 'effect' && layer.effectType);

      console.log(`🎨 [RayboxComposition] Initializing ${effectLayers.length} effect layers from ${layers.length} total layers`);

      for (const layer of effectLayers) {
        if (!effectInstancesRef.current.has(layer.id) && layer.effectType) {
          console.log(`🎨 [RayboxComposition] Creating effect: ${layer.effectType} for layer ${layer.id}`);
          console.log(`🎨 [RayboxComposition] Available effects:`, EffectRegistry.getRegisteredEffectIds());

          // Try to create the effect with better error handling
          let effect = null;
          try {
            // [FIX] Merge baseParameterValues into settings to ensure we have the latest values
            // This is crucial for arrays like 'images' which might be empty in layer.settings but present in baseParameterValues
            const baseValues = baseParameterValues?.[layer.id] || {};
            const mergedSettings = { ...layer.settings, ...baseValues };

            effect = EffectRegistry.createEffect(layer.effectType, mergedSettings);
          } catch (error) {
            console.error(`❌ [RayboxComposition] Exception creating effect ${layer.effectType}:`, error);
          }

          if (effect) {
            effectInstancesRef.current.set(layer.id, effect);
            visualizerManagerRef.current.addEffect(layer.id, effect);
            console.log(`✅ [RayboxComposition] Added effect: ${layer.effectType} (${layer.id})`);
          } else {
            console.warn(`⚠️ [RayboxComposition] Failed to create effect: ${layer.effectType} for layer ${layer.id}`);
            console.warn(`⚠️ [RayboxComposition] Effect might not be registered. Check EffectDefinitions import.`);
          }
        }
      }
    } catch (error) {
      console.error('❌ [RayboxComposition] Failed to initialize effects:', error);
      debugLog.error('❌ [RayboxComposition] Failed to initialize effects:', error);
    }
  }, [actualLayers]);

  // 2. Handle Layer/Effect Updates (if props change during dev, or for structure)
  useEffect(() => {
    if (!visualizerManagerRef.current) return;
    visualizerManagerRef.current.updateTimelineState(actualLayers, frame / fps);
  }, [actualLayers, frame, fps]);

  // 3. Render Frame Loop
  useEffect(() => {
    if (!visualizerManagerRef.current) return;

    const time = frame / fps;
    const deltaTime = 1 / fps;

    // A. Determine which fileId to use for the "Main" audio data injection.
    // Usually this is the master track, but overlays might look up specific stems via their layer settings.
    // For the global 'currentAudioData' used by general effects, we prioritize the Master.
    let audioData: SimpleAudioAnalysisData;

    // We assume the backend passes the cached analysis array
    const cachedAnalysis = actualAudioAnalysisData as unknown as CachedAudioAnalysisData[];

    // Find the master analysis (usually indicated by stemType 'master' or isMaster flag in metadata)
    // If no explicit master, fallback to the first available analysis
    const masterAnalysis = cachedAnalysis.find(a => a.stemType === 'master') || cachedAnalysis[0];
    const fileId = masterAnalysis?.fileMetadataId;

    if (fileId) {
      // Extract data for this specific frame
      const extracted = extractAudioDataAtTime(cachedAnalysis, fileId, time, 'master');
      audioData = extracted || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 };
    } else {
      audioData = { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 };
    }

    // B. Apply audio feature mappings to effect parameters
    // This mimics the mapping application logic from page.tsx
    // Mappings are now included in the payload via getProjectExportPayload
    if (mappings && Object.keys(mappings).length > 0) {
      // Helper to get slider max value (same as page.tsx)
      const getSliderMax = (paramName: string): number => {
        if (paramName === 'baseRadius' || paramName === 'base-radius') return 1.0;
        if (paramName === 'animationSpeed' || paramName === 'animation-speed') return 2.0;
        if (paramName === 'opacity') return 1.0;
        if (paramName === 'textSize') return 1.0;
        if (paramName === 'gamma') return 2.2;
        if (paramName === 'contrast') return 2.0;
        return 100; // Default
      };

      // Helper to get stem type from feature ID
      const getStemTypeFromFeatureId = (featureId: string): string => {
        const parts = featureId.split('-');
        if (parts.length > 1) {
          const stemType = parts[0];
          if (['master', 'drums', 'bass', 'vocals', 'other'].includes(stemType)) {
            return stemType;
          }
        }
        return 'master'; // Default
      };

      // Apply each mapping
      Object.entries(mappings).forEach(([paramKey, mapping]) => {
        if (!mapping?.featureId) return;

        const parsed = parseParamKey(paramKey);
        if (!parsed) return;

        const { effectInstanceId: layerId, paramName } = parsed;
        const featureId = mapping.featureId;
        const featureStemType = getStemTypeFromFeatureId(featureId);

        // Find the stem analysis
        const stemAnalysis = cachedAnalysis.find(a => a.stemType === featureStemType);
        if (!stemAnalysis) return;

        // Get feature value at current time
        const rawValue = getFeatureValueFromCached(
          cachedAnalysis,
          stemAnalysis.fileMetadataId,
          featureId,
          time,
          featureStemType || undefined
        );

        if (rawValue === null || rawValue === undefined) return;

        // Calculate modulated value (same logic as page.tsx)
        const maxValue = getSliderMax(paramName);
        const knobFull = (mapping.modulationAmount ?? 0.5) * 2 - 1;
        const knob = Math.max(-0.5, Math.min(0.5, knobFull));

        // [CHANGE 3] Fix Base Value Lookup
        // If baseParameterValues doesn't have the value, get it from the live effect instance
        // This fixes the "Static" or "Off scale" issue where values defaulted to 0
        let baseValue = baseParameterValues?.[layerId]?.[paramName];

        if (baseValue === undefined) {
          const effectInstance = effectInstancesRef.current.get(layerId);
          // Retrieve internal parameter value if accessible
          if (effectInstance && effectInstance.parameters) {
            baseValue = effectInstance.parameters[paramName];
          }
        }

        // Final fallback if still undefined
        if (baseValue === undefined) {
          // Try to get default from slider max logic if applicable, or just 0
          // But 0 might be wrong for things like opacity (default 1) or scale (default 1)
          // So we should be careful.
          if (paramName === 'opacity' || paramName === 'scale' || paramName === 'baseRadius') {
            baseValue = 1.0;
          } else {
            baseValue = 0;
          }
        }

        const delta = rawValue * knob * maxValue;
        const scaledValue = Math.max(0, Math.min(maxValue, baseValue + delta));

        // Update effect parameter
        if (visualizerManagerRef.current) {
          visualizerManagerRef.current.updateEffectParameter(layerId, paramName, scaledValue);
        }
      });
    }

    // C. Inject Data & Render
    visualizerManagerRef.current.setAudioData(audioData);
    visualizerManagerRef.current.renderFrame(time * 1000, deltaTime);

  }, [frame, fps, actualLayers, actualAudioAnalysisData]);

  // 4. Wait for assets (Images)
  useEffect(() => {
    if (assetsLoadedRef.current) return;

    const waitForAssets = async () => {
      try {
        // Find all slideshow effects
        const slideshowEffects = Array.from(effectInstancesRef.current.values())
          .filter(effect => effect.id && effect.id.startsWith('imageSlideshow'));

        // Also check by constructor name if possible, or just rely on the loop above
        // The loop above relies on 'imageSlideshow' prefix in ID which might not be robust if ID is custom
        // Better to check for waitForImages method

        const asyncEffects = Array.from(effectInstancesRef.current.values())
          .filter(effect => typeof (effect as any).waitForImages === 'function');

        if (asyncEffects.length > 0) {
          console.log(`⏳ [RayboxComposition] Waiting for ${asyncEffects.length} async effects...`);
          await Promise.all(asyncEffects.map(effect => (effect as any).waitForImages()));
          console.log(`✅ [RayboxComposition] All assets loaded`);
        }
      } catch (e) {
        console.error('❌ [RayboxComposition] Error waiting for assets:', e);
      } finally {
        assetsLoadedRef.current = true;
        continueRender(handle);
      }
    };

    // We need to wait for effects to be initialized first
    if (visualizerManagerRef.current && effectInstancesRef.current.size > 0) {
      // Small timeout to ensure everything is settled
      const t = setTimeout(() => {
        waitForAssets();
      }, 100);
      return () => clearTimeout(t);
    } else if (actualLayers && actualLayers.length === 0) {
      // No layers, just continue
      assetsLoadedRef.current = true;
      continueRender(handle);
    } else {
      // If we have layers but effects aren't ready, we might be in the very first render cycle
      // The effect init useEffect should run and populate effectInstancesRef
      // We'll retry in a bit if we're still blocked
      const t = setTimeout(() => {
        if (!assetsLoadedRef.current) {
          waitForAssets();
        }
      }, 1000); // 1s fallback
      return () => clearTimeout(t);
    }
  }, [actualLayers, handle]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {/* 4. Render Only Master Audio */}
      {actualMasterAudioUrl && <Audio src={actualMasterAudioUrl} />}
    </div>
  );
};
```

## File: apps/web/src/lib/visualizer/core/VisualizerManager.ts
```typescript
import * as THREE from 'three';
import { VisualEffect, VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualizerControls } from '@/types/visualizer';
import { MultiLayerCompositor } from './MultiLayerCompositor';
import { VisualizationPreset } from '@/types/stem-visualization';
import { debugLog } from '@/lib/utils';
import { AudioTextureManager, AudioFeatureData } from './AudioTextureManager';
import { MediaLayerManager } from './MediaLayerManager';

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
  
  // FIX: Add state to hold timeline data
  private timelineLayers: any[] = [];
  private timelineCurrentTime: number = 0;
  
  // Audio analysis
  private audioContext: AudioContext | null = null;
  private audioSources: AudioBufferSourceNode[] = [];
  private currentAudioBuffer: AudioBuffer | null = null;
  
  // Layered compositor
  private multiLayerCompositor!: MultiLayerCompositor;
  
  // Background color layer
  private backgroundMaterial!: THREE.MeshBasicMaterial;
  private backgroundMesh!: THREE.Mesh;
  
  // GPU compositing system
  private audioTextureManager: AudioTextureManager | null = null;
  private mediaLayerManager: MediaLayerManager | null = null;
  
  // Performance monitoring
  private frameCount = 0;
  private debugFrameCount = 0; // Separate counter for debug logging
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
    debugLog.log('🎭 VisualizerManager constructor called');
    this.instanceId = ++VisualizerManager.instanceCounter;
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    
    this.initScene(config);
    this.setupEventListeners();
    this.initCompositor(config);
    this.initAudioTextureManager();
    this.initMediaLayerManager();
    debugLog.log('🎭 VisualizerManager constructor complete');
  }
  
  private initScene(config: VisualizerConfig) {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent background for proper layer compositing
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
      debugLog.error('❌ Primary WebGL renderer failed:', error);
      
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
        debugLog.error('❌ Fallback renderer also failed:', fallbackError);
        throw new Error('WebGL is not available. Please refresh the page and try again. If the problem persists, try closing other browser tabs or restarting your browser.');
      }
    }
    
    this.renderer.setSize(config.canvas.width, config.canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.canvas.pixelRatio || 2));
    this.renderer.setClearColor(0x000000, 0); // Transparent background for layer compositing
    
    const clearColor = this.renderer.getClearColor(new THREE.Color());
    const clearAlpha = this.renderer.getClearAlpha();
    console.log('🎮 VisualizerManager: Renderer clear color =', clearColor.getHex().toString(16), 'alpha =', clearAlpha);
    
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

  private initCompositor(config: VisualizerConfig) {
    this.multiLayerCompositor = new MultiLayerCompositor(this.renderer, {
      width: config.canvas.width,
      height: config.canvas.height,
      enableAntialiasing: true,
      pixelRatio: Math.min(window.devicePixelRatio, config.canvas.pixelRatio || 2)
    });
    
    // --- START: BACKGROUND COLOR LAYER IMPLEMENTATION ---
    // Create a dedicated scene for the background color
    const backgroundScene = new THREE.Scene();
    const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Create a material we can control. Start with black.
    this.backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    // Create a full-screen quad
    this.backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.backgroundMaterial);
    backgroundScene.add(this.backgroundMesh);
    
    // Add it to the compositor with a very low zIndex (-100) so it renders first
    this.multiLayerCompositor.createLayer('backgroundColor', backgroundScene, backgroundCamera, {
      zIndex: -100,
      enabled: true
    });
    // --- END: BACKGROUND COLOR LAYER IMPLEMENTATION ---
    
    // Add base scene as background layer (change zIndex to be above the color layer)
    this.multiLayerCompositor.createLayer('base', this.scene, this.camera, { zIndex: -1, enabled: true });
  }

  private initAudioTextureManager() {
    this.audioTextureManager = new AudioTextureManager();
    debugLog.log('🎵 AudioTextureManager initialized');
  }

  private initMediaLayerManager() {
    this.mediaLayerManager = new MediaLayerManager(this.scene, this.camera, this.renderer);
    debugLog.log('🎬 MediaLayerManager initialized');
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
      debugLog.warn('⚠️ WebGL context lost!');
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
  public addEffect(layerId: string, effect: VisualEffect) {
    console.log(`➕ [VisualizerManager] Adding effect: ${layerId}, type: ${effect.constructor.name}`);
    try {
      debugLog.log(`🎨 Adding effect: ${effect.name} (for layer ${layerId})`);
      effect.init(this.renderer);
      
      // If this is an ASCII filter effect, set the compositor reference
      // Check by class name or if setCompositor method exists
      if ('setCompositor' in effect && typeof (effect as any).setCompositor === 'function') {
        debugLog.log(`🔗 [VisualizerManager] Setting compositor for effect: ${effect.name} (${effect.id})`);
        (effect as any).setCompositor(this.multiLayerCompositor, layerId);
      }
      
      this.effects.set(layerId, effect);
      // Register a layer for this effect using the unique layerId
      this.multiLayerCompositor.createLayer(layerId, effect.getScene(), effect.getCamera(), {
        zIndex: this.effects.size,
        enabled: effect.enabled
      });
      
      debugLog.log(`✅ Added effect: ${effect.name}. Total effects: ${this.effects.size}`);
    } catch (error) {
      debugLog.error(`❌ Failed to add effect ${effect.name}:`, error);
    }
  }
  
  public addEffectWithId(effect: VisualEffect, customId: string) {
    try {
      debugLog.log(`🎨 Adding effect with custom ID: ${effect.name} (${customId})`);
      // Don't call init again - effect is already initialized by addEffect()
      // Just add the reference with the custom ID
      this.effects.set(customId, effect);
      
      debugLog.log(`✅ Added effect reference with custom ID: ${effect.name} (${customId}). Total effects: ${this.effects.size}`);
    } catch (error) {
      debugLog.error(`❌ Failed to add effect ${effect.name} with custom ID ${customId}:`, error);
    }
  }
  
  public removeEffect(effectId: string) {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.destroy();
      this.effects.delete(effectId);
      this.multiLayerCompositor.removeLayer(effectId);
      debugLog.log(`✅ Removed effect and compositor layer: ${effect.name}. Remaining effects: ${this.effects.size}`);
    }
  }
  
  getEffect(effectId: string): VisualEffect | undefined {
    return this.effects.get(effectId);
  }
  
  getAllEffects(): VisualEffect[] {
    return Array.from(this.effects.values());
  }

  // Get all layer IDs that have a specific effect type
  getLayerIdsByEffectType(effectType: string): string[] {
    const layerIds: string[] = [];
    this.effects.forEach((effect, layerId) => {
      if (effect.id === effectType) {
        layerIds.push(layerId);
      }
    });
    return layerIds;
  }

  // Get the first effect instance of a specific type (for parameter inspection)
  getEffectByType(effectType: string): VisualEffect | undefined {
    for (const [_, effect] of this.effects) {
      if (effect.id === effectType) {
        return effect;
      }
    }
    return undefined;
  }
  
  enableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = true;
      this.multiLayerCompositor.updateLayer(effectId, { enabled: true });
      debugLog.log(`✅ Enabled effect: ${effect.name} (${effectId})`);
    } else {
      debugLog.warn(`⚠️ Effect not found: ${effectId}`);
    }
  }
  
  disableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = false;
      this.multiLayerCompositor.updateLayer(effectId, { enabled: false });
      debugLog.log(`❌ Disabled effect: ${effect.name} (${effectId})`);
    }
  }
  
  // Legacy show/hide helpers removed; layers are toggled via compositor
  
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
  
  /**
   * Frame-based rendering method for Remotion compatibility.
   * This method can be called explicitly with a specific time and deltaTime,
   * decoupling rendering from the browser clock.
   * @param time - Current time in milliseconds (replaces performance.now())
   * @param deltaTime - Time delta in seconds (replaces clock.getDelta())
   */
  public renderFrame(time: number, deltaTime: number): void {
    // Note: timelineCurrentTime is managed by updateTimelineState() called from
    // ThreeVisualizer.tsx (Live Mode) and RayboxComposition.tsx (Remotion).
    // We should NOT override it here with system time, as that causes layers to
    // disappear when the page has been open longer than the layer's duration.

    // Update all enabled effects
    let activeEffectCount = 0;
    
    // Debug: Log effect and timeline state
    if (this.effects.size === 0) {
      console.warn('⚠️ [VisualizerManager] No effects registered. Effects count:', this.effects.size);
    }
    
    if (this.timelineLayers.length === 0) {
      console.warn('⚠️ [VisualizerManager] No timeline layers. Timeline layers count:', this.timelineLayers.length);
    }
    
    this.effects.forEach((effect, layerId) => {
      // Find the corresponding layer from the timeline state using the correct key
      const effectLayer = this.timelineLayers.find(l => l.id === layerId);

      // Determine if the layer should be active.
      const isLayerActive = effect.enabled && effectLayer 
        ? (this.timelineCurrentTime >= effectLayer.startTime && this.timelineCurrentTime <= effectLayer.endTime)
        : false;

      // Debug logging for first few frames
      if (this.debugFrameCount < 5 && effectLayer) {
        console.log(`🎬 [Frame ${this.debugFrameCount}] Layer ${layerId}:`, {
          enabled: effect.enabled,
          currentTime: this.timelineCurrentTime,
          startTime: effectLayer.startTime,
          endTime: effectLayer.endTime,
          isActive: isLayerActive
        });
      }

      // Update the compositor's render state for this layer
      this.multiLayerCompositor.updateLayer(layerId, { enabled: isLayerActive });

      // Run the effect's update logic if it's active
      if (isLayerActive) {
          activeEffectCount++;
          
          try {
            // Effects are updated via updateEffectParameter() from the UI mapping system
            // The update() method only syncs parameters to uniforms (no implicit audio reactivity)
            effect.update(deltaTime);
          } catch (error) {
            debugLog.error(`❌ Effect ${layerId} update failed:`, error);
          }
      }
    });
    
    if (this.debugFrameCount < 5) {
      console.log(`🎬 [Frame ${this.debugFrameCount}] Active effects: ${activeEffectCount}, Total effects: ${this.effects.size}, Timeline time: ${this.timelineCurrentTime.toFixed(3)}s`);
    }
    
    this.debugFrameCount++;
    
    // Update GPU audio texture system
    if (this.audioTextureManager && this.currentAudioData) {
      // Convert audio analysis to GPU texture format using existing structure
      const audioFeatureData: AudioFeatureData = {
        features: {
          'main': [this.currentAudioData.volume, this.currentAudioData.bass, this.currentAudioData.mid, this.currentAudioData.treble]
        },
        duration: 0, // Will be set when real audio is loaded
        sampleRate: 44100,
        stemTypes: ['main']
      };
      
      // Update audio texture with timeline position (not system time)
      // This ensures audio sampling matches the track position, not page uptime
      this.audioTextureManager.updateTime(this.timelineCurrentTime, 0); // Note: duration is 0 here, fine for now or pass actual duration if available
    }
    
    // Update media layer textures (for video elements)
    if (this.mediaLayerManager) {
      this.mediaLayerManager.updateTextures();
    }
    
    // Render all layers via compositor
    this.multiLayerCompositor.render();
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
    
    // Call renderFrame with calculated time and deltaTime
    this.renderFrame(currentTime, deltaTime);
    
    this.lastTime = currentTime;
  };
  
  /**
   * FIX: Public method to synchronize the visualizer with the timeline's state.
   * This should be called from a useEffect hook in the UI.
   */
  public updateTimelineState(layers: any[], currentTime: number): void {
    this.timelineLayers = layers;
    this.timelineCurrentTime = currentTime;

    // Sync layer z-indices from timeline to compositor
    if (this.multiLayerCompositor) {
      layers.forEach(layer => {
        if (typeof layer.zIndex === 'number') {
          // The compositor handles re-sorting internally when zIndex is updated
          this.multiLayerCompositor.updateLayer(layer.id, { zIndex: layer.zIndex });
        }
      });
    }
  }
  
  // Update methods for real data
  updateMIDIData(midiData: LiveMIDIData): void {
    // Store MIDI data to be used in next animation frame
    this.currentMidiData = midiData;
    debugLog.log('🎵 MIDI data received:', midiData);
  }

  updateAudioData(audioData: AudioAnalysisData): void {
    // Store audio data to be used in next animation frame
    this.currentAudioData = audioData;
    debugLog.log('🎵 Audio data received:', audioData);
  }

  /**
   * Public method to manually set audio data (for Remotion frame-based rendering)
   * @param data - AudioAnalysisData to set
   */
  public setAudioData(data: AudioAnalysisData): void {
    this.currentAudioData = data;
  }
  
  
  updateEffectParameter(effectId: string, paramName: string, value: any): void {
    // Try to get effect by layer ID first
    let effect = this.effects.get(effectId);
    
    // Debug logging for metaballs specifically
    const isMetaballs = effectId === 'layer-1765752490965';
    
    // If not found, assume effectId is an effect type (like 'metaballs')
    // and update ALL instances of that effect type
    if (!effect) {
      const layerIds = this.getLayerIdsByEffectType(effectId);
      if (layerIds.length > 0) {
        // Update all instances of this effect type
        layerIds.forEach(layerId => {
          const effectInstance = this.effects.get(layerId);
          if (effectInstance && effectInstance.parameters.hasOwnProperty(paramName)) {
            const oldValue = (effectInstance.parameters as any)[paramName];
            (effectInstance.parameters as any)[paramName] = value;
            if (isMetaballs) {
              console.log('🔧 [VisualizerManager] Updated effect parameter (by type):', {
                effectId,
                layerId,
                paramName,
                oldValue,
                newValue: value,
                hasUpdateMethod: typeof (effectInstance as any).updateParameter === 'function',
              });
            }
            if (typeof (effectInstance as any).updateParameter === 'function') {
              (effectInstance as any).updateParameter(paramName, value);
            }
          } else if (isMetaballs) {
            console.warn('🔧 [VisualizerManager] Parameter not found (by type):', {
              effectId,
              layerId,
              paramName,
              availableParams: effectInstance ? Object.keys(effectInstance.parameters) : [],
            });
          }
        });
        return;
      }
      if (isMetaballs) {
        console.warn(`🔧 [VisualizerManager] Effect ${effectId} not found (neither as layer ID nor effect type)`);
      }
      debugLog.warn(`⚠️ Effect ${effectId} not found (neither as layer ID nor effect type)`);
      return;
    }
    
    // Handle direct layer ID lookup
    if (effect.parameters.hasOwnProperty(paramName)) {
      const oldValue = (effect.parameters as any)[paramName];
      (effect.parameters as any)[paramName] = value;
      
      if (isMetaballs) {
        console.log('🔧 [VisualizerManager] Updated effect parameter (direct):', {
          effectId,
          paramName,
          oldValue,
          newValue: value,
          hasUpdateMethod: typeof (effect as any).updateParameter === 'function',
          currentParams: Object.keys(effect.parameters),
        });
      }
      
      // If the effect has an updateParameter method, call it for immediate updates
      if (typeof (effect as any).updateParameter === 'function') {
        (effect as any).updateParameter(paramName, value);
        if (isMetaballs) {
          console.log('🔧 [VisualizerManager] Called updateParameter method');
        }
      }
    } else {
      if (isMetaballs) {
        console.warn('🔧 [VisualizerManager] Parameter not found (direct):', {
          effectId,
          paramName,
          availableParams: Object.keys(effect.parameters),
        });
      }
      debugLog.warn(`⚠️ Parameter ${paramName} not found in effect ${effectId}`);
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
    debugLog.log(`🗑️ VisualizerManager.dispose() called. Effects: ${this.effects.size}`);
    this.stop();
    
    // Dispose compositor
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.dispose();
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
    
    // Update resolution uniforms and resize handlers for all effects
    this.effects.forEach(effect => {
      // Update resolution uniforms
      if ('uniforms' in effect && (effect as any).uniforms?.uResolution) {
        (effect as any).uniforms.uResolution.value.set(canvasWidth, canvasHeight);
      }
      
      // Call resize method if effect has one (for updating internal cameras)
      if ('resize' in effect && typeof (effect as any).resize === 'function') {
        (effect as any).resize(canvasWidth, canvasHeight);
      }
    });
    
    // Resize compositor targets
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.resize(canvasWidth, canvasHeight);
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
        // [CHANGE 4] Enable CORS for textures
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous'); 
        
        const texture = loader.load(image.src, undefined, undefined, (err) => {
            console.error("Error loading texture:", image.src, err);
        });
        const plane = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true }); // Ensure transparent is true
        const mesh = new THREE.Mesh(plane, material);
        
        // Position in 2D space (orthographic camera)
        mesh.position.set(position.x, position.y, 0);
        mesh.scale.set(scale.x, scale.y, 1);
        
        compositionScene.add(mesh);
        return mesh;
      }
    };
  }

  // GPU Compositing System Access Methods
  
  public getAudioTextureManager(): AudioTextureManager | null {
    return this.audioTextureManager;
  }

  public getMediaLayerManager(): MediaLayerManager | null {
    return this.mediaLayerManager;
  }

  // GPU compositing always on via MultiLayerCompositor

  public loadAudioAnalysisForGPU(analysisData: AudioFeatureData): void {
    if (this.audioTextureManager) {
      this.audioTextureManager.loadAudioAnalysis(analysisData);
      debugLog.log('🎵 Audio analysis loaded into GPU textures');
    }
  }

  // Background Color Control Methods
  
  /**
   * Set the background color of the visualizer
   * @param color - THREE.js compatible color (hex, string, or Color object)
   */
  public setBackgroundColor(color: THREE.ColorRepresentation): void {
    if (this.backgroundMaterial) {
      this.backgroundMaterial.color.set(color);
      debugLog.log('🎨 Background color set to:', color);
    }
  }

  /**
   * Control the visibility of the background color layer
   * @param visible - true to show background, false for full transparency
   */
  public setBackgroundVisibility(visible: boolean): void {
    if (this.backgroundMesh) {
      this.backgroundMesh.visible = visible;
      debugLog.log('🎨 Background visibility set to:', visible);
    }
  }
}
```

## File: apps/web/src/components/midi/three-visualizer.tsx
```typescript
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, debugLog } from '@/lib/utils';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
import '@/lib/visualizer/effects/EffectDefinitions';
import { MIDIData, VisualizationSettings } from '@/types/midi';
import { VisualizerConfig, LiveMIDIData, VisualEffect } from '@/types/visualizer';
import { getAspectRatioConfig, calculateCanvasSize } from '@/lib/visualizer/aspect-ratios';
import { Layer } from '@/types/video-composition';

interface ThreeVisualizerProps {
  midiData: MIDIData;
  settings: VisualizationSettings;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSettingsChange: (settings: VisualizationSettings) => void;
  onFpsUpdate?: (fps: number) => void;
  className?: string;
  selectedEffects: Record<string, boolean>;
  onSelectedEffectsChange: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  aspectRatio?: string;
  // Data synchronization props (kept for data flow)
  activeSliderValues: Record<string, Record<string, any>>;
  baseParameterValues?: Record<string, Record<string, any>>;
  setActiveSliderValues: React.Dispatch<React.SetStateAction<Record<string, Record<string, any>>>>;
  setBaseParam?: (effectId: string, paramName: string, value: any) => void;
  visualizerRef?: React.RefObject<VisualizerManager> | ((instance: VisualizerManager | null) => void);
  layers: Layer[];
  selectedLayerId?: string | null;
  onLayerSelect?: (layerId: string) => void;
  onLayerUpdate?: (layerId: string, updates: Partial<Layer>) => void;
  // Legacy props kept for compatibility - UI rendering moved to EffectsLibrarySidebar
  openEffectModals?: Record<string, boolean>;
  onCloseEffectModal?: (effectId: string) => void;
  mappings?: Record<string, { featureId: string | null; modulationAmount: number }>;
  featureNames?: Record<string, string>;
  onMapFeature?: (parameterId: string, featureId: string) => void;
  onUnmapFeature?: (parameterId: string) => void;
  onModulationAmountChange?: (parameterId: string, amount: number) => void;
  // Children to render inside the canvas container
  children?: React.ReactNode;
}

export function ThreeVisualizer({
  midiData,
  settings,
  currentTime,
  isPlaying,
  onPlayPause,
  onSettingsChange,
  onFpsUpdate,
  className,
  selectedEffects,
  onSelectedEffectsChange,
  aspectRatio = 'mobile',
  activeSliderValues,
  baseParameterValues = {},
  setActiveSliderValues,
  setBaseParam,
  visualizerRef: externalVisualizerRef,
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  children
}: ThreeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalVisualizerRef = useRef<VisualizerManager | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 711 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const effectInstancesRef = useRef<{ [id: string]: VisualEffect }>({});

  // Helper: apply parameter values from store to effect instances
  const syncParametersToEffects = useCallback(() => {
    const manager = internalVisualizerRef.current;
    if (!manager) {
      console.log('[ThreeVisualizer] syncParameters: manager not ready');
      return;
    }

    const activeCount = Object.keys(activeSliderValues).length;
    const baseCount = Object.keys(baseParameterValues).length;
    const effectCount = Object.keys(effectInstancesRef.current).length;
    console.log('[ThreeVisualizer] syncParameters start', {
      activeCount,
      baseCount,
      isInitialized,
      effectCount,
      hasLayers: layers.length > 0,
      effectLayerCount: layers.filter(l => l.type === 'effect').length,
    });
    
    // Early return if no effects to sync
    if (effectCount === 0) {
      debugLog.warn('[ThreeVisualizer] syncParameters: No effect instances to sync. This may indicate a timing issue with auto-save hydration.');
      return;
    }

    Object.entries(effectInstancesRef.current).forEach(([layerId, effect]) => {
      // IMPORTANT: Only look at params stored by the specific layer ID
      // Do NOT fall back to effect type - that would cause parameter sharing between instances
      const activeParams = activeSliderValues[layerId] || {};
      const baseParams = baseParameterValues[layerId] || {};
      const paramNames = new Set([
        ...Object.keys(activeParams),
        ...Object.keys(baseParams),
      ]);

      paramNames.forEach((paramName) => {
        const value = activeParams[paramName] ?? baseParams[paramName];
        const currentVal = (effect.parameters as any)[paramName];
        if (value === undefined) return;
        if (currentVal != value) {
          manager.updateEffectParameter(layerId, paramName, value);
        }
      });
    });
  }, [activeSliderValues, baseParameterValues, isInitialized]);
  
  // Get aspect ratio configuration
  const aspectRatioConfig = getAspectRatioConfig(aspectRatio);
  
  // Resize observer for container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Calculate canvas size when container size or aspect ratio changes
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      const newCanvasSize = calculateCanvasSize(
        containerSize.width,
        containerSize.height,
        aspectRatioConfig
      );
      setCanvasSize(newCanvasSize);
    }
  }, [containerSize, aspectRatioConfig]);
  
  // Update visualizer when canvas size changes
  useEffect(() => {
    if (internalVisualizerRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
      const visualizer = internalVisualizerRef.current;
      visualizer.handleViewportResize(canvasSize.width, canvasSize.height);
      debugLog.log('🎨 Canvas resized to:', canvasSize.width, 'x', canvasSize.height, 'aspect:', canvasSize.width / canvasSize.height);
    }
  }, [canvasSize]);

  // Initialize visualizer
  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    try {
      debugLog.log('🎭 Initializing ThreeVisualizer with aspect ratio:', aspectRatio);
    
    const config: VisualizerConfig = {
      canvas: {
          width: canvasSize.width,
          height: canvasSize.height,
        pixelRatio: Math.min(window.devicePixelRatio, 2)
      },
        aspectRatio: aspectRatioConfig,
      performance: {
          targetFPS: 60,
          enableShadows: false
      },
      midi: {
        velocitySensitivity: 1.0,
        noteTrailDuration: 2.0,
        trackColorMapping: {}
      }
    };

      internalVisualizerRef.current = new VisualizerManager(canvasRef.current, config);
      
      // Enable selected effects
      Object.entries(selectedEffects).forEach(([effectId, enabled]) => {
        if (enabled) {
          internalVisualizerRef.current?.enableEffect(effectId);
        } else {
          internalVisualizerRef.current?.disableEffect(effectId);
        }
      });

      setIsInitialized(true);
      debugLog.log('✅ ThreeVisualizer initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      debugLog.error('❌ Failed to initialize ThreeVisualizer:', err);
    }
  }, [canvasSize, aspectRatioConfig]);

  // Sync visualizer with timeline state (layers and currentTime)
  useEffect(() => {
    const vizManager = internalVisualizerRef.current;
    if (vizManager) {
      vizManager.updateTimelineState(layers, currentTime);
    }
  }, [layers, currentTime]);

  // Dynamic scene synchronization
  useEffect(() => {
    if (!internalVisualizerRef.current) return;
    const manager = internalVisualizerRef.current;
    debugLog.log('[ThreeVisualizer] layers prop:', layers, layers.map(l => l.type));
    const effectLayers = layers.filter(l => l.type === 'effect');
    debugLog.log('[ThreeVisualizer] effectLayers:', effectLayers);
    const currentIds = Object.keys(effectInstancesRef.current);
    const newIds = effectLayers.map(l => l.id);

    // Remove effects not in layers
    for (const id of currentIds) {
      if (!newIds.includes(id)) {
        manager.removeEffect(id);
        delete effectInstancesRef.current[id];
        debugLog.log(`[ThreeVisualizer] Removed effect instance: ${id}`);
      }
    }

    // Add new effects from layers using registry system
    for (const layer of effectLayers) {
      if (!effectInstancesRef.current[layer.id]) {
        debugLog.log('[ThreeVisualizer] Creating effect for layer:', layer);
        const effect = EffectRegistry.createEffect(layer.effectType || 'metaballs', layer.settings);
        if (effect) {
          effectInstancesRef.current[layer.id] = effect;
          manager.addEffect(layer.id, effect);
          debugLog.log(`[ThreeVisualizer] Added effect instance: ${layer.id} (${layer.effectType}) with effect ID: ${effect.id}`);
          
          // Apply any saved parameter values from the store to the newly created effect
          // IMPORTANT: Only look for values stored by this specific layer ID, NOT by effect type
          // This prevents new instances from inheriting parameters from previous instances of the same effect type
          const activeParams = activeSliderValues[layer.id] || {};
          const baseParams = baseParameterValues[layer.id] || {};
          const paramNames = new Set([
            ...Object.keys(activeParams),
            ...Object.keys(baseParams),
          ]);
          paramNames.forEach((paramName) => {
            const value = activeParams[paramName] ?? baseParams[paramName];
            if (value !== undefined) {
          manager.updateEffectParameter(layer.id, paramName, value);
              debugLog.log(`[ThreeVisualizer] Applied saved param: ${layer.id}.${paramName} = ${value}`);
            }
          });
        } else {
          debugLog.warn(`[ThreeVisualizer] Failed to create effect: ${layer.effectType} for layer: ${layer.id}`);
        }
      }
    }

    // If no effect layers, remove all effects
    if (effectLayers.length === 0) {
      for (const id of Object.keys(effectInstancesRef.current)) {
        manager.removeEffect(id);
        delete effectInstancesRef.current[id];
        debugLog.log(`[ThreeVisualizer] Removed effect instance (all cleared): ${id}`);
      }
    }
  }, [layers, internalVisualizerRef.current, activeSliderValues, baseParameterValues]);

  // Sync parameters when store values or initialization/layers change
  // This effect ensures parameters are synced when:
  // 1. The visualizer is initialized
  // 2. Layers change (effects are created/removed)
  // 3. Parameter values are restored from auto-save (activeSliderValues/baseParameterValues change)
  useEffect(() => {
    // Only sync if visualizer is initialized and we have effect instances
    if (!isInitialized || Object.keys(effectInstancesRef.current).length === 0) {
      return;
    }
    syncParametersToEffects();
  }, [syncParametersToEffects, layers, isInitialized, activeSliderValues, baseParameterValues]);

  // Expose visualizer ref to parent
  useEffect(() => {
    if (externalVisualizerRef && internalVisualizerRef.current) {
      if (typeof externalVisualizerRef === 'function') {
        externalVisualizerRef(internalVisualizerRef.current);
      } else if (externalVisualizerRef && 'current' in externalVisualizerRef) {
        (externalVisualizerRef as any).current = internalVisualizerRef.current;
      }
    }
  }, [externalVisualizerRef, isInitialized]);

  // Handle play/pause
  useEffect(() => {
    if (!internalVisualizerRef.current) return;

    if (isPlaying) {
      internalVisualizerRef.current.play();
    } else {
      internalVisualizerRef.current.pause();
    }
  }, [isPlaying]);

  // Update MIDI data
  useEffect(() => {
    if (!internalVisualizerRef.current || !midiData) return;
    
         const liveMidiData: LiveMIDIData = {
       currentTime,
       activeNotes: midiData.tracks.flatMap(track => 
         track.notes.filter(note => 
           note.start <= currentTime && note.start + note.duration >= currentTime
         ).map(note => ({
           note: note.pitch,
           velocity: note.velocity,
           track: track.id,
           startTime: note.start
         }))
       ),
       tempo: 120,
       totalNotes: midiData.tracks.reduce((sum, track) => sum + track.notes.length, 0),
       trackActivity: midiData.tracks.reduce((acc, track) => {
         acc[track.id] = track.notes.filter(note => 
           note.start <= currentTime && note.start + note.duration >= currentTime
         ).length > 0;
         return acc;
       }, {} as Record<string, boolean>)
     };
    
    internalVisualizerRef.current.updateMIDIData(liveMidiData);
  }, [midiData, currentTime]);

  // Update FPS
  useEffect(() => {
    if (!internalVisualizerRef.current || !onFpsUpdate) return;

    const interval = setInterval(() => {
      const fps = internalVisualizerRef.current?.getFPS() || 60;
      onFpsUpdate(fps);
    }, 1000);

    return () => clearInterval(interval);
  }, [onFpsUpdate]);

  // Handle effect parameter changes (data sync logic)
  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    if (!internalVisualizerRef.current) return;
    
    internalVisualizerRef.current.updateEffectParameter(effectId, paramName, value);
    
    // Update active slider values (nested by effect instance id)
    setActiveSliderValues(prev => ({
      ...prev,
      [effectId]: {
        ...(prev[effectId] || {}),
        [paramName]: value
      }
    }));
    
    // Update base parameter store so hydration uses the latest values
    if (setBaseParam) {
      setBaseParam(effectId, paramName, value);
    }
    
    // Also update layer settings for persistence
    const layer = layers.find(l => l.id === effectId && l.type === 'effect');
    if (layer && onLayerUpdate) {
      onLayerUpdate(layer.id, {
        ...layer,
        settings: {
          ...layer.settings,
          [paramName]: value
        }
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (internalVisualizerRef.current) {
        internalVisualizerRef.current.dispose();
      }
    };
  }, []);

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  // Helper: is the project truly empty (all layers are empty image lanes)?
  const allLayersEmpty = layers.length === 0 || layers.every(l => l.type === 'image' && !l.src);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center",
        className
      )}
      style={{
        minHeight: '200px',
        aspectRatio: `${aspectRatioConfig.width}/${aspectRatioConfig.height}`
      }}
    >
      {/* Canvas container with proper sizing */}
      <div 
        className="relative bg-stone-900 rounded-lg overflow-hidden shadow-lg"
        style={{
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          maxWidth: '100%',
          maxHeight: '100%',
          pointerEvents: 'auto',
          zIndex: 10
        }}
        >
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-full h-full"
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            pointerEvents: 'none',
            zIndex: 1
          }}
        />
        {/* Show prompt if all layers are empty */}
        {allLayersEmpty && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-auto">
            <span className="text-white/60 text-sm font-mono text-center select-none">
              Add your first layer
            </span>
          </div>
        )}
        {/* HUD overlays and other children rendered inside canvas container */}
        {children}
      </div>
    </div>
  );
}

// Custom hook to force re-render
const useForceUpdate = () => {
  const [, setValue] = useState(0);
  return () => setValue(value => value + 1); 
};

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 z-50">
      <Card className="bg-red-800/80 text-white p-4 max-w-md">
      <h3 className="text-lg font-semibold">An Error Occurred</h3>
      <p className="text-sm">{message}</p>
      <Button onClick={() => window.location.reload()} variant="secondary" className="mt-4">
        Refresh Page
      </Button>
      </Card>
    </div>
  );
}

function MainContent({ children, onMouseEnter, onMouseLeave }: { children: React.ReactNode, onMouseEnter: () => void, onMouseLeave: () => void }) {
  return (
    <div 
      className="relative aspect-[9/16] max-w-sm mx-auto bg-stone-900 rounded-lg overflow-hidden shadow-2xl"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

function Canvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
}
```
