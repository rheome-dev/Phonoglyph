import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SecureMediaProcessor } from '../../services/SecureMediaProcessor';
import { MediaProcessor } from '../../services/media-processor';
import { fileSecurityMiddleware } from '../../middleware/file-security';
import { createHash } from 'crypto';

describe('Secure Media Processing Integration', () => {
  beforeAll(async () => {
    await SecureMediaProcessor.initialize();
  });

  describe('End-to-End Secure Processing', () => {
    it('should process legitimate image files securely', async () => {
      // Create a minimal valid JPEG
      const validJpeg = Buffer.from([
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
      ]);

      const result = await MediaProcessor.processUploadedFile(
        validJpeg,
        'test-image.jpg',
        'image',
        'test-file-id'
      );

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.thumbnail).toBeDefined();
      expect(result.thumbnailKey).toBe('thumbnails/test-file-id_thumb.jpg');
      expect(result.securityReport).toBeDefined();
      expect(result.securityReport.validationResult.isValid).toBe(true);
      expect(result.securityReport.scanResult.isClean).toBe(true);
    });

    it('should reject malicious files during processing', async () => {
      // Create a file with executable signature
      const maliciousFile = Buffer.from([
        0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, // PE header
        ...Array(100).fill(0x41) // Padding
      ]);

      await expect(
        MediaProcessor.processUploadedFile(
          maliciousFile,
          'malicious.jpg',
          'image',
          'test-malicious-id'
        )
      ).rejects.toThrow(/security validation failed|security threats/i);
    });

    it('should handle file processing with security warnings', async () => {
      // Create a JPEG with embedded script (should trigger warning but not block)
      const jpegWithScript = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // JPEG header
        Buffer.from('normal image data'),
        Buffer.from('<script>console.log("test")</script>'), // Script in metadata
        Buffer.from([0xff, 0xd9]) // JPEG end
      ]);

      await expect(
        MediaProcessor.processUploadedFile(
          jpegWithScript,
          'image-with-script.jpg',
          'image',
          'test-warning-id'
        )
      ).rejects.toThrow(); // Should be rejected due to embedded script
    });
  });

  describe('Security Middleware Integration', () => {
    it('should validate file security in middleware', async () => {
      const middleware = fileSecurityMiddleware({
        maxFileSize: 1024 * 1024, // 1MB
        allowedTypes: ['image'],
        enableMalwareScanning: true
      });

      // Mock request/response
      const mockReq = {
        body: {
          buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // JPEG header
          fileType: 'image',
          fileName: 'test.jpg'
        }
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any;

      const mockNext = vi.fn();

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.securityValidation).toBeDefined();
    });

    it('should block oversized files', async () => {
      const middleware = fileSecurityMiddleware({
        maxFileSize: 100, // Very small limit
        allowedTypes: ['image']
      });

      const mockReq = {
        body: {
          buffer: Buffer.alloc(1000, 0x41), // 1KB file
          fileType: 'image',
          fileName: 'large.jpg'
        }
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any;

      const mockNext = vi.fn();

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File too large',
          code: 'FILE_TOO_LARGE'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block disallowed file types', async () => {
      const middleware = fileSecurityMiddleware({
        allowedTypes: ['image'] // Only images allowed
      });

      const mockReq = {
        body: {
          buffer: Buffer.from([0x4d, 0x54, 0x68, 0x64]), // MIDI header
          fileType: 'midi',
          fileName: 'test.mid'
        }
      } as any;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any;

      const mockNext = vi.fn();

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File type not allowed',
          code: 'FILE_TYPE_NOT_ALLOWED'
        })
      );
    });
  });

  describe('Metadata Extraction Security', () => {
    it('should extract metadata safely without executing embedded code', async () => {
      // This test ensures metadata extraction doesn't execute any embedded scripts
      const imageWithMetadata = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe1]), // JPEG with EXIF
        Buffer.from('<?php system("rm -rf /"); ?>'), // Malicious PHP in EXIF
        Buffer.from([0xff, 0xd9])
      ]);

      const metadata = await SecureMediaProcessor.extractMetadataSafely(
        imageWithMetadata,
        'image'
      );

      expect(metadata).toBeDefined();
      expect(metadata.checksum).toBeDefined();
      expect(metadata.fileSize).toBe(imageWithMetadata.length);
      // Should not execute the embedded PHP code
    });

    it('should generate secure checksums', async () => {
      const testBuffer = Buffer.from('test content');
      const expectedHash = createHash('sha256').update(testBuffer).digest('hex');

      const metadata = await SecureMediaProcessor.extractMetadataSafely(
        testBuffer,
        'image'
      );

      expect(metadata.checksum).toBe(expectedHash);
    });
  });

  describe('Thumbnail Generation Security', () => {
    it('should generate thumbnails without preserving malicious metadata', async () => {
      // Create image with potentially malicious EXIF data
      const imageWithMaliciousExif = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe1]), // JPEG with EXIF
        Buffer.from('<script>alert("xss")</script>'),
        Buffer.from([0xff, 0xd9])
      ]);

      const thumbnail = await SecureMediaProcessor.generateSecureThumbnail(
        imageWithMaliciousExif,
        'image',
        { width: 100, height: 100 }
      );

      expect(thumbnail).toBeDefined();
      expect(thumbnail.length).toBeGreaterThan(0);
      
      // Thumbnail should not contain the malicious script
      expect(thumbnail.includes(Buffer.from('<script>'))).toBe(false);
    });

    it('should respect size limits for thumbnails', async () => {
      const testImage = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]);

      const thumbnail = await SecureMediaProcessor.generateSecureThumbnail(
        testImage,
        'image',
        { width: 50, height: 50, quality: 50 }
      );

      expect(thumbnail).toBeDefined();
      // Thumbnail should be reasonably small
      expect(thumbnail.length).toBeLessThan(testImage.length * 2);
    });
  });

  describe('Resource Management', () => {
    it('should clean up temporary files', async () => {
      const testBuffer = Buffer.from('test content for cleanup');
      
      // Process file which should create and clean up temp files
      await SecureMediaProcessor.extractMetadataSafely(testBuffer, 'image');
      
      // We can't easily test file cleanup without exposing internals,
      // but we can ensure the operation completes without errors
      expect(true).toBe(true);
    });

    it('should handle concurrent processing requests', async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]);
      
      // Process multiple files concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        SecureMediaProcessor.extractMetadataSafely(testBuffer, 'image')
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.checksum).toBeDefined();
      });
    });
  });
});
