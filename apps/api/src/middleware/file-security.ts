import { Request, Response, NextFunction } from 'express';
import { SecureMediaProcessor } from '../services/SecureMediaProcessor';
import { FileQuarantineService } from '../services/FileQuarantineService';
import { SecurityAuditService } from '../services/SecurityAuditService';
import { FileType, ScanResult } from '../lib/file-validation';
import { SECURITY_CONFIG } from '../lib/security-config';
import { createHash } from 'crypto';

export interface SecurityMiddlewareOptions {
  maxFileSize?: number;
  allowedTypes?: FileType[];
  enableMalwareScanning?: boolean;
  quarantineThreshold?: number; // Number of security issues before quarantine
  useConfigDefaults?: boolean; // Whether to use security config defaults
}

export interface SecureFileRequest extends Request {
  securityValidation?: {
    isValid: boolean;
    securityIssues: any[];
    scanResult: any;
    quarantined: boolean;
  };
}

/**
 * File security middleware for validating uploaded files
 */
export function fileSecurityMiddleware(options: SecurityMiddlewareOptions = {}) {
  const {
    maxFileSize = 100 * 1024 * 1024, // 100MB default
    allowedTypes = ['image', 'video', 'audio', 'midi'],
    enableMalwareScanning = SECURITY_CONFIG.malwareScanning.enabled,
    quarantineThreshold = SECURITY_CONFIG.quarantine.autoQuarantineThreshold,
    useConfigDefaults = true
  } = options;

  return async (req: SecureFileRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const userId = req.body?.userId || req.headers['x-user-id'] as string || 'anonymous';
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Skip if no file buffer in request
      if (!req.body?.buffer || !req.body?.fileType) {
        return next();
      }

      const buffer = Buffer.from(req.body.buffer);
      const fileType = req.body.fileType as FileType;
      const fileName = req.body.fileName || 'unknown';
      const fileHash = createHash('sha256').update(buffer).digest('hex');

      // Check if file hash is already quarantined
      if (FileQuarantineService.isFileHashQuarantined(fileHash)) {
        SecurityAuditService.logSecurityViolation(
          userId,
          ipAddress,
          userAgent,
          'duplicate_quarantined_file',
          { fileName, fileHash }
        );

        return res.status(400).json({
          error: 'File previously quarantined',
          message: 'This file has been previously identified as a security threat',
          code: 'FILE_QUARANTINED'
        });
      }

      // Basic size check
      if (buffer.length > maxFileSize) {
        SecurityAuditService.logFileUpload(
          userId, ipAddress, userAgent, fileName, buffer.length, fileHash,
          'blocked', undefined, undefined, Date.now() - startTime
        );

        return res.status(413).json({
          error: 'File too large',
          message: `File size ${buffer.length} exceeds maximum allowed size ${maxFileSize}`,
          code: 'FILE_TOO_LARGE'
        });
      }

      // Type check
      if (!allowedTypes.includes(fileType)) {
        SecurityAuditService.logFileUpload(
          userId, ipAddress, userAgent, fileName, buffer.length, fileHash,
          'blocked', undefined, undefined, Date.now() - startTime
        );

        return res.status(400).json({
          error: 'File type not allowed',
          message: `File type ${fileType} is not in allowed types: ${allowedTypes.join(', ')}`,
          code: 'FILE_TYPE_NOT_ALLOWED'
        });
      }

      // Content validation
      const validationResult = await SecureMediaProcessor.validateFileContent(buffer, fileType);

      // Malware scanning - currently disabled for MVP
      // Will be enabled when enterprise Cloudflare account or VirusTotal integration is available
      let scanResult: ScanResult = { isClean: true, threats: [], scanTime: 0 };
      if (enableMalwareScanning && SECURITY_CONFIG.malwareScanning.enabled) {
        scanResult = await SecureMediaProcessor.scanForMalware(buffer);
      }

      // Determine if file should be quarantined
      const criticalIssues = validationResult.securityIssues.filter(
        issue => issue.severity === 'critical' || issue.severity === 'high'
      );
      const shouldQuarantine = criticalIssues.length >= quarantineThreshold || !scanResult.isClean;

      // Handle quarantine/blocking
      if (shouldQuarantine) {
        // Quarantine the file
        const quarantineId = await FileQuarantineService.quarantineFile(
          buffer,
          fileName,
          userId,
          validationResult.securityIssues,
          scanResult
        );

        // Log the quarantine event
        SecurityAuditService.logFileUpload(
          userId, ipAddress, userAgent, fileName, buffer.length, fileHash,
          'quarantined', validationResult.securityIssues, scanResult, Date.now() - startTime
        );

        return res.status(400).json({
          error: 'File security validation failed',
          message: 'File contains security threats and has been quarantined',
          code: 'SECURITY_THREAT_DETECTED',
          quarantineId,
          details: {
            securityIssues: criticalIssues.map(issue => ({
              type: issue.type,
              severity: issue.severity,
              description: issue.description
            })),
            threats: scanResult.threats.map(threat => ({
              name: threat.name,
              type: threat.type,
              severity: threat.severity
            }))
          }
        });
      }

      // Attach security validation results to request
      req.securityValidation = {
        isValid: validationResult.isValid,
        securityIssues: validationResult.securityIssues,
        scanResult,
        quarantined: shouldQuarantine
      };

      // Log successful validation
      SecurityAuditService.logFileUpload(
        userId, ipAddress, userAgent, fileName, buffer.length, fileHash,
        'success', validationResult.securityIssues, scanResult, Date.now() - startTime
      );

      next();
    } catch (error) {
      console.error('File security middleware error:', error);

      // Log the error
      SecurityAuditService.logFileUpload(
        userId, ipAddress, userAgent, req.body?.fileName || 'unknown',
        req.body?.buffer ? Buffer.from(req.body.buffer).length : 0, 'unknown',
        'failed', undefined, undefined, Date.now() - startTime
      );

      // Fail securely - reject file if security validation fails
      return res.status(500).json({
        error: 'Security validation failed',
        message: 'Unable to validate file security',
        code: 'SECURITY_VALIDATION_ERROR'
      });
    }
  };
}

