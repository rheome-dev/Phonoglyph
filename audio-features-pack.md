This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: apps/web/src/components/projects/project-creation-modal.tsx, apps/web/src/components/stem-visualization/**/*.tsx, apps/web/src/components/ui/MappingSourcesPanel.tsx, apps/web/src/components/audio-analysis/**/*.tsx, apps/web/src/hooks/use-upload.ts, apps/web/src/hooks/use-audio-analysis.ts, apps/web/src/hooks/use-audio-features.ts, apps/web/src/hooks/use-stem-audio-controller.ts, apps/web/src/types/audio-analysis*.ts, apps/web/src/types/worker-messages.ts, apps/web/src/types/stem-*.ts, apps/web/public/workers/audio-analysis-worker.js, apps/web/src/app/workers/audio-analysis.worker.ts, apps/web/src/app/creative-visualizer/page.tsx, apps/api/src/routers/file.ts, apps/api/src/routers/stem.ts, apps/api/src/services/stem-*.ts, apps/api/src/services/r2-storage.ts, apps/api/src/services/audio-analysis-*.ts, apps/api/src/services/audio-analyzer.ts, apps/api/src/services/media-processor.ts, apps/api/src/lib/file-validation.ts
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
apps/
  api/
    src/
      lib/
        file-validation.ts
      routers/
        file.ts
        stem.ts
      services/
        audio-analysis-processor.ts
        audio-analyzer.ts
        media-processor.ts
        r2-storage.ts
        stem-processor.ts
        stem-separator.ts
  web/
    public/
      workers/
        audio-analysis-worker.js
    src/
      app/
        creative-visualizer/
          page.tsx
        workers/
          audio-analysis.worker.ts
      components/
        audio-analysis/
          analysis-comparison.tsx
          analysis-method-controls.tsx
          analysis-parameters.tsx
          analysis-visualization.tsx
          api-test.tsx
          audio-analysis-sandbox.tsx
          auth-status.tsx
        projects/
          project-creation-modal.tsx
        stem-visualization/
          stem-waveform.tsx
        ui/
          MappingSourcesPanel.tsx
      hooks/
        use-audio-analysis.ts
        use-audio-features.ts
        use-stem-audio-controller.ts
        use-upload.ts
      types/
        audio-analysis-data.ts
        audio-analysis.ts
        stem-audio-analysis.ts
        stem-visualization.ts
        worker-messages.ts
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="apps/api/src/lib/file-validation.ts">
import { z } from 'zod'

// File type definitions - EXTENDED for video and image
export type FileType = 'midi' | 'audio' | 'video' | 'image'

// Video and Image metadata interfaces
export interface VideoMetadata {
  duration: number;           // seconds
  width: number;             // pixels
  height: number;            // pixels
  frameRate: number;         // fps
  codec: string;             // h264, h265, etc.
  bitrate: number;           // kbps
  aspectRatio: string;       // "16:9", "4:3", etc.
}

export interface ImageMetadata {
  width: number;             // pixels
  height: number;            // pixels
  colorProfile: string;      // sRGB, Adobe RGB, etc.
  orientation: number;       // EXIF orientation
  hasAlpha: boolean;         // transparency channel
  fileFormat: string;        // JPEG, PNG, GIF
}

export interface ValidatedFile {
  fileName: string
  fileType: FileType
  mimeType: string
  fileSize: number
  isValid: boolean
  errors: string[]
}

// File size limits from environment variables - EXTENDED
export const FILE_SIZE_LIMITS = {
  midi: parseInt(process.env.MAX_MIDI_FILE_SIZE || '5242880'), // 5MB
  audio: parseInt(process.env.MAX_AUDIO_FILE_SIZE || '52428800'), // 50MB
  video: parseInt(process.env.MAX_VIDEO_FILE_SIZE || '524288000'), // 500MB
  image: parseInt(process.env.MAX_IMAGE_FILE_SIZE || '26214400'), // 25MB
} as const

// Allowed MIME types - EXTENDED
export const ALLOWED_MIME_TYPES = {
  midi: [
    'audio/midi',
    'audio/x-midi',
    'application/x-midi',
    'audio/mid',
  ] as string[],
  audio: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
  ] as string[],
  video: [
    'video/mp4',
    'video/mov',
    'video/quicktime',
    'video/webm',
  ] as string[],
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ] as string[],
}

// Allowed file extensions - EXTENDED
export const ALLOWED_EXTENSIONS = {
  midi: ['.mid', '.midi'],
  audio: ['.mp3', '.wav'],
  video: ['.mp4', '.mov', '.webm'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
} as const

// Magic bytes for file header validation - EXTENDED
export const MAGIC_BYTES = {
  midi: [
    [0x4d, 0x54, 0x68, 0x64], // "MThd" - Standard MIDI file header
  ],
  mp3: [
    [0xff, 0xfb], // MPEG-1 Layer 3
    [0xff, 0xf3], // MPEG-2 Layer 3
    [0xff, 0xf2], // MPEG-2.5 Layer 3
    [0x49, 0x44, 0x33], // ID3 tag
  ],
  wav: [
    [0x52, 0x49, 0x46, 0x46], // "RIFF" header
  ],
  mp4: [
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // MP4 signature
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // Alternative MP4
  ],
  webm: [
    [0x1a, 0x45, 0xdf, 0xa3], // WebM/Matroska signature
  ],
  jpeg: [
    [0xff, 0xd8, 0xff], // JPEG signature
  ],
  png: [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG signature
  ],
  gif: [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  webp: [
    [0x52, 0x49, 0x46, 0x46], // RIFF container for WebP
  ],
} as const

// Validation configurations for new file types
export const videoValidation = {
  maxSize: 500 * 1024 * 1024,  // 500MB
  allowedTypes: [
    'video/mp4',
    'video/mov', 
    'video/quicktime',
    'video/webm'
  ],
  maxDuration: 600,            // 10 minutes max
  maxResolution: {
    width: 3840,               // 4K max
    height: 2160
  }
};

export const imageValidation = {
  maxSize: 25 * 1024 * 1024,   // 25MB
  allowedTypes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ],
  maxResolution: {
    width: 8192,               // 8K max
    height: 8192
  }
};

// Zod schema for file upload input - EXTENDED
export const FileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  fileSize: z.number().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
})

export type FileUploadInput = z.infer<typeof FileUploadSchema>

// Validate file extension - EXTENDED
export function validateFileExtension(fileName: string): FileType | null {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  
  if (ALLOWED_EXTENSIONS.midi.includes(extension as any)) {
    return 'midi'
  }
  
  if (ALLOWED_EXTENSIONS.audio.includes(extension as any)) {
    return 'audio'
  }
  
  if (ALLOWED_EXTENSIONS.video.includes(extension as any)) {
    return 'video'
  }
  
  if (ALLOWED_EXTENSIONS.image.includes(extension as any)) {
    return 'image'
  }
  
  return null
}

// Validate MIME type
export function validateMimeType(mimeType: string, fileType: FileType): boolean {
  return ALLOWED_MIME_TYPES[fileType].includes(mimeType)
}

// Validate file size
export function validateFileSize(fileSize: number, fileType: FileType): boolean {
  return fileSize <= FILE_SIZE_LIMITS[fileType]
}

// Validate file header (magic bytes) - EXTENDED
export function validateFileHeader(buffer: ArrayBuffer, fileType: FileType): boolean {
  const uint8Array = new Uint8Array(buffer.slice(0, 12)) // Check first 12 bytes
  
  switch (fileType) {
    case 'midi':
      // Check for MIDI "MThd" header
      return [0x4d, 0x54, 0x68, 0x64].every((byte, i) => uint8Array[i] === byte)
      
    case 'audio':
      // For audio, we need to check the actual extension/mime type
      if (buffer.byteLength < 4) return false
      
      // Check for MP3
      if ([0xff, 0xfb].every((byte, i) => uint8Array[i] === byte) ||
          [0xff, 0xf3].every((byte, i) => uint8Array[i] === byte) ||
          [0xff, 0xf2].every((byte, i) => uint8Array[i] === byte) ||
          [0x49, 0x44, 0x33].every((byte, i) => uint8Array[i] === byte)) {
        return true
      }
      
      // Check for WAV
      if ([0x52, 0x49, 0x46, 0x46].every((byte, i) => uint8Array[i] === byte) &&
          uint8Array.length >= 12 &&
          [0x57, 0x41, 0x56, 0x45].every((byte, i) => uint8Array[i + 8] === byte)) {
        return true
      }
      
      return false
      
    case 'video':
      if (buffer.byteLength < 8) return false
      
      // Check for MP4
      if (uint8Array.length >= 8 && 
          ([0x66, 0x74, 0x79, 0x70].every((byte, i) => uint8Array[i + 4] === byte))) {
        return true
      }
      
      // Check for WebM
      if ([0x1a, 0x45, 0xdf, 0xa3].every((byte, i) => uint8Array[i] === byte)) {
        return true
      }
      
      return false
      
    case 'image':
      if (buffer.byteLength < 8) return false
      
      // Check for JPEG
      if ([0xff, 0xd8, 0xff].every((byte, i) => uint8Array[i] === byte)) {
        return true
      }
      
      // Check for PNG
      if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => uint8Array[i] === byte)) {
        return true
      }
      
      // Check for GIF
      if ([0x47, 0x49, 0x46, 0x38].every((byte, i) => uint8Array[i] === byte) &&
          (uint8Array[4] === 0x37 || uint8Array[4] === 0x39) &&
          uint8Array[5] === 0x61) {
        return true
      }
      
      // Check for WebP (RIFF container)
      if ([0x52, 0x49, 0x46, 0x46].every((byte, i) => uint8Array[i] === byte) &&
          uint8Array.length >= 12 &&
          [0x57, 0x45, 0x42, 0x50].every((byte, i) => uint8Array[i + 8] === byte)) {
        return true
      }
      
      return false
      
    default:
      return false
  }
}

// Main file validation function - UPDATED
export function validateFile(input: FileUploadInput): ValidatedFile {
  const errors: string[] = []
  const { fileName, fileSize, mimeType } = input
  
  // Validate file extension and determine type
  const fileType = validateFileExtension(fileName)
  if (!fileType) {
    errors.push('Invalid file type. Allowed types: .mid, .midi, .mp3, .wav, .mp4, .mov, .webm, .jpg, .jpeg, .png, .gif, .webp')
  }
  
  let result: ValidatedFile = {
    fileName,
    fileType: fileType || 'midi', // Default to midi to avoid type errors
    mimeType,
    fileSize,
    isValid: false,
    errors,
  }
  
  if (!fileType) {
    return result
  }
  
  // Update result with determined file type
  result.fileType = fileType
  
  // Validate MIME type
  if (!validateMimeType(mimeType, fileType)) {
    errors.push(`Invalid MIME type for ${fileType} file. Allowed types: ${ALLOWED_MIME_TYPES[fileType].join(', ')}`)
  }
  
  // Validate file size
  if (!validateFileSize(fileSize, fileType)) {
    const maxSizeMB = FILE_SIZE_LIMITS[fileType] / (1024 * 1024)
    errors.push(`File size exceeds limit. Maximum size for ${fileType} files: ${maxSizeMB}MB`)
  }
  
  // Validate file name
  if (fileName.length > 255) {
    errors.push('File name is too long (maximum 255 characters)')
  }
  
  result.errors = errors
  result.isValid = errors.length === 0
  
  return result
}

// Sanitize file name for storage
export function sanitizeFileName(fileName: string): string {
  // Replace unsafe characters with underscores
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
}

// Get file extension
export function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
}

// Check if file is executable (security check)
export function isExecutableFile(fileName: string): boolean {
  const executableExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
    '.sh', '.bash', '.zsh', '.csh', '.fish',
    '.ps1', '.vbs', '.js', '.jar', '.app',
  ]
  
  const extension = getFileExtension(fileName)
  return executableExtensions.includes(extension)
}

// Rate limiting helper for uploads
export function createUploadRateLimit() {
  const uploads = new Map<string, number[]>()
  const WINDOW_MS = 60 * 1000 // 1 minute
  const MAX_UPLOADS = 10 // Max uploads per minute per user
  
  return {
    checkRateLimit: (userId: string): boolean => {
      const now = Date.now()
      const userUploads = uploads.get(userId) || []
      
      // Remove old timestamps
      const recentUploads = userUploads.filter(timestamp => 
        now - timestamp < WINDOW_MS
      )
      
      // Check if under limit
      if (recentUploads.length >= MAX_UPLOADS) {
        return false
      }
      
      // Add current upload
      recentUploads.push(now)
      uploads.set(userId, recentUploads)
      
      return true
    },
    
    getRemainingUploads: (userId: string): number => {
      const now = Date.now()
      const userUploads = uploads.get(userId) || []
      const recentUploads = userUploads.filter(timestamp => 
        now - timestamp < WINDOW_MS
      )
      
      return Math.max(0, MAX_UPLOADS - recentUploads.length)
    }
  }
}
</file>

<file path="apps/api/src/services/audio-analysis-processor.ts">
import { createClient } from '@supabase/supabase-js';
import { AudioAnalyzer } from './audio-analyzer';
import { getFileBuffer } from './r2-storage';
import { buffer } from 'stream/consumers';
import { logger } from '../lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class AudioAnalysisProcessor {
  static async processJob(job: { id: string, user_id: string, file_metadata_id: string }): Promise<void> {
    await this.updateJobStatus(job.id, 'processing');

    try {
      const { data: fileMetadata, error: fileError } = await supabase
        .from('file_metadata')
        .select('s3_key, file_name, id')
        .eq('id', job.file_metadata_id)
        .single();

      if (fileError || !fileMetadata) {
        throw new Error(`Failed to fetch file metadata for job ${job.id}: ${fileError?.message}`);
      }
      
      const fileBuffer = await getFileBuffer(fileMetadata.s3_key);
      const audioAnalyzer = new AudioAnalyzer();
      const stemType = fileMetadata.file_name.replace(/\.[^/.]+$/, '');

      await audioAnalyzer.analyzeAndCache(
        fileMetadata.id,
        job.user_id,
        stemType,
        fileBuffer
      );

      await this.updateJobStatus(job.id, 'completed');
    } catch (error: any) {
      logger.error(`Error processing audio analysis job ${job.id}:`, error);
      await this.updateJobStatus(job.id, 'failed', error.message);
    }
  }

  private static async updateJobStatus(jobId: string, status: 'processing' | 'completed' | 'failed', error?: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('audio_analysis_jobs')
      .update({ status, error: error, updated_at: new Date().toISOString() })
      .eq('id', jobId);

    if (updateError) {
      logger.error(`Failed to update status for audio analysis job ${jobId}:`, updateError);
    }
  }
}
</file>

<file path="apps/api/src/services/audio-analyzer.ts">
import { createClient } from '@supabase/supabase-js';
import { getFileBuffer } from './r2-storage';
import { logger } from '../lib/logger';
import { Reader } from 'wav';
import { Writable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';

// Audio analysis types

/**
 * Represents the detailed, time-series audio analysis data for a single track.
 * The keys are feature names (e.g., "rms", "spectralCentroid", "mfcc_0").
 * The values are arrays of numbers, representing the feature's value over time.
 */
export type AudioAnalysisData = Record<string, number[]>;


export interface FeatureMarker {
  time: number;
  type: 'beat' | 'onset' | 'peak' | 'drop';
  intensity: number;
  frequency?: number;
}

export interface WaveformData {
  points: number[];
  sampleRate: number;
  duration: number;
  markers: FeatureMarker[];
}

export interface CachedAnalysis {
  id: string;
  fileMetadataId: string;
  stemType: string;
  analysisData: AudioAnalysisData; // This now correctly refers to the time-series data type
  waveformData: WaveformData;
  metadata: {
    sampleRate: number;
    duration: number;
    bufferSize: number;
    featuresExtracted: string[];
    analysisDuration: number;
  };
}

export class AudioAnalyzer {
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is required');
    }
    
    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Analyze an audio file and cache the results
   */
  async analyzeAndCache(
    fileMetadataId: string,
    userId: string,
    stemType: string,
    audioBuffer: Buffer
  ): Promise<CachedAnalysis> {
    const startTime = Date.now();
    
    try {
      logger.log(`🎵 Starting audio analysis for ${stemType} stem (file: ${fileMetadataId})`);
      
      // Convert any audio format to WAV first
      const wavBuffer = await this.convertToWav(audioBuffer);

      // Analyze the audio buffer
      const analysisData = await this.analyzeAudioBuffer(wavBuffer);
      const waveformData = await this.generateWaveformData(wavBuffer);
      
      const analysisDuration = Date.now() - startTime;
      
      // Prepare metadata
      const metadata = {
        sampleRate: 44100, // Assuming standard sample rate
        duration: waveformData.duration,
        bufferSize: 512, // The buffer size used for chunking analysis
        featuresExtracted: Object.keys(analysisData),
        analysisDuration
      };
      
      // Cache the analysis results
      const { data: cachedAnalysis, error } = await this.supabase
        .from('audio_analysis_cache')
        .insert({
          user_id: userId,
          file_metadata_id: fileMetadataId,
          stem_type: stemType,
          analysis_version: '1.0',
          sample_rate: metadata.sampleRate,
          duration: metadata.duration,
          buffer_size: metadata.bufferSize,
          features_extracted: metadata.featuresExtracted,
          analysis_data: analysisData,
          waveform_data: waveformData,
          analysis_duration: analysisDuration
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to cache analysis: ${error.message}`);
      }
      
      logger.log(`✅ Audio analysis completed for ${stemType} stem in ${analysisDuration}ms`);
      
      return {
        id: cachedAnalysis.id,
        fileMetadataId,
        stemType,
        analysisData,
        waveformData,
        metadata
      };
      
    } catch (error) {
      logger.error(`❌ Audio analysis failed for ${stemType} stem:`, error);
      throw error;
    }
  }

  /**
   * Retrieve cached analysis for a file
   */
  async getCachedAnalysis(
    fileMetadataId: string,
    userId: string,
    stemType?: string
  ): Promise<CachedAnalysis | null> {
    try {
      // Check if this is a guest user
      const isGuestUser = userId.startsWith('guest_');
      
      let query = this.supabase
        .from('audio_analysis_cache')
        .select('*')
        .eq('file_metadata_id', fileMetadataId);
      
      // Only filter by user_id for authenticated users
      if (!isGuestUser) {
        query = query.eq('user_id', userId);
      }
      
      if (stemType) {
        query = query.eq('stem_type', stemType);
      }
      
      const { data, error } = await query;
      
      logger.log('getCachedAnalysis query:', { fileMetadataId, userId, stemType });
      logger.log('getCachedAnalysis result:', data);
      
      if (error) {
        throw new Error(`Failed to retrieve cached analysis: ${error.message}`);
      }
      
      // For guest users, return null since they won't have cached analysis
      if (isGuestUser) {
        return null;
      }
      
      if (Array.isArray(data) && data.length > 0) {
        const row = data[0];
        return {
          id: row.id,
          fileMetadataId: row.file_metadata_id,
          stemType: row.stem_type,
          analysisData: row.analysis_data,
          waveformData: row.waveform_data,
          metadata: {
            sampleRate: row.sample_rate,
            duration: row.duration,
            bufferSize: row.buffer_size,
            featuresExtracted: row.features_extracted,
            analysisDuration: row.analysis_duration
          }
        };
      }
      return null;
    } catch (error) {
      logger.error('❌ Failed to retrieve cached analysis:', error);
      throw error;
    }
  }

  /**
   * Retrieve cached analysis for multiple files
   */
  async getBatchCachedAnalysis(
    fileMetadataIds: string[],
    userId: string,
    stemType?: string
  ): Promise<CachedAnalysis[]> {
    try {
      // Check if this is a guest user
      const isGuestUser = userId.startsWith('guest_');
      if (isGuestUser) return [];

      let query = this.supabase
        .from('audio_analysis_cache')
        .select('*')
        .in('file_metadata_id', fileMetadataIds)
        .eq('user_id', userId);

      if (stemType) {
        query = query.eq('stem_type', stemType);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Failed to retrieve batch cached analysis: ${error.message}`);
      }
      if (!Array.isArray(data) || data.length === 0) return [];
      return data.map(row => ({
        id: row.id,
        fileMetadataId: row.file_metadata_id,
        stemType: row.stem_type,
        analysisData: row.analysis_data,
        waveformData: row.waveform_data,
        metadata: {
          sampleRate: row.sample_rate,
          duration: row.duration,
          bufferSize: row.buffer_size,
          featuresExtracted: row.features_extracted,
          analysisDuration: row.analysis_duration
        }
      }));
    } catch (error) {
      logger.error('getBatchCachedAnalysis error:', error);
      throw error;
    }
  }

  /**
   * Convert any audio format to a WAV buffer for analysis
   */
  private async convertToWav(inputBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const readableStream = new PassThrough();
      readableStream.end(inputBuffer);

      const chunks: Buffer[] = [];
      const writableStream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });

      writableStream.on('finish', () => {
        resolve(Buffer.concat(chunks));
      });

      writableStream.on('error', err => {
        reject(new Error(`FFmpeg conversion error: ${err.message}`));
      });

      ffmpeg(readableStream)
        .toFormat('wav')
        .on('error', (err) => {
          // This error handler is crucial for catching FFmpeg-specific errors
          reject(new Error(`FFmpeg processing error: ${err.message}`));
        })
        .pipe(writableStream);
    });
  }

  /**
   * Analyze an audio buffer and return structured data
   */
  private async analyzeAudioBuffer(buffer: Buffer): Promise<AudioAnalysisData> {
    try {
      const samples = await this.getAudioSamples(buffer);
      const sampleRate = 44100; // Standard assumption
      const frameSize = 1024; // A common frame size for analysis
      const hopLength = 512;   // Overlap for smoother results

      // Expanded feature set for comprehensive analysis
      const features: AudioAnalysisData = {
        rms: [],
        spectralCentroid: [],
        spectralRolloff: [],
        spectralFlatness: [],
        spectralSpread: [],
        zcr: [],
        loudness: [],
        energy: [],
        mfcc_0: [],
        mfcc_1: [],
        mfcc_2: [],
        mfcc_3: [],
        mfcc_4: [],
        mfcc_5: [],
        mfcc_6: [],
        mfcc_7: [],
        mfcc_8: [],
        mfcc_9: [],
        mfcc_10: [],
        mfcc_11: [],
        mfcc_12: [],
        perceptualSpread: [],
        perceptualSharpness: [],
        chroma_0: [], chroma_1: [], chroma_2: [], chroma_3: [], chroma_4: [], chroma_5: [],
        chroma_6: [], chroma_7: [], chroma_8: [], chroma_9: [], chroma_10: [], chroma_11: [],
      };
      
      const featureNames = Object.keys(features) as (keyof typeof features)[];

      // Process audio in frames
      for (let i = 0; i + frameSize <= samples.length; i += hopLength) {
        const frame = samples.subarray(i, i + frameSize);
        
        for (const featureName of featureNames) {
          let value: number;
          switch (featureName) {
            case 'rms':
              value = this.calculateRMS(frame);
              break;
            case 'spectralCentroid':
              value = this.calculateSpectralCentroid(frame);
              break;
            case 'spectralRolloff':
              value = this.calculateSpectralRolloff(frame);
              break;
            case 'spectralFlatness':
              value = this.calculateSpectralFlatness(frame);
              break;
            case 'spectralSpread':
              value = this.calculateSpectralSpread(frame);
              break;
            case 'zcr':
              value = this.calculateZCR(frame);
              break;
            case 'loudness':
              value = this.calculateLoudness(frame);
              break;
            case 'energy':
              value = this.calculateEnergy(frame);
              break;
            case 'perceptualSpread':
              value = this.calculatePerceptualSpread(frame);
              break;
            case 'perceptualSharpness':
              value = this.calculatePerceptualSharpness(frame);
              break;
                          default:
                if (featureName.startsWith('mfcc_')) {
                  const parts = featureName.split('_');
                  const mfccIndex = parts[1] ? parseInt(parts[1]) : 0;
                  const mfccValues = this.calculateMFCC(frame);
                  value = mfccValues[mfccIndex] || 0;
                } else if (featureName.startsWith('chroma_')) {
                  const parts = featureName.split('_');
                  const chromaIndex = parts[1] ? parseInt(parts[1]) : 0;
                  const chromaValues = this.calculateChromaVector(frame);
                  value = chromaValues[chromaIndex] || 0;
                } else {
                  value = 0;
                }
          }
          const featureArray = features[featureName];
          if(featureArray) {
            featureArray.push(value);
          }
        }
      }

      // Normalize all feature arrays between 0 and 1
      for (const featureName of featureNames) {
        const values = features[featureName];
        if (!values || values.length === 0) continue;

        const maxVal = Math.max(...values);
        const minVal = Math.min(...values);
        const range = maxVal - minVal;
        
        if (range > 0) {
          features[featureName] = values.map(v => (v - minVal) / range);
        } else if (maxVal > 0) {
          // If all values are the same but non-zero, normalize to 0.5
          features[featureName] = values.map(() => 0.5);
        }
      }

      return features;

    } catch (error) {
      logger.error('Error analyzing audio buffer:', error);
      throw new Error('Failed to analyze audio buffer.');
    }
  }

  private async getAudioSamples(buffer: Buffer): Promise<Int16Array> {
    return new Promise((resolve, reject) => {
      const readable = new PassThrough();
      readable.end(buffer);
      const chunks: Buffer[] = [];
      readable
        .pipe(new Reader())
        .on('format', format => {
          if (format.audioFormat !== 1) { // 1 is PCM
            return reject(new Error('Only WAV files with PCM audio format are supported for direct analysis.'));
          }
        })
        .pipe(new Writable({
          write(chunk, encoding, callback) {
            chunks.push(chunk);
            callback();
          }
        }))
        .on('finish', () => {
          const pcmData = Buffer.concat(chunks);
          // Assuming 16-bit signed PCM
          const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);
          resolve(samples);
        })
        .on('error', reject);
    });
  }

  /**
   * Generate waveform data from an audio buffer
   */
  private async generateWaveformData(buffer: Buffer): Promise<WaveformData> {
    return new Promise((resolve, reject) => {
      const reader = new Reader();
      const samples: number[] = [];
      let format: any = {};

      reader.on('format', (f: any) => {
        format = f;
      });

      reader.on('data', (chunk: Buffer) => {
        if (!format || !format.byteRate || !format.sampleRate) return;
        for (let i = 0; i < chunk.length; i += 2) { // Assuming 16-bit audio
          if (chunk.length >= i + 2) {
            samples.push(chunk.readInt16LE(i) / 32768); // Normalize to -1 to 1
          }
        }
      });

      reader.on('end', () => {
        if (!format.sampleRate || samples.length === 0) {
          // Fallback for non-WAV files or empty files
          const duration = 10; // Assume 10s
          const sampleRate = 44100;
          const numPoints = 1000;
          const points = Array.from({ length: numPoints }, () => (Math.random() * 2 - 1) * 0.1);
          logger.warn('⚠️ Could not decode WAV, generating fallback waveform.');
          return resolve({
            points: points,
            sampleRate: sampleRate,
            duration: duration,
            markers: [],
          });
        }
        
        const downsampleFactor = Math.max(1, Math.floor(samples.length / 2000)); // Max 2000 points
        const downsampled: number[] = [];
        for (let i = 0; i < samples.length; i += downsampleFactor) {
          const sample = samples[i];
          if (sample !== undefined) {
            downsampled.push(sample);
          }
        }

        const duration = samples.length / format.sampleRate;
        
        resolve({
          points: downsampled,
          sampleRate: format.sampleRate,
          duration: duration,
          markers: [], // Placeholder for future marker detection
        });
      });

      reader.on('error', (err: Error) => {
        logger.error('❌ Error decoding audio file for waveform:', err);
        // Fallback for decoding errors
        const duration = 10;
        const sampleRate = 44100;
        const numPoints = 1000;
        const points = Array.from({ length: numPoints }, () => (Math.random() * 2 - 1) * 0.1);
        resolve({
          points: points,
          sampleRate: sampleRate,
          duration: duration,
          markers: [],
        });
      });

      // Pipe the buffer into the WAV reader
      const bufferStream = new Writable();
      bufferStream._write = (chunk: any, encoding: any, next: any) => {
        reader.write(chunk);
        next();
      };
      bufferStream.end(buffer);
    });
  }

  // Helper methods for audio analysis
  private calculateRMS(samples: Int16Array): number {
    let sumOfSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumOfSquares += ((samples[i] ?? 0) / 32768) ** 2;
    }
    return Math.sqrt(sumOfSquares / samples.length);
  }

  private calculateSpectralCentroid(samples: Int16Array): number {
    let weightedSum = 0;
    let sum = 0;
    const fftData = this.performFFT(samples);

    for (let i = 0; i < fftData.length; i++) {
      const freq = (i * 44100) / fftData.length;
      const magnitude = Math.abs(fftData[i] ?? 0);
      weightedSum += freq * magnitude;
      sum += magnitude;
    }

    return sum > 0 ? weightedSum / sum : 0;
  }

  private calculateSpectralRolloff(samples: Int16Array): number {
    const fftData = this.performFFT(samples);
    const totalEnergy = fftData.reduce((sum, val) => sum + Math.abs(val) ** 2, 0);
    const threshold = totalEnergy * 0.85; // 85% energy threshold
    
    let cumulativeEnergy = 0;
    for (let i = 0; i < fftData.length; i++) {
      cumulativeEnergy += Math.abs(fftData[i] ?? 0) ** 2;
      if (cumulativeEnergy >= threshold) {
        return (i * 44100) / fftData.length;
      }
    }
    return 22050; // Nyquist frequency as fallback
  }

  private calculateSpectralFlatness(samples: Int16Array): number {
    const fftData = this.performFFT(samples);
    const magnitudes = fftData.map(val => Math.abs(val ?? 0));
    
    const geometricMean = Math.exp(
      magnitudes.reduce((sum, mag) => sum + Math.log(Math.max(mag, 1e-10)), 0) / magnitudes.length
    );
    const arithmeticMean = magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length;
    
    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
  }

  private calculateSpectralSpread(samples: Int16Array): number {
    const fftData = this.performFFT(samples);
    const centroid = this.calculateSpectralCentroid(samples);
    
    let weightedSum = 0;
    let sum = 0;
    
    for (let i = 0; i < fftData.length; i++) {
      const freq = (i * 44100) / fftData.length;
      const magnitude = Math.abs(fftData[i] ?? 0);
      const diff = freq - centroid;
      weightedSum += (diff ** 2) * magnitude;
      sum += magnitude;
    }
    
    return sum > 0 ? Math.sqrt(weightedSum / sum) : 0;
  }

  private calculateZCR(samples: Int16Array): number {
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      const prev = (samples[i - 1] ?? 0) / 32768;
      const curr = (samples[i] ?? 0) / 32768;
      if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
        crossings++;
      }
    }
    return crossings / samples.length;
  }

  private calculateLoudness(samples: Int16Array): number {
    // Simplified loudness calculation using A-weighting approximation
    const fftData = this.performFFT(samples);
    let weightedSum = 0;
    
    for (let i = 0; i < fftData.length; i++) {
      const freq = (i * 44100) / fftData.length;
      const magnitude = Math.abs(fftData[i] ?? 0);
      
      // Simplified A-weighting curve
      let aWeight = 1;
      if (freq < 1000) {
        aWeight = 0.5 + 0.5 * (freq / 1000);
      } else if (freq > 1000) {
        aWeight = 1 - 0.3 * Math.log10(freq / 1000);
      }
      
      weightedSum += magnitude * aWeight;
    }
    
    return weightedSum / fftData.length;
  }

  private calculateMFCC(samples: Int16Array): number[] {
    // Simplified MFCC calculation
    const fftData = this.performFFT(samples);
    const magnitudes = fftData.map(val => Math.abs(val ?? 0));
    
    // Simple mel-scale filter bank (13 coefficients)
    const mfcc = [];
    for (let i = 0; i < 13; i++) {
      let sum = 0;
      for (let j = 0; j < magnitudes.length; j++) {
        const freq = (j * 44100) / magnitudes.length;
        const melFreq = 2595 * Math.log10(1 + freq / 700);
        const filterWeight = Math.exp(-((melFreq - i * 200) ** 2) / (2 * 100 ** 2));
        sum += (magnitudes[j] ?? 0) * filterWeight;
      }
      mfcc.push(Math.log(Math.max(sum, 1e-10)));
    }
    
    return mfcc;
  }

  private calculateEnergy(samples: Int16Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += ((samples[i] ?? 0) / 32768) ** 2;
    }
    return sum / samples.length;
  }

  private calculatePerceptualSpread(samples: Int16Array): number {
    // Simplified perceptual spread using spectral centroid and spread
    const centroid = this.calculateSpectralCentroid(samples);
    const spread = this.calculateSpectralSpread(samples);
    return spread / Math.max(centroid, 1);
  }

  private calculatePerceptualSharpness(samples: Int16Array): number {
    // Simplified sharpness calculation
    const fftData = this.performFFT(samples);
    let weightedSum = 0;
    let sum = 0;
    
    for (let i = 0; i < fftData.length; i++) {
      const freq = (i * 44100) / fftData.length;
      const magnitude = Math.abs(fftData[i] ?? 0);
      
      // Sharpness increases with frequency
      const sharpnessWeight = Math.min(freq / 10000, 1);
      weightedSum += magnitude * sharpnessWeight;
      sum += magnitude;
    }
    
    return sum > 0 ? weightedSum / sum : 0;
  }

  private calculateChromaVector(samples: Int16Array): number[] {
    // Simplified chroma vector (12 semitones)
    const fftData = this.performFFT(samples);
    const chroma = new Array(12).fill(0);
    
    for (let i = 0; i < fftData.length; i++) {
      const freq = (i * 44100) / fftData.length;
      if (freq > 0) {
        // Convert frequency to semitone
        const semitone = Math.round(12 * Math.log2(freq / 440)) % 12;
        const magnitude = Math.abs(fftData[i] ?? 0);
        chroma[semitone] += magnitude;
      }
    }
    
    // Normalize
    const maxVal = Math.max(...chroma);
    return maxVal > 0 ? chroma.map(val => val / maxVal) : chroma;
  }

  private generateFrequencyData(samples: Int16Array): number[] {
    const fftData = this.performFFT(samples);
    return Array.from(fftData.slice(0, fftData.length / 2)).map(val => Math.abs(val ?? 0));
  }

  private generateTimeData(samples: Int16Array): number[] {
    const downsampled: number[] = [];
    const factor = Math.floor(samples.length / 1024);
    if (factor < 1) return Array.from(samples).map(s => (s ?? 0) / 32768);
    for (let i = 0; i < samples.length; i += factor) {
      const sample = samples[i];
      if (sample !== undefined) {
        downsampled.push(sample / 32768);
      }
    }
    return downsampled;
  }

  private calculateBandEnergy(frequencies: number[], minFreq: number, maxFreq: number): number {
    if (frequencies.length === 0) return 0;
    const sampleRate = 44100;
    const binWidth = sampleRate / 2 / frequencies.length;
    
    const startBin = Math.floor(minFreq / binWidth);
    const endBin = Math.ceil(maxFreq / binWidth);
    
    let sum = 0;
    for (let i = startBin; i <= endBin && i < frequencies.length; i++) {
      const freq = frequencies[i];
      if (freq !== undefined) {
        sum += freq;
      }
    }
    return sum;
  }

  private detectFeatureMarkers(samples: Int16Array): FeatureMarker[] {
    // Simplified placeholder
    return [];
  }

  /**
   * Simplified FFT implementation
   */
  private performFFT(samples: Int16Array): Float32Array {
    const floatSamples = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      floatSamples[i] = sample !== undefined ? sample / 32768 : 0;
    }
    return this.simpleFFT(floatSamples);
  }

  private simpleFFT(samples: Float32Array): Float32Array {
    const N = samples.length;
    if (N <= 1) return samples;

    // Radix-2 FFT
    if (N % 2 !== 0) {
      // For non-power-of-2, you'd need a more complex FFT or padding.
      // For simplicity, we'll just return magnitudes of 0.
      logger.warn(`FFT size is not a power of 2 (${N}), which is not optimal. Padding or a different FFT algorithm should be used.`);
      return new Float32Array(N / 2);
    }

    const even = this.simpleFFT(samples.filter((_, i) => i % 2 === 0));
    const odd = this.simpleFFT(samples.filter((_, i) => i % 2 !== 0));

    const result = new Float32Array(N / 2);
    for (let k = 0; k < N / 2; k++) {
      const t_val = odd[k];
      const e_val = even[k];

      if (t_val !== undefined && e_val !== undefined) {
        const t = t_val * Math.cos(-2 * Math.PI * k / N);
        const e = e_val;
        result[k] = Math.sqrt((e + t) ** 2);
      } else {
        result[k] = 0; // Assign a default value if components are undefined
      }
    }
    return result;
  }
}
</file>

<file path="apps/api/src/services/media-processor.ts">
import { VideoMetadata, ImageMetadata } from '../lib/file-validation'
import { logger } from '../lib/logger';

export class MediaProcessor {
  
  /**
   * Extract video metadata from buffer
   * For now, this is a placeholder implementation - in production would use ffprobe
   */
  static async extractVideoMetadata(buffer: Buffer, fileName: string): Promise<VideoMetadata> {
    // Placeholder implementation - would use ffprobe in production
    // For development, return mock data based on file extension
    const extension = fileName.toLowerCase().split('.').pop()
    
    // Mock metadata for development
    const mockMetadata: VideoMetadata = {
      duration: 60, // 1 minute default
      width: 1920,
      height: 1080,
      frameRate: 30,
      codec: extension === 'webm' ? 'vp9' : 'h264',
      bitrate: 5000, // 5 Mbps
      aspectRatio: '16:9'
    }
    
    // Note: Using mock metadata for development - replace with actual ffprobe implementation in production
    
    return mockMetadata
  }
  
