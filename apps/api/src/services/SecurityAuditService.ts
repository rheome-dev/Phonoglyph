import { createHash } from 'crypto';
import { SecurityIssue, ScanResult } from '../lib/file-validation';

export interface SecurityAuditEvent {
  id: string;
  timestamp: Date;
  eventType: 'file_upload' | 'file_scan' | 'file_quarantine' | 'file_block' | 'security_violation' | 'admin_action';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  fileName?: string;
  fileSize?: number;
  fileHash?: string;
  securityIssues?: SecurityIssue[];
  scanResult?: ScanResult;
  action: string;
  result: 'success' | 'blocked' | 'quarantined' | 'failed';
  details: Record<string, any>;
  processingTime?: number;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  blockedUploads: number;
  quarantinedFiles: number;
  topThreats: Array<{ threat: string; count: number; severity: string }>;
  userActivity: Array<{ userId: string; events: number; violations: number }>;
  timelineData: Array<{ date: string; events: number; violations: number }>;
}

export class SecurityAuditService {
  private static events: SecurityAuditEvent[] = [];
  private static readonly MAX_EVENTS = 10000; // Keep last 10k events in memory
  private static eventCounter = 0;

  /**
   * Log a security audit event
   */
  static logEvent(event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>): void {
    const auditEvent: SecurityAuditEvent = {
      id: `audit_${++this.eventCounter}_${Date.now()}`,
      timestamp: new Date(),
      ...event
    };

    // Add to events array
    this.events.push(auditEvent);

    // Maintain size limit
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift(); // Remove oldest event
    }

    // Log to console based on severity
    const logLevel = this.getLogLevel(event.severity);
    const logMessage = this.formatLogMessage(auditEvent);
    
    console[logLevel](logMessage, {
      eventId: auditEvent.id,
      eventType: auditEvent.eventType,
      userId: auditEvent.userId,
      result: auditEvent.result,
      details: auditEvent.details
    });

