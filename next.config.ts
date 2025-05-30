// next.config.ts
// File path: next.config.ts
// Configures Next.js for K12Beast, including MDX support for documentation pages
// Allows external image domains for testing and Supabase storage URLs
// Disables TypeScript build errors and source maps in development
// Sets cache control headers for source maps
// Configures MDX to strip comments and frontmatter, with GFM support for tables

import type { NextConfig } from 'next';
import createMDX from '@next/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkRemoveComments from 'remark-remove-comments';
import { remove } from 'unist-util-remove';

// Custom remark plugin to remove frontmatter node from the MDX AST
function remarkRemoveFrontmatter() {
  return (tree: any) => {
    remove(tree, { type: 'yaml' });
    return tree;
  };
}

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['mockurl.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = false;
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)\\.map',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [
      remarkFrontmatter,
      remarkRemoveFrontmatter,
      remarkRemoveComments,
      remarkGfm,
    ],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);