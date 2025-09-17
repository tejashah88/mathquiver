import { NextConfig } from "next";
import withPWAInit from "next-pwa";

const isExport = process.env.NEXT_STATIC_EXPORT === "true";

// Enable offline support out-of-the-box
const withPWA = withPWAInit({
  dest: "public",         // output service worker here
  register: true,         // auto register the service worker
  skipWaiting: true,      // activate new SW immediately
});

const config: NextConfig = {
  reactStrictMode: true,

  // Export Settings
  output: 'export',
  assetPrefix: isExport ? './' : undefined,
  trailingSlash: true,
  images: { unoptimized: true },

  // GitHub Pages Settings
  basePath: isExport ? "/mathquiver" : undefined,
};

console.log(process.env.NEXT_RUNTIME)
console.log(process.env.NODE_ENV)

export default isExport
  ? withPWA(config) // Webpack build
  : config;         // Turbopack dev (ignores pwa)
