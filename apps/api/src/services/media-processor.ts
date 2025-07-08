import { VideoMetadata, ImageMetadata } from '../lib/file-validation'
import { VideoProcessor } from './video-processor'
import { ImageProcessor } from './image-processor'

export class MediaProcessor {
  
  /**
   * Extract video metadata from buffer using FFprobe
   */
  static async extractVideoMetadata(buffer: Buffer, fileName: string): Promise<VideoMetadata> {
    try {
      const metadata = await VideoProcessor.extractVideoMetadata(buffer, fileName);
      
      // Transform to match expected interface
      return {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        frameRate: metadata.frameRate,
        codec: metadata.videoCodec, // Use videoCodec as primary codec
        bitrate: metadata.bitrate,
        aspectRatio: metadata.aspectRatio
      };
    } catch (error) {
      console.error('Error extracting video metadata:', error);
      throw error;
    }
  }
  
  /**
   * Generate video thumbnail from buffer using FFmpeg
   */
  static async generateVideoThumbnail(
    buffer: Buffer, 
    fileName: string,
    timestampSec: number = 1
  ): Promise<Buffer> {
    try {
      return await VideoProcessor.generateVideoThumbnail(buffer, fileName, timestampSec);
    } catch (error) {
      console.error('Error generating video thumbnail:', error);
      throw error;
    }
  }
  
  /**
   * Extract image metadata from buffer using Sharp
   */
  static async extractImageMetadata(buffer: Buffer, fileName: string): Promise<ImageMetadata> {
    try {
      const metadata = await ImageProcessor.extractImageMetadata(buffer, fileName);
      
      // Transform to match expected interface
      return {
        width: metadata.width,
        height: metadata.height,
        colorProfile: metadata.colorSpace,
        orientation: metadata.orientation || 1,
        hasAlpha: metadata.hasAlpha,
        fileFormat: metadata.format.toUpperCase()
      };
    } catch (error) {
      console.error('Error extracting image metadata:', error);
      throw error;
    }
  }
  
  /**
   * Generate image thumbnail using Sharp
   */
  static async generateImageThumbnail(
    buffer: Buffer,
    fileName: string,
    maxWidth: number = 320,
    maxHeight: number = 240
  ): Promise<Buffer> {
    try {
      return await ImageProcessor.generateImageThumbnail(buffer, fileName, maxWidth, maxHeight);
    } catch (error) {
      console.error('Error generating image thumbnail:', error);
      throw error;
    }
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
      console.error('Error processing media file:', error)
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