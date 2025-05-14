// File path: tests/server/docs-mdx.spec.ts
// Unit tests for MDX documentation files in src/content/docs
// Validates absence of invalid comments, correct MDX formatting, SEO, and Schema.org metadata
// Uses structural checks with minimal regex, allows # or {/* */} comments before frontmatter

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import matter from 'gray-matter';

// Define the directory containing MDX files
const DOCS_DIR = resolve(process.cwd(), 'src/content/docs');

// Helper function to recursively get all .mdx files
function getMDXFiles(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) {
    console.error(`Directory does not exist: ${dir}`);
    return files;
  }
  try {
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...getMDXFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  return files;
}

// Populate mdxFiles at module level for test registration
const mdxFiles: string[] = getMDXFiles(DOCS_DIR);

// Expected frontmatter fields for SEO
const REQUIRED_FRONTMATTER: string[] = [
  'title',
  'description',
  'ogTitle',
  'ogDescription',
  'ogType',
  'ogUrl',
  'ogImage',
  'canonical',
];

describe('MDX Documentation Files', () => {
  beforeAll(() => {
    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`Scanning directory: ${DOCS_DIR}`);
    console.log(`Found ${mdxFiles.length} MDX files:`, mdxFiles.map(f => f.replace(process.cwd(), '')));
  });

  it('should find MDX files in src/content/docs', () => {
    expect(mdxFiles.length).toBeGreaterThan(0);
  });

  describe('Invalid Comments', () => {
    mdxFiles.forEach(filePath => {
      it(`should not contain invalid comments in ${filePath.replace(process.cwd(), '')}`, () => {
        const content = readFileSync(filePath, 'utf8').trim();
        const relativePath = filePath.replace(process.cwd(), '');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const trimmedLine = line.trim();
          if (
            trimmedLine.startsWith('//') ||
            trimmedLine.startsWith('<!--') ||
            trimmedLine.startsWith('<~-')
          ) {
            throw new Error(`Invalid comment found at line ${index + 1} in ${relativePath}: ${trimmedLine}`);
          }
        });
      });
    });
  });

  describe('MDX Formatting', () => {
    mdxFiles.forEach(filePath => {
      it(`should be valid MDX with frontmatter in ${filePath.replace(process.cwd(), '')}`, () => {
        const content = readFileSync(filePath, 'utf8').trim();
        const relativePath = filePath.replace(process.cwd(), '');

        // Find frontmatter delimiters
        const lines = content.split('\n');
        let frontmatterStart = -1;
        let frontmatterEnd = -1;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === '---' && frontmatterStart === -1) {
            frontmatterStart = i;
          } else if (line === '---' && frontmatterStart !== -1 && frontmatterEnd === -1) {
            frontmatterEnd = i;
            break;
          }
        }

        if (frontmatterStart < 0) {
          console.log(`First 5 lines of ${relativePath}:`, lines.slice(0, 5).join('\n'));
          throw new Error(`${relativePath} lacks opening --- delimiter`);
        }
        if (frontmatterEnd <= frontmatterStart) {
          console.log(`First 5 lines of ${relativePath}:`, lines.slice(0, 5).join('\n'));
          throw new Error(`${relativePath} lacks closing --- delimiter`);
        }

        // Extract frontmatter content
        let frontmatter: { [key: string]: any };
        try {
          const { data, content: rawContent } = matter(content);
          frontmatter = data;
          if (!frontmatter) {
            console.log(`Raw frontmatter content in ${relativePath}:`, rawContent.split('\n').slice(frontmatterStart, frontmatterEnd + 1).join('\n'));
            throw new Error(`${relativePath} has empty frontmatter`);
          }
        } catch (error) {
          console.log(`Raw file content (first 10 lines) in ${relativePath}:`, content.split('\n').slice(0, 10).join('\n'));
          throw new Error(`${relativePath} has invalid frontmatter: ${error.message}`);
        }

        // Check content after frontmatter
        const contentAfterFrontmatter = lines.slice(frontmatterEnd + 1).join('\n');
        if (!contentAfterFrontmatter.trim()) {
          throw new Error(`${relativePath} has no content after frontmatter`);
        }
      });
    });
  });

  describe('SEO Metadata', () => {
    mdxFiles.forEach(filePath => {
      it(`should have complete SEO metadata in ${filePath.replace(process.cwd(), '')}`, () => {
        const content = readFileSync(filePath, 'utf8').trim();
        const relativePath = filePath.replace(process.cwd(), '');

        let frontmatter: { [key: string]: any };
        try {
          const { data } = matter(content);
          frontmatter = data;
        } catch (error) {
          console.log(`Raw file content (first 10 lines) in ${relativePath}:`, content.split('\n').slice(0, 10).join('\n'));
          throw new Error(`${relativePath} has invalid frontmatter: ${error.message}`);
        }

        REQUIRED_FRONTMATTER.forEach(field => {
          if (!frontmatter[field]) {
            console.log(`Frontmatter in ${relativePath}:`, frontmatter);
            throw new Error(`${relativePath} missing frontmatter field: ${field}`);
          }
        });

        if (typeof frontmatter.title !== 'string') {
          throw new Error(`${relativePath} title is not a string`);
        }
        if (typeof frontmatter.description !== 'string') {
          throw new Error(`${relativePath} description is not a string`);
        }
        if (frontmatter.description.length < 50) {
          throw new Error(`${relativePath} description is too short (must be at least 50 characters)`);
        }
        if (!frontmatter.ogUrl.match(/^https?:\/\/[^\s/$.?#[].*[^\s]$/)) {
          throw new Error(`${relativePath} ogUrl is not a valid URL`);
        }
        if (!frontmatter.ogImage.match(/^https?:\/\/[^\s/$.?#[].*[^\s]$/)) {
          throw new Error(`${relativePath} ogImage is not a valid URL`);
        }
        if (!frontmatter.canonical.match(/^https?:\/\/[^\s/$.?#[].*[^\s]$/)) {
          throw new Error(`${relativePath} canonical is not a valid URL`);
        }
      });
    });
  });

  describe('Schema.org Metadata', () => {
    mdxFiles.forEach(filePath => {
      it(`should include valid Schema.org JSON-LD in ${filePath.replace(process.cwd(), '')}`, () => {
        const content = readFileSync(filePath, 'utf8').trim();
        const relativePath = filePath.replace(process.cwd(), '');

        const scriptStart = '<script type="application/ld+json">';
        const scriptEnd = '</script>';
        let startIndex = content.indexOf(scriptStart);
        let foundJsonLd = false;

        while (startIndex !== -1) {
          const endIndex = content.indexOf(scriptEnd, startIndex + scriptStart.length);
          if (endIndex === -1) {
            throw new Error(`${relativePath} has unclosed JSON-LD script tag at index ${startIndex}`);
          }

          const jsonLdContent = content.slice(startIndex + scriptStart.length, endIndex).trim();
          try {
            const jsonLd = JSON.parse(jsonLdContent);
            if (jsonLd['@context'] !== 'https://schema.org') {
              throw new Error(`${relativePath} JSON-LD lacks valid @context (expected https://schema.org)`);
            }
            if (!jsonLd['@type']) {
              throw new Error(`${relativePath} JSON-LD lacks @type`);
            }
            if (typeof jsonLd['@type'] !== 'string') {
              throw new Error(`${relativePath} JSON-LD @type is not a string`);
            }
            foundJsonLd = true;
          } catch (error) {
            throw new Error(`${relativePath} has invalid JSON-LD at index ${startIndex}: ${error.message}`);
          }

          startIndex = content.indexOf(scriptStart, endIndex + scriptEnd.length);
        }

        if (!foundJsonLd) {
          throw new Error(`${relativePath} has no valid JSON-LD script tags`);
        }
      });
    });
  });
});