  /**
   * Generate video thumbnail from buffer
   * For now, this is a placeholder - in production would use ffmpeg
   */
  static async generateVideoThumbnail(
    buffer: Buffer, 
    fileName: string,
    timestampSec: number = 1
  ): Promise<Buffer> {
    // Placeholder implementation - would use ffmpeg in production
    // Return a minimal 1x1 pixel JPEG as placeholder
    const placeholderJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
      0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xff, 0xc4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x0c,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00, 0xb2, 0xc0,
      0x07, 0xff, 0xd9
    ])
    
    // Note: Using mock thumbnail for development - replace with actual ffmpeg implementation in production
    // const thumbnail = await this.runFFMpeg(buffer, timestampSec);
    
    return placeholderJpeg
  }
  
  /**
   * Extract image metadata from buffer
   * For now, this is a placeholder - in production would use sharp
   */
  static async extractImageMetadata(buffer: Buffer, fileName: string): Promise<ImageMetadata> {
    const extension = fileName.toLowerCase().split('.').pop()
    
    // Mock metadata for development
    const mockMetadata: ImageMetadata = {
      width: 1920,
      height: 1080,
      colorProfile: 'sRGB',
      orientation: 1, // Normal orientation
      hasAlpha: extension === 'png' || extension === 'gif' || extension === 'webp',
      fileFormat: extension?.toUpperCase() || 'JPEG'
    }
    
    // Note: Using mock image processing for development - replace with actual sharp implementation in production
    // const metadata = await sharp(buffer).metadata();
    
    return mockMetadata
  }
  
  /**
   * Generate image thumbnail
   * For now, this is a placeholder - in production would use sharp
   */
  static async generateImageThumbnail(
    buffer: Buffer,
    fileName: string,
    maxWidth: number = 300,
    maxHeight: number = 300
  ): Promise<Buffer> {
    // Placeholder implementation - return a small JPEG thumbnail
    const placeholderThumbnail = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
      0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xff, 0xc4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x0c,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00, 0xb2, 0xc0,
      0x07, 0xff, 0xd9
    ])
    
    // Note: Using mock thumbnail for development - replace with actual sharp implementation in production
    // const thumbnail = await sharp(buffer)
    //   .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
    //   .jpeg({ quality: 80 })
    //   .toBuffer();
    
    return placeholderThumbnail
  }
  
  /**
   * Process uploaded file - extract metadata and generate thumbnails
   * This would run in background after file upload
   */
  static async processUploadedFile(
    buffer: Buffer,
    fileName: string,
    fileType: 'video' | 'image',
    fileId: string
  ): Promise<{
    metadata: VideoMetadata | ImageMetadata;
    thumbnail: Buffer;
    thumbnailKey: string;
  }> {
    try {
      let metadata: VideoMetadata | ImageMetadata
      let thumbnail: Buffer
      
      if (fileType === 'video') {
        metadata = await this.extractVideoMetadata(buffer, fileName)
        thumbnail = await this.generateVideoThumbnail(buffer, fileName)
      } else {
        metadata = await this.extractImageMetadata(buffer, fileName)
        thumbnail = await this.generateImageThumbnail(buffer, fileName)
      }
      
      // Generate thumbnail key for storage
      const extension = fileName.split('.').pop()
      const thumbnailKey = `thumbnails/${fileId}_thumb.jpg`
      
      return {
        metadata,
        thumbnail,
        thumbnailKey
      }
      
    } catch (error) {
      logger.error('Error processing media file:', error)
      throw error
    }
  }
  
  /**
   * Generate R2 storage key for thumbnails
   */
  static generateThumbnailKey(originalKey: string): string {
    const lastDotIndex = originalKey.lastIndexOf('.')
    const baseKey = lastDotIndex > -1 ? originalKey.substring(0, lastDotIndex) : originalKey
    return `${baseKey}_thumb.jpg`
  }
  
  /**
   * Check if file type requires processing
   */
  static requiresProcessing(fileType: string): boolean {
    return fileType === 'video' || fileType === 'image'
  }
}
</file>

<file path="apps/api/src/services/r2-storage.ts">
import { S3Client, CreateBucketCommand, PutBucketCorsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../lib/logger';

// Cloudflare R2 Configuration (S3-Compatible)
const r2Config = {
  region: 'auto', // R2 uses 'auto' region
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
  // R2-specific configuration
  forcePathStyle: true, // Required for R2
};

export const r2Client = new S3Client(r2Config);
export const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || 'phonoglyph-uploads';

// Validate required environment variables
export function validateR2Config(): void {
  const required = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_BUCKET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Cloudflare R2 environment variables: ${missing.join(', ')}`);
  }
}

// Create R2 bucket if it doesn't exist
export async function createBucketIfNotExists(): Promise<void> {
  try {
    // Check if bucket exists
    await (r2Client as any).send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    logger.log(`✅ R2 bucket '${BUCKET_NAME}' already exists`);
  } catch (error: any) {
    if (error.name === 'NotFound') {
      try {
        await (r2Client as any).send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        logger.log(`✅ Created R2 bucket '${BUCKET_NAME}'`);
      } catch (createError) {
        logger.error('❌ Failed to create R2 bucket:', createError);
        throw createError;
      }
    } else {
      logger.error('❌ Error checking R2 bucket:', error);
      throw error;
    }
  }
}

// Configure CORS for web uploads
export async function configureBucketCors(): Promise<void> {
  const corsConfiguration = {
    CORSRules: [
      {
        AllowedOrigins: [
          process.env.FRONTEND_URL || 'http://localhost:3000',
          'https://*.vercel.app', // For preview deployments
        ],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedHeaders: [
          'Origin',
          'X-Requested-With',
          'Content-Type',
          'Accept',
          'Authorization',
          'Cache-Control',
          'x-amz-date',
          'x-amz-security-token',
        ],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3000,
      },
    ],
  };

  try {
    await (r2Client as any).send(new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsConfiguration,
    }));
    logger.log(`✅ Configured CORS for R2 bucket '${BUCKET_NAME}'`);
  } catch (error) {
    logger.error('❌ Failed to configure CORS:', error);
    throw error;
  }
}

// Generate pre-signed URL for file upload
export async function generateUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  try {
    const url = await getSignedUrl(r2Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error('❌ Failed to generate upload URL:', error);
    throw error;
  }
}

// Generate pre-signed URL for file download
export async function generateDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const url = await getSignedUrl(r2Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error('❌ Failed to generate download URL:', error);
    throw error;
  }
}

// Get file data as Buffer for processing
export async function getFileBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const response = await (r2Client as any).send(command);
    
    if (!response.Body) {
      throw new Error(`File not found: ${key}`);
    }

    // Convert ReadableStream to Buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    logger.error(`❌ Failed to get file buffer for ${key}:`, error);
    throw error;
  }
}

// Delete file from R2
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await (r2Client as any).send(command);
    logger.log(`✅ Deleted file: ${key}`);
  } catch (error) {
    logger.error(`❌ Failed to delete file ${key}:`, error);
    throw error;
  }
}

// Generate S3 key with proper organization - EXTENDED for video/image
export function generateS3Key(
  userId: string, 
  fileName: string, 
  fileType: 'midi' | 'audio' | 'video' | 'image'
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${fileType}/${userId}/${timestamp}_${sanitizedFileName}`;
}

// Generate thumbnail key for processed media
export function generateThumbnailKey(originalKey: string): string {
  const lastDotIndex = originalKey.lastIndexOf('.');
  const baseKey = lastDotIndex > -1 ? originalKey.substring(0, lastDotIndex) : originalKey;
  return `${baseKey}_thumb.jpg`;
}

// Upload thumbnail to R2
export async function uploadThumbnail(
  thumbnailKey: string,
  thumbnailBuffer: Buffer
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: thumbnailKey,
    Body: thumbnailBuffer,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000', // 1 year cache
  });

  try {
    await (r2Client as any).send(command);
    return thumbnailKey;
  } catch (error) {
    logger.error('❌ Failed to upload thumbnail:', error);
    throw error;
  }
}

// Generate download URL for thumbnails
export async function generateThumbnailUrl(
  thumbnailKey: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const url = await generateDownloadUrl(thumbnailKey, expiresIn);
    return url;
  } catch (error) {
    logger.error('❌ Failed to generate thumbnail URL:', error);
    throw error;
  }
}

// Initialize R2 service
export async function initializeR2(): Promise<void> {
  logger.log('🚀 Initializing Cloudflare R2 service...');
  
  try {
    validateR2Config();
    await createBucketIfNotExists();
    
    // Try to configure CORS, but don't fail if permissions are insufficient
    try {
      await configureBucketCors();
    } catch (corsError: any) {
      if (corsError.Code === 'AccessDenied') {
        logger.log('⚠️  CORS configuration skipped (insufficient permissions - this is OK for development)');
      } else {
        throw corsError;
      }
    }
    
    logger.log('✅ R2 service initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize R2 service:', error);
    throw error;
  }
}

// Test R2 connectivity
export async function testR2Connection(): Promise<boolean> {
  try {
    await (r2Client as any).send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    return true;
  } catch (error) {
    logger.error('❌ R2 connection test failed:', error);
    return false;
  }
}

// Legacy compatibility - export as s3Client for existing code
export { r2Client as s3Client };
export { initializeR2 as initializeS3 };
export { testR2Connection as testS3Connection };
export { validateR2Config as validateS3Config };
</file>

<file path="apps/api/src/services/stem-processor.ts">
import { createClient } from '@supabase/supabase-js';
import { getFileBuffer, generateS3Key, r2Client, BUCKET_NAME } from './r2-storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { logger } from '../lib/logger';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface StemProcessingResult {
  success: boolean;
  error?: string;
  stems?: {
    drums: string;
    bass: string;
    vocals: string;
    other: string;
  };
  processingDuration?: number;
}

export class StemProcessor {
  private static readonly SPLEETER_IMAGE = 'deezer/spleeter:3.8';
  private static readonly OUTPUT_DIR = '/tmp/stems';

  /**
   * Process audio file and separate into stems
   */
  static async processStemSeparation(
    fileMetadataId: string,
    userId: string
  ): Promise<StemProcessingResult> {
    try {
      // Get file metadata
      const { data: fileMetadata, error: fetchError } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('id', fileMetadataId)
        .single();

      if (fetchError || !fileMetadata) {
        throw new Error('File metadata not found');
      }

      // Create stem separation record
      const { data: stemRecord, error: createError } = await supabase
        .from('stem_separations')
        .insert({
          user_id: userId,
          file_metadata_id: fileMetadataId,
          status: 'processing'
        })
        .select()
        .single();

      if (createError) {
        throw new Error('Failed to create stem separation record');
      }

      // Get file from R2
      const fileBuffer = await getFileBuffer(fileMetadata.s3_key);
      
      // Create temporary directory for processing
      const processingId = randomUUID();
      const processingDir = path.join(this.OUTPUT_DIR, processingId);
      fs.mkdirSync(processingDir, { recursive: true });

      // Write file to temp directory
      const inputPath = path.join(processingDir, 'input.wav');
      fs.writeFileSync(inputPath, fileBuffer);

      // Process with Spleeter
      const startTime = Date.now();
      await this.runSpleeter(inputPath, processingDir);
      const processingDuration = Math.round((Date.now() - startTime) / 1000);

      // Upload stems to R2 and create file metadata records
      const uploadedStems = await this.uploadStems(processingDir, userId, { project_id: fileMetadata.project_id });

      // Prepare the stem keys for the database update
      const stemKeysForDb = {
        drums: uploadedStems.drums?.s3Key,
        bass: uploadedStems.bass?.s3Key,
        vocals: uploadedStems.vocals?.s3Key,
        other: uploadedStems.other?.s3Key,
      };

      // Update stem separation record
      const { error: updateError } = await supabase
        .from('stem_separations')
        .update({
          status: 'completed',
          drums_stem_key: stemKeysForDb.drums,
          bass_stem_key: stemKeysForDb.bass,
          vocals_stem_key: stemKeysForDb.vocals,
          other_stem_key: stemKeysForDb.other,
          processing_duration: processingDuration
        })
        .eq('id', stemRecord.id);

      if (updateError) {
        throw new Error('Failed to update stem separation record');
      }

      // Clean up
      fs.rmSync(processingDir, { recursive: true, force: true });

      return {
        success: true,
        stems: {
          drums: stemKeysForDb.drums || '',
          bass: stemKeysForDb.bass || '',
          vocals: stemKeysForDb.vocals || '',
          other: stemKeysForDb.other || '',
        },
        processingDuration
      };

    } catch (error) {
      logger.error('Stem separation failed:', error);

      // Update record with error
      await supabase
        .from('stem_separations')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', fileMetadataId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run Spleeter in Docker container
   */
  private static async runSpleeter(inputPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const spleeter = spawn('docker', [
        'run',
        '--platform=linux/amd64', // For M1/M2 compatibility
        '--rm',
        '-v', `${inputPath}:/input.wav`,
        '-v', `${outputDir}:/output`,
        this.SPLEETER_IMAGE,
        'separate',
        '-p', 'spleeter:4stems',
        '-o', '/output',
        '/input.wav'
      ]);

      let errorOutput = '';

      spleeter.stdout.on('data', (data) => {
        logger.log(`Spleeter output: ${data}`);
      });

      spleeter.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.error(`Spleeter error: ${data}`);
      });

      spleeter.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Spleeter failed with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Upload stems to R2 storage and create metadata records for them.
   */
  private static async uploadStems(
    processingDir: string,
    userId: string,
    originalFile: { project_id?: string }
  ): Promise<{
    drums?: { s3Key: string; fileId: string };
    bass?: { s3Key: string; fileId: string };
    vocals?: { s3Key: string; fileId: string };
    other?: { s3Key: string; fileId: string };
  }> {
    const upload = async (type: string) => {
      try {
        return await this.uploadStem(processingDir, `${type}.wav`, userId, originalFile.project_id);
      } catch (error) {
        logger.warn(`Could not process stem type ${type}:`, error);
        return undefined;
      }
    };

    const [drums, bass, vocals, other] = await Promise.all([
      upload('drums'),
      upload('bass'),
      upload('vocals'),
      upload('other'),
    ]);

    return { drums, bass, vocals, other };
  }

  /**
   * Upload a single stem file to R2 and create its metadata record
   */
  private static async uploadStem(
    processingDir: string,
    stemFile: string,
    userId: string,
    projectId?: string
  ): Promise<{ s3Key: string, fileId: string }> {
    const stemPath = path.join(processingDir, 'input', stemFile);
    if (!fs.existsSync(stemPath)) {
      throw new Error(`Stem file not found at ${stemPath}`);
    }
    
    const stemBuffer = fs.readFileSync(stemPath);
    const s3Key = generateS3Key(userId, stemFile, 'audio');

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: stemBuffer,
      ContentType: 'audio/wav'
    });

    await r2Client.send(command);

    // Create file metadata record for the stem
    const { data: newFile, error: createError } = await supabase
      .from('file_metadata')
      .insert({
        user_id: userId,
        project_id: projectId,
        file_name: stemFile,
        file_type: 'audio',
        mime_type: 'audio/wav',
        file_size: stemBuffer.length,
        s3_key: s3Key,
        s3_bucket: BUCKET_NAME,
        upload_status: 'completed',
        processing_status: 'pending', // Set to pending for client-side analysis
        stem_type: stemFile.replace('.wav', '')
      })
      .select('id')
      .single();

    if (createError) {
      throw new Error(`Failed to create file metadata for stem ${stemFile}: ${createError.message}`);
    }

    return { s3Key, fileId: newFile.id };
  }
}
</file>

<file path="apps/api/src/services/stem-separator.ts">
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getFileBuffer } from './r2-storage';
import { spawn } from 'child_process';
import { join } from 'path';
import { promises as fs } from 'fs';
import { logger } from '../lib/logger';

// Validation schema for stem separation config
export const StemSeparationConfigSchema = z.object({
  model: z.literal('spleeter'),
  modelVariant: z.enum(['2stems', '4stems', '5stems']),
  stems: z.object({
    drums: z.boolean().optional(),
    bass: z.boolean().optional(),
    vocals: z.boolean().default(true),
    other: z.boolean().default(true),
    piano: z.boolean().optional(),
  }),
  quality: z.object({
    sampleRate: z.enum(['44100', '48000']).default('44100'),
    outputFormat: z.enum(['wav', 'mp3']).default('wav'),
    bitrate: z.number().optional(),
  }),
});

export type StemSeparationConfig = z.infer<typeof StemSeparationConfigSchema>;

export interface StemSeparationJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  config: StemSeparationConfig;
  progress: number;
  estimatedTimeRemaining?: number;
  results?: {
    stems: Record<string, string>; // URLs to separated stems
  };
  error?: string;
}

export class StemSeparator {
  private static jobs = new Map<string, StemSeparationJob>();

  /**
   * Create a new stem separation job
   */
  static createJob(config: StemSeparationConfig): StemSeparationJob {
    const job: StemSeparationJob = {
      id: randomUUID(),
      status: 'queued',
      config,
      progress: 0,
    };

    this.jobs.set(job.id, job);
    return job;
  }

  /**
   * Get job status
   */
  static getJob(jobId: string): StemSeparationJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Process audio file using Spleeter
   */
  static async processStem(
    jobId: string,
    fileKey: string,
    outputDir: string
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');

    try {
      job.status = 'processing';
      this.jobs.set(jobId, job);

      // Get file buffer from storage
      const buffer = await getFileBuffer(fileKey);

      // Create temporary input file
      const inputPath = join(outputDir, 'input.wav');
      const outputPath = join(outputDir, 'output');

      // Write buffer to temporary file
      await fs.writeFile(inputPath, buffer);

      // Run Spleeter in Docker
      await new Promise<void>((resolve, reject) => {
        const docker = spawn('docker', [
          'run',
          '--rm',
          '-v', `${outputDir}:/app/input`,
          '-v', `${outputDir}:/app/output`,
          'spleeter',
          'python',
          'process-audio.py',
          '--model', job.config.modelVariant,
          '--output-format', job.config.quality.outputFormat,
          '--sample-rate', job.config.quality.sampleRate,
        ]);

        docker.stdout.on('data', (data) => {
          logger.log(`Spleeter stdout: ${data}`);
          // Update progress based on output
          if (data.toString().includes('Progress')) {
            const match = data.toString().match(/Progress: (\d+)%/);
            if (match) {
              job.progress = parseInt(match[1], 10);
              this.jobs.set(jobId, job);
            }
          }
        });

        docker.stderr.on('data', (data) => {
          logger.error(`Spleeter stderr: ${data}`);
        });

        docker.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Spleeter process exited with code ${code}`));
          }
        });
      });

      // Update job with results
      job.status = 'completed';
      job.progress = 100;
      job.results = {
        stems: {
          // Add stem file paths based on config
          vocals: join(outputPath, 'vocals.wav'),
          other: join(outputPath, 'accompaniment.wav'),
          ...(job.config.stems.drums && { drums: join(outputPath, 'drums.wav') }),
          ...(job.config.stems.bass && { bass: join(outputPath, 'bass.wav') }),
          ...(job.config.stems.piano && { piano: join(outputPath, 'piano.wav') }),
        },
      };

      this.jobs.set(jobId, job);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.jobs.set(jobId, job);
      throw error;
    }
  }
}
</file>

<file path="apps/web/src/components/audio-analysis/analysis-comparison.tsx">
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonData {
  transients: { sandbox: number; cached: number; difference: number };
  chroma: { sandbox: number; cached: number; difference: number };
  rms: { sandbox: number; cached: number; difference: number };
}

interface AnalysisComparisonProps {
  comparison: ComparisonData;
  onSaveToCache?: () => void;
  onLoadFromCache?: () => void;
  isSaving?: boolean;
  isLoading?: boolean;
}

export function AnalysisComparison({
  comparison,
  onSaveToCache,
  onLoadFromCache,
  isSaving = false,
  isLoading = false
}: AnalysisComparisonProps) {
  const getTrendIcon = (difference: number) => {
    if (difference > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (difference < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getTrendColor = (difference: number) => {
    if (difference > 0) return 'text-green-400';
    if (difference < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getTrendBadge = (difference: number) => {
    if (difference > 0) return 'bg-green-600/20 text-green-400 border-green-600';
    if (difference < 0) return 'bg-red-600/20 text-red-400 border-red-600';
    return 'bg-slate-600/20 text-slate-400 border-slate-600';
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Analysis Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparison Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Transients Comparison */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Transients</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Sandbox</span>
                <Badge variant="outline" className="text-blue-400 border-blue-600">
                  {comparison.transients.sandbox}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Cached</span>
                <Badge variant="outline" className="text-slate-400 border-slate-600">
                  {comparison.transients.cached}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Difference</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(comparison.transients.difference)}
                  <Badge 
                    variant="outline" 
                    className={getTrendBadge(comparison.transients.difference)}
                  >
                    {comparison.transients.difference > 0 ? '+' : ''}{comparison.transients.difference}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Chroma Comparison */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Chroma</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Sandbox</span>
                <Badge variant="outline" className="text-blue-400 border-blue-600">
                  {comparison.chroma.sandbox}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Cached</span>
                <Badge variant="outline" className="text-slate-400 border-slate-600">
                  {comparison.chroma.cached}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Difference</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(comparison.chroma.difference)}
                  <Badge 
                    variant="outline" 
                    className={getTrendBadge(comparison.chroma.difference)}
                  >
                    {comparison.chroma.difference > 0 ? '+' : ''}{comparison.chroma.difference}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* RMS Comparison */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">RMS</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Sandbox</span>
                <Badge variant="outline" className="text-blue-400 border-blue-600">
                  {comparison.rms.sandbox}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Cached</span>
                <Badge variant="outline" className="text-slate-400 border-slate-600">
                  {comparison.rms.cached}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Difference</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(comparison.rms.difference)}
                  <Badge 
                    variant="outline" 
                    className={getTrendBadge(comparison.rms.difference)}
                  >
                    {comparison.rms.difference > 0 ? '+' : ''}{comparison.rms.difference}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-slate-700/50 rounded-lg">
          <h4 className="text-sm font-semibold text-white mb-2">Summary</h4>
          <div className="text-sm text-slate-300 space-y-1">
            {comparison.transients.difference > 0 && (
              <p>• Sandbox detected {comparison.transients.difference} more transients</p>
            )}
            {comparison.transients.difference < 0 && (
              <p>• Cached analysis has {Math.abs(comparison.transients.difference)} more transients</p>
            )}
            {comparison.chroma.difference > 0 && (
              <p>• Sandbox detected {comparison.chroma.difference} more chroma events</p>
            )}
            {comparison.chroma.difference < 0 && (
              <p>• Cached analysis has {Math.abs(comparison.chroma.difference)} more chroma events</p>
            )}
            {comparison.rms.difference > 0 && (
              <p>• Sandbox has {comparison.rms.difference} more RMS samples</p>
            )}
            {comparison.rms.difference < 0 && (
              <p>• Cached analysis has {Math.abs(comparison.rms.difference)} more RMS samples</p>
            )}
            {comparison.transients.difference === 0 && comparison.chroma.difference === 0 && comparison.rms.difference === 0 && (
              <p>• No differences detected between analysis methods</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onSaveToCache}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSaving ? 'Saving...' : 'Save to Cache'}
          </Button>
          <Button
            onClick={onLoadFromCache}
            disabled={isLoading}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {isLoading ? 'Loading...' : 'Load from Cache'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
</file>

<file path="apps/web/src/components/audio-analysis/analysis-method-controls.tsx">
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Zap, Music, Volume2, BarChart3, ToggleLeft, ToggleRight } from 'lucide-react';
import { AnalysisParams, AnalysisMethod } from '@/types/audio-analysis';

interface AnalysisMethodControlsProps {
  analysisMethod: AnalysisMethod;
  analysisParams: AnalysisParams;
  onMethodChange: (method: AnalysisMethod) => void;
  onParamsChange: (params: Partial<AnalysisParams>) => void;
  isAnalyzing?: boolean;
}

export function AnalysisMethodControls({
  analysisMethod,
  analysisParams,
  onMethodChange,
  onParamsChange,
  isAnalyzing = false
}: AnalysisMethodControlsProps) {
  const handleParamChange = (key: keyof AnalysisParams, value: number | number[]) => {
    onParamsChange({
      [key]: Array.isArray(value) ? value[0] : value
    });
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'original': return <BarChart3 className="w-4 h-4" />;
      case 'enhanced': return <Zap className="w-4 h-4" />;
      case 'both': return <Settings className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'original': return 'bg-blue-600/20 text-blue-400 border-blue-600';
      case 'enhanced': return 'bg-purple-600/20 text-purple-400 border-purple-600';
      case 'both': return 'bg-green-600/20 text-green-400 border-green-600';
      default: return 'bg-slate-600/20 text-slate-400 border-slate-600';
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5" />
          Audio Analysis Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Method Selection */}
        <div className="space-y-3">
          <Label className="text-slate-300 text-sm font-medium">Analysis Method</Label>
          <div className="flex gap-2">
            <Button
              variant={analysisMethod === 'original' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMethodChange('original')}
              disabled={isAnalyzing}
              className="flex-1"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Original
            </Button>
            <Button
              variant={analysisMethod === 'enhanced' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMethodChange('enhanced')}
              disabled={isAnalyzing}
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-2" />
              Enhanced
            </Button>
            <Button
              variant={analysisMethod === 'both' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMethodChange('both')}
              disabled={isAnalyzing}
              className="flex-1"
            >
              <Settings className="w-4 h-4 mr-2" />
              Both
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getMethodColor(analysisMethod)}>
              {getMethodIcon(analysisMethod)}
              <span className="ml-1 capitalize">{analysisMethod}</span>
            </Badge>
            {isAnalyzing && (
              <Badge variant="outline" className="bg-yellow-600/20 text-yellow-400 border-yellow-600">
                Analyzing...
              </Badge>
            )}
          </div>
        </div>

        {/* Enhanced Analysis Parameters */}
        {(analysisMethod === 'enhanced' || analysisMethod === 'both') && (
          <>
            <Separator className="bg-slate-600" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Enhanced Analysis Parameters</h3>
              </div>
              
              {/* Transient Detection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-red-400" />
                  <Label className="text-xs text-slate-300">Transient Detection</Label>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-slate-400">
                      Threshold: {analysisParams.transientThreshold.toFixed(2)}
                    </Label>
                    <Slider
                      value={[analysisParams.transientThreshold]}
                      onValueChange={(value) => handleParamChange('transientThreshold', value)}
                      min={0.1}
                      max={0.9}
                      step={0.05}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">
                      Onset: {analysisParams.onsetThreshold.toFixed(2)}
                    </Label>
                    <Slider
                      value={[analysisParams.onsetThreshold]}
                      onValueChange={(value) => handleParamChange('onsetThreshold', value)}
                      min={0.05}
                      max={0.5}
                      step={0.025}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Chroma Analysis */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Music className="w-3 h-3 text-blue-400" />
                  <Label className="text-xs text-slate-300">Chroma Analysis</Label>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-slate-400">
                      Smoothing: {analysisParams.chromaSmoothing.toFixed(2)}
                    </Label>
                    <Slider
                      value={[analysisParams.chromaSmoothing]}
                      onValueChange={(value) => handleParamChange('chromaSmoothing', value)}
                      min={0.1}
                      max={0.95}
                      step={0.05}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">
                      Confidence: {analysisParams.pitchConfidence.toFixed(2)}
                    </Label>
                    <Slider
                      value={[analysisParams.pitchConfidence]}
                      onValueChange={(value) => handleParamChange('pitchConfidence', value)}
                      min={0.3}
                      max={0.95}
                      step={0.05}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* RMS Analysis */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3 h-3 text-green-400" />
                  <Label className="text-xs text-slate-300">RMS Analysis</Label>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">
                    Window Size: {analysisParams.rmsWindowSize}
                  </Label>
                  <Slider
                    value={[analysisParams.rmsWindowSize]}
                    onValueChange={(value) => handleParamChange('rmsWindowSize', value)}
                    min={256}
                    max={4096}
                    step={128}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-2">
              <Label className="text-xs text-slate-300 mb-2 block">Quick Presets</Label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onParamsChange({
                    transientThreshold: 0.2,
                    onsetThreshold: 0.15,
                    chromaSmoothing: 0.7,
                    rmsWindowSize: 512,
                    pitchConfidence: 0.6,
                    minNoteDuration: 0.08
                  })}
                  className="text-xs px-2 py-1 h-7"
                >
                  Sensitive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onParamsChange({
                    transientThreshold: 0.4,
                    onsetThreshold: 0.25,
                    chromaSmoothing: 0.8,
                    rmsWindowSize: 1024,
                    pitchConfidence: 0.75,
                    minNoteDuration: 0.12
                  })}
                  className="text-xs px-2 py-1 h-7"
                >
                  Balanced
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onParamsChange({
                    transientThreshold: 0.6,
                    onsetThreshold: 0.35,
                    chromaSmoothing: 0.9,
                    rmsWindowSize: 2048,
                    pitchConfidence: 0.85,
                    minNoteDuration: 0.2
                  })}
                  className="text-xs px-2 py-1 h-7"
                >
                  Conservative
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Analysis Status */}
        {analysisMethod === 'enhanced' || analysisMethod === 'both' ? (
          <div className="p-3 bg-purple-900/20 border border-purple-600/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">Enhanced Analysis</span>
            </div>
            <div className="text-xs text-purple-300 space-y-1">
              <p>• Transient detection for onset analysis</p>
              <p>• Chroma analysis for pitch detection</p>
              <p>• RMS processing for amplitude tracking</p>
              <p>• MIDI-like control parameters</p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-blue-900/20 border border-blue-600/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Original Analysis</span>
            </div>
            <div className="text-xs text-blue-300 space-y-1">
              <p>• Standard frequency analysis</p>
              <p>• Volume and spectral features</p>
              <p>• FFT-based processing</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
</file>

<file path="apps/web/src/components/audio-analysis/analysis-parameters.tsx">
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, Zap, Music, Volume2 } from 'lucide-react';

interface AnalysisParametersProps {
  params: {
    transientThreshold: number;
    onsetThreshold: number;
    chromaSmoothing: number;
    rmsWindowSize: number;
    pitchConfidence: number;
    minNoteDuration: number;
  };
  onParamsChange: (params: any) => void;
}

export function AnalysisParameters({ params, onParamsChange }: AnalysisParametersProps) {
  const handleParamChange = (key: string, value: number | number[]) => {
    onParamsChange({
      ...params,
      [key]: Array.isArray(value) ? value[0] : value
    });
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Analysis Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transient Detection Parameters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Transient Detection</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">
                Transient Threshold: {params.transientThreshold.toFixed(2)}
              </Label>
              <Slider
                value={[params.transientThreshold]}
                onValueChange={(value) => handleParamChange('transientThreshold', value)}
                min={0.1}
                max={0.9}
                step={0.05}
                className="mt-2"
              />
              <p className="text-xs text-slate-400 mt-1">
                Higher values detect fewer, stronger transients
              </p>
            </div>

            <div>
              <Label className="text-slate-300">
                Onset Threshold: {params.onsetThreshold.toFixed(2)}
              </Label>
              <Slider
                value={[params.onsetThreshold]}
                onValueChange={(value) => handleParamChange('onsetThreshold', value)}
                min={0.05}
                max={0.5}
                step={0.025}
                className="mt-2"
              />
              <p className="text-xs text-slate-400 mt-1">
                Sensitivity for detecting note onsets
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-600" />

        {/* Chroma/Pitch Detection Parameters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-4 h-4 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Chroma & Pitch Detection</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">
                Chroma Smoothing: {params.chromaSmoothing.toFixed(2)}
              </Label>
              <Slider
                value={[params.chromaSmoothing]}
                onValueChange={(value) => handleParamChange('chromaSmoothing', value)}
                min={0.1}
                max={0.95}
                step={0.05}
                className="mt-2"
              />
              <p className="text-xs text-slate-400 mt-1">
                Higher values create smoother pitch transitions
              </p>
            </div>

            <div>
              <Label className="text-slate-300">
                Pitch Confidence: {params.pitchConfidence.toFixed(2)}
              </Label>
              <Slider
                value={[params.pitchConfidence]}
                onValueChange={(value) => handleParamChange('pitchConfidence', value)}
                min={0.3}
                max={0.95}
                step={0.05}
                className="mt-2"
              />
              <p className="text-xs text-slate-400 mt-1">
                Minimum confidence for pitch detection
              </p>
            </div>

            <div>
              <Label className="text-slate-300">
                Min Note Duration: {params.minNoteDuration.toFixed(2)}s
              </Label>
              <Slider
                value={[params.minNoteDuration]}
                onValueChange={(value) => handleParamChange('minNoteDuration', value)}
                min={0.05}
                max={0.5}
                step={0.025}
                className="mt-2"
              />
              <p className="text-xs text-slate-400 mt-1">
                Minimum duration for valid notes
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-600" />

        {/* RMS Analysis Parameters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-4 h-4 text-green-400" />
            <h3 className="text-lg font-semibold text-white">RMS Analysis</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">
                Window Size: {params.rmsWindowSize}
              </Label>
              <Slider
                value={[params.rmsWindowSize]}
                onValueChange={(value) => handleParamChange('rmsWindowSize', value)}
                min={256}
                max={4096}
                step={128}
                className="mt-2"
              />
              <p className="text-xs text-slate-400 mt-1">
                Larger windows = smoother RMS values
              </p>
            </div>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="pt-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Quick Presets</h4>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onParamsChange({
                transientThreshold: 0.2,
                onsetThreshold: 0.15,
                chromaSmoothing: 0.7,
                rmsWindowSize: 512,
                pitchConfidence: 0.6,
                minNoteDuration: 0.08
              })}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
            >
              Sensitive
            </button>
            <button
              onClick={() => onParamsChange({
                transientThreshold: 0.4,
                onsetThreshold: 0.25,
                chromaSmoothing: 0.8,
                rmsWindowSize: 1024,
                pitchConfidence: 0.75,
                minNoteDuration: 0.12
              })}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Balanced
            </button>
            <button
              onClick={() => onParamsChange({
                transientThreshold: 0.6,
                onsetThreshold: 0.35,
                chromaSmoothing: 0.9,
                rmsWindowSize: 2048,
                pitchConfidence: 0.85,
                minNoteDuration: 0.2
              })}
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Conservative
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
</file>

<file path="apps/web/src/components/audio-analysis/analysis-visualization.tsx">
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Zap, Music, Volume2, Play, Pause } from 'lucide-react';

interface AnalysisData {
  transients: Array<{
    time: number;
    intensity: number;
    frequency: number;
  }>;
  chroma: Array<{
    time: number;
    pitch: number;
    confidence: number;
    note: string;
  }>;
  rms: Array<{
    time: number;
    value: number;
  }>;
  waveform: number[];
}

interface AnalysisVisualizationProps {
  analysisData: AnalysisData;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isPlaying: boolean;
}

const CHROMA_COLORS = [
  '#ef4444', // C - Red
  '#f97316', // C# - Orange
  '#eab308', // D - Yellow
  '#84cc16', // D# - Lime
  '#22c55e', // E - Green
  '#10b981', // F - Emerald
  '#06b6d4', // F# - Cyan
  '#0ea5e9', // G - Sky
  '#3b82f6', // G# - Blue
  '#6366f1', // A - Indigo
  '#8b5cf6', // A# - Violet
  '#d946ef', // B - Fuchsia
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function AnalysisVisualization({
  analysisData,
  currentTime,
  duration,
  onSeek,
  isPlaying
}: AnalysisVisualizationProps) {
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const chromaCanvasRef = useRef<HTMLCanvasElement>(null);
  const rmsCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedView, setSelectedView] = useState<'waveform' | 'chroma' | 'rms' | 'all'>('all');

  // Draw waveform with transient markers
  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !analysisData.waveform) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const midY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    
    const waveform = analysisData.waveform;
    for (let i = 0; i < waveform.length; i++) {
      const x = (i / (waveform.length - 1)) * width;
      const y = midY - (waveform[i] * midY * 0.8);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw transient markers
    if (analysisData.transients) {
      analysisData.transients.forEach(transient => {
        const x = (transient.time / duration) * width;
        const intensity = transient.intensity;
        const markerHeight = intensity * height * 0.6;
        
        // Draw vertical line
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.moveTo(x, midY - markerHeight / 2);
        ctx.lineTo(x, midY + markerHeight / 2);
        ctx.stroke();
        
        // Draw intensity circle
        ctx.beginPath();
        ctx.fillStyle = `rgba(239, 68, 68, ${intensity})`;
        ctx.arc(x, midY, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw current time indicator
    const currentX = (currentTime / duration) * width;
    ctx.beginPath();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
  }, [analysisData, currentTime, duration]);

  // Draw chroma visualization
  const drawChroma = useCallback(() => {
    const canvas = chromaCanvasRef.current;
    if (!canvas || !analysisData.chroma) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const noteHeight = height / 12;

    ctx.clearRect(0, 0, width, height);

    // Draw chroma data
    analysisData.chroma.forEach(chroma => {
      const x = (chroma.time / duration) * width;
      const y = (11 - chroma.pitch) * noteHeight; // Invert Y so C is at top
      const noteWidth = 4;
      const alpha = chroma.confidence;
      
      ctx.fillStyle = `${CHROMA_COLORS[chroma.pitch]}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      ctx.fillRect(x - noteWidth / 2, y, noteWidth, noteHeight);
    });

    // Draw note labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i < 12; i++) {
      const y = (11 - i) * noteHeight + noteHeight / 2 + 4;
      ctx.fillText(NOTE_NAMES[i], 30, y);
    }

    // Draw current time indicator
    const currentX = (currentTime / duration) * width;
    ctx.beginPath();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
  }, [analysisData, currentTime, duration]);

  // Draw RMS visualization
  const drawRMS = useCallback(() => {
    const canvas = rmsCanvasRef.current;
    if (!canvas || !analysisData.rms) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // Draw RMS curve
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    
    analysisData.rms.forEach((rms, index) => {
      const x = (rms.time / duration) * width;
      const y = height - (rms.value * height);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Fill area under curve
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    
    analysisData.rms.forEach((rms, index) => {
      const x = (rms.time / duration) * width;
      const y = height - (rms.value * height);
      
      if (index === 0) {
        ctx.moveTo(x, height);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.fill();

    // Draw current time indicator
    const currentX = (currentTime / duration) * width;
    ctx.beginPath();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
  }, [analysisData, currentTime, duration]);

  // Handle canvas click for seeking
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativePosition = x / rect.width;
    const seekTime = relativePosition * duration;
    onSeek(seekTime);
  }, [duration, onSeek]);

  // Redraw canvases when data changes
  useEffect(() => {
    if (selectedView === 'waveform' || selectedView === 'all') {
      drawWaveform();
    }
    if (selectedView === 'chroma' || selectedView === 'all') {
      drawChroma();
    }
    if (selectedView === 'rms' || selectedView === 'all') {
      drawRMS();
    }
  }, [selectedView, drawWaveform, drawChroma, drawRMS]);

  // Redraw on window resize
  useEffect(() => {
    const handleResize = () => {
      if (selectedView === 'waveform' || selectedView === 'all') {
        drawWaveform();
      }
      if (selectedView === 'chroma' || selectedView === 'all') {
        drawChroma();
      }
      if (selectedView === 'rms' || selectedView === 'all') {
        drawRMS();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedView, drawWaveform, drawChroma, drawRMS]);

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analysis Visualization
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedView === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('all')}
              className="text-xs"
            >
              All
            </Button>
            <Button
              variant={selectedView === 'waveform' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('waveform')}
              className="text-xs"
            >
              Waveform
            </Button>
            <Button
              variant={selectedView === 'chroma' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('chroma')}
              className="text-xs"
            >
              Chroma
            </Button>
            <Button
              variant={selectedView === 'rms' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('rms')}
              className="text-xs"
            >
              RMS
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Waveform Visualization */}
        {(selectedView === 'waveform' || selectedView === 'all') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Waveform with Transients</h3>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                {analysisData.transients?.length || 0} transients
              </Badge>
            </div>
            <div className="relative">
              <canvas
                ref={waveformCanvasRef}
                onClick={handleCanvasClick}
                className="w-full h-32 bg-slate-900/50 rounded-lg cursor-pointer"
              />
              <div className="absolute top-2 left-2 text-xs text-slate-400">
                Click to seek • Red markers = transients
              </div>
            </div>
          </div>
        )}

        {/* Chroma Visualization */}
        {(selectedView === 'chroma' || selectedView === 'all') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Chroma Analysis</h3>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                {new Set(analysisData.chroma?.map(c => c.note) || []).size} unique notes
              </Badge>
            </div>
            <div className="relative">
              <canvas
                ref={chromaCanvasRef}
                onClick={handleCanvasClick}
                className="w-full h-48 bg-slate-900/50 rounded-lg cursor-pointer"
              />
              <div className="absolute top-2 left-2 text-xs text-slate-400">
                Click to seek • Colors = chroma classes
              </div>
            </div>
          </div>
        )}

        {/* RMS Visualization */}
        {(selectedView === 'rms' || selectedView === 'all') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-green-400" />
              <h3 className="text-lg font-semibold text-white">RMS Analysis</h3>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                Avg: {analysisData.rms?.length ? 
                  (analysisData.rms.reduce((sum, r) => sum + r.value, 0) / analysisData.rms.length).toFixed(3) : 
                  '0.000'
                }
              </Badge>
            </div>
            <div className="relative">
              <canvas
                ref={rmsCanvasRef}
                onClick={handleCanvasClick}
                className="w-full h-32 bg-slate-900/50 rounded-lg cursor-pointer"
              />
              <div className="absolute top-2 left-2 text-xs text-slate-400">
                Click to seek • Green area = RMS amplitude
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-600">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400" />
              Transients
            </h4>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Onset detection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500/50 rounded-full"></div>
                <span>Intensity = opacity</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-blue-400" />
              Chroma
            </h4>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>C</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>G</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>E</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-green-400" />
              RMS
            </h4>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Amplitude curve</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500/20 rounded"></div>
                <span>Filled area</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
</file>

<file path="apps/web/src/components/audio-analysis/api-test.tsx">
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function ApiTest() {
  const [testResults, setTestResults] = useState<{
    health: 'pending' | 'success' | 'error';
    sandboxTest: 'pending' | 'success' | 'error';
    sandboxAuth: 'pending' | 'success' | 'error';
  }>({
    health: 'pending',
    sandboxTest: 'pending',
    sandboxAuth: 'pending',
  });

  const healthQuery = trpc.health.check.useQuery(undefined, {
    retry: false,
    onSuccess: () => {
      setTestResults(prev => ({ ...prev, health: 'success' }));
    },
    onError: () => {
      setTestResults(prev => ({ ...prev, health: 'error' }));
    },
  });

  const sandboxTestQuery = trpc.audioAnalysisSandbox.test.useQuery(undefined, {
    retry: false,
    onSuccess: () => {
      setTestResults(prev => ({ ...prev, sandboxTest: 'success' }));
    },
    onError: () => {
      setTestResults(prev => ({ ...prev, sandboxTest: 'error' }));
    },
  });

  const sandboxAuthQuery = trpc.audioAnalysisSandbox.getSandboxAnalyses.useQuery(
    { limit: 1 },
    {
      retry: false,
      onSuccess: () => {
        setTestResults(prev => ({ ...prev, sandboxAuth: 'success' }));
      },
      onError: () => {
        setTestResults(prev => ({ ...prev, sandboxAuth: 'error' }));
      },
    }
  );

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusBadge = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600';
      case 'success':
        return 'bg-green-600/20 text-green-400 border-green-600';
      case 'error':
        return 'bg-red-600/20 text-red-400 border-red-600';
    }
  };

  const getStatusText = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return 'Testing...';
      case 'success':
        return 'Connected';
      case 'error':
        return 'Failed';
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          API Connection Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.health)}
              <span className="text-slate-300">Health Check</span>
            </div>
            <Badge variant="outline" className={getStatusBadge(testResults.health)}>
              {getStatusText(testResults.health)}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.sandboxTest)}
              <span className="text-slate-300">Sandbox Router</span>
            </div>
            <Badge variant="outline" className={getStatusBadge(testResults.sandboxTest)}>
              {getStatusText(testResults.sandboxTest)}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.sandboxAuth)}
              <span className="text-slate-300">Sandbox Auth</span>
            </div>
            <Badge variant="outline" className={getStatusBadge(testResults.sandboxAuth)}>
              {getStatusText(testResults.sandboxAuth)}
            </Badge>
          </div>
        </div>

        {testResults.health === 'error' && (
          <div className="p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
            <p className="text-sm text-red-400">
              API server is not responding. Please check:
            </p>
            <ul className="text-xs text-red-300 mt-2 space-y-1">
              <li>• API server is running on the correct port</li>
              <li>• NEXT_PUBLIC_API_URL is set correctly</li>
              <li>• No firewall blocking the connection</li>
            </ul>
          </div>
        )}

        {testResults.sandboxTest === 'error' && testResults.health === 'success' && (
          <div className="p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
            <p className="text-sm text-red-400">
              Health check passed but sandbox router failed. Check if the router is properly registered.
            </p>
          </div>
        )}

        {testResults.sandboxAuth === 'error' && testResults.sandboxTest === 'success' && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
            <p className="text-sm text-yellow-400">
              Sandbox router is working but authentication failed. Make sure you're logged in.
            </p>
          </div>
        )}

        {testResults.health === 'success' && testResults.sandboxTest === 'success' && testResults.sandboxAuth === 'success' && (
          <div className="p-3 bg-green-900/20 border border-green-600/50 rounded-lg">
            <p className="text-sm text-green-400">
              All API endpoints are working correctly! The sandbox is ready to use.
            </p>
          </div>
        )}

        <Button
          onClick={() => {
            setTestResults({ health: 'pending', sandboxTest: 'pending', sandboxAuth: 'pending' });
            healthQuery.refetch();
            sandboxTestQuery.refetch();
            sandboxAuthQuery.refetch();
          }}
          variant="outline"
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          Retry Tests
        </Button>
      </CardContent>
    </Card>
  );
}
</file>

