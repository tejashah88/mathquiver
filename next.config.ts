import withPWAInit, { PWAConfig } from "next-pwa";

// Enable offline support out-of-the-box
const withPWA = withPWAInit({
  dest: "public",         // output service worker here
  register: true,         // auto register the service worker
  skipWaiting: true,      // activate new SW immediately
});

const nextConfig: PWAConfig = withPWA({
  reactStrictMode: true,

  // Export Settings
  output: 'export',
  assetPrefix: './',
  trailingSlash: true,
  images: { unoptimized: true },

  // GitHub Pages Settings
  basePath: "/mathquiver",
});

export default nextConfig;
