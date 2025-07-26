/**
 * Security feature configuration
 * Allows enabling/disabling security features based on environment and needs
 */

export interface SecurityConfig {
  // Malware scanning options
  malwareScanning: {
    enabled: boolean;
    provider: 'custom' | 'virustotal' | 'cloudflare' | 'disabled';
    fallbackToCustom: boolean;
  };
  
  // File validation options
  fileValidation: {
    enableMagicByteValidation: boolean;
    enableStructureValidation: boolean;
    enablePolyglotDetection: boolean;
  };
  
  // Quarantine system
  quarantine: {
    enabled: boolean;
    autoQuarantineThreshold: number; // Number of security issues before auto-quarantine
  };
  
  // Audit logging
  auditLogging: {
    enabled: boolean;
    logLevel: 'basic' | 'detailed' | 'verbose';
  };
  
  // Rate limiting
  rateLimiting: {
    enabled: boolean;
    maxFilesPerWindow: number;
    maxTotalSizePerWindow: number; // in bytes
    windowMs: number;
  };
  
  // Processing security
  processing: {
    enableSecureProcessing: boolean;
    maxProcessingTime: number; // in milliseconds
    maxMemoryUsage: number; // in bytes
    enableResourceLimits: boolean;
  };
}

/**
 * Default security configuration
 * Optimized for startup/MVP phase - malware scanning disabled until enterprise services available
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  malwareScanning: {
    enabled: false, // Disabled for MVP - no enterprise Cloudflare account
    provider: 'disabled',
    fallbackToCustom: false
  },
  
  fileValidation: {
    enableMagicByteValidation: true,
    enableStructureValidation: true,
    enablePolyglotDetection: true
  },
  
  quarantine: {
    enabled: true,
    autoQuarantineThreshold: 1 // Quarantine on any high/critical security issue
  },
  
  auditLogging: {
    enabled: true,
    logLevel: 'detailed'
  },
  
  rateLimiting: {
    enabled: true,
    maxFilesPerWindow: 10,
    maxTotalSizePerWindow: 500 * 1024 * 1024, // 500MB
    windowMs: 15 * 60 * 1000 // 15 minutes
  },
  
  processing: {
    enableSecureProcessing: true,
    maxProcessingTime: 30000, // 30 seconds
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    enableResourceLimits: true
  }
};

/**
 * Enterprise security configuration
 * For when you need maximum security and have the infrastructure to support it
 */
export const ENTERPRISE_SECURITY_CONFIG: SecurityConfig = {
  malwareScanning: {
    enabled: true,
    provider: 'custom', // Use custom scanner for full control
    fallbackToCustom: true
  },
  
  fileValidation: {
    enableMagicByteValidation: true,
    enableStructureValidation: true,
    enablePolyglotDetection: true
  },
  
  quarantine: {
    enabled: true,
    autoQuarantineThreshold: 1
  },
  
  auditLogging: {
    enabled: true,
    logLevel: 'verbose'
  },
  
  rateLimiting: {
    enabled: true,
    maxFilesPerWindow: 50,
    maxTotalSizePerWindow: 2 * 1024 * 1024 * 1024, // 2GB
    windowMs: 15 * 60 * 1000
  },
  
  processing: {
    enableSecureProcessing: true,
    maxProcessingTime: 60000, // 60 seconds
    maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
    enableResourceLimits: true
  }
};

/**
 * Development security configuration
 * Minimal security for development/testing
 */
export const DEVELOPMENT_SECURITY_CONFIG: SecurityConfig = {
  malwareScanning: {
    enabled: false,
    provider: 'disabled',
    fallbackToCustom: false
  },
  
  fileValidation: {
    enableMagicByteValidation: true,
    enableStructureValidation: false,
    enablePolyglotDetection: false
  },
  
  quarantine: {
    enabled: false,
    autoQuarantineThreshold: 5
  },
  
  auditLogging: {
    enabled: true,
    logLevel: 'basic'
  },
  
  rateLimiting: {
    enabled: false,
    maxFilesPerWindow: 100,
    maxTotalSizePerWindow: 10 * 1024 * 1024 * 1024, // 10GB
    windowMs: 60 * 60 * 1000 // 1 hour
  },
  
  processing: {
    enableSecureProcessing: false,
    maxProcessingTime: 120000, // 2 minutes
    maxMemoryUsage: 2 * 1024 * 1024 * 1024, // 2GB
    enableResourceLimits: false
  }
};

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig(): SecurityConfig {
  const env = process.env.NODE_ENV || 'development';
  const securityLevel = process.env.SECURITY_LEVEL || 'default';
  
  switch (env) {
    case 'development':
      return DEVELOPMENT_SECURITY_CONFIG;
    case 'production':
      return securityLevel === 'enterprise' 
        ? ENTERPRISE_SECURITY_CONFIG 
        : DEFAULT_SECURITY_CONFIG;
    default:
      return DEFAULT_SECURITY_CONFIG;
  }
}

/**
 * Override specific security settings via environment variables
 */
export function getSecurityConfigWithOverrides(): SecurityConfig {
  const baseConfig = getSecurityConfig();
  
  // Allow environment variable overrides
  if (process.env.ENABLE_CUSTOM_MALWARE_SCANNER === 'true') {
    baseConfig.malwareScanning.provider = 'custom';
    baseConfig.malwareScanning.fallbackToCustom = true;
  }
  
  if (process.env.DISABLE_QUARANTINE === 'true') {
    baseConfig.quarantine.enabled = false;
  }
  
  if (process.env.SECURITY_LOG_LEVEL) {
    baseConfig.auditLogging.logLevel = process.env.SECURITY_LOG_LEVEL as any;
  }
  
  return baseConfig;
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityConfig): string[] {
  const errors: string[] = [];
  
  if (config.malwareScanning.enabled && config.malwareScanning.provider === 'disabled') {
    errors.push('Malware scanning is enabled but provider is set to disabled');
  }
  
  if (config.quarantine.autoQuarantineThreshold < 1) {
    errors.push('Auto-quarantine threshold must be at least 1');
  }
  
  if (config.processing.maxProcessingTime < 1000) {
    errors.push('Max processing time must be at least 1 second');
  }
  
  if (config.rateLimiting.maxFilesPerWindow < 1) {
    errors.push('Max files per window must be at least 1');
  }
  
  return errors;
}

// Export the current active configuration
export const SECURITY_CONFIG = getSecurityConfigWithOverrides();

// Validate configuration on startup
const configErrors = validateSecurityConfig(SECURITY_CONFIG);
if (configErrors.length > 0) {
  console.error('Security configuration errors:', configErrors);
  throw new Error(`Invalid security configuration: ${configErrors.join(', ')}`);
}

console.info('Security configuration loaded:', {
  malwareScanning: SECURITY_CONFIG.malwareScanning.enabled ? SECURITY_CONFIG.malwareScanning.provider : 'disabled',
  fileValidation: SECURITY_CONFIG.fileValidation.enableMagicByteValidation,
  quarantineEnabled: SECURITY_CONFIG.quarantine.enabled,
  auditLevel: SECURITY_CONFIG.auditLogging.logLevel,
  environment: process.env.NODE_ENV
});