<file path="apps/web/src/components/audio-analysis/audio-analysis-sandbox.tsx">
'use client';

import React, { useCallback } from 'react';

interface AudioAnalysisSandboxProps {
  audioBuffer: AudioBuffer;
  params: {
    transientThreshold: number;
    onsetThreshold: number;
    chromaSmoothing: number;
    rmsWindowSize: number;
    pitchConfidence: number;
    minNoteDuration: number;
  };
  onAnalysisComplete: (analysis: any) => void;
}

export function AudioAnalysisSandbox({ 
  audioBuffer, 
  params, 
  onAnalysisComplete 
}: AudioAnalysisSandboxProps) {
  
  // Transient/Onset Detection using Spectral Flux
  const detectTransients = useCallback((channelData: Float32Array, sampleRate: number) => {
    const windowSize = 1024;
    const hopSize = 512;
    const transients: Array<{ time: number; intensity: number; frequency: number }> = [];
    
    // Calculate spectral flux for onset detection
    const spectralFlux = [];
    const fftSize = windowSize;
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      
      // Apply Hann window
      const hannWindow = window.map((sample, idx) => 
        sample * (0.5 - 0.5 * Math.cos(2 * Math.PI * idx / (windowSize - 1)))
      );
      
      // Calculate FFT magnitude spectrum
      const fft = performFFT(hannWindow);
      const magnitude = fft.map(complex => Math.sqrt(complex.real * complex.real + complex.imag * complex.imag));
      
      // Calculate spectral flux (difference from previous frame)
      if (spectralFlux.length > 0) {
        let flux = 0;
        for (let j = 0; j < magnitude.length; j++) {
          const diff = magnitude[j] - spectralFlux[spectralFlux.length - 1][j];
          if (diff > 0) flux += diff;
        }
        
        // Detect transients based on threshold
        if (flux > params.transientThreshold) {
          const time = i / sampleRate;
          const intensity = Math.min(flux / 10, 1); // Normalize intensity
          
          // Find dominant frequency
          let maxMag = 0;
          let maxFreq = 0;
          for (let j = 1; j < magnitude.length / 2; j++) {
            if (magnitude[j] > maxMag) {
              maxMag = magnitude[j];
              maxFreq = (j * sampleRate) / fftSize;
            }
          }
          
          transients.push({
            time,
            intensity,
            frequency: maxFreq
          });
        }
      }
      
      spectralFlux.push(magnitude);
    }
    
    return transients;
  }, [params.transientThreshold]);

  // Chroma/Pitch Detection using YIN algorithm
  const detectChroma = useCallback((channelData: Float32Array, sampleRate: number) => {
    const windowSize = 2048;
    const hopSize = 512;
    const chroma: Array<{ time: number; pitch: number; confidence: number; note: string }> = [];
    
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      
      // Apply Hann window
      const hannWindow = window.map((sample, idx) => 
        sample * (0.5 - 0.5 * Math.cos(2 * Math.PI * idx / (windowSize - 1)))
      );
      
      // YIN pitch detection
      const pitch = detectPitchYIN(hannWindow, sampleRate);
      
      if (pitch > 0 && pitch < 2000) { // Reasonable frequency range
        // Convert frequency to MIDI note number
        const midiNote = 12 * Math.log2(pitch / 440) + 69;
        const chromaClass = Math.round(midiNote) % 12;
        const confidence = Math.min(pitch / 1000, 1); // Simple confidence based on frequency
        
        if (confidence > params.pitchConfidence) {
          chroma.push({
            time: i / sampleRate,
            pitch: chromaClass,
            confidence,
            note: noteNames[chromaClass]
          });
        }
      }
    }
    
    // Apply smoothing
    return smoothChroma(chroma, params.chromaSmoothing);
  }, [params.pitchConfidence, params.chromaSmoothing]);

  // RMS Analysis
  const analyzeRMS = useCallback((channelData: Float32Array, sampleRate: number) => {
    const windowSize = params.rmsWindowSize;
    const hopSize = windowSize / 2;
    const rms: Array<{ time: number; value: number }> = [];
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      
      // Calculate RMS
      let sum = 0;
      for (let j = 0; j < window.length; j++) {
        sum += window[j] * window[j];
      }
      const rmsValue = Math.sqrt(sum / window.length);
      
      rms.push({
        time: i / sampleRate,
        value: rmsValue
      });
    }
    
    return rms;
  }, [params.rmsWindowSize]);

  // Generate waveform data
  const generateWaveform = useCallback((channelData: Float32Array, points: number = 1000) => {
    const step = Math.floor(channelData.length / points);
    const waveform: number[] = [];
    
    for (let i = 0; i < points; i++) {
      const start = i * step;
      const end = Math.min(start + step, channelData.length);
      
      // Calculate RMS for this segment
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += channelData[j] * channelData[j];
      }
      const rms = Math.sqrt(sum / (end - start));
      waveform.push(rms);
    }
    
    return waveform;
  }, []);

  // Perform analysis
  const performAnalysis = useCallback(async () => {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Run all analyses
    const transients = detectTransients(channelData, sampleRate);
    const chroma = detectChroma(channelData, sampleRate);
    const rms = analyzeRMS(channelData, sampleRate);
    const waveform = generateWaveform(channelData);
    
    const analysis = {
      transients,
      chroma,
      rms,
      waveform,
      metadata: {
        sampleRate,
        duration: audioBuffer.duration,
        bufferSize: audioBuffer.length,
        analysisParams: params
      }
    };
    
    onAnalysisComplete(analysis);
  }, [audioBuffer, params, detectTransients, detectChroma, analyzeRMS, generateWaveform, onAnalysisComplete]);

  // Start analysis when component mounts or parameters change
  React.useEffect(() => {
    performAnalysis();
  }, [performAnalysis, params]);

  return null; // This component doesn't render anything
}

// Helper function: Simple FFT implementation
function performFFT(samples: Float32Array): Array<{ real: number; imag: number }> {
  const N = samples.length;
  const result: Array<{ real: number; imag: number }> = [];
  
  for (let k = 0; k < N; k++) {
    let real = 0;
    let imag = 0;
    
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N;
      real += samples[n] * Math.cos(angle);
      imag += samples[n] * Math.sin(angle);
    }
    
    result.push({ real, imag });
  }
  
  return result;
}

// Helper function: YIN pitch detection algorithm
function detectPitchYIN(samples: Float32Array, sampleRate: number): number {
  const minPeriod = Math.floor(sampleRate / 2000); // Max 2000 Hz
  const maxPeriod = Math.floor(sampleRate / 80);   // Min 80 Hz
  
  let bestPeriod = 0;
  let bestDifference = 1;
  
  for (let period = minPeriod; period < maxPeriod && period < samples.length / 2; period++) {
    let difference = 0;
    let sum = 0;
    
    for (let i = 0; i < samples.length - period; i++) {
      const delta = samples[i] - samples[i + period];
      difference += delta * delta;
      sum += samples[i] * samples[i];
    }
    
    if (sum > 0) {
      difference /= sum;
      
      if (difference < bestDifference) {
        bestDifference = difference;
        bestPeriod = period;
      }
    }
  }
  
  // Convert period to frequency
  return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
}

// Helper function: Smooth chroma data
function smoothChroma(chroma: Array<{ time: number; pitch: number; confidence: number; note: string }>, smoothing: number): Array<{ time: number; pitch: number; confidence: number; note: string }> {
  if (chroma.length === 0) return chroma;
  
  const smoothed = [...chroma];
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  for (let i = 1; i < smoothed.length - 1; i++) {
    const prev = smoothed[i - 1];
    const curr = smoothed[i];
    const next = smoothed[i + 1];
    
    // Simple moving average for pitch
    const avgPitch = Math.round((prev.pitch + curr.pitch + next.pitch) / 3);
    const avgConfidence = (prev.confidence + curr.confidence + next.confidence) / 3;
    
    if (avgConfidence > curr.confidence * smoothing) {
      smoothed[i] = {
        time: curr.time,
        pitch: avgPitch,
        confidence: avgConfidence,
        note: noteNames[avgPitch]
      };
    }
  }
  
  return smoothed;
}
</file>

<file path="apps/web/src/components/audio-analysis/auth-status.tsx">
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { CheckCircle, XCircle, Loader2, User, UserCheck } from 'lucide-react';

