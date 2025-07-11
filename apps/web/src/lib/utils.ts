import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Debug logging utility to control console spam
const DEBUG_ENABLED = process.env.NODE_ENV === 'development' && 
  (process.env.NEXT_PUBLIC_DEBUG_LOGGING === 'true' || 
   typeof window !== 'undefined' && (window as any).__DEBUG_LOGGING__);

export const debugLog = {
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
  }
};

// Allow toggling debug logging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__DEBUG_LOGGING__ = false;
  (window as any).__toggleDebugLogging = () => {
    (window as any).__DEBUG_LOGGING__ = !(window as any).__DEBUG_LOGGING__;
    console.log('Debug logging:', (window as any).__DEBUG_LOGGING__ ? 'enabled' : 'disabled');
  };
}
