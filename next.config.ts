// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true, // Disable TypeScript errors during build
  },
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
};

export default nextConfig;