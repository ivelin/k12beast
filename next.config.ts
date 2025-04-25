// File path: next.config.ts
// Updated to allow external image domains for testing and any Supabase storage URL

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true, // Disable TypeScript errors during build
  },
  images: {
    domains: ['mockurl.com'], // For tests
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co', // Allow any subdomain of supabase.co
        port: '', // Leave empty for default ports (80, 443)
        pathname: '/storage/v1/object/public/**', // Match Supabase storage paths
      },
    ],
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