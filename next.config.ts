// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = false; // Disable source maps in dev mode
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)\\.map",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/installHook.js.map",
        destination: "/api/debug-install-hook",
      },
    ];
  },
};

export default nextConfig;