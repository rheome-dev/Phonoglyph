import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SecureMediaProcessor } from '../../services/SecureMediaProcessor';
import { MalwareScanner } from '../../lib/malware-scanner';
import { validateFileContentSecurity } from '../../lib/file-validation';

describe('File Security Tests', () => {
  beforeAll(async () => {
    await SecureMediaProcessor.initialize();
  });

  describe('Malicious File Detection', () => {
    it('should detect executable files', async () => {
      // PE executable signature
      const peExecutable = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      const result = await MalwareScanner.scanBuffer(peExecutable);
      
      expect(result.isClean).toBe(false);
      expect(result.threats).toHaveLength(1);
      expect(result.threats[0].name).toBe('PE Executable (Windows)');
      expect(result.threats[0].severity).toBe('critical');
    });

    it('should detect embedded JavaScript', async () => {
      const maliciousContent = Buffer.from('<script>eval("malicious code")</script>');
      const result = await MalwareScanner.scanBuffer(maliciousContent);
      
      expect(result.isClean).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
      
      const scriptThreat = result.threats.find(t => t.name === 'HTML Script Tag');
      const evalThreat = result.threats.find(t => t.name === 'JavaScript eval()');
      
      expect(scriptThreat).toBeDefined();
      expect(evalThreat).toBeDefined();
    });

    it('should detect PHP code injection', async () => {
      const phpCode = Buffer.from('<?php system($_GET["cmd"]); ?>');
      const result = await MalwareScanner.scanBuffer(phpCode);
      
      expect(result.isClean).toBe(false);
      const phpThreat = result.threats.find(t => t.name === 'PHP Code');
      expect(phpThreat).toBeDefined();
      expect(phpThreat?.severity).toBe('high');
    });

    it('should detect SQL injection patterns', async () => {
      const sqlInjection = Buffer.from('UNION SELECT password FROM users');
      const result = await MalwareScanner.scanBuffer(sqlInjection);
      
      expect(result.isClean).toBe(false);
      const sqlThreat = result.threats.find(t => t.name === 'SQL Union Select');
      expect(sqlThreat).toBeDefined();
    });

    it('should detect path traversal attempts', async () => {
      const pathTraversal = Buffer.from('../../etc/passwd');
      const result = await MalwareScanner.scanBuffer(pathTraversal);
      
      expect(result.isClean).toBe(false);
      const traversalThreat = result.threats.find(t => t.name === 'Path Traversal');
      expect(traversalThreat).toBeDefined();
    });
  });

  describe('File Content Validation', () => {
    it('should validate legitimate JPEG files', async () => {
      // Valid JPEG header
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
        0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00
      ]);
      
      const result = await validateFileContentSecurity(jpegHeader, 'image');
      
      expect(result.isValid).toBe(true);
      expect(result.detectedType).toBe('jpeg');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should reject files with mismatched headers', async () => {
      // PNG header but claiming to be JPEG
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
      ]);
      
      const result = await validateFileContentSecurity(pngHeader, 'image');
      
      expect(result.detectedType).toBe('png');
      const mismatchIssue = result.securityIssues.find(
        issue => issue.type === 'suspicious_header'
      );
      expect(mismatchIssue).toBeDefined();
    });

    it('should detect JPEG with embedded scripts', async () => {
      // JPEG with script tag in EXIF data
      const maliciousJpeg = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // JPEG header
        Buffer.from('<script>alert("xss")</script>'), // Malicious content
        Buffer.from([0xff, 0xd9]) // JPEG end
      ]);
      
      const result = await validateFileContentSecurity(maliciousJpeg, 'image');
      
      const scriptIssue = result.securityIssues.find(
        issue => issue.type === 'embedded_script'
      );
      expect(scriptIssue).toBeDefined();
      expect(scriptIssue?.severity).toBe('high');
    });

    it('should detect oversized metadata', async () => {
      // MP3 with suspiciously large ID3 tag
      const maliciousMP3 = Buffer.from([
        0x49, 0x44, 0x33, // ID3 header
        0x03, 0x00, 0x00, // Version
        0x7f, 0x7f, 0x7f, 0x7f // Large tag size (encoded)
      ]);
      
      const result = await validateFileContentSecurity(maliciousMP3, 'audio');
      
      const oversizedIssue = result.securityIssues.find(
        issue => issue.type === 'oversized_metadata'
      );
      expect(oversizedIssue).toBeDefined();
    });
  });

  describe('Secure Processing', () => {
    it('should sanitize malicious filenames', () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        'file<script>alert(1)</script>.jpg',
        'file|rm -rf /.jpg',
        'CON.jpg', // Windows reserved name
        '.htaccess'
      ];
      
      maliciousFilenames.forEach(filename => {
        const sanitized = SecureMediaProcessor.sanitizeFileName(filename);
        
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('|');
        expect(sanitized).not.toMatch(/^\.+/);
        expect(sanitized.length).toBeLessThanOrEqual(255);
      });
    });

    it('should handle processing timeouts', async () => {
      // This would test timeout handling in a real scenario
      // For now, we'll test that the timeout constants are reasonable
      expect(SecureMediaProcessor['MAX_PROCESSING_TIME']).toBe(30000);
      expect(SecureMediaProcessor['MAX_MEMORY_USAGE']).toBe(512 * 1024 * 1024);
    });
  });

  describe('Heuristic Analysis', () => {
    it('should detect high entropy content', async () => {
      // Generate high-entropy (random) data
      const highEntropyData = Buffer.from(
        Array.from({ length: 1000 }, () => Math.floor(Math.random() * 256))
      );
      
      const result = await MalwareScanner.scanBuffer(highEntropyData);
      
      const entropyThreat = result.threats.find(t => t.name === 'High Entropy Content');
      expect(entropyThreat).toBeDefined();
    });

    it('should detect suspiciously small files', async () => {
      const tinyFile = Buffer.from([0x42]); // 1 byte file
      
      const result = await MalwareScanner.scanBuffer(tinyFile);
      
      const sizeThreat = result.threats.find(t => t.name === 'Suspiciously Small File');
      expect(sizeThreat).toBeDefined();
    });

    it('should detect mixed binary/text content', async () => {
      // Create buffer with mixed null bytes and text
      const mixedContent = Buffer.concat([
        Buffer.from('normal text content'),
        Buffer.alloc(50, 0), // null bytes
        Buffer.from('more text'),
        Buffer.alloc(30, 0)
      ]);
      
      const result = await MalwareScanner.scanBuffer(mixedContent);
      
      const mixedThreat = result.threats.find(t => t.name === 'Mixed Binary/Text Content');
      expect(mixedThreat).toBeDefined();
    });
  });

  describe('Performance and Resource Limits', () => {
    it('should complete scans within reasonable time', async () => {
      const testFile = Buffer.alloc(1024 * 1024, 0x41); // 1MB of 'A's
      
      const startTime = Date.now();
      const result = await MalwareScanner.scanBuffer(testFile);
      const scanTime = Date.now() - startTime;
      
      expect(scanTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.scanTime).toBeLessThan(5000);
    });

    it('should handle large files efficiently', async () => {
      const largeFile = Buffer.alloc(10 * 1024 * 1024, 0x42); // 10MB file
      
      const startTime = Date.now();
      await expect(MalwareScanner.scanBuffer(largeFile)).resolves.toBeDefined();
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Error Handling', () => {
    it('should fail securely on corrupted input', async () => {
      // Test with various corrupted inputs
      const corruptedInputs = [
        Buffer.alloc(0), // Empty buffer
        null as any, // Null input
        undefined as any, // Undefined input
      ];
      
      for (const input of corruptedInputs) {
        if (input === null || input === undefined) {
          await expect(MalwareScanner.scanBuffer(input)).rejects.toThrow();
        } else {
          const result = await MalwareScanner.scanBuffer(input);
          // Should either succeed or fail securely (not crash)
          expect(typeof result.isClean).toBe('boolean');
        }
      }
    });
  });
});
