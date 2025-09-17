import { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,

  // Export Settings
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },

  // GitHub Pages Settings
  basePath: '/mathquiver',
};

export default config;
