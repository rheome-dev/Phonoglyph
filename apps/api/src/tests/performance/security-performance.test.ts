import { describe, it, expect, beforeAll } from 'vitest';
import { SecureMediaProcessor } from '../../services/SecureMediaProcessor';
import { MalwareScanner } from '../../lib/malware-scanner';
import { validateFileContentSecurity } from '../../lib/file-validation';
import { FileQuarantineService } from '../../services/FileQuarantineService';
import { SecurityAuditService } from '../../services/SecurityAuditService';

describe('Security Performance Tests', () => {
  beforeAll(async () => {
    await SecureMediaProcessor.initialize();
    await FileQuarantineService.initialize();
  });

  describe('File Validation Performance', () => {
    it('should validate small files quickly', async () => {
      const smallFile = Buffer.alloc(1024, 0x41); // 1KB file
      
      const startTime = Date.now();
      const result = await validateFileContentSecurity(smallFile, 'image');
      const validationTime = Date.now() - startTime;
      
      expect(validationTime).toBeLessThan(100); // Should complete within 100ms
      expect(result).toBeDefined();
    });

    it('should validate medium files within acceptable time', async () => {
      const mediumFile = Buffer.alloc(1024 * 1024, 0x42); // 1MB file
      
      const startTime = Date.now();
      const result = await validateFileContentSecurity(mediumFile, 'image');
      const validationTime = Date.now() - startTime;
      
      expect(validationTime).toBeLessThan(500); // Should complete within 500ms
      expect(result).toBeDefined();
    });

    it('should handle large files efficiently', async () => {
      const largeFile = Buffer.alloc(10 * 1024 * 1024, 0x43); // 10MB file
      
      const startTime = Date.now();
      const result = await validateFileContentSecurity(largeFile, 'video');
      const validationTime = Date.now() - startTime;
      
      expect(validationTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result).toBeDefined();
    });
  });

  describe('Malware Scanning Performance', () => {
    it('should scan small files quickly', async () => {
      const smallFile = Buffer.alloc(1024, 0x41);
      
      const startTime = Date.now();
      const result = await MalwareScanner.scanBuffer(smallFile);
      const scanTime = Date.now() - startTime;
      
      expect(scanTime).toBeLessThan(50); // Should complete within 50ms
      expect(result.scanTime).toBeLessThan(50);
    });

    it('should scan medium files efficiently', async () => {
      const mediumFile = Buffer.alloc(1024 * 1024, 0x42);
      
      const startTime = Date.now();
      const result = await MalwareScanner.scanBuffer(mediumFile);
      const scanTime = Date.now() - startTime;
      
      expect(scanTime).toBeLessThan(200); // Should complete within 200ms
      expect(result.scanTime).toBeLessThan(200);
    });

    it('should handle pattern scanning efficiently', async () => {
      // Create file with multiple patterns to test
      const patternFile = Buffer.concat([
        Buffer.from('normal content '),
        Buffer.from('<script>alert("test")</script>'),
        Buffer.from(' more content '),
        Buffer.from('<?php echo "test"; ?>'),
        Buffer.from(' final content')
      ]);
      
      const startTime = Date.now();
      const result = await MalwareScanner.scanBuffer(patternFile);
      const scanTime = Date.now() - startTime;
      
      expect(scanTime).toBeLessThan(100);
      expect(result.threats.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Processing Performance', () => {
    it('should handle multiple concurrent validations', async () => {
      const testFile = Buffer.alloc(1024 * 100, 0x44); // 100KB file
      const concurrentRequests = 10;
      
      const startTime = Date.now();
      const promises = Array.from({ length: concurrentRequests }, () =>
        validateFileContentSecurity(testFile, 'image')
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it('should handle concurrent malware scans', async () => {
      const testFile = Buffer.alloc(1024 * 100, 0x45);
      const concurrentScans = 5;
      
      const startTime = Date.now();
      const promises = Array.from({ length: concurrentScans }, () =>
        MalwareScanner.scanBuffer(testFile)
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(concurrentScans);
      expect(totalTime).toBeLessThan(500);
      
      results.forEach(result => {
        expect(result.isClean).toBeDefined();
      });
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not leak memory during repeated operations', async () => {
      const testFile = Buffer.alloc(1024 * 1024, 0x46); // 1MB file
      const iterations = 20;
      
      // Get initial memory usage
      const initialMemory = process.memoryUsage();
      
      // Perform repeated operations
      for (let i = 0; i < iterations; i++) {
        await validateFileContentSecurity(testFile, 'image');
        await MalwareScanner.scanBuffer(testFile);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      // Check final memory usage
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large files without excessive memory usage', async () => {
      const largeFile = Buffer.alloc(5 * 1024 * 1024, 0x47); // 5MB file
      
      const initialMemory = process.memoryUsage();
      
      await validateFileContentSecurity(largeFile, 'video');
      await MalwareScanner.scanBuffer(largeFile);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should not exceed 3x file size
      expect(memoryIncrease).toBeLessThan(largeFile.length * 3);
    });
  });

  describe('Audit Logging Performance', () => {
    it('should log events quickly', () => {
      const iterations = 1000;
      
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        SecurityAuditService.logFileUpload(
          `user_${i}`,
          '127.0.0.1',
          'test-agent',
          `file_${i}.jpg`,
          1024,
          `hash_${i}`,
          'success'
        );
      }
      
      const loggingTime = Date.now() - startTime;
      
      // Should log 1000 events in less than 100ms
      expect(loggingTime).toBeLessThan(100);
    });

    it('should retrieve metrics efficiently', () => {
      // Add some test events first
      for (let i = 0; i < 100; i++) {
        SecurityAuditService.logFileUpload(
          `user_${i % 10}`,
          '127.0.0.1',
          'test-agent',
          `file_${i}.jpg`,
          1024,
          `hash_${i}`,
          i % 5 === 0 ? 'blocked' : 'success'
        );
      }
      
      const startTime = Date.now();
      const metrics = SecurityAuditService.getSecurityMetrics();
      const metricsTime = Date.now() - startTime;
      
      expect(metricsTime).toBeLessThan(50); // Should complete within 50ms
      expect(metrics).toBeDefined();
      expect(metrics.totalEvents).toBeGreaterThan(0);
    });
  });

  describe('Quarantine System Performance', () => {
    it('should quarantine files quickly', async () => {
      const testFile = Buffer.alloc(1024, 0x48);
      const securityIssues = [
        { type: 'malware' as const, severity: 'high' as const, description: 'Test threat' }
      ];
      const scanResult = { isClean: false, threats: [{ name: 'Test', type: 'test', severity: 'high' as const }], scanTime: 10 };
      
      const startTime = Date.now();
      const quarantineId = await FileQuarantineService.quarantineFile(
        testFile,
        'test.jpg',
        'test-user',
        securityIssues,
        scanResult
      );
      const quarantineTime = Date.now() - startTime;
      
      expect(quarantineTime).toBeLessThan(100);
      expect(quarantineId).toBeDefined();
    });

    it('should list quarantined files efficiently', async () => {
      // Add multiple quarantined files
      const testFile = Buffer.alloc(1024, 0x49);
      const securityIssues = [
        { type: 'malware' as const, severity: 'high' as const, description: 'Test threat' }
      ];
      const scanResult = { isClean: false, threats: [], scanTime: 10 };
      
      for (let i = 0; i < 50; i++) {
        await FileQuarantineService.quarantineFile(
          testFile,
          `test_${i}.jpg`,
          `user_${i % 5}`,
          securityIssues,
          scanResult
        );
      }
      
      const startTime = Date.now();
      const quarantinedFiles = FileQuarantineService.listQuarantinedFiles({ limit: 20 });
      const listTime = Date.now() - startTime;
      
      expect(listTime).toBeLessThan(50);
      expect(quarantinedFiles.length).toBeLessThanOrEqual(20);
    });
  });

  describe('End-to-End Performance', () => {
    it('should process legitimate files within performance targets', async () => {
      const validJpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
        ...Array(1000).fill(0x41), // Add some content
        0xff, 0xd9
      ]);
      
      const startTime = Date.now();
      
      // Full security pipeline
      const validationResult = await SecureMediaProcessor.validateFileContent(validJpeg, 'image');
      const scanResult = await SecureMediaProcessor.scanForMalware(validJpeg);
      
      const totalTime = Date.now() - startTime;
      
      // Should complete full security validation within 200ms for small files
      expect(totalTime).toBeLessThan(200);
      expect(validationResult.isValid).toBe(true);
      expect(scanResult.isClean).toBe(true);
    });

    it('should meet performance targets for typical file sizes', async () => {
      const typicalImageSize = 2 * 1024 * 1024; // 2MB typical image
      const testFile = Buffer.alloc(typicalImageSize, 0x4A);
      
      const startTime = Date.now();
      
      const validationResult = await SecureMediaProcessor.validateFileContent(testFile, 'image');
      const scanResult = await SecureMediaProcessor.scanForMalware(testFile);
      
      const totalTime = Date.now() - startTime;
      
      // Should complete within 2 seconds for typical files
      expect(totalTime).toBeLessThan(2000);
      expect(validationResult).toBeDefined();
      expect(scanResult).toBeDefined();
    });
  });
});
