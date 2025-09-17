import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Export Settings
  output: 'export',
  assetPrefix: './',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },

  // GitHub Pages Settings
  basePath: "/mathquiver",
};

export default nextConfig;
