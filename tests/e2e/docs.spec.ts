// tests/e2e/docs.spec.ts
// End-to-end tests for K12Beast documentation pages
// Verifies rendering, navigation, and mobile menu functionality
import { test, expect } from '@playwright/test';
import { loginUser } from './utils';

test.describe('Documentation Pages', () => {
  test('Docs page loads', async ({ page }) => {
    await page.goto('/public/docs/parents');
    await expect(page.locator('h1')).toContainText('Parents');
  });

  test('Mobile menu toggle works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/public/docs/parents');

    // Verify the menu button is visible on mobile
    const menuButton = page.locator('label[aria-label="Toggle menu"]');
    await expect(menuButton).toBeVisible({ timeout: 5000 });

    // Verify the sidebar is initially hidden
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveCSS('display', 'none'); // Check CSS hidden state

    // Toggle the menu to show sidebar
    await menuButton.click();
    await expect(sidebar).toHaveCSS('display', 'block'); // Check CSS visible state

    // Toggle back to hide sidebar
    await menuButton.click();
    await expect(sidebar).toHaveCSS('display', 'none');
  });

  test.describe('CTA Visibility', () => {
    test('CTA is visible for logged-out users', async ({ page, context }) => {
      // Clear cookies to ensure logged-out state
      await context.clearCookies();
      await page.goto('/public/docs/parents');

      // Verify the CallToAction button is visible
      const ctaButton = page.getByText("Sign up to start supporting your child’s learning");
      await expect(ctaButton).toBeVisible();
      // Ensure the button links to the signup page
      const link = ctaButton.locator('xpath=ancestor-or-self::a');
      await expect(link).toHaveAttribute('href', '/public/signup');
    });

    test('CTA is hidden for logged-in users', async ({ page }) => {
      await loginUser(page);
      await page.goto('/public/docs/parents');

      // Verify the CallToAction button is not visible
      const ctaButton = page.getByText("Sign up to start supporting your child’s learning");
      await expect(ctaButton).not.toBeVisible();
    });
  });
});