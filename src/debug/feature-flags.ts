/**
 * Feature flags for environment-specific behavior
 *
 * These flags allow centralized control of features that vary between
 * development and production environments. All environment checks should
 * go through this module for consistency and testability.
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const FLAGS = {
  /**
   * Enable debug console logging (errors, warnings, etc.)
   * Only active in development mode
   */
  enableDebugLogging: isDevelopment,

  /**
   * Show detailed error information in the UI
   * Only active in development mode
   */
  showDetailedErrors: isDevelopment,

  /**
   * Enable "unsaved work" warning before page unload
   * Only active in production mode
   */
  enableBeforeUnloadWarning: isProduction,
} as const;
