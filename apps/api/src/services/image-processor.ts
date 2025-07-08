import sharp from 'sharp';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  colorSpace: string;
  hasAlpha: boolean;
  size: number;
  density?: number;
  orientation?: number;
}

export class ImageProcessor {
  
  /**
   * Extract image metadata using Sharp
   */
  static async extractImageMetadata(buffer: Buffer, fileName: string): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        colorSpace: metadata.space || 'unknown',
        hasAlpha: metadata.hasAlpha || false,
        size: buffer.length,
        density: metadata.density,
        orientation: metadata.orientation
      };
      
    } catch (error) {
      console.error('Error extracting image metadata:', error);
      throw new Error(`Failed to extract image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const thumbnailBuffer = await sharp(buffer)
        .resize(maxWidth, maxHeight, { 
          fit: 'inside',
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({ 
          quality: 85,
          progressive: true
        })
        .toBuffer();
        
      return thumbnailBuffer;
      
    } catch (error) {
      console.error('Error generating image thumbnail:', error);
      throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Optimize image for web delivery
   */
  static async optimizeImageForWeb(
    buffer: Buffer,
    fileName: string,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 85
  ): Promise<{ buffer: Buffer; format: string }> {
    try {
      const metadata = await sharp(buffer).metadata();
      const originalFormat = metadata.format;
      
      // Choose optimal format
      const outputFormat = this.getOptimalWebFormat(originalFormat, metadata.hasAlpha);
      
      let sharpInstance = sharp(buffer);
      
      // Resize if necessary
      if (metadata.width && metadata.height && 
          (metadata.width > maxWidth || metadata.height > maxHeight)) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // Apply format-specific optimizations
      let optimizedBuffer: Buffer;
      
      switch (outputFormat) {
        case 'webp':
          optimizedBuffer = await sharpInstance
            .webp({ quality, effort: 4 })
            .toBuffer();
          break;
        case 'png':
          optimizedBuffer = await sharpInstance
            .png({ 
              compressionLevel: 9,
              quality,
              effort: 8
            })
            .toBuffer();
          break;
        case 'jpeg':
        default:
          optimizedBuffer = await sharpInstance
            .jpeg({ 
              quality,
              progressive: true,
              mozjpeg: true
            })
            .toBuffer();
          break;
      }
      
      return {
        buffer: optimizedBuffer,
        format: outputFormat
      };
      
    } catch (error) {
      console.error('Error optimizing image:', error);
      throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate multiple image sizes (responsive images)
   */
  static async generateResponsiveImages(
    buffer: Buffer,
    fileName: string,
    sizes: Array<{ width: number; height?: number; suffix: string }>
  ): Promise<Array<{ buffer: Buffer; size: string; width: number; height: number }>> {
    try {
      const results = await Promise.all(
        sizes.map(async (size) => {
          const resizedBuffer = await sharp(buffer)
            .resize(size.width, size.height, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 85, progressive: true })
            .toBuffer();
            
          const metadata = await sharp(resizedBuffer).metadata();
          
          return {
            buffer: resizedBuffer,
            size: size.suffix,
            width: metadata.width || size.width,
            height: metadata.height || size.height || Math.round(size.width * 0.75)
          };
        })
      );
      
      return results;
      
    } catch (error) {
      console.error('Error generating responsive images:', error);
      throw new Error(`Failed to generate responsive images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Convert image format
   */
  static async convertImageFormat(
    buffer: Buffer,
    targetFormat: 'jpeg' | 'png' | 'webp' | 'avif',
    quality: number = 85
  ): Promise<Buffer> {
    try {
      let sharpInstance = sharp(buffer);
      
      switch (targetFormat) {
        case 'jpeg':
          return await sharpInstance.jpeg({ quality, progressive: true }).toBuffer();
        case 'png':
          return await sharpInstance.png({ quality, compressionLevel: 9 }).toBuffer();
        case 'webp':
          return await sharpInstance.webp({ quality, effort: 4 }).toBuffer();
        case 'avif':
          return await sharpInstance.avif({ quality, effort: 4 }).toBuffer();
        default:
          throw new Error(`Unsupported target format: ${targetFormat}`);
      }
      
    } catch (error) {
      console.error('Error converting image format:', error);
      throw new Error(`Failed to convert image format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Validate if buffer contains valid image data
   */
  static async validateImageBuffer(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!(metadata.width && metadata.height && metadata.format);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get optimal web format based on original format and alpha channel
   */
  private static getOptimalWebFormat(
    originalFormat?: string, 
    hasAlpha?: boolean
  ): 'jpeg' | 'png' | 'webp' {
    // If image has alpha channel, prefer PNG or WebP
    if (hasAlpha) {
      return 'webp'; // WebP supports alpha and has better compression
    }
    
    // For photos and complex images, prefer JPEG
    if (originalFormat === 'jpeg' || originalFormat === 'jpg') {
      return 'jpeg';
    }
    
    // For simple graphics, logos, etc., prefer PNG
    if (originalFormat === 'png' || originalFormat === 'gif') {
      return 'png';
    }
    
    // Default to JPEG for unknown formats
    return 'jpeg';
  }
  
  /**
   * Extract color palette from image
   */
  static async extractColorPalette(
    buffer: Buffer,
    numColors: number = 8
  ): Promise<Array<{ r: number; g: number; b: number; count: number }>> {
    try {
      // Resize to small size for faster processing
      const smallBuffer = await sharp(buffer)
        .resize(100, 100, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });
        
      const { data, info } = smallBuffer;
      const { width, height, channels } = info;
      
      // Simple color quantization (this could be enhanced with a proper algorithm)
      const colorCounts = new Map<string, { r: number; g: number; b: number; count: number }>();
      
      for (let i = 0; i < data.length; i += channels) {
        const r = Math.floor((data[i] || 0) / 32) * 32; // Quantize to reduce colors
        const g = Math.floor((data[i + 1] || 0) / 32) * 32;
        const b = Math.floor((data[i + 2] || 0) / 32) * 32;
        
        const key = `${r},${g},${b}`;
        const existing = colorCounts.get(key);
        
        if (existing) {
          existing.count++;
        } else {
          colorCounts.set(key, { r, g, b, count: 1 });
        }
      }
      
      // Sort by count and return top colors
      return Array.from(colorCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, numColors);
        
    } catch (error) {
      console.error('Error extracting color palette:', error);
      return [];
    }
  }
}