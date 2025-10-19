import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';

/**
 * Error fallback component displayed when an error is caught by the ErrorBoundary.
 * Shows a user-friendly error message with options to recover or reload.
 */
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md rounded-lg border border-red-300 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center">
          <svg
            className="mr-2 h-6 w-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="text-xl font-bold text-red-600">Something went wrong</h1>
        </div>

        <p className="mb-4 text-gray-700">
          We apologize for the inconvenience. An unexpected error occurred while processing your
          equations.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-4 rounded bg-gray-50 p-3">
            <summary className="cursor-pointer font-medium text-gray-900">
              Error details (dev mode only)
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-red-600">
              {error.toString()}
              {error.stack && (
                <>
                  {'\n\n'}
                  {error.stack}
                </>
              )}
            </pre>
          </details>
        )}

        <div className="flex gap-3">
          <button
            onClick={resetErrorBoundary}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Reload page
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          If this problem persists, try clearing your browser cache or contact support.
        </p>
      </div>
    </div>
  );
}

/**
 * Error handler called when an error is caught by the ErrorBoundary.
 * Logs errors in development mode.
 * In production, this is where you would send errors to an error reporting service.
 */
function logError(error: Error, info: React.ErrorInfo) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error('Error caught by boundary:', error);
    // eslint-disable-next-line no-console
    console.error('Component stack:', info.componentStack);
  }

  // In production, send to error reporting service
  // Example: Sentry.captureException(error, { extra: info });
}

/**
 * ErrorBoundary wrapper component.
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI.
 *
 * Features:
 * - User-friendly error fallback UI
 * - Error recovery without page reload
 * - Development mode error details
 * - Ready for production error reporting integration
 *
 * @example
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */
export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
      onReset={() => {
        // Optional: Reset app state here if needed
        // For example, clear local storage or reset global state
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
