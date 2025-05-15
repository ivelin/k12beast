// File path: tests/e2e/rich-results.spec.ts
// E2E tests to validate SEO and Schema.org JSON-LD for rich results on public pages
// Navigates from home page to all public pages, skipping protected ones

import { test, expect } from './fixtures';

// Schema.org type-specific required fields for rich results
const SCHEMA_REQUIREMENTS: { [key: string]: string[] } = {
  Article: ['headline', 'datePublished', 'author'],
  FAQPage: ['mainEntity'],
  HowTo: ['step'],
  EducationalOrganization: ['name', 'description'],
};

// List of public pages to test (based on app structure)
const PUBLIC_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/public/about', name: 'About' },
  { path: '/public/docs', name: 'Docs' },
  { path: '/public/docs/getting-started', name: 'Docs - Getting Started' },
  { path: '/public/login', name: 'Login' },
  { path: '/public/signup', name: 'Signup' },
  { path: '/public/reset-password', name: 'Reset Password' },
  { path: '/public/confirm-success', name: 'Confirm Success' },
  { path: '/public/privacy', name: 'Privacy' },
  { path: '/public/terms', name: 'Terms' },
];

test.describe('Rich Results Validation', () => {
  test.beforeEach(async ({ page, login }) => {
    await login(); // Ensure user is logged in
    await page.goto('/'); // Start from home page
  });

  test('should validate SEO and Schema.org JSON-LD on all public pages', async ({ page }) => {
    for (const { path, name } of PUBLIC_PAGES) {
      console.log(`Testing page: ${name} (${path})`);

      // Navigate to the page
      await page.goto(path);

      // Check if redirected to login (indicating protected page)
      const currentUrl = page.url();
      if (currentUrl.includes('/public/login')) {
        console.log(`Skipping protected page: ${name} (${path})`);
        continue;
      }

      // Validate SEO metadata
      const title = await page.locator('head > title').textContent();
      expect(title, `${name} should have a title`).toBeTruthy();
      expect(title!.length, `${name} title should be non-empty`).toBeGreaterThan(0);

      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description, `${name} should have a meta description`).toBeTruthy();
      expect(description!.length, `${name} description should be at least 50 characters`).toBeGreaterThanOrEqual(50);

      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      expect(ogTitle, `${name} should have an og:title`).toBeTruthy();

      const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
      expect(ogDescription, `${name} should have an og:description`).toBeTruthy();

      // Validate Schema.org JSON-LD
      const jsonLdScript = await page.locator('script[type="application/ld+json"]').first();
      expect(jsonLdScript, `${name} should have a JSON-LD script tag`).toBeTruthy();

      const jsonLdContent = await jsonLdScript.textContent();
      expect(jsonLdContent, `${name} JSON-LD content should not be empty`).toBeTruthy();

      let jsonLd;
      try {
        jsonLd = JSON.parse(jsonLdContent!);
      } catch (error) {
        throw new Error(`Invalid JSON-LD on ${name} (${path}): ${error.message}`);
      }

      // Validate Schema.org basics
      expect(jsonLd['@context'], `${name} JSON-LD should have valid @context`).toBe('https://schema.org');
      expect(jsonLd['@type'], `${name} JSON-LD should have @type`).toBeTruthy();
      expect(typeof jsonLd['@type'], `${name} JSON-LD @type should be a string`).toBe('string');

      // Validate required fields for the Schema.org type
      const requiredFields = SCHEMA_REQUIREMENTS[jsonLd['@type']] || [];
      for (const field of requiredFields) {
        expect(jsonLd[field], `${name} JSON-LD missing required field for ${jsonLd['@type']}: ${field}`).toBeTruthy();
      }

      // Specific validation for FAQPage
      if (jsonLd['@type'] === 'FAQPage') {
        expect(Array.isArray(jsonLd.mainEntity) && jsonLd.mainEntity.length > 0, `${name} FAQPage mainEntity should be a non-empty array`).toBe(true);
        for (let i = 0; i < jsonLd.mainEntity.length; i++) {
          const entity = jsonLd.mainEntity[i];
          expect(entity['@type'], `${name} FAQPage mainEntity[${i}] should have @type 'Question'`).toBe('Question');
          expect(entity.name, `${name} FAQPage mainEntity[${i}] should have name`).toBeTruthy();
          expect(entity.acceptedAnswer?.text, `${name} FAQPage mainEntity[${i}] should have acceptedAnswer.text`).toBeTruthy();
        }
      }
    }
  });
});