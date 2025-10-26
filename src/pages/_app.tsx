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

// Custom components
import ErrorBoundary from '@/components/ErrorBoundary';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
