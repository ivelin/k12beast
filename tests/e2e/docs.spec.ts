// File path: tests/e2e/docs.spec.ts
// E2E tests for documentation pages, including mobile menu toggle and CTA visibility

import { test, expect, devices } from '@playwright/test';

test.describe('Documentation Pages', () => {
  test('Docs page loads', async ({ page }) => {
    await page.goto('/public/docs/parents/introduction');
    await expect(page.locator('h1')).toContainText('Introduction for Parents');
  });

  test('Mobile menu toggle works', async ({ page }) => {
    // Use mobile viewport to simulate a phone
    await page.setViewportSize(devices['iPhone 12'].viewport);

    // Navigate to a documentation page
    await page.goto('/public/docs/parents/introduction');

    // Verify the menu button is visible on mobile
    const menuButton = page.locator('label[aria-label="Toggle menu"]');
    await expect(menuButton).toBeVisible({ timeout: 5000 });

    // Verify the sidebar is initially hidden
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveCSS('display', 'none');

    // Click the menu button to open the sidebar
    await menuButton.click();
    // Add a brief delay to ensure the DOM updates
    await page.waitForTimeout(1000);
    await expect(sidebar).toHaveCSS('display', 'block');

    // Verify key navigation links are visible in the sidebar
    await expect(page.getByRole('link', { name: 'Parents' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Students' })).toBeVisible();

    // Click the menu button again to close the sidebar
    await menuButton.click();
    await page.waitForTimeout(1000);
    await expect(sidebar).toHaveCSS('display', 'none');
  });

  test.describe('CTA Visibility', () => {
    test('CTA is hidden for logged-in users', async ({ page }) => {
      // Simulate a logged-in user by setting the supabase-auth-token cookie
      await page.context().addCookies([{
        name: 'supabase-auth-token',
        value: 'dummy-token',
        domain: 'localhost',
        path: '/',
      }]);

      // Navigate to the documentation page
      await page.goto('/public/docs/parents/introduction');

      // Verify the CTA button is not visible
      const ctaButton = page.getByText("Sign up to start supporting your child’s learning");
      await expect(ctaButton).not.toBeVisible();
    });

    test('CTA is visible for logged-out users', async ({ page }) => {
      // Ensure no supabase-auth-token cookie is present (clear cookies)
      await page.context().clearCookies();

      // Navigate to the documentation page
      await page.goto('/public/docs/parents/introduction');

      // Verify the CTA button is visible
      const ctaButton = page.getByText("Sign up to start supporting your child’s learning");
      await expect(ctaButton).toBeVisible();
    });
  });
});