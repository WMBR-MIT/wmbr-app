/**
 * Debug logging utilities
 * Conditional console logging that only outputs in development mode
 * This helps reduce battery drain by eliminating console.log overhead in production
 */

// Enable debug logging only in development mode
export const DEBUG = __DEV__;

/**
 * Conditional console logging that only outputs in development mode
 */
export const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args);
  }
};

export const debugError = (...args: any[]) => {
  if (DEBUG) {
    console.error(...args);
  }
};

export const debugWarn = (...args: any[]) => {
  if (DEBUG) {
    console.warn(...args);
  }
};