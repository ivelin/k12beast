// File path: scripts/generate-search-index.js
// Generates a search index for documentation pages during build
// Reads MDX files and creates a JSON file for client-side search

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const docsDir = path.join(process.cwd(), 'src/app/public/docs');
const index = [];

function readFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      readFiles(filePath);
    } else if (file === 'page.mdx') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data, content: body } = matter(content);
      const relativePath = filePath
        .replace(docsDir, '/public/docs')
        .replace('/page.mdx', '');
      index.push({
        id: filePath,
        title: data.title,
        description: data.description,
        content: body,
        path: relativePath,
      });
    }
  });
}

readFiles(docsDir);
fs.writeFileSync('public/search-index.json', JSON.stringify(index));