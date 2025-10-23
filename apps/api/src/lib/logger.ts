import { logger } from '../lib/logger';
// Backend logging utility to control console spam
const DEBUG_ENABLED = process.env.NODE_ENV === 'development' && 
  process.env.DEBUG_LOGGING === 'true';

export const logger = {
  log: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      logger.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      logger.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors regardless of debug setting
    logger.error(...args);
  },
  info: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      logger.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      logger.log('🔍', ...args);
    }
  },
  auth: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      logger.log('🔐', ...args);
    }
  }
}; 