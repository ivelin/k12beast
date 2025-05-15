// File path: tests/e2e/docs-rendering.spec.ts
// End-to-end test for K12Beast documentation pages to ensure UI rendering and SEO metadata
// Validates page content, title, meta tags, and Schema.org JSON-LD for search indexing

import { test, expect } from '@playwright/test';

test.describe('Documentation Pages Rendering', () => {
  test('should render /public/docs correctly with SEO metadata', async ({ page }) => {
    // Navigate to the documentation home page
    await page.goto('/public/docs');

    // Verify page renders with expected content
    const heading = page.locator('h1:has-text("K12Beast Documentation")');
    await expect(heading).toBeVisible();

    // Check page title
    await expect(page).toHaveTitle('K12Beast Documentation Home');

    // Verify SEO meta tags
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Welcome to the K12Beast documentation. Explore guides for Parents, Students, Teachers, and Tutors.'
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'K12Beast Documentation Home'
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      'Welcome to the K12Beast documentation. Explore guides for Parents, Students, Teachers, and Tutors.'
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://k12beast.com/docs'
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://k12beast.com/images/docs.png'
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
    expect(jsonLd.name).toBe('K12Beast Documentation Home');
    expect(jsonLd.description).toBe(
      'Welcome to the K12Beast documentation. Explore guides for Parents, Students, Teachers, and Tutors.'
    );
    expect(jsonLd.url).toBe('https://k12beast.com/docs');
  });

  test('should render /public/docs/getting-started correctly with SEO metadata', async ({ page }) => {
    // Navigate to the getting-started page
    await page.goto('/public/docs/getting-started');

    // Verify page renders with expected content
    const heading = page.locator('h1:has-text("Getting Started")');
    await expect(heading).toBeVisible();
    const subheading = page.locator('h2:has-text("First Steps")');
    await expect(subheading).toBeVisible();

    // Check page title
    await expect(page).toHaveTitle('Getting Started with K12Beast');

    // Verify SEO meta tags
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Learn how to get started with K12Beast, a personalized tutoring app for K12 students.'
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Getting Started with K12Beast'
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      'Learn how to get started with K12Beast, a personalized tutoring app for K12 students.'
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://k12beast.com/docs/getting-started'
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://k12beast.com/images/docs.png'
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://k12beast.com/docs/getting-started'
    );

    // Verify Schema.org JSON-LD
    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toHaveCount(1);
    const jsonLdContent = await jsonLdScript.textContent();
    const jsonLd = JSON.parse(jsonLdContent!);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('HowTo');
    expect(jsonLd.name).toBe('Getting Started with K12Beast');
    expect(jsonLd.description).toBe('A guide to help you get started with K12Beast for K-12 education.');
    expect(jsonLd.step).toHaveLength(3);
    expect(jsonLd.step[0].name).toBe('Sign Up');
    expect(jsonLd.step[1].name).toBe('Explore');
    expect(jsonLd.step[2].name).toBe('Start Learning');
  });
});