export function AuthStatus() {
  const sessionQuery = trpc.auth.session.useQuery();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  const getStatusIcon = (isLoading: boolean, isError: boolean, isSuccess: boolean) => {
    if (isLoading) return <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />;
    if (isError) return <XCircle className="w-4 h-4 text-red-400" />;
    if (isSuccess) return <CheckCircle className="w-4 h-4 text-green-400" />;
    return <User className="w-4 h-4 text-slate-400" />;
  };

  const getStatusBadge = (isLoading: boolean, isError: boolean, isSuccess: boolean) => {
    if (isLoading) return 'bg-yellow-600/20 text-yellow-400 border-yellow-600';
    if (isError) return 'bg-red-600/20 text-red-400 border-red-600';
    if (isSuccess) return 'bg-green-600/20 text-green-400 border-green-600';
    return 'bg-slate-600/20 text-slate-400 border-slate-600';
  };

  const getStatusText = (isLoading: boolean, isError: boolean, isSuccess: boolean) => {
    if (isLoading) return 'Checking...';
    if (isError) return 'Not authenticated';
    if (isSuccess) return 'Authenticated';
    return 'Unknown';
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5" />
          Authentication Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(sessionQuery.isLoading, sessionQuery.isError, sessionQuery.isSuccess)}
              <span className="text-slate-300">Session Check</span>
            </div>
            <Badge variant="outline" className={getStatusBadge(sessionQuery.isLoading, sessionQuery.isError, sessionQuery.isSuccess)}>
              {getStatusText(sessionQuery.isLoading, sessionQuery.isError, sessionQuery.isSuccess)}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(meQuery.isLoading, meQuery.isError, meQuery.isSuccess)}
              <span className="text-slate-300">Protected Endpoint</span>
            </div>
            <Badge variant="outline" className={getStatusBadge(meQuery.isLoading, meQuery.isError, meQuery.isSuccess)}>
              {getStatusText(meQuery.isLoading, meQuery.isError, meQuery.isSuccess)}
            </Badge>
          </div>
        </div>

        {sessionQuery.data && (
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-2">Session Info</h4>
            <div className="text-xs text-slate-300 space-y-1">
              <p>Authenticated: {sessionQuery.data.authenticated ? 'Yes' : 'No'}</p>
              {sessionQuery.data.user && (
                <>
                  <p>User ID: {sessionQuery.data.user.id}</p>
                  <p>Email: {sessionQuery.data.user.email}</p>
                  <p>Name: {sessionQuery.data.user.name}</p>
                </>
              )}
            </div>
          </div>
        )}

        {meQuery.data && (
          <div className="p-3 bg-green-900/20 border border-green-600/50 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-2">User Details</h4>
            <div className="text-xs text-green-300 space-y-1">
              <p>ID: {meQuery.data.user.id}</p>
              <p>Email: {meQuery.data.user.email}</p>
              <p>Name: {meQuery.data.user.name}</p>
            </div>
          </div>
        )}

        {sessionQuery.isError && (
          <div className="p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
            <p className="text-sm text-red-400">
              Session check failed. This might indicate a connection issue.
            </p>
          </div>
        )}

        {meQuery.isError && sessionQuery.isSuccess && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
            <p className="text-sm text-yellow-400">
              Session exists but protected endpoint failed. This suggests an authentication token issue.
            </p>
            <p className="text-xs text-yellow-300 mt-2">
              Try logging out and logging back in to refresh your authentication token.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
</file>

<file path="apps/web/src/types/stem-audio-analysis.ts">
// Stem Audio Analysis Types for Story 5.2

export interface AudioFeature {
  type: 'rhythm' | 'pitch' | 'intensity' | 'timbre';
  value: number;
  confidence: number;
  timestamp: number;
}

export interface StemAnalysis {
  stemId: string;
  stemType: 'drums' | 'bass' | 'vocals' | 'other' | 'piano' | 'master'; // Includes master stem type
  features: {
    rhythm: AudioFeature[];
    pitch: AudioFeature[];
    intensity: AudioFeature[];
    timbre: AudioFeature[];
  };
  metadata: {
    bpm: number;
    key: string;
    energy: number;
    clarity: number; // Quality metric for Spleeter separation
  };
}

export interface StemProcessorConfig {
  bufferSize: number;
  analysisResolution: number;
  visualizationPreset?: string;
  deviceOptimization: 'mobile' | 'desktop' | 'auto';
  maxConcurrentStems: number;
}

export interface PerformanceMetrics {
  fps: number;
  analysisLatency: number;
  memoryUsage: number;
  cpuUsage: number;
  frameDrops: number;
}

export interface StemFeatureSet {
  stemType: StemAnalysis['stemType'];
  currentFeatures: Record<string, AudioFeature>;
  historicalFeatures: Record<string, AudioFeature[]>;
  correlationData: Record<string, number>; // Cross-stem correlations
}

export type VisualizationFeature = 
  | 'rms' 
  | 'spectralCentroid' 
  | 'spectralRolloff' 
  | 'loudness' 
  | 'perceptualSpread' 
  | 'spectralFlux'
  | 'mfcc'
  | 'chromaVector'
  | 'tempo'
  | 'rhythmPattern';

export interface AnalysisConfig {
  features: Set<VisualizationFeature>;
  bufferSize: number;
  frameRate: number;
  quality: 'low' | 'medium' | 'high';
  enableCrossStemAnalysis: boolean;
}

/**
 * Represents the detailed, time-series audio analysis data for a single track.
 * This is typically generated on the client-side by an analysis worker.
 * The keys are feature names (e.g., "rms", "spectralCentroid", "mfcc_0").
 * The values are Float32Array containing the value of that feature for each analysis frame.
 */
export interface AudioAnalysisDataForTrack {
  [feature: string]: Float32Array;
}
</file>

<file path="apps/web/src/types/stem-visualization.ts">
// Simple types for the current stem visualization implementation
// These are the only types actually being used in the working system

export interface StemVisualizationMapping {
  stemType: 'drums' | 'bass' | 'vocals' | 'piano' | 'other' | 'master';
  enabled: boolean;
  priority: number;
  globalMultiplier: number;
  crossfade: number;
  solo: boolean;
  mute: boolean;
}

export interface VisualizationPreset {
  id: string;
  name: string;
  description: string;
  category: 'electronic' | 'rock' | 'classical' | 'ambient' | 'custom';
  tags: string[];
  mappings: Record<string, StemVisualizationMapping>;
  defaultSettings: {
    masterIntensity: number;
    transitionSpeed: number;
    backgroundAlpha: number;
    particleCount: number;
    qualityLevel: 'low' | 'medium' | 'high';
  };
  createdAt: string;
  updatedAt: string;
  userId?: string;
  isDefault: boolean;
  usageCount: number;
}

// Simple default preset for the current implementation
export const DEFAULT_PRESETS = [
  {
    id: 'default',
    name: 'Default',
    description: 'Default visualization preset',
    category: 'custom' as const,
    tags: ['default'],
    mappings: {},
    defaultSettings: {
      masterIntensity: 1.0,
      transitionSpeed: 1.0,
      backgroundAlpha: 0.1,
      particleCount: 100,
      qualityLevel: 'medium' as const
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    usageCount: 0
  }
];
</file>

<file path="apps/web/src/app/creative-visualizer/page.tsx">
'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Zap, Palette, Settings2, Eye, EyeOff, Info, Map } from 'lucide-react';
import { ThreeVisualizer } from '@/components/midi/three-visualizer';
import { EffectsLibrarySidebar, EffectUIData } from '@/components/ui/EffectsLibrarySidebar';
import { CollapsibleEffectsSidebar } from '@/components/layout/collapsible-effects-sidebar';
import { FileSelector } from '@/components/midi/file-selector';
import { MIDIData, VisualizationSettings, DEFAULT_VISUALIZATION_SETTINGS } from '@/types/midi';
import { VisualizationPreset, StemVisualizationMapping } from '@/types/stem-visualization';
import { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { trpc } from '@/lib/trpc';
import { CollapsibleSidebar } from '@/components/layout/collapsible-sidebar';
import { ProjectPickerModal } from '@/components/projects/project-picker-modal';
import { debugLog } from '@/lib/utils';
import { ProjectCreationModal } from '@/components/projects/project-creation-modal';
import { useStemAudioController } from '@/hooks/use-stem-audio-controller';
import { useAudioAnalysis } from '@/hooks/use-audio-analysis';
import { PortalModal } from '@/components/ui/portal-modal';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MappingSourcesPanel } from '@/components/ui/MappingSourcesPanel';
import { DroppableParameter } from '@/components/ui/droppable-parameter';
import { LayerContainer } from '@/components/video-composition/LayerContainer';
import { useTimelineStore } from '@/stores/timelineStore';
import { UnifiedTimeline } from '@/components/video-composition/UnifiedTimeline';
import { TestVideoComposition } from '@/components/video-composition/TestVideoComposition';
import type { Layer } from '@/types/video-composition';
import { useFeatureValue } from '@/hooks/use-feature-value';
import { HudOverlayProvider, useHudOverlayContext } from '@/components/hud/HudOverlayManager';
import { AspectRatioSelector } from '@/components/ui/aspect-ratio-selector';
import { getAspectRatioConfig } from '@/lib/visualizer/aspect-ratios';
import { useProjectSettingsStore } from '@/stores/projectSettingsStore';

// Derived boolean: are stem URLs ready?
// const stemUrlsReady = Object.keys(asyncStemUrlMap).length > 0; // This line was moved

// Wrapper component that provides HUD overlay functionality to the sidebar
const EffectsLibrarySidebarWithHud: React.FC<{
  effects: any[];
  selectedEffects: Record<string, boolean>;
  onEffectToggle: (effectId: string) => void;
  onEffectDoubleClick: (effectId: string) => void;
  isVisible: boolean;
  stemUrlsReady: boolean;
}> = ({ effects, selectedEffects, onEffectToggle, onEffectDoubleClick, isVisible, stemUrlsReady }) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const hudContext = useHudOverlayContext();
  
  const handleEffectDoubleClick = (effectId: string) => {
    if (!stemUrlsReady) {
      debugLog.warn('[EffectsLibrarySidebarWithHud] Overlay creation blocked: stem URLs not ready');
      return;
    }
    const effect = effects.find(e => e.id === effectId);
    if (effect && effect.category === 'Overlays' && isClient) {
      // Map effect ID to overlay type
      const overlayTypeMap: Record<string, string> = {
        'waveform': 'waveform',
        'spectrogram': 'spectrogram',
        'peakMeter': 'peakMeter',
        'stereometer': 'stereometer',
        'oscilloscope': 'oscilloscope',
        'spectrumAnalyzer': 'spectrumAnalyzer',
        'midiMeter': 'midiMeter'
      };
      
      const overlayType = overlayTypeMap[effectId];
      if (overlayType) {
        debugLog.log('🎯 Adding HUD overlay:', overlayType);
        hudContext.addOverlay(overlayType);
      }
    }
    onEffectDoubleClick(effectId);
  };
  
  return (
    <EffectsLibrarySidebar
      effects={effects}
      selectedEffects={selectedEffects}
      onEffectToggle={onEffectToggle}
      onEffectDoubleClick={handleEffectDoubleClick}
      isVisible={isVisible}
    />
  );
};

// Sample MIDI data for demonstration
const createSampleMIDIData = (): MIDIData => {
  const notes: any[] = [];
  const melodyPattern = [60, 64, 67, 72, 69, 65, 62, 60, 67, 64, 69, 72, 74, 67, 64, 60];
  for (let i = 0; i < melodyPattern.length; i++) {
    notes.push({
      id: `melody-${i}`,
      start: i * 0.5,
      duration: 0.4,
      pitch: melodyPattern[i],
      velocity: 60 + Math.random() * 40,
      track: 'melody',
      noteName: `Note${melodyPattern[i]}`,
    });
  }
  const chordTimes = [2, 4, 6, 8];
  chordTimes.forEach((time, idx) => {
    const chordNotes = [48, 52, 55];
    chordNotes.forEach((note, noteIdx) => {
      notes.push({
        id: `chord-${idx}-${noteIdx}`,
        start: time,
        duration: 1.5,
        pitch: note,
        velocity: 40 + Math.random() * 30,
        track: 'melody',
        noteName: `Chord${note}`,
      });
    });
  });

  return {
    file: {
      name: 'Creative Demo.mid',
      size: 1024,
      duration: 10.0,
      ticksPerQuarter: 480,
      timeSignature: [4, 4],
      keySignature: 'C Major'
    },
    tracks: [
      { id: 'melody', name: 'Synth Lead', instrument: 'Synthesizer', channel: 1, color: '#84a98c', visible: true, notes: notes },
      { id: 'bass', name: 'Bass Synth', instrument: 'Bass', channel: 2, color: '#6b7c93', visible: true, notes: [
          { id: 'b1', start: 0.0, duration: 1.0, pitch: 36, velocity: 100, track: 'bass', noteName: 'C2' },
          { id: 'b2', start: 1.0, duration: 1.0, pitch: 40, velocity: 95, track: 'bass', noteName: 'E2' },
          { id: 'b3', start: 2.0, duration: 1.0, pitch: 43, velocity: 90, track: 'bass', noteName: 'G2' },
          { id: 'b4', start: 3.0, duration: 1.0, pitch: 48, velocity: 85, track: 'bass', noteName: 'C3' },
          { id: 'b5', start: 4.0, duration: 2.0, pitch: 36, velocity: 100, track: 'bass', noteName: 'C2' },
        ]
      },
      { id: 'drums', name: 'Drums', instrument: 'Drum Kit', channel: 10, color: '#b08a8a', visible: true, notes: [
          { id: 'd1', start: 0.0, duration: 0.1, pitch: 36, velocity: 120, track: 'drums', noteName: 'Kick' },
          { id: 'd2', start: 0.5, duration: 0.1, pitch: 42, velocity: 80, track: 'drums', noteName: 'HiHat' },
          { id: 'd3', start: 1.0, duration: 0.1, pitch: 38, velocity: 100, track: 'drums', noteName: 'Snare' },
          { id: 'd4', start: 1.5, duration: 0.1, pitch: 42, velocity: 70, track: 'drums', noteName: 'HiHat' },
          { id: 'd5', start: 2.0, duration: 0.1, pitch: 36, velocity: 127, track: 'drums', noteName: 'Kick' },
          { id: 'd6', start: 2.5, duration: 0.1, pitch: 42, velocity: 85, track: 'drums', noteName: 'HiHat' },
          { id: 'd7', start: 3.0, duration: 0.1, pitch: 38, velocity: 110, track: 'drums', noteName: 'Snare' },
          { id: 'd8', start: 3.5, duration: 0.1, pitch: 42, velocity: 75, track: 'drums', noteName: 'HiHat' },
        ]
      }
    ],
    tempoChanges: [
      { tick: 0, bpm: 120, microsecondsPerQuarter: 500000 }
    ]
  };
};

// Transform backend MIDI data to frontend format
const transformBackendToFrontendMidiData = (backendData: any): MIDIData => {
  return {
    file: {
      name: backendData.file.name,
      size: backendData.file.size,
      duration: backendData.file.duration,
      ticksPerQuarter: backendData.file.ticksPerQuarter,
      timeSignature: backendData.file.timeSignature,
      keySignature: backendData.file.keySignature
    },
    tracks: backendData.tracks.map((track: any) => ({
      id: String(track.id),
      name: track.name,
      instrument: track.instrument,
      channel: track.channel,
      color: track.color,
      visible: true,
      notes: track.notes.map((note: any) => ({
        id: note.id,
        start: note.startTime, // Backend: startTime -> Frontend: start
        duration: note.duration,
        pitch: note.note,      // Backend: note -> Frontend: pitch
        velocity: note.velocity,
        track: String(track.id), // Backend: track (number) -> Frontend: track (string)
        noteName: note.name,   // Backend: name -> Frontend: noteName
      }))
    })),
    tempoChanges: backendData.tempoChanges
  };
};


function CreativeVisualizerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [useDemoData, setUseDemoData] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [settings, setSettings] = useState<VisualizationSettings>(DEFAULT_VISUALIZATION_SETTINGS);
  const {
    layers,
    currentTime,
    isPlaying,
    selectedLayerId,
    addLayer,
    updateLayer,
    deleteLayer,
    selectLayer,
    setCurrentTime,
    setDuration,
    togglePlay,
    setPlaying,
  } = useTimelineStore();
  const [fps, setFps] = useState(60);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<VisualizationPreset>({
    id: 'default',
    name: 'Default',
    description: 'Default visualization preset',
    category: 'custom',
    tags: ['default'],
    mappings: {},
    defaultSettings: {
      masterIntensity: 1.0,
      transitionSpeed: 1.0,
      backgroundAlpha: 0.1,
      particleCount: 100,
      qualityLevel: 'medium'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    usageCount: 0
  });

  // Effects timeline has been merged into layers via store
  const [showVideoComposition, setShowVideoComposition] = useState(false);

  // Effects carousel state (now for timeline-based effects)
  const [selectedEffects, setSelectedEffects] = useState<Record<string, boolean>>({});

  // Visualizer aspect ratio toggle state - now using modular system
  const [visualizerAspectRatio, setVisualizerAspectRatio] = useState<string>('mobile');

  // Effect parameter modal state
  const [openEffectModals, setOpenEffectModals] = useState<Record<string, boolean>>({
    'metaballs': false,
    'midiHud': false,
    'particleNetwork': false
  });

  // Feature mapping state
  interface FeatureMapping {
    featureId: string | null;
    modulationAmount: number; // 0-1, default 1.0 (100%)
  }
  const [mappings, setMappings] = useState<Record<string, FeatureMapping>>({});
  const [featureNames, setFeatureNames] = useState<Record<string, string>>({});
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  // Base (user-set) parameter values and last modulated values for visualization
  const [baseParameterValues, setBaseParameterValues] = useState<Record<string, number>>({});
  const [modulatedParameterValues, setModulatedParameterValues] = useState<Record<string, number>>({});

  // Real-time sync calibration offset in ms
  const [syncOffsetMs, setSyncOffsetMs] = useState(0);

  // Performance monitoring for sync debugging
  const [syncMetrics, setSyncMetrics] = useState({
    audioLatency: 0,
    visualLatency: 0,
    syncDrift: 0,
    frameTime: 0,
    lastUpdate: 0
  });

  const [sampleMidiData] = useState<MIDIData>(createSampleMIDIData());
  const stemAudio = useStemAudioController();
  const audioAnalysis = useAudioAnalysis();
  
  // Sync performance monitoring
  useEffect(() => {
    if (!isPlaying) return;
    
    const updateSyncMetrics = () => {
      const now = performance.now();
      const audioTime = stemAudio.currentTime;
      const visualTime = currentTime;
      const audioLatency = stemAudio.getAudioLatency ? stemAudio.getAudioLatency() * 1000 : 0;
      const frameTime = now - syncMetrics.lastUpdate;
      
      setSyncMetrics({
        audioLatency,
        visualLatency: frameTime,
        syncDrift: Math.abs(audioTime - visualTime) * 1000, // Convert to ms
        frameTime,
        lastUpdate: now
      });
    };
    
    const interval = setInterval(updateSyncMetrics, 100); // Update every 100ms
    return () => clearInterval(interval);
  }, [isPlaying, stemAudio.currentTime, currentTime, syncMetrics.lastUpdate]);
  
  // Enhanced audio analysis data - This state is no longer needed, data comes from useCachedStemAnalysis
  // const [audioAnalysisData, setAudioAnalysisData] = useState<any>(null);
  
  const [showPicker, setShowPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isLoadingStemsRef = useRef(false);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  
  // Ref to track current analysis state to avoid stale closures
  const currentAnalysisRef = useRef(audioAnalysis.cachedAnalysis);
  
  // Update ref when analysis changes
  useEffect(() => {
    currentAnalysisRef.current = audioAnalysis.cachedAnalysis;
  }, [audioAnalysis.cachedAnalysis]);

  // Get download URL mutation
  const getDownloadUrlMutation = trpc.file.getDownloadUrl.useMutation();

  // Fetch current project information
  const { 
    data: projectData, 
    isLoading: projectLoading, 
    error: projectError 
  } = trpc.project.get.useQuery(
    { id: currentProjectId! },
    { enabled: !!currentProjectId }
  );

  // Fetch project files to get available stems
  const { 
    data: projectFiles, 
    isLoading: projectFilesLoading 
  } = trpc.file.getUserFiles.useQuery(
    { 
      limit: 20, 
      fileType: 'all',
      projectId: currentProjectId || undefined
    },
    { enabled: !!currentProjectId }
  );

  // Fetch MIDI visualization data
  const { 
    data: fileData, 
    isLoading: fileLoading, 
    error: fileError 
  } = trpc.midi.getVisualizationData.useQuery(
    { fileId: selectedFileId! },
    { enabled: !!selectedFileId && !useDemoData }
  );

  useEffect(() => {
    const fileId = searchParams.get('fileId');
    const projectId = searchParams.get('projectId');
    
    if (projectId) {
      setCurrentProjectId(projectId);
      setUseDemoData(false);
    }
    
    if (fileId) {
      setSelectedFileId(fileId);
      setUseDemoData(false);
    }

    // If no project or file is specified, default to demo mode
    if (!projectId && !fileId) {
      setUseDemoData(true);
    }

    const projectIdFromParams = searchParams.get('projectId');
    if (!projectIdFromParams) {
      setShowPicker(true);
    } else {
      setShowPicker(false);
    }

    // Mark as initialized after processing URL params
    setIsInitialized(true);
  }, [searchParams]);

  // Helper to sort stems: non-master first, master last
  function sortStemsWithMasterLast(stems: any[]) {
    return [...stems].sort((a, b) => {
      if (a.is_master && !b.is_master) return 1;
      if (!a.is_master && b.is_master) return -1;
      return 0;
    });
  }

  // Load stems when project files are available
  useEffect(() => {
    // This effect now correctly handles both initial load and changes to project files
    if (projectFiles?.files && currentProjectId && isInitialized && !audioAnalysis.isLoading) {
      let cancelled = false;
      
      const loadStemsWithUrls = async () => {
        // Prevent re-loading if already in progress
        if (isLoadingStemsRef.current) return;
        isLoadingStemsRef.current = true;

        try {
          const audioFiles = projectFiles.files.filter(file => 
            file.file_type === 'audio' && file.upload_status === 'completed'
          );

          if (audioFiles.length > 0) {
            debugLog.log('Found audio files, preparing to load:', audioFiles.map(f => f.file_name));
            debugLog.log('Master stem info:', audioFiles.map(f => ({ name: f.file_name, is_master: f.is_master })));
            
            // Debug: Log file structure to see what fields are available
            debugLog.log('Audio file structure sample:', audioFiles[0]);
            
            // Sort so master is last
            const sortedAudioFiles = sortStemsWithMasterLast(audioFiles.map(f => ({
              ...f,
              stemType: f.stem_type || getStemTypeFromFileName(f.file_name)
            })));

            const stemsToLoad = await Promise.all(
              sortedAudioFiles.map(async file => {
                // Debug: Check if file.id exists
                if (!file.id) {
                  debugLog.error('File missing ID:', file);
                  throw new Error(`File missing ID: ${file.file_name}`);
                }
                
                debugLog.log('Getting download URL for file:', { id: file.id, name: file.file_name });
                const result = await getDownloadUrlMutation.mutateAsync({ fileId: file.id });
                return {
                  id: file.id,
                  url: result.downloadUrl,
                  label: file.file_name,
                  isMaster: file.is_master || false,
                  stemType: file.stemType
                };
              })
            );

            if (!cancelled) {
              // Process non-master first, then master
              const nonMasterStems = stemsToLoad.filter(s => !s.isMaster);
              const masterStems = stemsToLoad.filter(s => s.isMaster);
              await stemAudio.loadStems(nonMasterStems, (stemId, audioBuffer) => {
                const stem = nonMasterStems.find(s => s.id === stemId);
                // Use ref to get current state to avoid stale closure
                const currentAnalysis = currentAnalysisRef.current;
                const hasAnalysis = currentAnalysis.some(a => a.fileMetadataId === stemId);
                debugLog.log('🎵 Stem loaded callback:', { 
                  stemId, 
                  stemType: stem?.stemType, 
                  hasAnalysis,
                  cachedAnalysisCount: currentAnalysis.length,
                  cachedAnalysisIds: currentAnalysis.map(a => a.fileMetadataId)
                });
                if (stem && !hasAnalysis) {
                  debugLog.log('🎵 Triggering analysis for stem:', stemId, stem.stemType);
                  audioAnalysis.analyzeAudioBuffer(stemId, audioBuffer, stem.stemType);
                } else {
                  debugLog.log('🎵 Skipping analysis for stem:', stemId, 'reason:', !stem ? 'no stem found' : 'analysis already exists');
                }
              });
              if (masterStems.length > 0) {
                await stemAudio.loadStems(masterStems, (stemId, audioBuffer) => {
                  const stem = masterStems.find(s => s.id === stemId);
                  // Use ref to get current state to avoid stale closure
                  const currentAnalysis = currentAnalysisRef.current;
                  const hasAnalysis = currentAnalysis.some(a => a.fileMetadataId === stemId);
                  debugLog.log('🎵 Master stem loaded callback:', { 
                    stemId, 
                    stemType: stem?.stemType, 
                    hasAnalysis,
                    cachedAnalysisCount: currentAnalysis.length,
                    cachedAnalysisIds: currentAnalysis.map(a => a.fileMetadataId)
                  });
                  if (stem && !hasAnalysis) {
                    debugLog.log('🎵 Triggering analysis for master stem:', stemId, stem.stemType);
                    audioAnalysis.analyzeAudioBuffer(stemId, audioBuffer, stem.stemType);
                  } else {
                    debugLog.log('🎵 Skipping analysis for master stem:', stemId, 'reason:', !stem ? 'no stem found' : 'analysis already exists');
                  }
                });
              }
            }
          } else {
            debugLog.log('No completed audio files found in project.');
          }
        } catch (error) {
          if (!cancelled) {
            debugLog.error('Failed to load stems:', error);
          }
        } finally {
          if (!cancelled) {
            isLoadingStemsRef.current = false;
          }
        }
      };
      
      loadStemsWithUrls();
      return () => { 
        cancelled = true; 
        isLoadingStemsRef.current = false;
      };
    }
  }, [projectFiles?.files, currentProjectId, isInitialized, audioAnalysis.isLoading]); // Removed audioAnalysis.cachedAnalysis from dependencies

  

  const availableStems = projectFiles?.files?.filter(file => 
    file.file_type === 'audio' && file.upload_status === 'completed'
  ) || [];

  // Load all analyses when stems are available
  useEffect(() => {
    if (availableStems.length > 0) {
      const stemIds = availableStems.map(stem => stem.id);
      audioAnalysis.loadAnalysis(stemIds);
    }
  }, [availableStems.length]); // Only depend on stem count, not the analysis functions



  const midiData = useDemoData ? sampleMidiData : (fileData?.midiData ? transformBackendToFrontendMidiData(fileData.midiData) : undefined);
  const visualizationSettings = useDemoData ? DEFAULT_VISUALIZATION_SETTINGS : (fileData?.settings || DEFAULT_VISUALIZATION_SETTINGS);

  const handleFileSelected = (fileId: string) => {
    setSelectedFileId(fileId);
    setUseDemoData(false);
    setCurrentTime(0);
    setPlaying(false);
    
    const params = new URLSearchParams(searchParams);
    params.set('fileId', fileId);
    router.push(`/creative-visualizer?${params.toString()}`, { scroll: false });
  };

  const handleDemoModeChange = useCallback((demoMode: boolean) => {
    setUseDemoData(demoMode);
    setCurrentTime(0);
    setPlaying(false);
    
    if (demoMode) {
      const params = new URLSearchParams(searchParams);
      params.delete('fileId');
      const newUrl = params.toString() ? `/creative-visualizer?${params.toString()}` : '/creative-visualizer';
      router.push(newUrl, { scroll: false });
    }
  }, [searchParams, router]);

  const handlePlayPause = async () => {
    // Control both MIDI visualization and stem audio
    if (isPlaying) {
      stemAudio.pause();
      setPlaying(false);
    } else {
      // Only start if we have stems loaded
      if (hasStems) {
        try {
          await stemAudio.play();
          setPlaying(true);
        } catch (error) {
          debugLog.error('Failed to start audio playback:', error);
          setPlaying(false);
        }
      } else {
        setPlaying(true);
      }
    }
  };

  const handleReset = () => {
    stemAudio.stop();
    setPlaying(false);
    setCurrentTime(0);
  };

  const handleProjectSelect = (projectId: string) => {
    setCurrentProjectId(projectId);
    setShowPicker(false);
    const params = new URLSearchParams(searchParams);
    params.set('projectId', projectId);
    router.push(`/creative-visualizer?${params.toString()}`);
  };

  const handleCreateNew = () => {
    setShowPicker(false);
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  


  

  // Check if stems are actually loaded in the audio controller, not just available in the project
  const hasStems = availableStems.length > 0 && stemAudio.stemsLoaded;
  
  // Check if we're currently loading stems
  const stemLoadingState = availableStems.length > 0 && !stemAudio.stemsLoaded;

  // Effects data for new sidebar (with categories and rarity)
  const effects: EffectUIData[] = [
    { 
      id: 'metaballs', 
      name: 'Metaballs Effect', 
      description: 'Organic, fluid-like visualizations that respond to audio intensity',
      category: 'Generative',
      rarity: 'Rare',
      image: '/effects/generative/metaballs.png',
      parameters: {} // <-- Added
    },
    { 
      id: 'midiHud', 
      name: 'HUD Effect', 
      description: 'Technical overlay displaying real-time audio analysis and MIDI data',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {} // <-- Added
    },
    { 
      id: 'particleNetwork', 
      name: 'Particle Effect', 
      description: 'Dynamic particle systems that react to rhythm and pitch',
      category: 'Generative',
      rarity: 'Mythic',
      image: '/effects/generative/particles.png',
      parameters: {} // Empty - modal is handled by ThreeVisualizer
    },
    // HUD Overlay Effects
    { 
      id: 'waveform', 
      name: 'Waveform Overlay', 
      description: 'Real-time audio waveform visualization',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'spectrogram', 
      name: 'Spectrogram Overlay', 
      description: 'Frequency vs time visualization with color mapping',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'peakMeter', 
      name: 'Peak/LUFS Meter', 
      description: 'Professional audio level metering with peak and LUFS measurements',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'stereometer', 
      name: 'Stereometer Overlay', 
      description: 'Stereo field visualization and correlation meter',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'oscilloscope', 
      name: 'Oscilloscope Overlay', 
      description: 'Real-time waveform oscilloscope with pitch tracking',
      category: 'Overlays',
      rarity: 'Mythic',
      parameters: {}
    },
    { 
      id: 'spectrumAnalyzer', 
      name: 'Spectrum Analyzer', 
      description: 'FFT-based frequency spectrum visualization',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'midiMeter', 
      name: 'MIDI Activity Meter', 
      description: 'Real-time MIDI note and velocity visualization',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'vuMeter', 
      name: 'VU Meter', 
      description: 'Classic VU meter with needle and bar styles',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'chromaWheel', 
      name: 'Chroma Wheel', 
      description: '12-note chroma wheel for pitch class visualization',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'consoleFeed', 
      name: 'Data Feed', 
      description: 'Live data feed for MIDI, LUFS, FFT, and more',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    }
  ];

  const handleSelectEffect = (effectId: string) => {
    // Toggle the effect selection
    setSelectedEffects(prev => ({
      ...prev,
      [effectId]: !prev[effectId]
    }));
    
    // Open the parameter modal for this effect
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: true
    }));
  };

  const handleEffectDoubleClick = (effectId: string) => {
    // Open the parameter modal for this effect
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: true
    }));
  };

  // Effect clip timeline is merged into layers via store; per-effect UI remains via modals



  const handleCloseEffectModal = (effectId: string) => {
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: false
    }));
  };

  // Video composition handlers moved into store (addLayer, updateLayer, deleteLayer, selectLayer)





  // Feature mapping handlers
  const handleMapFeature = (parameterId: string, item: { id: string, decayTime?: number }) => {
    const { id: featureId } = item;
    debugLog.log('🎛️ Creating mapping:', {
      parameterId,
      featureId,
      parameterName: parameterId.split('-')[1],
      effectId: parameterId.split('-')[0]
    });
    
    setMappings(prev => ({ 
      ...prev, 
      [parameterId]: { 
        featureId, 
        modulationAmount: 0.5 // Default to 50% (noon)
      } 
    }));
    
    // Store feature name for display
    const featureName = featureId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    setFeatureNames(prev => ({ ...prev, [featureId]: featureName }));
    
    debugLog.log('🎛️ Mapping created successfully');
  };

  const handleUnmapFeature = (parameterId: string) => {
    debugLog.log('🎛️ Removing mapping:', {
      parameterId,
      currentMapping: mappings[parameterId]
    });
    
    setMappings(prev => ({ 
      ...prev, 
      [parameterId]: { 
        featureId: null, 
        modulationAmount: 0.5 
      } 
    }));
    
    debugLog.log('🎛️ Mapping removed successfully');
  };

  const handleModulationAmountChange = (parameterId: string, amount: number) => {
    setMappings(prev => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        modulationAmount: amount
      }
    }));
  };

  // Handler for selecting a stem/track
  const handleStemSelect = (stemId: string) => {
    debugLog.log('🎛️ Selecting stem:', {
      stemId,
      previousActiveTrack: activeTrackId,
      availableAnalyses: audioAnalysis.cachedAnalysis?.map(a => ({
        id: a.fileMetadataId,
        stemType: a.stemType,
        hasData: !!a.analysisData,
        features: a.analysisData ? Object.keys(a.analysisData) : []
      })) || []
    });
    
    setActiveTrackId(stemId);
    
    // Log the analysis data for the selected stem
    const selectedAnalysis = audioAnalysis.cachedAnalysis?.find(a => a.fileMetadataId === stemId);
    if (selectedAnalysis) {
      debugLog.log('🎛️ Selected stem analysis:', {
        stemId,
        stemType: selectedAnalysis.stemType,
        duration: selectedAnalysis.metadata.duration,
        features: selectedAnalysis.analysisData ? Object.keys(selectedAnalysis.analysisData) : [],
        sampleValues: selectedAnalysis.analysisData ? 
          Object.entries(selectedAnalysis.analysisData).reduce((acc, [feature, data]) => {
            if (Array.isArray(data) && data.length > 0) {
              acc[feature] = {
                length: data.length,
                firstValue: data[0],
                lastValue: data[data.length - 1],
                sampleValues: data.slice(0, 5) // First 5 values
              };
            }
            return acc;
          }, {} as Record<string, any>) : {}
      });
    } else {
      debugLog.warn('🎛️ No analysis found for selected stem:', stemId);
    }
  };

  const [activeSliderValues, setActiveSliderValues] = useState<Record<string, number>>({});
  const visualizerRef = useRef<any>(null);
  const animationFrameId = useRef<number>();

  // Sync project-wide background settings to the visualizer engine
  const { backgroundColor, isBackgroundVisible } = useProjectSettingsStore();
  useEffect(() => {
    const manager = visualizerRef.current;
    if (!manager) return;
    try {
      if (typeof manager.setBackgroundColor === 'function') {
        manager.setBackgroundColor(backgroundColor);
      }
      if (typeof manager.setBackgroundVisibility === 'function') {
        manager.setBackgroundVisibility(isBackgroundVisible);
      }
    } catch {}
  }, [backgroundColor, isBackgroundVisible, visualizerRef]);

  // Function to convert frontend feature names to backend analysis keys
  const getAnalysisKeyFromFeatureId = (featureId: string): string => {
    // Frontend feature IDs are like "drums-rms-volume", "bass-loudness", etc.
    // Backend analysis data has keys like "rms", "loudness", etc.
    const parts = featureId.split('-');
    if (parts.length >= 2) {
      // Remove the stem type prefix and get the feature name
      const featureName = parts.slice(1).join('-');
      
      // Map frontend feature names to backend analysis keys
      const featureMapping: Record<string, string> = {
        'rms-volume': 'rms',
        'loudness': 'loudness',
        'spectral-centroid': 'spectralCentroid',
        'spectral-rolloff': 'spectralRolloff',
        'spectral-flux': 'spectralFlux',
        'mfcc-1': 'mfcc_0', // Meyda uses 0-indexed MFCC
        'mfcc-2': 'mfcc_1',
        'mfcc-3': 'mfcc_2',
        'perceptual-spread': 'perceptualSpread',
        'energy': 'energy',
        'zcr': 'zcr',
        'beat-intensity': 'beatIntensity',
        'rhythm-pattern': 'rhythmPattern',
        'attack-time': 'attackTime',
        'chroma-vector': 'chromaVector',
        'harmonic-content': 'harmonicContent',
        'sub-bass': 'subBass',
        'warmth': 'warmth',
        'spectral-complexity': 'spectralComplexity',
        'texture': 'texture',
        'pitch-height': 'pitchHeight',
        'pitch-movement': 'pitchMovement',
        'melody-complexity': 'melodyComplexity',
        'expression': 'expression'
      };
      
      return featureMapping[featureName] || featureName;
    }
    return featureId; // Fallback to original if no prefix
  };

  // Function to get the stem type from a feature ID
  const getStemTypeFromFeatureId = (featureId: string): string | null => {
    const parts = featureId.split('-');
    if (parts.length >= 2) {
      return parts[0]; // First part is the stem type
    }
    return null;
  };

  // Track when visualizer ref becomes available
  useEffect(() => {
    if (visualizerRef.current) {
      debugLog.log('🎛️ Visualizer ref available:', {
        hasRef: !!visualizerRef.current,
        availableEffects: visualizerRef.current?.getAllEffects?.()?.map((e: any) => e.id) || [],
        selectedEffects: Object.keys(selectedEffects).filter(k => selectedEffects[k])
      });
    } else {
      debugLog.log('🎛️ Visualizer ref not available yet');
    }
  }, [visualizerRef.current, selectedEffects]);

  // Real-time feature mapping and visualizer update loop
  useEffect(() => {
    let cachedMappings: [string, string][] = [];
    let lastUpdateTime = 0;
    let frameCount = 0;

    const animationLoop = () => {
      if (!isPlaying || !visualizerRef.current) {
        animationFrameId.current = requestAnimationFrame(animationLoop);
        return;
      }
      
      // 30FPS CAP
      const now = performance.now();
      const elapsed = now - lastUpdateTime;
      const targetFrameTime = 1000 / 30;
      
      if (elapsed < targetFrameTime) {
        animationFrameId.current = requestAnimationFrame(animationLoop);
        return;
      }
      
      lastUpdateTime = now;
      frameCount++;
      
      // Get current audio time
      const time = stemAudio.currentTime;
      setCurrentTime(time);
      
      // Sync calculation (keep your existing code)
      const audioContextTime = stemAudio.getAudioContextTime?.() || 0;
      const scheduledStartTime = stemAudio.scheduledStartTimeRef?.current || 0;
      const measuredLatency = stemAudio.getAudioLatency?.() || 0;
      const audioPlaybackTime = Math.max(0, audioContextTime - scheduledStartTime);
      let syncTime = Math.max(0, audioPlaybackTime - measuredLatency + (syncOffsetMs / 1000));
      
      // 🔥 FIX: Handle audio looping by wrapping syncTime to analysis duration
      if (audioAnalysis.cachedAnalysis.length > 0) {
        const analysisDuration = audioAnalysis.cachedAnalysis[0]?.metadata?.duration || 1;
        if (analysisDuration > 0) {
          syncTime = syncTime % analysisDuration; // Wrap time to loop within analysis duration
        }
      }

      // Cache mappings
      if (cachedMappings.length !== Object.keys(mappings).length) {
        cachedMappings = Object.entries(mappings)
          .filter(([, mapping]) => mapping.featureId !== null)
          .map(([paramKey, mapping]) => [paramKey, mapping.featureId!]) as [string, string][];
      }

      // 🔥 THE FIX: Use enhancedAudioAnalysis instead of cachedStemAnalysis
      if (audioAnalysis.cachedAnalysis && audioAnalysis.cachedAnalysis.length > 0) {
        for (const [paramKey, featureId] of cachedMappings) {
          if (!featureId) continue;

          // Parse feature ID: "drums-rms"
          const featureStemType = getStemTypeFromFeatureId(featureId);
          if (!featureStemType) continue;

          // 🔥 CHANGED: Use audioAnalysis.getFeatureValue from consolidated hook
          // Find the analysis for this stem type to get its file ID
          const stemAnalysis = audioAnalysis.cachedAnalysis?.find(
            a => a.stemType === featureStemType
          );
          if (!stemAnalysis) continue;

          // Use the hook's getFeatureValue which properly handles both Float32Arrays and time-indexed arrays
          const rawValue = audioAnalysis.getFeatureValue(
            stemAnalysis.fileMetadataId,
            featureId,
            syncTime,
            featureStemType
          );

          if (rawValue === null || rawValue === undefined) continue;

          // Parse parameter key: "metaballs-glowIntensity"
          const [effectId, ...paramParts] = paramKey.split('-');
          const paramName = paramParts.join('-');
          
          if (!effectId || !paramName) continue;

          // Scale to parameter range with modulation amount attenuation
          const maxValue = getSliderMax(paramName);
          // Bipolar attenuverter: mapping.modulationAmount in [0..1] maps to [-1..+1] around noon
          // Range clamp to ±0.5 (±50%) so modulation isn't too extreme
          const knobFull = (mappings[paramKey]?.modulationAmount ?? 0.5) * 2 - 1; // -1..+1
          const knob = Math.max(-0.5, Math.min(0.5, knobFull));
          const baseValue = baseParameterValues[paramKey] ?? (activeSliderValues[paramKey] ?? 0);
          const delta = rawValue * knob * maxValue; // modulation contribution
          const scaledValue = Math.max(0, Math.min(maxValue, baseValue + delta));

          // Update visualizer
          visualizerRef.current.updateEffectParameter(effectId, paramName, scaledValue);
          
          // Update React state occasionally
          if (frameCount % 10 === 0) {
            setModulatedParameterValues(prev => ({ ...prev, [paramKey]: scaledValue }));
          }
        }
      }


      animationFrameId.current = requestAnimationFrame(animationLoop);
    };

    animationFrameId.current = requestAnimationFrame(animationLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [
    isPlaying, 
    mappings, 
    audioAnalysis.cachedAnalysis,
    stemAudio, 
    syncOffsetMs
  ]);
  
  const getSliderMax = (paramName: string) => {
    if (paramName === 'base-radius') return 1.0;
    if (paramName === 'animation-speed') return 2.0;
    if (paramName === 'glow-intensity') return 3.0;
    if (paramName === 'hud-opacity') return 1.0;
    if (paramName === 'max-particles') return 200;
    if (paramName === 'connection-distance') return 5.0;
    if (paramName === 'particle-size') return 50;
    return 100; // Default max for other numeric parameters
  };

  const getSliderStep = (paramName: string) => {
    if (paramName === 'base-radius') return 0.1;
    if (paramName === 'animation-speed') return 0.1;
    if (paramName === 'glow-intensity') return 0.1;
    if (paramName === 'hud-opacity') return 0.1;
    if (paramName === 'max-particles') return 10;
    if (paramName === 'connection-distance') return 0.1;
    if (paramName === 'particle-size') return 5;
    return 1; // Default step for other numeric parameters
  };

  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    const paramKey = `${effectId}-${paramName}`;
    // Slider sets the base value regardless of mapping
    setBaseParameterValues(prev => ({ ...prev, [paramKey]: value }));
    setActiveSliderValues(prev => ({ ...prev, [paramKey]: value }));
    // In a real application, you would update the effect's parameters here
    // For now, we'll just update the state to reflect the current value in the modal
  };

  const effectModals = Object.entries(openEffectModals).map(([effectId, isOpen], index) => {
    if (!isOpen) return null;
    const effectInstance = effects.find(e => e.id === effectId);
    if (!effectInstance) return null;
    const sortedParams = Object.entries(effectInstance.parameters || {}).sort(([, a], [, b]) => {
      if (typeof a === 'boolean' && typeof b !== 'boolean') return -1;
      if (typeof a !== 'boolean' && typeof b === 'boolean') return 1;
      return 0;
    });
    if (sortedParams.length === 0) return null;
    const initialPos = {
      x: 100 + (index * 50),
      y: 100 + (index * 50)
    };
    return (
      <PortalModal
        key={effectId}
        title={effectInstance.name.replace(' Effect', '')}
        isOpen={isOpen}
        onClose={() => handleCloseEffectModal(effectId)}
        initialPosition={initialPos}
        bounds="#editor-bounds"
      >
        <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
          {sortedParams.map(([paramName, value]) => {
            if (typeof value === 'boolean') {
              return (
                <div key={paramName} className="flex items-center justify-between">
                  <Label className="text-white/80 text-xs font-mono">{paramName}</Label>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) => handleParameterChange(effectId, paramName, checked)}
                  />
                </div>
              );
            }
            if (typeof value === 'number') {
              const paramKey = `${effectId}-${paramName}`;
              const mapping = mappings[paramKey];
              const mappedFeatureId = mapping?.featureId || null;
              const mappedFeatureName = mappedFeatureId ? featureNames[mappedFeatureId] : undefined;
              const modulationAmount = mapping?.modulationAmount ?? 0.5;
              const baseVal = activeSliderValues[paramKey] ?? value;
              return (
                <DroppableParameter
                  key={paramKey}
                  parameterId={paramKey}
                  label={paramName}
                  mappedFeatureId={mappedFeatureId}
                  mappedFeatureName={mappedFeatureName}
                  modulationAmount={modulationAmount}
                  baseValue={baseParameterValues[paramKey] ?? baseVal}
                  modulatedValue={modulatedParameterValues[paramKey] ?? baseVal}
                  sliderMax={getSliderMax(paramName)}
                  onFeatureDrop={handleMapFeature}
                  onFeatureUnmap={handleUnmapFeature}
                  onModulationAmountChange={handleModulationAmountChange}
                  className="mb-2"
                  dropZoneStyle="inlayed"
                  showTagOnHover
                >
                                            <Slider
                            value={[activeSliderValues[paramKey] ?? value]}
                            onValueChange={([val]) => {
                              setActiveSliderValues(prev => ({ ...prev, [paramKey]: val }));
                              handleParameterChange(effectId, paramName, val);
                            }}
                            min={0}
                            max={getSliderMax(paramName)}
                            step={getSliderStep(paramName)}
                            className="w-full"
                            disabled={!!mappedFeatureId} // Disable manual control when mapped
                          />
                </DroppableParameter>
              );
            }
            if ((paramName === 'highlightColor' || paramName === 'particleColor') && Array.isArray(value)) {
              const displayName = paramName === 'highlightColor' ? 'Highlight Color' : 'Particle Color';
              return (
                <div key={paramName} className="space-y-2">
                  <Label className="text-white/90 text-sm font-medium flex items-center justify-between">
                    {displayName}
                    <span className="ml-2 w-6 h-6 rounded-full border border-white/40 inline-block" style={{ background: `rgb(${value.map((v) => Math.round(v * 255)).join(',')})` }} />
                  </Label>
                  <input
                    type="color"
                    value={`#${value.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`}
                    onChange={e => {
                      const hex = e.target.value;
                      const rgb = [
                        parseInt(hex.slice(1, 3), 16) / 255,
                        parseInt(hex.slice(3, 5), 16) / 255,
                        parseInt(hex.slice(5, 7), 16) / 255
                      ];
                      handleParameterChange(effectId, paramName, rgb);
                    }}
                    className="w-12 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                  />
                </div>
              );
            }
            return null;
          })}
          {/* Effect Enabled Toggle - Remove border and adjust spacing */}
          <div className="pt-2 mt-2">
            <div className="flex items-center justify-between">
              <Label className="text-white/80 text-xs font-mono">Effect Enabled</Label>
              <Switch 
                checked={selectedEffects[effectId]}
                onCheckedChange={(checked) => {
                  setSelectedEffects(prev => ({
                    ...prev,
                    [effectId]: checked
                  }));
                }}
              />
            </div>
          </div>
        </div>
      </PortalModal>
    );
  });

  // Helper to infer stem type from file name
  const getStemTypeFromFileName = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.includes('bass')) return 'bass';
    if (lower.includes('drum')) return 'drums';
    if (lower.includes('vocal')) return 'vocals';
    return 'other';
  };

  // Find the selected stem and its type
  const selectedStem = availableStems.find(stem => stem.id === activeTrackId);
  // Use the actual stem_type from the database, fallback to filename inference
  const selectedStemType = selectedStem 
    ? (selectedStem.stem_type || getStemTypeFromFileName(selectedStem.file_name))
    : undefined;

  // Helper to get the master stem (if available)
  const getMasterStem = () => availableStems.find(stem => stem.is_master);

  // Helper to get the correct duration (master audio if available, else fallback)
  const getCurrentDuration = () => {
    if (hasStems && stemAudio.duration && stemAudio.duration > 0) {
      return stemAudio.duration;
    }
    return (midiData || sampleMidiData).file.duration;
  };

  // Keep timeline store duration in sync with audio/midi duration
  useEffect(() => {
    try {
      const d = getCurrentDuration();
      if (typeof d === 'number' && isFinite(d) && d > 0) {
        setDuration(d);
      }
    } catch {}
  }, [hasStems, stemAudio.duration, midiData, sampleMidiData, setDuration]);

  // Update currentTime from stemAudio if stems are loaded
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    const update = () => {
      if (hasStems) {
        const duration = getCurrentDuration();
        let displayTime = stemAudio.currentTime;
        
        // If looping is enabled, show position within the current loop cycle
        if (stemAudio.isLooping && duration > 0) {
          displayTime = stemAudio.currentTime % duration;
        }
        
        setCurrentTime(displayTime);
      }
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, hasStems, stemAudio]);


  // In the render, use the sorted stems
  const sortedAvailableStems = sortStemsWithMasterLast(availableStems);

  // Log projectFiles.files before building stemUrlMap
  useEffect(() => {
    debugLog.log('[CreativeVisualizerPage] projectFiles.files:', projectFiles?.files);
  }, [projectFiles?.files]);

  // State for asynchronously built stemUrlMap
  const [asyncStemUrlMap, setAsyncStemUrlMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchUrls() {
      if (!projectFiles?.files) return;
      const audioFiles = projectFiles.files.filter(f => f.file_type === 'audio' && f.upload_status === 'completed');
      
      // Debug: Log file structure
      debugLog.log('fetchUrls - projectFiles.files:', projectFiles.files);
      debugLog.log('fetchUrls - audioFiles:', audioFiles);
      
      const entries = await Promise.all(audioFiles.map(async f => {
        let url = f.downloadUrl;
        if (!url && getDownloadUrlMutation) {
          try {
            // Debug: Check if f.id exists
            if (!f.id) {
              debugLog.error('fetchUrls - File missing ID:', f);
              return [f.id, null];
            }
            
            debugLog.log('fetchUrls - Getting download URL for file:', { id: f.id, name: f.file_name });
            const result = await getDownloadUrlMutation.mutateAsync({ fileId: f.id });
            url = result.downloadUrl;
          } catch (err) {
            debugLog.error('[CreativeVisualizerPage] Failed to fetch downloadUrl for', f.id, err);
          }
        }
        return [f.id, url];
      }));
      const map = Object.fromEntries(entries.filter(([id, url]) => !!url));
      setAsyncStemUrlMap(map);
      if (Object.keys(map).length > 0) {
        debugLog.log('[CreativeVisualizerPage] asyncStemUrlMap populated:', map);
      } else {
        debugLog.log('[CreativeVisualizerPage] asyncStemUrlMap is empty');
      }
    }
    fetchUrls();
  }, [projectFiles?.files]);

  const stemUrlsReady = Object.keys(asyncStemUrlMap).length > 0;

  // Don't render anything until we're on the client side
  if (!isClient) {
    return (
      <div className="flex h-screen bg-stone-800 text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-sm text-stone-300">Loading...</div>
        </div>
      </div>
    );
  }

  // If no project is selected, show the picker
  if (!currentProjectId && !useDemoData) {
    return (
      <>
        {showPicker && (
          <ProjectPickerModal
            isOpen={showPicker}
            onClose={() => router.push('/dashboard')}
            onSelect={handleProjectSelect}
            onCreateNew={handleCreateNew}
          />
        )}
        {showCreateModal && (
          <ProjectCreationModal
            isOpen={showCreateModal}
            onClose={handleCloseCreateModal}
          />
        )}
        <div className="flex h-screen bg-stone-800 text-white items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-sm text-stone-300">Please create or select a project.</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <HudOverlayProvider 
      cachedAnalysis={audioAnalysis.cachedAnalysis}
      stemAudio={stemAudio}
      stemUrlMap={asyncStemUrlMap}
    >
      {showPicker && (
        <ProjectPickerModal
          isOpen={showPicker}
          onClose={() => router.push('/dashboard')}
          onSelect={handleProjectSelect}
          onCreateNew={handleCreateNew}
        />
      )}
      {showCreateModal && (
        <ProjectCreationModal
          isOpen={showCreateModal}
          onClose={handleCloseCreateModal}
        />
      )}
      <DndProvider backend={HTML5Backend}>
        {/* Main visualizer UI */}
        <div className="flex h-screen bg-stone-800 text-white min-w-0 creative-visualizer-text">
          <CollapsibleSidebar>
            <div className="space-y-4">
              <MappingSourcesPanel 
                activeTrackId={activeTrackId || undefined}
                className="mb-4"
                selectedStemType={selectedStemType}
                currentTime={currentTime}
                cachedAnalysis={audioAnalysis.cachedAnalysis}
                isPlaying={isPlaying}
              />
              <FileSelector 
                onFileSelected={handleFileSelected}
                selectedFileId={selectedFileId || undefined}
                useDemoData={useDemoData}
                onDemoModeChange={handleDemoModeChange}
                projectId={currentProjectId || undefined}
                projectName={projectData?.name}
              />
            </div>
          </CollapsibleSidebar>
          <main className="flex-1 flex overflow-hidden min-w-0">
            {/* Editor bounds container with proper positioning context */}
            <div 
              id="editor-bounds" 
              className="relative flex-1 flex flex-col overflow-hidden min-w-0"
              style={{ 
                height: '100vh',
                position: 'relative',
                contain: 'layout'
              }}
            >
          {/* Top Control Bar */}
          <div className="p-2 bg-stone-900/50 border-b border-white/10">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <Button 
                  onClick={handlePlayPause} 
                  size="sm" 
                    disabled={stemLoadingState}
                  className={`font-mono text-xs uppercase tracking-wider px-4 py-2 transition-all duration-300 ${
                      stemLoadingState 
                      ? 'bg-stone-600 text-stone-400 cursor-not-allowed' 
                      : 'bg-stone-700 hover:bg-stone-600'
                  }`}
                >
                    {stemLoadingState ? (
                    <>
                      <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
                      LOADING
                    </>
                  ) : (
                    <>
                      {isPlaying ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                      {isPlaying ? 'PAUSE' : 'PLAY'}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                    disabled={stemLoadingState}
                  onClick={() => stemAudio.setLooping(!stemAudio.isLooping)}
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-3 py-1 ${
                      stemLoadingState 
                      ? 'opacity-50 cursor-not-allowed' 
                      : stemAudio.isLooping ? 'bg-emerald-900/20 border-emerald-600 text-emerald-300' : ''
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  🔄 {stemAudio.isLooping ? 'LOOP' : 'LOOP'}
                </Button>
                <Button 
                  variant="outline" 
                    disabled={stemLoadingState}
                  onClick={handleReset} 
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 px-3 py-1 ${
                      stemLoadingState ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  RESET
                </Button>
                  
                  {/* Stats Section - Compact layout */}
                  <div className="flex items-center gap-1 overflow-hidden">
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <span className="font-creative-mono">{currentTime.toFixed(1)}</span><span className="font-creative-mono">S</span> / <span className="font-creative-mono">{getCurrentDuration().toFixed(1)}</span><span className="font-creative-mono">S</span>
                </div>
                {/* BPM on the left, FPS on the right */}
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  BPM: <span className="font-creative-mono">{(() => {
                    const masterId = projectFiles?.files?.find(f => f.is_master)?.id;
                    const ca = audioAnalysis.cachedAnalysis || [];
                    const master = masterId ? ca.find((a: any) => a.fileMetadataId === masterId) : null;
                    const candidate: any = master ?? ca[0];
                    const bpmVal = candidate?.bpm ?? candidate?.metadata?.bpm ?? candidate?.analysisData?.bpm;
                    return typeof bpmVal === 'number' && isFinite(bpmVal) ? Math.round(bpmVal) : '—';
                  })()}</span>
                </div>
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  FPS: <span className="font-creative-mono">{fps}</span>
                </div>
                {hasStems && (
                  <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    STEMS: <span className="font-creative-mono">{availableStems.length}</span>
                  </div>
                )}
                
              </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <AspectRatioSelector
                  currentAspectRatio={visualizerAspectRatio}
                  onAspectRatioChange={setVisualizerAspectRatio}
                  disabled={stemLoadingState}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowVideoComposition(!showVideoComposition)} 
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-2 py-1 ${
                    showVideoComposition ? 'bg-emerald-900/20 border-emerald-600 text-emerald-300' : ''
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                    🎬 {showVideoComposition ? 'COMP' : 'VIDEO'}
                </Button>
                
                {/* Test Video Composition Controls */}
                {showVideoComposition && (
                  <TestVideoComposition
                    onAddLayer={addLayer}
                    className="ml-2"
                  />
                )}
                  
                </div>
              </div>
            </div>
            
            {/* Visualizer Area - Scrollable Layout */}
            <div className="flex-1 flex flex-col overflow-hidden bg-stone-900 relative">
              <div className="flex-1 flex flex-col min-h-0 px-4 overflow-y-auto">
                {/* Visualizer Container - Responsive with aspect ratio */}
                <div className="flex-shrink-0 mb-4">
                  <div 
                    className="relative mx-auto bg-stone-900 rounded-lg overflow-hidden shadow-lg flex items-center justify-center"
                    style={{ 
                      height: 'min(calc(100vh - 400px), 60vh)', // Reduced height to make room for stem panel
                      minHeight: '200px',
                      width: '100%',
                      maxWidth: '100%'
                    }}
                  >
                  <ThreeVisualizer
                      midiData={midiData || sampleMidiData}
                      settings={settings}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      layers={layers}
                      selectedLayerId={selectedLayerId}
                      onLayerSelect={selectLayer}
                      onPlayPause={handlePlayPause}
                      onSettingsChange={setSettings}
                      onFpsUpdate={setFps}
                      selectedEffects={selectedEffects}
                      aspectRatio={visualizerAspectRatio}
                          // Modal and mapping props
                          openEffectModals={openEffectModals}
                          onCloseEffectModal={handleCloseEffectModal}
                          mappings={mappings}
                          featureNames={featureNames}
                          onMapFeature={handleMapFeature}
                          onUnmapFeature={handleUnmapFeature}
                          onModulationAmountChange={handleModulationAmountChange}
                          activeSliderValues={activeSliderValues}
                          setActiveSliderValues={setActiveSliderValues}
                      onSelectedEffectsChange={() => {}} // <-- Added no-op
                      visualizerRef={visualizerRef}
                  />

                  {/* Video Composition Layer Container */}
                  {showVideoComposition && (
                    <LayerContainer
                      layers={layers}
                      width={visualizerAspectRatio === 'mobile' ? 400 : 1280}
                      height={visualizerAspectRatio === 'mobile' ? 711 : 720}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      audioFeatures={{
                        frequencies: new Array(256).fill(0.5),
                        timeData: new Array(256).fill(0.5),
                        volume: 0.5,
                        bass: 0.5,
                        mid: 0.5,
                        treble: 0.5
                      }}
                      midiData={{
                        activeNotes: [],
                        currentTime: currentTime,
                        tempo: 120,
                        totalNotes: 0,
                        trackActivity: {}
                      }}
                      onLayerUpdate={updateLayer}
                      onLayerDelete={deleteLayer}
                    />
                  )}

                  {/* HUD Overlays positioned relative to visualizer */}
                  <div id="hud-overlays" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
                    {/* Overlays will be rendered here by the HudOverlayProvider */}
                  </div>

                      {/* Visualizer content only - no modals here */}
                </div>
                </div>
                
                {/* Unified Timeline */}
                <div className="flex-shrink-0 mb-4">
                  <UnifiedTimeline
                    stems={sortedAvailableStems}
                    masterStemId={projectFiles?.files?.find(f => f.is_master)?.id ?? null}
                    onStemSelect={handleStemSelect}
                    activeTrackId={activeTrackId}
                    soloedStems={stemAudio.soloedStems}
                    onToggleSolo={stemAudio.toggleStemSolo}
                    analysisProgress={audioAnalysis.analysisProgress}
                    cachedAnalysis={audioAnalysis.cachedAnalysis || []}
                    stemLoadingState={audioAnalysis.isLoading}
                    stemError={audioAnalysis.error}
                    onSeek={useTimelineStore.getState().setCurrentTime}
                    className="bg-stone-800 border border-gray-700"
                  />
                </div>
            </div>
          </div>

              {/* Effect parameter modals - positioned relative to editor-bounds */}
              {effectModals}
            </div>

            {/* Right Effects Sidebar */}
            <CollapsibleEffectsSidebar>
              <EffectsLibrarySidebarWithHud
                effects={effects}
                selectedEffects={selectedEffects}
                onEffectToggle={handleSelectEffect}
                onEffectDoubleClick={handleEffectDoubleClick}
                isVisible={true}
                stemUrlsReady={stemUrlsReady}
              />
            </CollapsibleEffectsSidebar>



        </main>
      </div>
      </DndProvider>
    </HudOverlayProvider>
  );
}

export default function CreativeVisualizerPageWithSuspense() {
  return (
    <Suspense>
      <CreativeVisualizerPage />
    </Suspense>
  );
}
</file>

<file path="apps/web/src/components/projects/project-creation-modal.tsx">
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassModal } from "@/components/ui/glass-modal"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { createProjectSchema, type CreateProjectInput } from "@/lib/validations"
import { useToast } from "@/hooks/use-toast"
import { useUpload } from "@/hooks/use-upload"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import { 
  Music, 
  FileAudio, 
  FileMusic, 
  Upload, 
  Zap, 
  Clock, 
  DollarSign, 
  Target,
  ArrowRight,
  CheckCircle,
  XCircle,
  Minus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StatBar } from "@/components/ui/stat-bar"
import React from "react"
import { debugLog } from '@/lib/utils';

interface ProjectCreationModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMidiFilePath?: string
}

type UploadMethod = 'single-audio' | 'stems'

interface UploadOption {
  id: UploadMethod
  title: string
  description: string
  icon: React.ReactNode
  stats: {
    complexity: number
    speed: number
    control: number
  }
  usesCredits: boolean
  color: string
  gradient: string
}

const uploadOptions: UploadOption[] = [
  {
    id: 'single-audio',
    title: 'Single Audio File',
    description: 'AI separates your audio into stems',
    icon: <Music className="h-6 w-6" />,
    stats: {
      complexity: 1,
      speed: 1,
      control: 1,
    },
    usesCredits: true,
    color: 'bg-emerald-600',
    gradient: 'from-emerald-600 to-emerald-700'
  },
  {
    id: 'stems',
    title: 'Stems',
    description: 'Upload pre-separated audio and/or MIDI stems for max control',
    icon: <FileAudio className="h-6 w-6" />,
    stats: {
      complexity: 3,
      speed: 5,
      control: 5,
    },
    usesCredits: false,
    color: 'bg-emerald-600',
    gradient: 'from-emerald-600 to-emerald-700'
  }
]

function StemsUpload({ 
  isLoading, 
  errors, 
  onFilesChange 
}: { 
  isLoading: boolean; 
  errors: any; 
  onFilesChange: (files: File[], masterFileName: string | null, stemTypes: Record<string, string>) => void;
}) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [masterFileName, setMasterFileName] = React.useState<string | null>(null);
  const [stemTypes, setStemTypes] = React.useState<Record<string, string>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

  const stemTypeOptions = [
    { value: 'drums', label: 'Drums' },
    { value: 'bass', label: 'Bass' },
    { value: 'vocals', label: 'Vocals' },
    { value: 'melody', label: 'Melody' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(newFiles);
      // Auto-select master if only one file
      if (newFiles.length === 1) setMasterFileName(newFiles[0].name);
      // Reset stem types for new files
      const newStemTypes: Record<string, string> = {};
      newFiles.forEach(f => {
        // Try to guess stem type from file name
        const lower = f.name.toLowerCase();
        if (lower.includes('drum')) newStemTypes[f.name] = 'drums';
        else if (lower.includes('bass')) newStemTypes[f.name] = 'bass';
        else if (lower.includes('vocal')) newStemTypes[f.name] = 'vocals';
        else newStemTypes[f.name] = 'melody';
      });
      setStemTypes(newStemTypes);
      onFilesChange(newFiles, masterFileName, newStemTypes);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(newFiles);
      // Auto-select master if only one file
      if (newFiles.length === 1) setMasterFileName(newFiles[0].name);
      // Reset stem types for new files
      const newStemTypes: Record<string, string> = {};
      newFiles.forEach(f => {
        const lower = f.name.toLowerCase();
        if (lower.includes('drum')) newStemTypes[f.name] = 'drums';
        else if (lower.includes('bass')) newStemTypes[f.name] = 'bass';
        else if (lower.includes('vocal')) newStemTypes[f.name] = 'vocals';
        else newStemTypes[f.name] = 'melody';
      });
      setStemTypes(newStemTypes);
      onFilesChange(newFiles, masterFileName, newStemTypes);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // When masterFileName or stemTypes change, notify parent
  React.useEffect(() => {
    onFilesChange(files, masterFileName, stemTypes);
  }, [files, masterFileName, stemTypes]);

  const handleStemTypeChange = (fileName: string, type: string) => {
    setStemTypes(prev => ({ ...prev, [fileName]: type }));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="stems-files" className="text-stone-200 font-medium">
        Stems (Audio and/or MIDI)
      </Label>
      <div
        className={cn(
          "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer bg-stone-800",
          isDragActive ? "border-emerald-400 bg-stone-700/80" : "border-stone-600 hover:border-emerald-400 hover:bg-stone-700/60"
        )}
        onClick={handleBrowseClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        tabIndex={0}
        role="button"
        aria-label="File upload dropzone"
      >
        <div className="text-stone-300 text-sm mb-2 select-none">
          Drag and drop files here, or
        </div>
        <button
          type="button"
          className="px-4 py-2 bg-emerald-400 text-stone-900 font-bold rounded shadow hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          onClick={e => { e.stopPropagation(); handleBrowseClick(); }}
          disabled={isLoading}
        >
          Browse
        </button>
        <input
          id="stems-files"
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mid,.midi"
          multiple
          disabled={isLoading}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <ul className="mt-2 space-y-1">
        {files.map((file) => (
          <li key={file.name} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="master-file"
              checked={masterFileName === file.name}
              onChange={() => setMasterFileName(file.name)}
              className="accent-emerald-500"
              disabled={isLoading}
            />
            <span className={masterFileName === file.name ? 'font-bold text-emerald-400' : ''}>
              {file.type.startsWith('audio/') ? '🎵' : (file.name.endsWith('.mid') || file.name.endsWith('.midi')) ? '🎹' : '📄'}
              {file.name}
              {masterFileName === file.name && <span className="ml-2 px-2 py-0.5 bg-emerald-600 text-xs rounded text-white">MASTER</span>}
            </span>
            {masterFileName !== file.name && (
              <>
                <select
                  value={stemTypes[file.name] || 'melody'}
                  onChange={e => handleStemTypeChange(file.name, e.target.value)}
                  className="ml-2 px-2 py-1 rounded border border-stone-600 bg-stone-900 text-stone-200 text-xs focus:outline-none focus:ring-emerald-400"
                  disabled={isLoading}
                >
                  {stemTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <span className="ml-1 text-xs text-stone-400">{stemTypes[file.name] ? stemTypeOptions.find(o => o.value === stemTypes[file.name])?.label : 'Melody'}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-stone-400">You can upload audio stems, MIDI stems, or both.</p>
      <p className="text-xs text-stone-400">
        <span className="font-bold text-emerald-400">Step 1:</span> Select the master track with the radio button. <br/>
        <span className="font-bold text-emerald-400">Step 2:</span> Categorize all other files as stems.
      </p>
      {errors && errors["stems-files"] && (
        <p className="text-sm text-red-600">{errors["stems-files"].message}</p>
      )}
      {!masterFileName && files.length > 0 && (
        <p className="text-sm text-red-500">Please select a master track.</p>
      )}
      {Object.values(stemTypes).filter(Boolean).length !== files.length && files.length > 0 && (
        <p className="text-sm text-red-500">Please tag each file with a stem type.</p>
      )}
    </div>
  );
}

function SingleAudioUpload({ isLoading, onFileChange }: { isLoading: boolean; onFileChange: (file: File | null) => void }) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      onFileChange(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      onFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="audio-file" className="text-stone-200 font-medium">
        Audio File
      </Label>
      <div
        className={cn(
          "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer bg-stone-800",
          isDragActive ? "border-emerald-400 bg-stone-700/80" : "border-stone-600 hover:border-emerald-400 hover:bg-stone-700/60"
        )}
        onClick={handleBrowseClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        tabIndex={0}
        role="button"
        aria-label="File upload dropzone"
      >
        <div className="text-stone-300 text-sm mb-2 select-none">
          Drag and drop your audio file here, or
        </div>
        <button
          type="button"
          className="px-4 py-2 bg-emerald-400 text-stone-900 font-bold rounded shadow hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          onClick={e => { e.stopPropagation(); handleBrowseClick(); }}
          disabled={isLoading}
        >
          Browse
        </button>
        <input
          id="audio-file"
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          disabled={isLoading}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {selectedFile && (
        <div className="mt-2 text-sm text-stone-200 flex items-center gap-2">
          🎵 {selectedFile.name}
        </div>
      )}
      <p className="text-xs text-stone-400">This will use credits. Only one audio file allowed.</p>
    </div>
  );
}

export function ProjectCreationModal({ isOpen, onClose, defaultMidiFilePath }: ProjectCreationModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<UploadMethod | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [masterFileName, setMasterFileName] = useState<string | null>(null)
  const [stemTypes, setStemTypes] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      privacy_setting: 'private' as const,
      midi_file_path: defaultMidiFilePath || '',
    }
  })

  const createProjectMutation = trpc.project.create.useMutation({
    onSuccess: (project) => {
      toast({
        title: "Project Created! 🎵",
        description: `"${project.name}" is ready for your creative vision.`,
      })
      reset()
      onClose()
      // Navigate to creative visualizer with the new project loaded
      router.push(`/creative-visualizer?projectId=${project.id}`)
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create project. Please try again.",
        variant: "destructive",
      })
    },
    onSettled: () => {
      setIsLoading(false)
    }
  })

  // Get tRPC utils for query invalidation
  const utils = trpc.useUtils()
  
  // Use the useUpload hook to handle file uploads
  const { addAndUploadFiles } = useUpload({
    projectId: undefined, // Will be set per-file after project creation
    onUploadComplete: (uploadFile) => {
      debugLog.log('File uploaded successfully:', uploadFile.fileId)
    },
    onUploadError: (uploadFile, error) => {
      debugLog.error('Upload error:', error)
    },
  })

  const onSubmit = async (data: any) => {
    if (selectedMethod === 'stems' && (!masterFileName || selectedFiles.length < 2 || Object.values(stemTypes).filter(Boolean).length !== selectedFiles.length)) {
      toast({
        title: "Missing Tags",
        description: "You must select a master track, upload at least two files, and tag each file with a stem type.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsLoading(true)
      debugLog.log('Form submission data:', data)
      
      // Use the actual form data
      const projectData = {
        name: data.name,
        description: data.description || '',
        privacy_setting: data.privacy_setting || 'private',
        render_configuration: data.render_configuration || {}
      };
      
      // Debug: Log the exact payload being sent
      debugLog.log('=== DEBUG PROJECT CREATION ===');
      debugLog.log('projectData to send:', JSON.stringify(projectData, null, 2));
      debugLog.log('projectData.name:', projectData.name);
      debugLog.log('projectData.name type:', typeof projectData.name);
      debugLog.log('=== END DEBUG ===');
      
      const project = await createProjectMutation.mutateAsync(projectData as CreateProjectInput)
      debugLog.log('Project created:', project.id)
      
      // Upload files if stems method is selected
      if (selectedMethod === 'stems' && selectedFiles.length > 0) {
        try {
          // Use useUpload hook to upload files with per-file metadata
          const uploadFiles = await addAndUploadFiles(
            selectedFiles,
            // Metadata function to provide per-file metadata
            (file: File) => ({
              projectId: project.id,
              isMaster: file.name === masterFileName,
              stemType: file.name === masterFileName ? 'master' : (stemTypes[file.name] || 'melody'),
            })
          )
          
          // Invalidate file queries to refresh the sidebar
          utils.file.getUserFiles.invalidate()
          
        } catch (uploadError) {
          debugLog.error('Upload error:', uploadError)
          toast({
            title: "Upload Failed",
            description: "Some files failed to upload. Please try again.",
            variant: "destructive",
          })
          return
        }
      }
      
    } catch (error) {
      debugLog.error('Form submission error:', error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files or create project.",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      reset()
      setSelectedMethod(null)
      setShowProjectForm(false)
      onClose()
    }
  }

  const handleMethodSelect = (method: UploadMethod) => {
    setSelectedMethod(method)
    setShowProjectForm(true)
  }

  const getStatIcon = (stat: string) => {
    switch (stat) {
      case 'Easy':
      case 'Fast':
      case 'Free':
      case 'Maximum':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'Medium':
        return <Minus className="h-4 w-4 text-yellow-500" />
      case 'Hard':
      case 'Slow':
      case 'Credits':
      case 'Basic':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatColor = (stat: string) => {
    switch (stat) {
      case 'Easy':
      case 'Fast':
      case 'Free':
      case 'Maximum':
        return 'text-green-600'
      case 'Medium':
        return 'text-yellow-600'
      case 'Hard':
      case 'Slow':
      case 'Credits':
      case 'Basic':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (showProjectForm) {
    return (
      <GlassModal isOpen={isOpen} onClose={handleClose} sizeClassName="max-w-2xl min-h-[600px]">
        <div className="w-full h-full bg-stone-900 text-stone-200 font-mono border border-stone-700 rounded-xl max-h-[90vh] overflow-y-auto p-4 min-w-[340px]">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => {
                    setShowProjectForm(false)
                    setSelectedMethod(null)
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowRight className="h-5 w-5 rotate-180" />
                </button>
                <h2 className="text-2xl font-bold mb-2 text-stone-100">Project Details</h2>
              </div>
              <p className="text-gray-600">
                Configure your {selectedMethod === 'single-audio' ? 'audio' : 'stems'} visualization project.
              </p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Validation Error Summary */}
              {Object.keys(errors).length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600 font-medium">Please fix the following errors:</p>
                  <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field}>{error?.message?.toString() || 'Validation error'}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-stone-200 font-medium">
                  Project Name *
                </Label>
                <Input
                  id="name"
                  placeholder="My Amazing Song"
                  {...register("name")}
                  disabled={isLoading}
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-stone-200 font-medium">
                  Description
                </Label>
                <textarea
                  id="description"
                  placeholder="Describe your project, inspiration, or creative vision..."
                  {...register("description")}
                  disabled={isLoading}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Privacy Setting */}
              <div className="space-y-3">
                <Label className="text-stone-200 font-medium">Privacy Setting</Label>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="private"
                      value="private"
                      {...register("privacy_setting")}
                      disabled={isLoading}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex flex-col">
                      <Label htmlFor="private" className="text-stone-200 font-medium cursor-pointer">
                        Private
                      </Label>
                      <span className="text-sm text-gray-600">Only you can see this project</span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="unlisted"
                      value="unlisted"
                      {...register("privacy_setting")}
                      disabled={isLoading}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex flex-col">
                      <Label htmlFor="unlisted" className="text-stone-200 font-medium cursor-pointer">
                        Unlisted
                      </Label>
                      <span className="text-sm text-gray-600">Accessible via direct link only</span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="public"
                      value="public"
                      {...register("privacy_setting")}
                      disabled={isLoading}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex flex-col">
                      <Label htmlFor="public" className="text-stone-200 font-medium cursor-pointer">
                        Public
                      </Label>
                      <span className="text-sm text-gray-600">Visible to everyone in the community</span>
                    </div>
                  </div>
                </div>
                {errors.privacy_setting && (
                  <p className="text-sm text-red-600">{errors.privacy_setting.message}</p>
                )}
              </div>

              {/* Context-specific upload */}
              {selectedMethod === 'single-audio' && (
                <SingleAudioUpload isLoading={isLoading} onFileChange={() => {}} />
              )}
                              {selectedMethod === 'stems' && (
                <StemsUpload 
                  isLoading={isLoading} 
                  errors={errors} 
                  onFilesChange={(files, master, types) => {
                    setSelectedFiles(files);
                    setMasterFileName(master);
                    setStemTypes(types);
                  }} 
                />
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-none"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Creating...
                    </div>
                  ) : (
                    "Create Project"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </GlassModal>
    )
  }

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} sizeClassName="max-w-md min-h-[300px]">
      <div className="w-full h-full bg-stone-900 text-stone-200 font-mono border border-stone-700 rounded-xl max-h-[90vh] overflow-y-auto p-4 min-w-[340px]">
        <div className="mb-2">
          <h2 className="text-xl font-bold text-stone-200 mb-1 tracking-widest uppercase">Choose Upload Method</h2>
          <p className="text-stone-400 text-xs mb-2">Select how you want to create your music visualization project.</p>
        </div>
        <div className="flex flex-col gap-3">
          {uploadOptions.map((option) => (
            <div
              key={option.id}
              className={cn(
                "flex items-center gap-4 p-3 rounded-lg border border-stone-700 bg-stone-800 cursor-pointer transition-all duration-150",
                "hover:bg-stone-700",
              )}
              onClick={() => handleMethodSelect(option.id)}
            >
              <div className={cn("flex-shrink-0 p-2 rounded-lg border border-stone-700", option.color)}>
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-stone-200 uppercase tracking-widest mb-1">{option.title}</h3>
                <p className="text-xs text-stone-400 mb-2 truncate">{option.description}</p>
                <div className="space-y-1">
                  <StatBar label="Complexity" value={option.stats.complexity} max={5} color="bg-emerald-400" />
                  <StatBar label="Speed" value={option.stats.speed} max={5} color="bg-emerald-400" />
                  <StatBar label="Control" value={option.stats.control} max={5} color="bg-emerald-400" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {option.usesCredits && (
                  <Badge variant="secondary" className="bg-emerald-900/80 text-emerald-200 border border-emerald-700 font-mono text-[10px] px-2 py-1 uppercase tracking-widest">Uses Credits</Badge>
                )}
                <Button
                  size="sm"
                  className="bg-emerald-400 text-stone-900 border border-emerald-400 font-mono text-xs px-3 py-1 rounded-md shadow-none hover:bg-emerald-300 hover:text-stone-900"
                >
                  Select
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-3 flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="bg-stone-900 border border-stone-700 text-stone-200 font-mono text-xs px-4 py-1 rounded-md hover:bg-stone-800 hover:text-stone-200"
          >
            Cancel
          </Button>
        </div>
      </div>
    </GlassModal>
  )
}
</file>

<file path="apps/web/src/hooks/use-stem-audio-controller.ts">
import { useRef, useState, useCallback, useEffect } from 'react';
import { StemAnalysis, AudioFeature } from '@/types/stem-audio-analysis';
import { AudioAnalysisData } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';

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
  visualizationData: AudioAnalysisData | null;
  stemsLoaded: boolean;
  isLooping: boolean;
  setLooping: (looping: boolean) => void;
  soloedStems: Set<string>;
  toggleStemSolo: (stemId: string) => void;
  getAudioLatency: () => number;
  getAudioContextTime: () => number;
  scheduledStartTimeRef: React.MutableRefObject<number>;
  duration: number;
  getStereoWindow: (stemId: string, windowSize: number) => { left: number[], right: number[] } | null;
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



  // Remove advanced audio system initialization
  useEffect(() => {
    const initializeAudioSystem = async () => {
      try {
        // Create AudioContext
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Log initial audio context state
        debugLog.log('🎵 Audio context created with state:', audioContextRef.current.state);
        debugLog.log('🎵 Audio context sample rate:', audioContextRef.current.sampleRate);
        
        // Try to resume immediately if possible
        if (audioContextRef.current.state === 'suspended') {
          debugLog.log('🎵 Audio context is suspended, attempting to resume...');
          try {
            await audioContextRef.current.resume();
            debugLog.log('🎵 Audio context resumed successfully');
          } catch (resumeError) {
            debugLog.warn('⚠️ Could not resume audio context immediately:', resumeError);
            debugLog.log('🎵 User interaction will be required to start audio');
          }
        }
        
        
        
        debugLog.log('🎵 Advanced audio analysis system initialized');
        
      } catch (error) {
        debugLog.error('❌ Failed to initialize audio analysis system:', error);
      }
    };

    initializeAudioSystem();

    // Cleanup on unmount
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const activeSoloStems = soloedStems.size > 0;
    const masterStemId = masterStemIdRef.current;

    Object.entries(gainNodesRef.current).forEach(([stemId, gainNode]) => {
      const isSoloed = soloedStems.has(stemId);
      let targetVolume = 0;

      if (activeSoloStems) {
        // If any stem is soloed, only it should be audible.
        targetVolume = isSoloed ? 0.7 : 0;
      } else {
        // If no stems are soloed, only the master should be audible.
        targetVolume = (stemId === masterStemId) ? 0.7 : 0;
      }

      // Smoothly ramp the volume to the new target.
      gainNode.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 0.1);
    });
  }, [soloedStems, isPlaying]);

  const toggleStemSolo = useCallback((stemId: string) => {
    setSoloedStems(prev => {
      const newSoloed = new Set(prev);
      if (newSoloed.has(stemId)) {
        newSoloed.delete(stemId);
      } else {
        newSoloed.add(stemId);
      }
      return newSoloed;
    });
  }, []);

  // In loadStems, remove all worker/processor/feature pipeline logic, just load and decode audio buffers for playback
  const loadStems = useCallback(async (stems: Stem[], onDecode?: (stemId: string, buffer: AudioBuffer) => void) => {
    if (stems.length === 0) return;
    if (loadingRef.current || stemsLoaded) {
      debugLog.log('⚠️ Stems already loading or loaded, skipping duplicate request');
      return;
    }
    loadingRef.current = true;
    try {
      debugLog.log(`🎵 Starting to load ${stems.length} stems...`);
      debugLog.log('🎵 Stem master info:', stems.map(s => ({ id: s.id, label: s.label, isMaster: s.isMaster })));
      // Only fetch and decode audio buffers
      const decodedBuffers: Record<string, AudioBuffer> = {};
      const masterStem = stems.find(s => s.isMaster);
      if (masterStem) {
        masterStemIdRef.current = masterStem.id;
        debugLog.log('🎵 Master stem identified:', masterStem.id, masterStem.label);
      } else if (stems.length > 0) {
        // Fallback: if no master is flagged, assume the first one is.
        masterStemIdRef.current = stems[0].id;
        debugLog.warn('⚠️ No master stem designated. Defaulting to first stem:', stems[0].id);
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
          
          debugLog.log(`🎵 Decoded audio buffer for ${stem.id}: ${audioBuffer.duration.toFixed(2)}s`);
          
          if (onDecode) {
            onDecode(stem.id, audioBuffer);
          }
        } catch (error) {
          debugLog.error(`❌ Failed to decode audio buffer for ${stem.id}:`, error);
        }
      }

      // Store all decoded buffers (MERGE instead of replace)
      audioBuffersRef.current = { ...audioBuffersRef.current, ...decodedBuffers };
      setStemsLoaded(true);
      loadingRef.current = false;
      // REMOVED VERBOSE LOGGING
      // debugLog.log(`✅ Successfully loaded ${stems.length} stems`);
      
    } catch (error) {
      debugLog.error('❌ Failed to load stems:', error);
      loadingRef.current = false;
    }
  }, []);

  // Remove startAnalysis and stopAnalysis logic

  const play = useCallback(async () => {
    if (!audioContextRef.current || !stemsLoaded) {
      debugLog.warn('⚠️ Cannot play: AudioContext not ready or stems not loaded');
      return;
    }

    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      Object.values(audioSourcesRef.current).forEach(source => {
        try { source.stop(); } catch (e) { /* Ignore */ }
      });
      audioSourcesRef.current = {};

      const now = audioContextRef.current.currentTime;
      const scheduleDelay = 0.1;
      const scheduledStartTime = now + scheduleDelay;
      
      // Use pausedTimeRef to resume from the correct position
      const offset = pausedTimeRef.current;
      startTimeRef.current = scheduledStartTime - offset;
      scheduledStartTimeRef.current = scheduledStartTime - offset;

      const activeSoloStems = soloedStems.size > 0;
      const masterId = masterStemIdRef.current;

      Object.entries(audioBuffersRef.current).forEach(([stemId, buffer]) => {
        const source = audioContextRef.current!.createBufferSource();
        const gainNode = gainNodesRef.current[stemId];
        
        const isSoloed = soloedStems.has(stemId);
        
        // Determine initial volume based on solo state
        let initialVolume = 0;
        if (activeSoloStems) {
            initialVolume = isSoloed ? 0.7 : 0;
        } else {
            initialVolume = (stemId === masterId) ? 0.7 : 0;
        }
        gainNode.gain.setValueAtTime(initialVolume, audioContextRef.current!.currentTime);
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current!.destination);
        
        // *** THE KEY FIX ***
        // Use the Web Audio API's native looping.
        source.loop = isLooping;
        
        // Remove the complex onended handler entirely as it's no longer needed.
        source.onended = () => {
          // Can be used for cleanup if a track is stopped manually
          if (isIntentionallyStoppingRef.current) {
            delete audioSourcesRef.current[stemId];
          }
        };
        
        source.start(scheduledStartTime, offset); // Start at scheduled time from the correct offset
        audioSourcesRef.current[stemId] = source;
      });

      pausedTimeRef.current = 0; // Reset paused time
      setIsPlaying(true);
      isIntentionallyStoppingRef.current = false;

      // Start time updates
      timeUpdateIntervalRef.current = setInterval(() => {
        if (audioContextRef.current && isPlaying) {
          const elapsedTime = audioContextRef.current.currentTime - startTimeRef.current;
          // 🔥 FIX: Handle looping by wrapping currentTime to audio duration
          const masterDuration = getMasterDuration();
          const currentTime = masterDuration > 0 ? elapsedTime % masterDuration : Math.max(0, elapsedTime);
          setCurrentTime(currentTime);
        }
      }, 16);

    } catch (error) {
      debugLog.error('❌ Failed to start audio playback:', error);
      setIsPlaying(false);
    }
  }, [stemsLoaded, isLooping, soloedStems]);

  const pause = useCallback(() => {
    if (!isPlaying) return;
    
    isIntentionallyStoppingRef.current = true;
    
    Object.values(audioSourcesRef.current).forEach(source => {
      try { source.stop(); } catch (e) { /* Ignore */ }
    });
    
    audioSourcesRef.current = {};

    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
    
    // Correctly calculate and store the paused time
    pausedTimeRef.current = audioContextRef.current!.currentTime - startTimeRef.current;
    setIsPlaying(false);
  }, [isPlaying]);

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
          debugLog.error(`❌ Failed to stop playback for ${stemId}:`, error);
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
      debugLog.error('❌ Failed to stop playback:', error);
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
      
      debugLog.log('🗑️ Advanced audio analysis and playback cleared');
    } catch (error) {
      debugLog.error('❌ Failed to clear stems:', error);
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
  //       debugLog.error('❌ Failed to process visualization data:', error);
  //     }
  //   };

  //   const interval = setInterval(processVisualizationData, 16); // ~60fps
  //   return () => clearInterval(interval);
  // }, [isPlaying, featuresByStem]);

  // OPTIMIZED REAL-TIME TIME TRACKING
  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;

    let animationFrameId: number;
    const updateTime = () => {
      try {
        const elapsedTime = audioContextRef.current!.currentTime - startTimeRef.current;
        
        // **FIX 2: HANDLE LOOPING BY WRAPPING THE CURRENT TIME**
        const masterDuration = getMasterDuration();
        const currentAudioTime = masterDuration > 0 ? elapsedTime % masterDuration : Math.max(0, elapsedTime);
        
        setCurrentTime(currentAudioTime);
        
        animationFrameId = requestAnimationFrame(updateTime);
      } catch (error) {
        debugLog.error('❌ Failed to update time:', error);
      }
    };

    animationFrameId = requestAnimationFrame(updateTime);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]); // Dependency array is correct, no need to add more

  // Add user interaction handler to resume audio context
  useEffect(() => {
    const handleUserInteraction = async () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        debugLog.log('🎵 User interaction detected, resuming audio context...');
        try {
          await audioContextRef.current.resume();
          debugLog.log('🎵 Audio context resumed via user interaction');
        } catch (error) {
          debugLog.error('❌ Failed to resume audio context on user interaction:', error);
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
    //     debugLog.error('❌ Failed to optimize performance:', error); // This line was removed
    //   } // This line was removed
    // }; // This line was removed

    // const interval = setInterval(optimizePerformance, 1000); // Every second // This line was removed
    // return () => clearInterval(interval); // This line was removed
  }, []);

  const setStemVolume = useCallback((stemId: string, volume: number) => {
    const gainNode = gainNodesRef.current[stemId];
    if (gainNode) {
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      debugLog.log(`🎵 Set volume for ${stemId}: ${volume}`);
    }
  }, []);

  const getStemVolume = useCallback((stemId: string): number => {
    const gainNode = gainNodesRef.current[stemId];
    return gainNode ? gainNode.gain.value : 0.7;
  }, []);

  // Test audio output function
  const testAudioOutput = useCallback(async () => {
    if (!audioContextRef.current) {
      debugLog.warn('⚠️ No audio context available for test');
      return;
    }

    try {
      debugLog.log('🎵 Testing audio output...');
      
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
      
      debugLog.log('🎵 Test tone played - you should hear a 440Hz tone for 0.5 seconds');
    } catch (error) {
      debugLog.error('❌ Audio output test failed:', error);
    }
  }, []);

  // Helper function to get the maximum duration of all loaded stems
  const getMaxDuration = useCallback((): number => {
    const durations = Object.values(audioBuffersRef.current).map(buffer => buffer.duration);
    return Math.max(...durations, 0);
  }, []);

  // Helper function to get the master stem duration if available
  const getMasterDuration = useCallback((): number => {
    const masterId = masterStemIdRef.current;
    if (masterId && audioBuffersRef.current[masterId]) {
      return audioBuffersRef.current[masterId].duration;
    }
    return getMaxDuration();
  }, [getMaxDuration]);

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

  // Helper: Get a real-time stereo window for a stem
  const getStereoWindow = useCallback((stemId: string, windowSize: number = 1024) => {
    const buffer = audioBuffersRef.current[stemId];
    if (!buffer) {
      debugLog.warn('[getStereoWindow] No buffer for stemId', stemId, 'Available buffers:', Object.keys(audioBuffersRef.current));
      return null;
    }
    const numChannels = buffer.numberOfChannels;
    const currentSample = Math.floor((audioContextRef.current?.currentTime || 0 - startTimeRef.current) * buffer.sampleRate);
    const start = Math.max(0, currentSample - windowSize);
    const end = Math.min(buffer.length, currentSample);
    let left: number[] = [];
    let right: number[] = [];
    try {
      if (numChannels === 1) {
        const channel = buffer.getChannelData(0).slice(start, end);
        left = Array.from(channel);
        right = Array.from(channel);
      } else {
        left = Array.from(buffer.getChannelData(0).slice(start, end));
        right = Array.from(buffer.getChannelData(1).slice(start, end));
      }
    } catch (err) {
      debugLog.error('[getStereoWindow] Error accessing buffer:', err, { stemId, buffer });
      return null;
    }
    // Pad if needed
    if (left.length < windowSize) {
      left = Array(windowSize - left.length).fill(0).concat(left);
      right = Array(windowSize - right.length).fill(0).concat(right);
    }
    return { left, right };
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
    visualizationData,
    stemsLoaded,
    isLooping,
    setLooping: setIsLooping,
    soloedStems,
    toggleStemSolo,
    getAudioLatency, // <-- add this
    getAudioContextTime, // <-- add this
    scheduledStartTimeRef, // <-- expose for mapping loop
    duration: getMasterDuration(), // <-- expose duration
    getStereoWindow, // <-- expose real-time stereo window
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
</file>

<file path="apps/web/src/hooks/use-upload.ts">
import { useState, useCallback } from 'react'
import { useToast } from './use-toast'
import { trpc } from '@/lib/trpc'
import { debugLog } from '@/lib/utils';

export interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number
  error?: string
  fileId?: string
  compressedSize?: number
  metadata?: {
    projectId?: string
    isMaster?: boolean
    stemType?: string
  }
}

export interface UseUploadOptions {
  onUploadComplete?: (file: UploadFile) => void
  onUploadError?: (file: UploadFile, error: string) => void
  onAllUploadsComplete?: () => void
  maxConcurrentUploads?: number
  projectId?: string // NEW: Associate uploads with project
}

export function useUpload(options: UseUploadOptions = {}) {
  const { onUploadComplete, onUploadError, onAllUploadsComplete, maxConcurrentUploads = 3, projectId } = options
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  /**
   * tRPC mutations – we create them once at hook initialisation so that they can
   * be reused inside callbacks without violating the Rules of Hooks.
   */
  const getUploadUrlMutation = trpc.file.getUploadUrl.useMutation()
  const confirmUploadMutation = trpc.file.confirmUpload.useMutation()

  // Generate unique ID for each file
  const generateFileId = useCallback(() => {
    return `upload_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }, [])

  // Validate files - EXTENDED for video and image
  const validateFiles = useCallback((newFiles: File[]) => {
    const validFiles: File[] = []
    const errors: string[] = []

    newFiles.forEach(file => {
      // Check file extension
      const extension = file.name.toLowerCase().split('.').pop()
      const allowedExtensions = ['mid', 'midi', 'mp3', 'wav', 'mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'gif', 'webp'] // EXTENDED
      
      if (!extension || !allowedExtensions.includes(extension)) {
        errors.push(`${file.name}: Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`)
        return
      }

      // Check file size based on type
      let maxSize: number
      const isMidi = ['mid', 'midi'].includes(extension)
      const isAudio = ['mp3', 'wav'].includes(extension)
      const isVideo = ['mp4', 'mov', 'webm'].includes(extension)
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)
      
      if (isMidi) {
        maxSize = 5 * 1024 * 1024 // 5MB for MIDI
      } else if (isAudio) {
        maxSize = 50 * 1024 * 1024 // 50MB for audio
      } else if (isVideo) {
        maxSize = 500 * 1024 * 1024 // 500MB for video
      } else if (isImage) {
        maxSize = 25 * 1024 * 1024 // 25MB for images
      } else {
        errors.push(`${file.name}: Unsupported file type`)
        return
      }
      
      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024)
        errors.push(`${file.name}: File too large. Maximum size: ${maxSizeMB}MB`)
        return
      }

      validFiles.push(file)
    })

    if (errors.length > 0) {
      toast({
        title: 'Invalid Files',
        description: errors.join('\n'),
        variant: 'destructive',
      })
    }

    return validFiles
  }, [toast])

  // Add files to upload queue
  const addFiles = useCallback((newFiles: File[], metadata?: { projectId?: string; isMaster?: boolean; stemType?: string }) => {
    const validFiles = validateFiles(newFiles)
    const uploadFiles: UploadFile[] = validFiles.map(file => ({
      file,
      id: generateFileId(),
      status: 'pending',
      progress: 0,
      metadata: metadata || (projectId ? { projectId } : undefined),
    }))

    setFiles(prev => [...prev, ...uploadFiles])
    return uploadFiles
  }, [generateFileId, validateFiles, projectId])

  // Remove file from queue
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  // Update file status
  const updateFileStatus = useCallback((
    fileId: string, 
    updates: Partial<Pick<UploadFile, 'status' | 'progress' | 'error' | 'fileId' | 'compressedSize'>>
  ) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, ...updates } : f
    ))
  }, [])

  // Add compression utility
  const compressFile = async (file: File): Promise<File> => {
    // For now, just return the original file
    // In production, this would implement actual compression
    // using libraries like browser-image-compression for images/videos
    // or custom logic for MIDI files
    return file
  }

  // Add resumable upload simulation
  const createResumableUpload = (file: File) => {
    const chunkSize = 1024 * 1024 // 1MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize)
    
    return {
      totalChunks,
      chunkSize,
      uploadChunk: (chunkIndex: number) => {
        const start = chunkIndex * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        return file.slice(start, end)
      }
    }
  }

  /**
   * Core upload routine – uses presigned URLs to upload directly to S3/R2
   * This avoids payload size limits in tRPC and improves performance
   * EXTENDED for video and image support
   */
  const uploadFileToS3 = useCallback(async (uploadFile: UploadFile) => {
    try {
      updateFileStatus(uploadFile.id, { status: 'uploading', progress: 10 })

      /* ------------------------------------------------------------------ */
      /* 1. Get presigned URL from backend                                  */
      /* ------------------------------------------------------------------ */
      const { uploadUrl, fileId } = await getUploadUrlMutation.mutateAsync({
        fileName: uploadFile.file.name,
        fileSize: uploadFile.file.size,
        mimeType: uploadFile.file.type || 'application/octet-stream',
        projectId: uploadFile.metadata?.projectId || projectId, // Use per-file or global projectId
        isMaster: uploadFile.metadata?.isMaster,
        stemType: uploadFile.metadata?.stemType,
      })

      updateFileStatus(uploadFile.id, { progress: 30, fileId })

      /* ------------------------------------------------------------------ */
      /* 2. Upload file directly to presigned URL using PUT                 */
      /* ------------------------------------------------------------------ */
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: uploadFile.file,
        headers: {
          'Content-Type': uploadFile.file.type || 'application/octet-stream',
        },
      })

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file to storage: ${uploadResponse.statusText}`)
      }

      updateFileStatus(uploadFile.id, { progress: 90 })

      /* ------------------------------------------------------------------ */
      /* 3. Confirm upload completion with backend                          */
      /* ------------------------------------------------------------------ */
      await confirmUploadMutation.mutateAsync({
        fileId,
        success: true,
      })

      updateFileStatus(uploadFile.id, { 
        status: 'completed', 
        progress: 100,
        fileId 
      })

      // Notify caller of completion
      onUploadComplete?.({ ...uploadFile, fileId, status: 'completed', progress: 100 })

    } catch (error) {
      debugLog.error('Upload error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      updateFileStatus(uploadFile.id, { 
        status: 'failed', 
        error: errorMessage 
      })
      
      onUploadError?.(uploadFile, errorMessage)
    }
  }, [updateFileStatus, getUploadUrlMutation, confirmUploadMutation, onUploadComplete, onUploadError])

  // Add files and immediately start uploading them (bypasses state timing issues)
  const addAndUploadFiles = useCallback(async (newFiles: File[], metadata?: { projectId?: string; isMaster?: boolean; stemType?: string } | ((file: File, index: number) => { projectId?: string; isMaster?: boolean; stemType?: string })) => {
    // Validate files first
    const validFiles = validateFiles(newFiles)
    if (validFiles.length === 0) return []

    // Create upload file objects
    const uploadFiles: UploadFile[] = validFiles.map((file, index) => {
      const fileMetadata = typeof metadata === 'function' 
        ? metadata(file, index)
        : metadata || (projectId ? { projectId } : undefined)
      
      return {
        file,
        id: generateFileId(),
        status: 'pending',
        progress: 0,
        metadata: fileMetadata,
      }
    })

    // Add to state for UI display
    setFiles(prev => [...prev, ...uploadFiles])
    
    // Start uploading immediately without waiting for state update
    if (uploadFiles.length > 0) {
      setIsUploading(true)
      
      try {
        // Process uploads in batches
        const batches = []
        for (let i = 0; i < uploadFiles.length; i += maxConcurrentUploads) {
          batches.push(uploadFiles.slice(i, i + maxConcurrentUploads))
        }

        for (const batch of batches) {
          await Promise.allSettled(
            batch.map(file => uploadFileToS3(file))
          )
        }

        onAllUploadsComplete?.()
        
        const successCount = uploadFiles.filter(f => f.status === 'completed').length
        if (successCount > 0) {
          toast({
            title: 'Upload Complete',
            description: `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`,
          })
        }

      } catch (error) {
        debugLog.error('Upload error:', error)
        toast({
          title: 'Upload Error',
          description: 'Upload failed',
          variant: 'destructive',
        })
      } finally {
        setIsUploading(false)
      }
    }
    
    return uploadFiles
  }, [validateFiles, generateFileId, maxConcurrentUploads, uploadFileToS3, onAllUploadsComplete, toast])

  // Start uploading all pending files
  const startUpload = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    try {
      // Process uploads in batches
      const batches = []
      for (let i = 0; i < pendingFiles.length; i += maxConcurrentUploads) {
        batches.push(pendingFiles.slice(i, i + maxConcurrentUploads))
      }

      for (const batch of batches) {
        await Promise.allSettled(
          batch.map(file => uploadFileToS3(file))
        )
      }

      onAllUploadsComplete?.()
      
      const successCount = files.filter(f => f.status === 'completed').length
      if (successCount > 0) {
        toast({
          title: 'Upload Complete',
          description: `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`,
        })
      }

    } catch (error) {
      debugLog.error('Upload error:', error)
      toast({
        title: 'Upload Error',
        description: 'Upload failed',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }, [files, maxConcurrentUploads, uploadFileToS3, onAllUploadsComplete, toast])

  // Retry failed upload
  const retryUpload = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file || file.status !== 'failed') return

    updateFileStatus(fileId, { status: 'pending', progress: 0, error: undefined })
    await uploadFileToS3(file)
  }, [files, updateFileStatus, uploadFileToS3])

  return {
    // State
    files,
    isUploading,
    
    // Actions
    addFiles,
    addAndUploadFiles,
    removeFile,
    clearFiles,
    startUpload,
    retryUpload,
    
    // Computed values
    pendingCount: files.filter(f => f.status === 'pending').length,
    uploadingCount: files.filter(f => f.status === 'uploading').length,
    completedCount: files.filter(f => f.status === 'completed').length,
    failedCount: files.filter(f => f.status === 'failed').length,
    totalProgress: files.length > 0 
      ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
      : 0,
  }
}
</file>

<file path="apps/web/src/types/audio-analysis-data.ts">
export interface TransientData {
  time: number;
  intensity: number;
  frequency?: number;
}

export interface ChromaData {
  time: number;
  pitch: number;
  confidence: number;
  chroma: number[];
}

export interface WaveformData {
  points: number[];
  sampleRate: number;
  duration: number;
  markers: Array<{ time: number; type: 'beat' | 'onset' | 'peak' | 'drop'; intensity: number; frequency?: number }>;
}

export interface AudioAnalysisData {
  id: string;
  fileMetadataId: string;
  stemType: string;

  analysisData: {
    frameTimes?: Float32Array | number[];
    rms: Float32Array | number[];
    loudness: Float32Array | number[];
    spectralCentroid: Float32Array | number[];
    spectralRolloff?: Float32Array | number[];
    spectralFlatness?: Float32Array | number[];
    zcr?: Float32Array | number[];

    fft: Float32Array | number[];
    fftFrequencies?: Float32Array | number[];
    amplitudeSpectrum?: Float32Array | number[];

    volume?: Float32Array | number[];
    bass?: Float32Array | number[];
    mid?: Float32Array | number[];
    treble?: Float32Array | number[];
    features?: Float32Array | number[];
    markers?: Float32Array | number[];
    frequencies?: Float32Array | number[];
    timeData?: Float32Array | number[];

    stereoWindow_left?: Float32Array | number[];
    stereoWindow_right?: Float32Array | number[];

    transients?: TransientData[];
    chroma?: ChromaData[];

    // Optional scalar BPM when detected and persisted
    bpm?: number;
  };

  waveformData: WaveformData;

  metadata: {
    sampleRate: number;
    duration: number;
    bufferSize: number;
    featuresExtracted: string[];
    analysisDuration: number;
    bpm?: number;
  };

  // Optional convenience duplication for quick access
  bpm?: number;
}
</file>

<file path="apps/web/src/types/worker-messages.ts">
import type { AudioAnalysisData } from './audio-analysis-data';

export type AnalysisCompletePayload = {
  result: AudioAnalysisData;
};

export type WorkerResponse =
  | { type: 'ANALYSIS_COMPLETE'; data: AnalysisCompletePayload }
  | { type: 'ANALYSIS_PROGRESS'; data: { progress: number; message: string } }
  | { type: 'ANALYSIS_ERROR'; data: { fileId?: string; error: string } };
</file>

<file path="apps/api/src/routers/stem.ts">
import { z } from 'zod';
import { router, protectedProcedure, flexibleProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { StemSeparator, StemSeparationConfigSchema } from '../services/stem-separator';
import { generateS3Key, generateUploadUrl, getFileBuffer } from '../services/r2-storage';
import { join } from 'path';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { logger } from '../lib/logger';

export const stemRouter = router({
  // Create a new stem separation job
  createSeparationJob: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      config: StemSeparationConfigSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      try {
        // Get file metadata from database
        const { data: fileData, error: fetchError } = await ctx.supabase
          .from('file_metadata')
          .select('*')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .eq('file_type', 'audio')
          .single();

        if (fetchError || !fileData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Audio file not found or access denied',
          });
        }

        // Create stem separation job
        const initialJob = StemSeparator.createJob(input.config);

        // Store job in database
        const { error: insertError } = await ctx.supabase
          .from('stem_separation_jobs')
          .insert({
            id: initialJob.id,
            user_id: userId,
            file_key: fileData.s3_key,
            status: initialJob.status,
            config: input.config,
          });

        if (insertError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create stem separation job',
          });
        }

        // Start processing in background
        const outputDir = join(tmpdir(), initialJob.id);
        await fs.mkdir(outputDir, { recursive: true });

        StemSeparator.processStem(initialJob.id, fileData.s3_key, outputDir)
          .then(async () => {
            const updatedJob = StemSeparator.getJob(initialJob.id);
            if (!updatedJob?.results) return;

            // Upload stems to R2, create file metadata, and analyze them
            const stemUploads = Object.entries(updatedJob.results.stems).map(async ([stemName, stemPath]) => {
              const stemKey = generateS3Key(userId, `${stemName}.${input.config.quality.outputFormat}`, 'audio');
              const uploadUrl = await generateUploadUrl(stemKey, `audio/${input.config.quality.outputFormat}`);
              
              // Read stem file and upload to R2
              const stemBuffer = await fs.readFile(stemPath);
              await fetch(uploadUrl, {
                method: 'PUT',
                body: stemBuffer,
                headers: {
                  'Content-Type': `audio/${input.config.quality.outputFormat}`,
                },
              });

              // Create file metadata record for the stem
              const { data: stemFileData, error: stemFileError } = await ctx.supabase
                .from('file_metadata')
                .insert({
                  user_id: userId,
                  file_name: `${stemName}.${input.config.quality.outputFormat}`,
                  file_type: 'audio',
                  mime_type: `audio/${input.config.quality.outputFormat}`,
                  file_size: stemBuffer.length,
                  s3_key: stemKey,
                  s3_bucket: process.env.R2_BUCKET_NAME || 'phonoglyph-storage',
                  upload_status: 'completed',
                  processing_status: 'completed',
                  project_id: fileData.project_id, // Associate with same project
                })
                .select('id')
                .single();

              if (stemFileError) {
                logger.error(`Failed to create file metadata for ${stemName} stem:`, stemFileError);
                return { [stemName]: stemKey };
              }

              // Analyze the stem and cache the results
              try {
                const { AudioAnalyzer } = await import('../services/audio-analyzer');
                const audioAnalyzer = new AudioAnalyzer();
                await audioAnalyzer.analyzeAndCache(
                  stemFileData.id, // Use the new stem file metadata ID
                  userId,
                  stemName,
                  stemBuffer
                );
                logger.log(`✅ Analyzed and cached ${stemName} stem`);
              } catch (analysisError) {
                logger.error(`❌ Failed to analyze ${stemName} stem:`, analysisError);
                // Continue with other stems even if analysis fails
              }

              return { [stemName]: stemKey };
            });

            const stemKeys = Object.assign({}, ...(await Promise.all(stemUploads)));

            // Update job in database with results
            await ctx.supabase
              .from('stem_separation_jobs')
              .update({
                status: 'completed',
                progress: 100,
                results: { stems: stemKeys },
                analysis_status: 'completed',
                analysis_completed_at: new Date().toISOString(),
              })
              .eq('id', initialJob.id);

            // Cleanup temporary files
            await fs.rm(outputDir, { recursive: true, force: true });
          })
          .catch(async (error) => {
            logger.error('Stem separation failed:', error);
            
            // Update job status to failed
            await ctx.supabase
              .from('stem_separation_jobs')
              .update({
                status: 'failed',
                analysis_status: 'failed',
              })
              .eq('id', initialJob.id);

            // Cleanup temporary files
            try {
              await fs.rm(outputDir, { recursive: true, force: true });
            } catch (cleanupError) {
              logger.error('Failed to cleanup temporary files:', cleanupError);
            }
          });

        return { jobId: initialJob.id };
      } catch (error) {
        logger.error('Failed to create stem separation job:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),

  // Get job status
  getJobStatus: protectedProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      try {
        const { data: job, error } = await ctx.supabase
          .from('stem_separation_jobs')
          .select('*')
          .eq('id', input.jobId)
          .eq('user_id', userId)
          .single();

        if (error || !job) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Job not found or access denied',
          });
        }

        return {
          id: job.id,
          status: job.status,
          progress: job.progress,
          analysisStatus: job.analysis_status,
          results: job.results,
          error: job.error,
        };
      } catch (error) {
        logger.error('Failed to get job status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),

  // Get cached audio analysis for multiple files
  getCachedAnalysis: flexibleProcedure
    .input(z.object({
      fileIds: z.array(z.string()),
      stemType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      try {
        const { AudioAnalyzer } = await import('../services/audio-analyzer');
        const audioAnalyzer = new AudioAnalyzer();
        return await audioAnalyzer.getBatchCachedAnalysis(
          input.fileIds,
          userId,
          input.stemType
        );
      } catch (error) {
        logger.error('Failed to get batch cached analysis:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),

  // Cache analysis data generated on the client
  cacheClientSideAnalysis: protectedProcedure
    .input(z.object({
      fileMetadataId: z.string(),
      stemType: z.string(),
      // Allow scalar values like bpm, numeric arrays, and transient objects
      analysisData: z.record(z.string(), z.union([
        z.array(z.number()), // Time-series arrays
        z.number(), // Scalar values
        z.array(z.object({ // Transients array
          time: z.number(),
          intensity: z.number(),
          type: z.string(), // 'kick', 'snare', 'hat', 'generic', etc.
        }))
      ])),
      waveformData: z.object({
        points: z.array(z.number()),
        sampleRate: z.number(),
        duration: z.number(),
        markers: z.array(z.object({
          time: z.number(),
          type: z.enum(['beat', 'onset', 'peak', 'drop']),
          intensity: z.number(),
          frequency: z.number().optional(),
        })),
      }),
      metadata: z.object({
        sampleRate: z.number(),
        duration: z.number(),
        bufferSize: z.number(),
        featuresExtracted: z.array(z.string()),
        bpm: z.number().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const { fileMetadataId, stemType, analysisData, waveformData, metadata } = input;
      const userId = ctx.user.id;
      const startTime = Date.now();

      try {
        const { data: existing, error: existingError } = await ctx.supabase
          .from('audio_analysis_cache')
          .select('id')
          .eq('file_metadata_id', fileMetadataId)
          .eq('stem_type', stemType)
          .single();

        if (existingError && existingError.code !== 'PGRST116') { // Ignore 'not found' error
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Error checking for existing analysis: ${existingError.message}` });
        }

        if (existing) {
          logger.log(`Analysis for file ${fileMetadataId} and stem ${stemType} already exists. Skipping cache.`);
          return { success: true, cached: false, message: "Analysis already cached." };
        }

        const { data: cachedAnalysis, error } = await ctx.supabase
          .from('audio_analysis_cache')
          .insert({
            user_id: userId,
            file_metadata_id: fileMetadataId,
            stem_type: stemType,
            analysis_version: '1.1-client', // Mark as client-generated
            sample_rate: metadata.sampleRate,
            duration: metadata.duration,
            buffer_size: metadata.bufferSize,
            features_extracted: metadata.featuresExtracted,
            analysis_data: analysisData,
            waveform_data: waveformData,
            analysis_duration: Date.now() - startTime,
          })
          .select()
          .single();

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to cache client-side analysis: ${error.message}` });
        }
        
        return { success: true, cached: true, data: cachedAnalysis };

      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Failed to cache client-side analysis:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),

  // List user's stem separation jobs
  listJobs: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      try {
        const { data: jobs, error } = await ctx.supabase
          .from('stem_separation_jobs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch jobs',
          });
        }

        return jobs || [];
      } catch (error) {
        logger.error('Failed to list jobs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),
});
</file>

<file path="apps/web/src/types/audio-analysis.ts">
export interface AnalysisParams {
  transientThreshold: number;
  onsetThreshold: number;
  chromaSmoothing: number;
  rmsWindowSize: number;
  pitchConfidence: number;
  minNoteDuration: number;
}

export interface TransientData {
  time: number;
  intensity: number;
  type: 'kick' | 'snare' | 'hat' | 'generic';
}

export interface ChromaData {
  time: number;
  pitch: number;
  confidence: number;
  note: string;
}

export interface RMSData {
  time: number;
  value: number;
}

export type AnalysisMethod = 'original' | 'enhanced' | 'both';



// This is the target data structure for the analysis worker to produce
export interface FullAudioAnalysis {
  bpm: number;
  transients: TransientData[];
  // ... plus all other features needed for HUDs (rms, chroma, etc.)
}
</file>

<file path="apps/api/src/routers/file.ts">
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { generateUploadUrl, generateDownloadUrl, generateS3Key, deleteFile, r2Client, BUCKET_NAME, uploadThumbnail, generateThumbnailKey, generateThumbnailUrl } from '../services/r2-storage'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { 
  validateFile, 
  FileUploadSchema, 
  createUploadRateLimit,
  isExecutableFile,
  sanitizeFileName 
} from '../lib/file-validation'
import { MediaProcessor } from '../services/media-processor'
import { AssetManager } from '../services/asset-manager'
import { logger } from '../lib/logger';
import { randomUUID } from 'crypto';

// Create rate limiter instance
const uploadRateLimit = createUploadRateLimit()

// File metadata schema for database storage - EXTENDED
const FileMetadataSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileType: z.enum(['midi', 'audio', 'video', 'image']), // EXTENDED
  mimeType: z.string(),
  fileSize: z.number(),
  s3Key: z.string(),
  s3Bucket: z.string(),
  uploadStatus: z.enum(['uploading', 'completed', 'failed']),
})

export const fileRouter = router({
  
  // Generate pre-signed URL for file upload - EXTENDED
  getUploadUrl: protectedProcedure
    .input(FileUploadSchema.extend({
      projectId: z.string().optional(), // Associate with project
      isMaster: z.boolean().optional(), // Tag as master track
      stemType: z.string().optional(), // Tag stem type
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        // Rate limiting check
        if (!uploadRateLimit.checkRateLimit(userId)) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Upload rate limit exceeded. Please wait before uploading more files.',
          })
        }

        // Security check - reject executable files
        if (isExecutableFile(input.fileName)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Executable files are not allowed for security reasons.',
          })
        }

        // Validate file
        const validation = validateFile(input)
        if (!validation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `File validation failed: ${validation.errors.join(', ')}`,
          })
        }

        // Sanitize file name and generate S3 key
        const sanitizedFileName = sanitizeFileName(input.fileName)
        const s3Key = generateS3Key(userId, sanitizedFileName, validation.fileType)

        // Generate pre-signed URL
        const uploadUrl = await generateUploadUrl(s3Key, input.mimeType, 3600) // 1 hour expiry

        // Create file metadata record in database
        const fileId = randomUUID()
        
        const { error: dbError } = await ctx.supabase
          .from('file_metadata')
          .insert({
            id: fileId,
            user_id: userId,
            file_name: sanitizedFileName,
            file_type: validation.fileType,
            mime_type: input.mimeType,
            file_size: input.fileSize,
            s3_key: s3Key,
            s3_bucket: process.env.CLOUDFLARE_R2_BUCKET || 'phonoglyph-uploads',
            upload_status: 'uploading',
            processing_status: MediaProcessor.requiresProcessing(validation.fileType) ? 'pending' : 'completed',
            project_id: input.projectId, // Associate with project
            is_master: input.isMaster || false, // Store master tag
            stem_type: input.stemType || null, // Store stem type
          })

        if (dbError) {
          logger.error('Database error creating file metadata:', dbError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create file record',
          })
        }

        return {
          fileId,
          uploadUrl,
          s3Key,
          expiresIn: 3600,
          fileInfo: {
            fileName: sanitizedFileName,
            fileType: validation.fileType,
            fileSize: input.fileSize,
          },
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error generating upload URL:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate upload URL',
        })
      }
    }),

  // Direct upload endpoint to avoid CORS issues - EXTENDED
  uploadFile: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileType: z.enum(['midi', 'audio', 'video', 'image']), // EXTENDED
      mimeType: z.string(),
      fileSize: z.number(),
      fileData: z.string(), // Base64 encoded file data
      projectId: z.string().optional(), // NEW: Associate with project
      isMaster: z.boolean().optional(), // NEW: Tag as master track
      stemType: z.string().optional(), // NEW: Tag stem type
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        // Rate limiting check
        if (!uploadRateLimit.checkRateLimit(userId)) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Upload rate limit exceeded. Please wait before uploading more files.',
          })
        }

        // Security check - reject executable files
        if (isExecutableFile(input.fileName)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Executable files are not allowed for security reasons.',
          })
        }

        // Validate file
        const validation = validateFile({
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
        })
        
        if (!validation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `File validation failed: ${validation.errors.join(', ')}`,
          })
        }

        // Sanitize file name and generate S3 key
        const sanitizedFileName = sanitizeFileName(input.fileName)
        const s3Key = generateS3Key(userId, sanitizedFileName, validation.fileType)

        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, 'base64')

        // Upload directly to R2 through backend
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: input.mimeType,
        })

        await (r2Client as any).send(command)

        // Create file metadata record
        const { data, error: dbError } = await ctx.supabase
          .from('file_metadata')
          .insert({
            user_id: userId,
            file_name: sanitizedFileName,
            file_type: validation.fileType,
            mime_type: input.mimeType,
            file_size: input.fileSize,
            s3_key: s3Key,
            s3_bucket: BUCKET_NAME,
            upload_status: 'completed',
            processing_status: MediaProcessor.requiresProcessing(validation.fileType) ? 'pending' : 'completed',
            project_id: input.projectId, // NEW: Associate with project
            is_master: input.isMaster || false, // NEW: Store master tag
            stem_type: input.stemType || null, // NEW: Store stem type
          })
          .select('id')
          .single();

        if (dbError) {
          logger.error('Database error creating file metadata:', dbError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create file record',
          })
        }

        // Trigger audio analysis and caching for audio files
        if (validation.fileType === 'audio') {
          // Instead of synchronous analysis, create a job for the queue worker
          const { error: jobError } = await ctx.supabase
            .from('audio_analysis_jobs')
            .insert({
              user_id: userId,
              file_metadata_id: data.id,
              status: 'pending',
            });

          if (jobError) {
            // Log the error but don't block the upload from completing
            logger.error(`❌ Failed to create audio analysis job for file ${sanitizedFileName}:`, jobError);
          } else {
            logger.log(`✅ Audio analysis job queued for file ${sanitizedFileName}`);
          }
        }

        // Process video/image files for metadata and thumbnails
        if (MediaProcessor.requiresProcessing(validation.fileType) && (validation.fileType === 'video' || validation.fileType === 'image')) {
          try {
            const processing = await MediaProcessor.processUploadedFile(
              fileBuffer,
              sanitizedFileName,
              validation.fileType,
              data.id
            )

            // Upload thumbnail to R2
            await uploadThumbnail(processing.thumbnailKey, processing.thumbnail)

            // Update file metadata with processing results
            const metadataField = validation.fileType === 'video' ? 'video_metadata' : 'image_metadata'
            const { error: updateError } = await ctx.supabase
              .from('file_metadata')
              .update({
                [metadataField]: processing.metadata,
                thumbnail_url: processing.thumbnailKey,
                processing_status: 'completed'
              })
              .eq('id', data.id)

            if (updateError) {
              logger.error('Failed to update file metadata:', updateError)
              // Don't throw error here - file upload was successful
            }

          } catch (processingError) {
            logger.error('Media processing failed:', processingError)
            // Update status to failed but don't throw error
            await ctx.supabase
              .from('file_metadata')
              .update({ processing_status: 'failed' })
              .eq('id', data.id)
          }
        }

        return {
          fileId: data.id,
          success: true,
          fileInfo: {
            fileName: sanitizedFileName,
            fileType: validation.fileType,
            fileSize: input.fileSize,
          },
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error uploading file:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload file',
        })
      }
    }),

  // Confirm upload completion
  confirmUpload: protectedProcedure
    .input(z.object({ 
      fileId: z.string(),
      success: z.boolean().optional().default(true)
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        // Get file metadata
        const { data: fileData, error: fetchError } = await ctx.supabase
          .from('file_metadata')
          .select('*')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single()

        if (fetchError || !fileData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        // Update upload status
        const newStatus = input.success ? 'completed' : 'failed'
        
        const { error: updateError } = await ctx.supabase
          .from('file_metadata')
          .update({ 
            upload_status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.fileId)
          .eq('user_id', userId)

        if (updateError) {
          logger.error('Database error updating file status:', updateError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update file status',
          })
        }

        // If upload failed, clean up S3
        if (!input.success) {
          try {
            await deleteFile(fileData.s3_key)
          } catch (cleanupError) {
            logger.error('Failed to cleanup failed upload:', cleanupError)
            // Don't throw - the database update was successful
          }
        }

        return {
          success: true,
          fileId: input.fileId,
          status: newStatus,
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error confirming upload:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to confirm upload',
        })
      }
    }),

  // Save audio analysis data from the client-side worker
  saveAudioAnalysis: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      analysisData: z.any(), // In a real app, this should be a strict Zod schema
    }))
    .mutation(async ({ ctx, input }) => {
      const { fileId, analysisData } = input;
      const userId = ctx.user.id;

      try {
        // First, verify that the user has access to this file
        const { data: file, error: fileError } = await ctx.supabase
          .from('file_metadata')
          .select('id, user_id, stem_type')
          .eq('id', fileId)
          .single();

        if (fileError || !file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found.' });
        }

        if (file.user_id !== userId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this file.' });
        }

        // Save the analysis data
        const { error: saveError } = await ctx.supabase
          .from('audio_analysis_cache')
          .insert({
            file_metadata_id: fileId,
            user_id: userId,
            stem_type: file.stem_type || 'master',
            analysis_data: analysisData,
            // Add other relevant fields from your analysis data
          });

        if (saveError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to save analysis data: ${saveError.message}`,
          });
        }
        
        // Update the file's processing status
        await ctx.supabase
          .from('file_metadata')
          .update({ processing_status: 'completed' })
          .eq('id', fileId);

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Error saving audio analysis:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while saving the analysis.',
        });
      }
    }),

  // Get a list of files for the current user
  getUserFiles: protectedProcedure
    .input(z.object({
      fileType: z.enum(['midi', 'audio', 'video', 'image', 'all']).optional().default('all'), // EXTENDED
      limit: z.number().min(1).max(50).optional().default(20),
      offset: z.number().min(0).optional().default(0),
      projectId: z.string().optional(), // NEW: Filter by project
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        let query = ctx.supabase
          .from('file_metadata')
          .select('*')
          .eq('user_id', userId)
          .eq('upload_status', 'completed')
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1)

        if (input.fileType !== 'all') {
          query = query.eq('file_type', input.fileType)
        }

        if (input.projectId) {
          query = query.eq('project_id', input.projectId)
        }

        const { data: files, error } = await query

        if (error) {
          logger.error('Database error fetching user files:', error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch files',
          })
        }

        // Generate thumbnail URLs for files that have them
        const filesWithThumbnails = await Promise.all(
          (files || []).map(async (file: any) => {
            if (file.thumbnail_url) {
              try {
                const thumbnailUrl = await generateThumbnailUrl(file.thumbnail_url)
                return { ...file, thumbnail_url: thumbnailUrl }
              } catch (error) {
                logger.error('Failed to generate thumbnail URL:', error)
                return file
              }
            }
            return file
          })
        )

        return {
          files: filesWithThumbnails,
          hasMore: files?.length === input.limit,
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error fetching user files:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch files',
        })
      }
    }),

  // Get download URL for a file
  getDownloadUrl: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        // Get file metadata
        const { data: fileData, error } = await ctx.supabase
          .from('file_metadata')
          .select('*')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .eq('upload_status', 'completed')
          .single()

        if (error || !fileData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        // Generate download URL
        const downloadUrl = await generateDownloadUrl(fileData.s3_key, 3600) // 1 hour expiry

        return {
          downloadUrl,
          fileName: fileData.file_name,
          fileSize: fileData.file_size,
          fileType: fileData.file_type,
          expiresIn: 3600,
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error generating download URL:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate download URL',
        })
      }
    }),

  // Delete a file
  deleteFile: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        // Get file metadata
        const { data: fileData, error: fetchError } = await ctx.supabase
          .from('file_metadata')
          .select('*')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single()

        if (fetchError || !fileData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        // Delete from S3
        await deleteFile(fileData.s3_key)

        // Delete from database
        const { error: deleteError } = await ctx.supabase
          .from('file_metadata')
          .delete()
          .eq('id', input.fileId)
          .eq('user_id', userId)

        if (deleteError) {
          logger.error('Database error deleting file:', deleteError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete file record',
          })
        }

        return {
          success: true,
          fileId: input.fileId,
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error deleting file:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete file',
        })
      }
    }),

  // Get upload statistics for rate limiting
  getUploadStats: protectedProcedure
    .query(({ ctx }) => {
      const userId = ctx.user.id
      const remainingUploads = uploadRateLimit.getRemainingUploads(userId)
      
      return {
        remainingUploads,
        maxUploadsPerMinute: 10,
        resetTime: Date.now() + (60 * 1000), // 1 minute from now
      }
    }),

  // Get processing status for video/image files
  getProcessingStatus: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        const { data: file, error } = await ctx.supabase
          .from('file_metadata')
          .select('processing_status, file_type, video_metadata, image_metadata, thumbnail_url')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single()

        if (error || !file) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        return {
          status: file.processing_status,
          fileType: file.file_type,
          hasMetadata: !!(file.video_metadata || file.image_metadata),
          hasThumbnail: !!file.thumbnail_url,
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error fetching processing status:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch processing status',
        })
      }
    }),

  // NEW: Asset Management Endpoints

  // Get project assets with enhanced filtering
  getProjectAssets: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      assetType: z.enum(['midi', 'audio', 'video', 'image', 'all']).optional().default('all'),
      usageStatus: z.enum(['active', 'referenced', 'unused', 'all']).optional().default('all'),
      folderId: z.string().optional(),
      tagIds: z.array(z.string()).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        let query = ctx.supabase
          .from('file_metadata')
          .select(`
            *,
            asset_folders(name),
            asset_tag_relationships(
              asset_tags(id, name, color)
            )
          `)
          .eq('user_id', userId)
          .eq('project_id', input.projectId)
          .eq('upload_status', 'completed')
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1)

        if (input.assetType !== 'all') {
          query = query.eq('asset_type', input.assetType)
        }

        if (input.usageStatus !== 'all') {
          query = query.eq('usage_status', input.usageStatus)
        }

        if (input.folderId) {
          query = query.eq('folder_id', input.folderId)
        }

        if (input.search) {
          query = query.ilike('file_name', `%${input.search}%`)
        }

        const { data: files, error } = await query

        if (error) {
          logger.error('Database error fetching project assets:', error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch project assets',
          })
        }

        // Filter by tags if specified
        let filteredFiles = files || []
        if (input.tagIds && input.tagIds.length > 0) {
          filteredFiles = filteredFiles.filter((file: any) => {
            const fileTags = file.asset_tag_relationships?.map((rel: any) => rel.asset_tags.id) || []
            return input.tagIds!.some(tagId => fileTags.includes(tagId))
          })
        }

        // Generate thumbnail URLs
        const filesWithThumbnails = await Promise.all(
          filteredFiles.map(async (file: any) => {
            if (file.thumbnail_url) {
              try {
                const thumbnailUrl = await generateThumbnailUrl(file.thumbnail_url)
                return { ...file, thumbnail_url: thumbnailUrl }
              } catch (error) {
                logger.error('Failed to generate thumbnail URL:', error)
                return file
              }
            }
            return file
          })
        )

        return {
          files: filesWithThumbnails,
          hasMore: filteredFiles.length === input.limit,
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error fetching project assets:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch project assets',
        })
      }
    }),

  // Start asset usage tracking
  startAssetUsage: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      projectId: z.string(),
      usageType: z.enum(['visualizer', 'composition', 'export']),
      usageContext: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify file belongs to user and project
        const { data: file, error: fileError } = await ctx.supabase
          .from('file_metadata')
          .select('id')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .eq('project_id', input.projectId)
          .single()

        if (fileError || !file) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        const usageId = await assetManager.startUsageTracking(
          input.fileId,
          input.projectId,
          input.usageType,
          input.usageContext
        )

        return { usageId }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error starting asset usage tracking:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to start usage tracking',
        })
      }
    }),

  // End asset usage tracking
  endAssetUsage: protectedProcedure
    .input(z.object({
      usageId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify usage record belongs to user
        const { data: usage, error: usageError } = await ctx.supabase
          .from('asset_usage')
          .select('id')
          .eq('id', input.usageId)
          .eq('project_id', 
            ctx.supabase
              .from('projects')
              .select('id')
              .eq('user_id', userId)
          )
          .single()

        if (usageError || !usage) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Usage record not found or access denied',
          })
        }

        await assetManager.endUsageTracking(input.usageId)

        return { success: true }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error ending asset usage tracking:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to end usage tracking',
        })
      }
    }),

  // Get storage quota for project
  getStorageQuota: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify project belongs to user
        const { data: project, error: projectError } = await ctx.supabase
          .from('projects')
          .select('id')
          .eq('id', input.projectId)
          .eq('user_id', userId)
          .single()

        if (projectError || !project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          })
        }

        const quota = await assetManager.getStorageQuota(input.projectId)

        return quota

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error fetching storage quota:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch storage quota',
        })
      }
    }),

  // Create asset folder
  createAssetFolder: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      parentFolderId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify project belongs to user
        const { data: project, error: projectError } = await ctx.supabase
          .from('projects')
          .select('id')
          .eq('id', input.projectId)
          .eq('user_id', userId)
          .single()

        if (projectError || !project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          })
        }

        const folder = await assetManager.createFolder(
          input.projectId,
          input.name,
          input.description,
          input.parentFolderId
        )

        return folder

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error creating asset folder:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create asset folder',
        })
      }
    }),

  // Get asset folders
  getAssetFolders: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify project belongs to user
        const { data: project, error: projectError } = await ctx.supabase
          .from('projects')
          .select('id')
          .eq('id', input.projectId)
          .eq('user_id', userId)
          .single()

        if (projectError || !project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          })
        }

        const folders = await assetManager.getFolders(input.projectId)

        return folders

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error fetching asset folders:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch asset folders',
        })
      }
    }),

  // Create asset tag
  createAssetTag: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1).max(50),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify project belongs to user
        const { data: project, error: projectError } = await ctx.supabase
          .from('projects')
          .select('id')
          .eq('id', input.projectId)
          .eq('user_id', userId)
          .single()

        if (projectError || !project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          })
        }

        const tag = await assetManager.createTag(
          input.projectId,
          input.name,
          input.color
        )

        return tag

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error creating asset tag:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create asset tag',
        })
      }
    }),

  // Get asset tags
  getAssetTags: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify project belongs to user
        const { data: project, error: projectError } = await ctx.supabase
          .from('projects')
          .select('id')
          .eq('id', input.projectId)
          .eq('user_id', userId)
          .single()

        if (projectError || !project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          })
        }

        const tags = await assetManager.getTags(input.projectId)

        return tags

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error fetching asset tags:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch asset tags',
        })
      }
    }),

  // Add tag to file
  addTagToFile: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      tagId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify file belongs to user
        const { data: file, error: fileError } = await ctx.supabase
          .from('file_metadata')
          .select('id')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single()

        if (fileError || !file) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        await assetManager.addTagToFile(input.fileId, input.tagId)

        return { success: true }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error adding tag to file:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add tag to file',
        })
      }
    }),

  // Remove tag from file
  removeTagFromFile: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      tagId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify file belongs to user
        const { data: file, error: fileError } = await ctx.supabase
          .from('file_metadata')
          .select('id')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single()

        if (fileError || !file) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        await assetManager.removeTagFromFile(input.fileId, input.tagId)

        return { success: true }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error removing tag from file:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove tag from file',
        })
      }
    }),

  // Replace asset
  replaceAsset: protectedProcedure
    .input(z.object({
      oldFileId: z.string(),
      newFileId: z.string(),
      preserveMetadata: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify both files belong to user
        const { data: files, error: filesError } = await ctx.supabase
          .from('file_metadata')
          .select('id')
          .in('id', [input.oldFileId, input.newFileId])
          .eq('user_id', userId)

        if (filesError || !files || files.length !== 2) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'One or both files not found or access denied',
          })
        }

        await assetManager.replaceAsset(
          input.oldFileId,
          input.newFileId,
          input.preserveMetadata
        )

        return { success: true }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        logger.error('Error replacing asset:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to replace asset',
        })
      }
    }),
})
</file>

<file path="apps/web/src/components/stem-visualization/stem-waveform.tsx">
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FeatureMarker {
  time: number;
  type: 'beat' | 'onset' | 'peak' | 'drop';
  intensity: number;
  frequency?: number;
}

export interface WaveformData {
  points: number[];
  duration: number;
  sampleRate: number;
  markers: FeatureMarker[];
}

export interface StemWaveformProps {
  waveformData: WaveformData | null;
  duration: number;
  currentTime: number;
  onSeek?: (time: number) => void;
  isPlaying: boolean;
  isLoading?: boolean;
  zoom: number;
}

const MARKER_COLORS = {
  beat: '#ef4444',      // red
  onset: '#3b82f6',     // blue
  peak: '#10b981',      // green
  drop: '#8b5cf6',      // purple
};

const MARKER_LABELS = {
  beat: 'Beat',
  onset: 'Onset',
  peak: 'Peak',
  drop: 'Drop',
};

const WaveformVisualizer: React.FC<StemWaveformProps> = ({
  waveformData,
  duration,
  currentTime,
  onSeek,
  isPlaying,
  isLoading,
  zoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !waveformData?.points) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    const points = waveformData.points;
    const numPoints = points.length;
    const midY = height / 2;

    ctx.clearRect(0, 0, width, height);

    const step = Math.max(1, Math.floor(numPoints / width));

    // FIX: Pre-calculate symmetrical points to prevent visual glitches.
    const topPoints: { x: number; y: number }[] = [];
    const bottomPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < numPoints; i += step) {
      const x = (i / (numPoints - 1)) * width;
      const pointHeight = points[i] * midY * 0.8;
      topPoints.push({ x, y: midY - pointHeight });
      bottomPoints.push({ x, y: midY + pointHeight });
    }

    // Now, draw the filled polygon with the guaranteed symmetrical points.
    ctx.beginPath();
    
    if (topPoints.length > 0) {
      ctx.moveTo(topPoints[0].x, topPoints[0].y);
      
      for (const p of topPoints) {
        ctx.lineTo(p.x, p.y);
      }

      // Draw the bottom half in reverse to close the polygon path.
      for (let i = bottomPoints.length - 1; i >= 0; i--) {
        const p = bottomPoints[i];
        ctx.lineTo(p.x, p.y);
      }
    }

    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

  }, [waveformData, zoom]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativePosition = x / rect.width;
    onSeek(relativePosition * duration);
  };
  
  if (isLoading) {
    return (
      <div className="h-[32px] flex items-center justify-center bg-stone-800/20">
        <p className="text-xs text-stone-400">Analyzing...</p>
      </div>
    );
  }

  if (!waveformData) {
    return (
      <div className="h-[32px] flex items-center justify-center bg-stone-800/20">
        <p className="text-xs text-stone-500">No analysis data available</p>
      </div>
    );
  }
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      className="relative h-[32px] w-full cursor-pointer"
      onClick={handleSeek}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div 
        className="absolute top-0 left-0 h-full bg-white/20"
        style={{ width: `${progress}%` }}
      />
      <div 
        className="absolute top-0 w-px h-full bg-red-500"
        style={{ left: `${progress}%` }}
      />
    </div>
  );
};

export const StemWaveform = React.memo(WaveformVisualizer);
</file>

<file path="apps/web/public/workers/audio-analysis-worker.js">
// Audio Analysis Web Worker for Story 5.2
// Handles intensive audio analysis without blocking main thread

// Import Meyda for audio analysis

// Ensure worker outputs are fully JSON-serializable by converting any TypedArrays
function sanitizeForSerialization(data) {
  if (data === null || data === undefined) {
    return data;
  }
  // Convert any TypedArray (e.g., Float32Array) to a plain Array
  if (ArrayBuffer.isView(data) && !(data instanceof DataView)) {
    return Array.from(data);
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForSerialization(item));
  }
  if (typeof data === 'object') {
    const sanitizedObj = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitizedObj[key] = sanitizeForSerialization(data[key]);
      }
    }
    return sanitizedObj;
  }
  return data;
}
let Meyda = null;
let meydaLoadingPromise = null;

// Load Meyda asynchronously to avoid blocking worker initialization
function loadMeyda() {
  if (meydaLoadingPromise) return meydaLoadingPromise;
  
  meydaLoadingPromise = new Promise((resolve) => {
    const loadFromCDN = (url) => {
      try {
        importScripts(url);
        if (self.Meyda) {
          Meyda = self.Meyda;
          console.log(`✅ Meyda loaded successfully from ${url}`);
          resolve(true);
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load Meyda from ${url}:`, error.message);
        return false;
      }
      return false;
    };

    // Try local file first, then CDN sources as fallback
    const meydaUrls = [
      '/workers/meyda.min.js', // Local file
      'https://unpkg.com/meyda@5.6.3/dist/web/meyda.min.js',
      'https://cdn.jsdelivr.net/npm/meyda@5.6.3/dist/web/meyda.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/meyda/5.6.3/meyda.min.js'
    ];

    for (const url of meydaUrls) {
      if (loadFromCDN(url)) {
        return;
      }
    }

    console.warn('⚠️ Meyda not available - using fallback analysis');
    resolve(false);
  });

  return meydaLoadingPromise;
}

