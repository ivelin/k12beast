// File path: tests/e2e/docs-rendering.spec.ts
// End-to-end test for K12Beast documentation pages to ensure UI rendering and SEO metadata
// Validates page content, title, meta tags, and Schema.org JSON-LD for search indexing

import { test, expect } from '@playwright/test';

test.describe('Documentation Pages Rendering', () => {
  test('should render /public/docs correctly with SEO metadata', async ({ page }) => {
    // Navigate to the documentation home page
    await page.goto('/public/docs');

    const title = 'K12Beast Documentation Home';
    const subtitle = 'Discover K12Beast\'s AI-powered tutoring platform with guides for Parents, Students, Teachers, and Tutors to enhance K-12 learning.'


    // Verify page renders with expected content
    const heading = page.locator('h1:has-text("K12Beast Documentation")');
    await expect(heading).toBeVisible();

    // Check page title
    await expect(page).toHaveTitle(title);

    // Verify SEO meta tags
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      subtitle
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      title
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      subtitle
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://k12beast.com/docs'
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://k12beast.com/docs'
    );

    // Verify Schema.org JSON-LD
    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toHaveCount(1);
    const jsonLdContent = await jsonLdScript.textContent();
    const jsonLd = JSON.parse(jsonLdContent!);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('WebPage');
    expect(jsonLd.name).toBe(title);
    expect(jsonLd.description).toBe(
      subtitle
    );
    expect(jsonLd.url).toBe('https://k12beast.com/docs');
  });

});