/**
 * Rate limiting middleware for file operations
 */
export function fileRateLimitMiddleware(options: {
  windowMs?: number;
  maxFiles?: number;
  maxTotalSize?: number;
} = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxFiles = 10,
    maxTotalSize = 500 * 1024 * 1024 // 500MB
  } = options;

  // Simple in-memory store (in production, use Redis)
  const userLimits = new Map<string, {
    files: number;
    totalSize: number;
    resetTime: number;
  }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.body?.userId || req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const now = Date.now();
    const userLimit = userLimits.get(userId);
    const fileSize = req.body?.buffer ? Buffer.from(req.body.buffer).length : 0;

    // Reset limits if window expired
    if (!userLimit || now > userLimit.resetTime) {
      userLimits.set(userId, {
        files: 1,
        totalSize: fileSize,
        resetTime: now + windowMs
      });
      return next();
    }

    // Check limits
    if (userLimit.files >= maxFiles) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${maxFiles} files per ${windowMs / 1000 / 60} minutes`,
        code: 'FILE_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      });
    }

    if (userLimit.totalSize + fileSize > maxTotalSize) {
      return res.status(429).json({
        error: 'Size limit exceeded',
        message: `Maximum ${maxTotalSize / 1024 / 1024}MB total per ${windowMs / 1000 / 60} minutes`,
        code: 'SIZE_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      });
    }

    // Update limits
    userLimit.files += 1;
    userLimit.totalSize += fileSize;
    userLimits.set(userId, userLimit);

    next();
  };
}

/**
 * Audit logging middleware for file operations
 */
export function fileAuditMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log request
    const auditData = {
      timestamp: new Date().toISOString(),
      userId: req.body?.userId || req.headers['x-user-id'],
      action: 'file_upload',
      fileName: req.body?.fileName,
      fileType: req.body?.fileType,
      fileSize: req.body?.buffer ? Buffer.from(req.body.buffer).length : 0,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      requestId: req.headers['x-request-id']
    };

    console.info('File operation audit:', auditData);

    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
      const responseTime = Date.now() - startTime;
      
      console.info('File operation completed:', {
        ...auditData,
        statusCode: res.statusCode,
        responseTime,
        success: res.statusCode < 400
      });
      
      return originalSend.call(this, data);
    };

    next();
  };
}
