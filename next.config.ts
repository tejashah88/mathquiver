import { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,

  // Export Settings
  output: 'export',
  // assetPrefix: './',
  trailingSlash: true,
  images: { unoptimized: true },

  // GitHub Pages Settings
  basePath: '/mathquiver',
};
console.log(config);

export default config;
