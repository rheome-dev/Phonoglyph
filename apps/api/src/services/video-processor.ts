import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

// Configure FFmpeg paths
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
if (ffprobeStatic) {
  ffmpeg.setFfprobePath(ffprobeStatic);
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  videoCodec: string;
  audioCodec: string;
  bitrate: number;
  aspectRatio: string;
}

export class VideoProcessor {
  
  /**
   * Extract video metadata using FFprobe
   */
  static async extractVideoMetadata(buffer: Buffer, fileName: string): Promise<VideoMetadata> {
    const tempFilePath = path.join(os.tmpdir(), `temp_${Date.now()}_${fileName}`);
    
    try {
      // Write buffer to temporary file
      await writeFile(tempFilePath, buffer);
      
      // Use promisified ffprobe
      const metadata: any = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
          if (err) return reject(err);
          resolve(metadata);
        });
      });
      
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
      
      if (!videoStream) {
        throw new Error('No video stream found in file');
      }
      
      // Calculate frame rate
      const frameRate = this.parseFrameRate(videoStream.r_frame_rate || videoStream.avg_frame_rate);
      
      // Calculate aspect ratio
      const aspectRatio = videoStream.width && videoStream.height 
        ? this.calculateAspectRatio(videoStream.width, videoStream.height)
        : '16:9';
      
             return {
         duration: parseFloat(metadata.format.duration || '0') || 0,
         width: videoStream.width || 0,
         height: videoStream.height || 0,
         frameRate,
         videoCodec: videoStream.codec_name || '',
         audioCodec: audioStream?.codec_name || '',
         bitrate: parseInt(metadata.format.bit_rate || '0') || 0,
         aspectRatio
       };
      
    } finally {
      // Clean up temporary file
      try {
        await unlink(tempFilePath);
      } catch (error) {
        console.warn('Failed to clean up temporary file:', tempFilePath);
      }
    }
  }
  
  /**
   * Generate video thumbnail using FFmpeg
   */
  static async generateVideoThumbnail(
    buffer: Buffer, 
    fileName: string,
    timestampSec: number = 1
  ): Promise<Buffer> {
    const tempInputPath = path.join(os.tmpdir(), `input_${Date.now()}_${fileName}`);
    const tempOutputPath = path.join(os.tmpdir(), `thumb_${Date.now()}.jpg`);
    
    try {
      // Write input buffer to temporary file
      await writeFile(tempInputPath, buffer);
      
      // Generate thumbnail
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .screenshots({
            timestamps: [timestampSec.toString()],
            filename: path.basename(tempOutputPath),
            folder: path.dirname(tempOutputPath),
            size: '320x240'
          })
          .on('end', () => resolve())
          .on('error', reject);
      });
      
      // Read thumbnail buffer
      const thumbnailBuffer = await import('fs').then(fs => fs.promises.readFile(tempOutputPath));
      
      return thumbnailBuffer;
      
    } finally {
      // Clean up temporary files
      await Promise.allSettled([
        unlink(tempInputPath),
        unlink(tempOutputPath)
      ]);
    }
  }
  
  /**
   * Generate video preview (short clip)
   */
  static async generateVideoPreview(
    buffer: Buffer,
    fileName: string,
    duration: number = 10,
    startTime: number = 0
  ): Promise<Buffer> {
    const tempInputPath = path.join(os.tmpdir(), `input_${Date.now()}_${fileName}`);
    const tempOutputPath = path.join(os.tmpdir(), `preview_${Date.now()}.mp4`);
    
    try {
      // Write input buffer to temporary file
      await writeFile(tempInputPath, buffer);
      
      // Generate preview clip
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .output(tempOutputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .size('640x360') // Lower resolution for preview
          .seekInput(startTime)
          .duration(duration)
          .outputOptions([
            '-preset fast',
            '-crf 28', // Higher compression for smaller file
            '-movflags faststart' // Optimize for web streaming
          ])
          .on('end', () => resolve())
          .on('error', reject);
      });
      
      // Read preview buffer
      const previewBuffer = await import('fs').then(fs => fs.promises.readFile(tempOutputPath));
      
      return previewBuffer;
      
    } finally {
      // Clean up temporary files
      await Promise.allSettled([
        unlink(tempInputPath),
        unlink(tempOutputPath)
      ]);
    }
  }
  
  /**
   * Parse frame rate from FFmpeg format (e.g., "30/1" -> 30)
   */
  private static parseFrameRate(frameRate?: string): number {
    if (!frameRate) return 30;
    
    if (frameRate.includes('/')) {
      const parts = frameRate.split('/').map(Number);
      const num = parts[0];
      const den = parts[1];
      
      if (num !== undefined && den !== undefined && den !== 0) {
        return num / den;
      }
      return num || 30;
    }
    
    return parseFloat(frameRate) || 30;
  }
  
  /**
   * Calculate aspect ratio string (e.g., "16:9")
   */
  private static calculateAspectRatio(width: number, height: number): string {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const ratio = gcd(width, height);
    return `${width / ratio}:${height / ratio}`;
  }
  
  /**
   * Validate if buffer contains valid video data
   */
  static async validateVideoBuffer(buffer: Buffer): Promise<boolean> {
    try {
      const tempFilePath = path.join(os.tmpdir(), `validate_${Date.now()}.tmp`);
      
      await writeFile(tempFilePath, buffer);
      
      const isValid = await new Promise<boolean>((resolve) => {
        ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
          if (err) return resolve(false);
          
          const hasVideoStream = metadata.streams.some(s => s.codec_type === 'video');
          resolve(hasVideoStream);
        });
      });
      
      await unlink(tempFilePath);
      return isValid;
      
    } catch (error) {
      return false;
    }
  }
}