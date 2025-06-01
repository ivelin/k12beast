// File path: tests/e2e/docs-navigation.spec.ts
// E2E tests for navigating the documentation tree from /public/docs
// Dynamically crawls all sidebar links and ensures no broken links

import { test, expect } from '@playwright/test';

test.describe('Documentation Navigation', () => {
  test('No broken links in documentation sidebar', async ({ page }) => {
    // Set a desktop viewport to ensure the sidebar is visible
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to the root documentation page
    await page.goto('/public/docs', { waitUntil: 'domcontentloaded' });
    console.log('Navigated to /public/docs');

    // Verify the sidebar is present
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 5000 });
    console.log('Sidebar visibility confirmed');

    // Expand all accordion sections to reveal hidden links
    const accordionTriggers = page.locator('button.flex.items-center.justify-between.w-full');
    const triggerCount = await accordionTriggers.count();
    console.log(`Found ${triggerCount} accordion triggers`);

    for (let i = 0; i < triggerCount; i++) {
      const trigger = accordionTriggers.nth(i);
      if (await trigger.isVisible()) {
        await trigger.click();
        console.log(`Expanded accordion trigger ${i + 1}/${triggerCount}`);
        await page.waitForTimeout(1000); // Wait for animation to complete
      }
    }

    // Collect all unique sidebar links with their text
    const allLinks = [];
    const sidebarLinks = page.locator('aside a[href^="/public/docs"]');
    const linkCount = await sidebarLinks.count();
    console.log(`Found ${linkCount} sidebar links`);

    for (let i = 0; i < linkCount; i++) {
      const href = await sidebarLinks.nth(i).getAttribute('href');
      const text = await sidebarLinks.nth(i).innerText();
      if (href && text) {
        allLinks.push({ href, text });
      }
    }
    console.log('Links to validate:', allLinks.map(link => link.href));

    // Test each link for successful navigation and content
    const brokenLinks = [];
    for (const link of allLinks) {
      const { href, text } = link;
      console.log(`Checking link: ${href} with text: ${text}`);

      // Navigate to the link
      await page.goto(href, { waitUntil: 'domcontentloaded' });

      // Check for the expected <h1> heading
      const headingLocator = page.locator(`h1:has-text("${text}")`);
      try {
        await headingLocator.waitFor({ state: 'visible', timeout: 5000 });
      } catch (error) {
        console.log(`Heading "${text}" not found on ${href}`);
        brokenLinks.push(`Link ${href} - Expected heading "${text}" not found`);
      }

      // Check for 404 indicators
      const is404 = await page.evaluate(() => {
        return document.body.innerText.includes('Page not found') || document.title.includes('404');
      });
      if (is404) {
        brokenLinks.push(`Link ${href} - 404 page detected`);
      }

      // Return to /public/docs and re-expand accordions
      await page.goto('/public/docs', { waitUntil: 'domcontentloaded' });
      for (let i = 0; i < triggerCount; i++) {
        const trigger = accordionTriggers.nth(i);
        if (await trigger.isVisible()) {
          await trigger.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Fail the test if any broken links are found
    if (brokenLinks.length > 0) {
      throw new Error(`Found broken links:\n${brokenLinks.join('\n')}`);
    }
  });
});