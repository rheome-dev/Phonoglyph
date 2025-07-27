import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { fileTypeFromBuffer } from 'file-type';
import { createHash, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ValidationResult,
  ScanResult,
  SecurityIssue,
  validateFileContentSecurity,
  FileType
} from '../lib/file-validation';
import { MalwareScanner } from '../lib/malware-scanner';
import { SECURITY_CONFIG } from '../lib/security-config';

// Security interfaces
export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  timestamp?: number; // For video thumbnails
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format: string;
  codec?: string;
  bitrate?: number;
  frameRate?: number;
  colorProfile?: string;
  hasAlpha?: boolean;
  orientation?: number;
  fileSize: number;
  checksum: string;
}

export interface ProcessingResult {
  metadata: MediaMetadata;
  thumbnail: Buffer;
  thumbnailKey: string;
  securityReport: {
    validationResult: ValidationResult;
    scanResult: ScanResult;
    processingTime: number;
  };
}

export class SecureMediaProcessor {
  private static readonly TEMP_DIR = join(tmpdir(), 'phonoglyph-secure');
  private static readonly MAX_PROCESSING_TIME = 30000; // 30 seconds
  private static readonly MAX_MEMORY_USAGE = 512 * 1024 * 1024; // 512MB
  
  /**
   * Initialize secure processing environment
   */
  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize secure processing directory:', error);
      throw new Error('Failed to initialize secure media processor');
    }
  }

  /**
   * Validate file content with comprehensive security checks
   */
  static async validateFileContent(buffer: Buffer, expectedType: FileType): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Use enhanced security validation
      const result = await validateFileContentSecurity(buffer, expectedType);
      
      // Additional file-type library validation for cross-verification
      const detectedFileType = await fileTypeFromBuffer(buffer);
      if (detectedFileType) {
        result.actualMimeType = detectedFileType.mime;
        
        // Cross-check with our detection
        if (result.detectedType !== 'unknown' && !detectedFileType.mime.includes(result.detectedType)) {
          result.securityIssues.push({
            type: 'suspicious_header',
            severity: 'medium',
            description: 'File type detection mismatch between validation methods',
            details: { 
              ourDetection: result.detectedType, 
              libraryDetection: detectedFileType.mime 
            }
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('File content validation failed:', error);
      return {
        isValid: false,
        detectedType: 'unknown',
        securityIssues: [{
          type: 'invalid_structure',
          severity: 'high',
          description: 'File validation failed due to corrupted or malicious structure',
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        }],
        confidence: 0,
        fileSize: buffer.length
      };
    }
  }

  /**
   * Scan for malware using configured provider
   */
  static async scanForMalware(buffer: Buffer): Promise<ScanResult> {
    if (!SECURITY_CONFIG.malwareScanning.enabled) {
      return {
        isClean: true,
        threats: [],
        scanTime: 0
      };
    }

    switch (SECURITY_CONFIG.malwareScanning.provider) {
      case 'custom':
        console.info('Using custom malware scanner');
        return await MalwareScanner.scanBuffer(buffer);

      case 'virustotal':
        // TODO: Implement VirusTotal integration
        console.info('VirusTotal scanning not yet implemented - using third-party WAF');
        return {
          isClean: true,
          threats: [],
          scanTime: 0
        };

      case 'cloudflare':
        // Cloudflare WAF Content Scanning handles this at the edge
        // Note: Requires enterprise Cloudflare account
        console.info('Using Cloudflare WAF Content Scanning');
        return {
          isClean: true,
          threats: [],
          scanTime: 0
        };

      case 'disabled':
      default:
        console.info('Malware scanning disabled - relying on file validation and user trust for MVP');
        return {
          isClean: true,
          threats: [],
          scanTime: 0
        };
    }
  }

  /**
   * Generate secure thumbnail with resource limits
   */
  static async generateSecureThumbnail(
    buffer: Buffer, 
    fileType: FileType,
    options: ThumbnailOptions = {}
  ): Promise<Buffer> {
    const { width = 300, height = 300, quality = 80, timestamp = 1 } = options;
    
    // Create secure temporary file
    const tempId = randomBytes(16).toString('hex');
    const tempInputPath = join(this.TEMP_DIR, `input_${tempId}`);
    const tempOutputPath = join(this.TEMP_DIR, `output_${tempId}.jpg`);
    
    try {
      // Write buffer to temporary file
      await fs.writeFile(tempInputPath, buffer);
      
      let thumbnailBuffer: Buffer;
      
      if (fileType === 'image') {
        // Use Sharp for image processing with security constraints
        thumbnailBuffer = await sharp(tempInputPath)
          .resize(width, height, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .jpeg({ quality, mozjpeg: true })
          .timeout({ seconds: 10 })
          .toBuffer();
          
      } else if (fileType === 'video') {
        // Use FFmpeg for video thumbnail with security constraints
        thumbnailBuffer = await this.generateVideoThumbnailSecure(
          tempInputPath, 
          tempOutputPath, 
          { width, height, timestamp }
        );
      } else {
        throw new Error(`Thumbnail generation not supported for file type: ${fileType}`);
      }
      
      return thumbnailBuffer;
      
    } finally {
      // Always clean up temporary files
      await this.cleanupTempFiles([tempInputPath, tempOutputPath]);
    }
  }

  /**
   * Generate video thumbnail using FFmpeg with security constraints
   */
  private static async generateVideoThumbnailSecure(
    inputPath: string,
    outputPath: string,
    options: { width: number; height: number; timestamp: number }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video thumbnail generation timed out'));
      }, this.MAX_PROCESSING_TIME);
      
      ffmpeg(inputPath)
        .seekInput(options.timestamp)
        .frames(1)
        .size(`${options.width}x${options.height}`)
        .output(outputPath)
        .on('end', async () => {
          clearTimeout(timeout);
          try {
            const thumbnailBuffer = await fs.readFile(outputPath);
            resolve(thumbnailBuffer);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Extract metadata safely with resource limits
   */
  static async extractMetadataSafely(buffer: Buffer, fileType: FileType): Promise<MediaMetadata> {
    const checksum = createHash('sha256').update(buffer).digest('hex');
    const tempId = randomBytes(16).toString('hex');
    const tempPath = join(this.TEMP_DIR, `metadata_${tempId}`);
    
    try {
      await fs.writeFile(tempPath, buffer);
      
      if (fileType === 'image') {
        return await this.extractImageMetadataSecure(tempPath, buffer.length, checksum);
      } else if (fileType === 'video') {
        return await this.extractVideoMetadataSecure(tempPath, buffer.length, checksum);
      } else {
        // Basic metadata for other file types
        return {
          format: fileType,
          fileSize: buffer.length,
          checksum
        };
      }
      
    } finally {
      await this.cleanupTempFiles([tempPath]);
    }
  }

  /**
   * Extract image metadata using Sharp with security constraints
   */
  private static async extractImageMetadataSecure(
    filePath: string, 
    fileSize: number, 
    checksum: string
  ): Promise<MediaMetadata> {
    const metadata = await sharp(filePath).metadata();
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format || 'unknown',
      colorProfile: metadata.space,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      fileSize,
      checksum
    };
  }

  /**
   * Extract video metadata using FFprobe with security constraints
   */
  private static async extractVideoMetadataSecure(
    filePath: string, 
    fileSize: number, 
    checksum: string
  ): Promise<MediaMetadata> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video metadata extraction timed out'));
      }, this.MAX_PROCESSING_TIME);
      
      ffmpeg.ffprobe(filePath, (error, metadata) => {
        clearTimeout(timeout);
        
        if (error) {
          reject(error);
          return;
        }
        
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        
        resolve({
          width: videoStream?.width,
          height: videoStream?.height,
          duration: metadata.format.duration,
          format: metadata.format.format_name || 'unknown',
          codec: videoStream?.codec_name,
          bitrate: typeof metadata.format.bit_rate === 'number'
            ? metadata.format.bit_rate
            : parseInt(metadata.format.bit_rate || '0'),
          frameRate: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : undefined,
          fileSize,
          checksum
        });
      });
    });
  }

  /**
   * Sanitize filename to prevent path traversal and injection attacks
   */
  static sanitizeFileName(filename: string): string {
    // Remove path separators and dangerous characters
    const sanitized = filename
      .replace(/[\/\\:*?"<>|]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/^\.+/, '')
      .substring(0, 255);
    
    // Ensure filename is not empty and doesn't start with special characters
    return sanitized || `file_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Clean up temporary files securely
   */
  private static async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Log but don't throw - cleanup is best effort
        console.warn(`Failed to cleanup temp file ${filePath}:`, error);
      }
    }
  }
}
