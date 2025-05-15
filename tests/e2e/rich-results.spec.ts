// File path: tests/e2e/rich-results.spec.ts
// E2E tests to validate rendered Schema.org JSON-LD for rich results
// Checks that documentation pages include valid JSON-LD in <script> tags

import { test, expect } from './fixtures';

// Schema.org type-specific required fields for rich results
const SCHEMA_REQUIREMENTS: { [key: string]: string[] } = {
  Article: ['headline', 'datePublished', 'author'],
  FAQPage: ['mainEntity'],
  HowTo: ['step'],
  EducationalOrganization: ['name', 'description'],
};

test.describe('Rich Results Validation', () => {
  test.beforeEach(async ({ page, login }) => {
    await login(); // Ensure user is logged in
  });

  test('should render valid Schema.org JSON-LD on /public/docs page', async ({ page }) => {
    await page.goto('/public/docs');

    // Find the JSON-LD script tag
    const jsonLdScript = await page.locator('script[type="application/ld+json"]').first();
    expect(jsonLdScript, 'JSON-LD script tag should be present').toBeTruthy();

    // Extract and parse JSON-LD content
    const jsonLdContent = await jsonLdScript.textContent();
    expect(jsonLdContent, 'JSON-LD content should not be empty').toBeTruthy();

    let jsonLd;
    try {
      jsonLd = JSON.parse(jsonLdContent!);
    } catch (error) {
      throw new Error(`Invalid JSON-LD on /docs: ${error.message}`);
    }

    // Validate Schema.org basics
    expect(jsonLd['@context'], 'JSON-LD should have valid @context').toBe('https://schema.org');
    expect(jsonLd['@type'], 'JSON-LD should have @type').toBeTruthy();
    expect(typeof jsonLd['@type'], 'JSON-LD @type should be a string').toBe('string');

    // Validate required fields for the Schema.org type
    const requiredFields = SCHEMA_REQUIREMENTS[jsonLd['@type']] || [];
    for (const field of requiredFields) {
      expect(jsonLd[field], `JSON-LD missing required field for ${jsonLd['@type']}: ${field}`).toBeTruthy();
    }

    // Specific validation for FAQPage
    if (jsonLd['@type'] === 'FAQPage') {
      expect(Array.isArray(jsonLd.mainEntity) && jsonLd.mainEntity.length > 0, 'FAQPage mainEntity should be a non-empty array').toBe(true);
      for (let i = 0; i < jsonLd.mainEntity.length; i++) {
        const entity = jsonLd.mainEntity[i];
        expect(entity['@type'], `FAQPage mainEntity[${i}] should have @type 'Question'`).toBe('Question');
        expect(entity.name, `FAQPage mainEntity[${i}] should have name`).toBeTruthy();
        expect(entity.acceptedAnswer?.text, `FAQPage mainEntity[${i}] should have acceptedAnswer.text`).toBeTruthy();
      }
    }
  });

  test('should render valid Schema.org JSON-LD on /public/docs/getting-started page', async ({ page }) => {
    await page.goto('/public/docs/getting-started');

    // Find the JSON-LD script tag
    const jsonLdScript = await page.locator('script[type="application/ld+json"]').first();
    expect(jsonLdScript, 'JSON-LD script tag should be present').toBeTruthy();

    // Extract and parse JSON-LD content
    const jsonLdContent = await jsonLdScript.textContent();
    expect(jsonLdContent, 'JSON-LD content should not be empty').toBeTruthy();

    let jsonLd;
    try {
      jsonLd = JSON.parse(jsonLdContent!);
    } catch (error) {
      throw new Error(`Invalid JSON-LD on /docs/getting-started: ${error.message}`);
    }

    // Validate Schema.org basics
    expect(jsonLd['@context'], 'JSON-LD should have valid @context').toBe('https://schema.org');
    expect(jsonLd['@type'], 'JSON-LD should have @type').toBeTruthy();
    expect(typeof jsonLd['@type'], 'JSON-LD @type should be a string').toBe('string');

    // Validate required fields for the Schema.org type
    const requiredFields = SCHEMA_REQUIREMENTS[jsonLd['@type']] || [];
    for (const field of requiredFields) {
      expect(jsonLd[field], `JSON-LD missing required field for ${jsonLd['@type']}: ${field}`).toBeTruthy();
    }

    // Specific validation for FAQPage
    if (jsonLd['@type'] === 'FAQPage') {
      expect(Array.isArray(jsonLd.mainEntity) && jsonLd.mainEntity.length > 0, 'FAQPage mainEntity should be a non-empty array').toBe(true);
      for (let i = 0; i < jsonLd.mainEntity.length; i++) {
        const entity = jsonLd.mainEntity[i];
        expect(entity['@type'], `FAQPage mainEntity[${i}] should have @type 'Question'`).toBe('Question');
        expect(entity.name, `FAQPage mainEntity[${i}] should have name`).toBeTruthy();
        expect(entity.acceptedAnswer?.text, `FAQPage mainEntity[${i}] should have acceptedAnswer.text`).toBeTruthy();
      }
    }
  });
});