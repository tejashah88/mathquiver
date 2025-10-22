import { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,

  // Export Settings
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },

  // GitHub Pages Settings
  basePath: '/mathquiver',

  // React Compiler
  reactCompiler: {
    compilationMode: 'annotation',
  },

  // Turbopack experimental
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};

export default config;
