// Import Mathlive LaTeX rendering fonts first
import 'mathlive/fonts.css';

// Font Awesome icon styles
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
config.autoAddCss = false;

// Import custom styles
import '@/styles/globals.css';

// Default library imports
import type { AppProps } from 'next/app';
import { useEffect } from 'react';

// Custom components
import ErrorBoundary from '@/components/ErrorBoundary';
import { enableConsoleExports } from '@/tools/export-mathfield/run';
import { FLAGS } from '@/utils/feature-flags';

export default function App({ Component, pageProps }: AppProps) {
  // Enable mathfield export utilities in development mode
  useEffect(() => {
    if (FLAGS.enableDebugLogging) {
      enableConsoleExports();
    }
  }, []);

  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