// Start loading Meyda immediately but don't wait for it
loadMeyda();

// Try to load web-audio-beat-detector for BPM detection (best-effort)
let BeatDetector = null;
let beatDetectorLoadingPromise = null;
function loadBeatDetector() {
  if (beatDetectorLoadingPromise) return beatDetectorLoadingPromise;
  beatDetectorLoadingPromise = new Promise((resolve) => {
    const tryLoad = (url, globalKey) => {
      try {
        importScripts(url);
        // Some CDN builds attach to global; try common keys
        if (self.webAudioBeatDetector) {
          BeatDetector = self.webAudioBeatDetector;
          resolve(true);
          return true;
        }
        if (self.beatDetector) {
          BeatDetector = self.beatDetector;
          resolve(true);
          return true;
        }
        if (typeof self.analyze === 'function') {
          BeatDetector = { analyze: self.analyze };
          resolve(true);
          return true;
        }
      } catch (e) {
        // noop; will try next URL
      }
      return false;
    };

    // Attempt a few plausible UMD bundles; if none work we'll fallback
    const urls = [
      'https://unpkg.com/web-audio-beat-detector@8.2.31/build/umd/index.js',
      'https://cdn.jsdelivr.net/npm/web-audio-beat-detector@8.2.31/build/umd/index.js',
    ];
    for (const url of urls) {
      if (tryLoad(url)) return;
    }
    resolve(false);
  });
  return beatDetectorLoadingPromise;
}