    // Alert on critical events
    if (event.severity === 'critical') {
      this.alertCriticalEvent(auditEvent);
    }
  }

  /**
   * Log file upload event
   */
  static logFileUpload(
    userId: string,
    ipAddress: string,
    userAgent: string,
    fileName: string,
    fileSize: number,
    fileHash: string,
    result: SecurityAuditEvent['result'],
    securityIssues?: SecurityIssue[],
    scanResult?: ScanResult,
    processingTime?: number
  ): void {
    const severity = this.determineSeverity(result, securityIssues, scanResult);
    
    this.logEvent({
      eventType: 'file_upload',
      severity,
      userId,
      ipAddress,
      userAgent,
      fileName,
      fileSize,
      fileHash,
      securityIssues,
      scanResult,
      action: 'file_upload_attempt',
      result,
      processingTime,
      details: {
        fileName,
        fileSize,
        securityIssuesCount: securityIssues?.length || 0,
        threatsDetected: scanResult?.threats.length || 0,
        scanTime: scanResult?.scanTime
      }
    });
  }

  /**
   * Log security violation
   */
  static logSecurityViolation(
    userId: string,
    ipAddress: string,
    userAgent: string,
    violationType: string,
    details: Record<string, any>
  ): void {
    this.logEvent({
      eventType: 'security_violation',
      severity: 'high',
      userId,
      ipAddress,
      userAgent,
      action: violationType,
      result: 'blocked',
      details: {
        violationType,
        ...details
      }
    });
  }

  /**
   * Log admin action
   */
  static logAdminAction(
    adminUserId: string,
    ipAddress: string,
    userAgent: string,
    action: string,
    targetUserId?: string,
    details: Record<string, any> = {}
  ): void {
    this.logEvent({
      eventType: 'admin_action',
      severity: 'medium',
      userId: adminUserId,
      ipAddress,
      userAgent,
      action,
      result: 'success',
      details: {
        targetUserId,
        ...details
      }
    });
  }

  /**
   * Get security metrics for dashboard
   */
  static getSecurityMetrics(timeRange?: { start: Date; end: Date }): SecurityMetrics {
    let filteredEvents = this.events;

    if (timeRange) {
      filteredEvents = this.events.filter(
        event => event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
      );
    }

    const metrics: SecurityMetrics = {
      totalEvents: filteredEvents.length,
      eventsByType: {},
      eventsBySeverity: {},
      blockedUploads: 0,
      quarantinedFiles: 0,
      topThreats: [],
      userActivity: [],
      timelineData: []
    };

    // Calculate metrics
    const threatCounts = new Map<string, { count: number; severity: string }>();
    const userActivity = new Map<string, { events: number; violations: number }>();
    const dailyActivity = new Map<string, { events: number; violations: number }>();

    filteredEvents.forEach(event => {
      // Event type counts
      metrics.eventsByType[event.eventType] = (metrics.eventsByType[event.eventType] || 0) + 1;
      
      // Severity counts
      metrics.eventsBySeverity[event.severity] = (metrics.eventsBySeverity[event.severity] || 0) + 1;
      
      // Blocked/quarantined counts
      if (event.result === 'blocked') metrics.blockedUploads++;
      if (event.result === 'quarantined') metrics.quarantinedFiles++;
      
      // Threat analysis
      if (event.scanResult?.threats) {
        event.scanResult.threats.forEach(threat => {
          const existing = threatCounts.get(threat.name) || { count: 0, severity: threat.severity };
          threatCounts.set(threat.name, { 
            count: existing.count + 1, 
            severity: threat.severity 
          });
        });
      }
      
      // User activity
      const userStats = userActivity.get(event.userId) || { events: 0, violations: 0 };
      userStats.events++;
      if (event.severity === 'high' || event.severity === 'critical') {
        userStats.violations++;
      }
      userActivity.set(event.userId, userStats);
      
      // Daily timeline
      const dateKey = event.timestamp.toISOString().split('T')[0];
      const dayStats = dailyActivity.get(dateKey) || { events: 0, violations: 0 };
      dayStats.events++;
      if (event.severity === 'high' || event.severity === 'critical') {
        dayStats.violations++;
      }
      dailyActivity.set(dateKey, dayStats);
    });

    // Top threats
    metrics.topThreats = Array.from(threatCounts.entries())
      .map(([threat, data]) => ({ threat, count: data.count, severity: data.severity }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // User activity (top 20 most active users)
    metrics.userActivity = Array.from(userActivity.entries())
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 20);

    // Timeline data (last 30 days)
    metrics.timelineData = Array.from(dailyActivity.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    return metrics;
  }

  /**
   * Search audit events
   */
  static searchEvents(criteria: {
    userId?: string;
    eventType?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): SecurityAuditEvent[] {
    let results = this.events;

    if (criteria.userId) {
      results = results.filter(e => e.userId === criteria.userId);
    }
    if (criteria.eventType) {
      results = results.filter(e => e.eventType === criteria.eventType);
    }
    if (criteria.severity) {
      results = results.filter(e => e.severity === criteria.severity);
    }
    if (criteria.startDate) {
      results = results.filter(e => e.timestamp >= criteria.startDate!);
    }
    if (criteria.endDate) {
      results = results.filter(e => e.timestamp <= criteria.endDate!);
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }

  /**
   * Export audit logs
   */
  static exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'ID', 'Timestamp', 'Event Type', 'Severity', 'User ID', 'IP Address',
        'Action', 'Result', 'File Name', 'File Size', 'Security Issues', 'Threats'
      ];
      
      const rows = this.events.map(event => [
        event.id,
        event.timestamp.toISOString(),
        event.eventType,
        event.severity,
        event.userId,
        event.ipAddress,
        event.action,
        event.result,
        event.fileName || '',
        event.fileSize || '',
        event.securityIssues?.length || 0,
        event.scanResult?.threats.length || 0
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Determine event severity based on result and security issues
   */
  private static determineSeverity(
    result: SecurityAuditEvent['result'],
    securityIssues?: SecurityIssue[],
    scanResult?: ScanResult
  ): SecurityAuditEvent['severity'] {
    if (result === 'blocked' || result === 'quarantined') {
      const hasCriticalIssues = securityIssues?.some(issue => issue.severity === 'critical') ||
                               scanResult?.threats.some(threat => threat.severity === 'critical');
      if (hasCriticalIssues) return 'critical';
      
      const hasHighIssues = securityIssues?.some(issue => issue.severity === 'high') ||
                           scanResult?.threats.some(threat => threat.severity === 'high');
      if (hasHighIssues) return 'high';
      
      return 'medium';
    }

    if (result === 'failed') return 'medium';
    
    return 'low';
  }

  /**
   * Get appropriate log level for severity
   */
  private static getLogLevel(severity: SecurityAuditEvent['severity']): 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      default:
        return 'info';
    }
  }

  /**
   * Format log message
   */
  private static formatLogMessage(event: SecurityAuditEvent): string {
    return `[SECURITY AUDIT] ${event.eventType.toUpperCase()}: ${event.action} - ${event.result} (${event.severity})`;
  }

  /**
   * Alert on critical security events
   */
  private static alertCriticalEvent(event: SecurityAuditEvent): void {
    // In production, this would send alerts via email, Slack, PagerDuty, etc.
    console.error('🚨 CRITICAL SECURITY EVENT DETECTED 🚨', {
      eventId: event.id,
      eventType: event.eventType,
      userId: event.userId,
      ipAddress: event.ipAddress,
      action: event.action,
      details: event.details
    });
  }
}
