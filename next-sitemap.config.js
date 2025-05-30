// next-sitemap.config.js
// File path: next-sitemap.config.js
// Configures sitemap for K12Beast, including only root and public pages
// Scans directories for page.tsx and page.mdx files, excluding dynamic routes and non-public paths

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(process.cwd(), 'src/app/public');
const DOCS_DIR = path.join(process.cwd(), 'src/content/docs');

function addPaths(dir, prefix, fileName) {
  const paths = [];
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      paths.push(...addPaths(filePath, `${prefix}/${file}`, fileName));
    } else if (file === fileName) {
      const relativePath = prefix.endsWith('/public') ? '/public' : prefix;
      // Exclude dynamic routes and non-public paths
      if (!relativePath.includes('[') && (relativePath === '/public' || relativePath.startsWith('/public/'))) {
        paths.push({
          loc: relativePath,
          lastmod: new Date().toISOString(),
          changefreq: 'daily',
          priority: relativePath === '/public' ? 0.8 : 0.7,
        });
      }
    }
  });
  return paths;
}

module.exports = {
  siteUrl: 'https://k12beast.com',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  additionalPaths: async () => {
    const paths = [
      {
        loc: '/',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: 1.0,
      },
    ];
    paths.push(...addPaths(PUBLIC_DIR, '/public', 'page.tsx'));
    paths.push(...addPaths(DOCS_DIR, '/public/docs', 'page.mdx'));
    return paths;
  },
};