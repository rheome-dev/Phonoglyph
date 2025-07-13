// Backend logging utility to control console spam
const DEBUG_ENABLED = process.env.NODE_ENV === 'development' && 
  process.env.DEBUG_LOGGING === 'true';

export const logger = {
  log: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors regardless of debug setting
    console.error(...args);
  },
  info: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.log('🔍', ...args);
    }
  },
  auth: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.log('🔐', ...args);
    }
  }
}; 