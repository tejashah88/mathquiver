import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';

import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
config.autoAddCss = false;

import ErrorBoundary from '@/components/ErrorBoundary';
import { enableConsoleExports } from '@/utils/export-mathfield-html';

export default function App({ Component, pageProps }: AppProps) {
  // Enable mathfield export utilities in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      enableConsoleExports();
    }
  }, []);

  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
