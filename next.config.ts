import { NextConfig } from "next";

import withPWAInit, { PWAConfig } from "next-pwa";

const isExport = process.env.NEXT_STATIC_EXPORT === "true";

// Enable offline support out-of-the-box
const withPWA = withPWAInit({
  dest: "public",         // output service worker here
  register: true,         // auto register the service worker
  skipWaiting: true,      // activate new SW immediately
});

const config: PWAConfig = withPWA({
  reactStrictMode: true,

  // Export Settings
  output: 'export',
  assetPrefix: isExport ? './' : undefined,
  trailingSlash: true,
  images: { unoptimized: true },

  // GitHub Pages Settings
  basePath: isExport ? "/mathquiver" : undefined,
});

export default config;
