// tests/e2e/login-dialog-mobile.spec.ts
import { test, expect, devices } from '@playwright/test';

// Configure mobile device emulation for all tests
test.use({ ...devices['iPhone 12'] });

test.describe('Login Page - Forgot Password Dialog on Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          expires_in: 3600,
        }),
      });
    });

    await page.route('**/auth/v1/reset_password_for_email', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.goto('/public/login');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  });

  test('should not open forgot password dialog when entering credentials on mobile', async ({ page }) => {
    await page.fill('input[type="email"]', 'testuser@validemail.com'); // Use a valid email
    await page.fill('input[type="password"]', 'password123');

    await expect(page.locator('text=Reset Your Password')).not.toBeVisible();
  });

  test('should open forgot password dialog when clicking button on mobile', async ({ page }) => {
    await page.click('text=Forgot Password?');

    await expect(page.locator('text=Reset Your Password')).toBeVisible({ timeout: 5000 });

    // Use a valid email to pass validation
    await page.fill('input[id="reset-email"]', 'testuser@validemail.com');
    await page.click('button:has-text("Send Reset Email")');

    await expect(page.locator('text=Password reset email sent! Please check your inbox.')).toBeVisible({ timeout: 5000 });
  });
});