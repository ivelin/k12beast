// tests/server/sitemap.spec.ts
// Tests sitemap generation for K12Beast, ensuring only root and public pages are included
import { readFile, existsSync } from 'fs';
import { parseStringPromise } from 'xml2js';
import { resolve } from 'path';
import { promisify } from 'util';

const readFileAsync = promisify(readFile);

describe('Sitemap Generation', () => {
  test('includes only root and public pages in sitemap.xml', async () => {
    // Resolve path to sitemap
    const sitemapPath = resolve('public/sitemap.xml');
    console.log(`[Sitemap Test] Checking for sitemap at: ${sitemapPath}`);

    // Check if sitemap file exists
    if (!existsSync(sitemapPath)) {
      throw new Error(
        'Sitemap file not found at public/sitemap.xml. Ensure `npm run build` and `npm run sitemap` are run before tests. Check `next-sitemap.config.js` and `npm run sitemap` output for errors.'
      );
    }

    // Read the generated sitemap
    const sitemapContent = await readFileAsync(sitemapPath, 'utf-8');

    // Parse XML to extract URLs
    const parsed = await parseStringPromise(sitemapContent);
    const urls = parsed.urlset.url.map((entry: { loc: string[] }) => entry.loc[0]);
    console.log(`[Sitemap Test] Parsed URLs: ${urls.join(', ')}`);

    // Define expected URLs based on site structure and documentation plan
    const expectedUrls = [
      'https://k12beast.com',
      'https://k12beast.com/public/about',
      'https://k12beast.com/public/confirm-success',
      'https://k12beast.com/public/docs',
      'https://k12beast.com/public/docs/getting-started',
      'https://k12beast.com/public/docs/parents',
      'https://k12beast.com/public/docs/parents/introduction',
      'https://k12beast.com/public/docs/students',
      'https://k12beast.com/public/docs/subjects',
      'https://k12beast.com/public/docs/teachers',
      'https://k12beast.com/public/docs/teachers/classroom',
      'https://k12beast.com/public/docs/tutors',
      'https://k12beast.com/public/docs/tutors/guide',
      'https://k12beast.com/public/login',
      'https://k12beast.com/public/privacy',
      'https://k12beast.com/public/reset-password',
      'https://k12beast.com/public/signup',
      'https://k12beast.com/public/terms',
    ];

    // Verify total number of URLs
    if (urls.length !== expectedUrls.length) {
      console.log(`[Sitemap Test] URL count mismatch. Expected: ${expectedUrls.length}, Received: ${urls.length}`);
      throw new Error(`URL count mismatch. Expected: ${expectedUrls.length}, Received: ${urls.length}, URLs: ${urls.join(', ')}`);
    }
    expect(urls.length).toBe(expectedUrls.length);

    // Verify all URLs are either root or start with /public/
    for (const url of urls) {
      if (!url.match(/^https:\/\/k12beast\.com(\/?|\/public\/.*)$/)) {
        console.log(`[Sitemap Test] Invalid URL format: ${url}`);
      }
      expect(url).toMatch(/^https:\/\/k12beast\.com(\/?|\/public\/.*)$/);
      expect(expectedUrls).toContain(url);
    }

    // Verify all expected URLs are present
    for (const expectedUrl of expectedUrls) {
      if (!urls.includes(expectedUrl)) {
        console.log(`[Sitemap Test] Missing expected URL: ${expectedUrl}`);
      }
      expect(urls).toContain(expectedUrl);
    }
  });
});