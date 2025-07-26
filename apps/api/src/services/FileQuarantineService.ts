import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash, randomBytes } from 'crypto';
import { SecurityIssue, ScanResult } from '../lib/file-validation';

export interface QuarantineRecord {
  id: string;
  originalFileName: string;
  quarantinePath: string;
  userId: string;
  uploadTime: Date;
  securityIssues: SecurityIssue[];
  scanResult: ScanResult;
  fileSize: number;
  fileHash: string;
  status: 'quarantined' | 'reviewed' | 'released' | 'deleted';
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
}

export interface QuarantineStats {
  totalQuarantined: number;
  pendingReview: number;
  releasedFiles: number;
  deletedFiles: number;
  topThreats: Array<{ threat: string; count: number }>;
}

export class FileQuarantineService {
  private static readonly QUARANTINE_DIR = join(tmpdir(), 'phonoglyph-quarantine');
  private static readonly MAX_QUARANTINE_AGE_DAYS = 30;
  private static quarantineRecords = new Map<string, QuarantineRecord>();

  /**
   * Initialize quarantine system
   */
  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.QUARANTINE_DIR, { recursive: true });
      console.info('File quarantine system initialized');
    } catch (error) {
      console.error('Failed to initialize quarantine system:', error);
      throw new Error('Quarantine system initialization failed');
    }
  }

  /**
   * Quarantine a suspicious file
   */
  static async quarantineFile(
    buffer: Buffer,
    originalFileName: string,
    userId: string,
    securityIssues: SecurityIssue[],
    scanResult: ScanResult
  ): Promise<string> {
    const quarantineId = randomBytes(16).toString('hex');
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    const quarantinePath = join(this.QUARANTINE_DIR, `${quarantineId}.quarantine`);

    try {
      // Write file to quarantine directory
      await fs.writeFile(quarantinePath, buffer);

      // Create quarantine record
      const record: QuarantineRecord = {
        id: quarantineId,
        originalFileName,
        quarantinePath,
        userId,
        uploadTime: new Date(),
        securityIssues,
        scanResult,
        fileSize: buffer.length,
        fileHash,
        status: 'quarantined'
      };

      this.quarantineRecords.set(quarantineId, record);

      // Log quarantine event
      console.warn('File quarantined:', {
        quarantineId,
        originalFileName,
        userId,
        fileSize: buffer.length,
        securityIssues: securityIssues.length,
        threats: scanResult.threats.length
      });

      return quarantineId;

    } catch (error) {
      console.error('Failed to quarantine file:', error);
      throw new Error('File quarantine failed');
    }
  }

  /**
   * Review a quarantined file
   */
  static async reviewQuarantinedFile(
    quarantineId: string,
    reviewerId: string,
    action: 'release' | 'delete',
    notes?: string
  ): Promise<void> {
    const record = this.quarantineRecords.get(quarantineId);
    if (!record) {
      throw new Error('Quarantine record not found');
    }

    if (record.status !== 'quarantined') {
      throw new Error('File has already been reviewed');
    }

    try {
      if (action === 'delete') {
        // Delete quarantined file
        await fs.unlink(record.quarantinePath);
        record.status = 'deleted';
      } else {
        record.status = 'released';
      }

      record.reviewedBy = reviewerId;
      record.reviewedAt = new Date();
      record.notes = notes;

      this.quarantineRecords.set(quarantineId, record);

      console.info('Quarantined file reviewed:', {
        quarantineId,
        action,
        reviewerId,
        originalFileName: record.originalFileName
      });

    } catch (error) {
      console.error('Failed to review quarantined file:', error);
      throw new Error('File review failed');
    }
  }

  /**
   * Get quarantine record by ID
   */
  static getQuarantineRecord(quarantineId: string): QuarantineRecord | undefined {
    return this.quarantineRecords.get(quarantineId);
  }

  /**
   * List quarantined files with filtering
   */
  static listQuarantinedFiles(filters: {
    status?: QuarantineRecord['status'];
    userId?: string;
    limit?: number;
    offset?: number;
  } = {}): QuarantineRecord[] {
    const { status, userId, limit = 50, offset = 0 } = filters;
    
    let records = Array.from(this.quarantineRecords.values());

    // Apply filters
    if (status) {
      records = records.filter(r => r.status === status);
    }
    if (userId) {
      records = records.filter(r => r.userId === userId);
    }

    // Sort by upload time (newest first)
    records.sort((a, b) => b.uploadTime.getTime() - a.uploadTime.getTime());

    // Apply pagination
    return records.slice(offset, offset + limit);
  }

  /**
   * Get quarantine statistics
   */
  static getQuarantineStats(): QuarantineStats {
    const records = Array.from(this.quarantineRecords.values());
    
    const stats: QuarantineStats = {
      totalQuarantined: records.length,
      pendingReview: records.filter(r => r.status === 'quarantined').length,
      releasedFiles: records.filter(r => r.status === 'released').length,
      deletedFiles: records.filter(r => r.status === 'deleted').length,
      topThreats: []
    };

    // Calculate top threats
    const threatCounts = new Map<string, number>();
    records.forEach(record => {
      record.scanResult.threats.forEach(threat => {
        const count = threatCounts.get(threat.name) || 0;
        threatCounts.set(threat.name, count + 1);
      });
    });

    stats.topThreats = Array.from(threatCounts.entries())
      .map(([threat, count]) => ({ threat, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Clean up old quarantine files
   */
  static async cleanupOldFiles(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.MAX_QUARANTINE_AGE_DAYS);

    let cleanedCount = 0;
    const recordsToDelete: string[] = [];

    for (const [id, record] of this.quarantineRecords.entries()) {
      if (record.uploadTime < cutoffDate) {
        try {
          // Delete physical file if it exists
          await fs.unlink(record.quarantinePath).catch(() => {
            // File might already be deleted, ignore error
          });
          
          recordsToDelete.push(id);
          cleanedCount++;
        } catch (error) {
          console.error(`Failed to cleanup quarantine file ${id}:`, error);
        }
      }
    }

    // Remove records from memory
    recordsToDelete.forEach(id => this.quarantineRecords.delete(id));

    if (cleanedCount > 0) {
      console.info(`Cleaned up ${cleanedCount} old quarantine files`);
    }

    return cleanedCount;
  }

  /**
   * Check if file hash is already quarantined
   */
  static isFileHashQuarantined(fileHash: string): boolean {
    return Array.from(this.quarantineRecords.values())
      .some(record => record.fileHash === fileHash && record.status === 'quarantined');
  }

  /**
   * Get file from quarantine (for admin review)
   */
  static async getQuarantinedFileBuffer(quarantineId: string): Promise<Buffer> {
    const record = this.quarantineRecords.get(quarantineId);
    if (!record) {
      throw new Error('Quarantine record not found');
    }

    try {
      return await fs.readFile(record.quarantinePath);
    } catch (error) {
      console.error('Failed to read quarantined file:', error);
      throw new Error('Failed to retrieve quarantined file');
    }
  }

  /**
   * Export quarantine logs for analysis
   */
  static exportQuarantineLogs(startDate?: Date, endDate?: Date): QuarantineRecord[] {
    let records = Array.from(this.quarantineRecords.values());

    if (startDate) {
      records = records.filter(r => r.uploadTime >= startDate);
    }
    if (endDate) {
      records = records.filter(r => r.uploadTime <= endDate);
    }

    return records.map(record => ({
      ...record,
      // Remove sensitive file path information
      quarantinePath: '[REDACTED]'
    })) as QuarantineRecord[];
  }

  /**
   * Schedule automatic cleanup (would be called by a cron job)
   */
  static scheduleCleanup(): void {
    // Run cleanup every 24 hours
    setInterval(async () => {
      try {
        await this.cleanupOldFiles();
      } catch (error) {
        console.error('Scheduled quarantine cleanup failed:', error);
      }
    }, 24 * 60 * 60 * 1000);

    console.info('Quarantine cleanup scheduled');
  }
}
