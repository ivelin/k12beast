// next-sitemap.config.js
// File path: next-sitemap.config.js
// Configures sitemap for K12Beast, including only root and /public/* pages
// Scans src/app/public for page.tsx and src/content/docs for page.mdx, excluding all other routes

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(process.cwd(), 'src/app/public');
const DOCS_DIR = path.join(process.cwd(), 'src/content/docs');

function getPublicPaths(dir, prefix, fileName) {
  console.log(`[Sitemap Config] Scanning directory: ${dir}`);
  const paths = [];
  if (!fs.existsSync(dir)) {
    console.log(`[Sitemap Config] Directory not found: ${dir}`);
    return paths;
  }
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      paths.push(...getPublicPaths(filePath, `${prefix}/${file}`, fileName));
    } else if (file === fileName) {
      const relativePath = prefix.endsWith('/public') ? '/public' : prefix;
      // Only include paths starting with /public/ or /public
      if (!relativePath.includes('[') && (relativePath === '/public' || relativePath.startsWith('/public/'))) {
        console.log(`[Sitemap Config] Including path: ${relativePath}`);
        paths.push({
          loc: relativePath,
          lastmod: new Date().toISOString(),
          changefreq: 'daily',
          priority: relativePath === '/public' ? 0.8 : 0.7,
        });
      } else {
        console.log(`[Sitemap Config] Excluding path: ${relativePath}`);
      }
    }
  });
  return paths;
}

module.exports = {
  siteUrl: 'https://k12beast.com',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  // Prevent automatic inclusion of src/app routes
  exclude: ['/*'], // Exclude all routes by default
  additionalPaths: async () => {
    console.log('[Sitemap Config] Generating sitemap paths');
    console.log(`[Sitemap Config] Environment: CI=${process.env.CI || 'false'}`);
    const paths = [
      {
        loc: '/',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: 1.0,
      },
    ];
    // Include all /public/* paths
    paths.push(...getPublicPaths(PUBLIC_DIR, '/public', 'page.tsx'));
    paths.push(...getPublicPaths(DOCS_DIR, '/public/docs', 'page.mdx'));
    console.log(`[Sitemap Config] Total paths generated: ${paths.length}`);
    return paths;
  },
};