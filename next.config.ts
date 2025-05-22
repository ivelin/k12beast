// File path: next.config.ts
// Configures Next.js for K12Beast, including MDX support for documentation pages
// Allows external image domains for testing and Supabase storage URLs
// Disables TypeScript build errors and source maps in development
// Sets cache control headers for source maps
// Configures MDX to strip comments and frontmatter from rendering, with GFM support for tables

import type { NextConfig } from 'next';
import createMDX from '@next/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm'; // Added for GFM table support
import remarkRemoveComments from 'remark-remove-comments';
import { remove } from 'unist-util-remove';

// Custom remark plugin to remove frontmatter node from the MDX AST
function remarkRemoveFrontmatter() {
  return (tree: any) => {
    remove(tree, { type: 'yaml' }); // Remove frontmatter (yaml node)
    return tree;
  };
}

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
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'], // Enable MDX pages
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [
      remarkFrontmatter, // Parse frontmatter
      remarkRemoveFrontmatter, // Remove frontmatter from rendering
      remarkRemoveComments, // Remove comments (e.g., lines starting with //)
      remarkGfm, // Enable GitHub Flavored Markdown for table support,
    ],
    // Add rehype plugins here if needed in the future
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);