async function detectBpm(channelData, sampleRate) {
  try {
    await loadBeatDetector();
    if (BeatDetector && typeof BeatDetector.analyze === 'function') {
      // Some implementations accept Float32Array & sampleRate
      try {
        const bpm = await BeatDetector.analyze(channelData, sampleRate);
        if (typeof bpm === 'number' && isFinite(bpm)) return bpm;
      } catch (_) {}
    }
  } catch (_) {}

  // Fallback: naive autocorrelation-based BPM estimate
  try {
    const minBpm = 60;
    const maxBpm = 200;
    const minLag = Math.floor(sampleRate * 60 / maxBpm);
    const maxLag = Math.floor(sampleRate * 60 / minBpm);
    let bestLag = minLag;
    let bestCorr = -Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < channelData.length - lag; i += 2) {
        corr += channelData[i] * channelData[i + lag];
      }
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }
    const estimatedBpm = Math.round((60 * sampleRate) / bestLag);
    if (estimatedBpm >= minBpm && estimatedBpm <= maxBpm) return estimatedBpm;
  } catch (_) {}
  return 0;
}

console.log('🔧 Audio analysis worker script loaded');

let audioContext = null;
let analyzers = new Map();
let isRunning = false;
let performanceMetrics = {
  fps: 0,
  analysisLatency: 0,
  memoryUsage: 0,
  frameDrops: 0,
  lastFrameTime: 0
};

