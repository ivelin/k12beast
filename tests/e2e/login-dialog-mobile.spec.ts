// File path: tests/e2e/login-dialog-mobile.spec.ts
// End-to-end tests for login page on mobile (iPhone), focusing on Forgot Password dialog behavior

import { test, expect, devices } from '@playwright/test';

// Configure mobile device emulation for all tests to replicate iPhone issue
test.use({ ...devices['iPhone 12'] });

test.describe('Login Page - Forgot Password Dialog on Mobile', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication API to allow login and password reset flows
    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          expires_in: 3600,
        }),
      });
    });

    // Navigate to login page and wait for form to load
    await page.goto('/public/login');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  });

  test('should not open forgot password dialog when entering credentials manually', async ({ page }) => {
    // Simulate manual credential entry (critical user flow)
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'password123');

    // Verify dialog does not appear unexpectedly
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('should not open forgot password dialog during autofill', async ({ page }) => {
    // Simulate autofill by programmatically setting input values (mimics iOS Keychain)
    await page.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
      const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
      emailInput.value = 'testuser@example.com';
      passwordInput.value = 'password123';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Wait briefly to allow any unintended dialog triggers
    await page.waitForTimeout(1000);

    // Verify dialog does not appear unexpectedly (critical for iPhone issue)
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('should open forgot password dialog and send reset email when clicked', async ({ page }) => {
    // Click Forgot Password button (critical user flow)
    await page.click('button:has-text("Forgot Password")');

    // Verify dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill reset email form and submit
    await page.fill('input[id="reset-email"]', 'testuser@example.com');
    await page.click('button:has-text("Send Reset Email")');

    // Verify success message appears (critical user-facing check)
    await expect(page.locator('text=Password reset email sent')).toBeVisible({ timeout: 5000 });

    // Verify dialog closes after success
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });
});