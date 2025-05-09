// File path: tests/e2e/docs-navigation.spec.ts
// E2E tests for navigating the documentation tree and ensuring no broken links

import { test, expect } from '@playwright/test';

test.describe('Documentation Navigation', () => {
  test('No broken links in documentation tree', async ({ page }) => {
    // Set a desktop viewport to ensure the sidebar is visible (md:block)
    await page.setViewportSize({ width: 1280, height: 720 });

    // Start at the root documentation page
    await page.goto('/public/docs/parents/introduction', { waitUntil: 'domcontentloaded' });

    // Verify the sidebar is visible
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 5000 });
    console.log('Sidebar visibility confirmed');

    // Track visited URLs and collect broken links
    const visitedUrls = new Set<string>();
    const brokenLinks: string[] = [];

    // Expand all accordions in the sidebar to ensure all links are visible
    const accordionTriggers = page.locator('[data-testid="accordion-trigger"]');
    let triggerCount = await accordionTriggers.count();
    console.log(`Found ${triggerCount} accordion triggers to expand`);

    // If data-testid fails, fall back to a more reliable locator (e.g., by class or text)
    if (triggerCount === 0) {
      console.log('Falling back to alternative locator for accordion triggers');
      const triggerElements = page.locator('.hover\\:no-underline'); // Class from AccordionTrigger
      triggerCount = await triggerElements.count();
      console.log(`Found ${triggerCount} accordion triggers with fallback locator`);

      for (let i = 0; i < triggerCount; i++) {
        const trigger = triggerElements.nth(i);
        const isVisible = await trigger.isVisible();
        if (isVisible) {
          await trigger.click();
          console.log(`Expanded accordion trigger ${i + 1}/${triggerCount}`);
          await page.waitForTimeout(500); // Wait for accordion animation
        } else {
          console.log(`Accordion trigger ${i + 1}/${triggerCount} is not visible`);
        }
      }
    } else {
      for (let i = 0; i < triggerCount; i++) {
        const trigger = accordionTriggers.nth(i);
        const isVisible = await trigger.isVisible();
        if (isVisible) {
          await trigger.click();
          console.log(`Expanded accordion trigger ${i + 1}/${triggerCount}`);
          await page.waitForTimeout(500); // Wait for accordion animation
        } else {
          console.log(`Accordion trigger ${i + 1}/${triggerCount} is not visible`);
        }
      }
    }

    // Collect all links dynamically by traversing the sidebar
    const allLinks = new Set<string>();
    const sidebarLinks = page.getByRole('link');
    let linkCount = await sidebarLinks.count();
    console.log(`Found ${linkCount} links in the sidebar after expansion`);

    for (let i = 0; i < linkCount; i++) {
      const href = await sidebarLinks.nth(i).getAttribute('href');
      if (href && href.startsWith('/public/docs')) {
        allLinks.add(href);
      }
    }
    console.log('Found links:', Array.from(allLinks));

    // Navigate to each link
    for (const href of allLinks) {
      if (visitedUrls.has(href)) {
        continue;
      }

      visitedUrls.add(href);

      // Navigate to the link and capture the initial response status
      const responsePromise = page.waitForResponse(
        res => res.url().endsWith(href),
        { timeout: 5000 }
      );
      await page.goto(href);
      await page.waitForURL(href, { waitUntil: 'domcontentloaded' });
      let status: number;
      try {
        const response = await responsePromise;
        status = response.status();
      } catch (error) {
        console.log(`Timeout waiting for response for ${href}: ${error}`);
        status = 404; // Assume 404 if response times out
      }

      console.log(`Checking link ${href} - Status: ${status}`);

      // Check for non-200 status
      if (status !== 200) {
        brokenLinks.push(`Link ${href} returned status ${status}`);
      }

      // Go back to the starting page to continue crawling
      await page.goto('/public/docs/parents/introduction');
      await page.waitForURL('/public/docs/parents/introduction', { waitUntil: 'domcontentloaded' });

      // Re-expand accordions to ensure links remain accessible
      const reExpandTriggers = triggerCount === 0 ? page.locator('.hover\\:no-underline') : accordionTriggers;
      for (let j = 0; j < triggerCount; j++) {
        const trigger = reExpandTriggers.nth(j);
        const isVisible = await trigger.isVisible();
        if (isVisible) {
          await trigger.click();
          console.log(`Re-expanded accordion trigger ${j + 1}/${triggerCount}`);
          await page.waitForTimeout(500);
        }
      }

      // Re-collect links in case the DOM has changed
      const updatedLinks = page.getByRole('link');
      linkCount = await updatedLinks.count();
      for (let i = 0; i < linkCount; i++) {
        const newHref = await updatedLinks.nth(i).getAttribute('href');
        if (newHref && newHref.startsWith('/public/docs') && !visitedUrls.has(newHref)) {
          allLinks.add(newHref);
        }
      }
    }

    // Fail the test if any broken links were found
    if (brokenLinks.length > 0) {
      throw new Error(`Found broken links:\n${brokenLinks.join('\n')}`);
    }
  });
});