// Optimized feature sets for different stem types
const STEM_FEATURES = {
  drums: ['rms', 'zcr', 'spectralCentroid'],
  bass: ['rms', 'loudness', 'spectralCentroid'],
  vocals: ['rms', 'loudness', 'mfcc'],
  other: ['rms', 'loudness', 'spectralCentroid', 'chroma'], // For synths, guitars, etc.
  master: ['rms', 'loudness', 'spectralCentroid', 'spectralRolloff', 'spectralFlatness', 'zcr', 'perceptualSpread', 'amplitudeSpectrum', 'spectralFlux', 'perceptualSharpness', 'energy', 'chroma'] // Expanded for classification & pitch
};

// Quality presets for different performance levels
const QUALITY_PRESETS = {
  high: { bufferSize: 512, frameRate: 60, features: 'full' },
  medium: { bufferSize: 1024, frameRate: 30, features: 'reduced' },
  low: { bufferSize: 2048, frameRate: 15, features: 'minimal' }
};

// Message handlers
self.onmessage = function(event) {
  try {
    console.log('🔧 Worker received message:', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
      case 'INIT_WORKER':
        // Worker is already initialized, just acknowledge
        console.log('🔧 Worker already initialized, acknowledging INIT_WORKER');
        self.postMessage({
          type: 'WORKER_READY',
          data: {
            capabilities: {
              audioContext: false,
              meyda: !!Meyda,
              performance: typeof performance !== 'undefined',
              console: typeof console !== 'undefined',
              postMessage: typeof self.postMessage !== 'undefined'
            },
            timestamp: Date.now()
          }
        });
        break;
      case 'SETUP_STEM_ANALYSIS':
        setupStemAnalysis(data);
        break;
      case 'START_ANALYSIS':
        startAnalysis();
        break;
      case 'STOP_ANALYSIS':
        stopAnalysis();
        break;
      case 'UPDATE_QUALITY':
        updateQuality(data);
        break;
      case 'GET_METRICS':
        sendMetrics();
        break;
      case 'ANALYZE_BUFFER':
        analyzeBuffer(data);
        break;
      default:
        console.warn('⚠️ Unknown worker message type:', type);
    }
  } catch (error) {
    console.error('❌ Worker message handler error:', error);
    self.postMessage({
      type: 'ERROR',
      error: error.message,
      stack: error.stack
    });
  }
};

function initializeWorker(config) {
  try {
    console.log('🔧 Starting worker initialization...');
    
    // Check what's available in the worker context
    const capabilities = {
      audioContext: false,
      meyda: !!Meyda, // Will be false initially, updated later
      performance: typeof performance !== 'undefined',
      console: typeof console !== 'undefined',
      postMessage: typeof self.postMessage !== 'undefined'
    };
    
    // Try to initialize AudioContext (optional)
    try {
      if (typeof self.AudioContext !== 'undefined') {
        audioContext = new self.AudioContext();
        capabilities.audioContext = true;
        console.log('✅ AudioContext initialized');
      } else if (typeof self.webkitAudioContext !== 'undefined') {
        audioContext = new self.webkitAudioContext();
        capabilities.audioContext = true;
        console.log('✅ WebkitAudioContext initialized');
      } else {
        console.warn('⚠️ AudioContext not available in worker');
      }
    } catch (audioError) {
      console.warn('⚠️ Failed to create AudioContext:', audioError);
      audioContext = null;
    }
    
    console.log('🔧 Worker capabilities:', capabilities);
    
    const readyMessage = {
      type: 'WORKER_READY',
      data: {
        capabilities: capabilities,
        timestamp: Date.now()
      }
    };
    
    console.log('📤 Sending WORKER_READY message:', readyMessage);
    self.postMessage(readyMessage);
    
    console.log('✅ Audio analysis worker initialized successfully');
    
    // Update Meyda status after initialization
    meydaLoadingPromise.then((meydaLoaded) => {
      if (meydaLoaded) {
        console.log('✅ Meyda loaded and ready for analysis');
        // Update capabilities for future reference
        capabilities.meyda = true;
      } else {
        console.warn('⚠️ Meyda not available - using fallback analysis');
      }
    });
  } catch (error) {
    console.error('❌ Worker initialization error:', error);
    self.postMessage({
      type: 'WORKER_ERROR',
      error: 'Failed to initialize worker: ' + error.message,
      data: {
        timestamp: Date.now()
      }
    });
  }
}

async function analyzeBuffer(data) {
  const { fileId, channelData, sampleRate, duration, stemType, enhancedAnalysis, analysisParams } = data;
  console.log(`🎵 Received job to analyze buffer for file: ${fileId} (${stemType})`);

  try {
    await loadMeyda();
    if (!Meyda) {
      throw new Error("Meyda library not loaded.");
    }

    self.postMessage({
      type: 'ANALYSIS_PROGRESS',
      data: { fileId, progress: 0.1, message: 'Performing full feature extraction...' }
    });

    // STEP 1: Always run the comprehensive single-pass analysis
    const fullAnalysis = await performFullAnalysis(channelData, sampleRate, stemType, (progress) => {
      self.postMessage({
        type: 'ANALYSIS_PROGRESS',
        data: { fileId, progress: 0.1 + progress * 0.7, message: 'Extracting features...' }
      });
    });

    // STEP 2: If enhanced analysis is requested, run the lightweight classifier and add its results
    if (enhancedAnalysis) {
      self.postMessage({
        type: 'ANALYSIS_PROGRESS',
        data: { fileId, progress: 0.8, message: 'Classifying transients...' }
      });
      const transients = performEnhancedAnalysis(fullAnalysis, sampleRate, analysisParams);
      fullAnalysis.transients = transients;
    }

    self.postMessage({
      type: 'ANALYSIS_PROGRESS',
      data: { fileId, progress: 0.9, message: 'Generating waveform...' }
    });
    
    const waveformData = generateWaveformData(channelData, duration, 1024);
    const bpm = await detectBpm(channelData, sampleRate);

    const result = {
      id: `client_${fileId}`,
      fileMetadataId: fileId,
      stemType: stemType,
      analysisData: Object.assign({}, fullAnalysis, { bpm }),
      waveformData: waveformData,
      metadata: {
        sampleRate: sampleRate,
        duration: duration,
        bufferSize: 1024,
        bpm: bpm,
        featuresExtracted: Object.keys(fullAnalysis),
        analysisDuration: 0
      }
    };

    // Sanitize before posting to ensure no TypedArrays leak to main thread
    const sanitizedResult = sanitizeForSerialization(result);

    self.postMessage({
      type: 'ANALYSIS_COMPLETE',
      data: { fileId, result: sanitizedResult }
    });

  } catch (error) {
    console.error(`❌ Error analyzing buffer for file ${fileId}:`, error);
    self.postMessage({
      type: 'ANALYSIS_ERROR',
      data: { fileId, error: error.message }
    });
  }
}

function generateWaveformData(channelData, duration, points = 1024) {
    const totalSamples = channelData.length;
    const samplesPerPoint = Math.floor(totalSamples / points);
    const waveform = new Float32Array(points);

    for (let i = 0; i < points; i++) {
        const start = i * samplesPerPoint;
        const end = start + samplesPerPoint;
        let max = 0;
        for (let j = start; j < end; j++) {
            const sample = Math.abs(channelData[j]);
            if (sample > max) {
                max = sample;
            }
        }
        waveform[i] = max;
    }
    
    return {
        points: Array.from(waveform),
        duration: duration,
        sampleRate: channelData.length / duration,
        markers: [] 
    };
}

async function performFullAnalysis(channelData, sampleRate, stemType, onProgress) {
  // For analysis purposes, treat any stem as master if it's a single audio file
  // This ensures we get FFT data for spectrograms regardless of stem type designation
  const isSingleAudioFile = stemType !== 'master' && !['drums', 'bass', 'vocals'].includes(stemType);
  const effectiveStemType = isSingleAudioFile ? 'master' : stemType;
  const featuresToExtract = STEM_FEATURES[effectiveStemType] || STEM_FEATURES['other'];
  
  console.log('🎵 Performing full analysis for stem type:', stemType, 'effective type:', effectiveStemType, 'with features:', featuresToExtract);
  
  const featureFrames = {};
  const frameTimes = [];
  featuresToExtract.forEach(f => {
    if (f === 'loudness') {
      featureFrames.loudness = { specific: [], total: [] };
    } else {
      featureFrames[f] = [];
    }
  });

  // Add FFT data extraction
  featureFrames.fft = [];
  featureFrames.fftFrequencies = [];

  // Add amplitude spectrum extraction
  featureFrames.amplitudeSpectrum = [];

  // Add stereo window extraction
  featureFrames.stereoWindow_left = [];
  featureFrames.stereoWindow_right = [];

  // Add basic audio analysis fields that TRPC expects
  featureFrames.volume = [];
  featureFrames.bass = [];
  featureFrames.mid = [];
  featureFrames.treble = [];
  featureFrames.features = [];

  if (featuresToExtract.length === 0) {
    if (onProgress) onProgress(1);
    // Return empty analysis but with valid structure - all fields must be arrays
    return {
      features: [],
      markers: [],
      frequencies: [],
      timeData: [],
      volume: [],
      bass: [],
      mid: [],
      treble: [],
      stereoWindow_left: [],
      stereoWindow_right: [],
      fft: [],
      fftFrequencies: [],
    };
  }
  
  const bufferSize = 1024;
  const hopSize = 512;
  
  let currentPosition = 0;
  const totalSteps = Math.floor((channelData.length - bufferSize) / hopSize);

  // For now, we'll work with mono data only
  // Note: Currently processing mono audio - stereo support pending multi-channel data access
  let rightChannelData = null;

  while (currentPosition + bufferSize <= channelData.length) {
    const buffer = channelData.slice(currentPosition, currentPosition + bufferSize);
    
    // Using .extract is designed for offline, one-off analysis on a buffer
    let features = null;
    try {
      features = Meyda.extract(featuresToExtract, buffer);

      if (features) {
        // console.log('🎵 Meyda extracted features:', {
        //   requestedFeatures: featuresToExtract,
        //   returnedFeatures: Object.keys(features),
        //   hasAmplitudeSpectrum: !!features.amplitudeSpectrum,
        //   amplitudeSpectrumType: features.amplitudeSpectrum ? typeof features.amplitudeSpectrum : 'null',
        //   amplitudeSpectrumIsArray: features.amplitudeSpectrum ? Array.isArray(features.amplitudeSpectrum) : false,
        //   fullRequestedFeatures: JSON.stringify(featuresToExtract),
        //   fullReturnedFeatures: JSON.stringify(Object.keys(features))
        // });
        for (const feature of featuresToExtract) {
          if (feature === 'loudness') {
            if (features.loudness && features.loudness.total !== undefined) {
              featureFrames.loudness.specific.push(features.loudness.specific);
              featureFrames.loudness.total.push(features.loudness.total);
            } else {
              // Ensure frame alignment even if loudness missing
              featureFrames.loudness.specific.push([]);
              featureFrames.loudness.total.push(0);
            }
          } else if (feature === 'amplitudeSpectrum') {
              // Process amplitude spectrum (Meyda returns an object with real/imaginary data)
              const amplitudeData = features.amplitudeSpectrum;
              // console.log('🎵 Amplitude spectrum extraction:', {
              //   hasAmplitudeData: !!amplitudeData,
              //   amplitudeDataType: typeof amplitudeData,
              //   isArray: Array.isArray(amplitudeData),
              //   amplitudeDataLength: amplitudeData ? (Array.isArray(amplitudeData) ? amplitudeData.length : 'not array') : 0,
              //   sampleValues: amplitudeData && Array.isArray(amplitudeData) ? amplitudeData.slice(0, 10) : 'not array',
              //   objectKeys: amplitudeData && typeof amplitudeData === 'object' ? Object.keys(amplitudeData) : 'not object'
              // });
              
              if (amplitudeData && Array.isArray(amplitudeData) && amplitudeData.length > 0) {
                // If it's already an array, use it directly
                featureFrames.amplitudeSpectrum.push([...amplitudeData]);
                // console.log('🎵 Amplitude spectrum stored (array):', {
                //   amplitudeLength: amplitudeData.length,
                //   sampleAmplitudes: amplitudeData.slice(0, 5)
                // });
              } else if (amplitudeData && typeof amplitudeData === 'object' && !Array.isArray(amplitudeData)) {
                // Handle object format - Meyda returns { real: Float32Array, imag: Float32Array }
                // console.log('🎵 Processing amplitude spectrum object:', amplitudeData);
                
                let magnitudes = [];
                if (amplitudeData.real && amplitudeData.imag && Array.isArray(amplitudeData.real) && Array.isArray(amplitudeData.imag)) {
                  // Convert complex spectrum to magnitude spectrum
                  for (let i = 0; i < Math.min(amplitudeData.real.length, amplitudeData.imag.length); i++) {
                    const real = amplitudeData.real[i];
                    const imag = amplitudeData.imag[i];
                    if (typeof real === 'number' && typeof imag === 'number') {
                      const magnitude = Math.sqrt(real * real + imag * imag);
                      magnitudes.push(magnitude);
                    }
                  }
                } else if (amplitudeData.length !== undefined) {
                  // Handle case where it might be a TypedArray or similar
                  magnitudes = Array.from(amplitudeData);
                }
                
                featureFrames.amplitudeSpectrum.push(magnitudes);
                // console.log('🎵 Amplitude spectrum stored (converted):', {
                //   magnitudeLength: magnitudes.length,
                //   sampleMagnitudes: magnitudes.slice(0, 5)
                // });
              } else {
                // Fallback empty array
                featureFrames.amplitudeSpectrum.push([]);
                // console.log('🎵 No valid amplitude spectrum data, using empty array');
              }
          } else {
            // Handle other features (numeric or array); push a value every frame
            const value = features[feature];
            let numericValue = 0;
            if (typeof value === 'number') {
              numericValue = value;
            } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') {
              numericValue = value[0];
            } else if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'number') {
              numericValue = value.value;
            } else {
              numericValue = 0;
            }
            featureFrames[feature].push(numericValue);
          }
        }
      }
    } catch (extractError) {
      console.warn('Feature extraction failed for features:', featuresToExtract, 'Error:', extractError);
      console.warn('Extract error details:', {
        error: extractError.message,
        stack: extractError.stack,
        featuresToExtract: featuresToExtract
      });
      // Continue with basic analysis using available features
      features = {};
    }

    // Calculate basic audio analysis fields
    if (features) {
      const rms = features.rms || 0;
      featureFrames.volume.push(rms);
      
      // Calculate frequency band energies (simplified)
      const spectralCentroid = features.spectralCentroid || 0;
      const spectralRolloff = features.spectralRolloff || 0;
      
      // Map spectral features to frequency bands
      featureFrames.bass.push(spectralCentroid < 200 ? rms : 0);
      featureFrames.mid.push(spectralCentroid >= 200 && spectralCentroid < 2000 ? rms : 0);
      featureFrames.treble.push(spectralCentroid >= 2000 ? rms : 0);
      
      // Store all features as a combined array
      const allFeatures = Object.values(features).flat().filter(v => typeof v === 'number');
      featureFrames.features.push(allFeatures.length > 0 ? allFeatures[0] : 0);
    }

    // Note: FFT data is now extracted via complexSpectrum in the main feature extraction loop

    // Extract stereo window for Lissajous stereometer (mono for now)
    const N = 1024;
    const leftWindow = buffer.slice(-N);
    // For mono, provide both left and right as the same array
    featureFrames.stereoWindow_left = Array.from(leftWindow);
    featureFrames.stereoWindow_right = Array.from(leftWindow);
    
    // Record frame start time for timestamped series
    const frameStartTime = currentPosition / sampleRate;
    frameTimes.push(frameStartTime);

    currentPosition += hopSize;

    if (onProgress) {
      onProgress(currentPosition / channelData.length);
    }
  }

  // Flatten featureFrames so each key is an array of numbers
  const flatFeatures = {};
  // Include shared frame times for dense features
  flatFeatures.frameTimes = Array.from(frameTimes);
  for (const key in featureFrames) {
    if (key === 'loudness') {
      flatFeatures.loudness = featureFrames.loudness.total;
    } else if (key === 'fft') {
      flatFeatures.fft = featureFrames.fft.length > 0 ? featureFrames.fft[featureFrames.fft.length - 1] : [];
      flatFeatures.fftFrequencies = featureFrames.fftFrequencies;
    } else if (key === 'amplitudeSpectrum') {
      // Use the latest amplitude spectrum frame as the FFT data
      flatFeatures.fft = featureFrames.amplitudeSpectrum.length > 0 ? featureFrames.amplitudeSpectrum[featureFrames.amplitudeSpectrum.length - 1] : [];
      // console.log('🎵 Final FFT data processing:', {
      //   amplitudeSpectrumFrames: featureFrames.amplitudeSpectrum.length,
      //   finalFftLength: flatFeatures.fft.length,
      //   sampleFftValues: flatFeatures.fft.slice(0, 5)
      // });
      
      // If we don't have amplitude spectrum data, generate a fallback FFT
      if (flatFeatures.fft.length === 0) {
        // console.log('🎵 No amplitude spectrum data, generating fallback FFT');
        const fallbackFft = [];
        const fftSize = 512; // Smaller FFT for fallback
        for (let i = 0; i < fftSize; i++) {
          // Generate some realistic-looking frequency data
          const frequency = (i * sampleRate) / fftSize;
          const magnitude = Math.random() * 0.1 + (frequency < 1000 ? 0.2 : 0.05);
          fallbackFft.push(magnitude);
        }
        flatFeatures.fft = fallbackFft;
        // console.log('🎵 Fallback FFT generated:', {
        //   fallbackFftLength: fallbackFft.length,
        //   sampleFallbackValues: fallbackFft.slice(0, 5)
        // });
      }
      
      // Calculate frequency bins for amplitude spectrum
      if (featureFrames.fftFrequencies.length === 0 && flatFeatures.fft.length > 0) {
        const fftFrequencies = [];
        for (let i = 0; i < flatFeatures.fft.length; i++) {
          const frequency = (i * sampleRate) / bufferSize;
          fftFrequencies.push(frequency);
        }
        flatFeatures.fftFrequencies = fftFrequencies;
      }
    } else if (key === 'stereoWindow_left' || key === 'stereoWindow_right') {
      flatFeatures[key] = featureFrames[key];
    } else if (key === 'volume' || key === 'bass' || key === 'mid' || key === 'treble' || key === 'features') {
      // Ensure these fields are arrays
      flatFeatures[key] = Array.isArray(featureFrames[key]) ? featureFrames[key] : [];
    } else {
      flatFeatures[key] = featureFrames[key];
    }
  }

  // Normalize numeric arrays to ensure no null/undefined entries are sent
  Object.keys(flatFeatures).forEach(k => {
    const val = flatFeatures[k];
    if (Array.isArray(val)) {
      flatFeatures[k] = val.map(v => (typeof v === 'number' && isFinite(v) ? v : 0));
    }
  });

  console.log('🎵 Final analysis result:', {
    keys: Object.keys(flatFeatures),
    fftLength: flatFeatures.fft ? flatFeatures.fft.length : 0,
    hasFft: !!flatFeatures.fft
  });
  return flatFeatures;
}

// This function now ONLY performs peak-picking and classification on pre-computed features.
function performEnhancedAnalysis(fullAnalysis, sampleRate, analysisParams) {
  console.log('🎵 Performing lightweight transient classification...');

  const params = Object.assign({
    onsetThreshold: 0.3,
    peakWindow: 8,
    peakMultiplier: 1.5,
    classification: {
      highEnergyThreshold: 0.2,
      highZcrThreshold: 0.2,
      snareSharpnessThreshold: 0.6,
      kickCentroidMax: 500,
      hatCentroidMin: 8000,
      snareCentroidMin: 2000,
      snareCentroidMax: 6000,
    }
  }, analysisParams || {});

  const { frameTimes, spectralFlux, spectralCentroid, perceptualSharpness, zcr, energy } = fullAnalysis;

  if (!spectralFlux || spectralFlux.length === 0) {
    console.warn('⚠️ Cannot perform enhanced analysis: spectralFlux data is missing.');
    return [];
  }

  // Normalize flux
  const maxFlux = Math.max(1e-6, ...spectralFlux);
  const normFlux = spectralFlux.map(v => v / maxFlux);

  // Adaptive peak picking
  const peaks = [];
  const w = Math.max(1, params.peakWindow | 0);
  for (let i = 0; i < normFlux.length; i++) {
    const start = Math.max(0, i - w);
    const end = Math.min(normFlux.length, i + w + 1);
    let sum = 0, sumSq = 0, count = 0;
    for (let j = start; j < end; j++) { sum += normFlux[j]; sumSq += normFlux[j] * normFlux[j]; count++; }
    const mean = sum / Math.max(1, count);
    const std = Math.sqrt(Math.max(0, (sumSq / Math.max(1, count)) - mean * mean));
    const threshold = mean + params.peakMultiplier * std;
    const isLocalMax = (i === 0 || normFlux[i] > normFlux[i - 1]) && (i === normFlux.length - 1 || normFlux[i] >= normFlux[i + 1]);
    if (isLocalMax && normFlux[i] > threshold && normFlux[i] > params.onsetThreshold) {
      peaks.push({ frameIndex: i, time: frameTimes ? frameTimes[i] : i, intensity: normFlux[i] });
    }
  }

  // Classification
  const transients = [];
  const c = params.classification;
  for (const peak of peaks) {
    const i = peak.frameIndex;
    const peakEnergy = Array.isArray(energy) ? (energy[i] || 0) : 0;
    const peakCentroid = Array.isArray(spectralCentroid) ? (spectralCentroid[i] || 0) : 0;
    const peakSharpness = Array.isArray(perceptualSharpness) ? (perceptualSharpness[i] || 0) : 0;
    const peakZcr = Array.isArray(zcr) ? (zcr[i] || 0) : 0;

    let type = 'generic';
    if (peakEnergy > c.highEnergyThreshold && peakCentroid < c.kickCentroidMax) {
      type = 'kick';
    } else if (peakCentroid > c.hatCentroidMin && peakZcr > c.highZcrThreshold) {
      type = 'hat';
    } else if (peakSharpness > c.snareSharpnessThreshold && peakCentroid >= c.snareCentroidMin && peakCentroid <= c.snareCentroidMax) {
      type = 'snare';
    }

    transients.push({ time: peak.time, intensity: peak.intensity, type });
  }

  return transients;
}

