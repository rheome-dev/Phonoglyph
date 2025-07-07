/// <reference types="node" />
/// <reference types="node" />
import { VideoMetadata, ImageMetadata } from '../lib/file-validation';
export declare class MediaProcessor {
    /**
     * Extract video metadata from buffer
     * For now, this is a placeholder implementation - in production would use ffprobe
     */
    static extractVideoMetadata(buffer: Buffer, fileName: string): Promise<VideoMetadata>;
    /**
     * Generate video thumbnail from buffer
     * For now, this is a placeholder - in production would use ffmpeg
     */
    static generateVideoThumbnail(buffer: Buffer, fileName: string, timestampSec?: number): Promise<Buffer>;
    /**
     * Extract image metadata from buffer
     * For now, this is a placeholder - in production would use sharp
     */
    static extractImageMetadata(buffer: Buffer, fileName: string): Promise<ImageMetadata>;
    /**
     * Generate image thumbnail
     * For now, this is a placeholder - in production would use sharp
     */
    static generateImageThumbnail(buffer: Buffer, fileName: string, maxWidth?: number, maxHeight?: number): Promise<Buffer>;
    /**
     * Process uploaded file - extract metadata and generate thumbnails
     * This would run in background after file upload
     */
    static processUploadedFile(buffer: Buffer, fileName: string, fileType: 'video' | 'image', fileId: string): Promise<{
        metadata: VideoMetadata | ImageMetadata;
        thumbnail: Buffer;
        thumbnailKey: string;
    }>;
    /**
     * Generate R2 storage key for thumbnails
     */
    static generateThumbnailKey(originalKey: string): string;
    /**
     * Check if file type requires processing
     */
    static requiresProcessing(fileType: string): boolean;
}
//# sourceMappingURL=media-processor.d.ts.map