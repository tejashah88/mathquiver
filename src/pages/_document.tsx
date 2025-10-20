/* eslint-disable @next/next/no-title-in-document-head */
import { Html, Head, Main, NextScript } from 'next/document';

const ENABLE_REACT_SCAN = false;

export default function Document() {
  const meta = {
    title: 'MathQuiver: Sane Equation Typing for Excel',
    description: 'A website that enables typing equations LaTeX-style and converting them to Excel functions, with variable mapping support.',
  };

  return (
    <Html lang="en">
      <Head>
        <title>{meta.title}</title>
        <meta name="robots" content="follow, index" />
        <meta name="description" content={meta.description} />
        <meta property="og:site_name" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:title" content={meta.title} />

        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        {ENABLE_REACT_SCAN && <script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />}
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