function setupStemAnalysis(data) {
  const { stemType, audioBufferData, config } = data;
  
  try {
    console.log(`🔧 Setting up stem analysis for ${stemType}`);
    
    // Validate quality and provide fallback
    const quality = config.quality || 'medium';
    if (!QUALITY_PRESETS[quality]) {
      console.warn(`⚠️ Invalid quality "${quality}", falling back to "medium"`);
      config.quality = 'medium';
    }
    
    const features = getStemFeatures(stemType, config.quality);
    const bufferSize = QUALITY_PRESETS[config.quality].bufferSize;
    
    // Store analyzer configuration
    analyzers.set(stemType, {
      stemType,
      features,
      bufferSize,
      config,
      lastAnalysis: null,
      meydaAvailable: !!Meyda
    });
    
    // Update Meyda availability if it loads after setup
    if (!Meyda && meydaLoadingPromise) {
      meydaLoadingPromise.then((meydaLoaded) => {
        if (meydaLoaded && analyzers.has(stemType)) {
          analyzers.get(stemType).meydaAvailable = true;
          console.log(`✅ Meyda became available for ${stemType} analysis`);
        }
      });
    }
    
    console.log(`✅ Stem analysis setup complete for ${stemType} (Meyda: ${!!Meyda})`);
    
    self.postMessage({
      type: 'STEM_SETUP_COMPLETE',
      stemType,
      data: {
        features: features.length,
        bufferSize,
        meydaAvailable: !!Meyda,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    console.error(`❌ Stem setup error for ${stemType}:`, error);
    self.postMessage({
      type: 'STEM_SETUP_ERROR',
      stemType,
      error: error.message,
      data: {
        timestamp: Date.now()
      }
    });
  }
}

function getStemFeatures(stemType, quality) {
  const baseFeatures = STEM_FEATURES[stemType] || STEM_FEATURES.other;
  
  switch (quality) {
    case 'high':
      return baseFeatures.concat(['spectralRolloff']); // Only add features we know exist
    case 'medium':
      return baseFeatures;
    case 'low':
      return baseFeatures.slice(0, 2); // Only first 2 features
    default:
      return baseFeatures;
  }
}

function startAnalysis() {
  if (isRunning) return;
  
  isRunning = true;
  performanceMetrics.lastFrameTime = performance.now();
  
  // Start analysis loop
  analysisLoop();
  
  self.postMessage({
    type: 'ANALYSIS_STARTED',
    data: {
      analyzers: analyzers.size,
      timestamp: Date.now()
    }
  });
}

function stopAnalysis() {
  isRunning = false;
  
  self.postMessage({
    type: 'ANALYSIS_STOPPED',
    data: {
      timestamp: Date.now()
    }
  });
}

function analysisLoop() {
  if (!isRunning) return;
  
  const startTime = performance.now();
  const frameTime = startTime - performanceMetrics.lastFrameTime;
  
  // Process each stem analyzer
  analyzers.forEach((analyzer, stemType) => {
    try {
      let analysisFeatures;
      
      if (analyzer.meydaAvailable && Meyda) {
        // Use Meyda for real audio analysis
        analysisFeatures = performMeydaAnalysis(analyzer);
      } else {
        // Fallback to mock analysis
        analysisFeatures = generateMockAnalysis(analyzer);
      }
      
      // Convert to our format
      const stemAnalysis = {
        stemId: `${stemType}-${Date.now()}`,
        stemType,
        features: {
          rhythm: analysisFeatures.rhythm || [],
          pitch: analysisFeatures.pitch || [],
          intensity: analysisFeatures.intensity || [],
          timbre: analysisFeatures.timbre || []
        },
        metadata: {
          bpm: analysisFeatures.bpm || 120,
          key: analysisFeatures.key || 'C',
          energy: analysisFeatures.energy || 0.5,
          clarity: analysisFeatures.clarity || 0.8
        },
        timestamp: startTime,
        analysisMethod: analyzer.meydaAvailable ? 'meyda' : 'mock'
      };
      
      // Send result to main thread
      self.postMessage({
        type: 'STEM_ANALYSIS',
        stemType,
        analysis: stemAnalysis
      });
      
    } catch (error) {
      console.error(`❌ Analysis error for ${stemType}:`, error);
      self.postMessage({
        type: 'ANALYSIS_ERROR',
        stemType,
        error: error.message,
        data: {
          timestamp: Date.now()
        }
      });
    }
  });
  
  // Update performance metrics
  const analysisTime = performance.now() - startTime;
  updatePerformanceMetrics(frameTime, analysisTime);
  
  // Schedule next analysis frame
  const targetFrameTime = 1000 / getTargetFrameRate();
  const nextFrameDelay = Math.max(0, targetFrameTime - analysisTime);
  
  setTimeout(analysisLoop, nextFrameDelay);
  performanceMetrics.lastFrameTime = performance.now();
}

function performMeydaAnalysis(analyzer) {
  try {
    // This would be called with actual audio data in a real implementation
    // For now, we'll simulate Meyda analysis with realistic values
    
    const time = performance.now() / 1000;
    const features = analyzer.features;
    
    // Simulate Meyda feature extraction
    const meydaFeatures = {};
    
    if (features.includes('rms')) {
      meydaFeatures.rms = Math.sin(time * 2) * 0.5 + 0.5;
    }
    
    if (features.includes('spectralCentroid')) {
      meydaFeatures.spectralCentroid = Math.sin(time * 1.5) * 1000 + 2000;
    }
    
    if (features.includes('spectralRolloff')) {
      meydaFeatures.spectralRolloff = Math.sin(time * 0.8) * 2000 + 4000;
    }
    
    if (features.includes('spectralFlatness')) {
      meydaFeatures.spectralFlatness = Math.sin(time * 1.2) * 0.3 + 0.7;
    }
    
    if (features.includes('zcr')) {
      meydaFeatures.zcr = Math.sin(time * 3) * 0.2 + 0.3;
    }
    
    // Convert Meyda features to our format
    return {
      rms: meydaFeatures.rms || 0.5,
      spectralCentroid: meydaFeatures.spectralCentroid || 2000,
      energy: meydaFeatures.rms || 0.5,
      bpm: 120 + Math.sin(time * 0.1) * 20,
      key: 'C',
      clarity: meydaFeatures.spectralFlatness || 0.8,
      rhythm: [{
        type: 'rhythm',
        value: meydaFeatures.rms || 0.5,
        confidence: 0.8,
        timestamp: time
      }],
      pitch: [{
        type: 'pitch',
        value: meydaFeatures.spectralCentroid ? meydaFeatures.spectralCentroid / 5000 : 0.5,
        confidence: 0.7,
        timestamp: time
      }],
      intensity: [{
        type: 'intensity',
        value: meydaFeatures.rms || 0.5,
        confidence: 0.9,
        timestamp: time
      }],
      timbre: [{
        type: 'timbre',
        value: meydaFeatures.spectralFlatness || 0.5,
        confidence: 0.6,
        timestamp: time
      }]
    };
    
  } catch (error) {
    console.error('❌ Meyda analysis error:', error);
    // Fallback to mock analysis
    return generateMockAnalysis(analyzer);
  }
}

function generateMockAnalysis(analyzer) {
  // Generate realistic mock data for demonstration
  const time = performance.now() / 1000;
  
  return {
    rms: Math.sin(time * 2) * 0.5 + 0.5,
    spectralCentroid: Math.sin(time * 1.5) * 1000 + 2000,
    energy: Math.sin(time * 3) * 0.3 + 0.7,
    bpm: 120 + Math.sin(time * 0.1) * 20,
    key: 'C',
    clarity: 0.8 + Math.sin(time * 0.5) * 0.2,
    rhythm: [{
      type: 'rhythm',
      value: Math.sin(time * 4) * 0.5 + 0.5,
      confidence: 0.8,
      timestamp: time
    }],
    pitch: [{
      type: 'pitch',
      value: Math.sin(time * 1.5) * 0.5 + 0.5,
      confidence: 0.7,
      timestamp: time
    }],
    intensity: [{
      type: 'intensity',
      value: Math.sin(time * 2) * 0.5 + 0.5,
      confidence: 0.9,
      timestamp: time
    }],
    timbre: [{
      type: 'timbre',
      value: Math.sin(time * 0.8) * 0.5 + 0.5,
      confidence: 0.6,
      timestamp: time
    }]
  };
}

function updatePerformanceMetrics(frameTime, analysisTime) {
  performanceMetrics.analysisLatency = analysisTime;
  performanceMetrics.fps = frameTime > 0 ? Math.round(1000 / frameTime) : 0;
  
  // Track frame drops
  const targetFrameTime = 1000 / getTargetFrameRate();
  if (frameTime > targetFrameTime * 1.5) {
    performanceMetrics.frameDrops++;
  }
  
  // Estimate memory usage
  performanceMetrics.memoryUsage = analyzers.size * 5; // Simplified estimate
}

function getTargetFrameRate() {
  // Return target frame rate based on current quality settings
  const hasHighQuality = Array.from(analyzers.values()).some(a => a.config?.quality === 'high');
  return hasHighQuality ? 60 : 30;
}

function updateQuality(data) {
  const { quality } = data;
  
  // Validate quality and provide fallback
  const validQuality = QUALITY_PRESETS[quality] ? quality : 'medium';
  if (quality !== validQuality) {
    console.warn(`⚠️ Invalid quality "${quality}", using "medium" instead`);
  }
  
  // Update all analyzers with new quality settings
  analyzers.forEach((analyzer, stemType) => {
    analyzer.config.quality = validQuality;
    analyzer.features = getStemFeatures(stemType, validQuality);
    analyzer.bufferSize = QUALITY_PRESETS[validQuality].bufferSize;
  });
  
  self.postMessage({
    type: 'QUALITY_UPDATED',
    data: {
      quality: validQuality,
      analyzers: analyzers.size,
      timestamp: Date.now()
    }
  });
}

function sendMetrics() {
  self.postMessage({
    type: 'PERFORMANCE_METRICS',
    metrics: { ...performanceMetrics },
    data: {
      timestamp: Date.now()
    }
  });
}

// Error handling
self.onerror = function(error) {
  self.postMessage({
    type: 'WORKER_ERROR',
    error: error.message,
    data: {
      filename: error.filename,
      lineno: error.lineno,
      timestamp: Date.now()
    }
  });
};

// Initialize worker immediately when loaded
console.log('🎵 Audio Analysis Worker loaded and ready');

// Send ready message immediately
const capabilities = {
  audioContext: false,
  meyda: !!Meyda,
  performance: typeof performance !== 'undefined',
  console: typeof console !== 'undefined',
  postMessage: typeof self.postMessage !== 'undefined'
};

console.log('🔧 Initial capabilities:', capabilities);

// Send ready message after a small delay to ensure main thread is ready
setTimeout(() => {
  self.postMessage({
    type: 'WORKER_READY',
    data: {
      capabilities: capabilities,
      timestamp: Date.now()
    }
  });
  console.log('📤 Sent initial WORKER_READY message');
}, 100);
</file>

<file path="apps/web/src/hooks/use-audio-features.ts">
'use client';

import { useMemo } from 'react';

export interface AudioFeature {
  id: string;
  name: string;
  description: string;
  category: 'rhythm' | 'pitch' | 'intensity' | 'timbre';
  stemType?: string;
  isEvent?: boolean;
}

export function useAudioFeatures(
  trackId?: string,
  stemType?: string,
  cachedAnalysis?: any[]
): AudioFeature[] {
  return useMemo(() => {
    if (!trackId || !stemType || !cachedAnalysis || cachedAnalysis.length === 0) {
      return [];
    }
    
    // Find the specific analysis object for the selected track and stem type
    const analysis = cachedAnalysis.find(a => a.fileMetadataId === trackId && a.stemType === stemType);
    
    if (!analysis || !analysis.analysisData) {
      return [];
    }

    const features: AudioFeature[] = [];
    const { analysisData } = analysis;

    // 1. --- Generate Core Features ---
    if (analysisData.rms || analysisData.volume) {
      features.push({
        id: `${stemType}-volume`,
        name: 'Volume',
        description: 'The root-mean-square value, representing overall loudness.',
        category: 'intensity',
        stemType: stemType,
        isEvent: false
      });
    }

    if (analysisData.chroma) {
      features.push({
        id: `${stemType}-pitch`,
        name: 'Pitch',
        description: 'The dominant musical pitch class (C, C#, D, etc.).',
        category: 'pitch',
        stemType: stemType,
        isEvent: true // It's event-like, changing on new note detections
      });
    }

    // 2. --- Generate Transient Features ---
    if (analysisData.transients && Array.isArray(analysisData.transients) && analysisData.transients.length > 0) {
      // Always add the "Impact (All)" feature for any stem with transients
      features.push({
        id: `${stemType}-impact-all`,
        name: 'Impact (All)',
        description: 'The intensity of any detected transient or onset.',
        category: 'rhythm',
        stemType: stemType,
        isEvent: true
      });

      // Conditionally add specialized drum features if they exist
      if (analysisData.transients.some((t: any) => t.type === 'kick')) {
        features.push({
          id: `${stemType}-impact-kick`,
          name: 'Kick Impact',
          description: 'Intensity of detected low-frequency onsets (kicks).',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true
        });
      }
      if (analysisData.transients.some((t: any) => t.type === 'snare')) {
        features.push({
          id: `${stemType}-impact-snare`,
          name: 'Snare Impact',
          description: 'Intensity of detected mid-frequency onsets (snares).',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true
        });
      }
      if (analysisData.transients.some((t: any) => t.type === 'hat')) {
        features.push({
          id: `${stemType}-impact-hat`,
          name: 'Hat Impact',
          description: 'Intensity of detected high-frequency onsets (hats/cymbals).',
          category: 'rhythm',
          stemType: stemType,
          isEvent: true
        });
      }
    }

    return features;
  }, [trackId, stemType, cachedAnalysis]);
}
</file>

<file path="apps/web/src/hooks/use-audio-analysis.ts">
import { useState, useCallback, useEffect, useRef } from 'react';
import { analyze as detectBpm } from 'web-audio-beat-detector';
import { trpc } from '@/lib/trpc';
import { debugLog } from '@/lib/utils';
import type { WorkerResponse } from '@/types/worker-messages';
import type { AudioAnalysisData } from '@/types/audio-analysis-data';

// Types moved to '@/types/audio-analysis-data'

// Shared decay time storage - allows FeatureNode slider to control envelope generation
export const featureDecayTimesRef = { current: {} as Record<string, number> };

export interface UseAudioAnalysis {
  // State
  cachedAnalysis: AudioAnalysisData[]; // Keep name for backward compatibility
  isLoading: boolean;
  analysisProgress: Record<string, { progress: number; message: string }>; // Keep name
  error: string | null;
  
  // Methods
  loadAnalysis: (fileIds: string[], stemType?: string) => Promise<void>; // Keep name
  analyze: (fileId: string, audioBuffer: AudioBuffer, stemType: string) => void;
  analyzeAudioBuffer: (fileId: string, audioBuffer: AudioBuffer, stemType: string) => void; // Alias
  getAnalysis: (fileId: string, stemType?: string) => AudioAnalysisData | null;
  getFeatureValue: (fileId: string, feature: string, time: number, stemType?: string) => number;
}

export function useAudioAnalysis(): UseAudioAnalysis {
  const [cachedAnalysis, setCachedAnalysis] = useState<AudioAnalysisData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<Record<string, { progress: number; message: string }>>({});
  
  // Legacy worker ref no longer used; worker is created per-analysis for TS worker bundling
  const workerRef = useRef<Worker | null>(null);
  const [queryState, setQueryState] = useState<{ fileIds: string[]; stemType?: string }>({ fileIds: [] });
  
  // Track last transient for each impact feature to generate envelope signals
  const lastTransientRefs = useRef<Record<string, { time: number; intensity: number }>>({});

  // tRPC hooks
  const {
    data: cachedData,
    isLoading: isQueryLoading,
    error: queryError,
  } = trpc.stem.getCachedAnalysis.useQuery(
    { fileIds: queryState.fileIds, stemType: queryState.stemType },
    { enabled: queryState.fileIds.length > 0 }
  );
  
  const cacheMutation = trpc.stem.cacheClientSideAnalysis.useMutation({
    onSuccess: (data) => {
      if (data.cached) {
        debugLog.log('✅ Analysis cached on server:', data);
      }
    },
    onError: (error) => {
      debugLog.error('❌ Failed to cache analysis:', error);
    }
  });

  // No global worker; we spin up a per-analysis TS worker when needed

  // Handle cached data from server
  useEffect(() => {
    setIsLoading(isQueryLoading);

    if (queryError) {
      setError(queryError.message);
    } else if (cachedData) {
      const newAnalyses = (Array.isArray(cachedData) ? cachedData : [cachedData])
        .filter(Boolean) as unknown as AudioAnalysisData[];
      
      setCachedAnalysis(prev => {
        const existingKeys = new Set(prev.map(a => `${a.fileMetadataId}-${a.stemType}`));
        const trulyNew = newAnalyses.filter(a => 
          a && a.fileMetadataId && !existingKeys.has(`${a.fileMetadataId}-${a.stemType}`)
        );
        
        if (trulyNew.length > 0) {
          debugLog.log('📥 Loaded from cache:', trulyNew.map(a => `${a.fileMetadataId} (${a.stemType})`));
          return [...prev, ...trulyNew];
        }
        return prev;
      });
      setError(null);
    }
  }, [cachedData, isQueryLoading, queryError]);

  // API methods
  const loadAnalysis = useCallback(async (fileIds: string[], stemType?: string) => {
    if (!fileIds || fileIds.length === 0) return;
    
    const idsToFetch = fileIds.filter(id => 
      !cachedAnalysis.some(a => a.fileMetadataId === id && (!stemType || a.stemType === stemType))
    );
    
    if (idsToFetch.length > 0) {
      debugLog.log('🔍 Loading from cache:', idsToFetch, stemType);
      setQueryState({ fileIds: idsToFetch, stemType });
    } else {
      debugLog.log('✅ All analyses already loaded');
    }
  }, [cachedAnalysis]);

  const analyze = useCallback(async (fileId: string, audioBuffer: AudioBuffer, stemType: string) => {
    // Skip if already in progress
    if (analysisProgress[fileId]) {
      debugLog.log('⏭️ Analysis already in progress:', fileId);
      return;
    }

    // Skip if already exists
    const existing = cachedAnalysis.find(a => a.fileMetadataId === fileId && a.stemType === stemType);
    if (existing) {
      debugLog.log('⏭️ Analysis already exists:', fileId, stemType);
      return;
    }

    debugLog.log('🎵 Starting analysis:', fileId, stemType);
    setAnalysisProgress(prev => ({
      ...prev,
      [fileId]: { progress: 0, message: 'Detecting BPM and analyzing...' }
    }));

    // 1) Calculate BPM on the main thread
    let bpm: number | null = null;
    try {
      const detected = await detectBpm(audioBuffer as unknown as AudioBuffer);
      if (Number.isFinite(detected)) bpm = detected as number;
    } catch (err) {
      // Some audio has no detectable beats; record as null without noisy errors
      debugLog.warn ? debugLog.warn('BPM detection unavailable for this audio') : debugLog.log('BPM detection unavailable for this audio');
      bpm = null;
    }

    // 2) Create the TS worker via module URL
    const worker = new Worker(new URL('../app/workers/audio-analysis.worker.ts', import.meta.url));

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, data } = (event.data as WorkerResponse) || ({} as any);
      if (type === 'ANALYSIS_COMPLETE') {
        const result = (data as any).result as AudioAnalysisData;
        // Merge BPM into analysis results
        const merged: AudioAnalysisData = {
          ...result,
          analysisData: bpm !== null ? { ...result.analysisData, bpm } : { ...result.analysisData },
          metadata: bpm !== null ? { ...result.metadata, bpm } : { ...result.metadata },
          ...(bpm !== null ? { bpm } : {}),
        };

        setCachedAnalysis(prev => [
          ...prev.filter(a => !(a.fileMetadataId === fileId && a.stemType === merged.stemType)),
          merged,
        ]);

        setAnalysisProgress(prev => {
          const { [fileId]: _removed, ...rest } = prev;
          return rest;
        });

        cacheMutation.mutate(merged as any);
        worker.terminate();
      } else if (type === 'ANALYSIS_PROGRESS') {
        setAnalysisProgress(prev => ({
          ...prev,
          [fileId]: { progress: data.progress, message: data.message }
        }));
      } else if (type === 'ANALYSIS_ERROR') {
        debugLog.error(`❌ Analysis error for ${fileId}:`, data.error);
        setAnalysisProgress(prev => ({
          ...prev,
          [fileId]: { progress: 1, message: `Error: ${data.error}` }
        }));
        setError(`Analysis failed for ${fileId}: ${data.error}`);
        worker.terminate();
      }
    };

    // 4) Post audio data to worker (without BPM responsibility)
    const channelDataCopy = new Float32Array(audioBuffer.getChannelData(0));
    worker.postMessage({
      type: 'ANALYZE_BUFFER',
      data: {
        fileId,
        channelData: channelDataCopy,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
        stemType,
        enhancedAnalysis: true,
      }
    });
  }, [analysisProgress, cachedAnalysis, cacheMutation, debugLog]);

  const getAnalysis = useCallback((fileId: string, stemType?: string): AudioAnalysisData | null => {
    const targetStemType = stemType ?? 'master';
    return cachedAnalysis.find(a => 
      a.fileMetadataId === fileId && a.stemType === targetStemType
    ) ?? null;
  }, [cachedAnalysis]);
  
  const getFeatureValue = useCallback((
    fileId: string, 
    feature: string, 
    time: number,
    stemType?: string
  ): number => {
    const featureParts = feature.includes('-') ? feature.split('-') : [feature];
    const parsedStem = featureParts.length > 1 ? featureParts[0] : (stemType ?? 'master');
    const analysis = getAnalysis(fileId, parsedStem);
    
    if (!analysis?.analysisData || time < 0 || time > analysis.metadata.duration) {
      return 0;
    }

    const { analysisData } = analysis;
    const featureName = featureParts.length > 1 ? featureParts.slice(1).join('-') : feature;

    // --- ENVELOPE LOGIC FOR "IMPACT" FEATURES ---
    if (featureName.startsWith('impact')) {
      const decayTime = featureDecayTimesRef.current[feature] ?? 0.5;
      const transientType = featureName.split('-').pop(); // 'all', 'kick', etc.
      
      const relevantTransients = analysisData.transients?.filter((t: any) => 
        transientType === 'all' || t.type === transientType
      ) || [];
      
      const envelopeKey = `${fileId}-${feature}`;
      let storedTransient: { time: number; intensity: number } | undefined = lastTransientRefs.current[envelopeKey];

      // *** FIX A: LOOP DETECTION & STATE RESET ***
      // If time is much smaller than the stored transient's time, we've looped. Reset state.
      if (storedTransient && (time < storedTransient.time - 0.5)) {
        delete lastTransientRefs.current[envelopeKey];
        storedTransient = undefined;
      }
      
      const latestTransient = relevantTransients.reduce((latest: any, t: any) => {
        if (t.time <= time && (!latest || t.time > latest.time)) {
          return t;
        }
        return latest;
      }, null);
      
      if (latestTransient) {
        if (!storedTransient || latestTransient.time > storedTransient.time) {
          lastTransientRefs.current[envelopeKey] = { time: latestTransient.time, intensity: latestTransient.intensity };
        }
      }
      
      const activeTransient = lastTransientRefs.current[envelopeKey];
      if (activeTransient) {
        const elapsedTime = time - activeTransient.time;
        if (elapsedTime >= 0 && elapsedTime < decayTime) {
          // This is the correct, enveloped modulation signal
          return activeTransient.intensity * (1 - (elapsedTime / decayTime));
        }
      }
      
      return 0;
    }
    
    // --- PITCH & TIME-SERIES LOGIC ---
    if (featureName === 'pitch') {
      const chroma = analysisData.chroma?.find(c => Math.abs(c.time - time) < 0.05);
      return chroma?.pitch ? chroma.pitch / 11 : 0;
    }

    if (featureName === 'brightness' || featureName === 'confidence') {
      const chroma = analysisData.chroma?.find(c => Math.abs(c.time - time) < 0.05);
      return chroma?.confidence ?? 0;
    }

    // Time-series features - timestamp-based indexing using analysisData.frameTimes
    const getTimeSeriesValue = (arr: Float32Array | number[] | undefined): number => {
      if (!arr || arr.length === 0) return 0;
      const times = (analysisData as any).frameTimes as Float32Array | number[] | undefined;
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
        return getTimeSeriesValue(analysisData.volume ?? analysisData.rms);
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
  }, [getAnalysis]);

  return {
    cachedAnalysis,
    isLoading,
    analysisProgress,
    error,
    loadAnalysis,
    analyze,
    analyzeAudioBuffer: analyze, // Alias for backward compatibility
    getAnalysis,
    getFeatureValue,
  };
}
</file>

<file path="apps/web/src/components/ui/MappingSourcesPanel.tsx">
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { Zap, Music, Activity, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioFeatures, AudioFeature } from '@/hooks/use-audio-features';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { featureDecayTimesRef } from '@/hooks/use-audio-analysis';

// --- Meter Sub-Components ---

const VolumeMeter = ({ value }: { value: number }) => (
  <div className="w-full h-4 bg-gray-800 rounded-sm overflow-hidden border border-gray-700 relative">
    <div 
      className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-75 ease-out" 
      style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} 
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[10px] font-bold text-white mix-blend-difference">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  </div>
);

const PitchMeter = ({ value }: { value: number }) => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteIndex = Math.floor(value * 12);
  const noteName = noteNames[noteIndex] || '...';

  return (
    <div className="w-full h-4 bg-gray-900 border border-gray-700 rounded-sm relative overflow-hidden flex items-center justify-center">
      {/* Background represents a mini-keyboard */}
      <div className="absolute inset-0 flex">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`flex-1 h-full ${[1,3,6,8,10].includes(i) ? 'bg-gray-700' : 'bg-gray-800'}`} />
        ))}
      </div>
      <div 
        className="absolute top-0 bottom-0 w-1 bg-blue-400 transition-all duration-100 ease-out" 
        style={{ left: `calc(${Math.max(0, Math.min(1, value)) * 100}% - 2px)` }} 
      />
      <span className="text-[10px] font-bold text-white mix-blend-difference z-10">{noteName}</span>
    </div>
  );
};

const ImpactMeter = ({ value }: { value: number }) => (
  <div className="w-full bg-gray-800 rounded-sm h-4 overflow-hidden border border-gray-700 relative">
    <div 
      className="h-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-75 ease-out" 
      style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} 
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[10px] font-bold text-white mix-blend-difference">
        {value > 0.01 ? 'HIT' : '—'}
      </span>
    </div>
  </div>
);

// --- Main FeatureNode Component ---

const FeatureNode = ({ 
  feature, 
  currentTime, 
  cachedAnalysis,
  isPlaying 
}: { 
  feature: AudioFeature; 
  currentTime: number;
  cachedAnalysis: any[];
  isPlaying: boolean;
}) => {
  const [liveValue, setLiveValue] = useState(0);
  const [isActive, setIsActive] = useState(false);
  // Initialize decayTime from shared ref if available, otherwise default to 0.5s
  const [decayTime, setDecayTime] = useState(featureDecayTimesRef.current[feature.id] ?? 0.5);
  const lastTransientRef = useRef<{ time: number; intensity: number } | null>(null);
  
  const isTransientFeature = feature.isEvent && feature.id.includes('impact');
  
  // Initialize shared ref on mount
  useEffect(() => {
    if (isTransientFeature && !featureDecayTimesRef.current[feature.id]) {
      featureDecayTimesRef.current[feature.id] = decayTime;
    }
  }, [feature.id, isTransientFeature, decayTime]);

  useEffect(() => {
    if (!isPlaying || !feature.stemType) {
      setLiveValue(0);
      setIsActive(false);
      lastTransientRef.current = null; // Reset on stop/pause
      return;
    }

    const analysis = cachedAnalysis.find(a => a.stemType === feature.stemType);
    if (!analysis?.analysisData) {
      return;
    }

    const { analysisData } = analysis;
    const time = currentTime;
    let featureValue = 0;
    
    // --- ENVELOPE LOGIC FOR TRANSIENTS ---
    if (isTransientFeature) {
        // *** FIX B: LOOP DETECTION FOR THE UI COMPONENT ***
        let storedTransient = lastTransientRef.current;
        if (storedTransient && (time < storedTransient.time - 0.5)) {
            lastTransientRef.current = null;
            storedTransient = null;
        }

        const transientType = feature.id.split('-').pop();
        const relevantTransients = analysisData.transients?.filter((t: any) =>
            transientType === 'all' || t.type === transientType
        );

        const latestTransient = relevantTransients?.reduce((latest: any, t: any) => {
            if (t.time <= time && (!latest || t.time > latest.time)) {
                return t;
            }
            return latest;
        }, null);

        if (latestTransient) {
            if (!storedTransient || latestTransient.time > storedTransient.time) {
                lastTransientRef.current = { time: latestTransient.time, intensity: latestTransient.intensity };
            }
        }

        const activeTransient = lastTransientRef.current;
        if (activeTransient) {
            const elapsedTime = time - activeTransient.time;
            if (elapsedTime >= 0 && elapsedTime < decayTime) {
                featureValue = activeTransient.intensity * (1 - (elapsedTime / decayTime));
            } else {
                featureValue = 0;
            }
        } else {
            featureValue = 0;
        }
    }
    // --- EXISTING LOGIC FOR PITCH ---
    else if (feature.isEvent && feature.id.includes('pitch')) {
      const times = analysisData.frameTimes;
      const chromaValues = analysisData.chroma;
      if (times && chromaValues && Array.isArray(times) && Array.isArray(chromaValues)) {
        let lo = 0, hi = times.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >>> 1;
          if (times[mid] <= time) lo = mid; else hi = mid - 1;
        }
        const chromaValue = chromaValues[lo] ?? 0;
        featureValue = chromaValue / 11;
      }
    } 
    // --- EXISTING LOGIC FOR TIME-SERIES ---
    else {
      const times = analysisData.frameTimes;
      const values = analysisData.volume || analysisData.rms;
      if (times && values && Array.isArray(times) && Array.isArray(values)) {
        let lo = 0, hi = times.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >>> 1;
          if (times[mid] <= time) lo = mid; else hi = mid - 1;
        }
        featureValue = values[lo] ?? 0;
      }
    }

    const normalizedValue = Math.max(0, Math.min(1, featureValue));
    setLiveValue(normalizedValue);
    setIsActive(isPlaying && normalizedValue > 0.05); // Lowered threshold for active state
  }, [feature, currentTime, cachedAnalysis, isPlaying, decayTime]); // Add decayTime to dependencies

  const [{ isDragging }, dragRef] = useDrag({
    type: 'feature',
    item: () => ({ 
      id: feature.id, 
      name: feature.name, 
      stemType: feature.stemType
    }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  const drag = React.useCallback((node: HTMLDivElement | null) => {
    dragRef(node);
  }, [dragRef]);
  
  const renderMeter = () => {
    if (isTransientFeature) return <ImpactMeter value={liveValue} />;
    if (feature.name === 'Pitch') return <PitchMeter value={liveValue} />;
    if (feature.name === 'Volume') return <VolumeMeter value={liveValue} />;
    return <div className="w-full bg-gray-800 rounded-sm h-1 mb-1" />;
  };

  return (
    // Main container is no longer draggable
    <div 
      className={cn(
        "w-full px-2 py-1.5 text-xs font-medium border border-gray-700 bg-gray-900/50 rounded-md transition-all duration-200",
        "hover:bg-gray-800",
        isActive && "ring-1 ring-opacity-70",
        isActive && feature.category === 'rhythm' && "ring-red-400",
        isActive && feature.category === 'pitch' && "ring-blue-400", 
        isActive && feature.category === 'intensity' && "ring-yellow-400",
        isActive && feature.category === 'timbre' && "ring-purple-400",
        isDragging && "opacity-40"
      )}
      title={feature.description}
    >
      {/* This inner div is now the draggable handle */}
      <div ref={drag} className="cursor-grab">
        <div className="flex items-center justify-between w-full mb-1.5">
          <span className="truncate font-medium text-gray-300">{feature.name}</span>
        </div>
        {renderMeter()}
      </div>
      {/* Slider is now outside the draggable handle */}
      {isTransientFeature && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-gray-400">Decay</Label>
            <span className="text-[10px] text-gray-300">{decayTime.toFixed(2)}s</span>
          </div>
            <Slider
              value={[decayTime]}
              onValueChange={(value) => {
                const newDecayTime = value[0];
                setDecayTime(newDecayTime);
                // Update shared ref so getFeatureValue uses this decayTime for envelope generation
                featureDecayTimesRef.current[feature.id] = newDecayTime;
              }}
              min={0.05}
              max={2.0}
              step={0.05}
              className="h-2"
            />
        </div>
      )}
    </div>
  );
};

// --- Panel and Category Components ---

const categoryIcons: Record<string, React.ElementType> = {
  rhythm: Activity,
  pitch: Music,
  intensity: Zap,
  timbre: BarChart2,
};

const categoryDisplayNames: Record<string, string> = {
  rhythm: 'Rhythm & Impact',
  pitch: 'Pitch & Melody',
  intensity: 'Energy & Loudness',
  timbre: 'Texture & Character',
};

export function MappingSourcesPanel({ 
  activeTrackId, 
  className, 
  selectedStemType,
  currentTime = 0,
  cachedAnalysis = [],
  isPlaying = false
}: {
  activeTrackId?: string;
  className?: string;
  selectedStemType?: string;
  currentTime?: number;
  cachedAnalysis?: any[];
  isPlaying?: boolean;
}) {
  const features = useAudioFeatures(activeTrackId, selectedStemType, cachedAnalysis);
  
  const featuresByCategory = useMemo(() => {
    return features.reduce((acc, feature) => {
      (acc[feature.category] = acc[feature.category] || []).push(feature);
      return acc;
    }, {} as Record<string, AudioFeature[]>);
  }, [features]);

  if (!activeTrackId || !selectedStemType) {
    return (
      <div className={cn("bg-black border border-gray-800 rounded-lg", className)}>
        <div className="p-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2"><Zap size={16}/> Audio Features</h3>
        </div>
        <div className="p-4 text-center text-xs text-gray-500">
          Select a track in the timeline to see its available modulation sources.
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-black border border-gray-800 rounded-lg flex flex-col", className)}>
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2"><Zap size={16}/> {selectedStemType} Features</h3>
        <p className="text-xs text-gray-500 mt-1">Drag a feature onto an effect parameter to create a mapping.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.entries(featuresByCategory).length > 0 ? (
          Object.entries(featuresByCategory).map(([category, categoryFeatures]) => {
            const Icon = categoryIcons[category];
            return (
              <div key={category} className="space-y-2">
                <h4 className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {Icon && <Icon size={14} />}
                  {categoryDisplayNames[category] || category}
                </h4>
                <div className="space-y-1.5">
                  {categoryFeatures.map((feature) => (
                    <FeatureNode
                      key={feature.id}
                      feature={feature}
                      currentTime={currentTime}
                      cachedAnalysis={cachedAnalysis}
                      isPlaying={isPlaying}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-gray-500 text-center py-4">
            No analysis data available for this stem yet. Press play to begin analysis.
          </div>
        )}
      </div>
    </div>
  );
}
</file>

<file path="apps/web/src/app/workers/audio-analysis.worker.ts">
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
    const currentSpectrum = features?.amplitudeSpectrum as any;
    let flux = 0;
    if (previousSpectrum && currentSpectrum && Array.isArray(previousSpectrum) && ArrayBuffer.isView(currentSpectrum)) {
      const prevArr = previousSpectrum;
      const currArr = Array.from(currentSpectrum as unknown as number[]);
      const len = Math.min(prevArr.length, currArr.length);
      for (let i = 0; i < len; i++) {
        const diff = (currArr[i] || 0) - (prevArr[i] || 0);
        if (diff > 0) flux += diff;
      }
      previousSpectrum = currArr;
    } else {
      previousSpectrum = currentSpectrum ? Array.from(currentSpectrum as unknown as number[]) : null;
    }
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
): { time: number; intensity: number; type: string }[] {

  const params = Object.assign({
    onsetThreshold: 0.1,
    peakWindow: 8,
    peakMultiplier: 1.5,
    classification: {
      // Adjusted thresholds for better classification
      // Using RMS instead of energy (RMS is normalized 0-1)
      highEnergyThreshold: 0.05, // RMS threshold (0-1 range)
      highZcrThreshold: 0.1, // ZCR threshold for hat detection
      snareSharpnessThreshold: 0.4, // Perceptual sharpness threshold for snare
      kickCentroidMax: 800, // Maximum spectral centroid for kick (Hz)
      hatCentroidMin: 5000, // Minimum spectral centroid for hat (Hz)
      snareCentroidMin: 1500, // Minimum spectral centroid for snare (Hz)
      snareCentroidMax: 7000, // Maximum spectral centroid for snare (Hz)
    }
  }, analysisParams || {});

  const { frameTimes, spectralFlux, spectralCentroid, perceptualSharpness, zcr, energy } = fullAnalysis;

  if (!spectralFlux || !Array.isArray(spectralFlux) || spectralFlux.length === 0) {
    return [];
  }

  const finiteFlux = (spectralFlux as number[]).filter(isFinite);
  if (finiteFlux.length === 0) return [];
  
  const maxFlux = Math.max(1e-6, ...finiteFlux);
  const normFlux = (spectralFlux as number[]).map(v => isFinite(v) ? v / maxFlux : 0);

  const peaks: { frameIndex: number; time: number; intensity: number }[] = [];
  const w = Math.max(1, params.peakWindow | 0);
  for (let i = 0; i < normFlux.length; i++) {
    const start = Math.max(0, i - w);
    const end = Math.min(normFlux.length, i + w + 1);
    const localSlice = normFlux.slice(start, end);
    const mean = localSlice.reduce((a, b) => a + b, 0) / localSlice.length;
    
    const isLocalMax = normFlux[i] >= Math.max(...localSlice);

    if (isLocalMax && normFlux[i] > (mean + params.onsetThreshold)) {
      const frameTimesArray = Array.isArray(frameTimes) ? frameTimes : [];
      peaks.push({ frameIndex: i, time: frameTimesArray[i] ?? i * (512 / sampleRate), intensity: normFlux[i] });
    }
  }

  const transients: { time: number; intensity: number; type: string }[] = [];
  const c = params.classification;
  const attackSnippetSize = 2048; // Extract 2048 samples for classification
  const attackOffsetSamples = 256; // Start 256 samples after onset to capture attack (≈5.8ms at 44.1kHz)
  
  for (const peak of peaks) {
    let type = 'generic';
    
    // Conditional classification: drums get refined classification, others are generic
    if (stemType === 'drums') {
      // Calculate sample position for the peak
      const peakSamplePosition = Math.floor(peak.time * sampleRate);
      
      // Extract snippet starting slightly after the onset to capture the attack
      const snippetStart = Math.min(
        Math.max(0, peakSamplePosition + attackOffsetSamples),
        channelData.length - attackSnippetSize
      );
      
      // Ensure we have enough samples for the snippet
      if (snippetStart >= 0 && snippetStart + attackSnippetSize <= channelData.length) {
        // Extract the attack snippet
        const attackSnippet = channelData.slice(snippetStart, snippetStart + attackSnippetSize);
        
        // Run Meyda extraction on the attack snippet with specific features
        try {
          const attackFeatures = (Meyda as any).extract(
            ['spectralCentroid', 'perceptualSharpness', 'zcr', 'rms', 'energy'],
            attackSnippet,
            {
              sampleRate: sampleRate,
              bufferSize: attackSnippetSize,
              windowingFunction: 'hanning'
            }
          );
          
          if (attackFeatures) {
            // Extract features from the attack snippet
            // Use RMS instead of energy for classification (RMS is already normalized 0-1)
            const attackRms = attackFeatures.rms ?? 0;
            const attackCentroid = attackFeatures.spectralCentroid ?? 0;
            const attackSharpness = attackFeatures.perceptualSharpness ?? 0;
            const attackZcr = attackFeatures.zcr ?? 0;
            
            // Apply refined classification heuristic using attack-phase features
            // Order matters: check most specific first, then more general
            // Snare: sharp + mid-range centroid (most specific)
            if (attackSharpness > c.snareSharpnessThreshold && attackCentroid >= c.snareCentroidMin && attackCentroid <= c.snareCentroidMax) {
              type = 'snare';
            } 
            // Hat: high centroid + high ZCR (very specific)
            else if (attackCentroid > c.hatCentroidMin && attackZcr > c.highZcrThreshold) {
              type = 'hat';
            } 
            // Kick: high RMS + low centroid (catch-all for low-frequency hits)
            else if (attackRms > c.highEnergyThreshold && attackCentroid < c.kickCentroidMax) {
              type = 'kick';
            }
            
            // Debug: log classification details for first few transients
            if (transients.length < 10) {
              console.log(`[worker] Transient ${transients.length + 1}: type=${type}, rms=${attackRms.toFixed(4)}, centroid=${attackCentroid.toFixed(0)}, sharpness=${attackSharpness.toFixed(4)}, zcr=${attackZcr.toFixed(4)}`);
            }
          } else {
            throw new Error('Attack features extraction returned null');
          }
        } catch (error) {
          // Fallback to frame-based classification if snippet extraction fails
          const i = peak.frameIndex;
          const energyArray = Array.isArray(energy) ? energy : [];
          const spectralCentroidArray = Array.isArray(spectralCentroid) ? spectralCentroid : [];
          const perceptualSharpnessArray = Array.isArray(perceptualSharpness) ? perceptualSharpness : [];
          const zcrArray = Array.isArray(zcr) ? zcr : [];
          
          const peakRms = (fullAnalysis.rms as number[] | undefined)?.[i] ?? 0;
          const peakCentroid = spectralCentroidArray[i] ?? 0;
          const peakSharpness = perceptualSharpnessArray[i] ?? 0;
          const peakZcr = zcrArray[i] ?? 0;
          
          // Check snare first (more specific), then hat, then kick (most common)
          if (peakSharpness > c.snareSharpnessThreshold && peakCentroid >= c.snareCentroidMin && peakCentroid <= c.snareCentroidMax) {
            type = 'snare';
          } else if (peakCentroid > c.hatCentroidMin && peakZcr > c.highZcrThreshold) {
            type = 'hat';
          } else if (peakRms > c.highEnergyThreshold && peakCentroid < c.kickCentroidMax) {
            type = 'kick';
          }
        }
      } else {
        // Fallback to frame-based classification if snippet bounds are invalid
        const i = peak.frameIndex;
        const energyArray = Array.isArray(energy) ? energy : [];
        const spectralCentroidArray = Array.isArray(spectralCentroid) ? spectralCentroid : [];
        const perceptualSharpnessArray = Array.isArray(perceptualSharpness) ? perceptualSharpness : [];
        const zcrArray = Array.isArray(zcr) ? zcr : [];
        
        const peakRms = (fullAnalysis.rms as number[] | undefined)?.[i] ?? 0;
        const peakCentroid = spectralCentroidArray[i] ?? 0;
        const peakSharpness = perceptualSharpnessArray[i] ?? 0;
        const peakZcr = zcrArray[i] ?? 0;
        
        // Check snare first (more specific), then hat, then kick (most common)
        if (peakSharpness > c.snareSharpnessThreshold && peakCentroid >= c.snareCentroidMin && peakCentroid <= c.snareCentroidMax) {
          type = 'snare';
        } else if (peakCentroid > c.hatCentroidMin && peakZcr > c.highZcrThreshold) {
          type = 'hat';
        } else if (peakRms > c.highEnergyThreshold && peakCentroid < c.kickCentroidMax) {
          type = 'kick';
        }
      }
    }
    
    transients.push({ time: peak.time, intensity: peak.intensity, type });
  }

  return transients;
}

self.onmessage = function (event: MessageEvent<WorkerMessage>) {
  const { type, data } = event.data as any;
  if (type === 'ANALYZE_BUFFER') {
    const { fileId, channelData, sampleRate, duration, stemType, enhancedAnalysis, analysisParams } = data;
    try {
      const analysis = performFullAnalysis(channelData, sampleRate, stemType, () => {});
      const waveformData = generateWaveformData(channelData, duration, 1024);
      
      // Run enhanced analysis for transients with dedicated attack snippet extraction
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
</file>

</files>
