// next-sitemap.config.js
// File path: next-sitemap.config.js
// Configures sitemap for K12Beast, including home, public, and documentation pages
// Scans directories for page.tsx and page.mdx files, excluding dynamic routes

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
      if (!relativePath.includes('[')) {
        paths.push({
          loc: relativePath,
          lastmod: new Date().toISOString(),
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
      },
    ];
    paths.push(...addPaths(PUBLIC_DIR, '/public', 'page.tsx'));
    paths.push(...addPaths(DOCS_DIR, '/public/docs', 'page.mdx'));
    return paths;
  },
};