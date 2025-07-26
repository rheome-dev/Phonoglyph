import { VideoMetadata, ImageMetadata, FileType } from '../lib/file-validation'
import { SecureMediaProcessor, ProcessingResult } from './SecureMediaProcessor'

export class MediaProcessor {
  
  /**
   * Extract video metadata from buffer using secure processing
   */
  static async extractVideoMetadata(buffer: Buffer, fileName: string): Promise<VideoMetadata> {
    // Use secure media processor for metadata extraction
    const metadata = await SecureMediaProcessor.extractMetadataSafely(buffer, 'video');

    // Convert to VideoMetadata format
    return {
      duration: metadata.duration || 0,
      width: metadata.width || 0,
      height: metadata.height || 0,
      frameRate: metadata.frameRate || 0,
      codec: metadata.codec || 'unknown',
      bitrate: metadata.bitrate || 0,
      aspectRatio: metadata.width && metadata.height
        ? `${metadata.width}:${metadata.height}`
        : '16:9'
    };
  }
  
  /**
   * Generate video thumbnail from buffer using secure processing
   */
  static async generateVideoThumbnail(
    buffer: Buffer,
    fileName: string,
    timestampSec: number = 1
  ): Promise<Buffer> {
    // Use secure media processor for thumbnail generation
    return await SecureMediaProcessor.generateSecureThumbnail(
      buffer,
      'video',
      {
        width: 300,
        height: 300,
        timestamp: timestampSec
      }
    );
  }
  
  /**
   * Extract image metadata from buffer using secure processing
   */
  static async extractImageMetadata(buffer: Buffer, fileName: string): Promise<ImageMetadata> {
    // Use secure media processor for metadata extraction
    const metadata = await SecureMediaProcessor.extractMetadataSafely(buffer, 'image');

    // Convert to ImageMetadata format
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      colorProfile: metadata.colorProfile || 'sRGB',
      orientation: metadata.orientation || 1,
      hasAlpha: metadata.hasAlpha || false,
      fileFormat: metadata.format?.toUpperCase() || 'UNKNOWN'
    };
  }
  
  /**
   * Generate image thumbnail using secure processing
   */
  static async generateImageThumbnail(
    buffer: Buffer,
    fileName: string,
    maxWidth: number = 300,
    maxHeight: number = 300
  ): Promise<Buffer> {
    // Use secure media processor for thumbnail generation
    return await SecureMediaProcessor.generateSecureThumbnail(
      buffer,
      'image',
      {
        width: maxWidth,
        height: maxHeight
      }
    );
  }
  
  /**
   * Process uploaded file with comprehensive security validation
   * This runs with full security checks and safe processing
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
    securityReport?: any;
  }> {
    try {
      // Initialize secure processor
      await SecureMediaProcessor.initialize();

      // Validate file content security first
      const validationResult = await SecureMediaProcessor.validateFileContent(buffer, fileType as FileType);
      if (!validationResult.isValid) {
        throw new Error(`File security validation failed: ${validationResult.securityIssues.map(i => i.description).join(', ')}`);
      }

      // Scan for malware
      const scanResult = await SecureMediaProcessor.scanForMalware(buffer);
      if (!scanResult.isClean) {
        throw new Error(`File contains security threats: ${scanResult.threats.map(t => t.name).join(', ')}`);
      }

      // Sanitize filename
      const sanitizedFileName = SecureMediaProcessor.sanitizeFileName(fileName);

      let metadata: VideoMetadata | ImageMetadata;
      let thumbnail: Buffer;

      if (fileType === 'video') {
        metadata = await this.extractVideoMetadata(buffer, sanitizedFileName);
        thumbnail = await this.generateVideoThumbnail(buffer, sanitizedFileName);
      } else {
        metadata = await this.extractImageMetadata(buffer, sanitizedFileName);
        thumbnail = await this.generateImageThumbnail(buffer, sanitizedFileName);
      }

      // Generate secure thumbnail key
      const thumbnailKey = `thumbnails/${fileId}_thumb.jpg`;

      return {
        metadata,
        thumbnail,
        thumbnailKey,
        securityReport: {
          validationResult,
          scanResult,
          sanitizedFileName
        }
      };

    } catch (error) {
      console.error('Error processing media file:', error);
      throw error;
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