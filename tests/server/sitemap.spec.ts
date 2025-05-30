// tests/server/sitemap.spec.ts
// File path: tests/server/sitemap.spec.ts
// Verifies sitemap.xml generation includes all expected URLs
// Logs each URL comparison for precise debugging

import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { parseStringPromise } from 'xml2js';

describe('Sitemap Generation', () => {
  const sitemapPath = './public/sitemap.xml';

  beforeAll(() => {
    // Run next-sitemap CLI to generate sitemap.xml
    execSync('npm run sitemap', { stdio: 'inherit' });
  });

  afterAll(() => {
    // Clean up sitemap.xml
    if (existsSync(sitemapPath)) {
      unlinkSync(sitemapPath);
    }
  });

  it('includes all expected pages in sitemap.xml', async () => {
    // Read sitemap.xml
    const sitemapContent = readFileSync(sitemapPath, 'utf8');

    // Parse XML to JSON
    const parsed = await parseStringPromise(sitemapContent);
    const urls = parsed.urlset.url.map((u) => u.loc[0]).sort();

    // Expected pages
    const expectedUrls = [
      'https://k12beast.com',
      'https://k12beast.com/public/about',
      'https://k12beast.com/public/confirm-success',
      'https://k12beast.com/public/login',
      'https://k12beast.com/public/privacy',
      'https://k12beast.com/public/reset-password',
      'https://k12beast.com/public/signup',
      'https://k12beast.com/public/terms',
      'https://k12beast.com/public/docs',
      'https://k12beast.com/public/docs/getting-started',
      'https://k12beast.com/public/docs/students',
      'https://k12beast.com/public/docs/parents',
      'https://k12beast.com/public/docs/parents/introduction',
      'https://k12beast.com/public/docs/teachers',
      'https://k12beast.com/public/docs/teachers/classroom',
      'https://k12beast.com/public/docs/tutors',
      'https://k12beast.com/public/docs/tutors/guide',
      'https://k12beast.com/public/docs/subjects',
    ].sort();

    // Verify total number of URLs
    if (urls.length !== expectedUrls.length) {
      throw new Error(`URL count mismatch. Expected: ${expectedUrls.length}, Received: ${urls.length}, URLs: ${urls.join(', ')}`);
    }
    expect(urls.length).toBe(expectedUrls.length);

    // Compare each expected URL individually
    expectedUrls.forEach((expectedUrl, index) => {
      console.log(`Checking URL ${index}: ${expectedUrl}`);
      const found = urls.includes(expectedUrl);
      if (!found) {
        throw new Error(`URL at index ${index} not found: expected "${expectedUrl}", received: ${urls.join(', ')}`);
      }
      expect(found).toBe(true);
    });
  });
});