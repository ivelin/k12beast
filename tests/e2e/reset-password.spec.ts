// File path: tests/e2e/reset-password.spec.ts
// Tests the Reset Password page, mocking Supabase updateUser API via network interception
// Verifies form submission, validation, and error handling

import { test, expect } from '@playwright/test';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Retrieve Supabase URL from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
}

test.describe('Reset Password Flow', () => {
  test('should reset password successfully with valid code and matching passwords', async ({
    page,
    context,
  }) => {
    // Log all requests to debug the Supabase endpoints
    page.on('request', (request) => {
      console.log('Request to:', request.url(), 'Method:', request.method(), 'Headers:', request.headers());
    });

    // Mock Supabase updateUser API call (PATCH /auth/v1/user)
    await context.route(
      (url) => url.href.includes('/auth/v1/user'),
      async (route) => {
        console.log('Mocking Supabase updateUser request - success for URL:', route.request().url());
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: { id: 'mock_user_id' } }),
        });
      }
    );

    // Navigate to reset password page with a mock code
    await page.goto(
      'http://localhost:3000/public/reset-password?code=mock_code&type=recovery',
      { timeout: 30000 }
    );
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    // Verify page loaded by checking the heading
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 10000 });

    // Fill in the password fields with matching passwords
    const newPasswordInput = page.locator('#new-password');
    const confirmPasswordInput = page.locator('#confirm-password');
    await newPasswordInput.fill('Secure123!');
    console.log('Filled new password input with Secure123!');
    await confirmPasswordInput.fill('Secure123!');
    console.log('Filled confirm password input with Secure123!');

    // Verify submit button is enabled
    const submitButton = page.getByRole('button', { name: 'Reset Password' });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });

    // Submit the form
    console.log('Submitting reset password form');
    await submitButton.click();

    // Verify success message
    const successMessage = page.getByText('Password reset successful! You can now log in with your new password.');
    await expect(successMessage).toBeVisible({ timeout: 10000 });

    // Verify redirect to login page
    await expect(page).toHaveURL(/\/public\/login/, { timeout: 5000 });
    console.log('Redirected to login page successfully');
  });

  test('should show error for invalid or missing code', async ({ page }) => {
    // Navigate to reset password page without a code
    await page.goto('http://localhost:3000/public/reset-password', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    // Verify page loaded by checking the heading
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 10000 });

    // Verify error message for invalid code
    const errorMessage = page.getByText('Invalid or expired reset link. Please request a new one.');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Verify submit button is disabled (no code)
    const submitButton = page.getByRole('button', { name: 'Reset Password' });
    await expect(submitButton).toBeDisabled({ timeout: 10000 });
    console.log('Submit button is disabled due to invalid code');
  });

  test('should prevent submission with mismatched passwords', async ({ page }) => {
    // Navigate to reset password page with a mock code
    await page.goto(
      'http://localhost:3000/public/reset-password?code=mock_code&type=recovery',
      { timeout: 30000 }
    );
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    // Verify page loaded by checking the heading
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 10000 });

    // Fill in the password fields with mismatched passwords
    const newPasswordInput = page.locator('#new-password');
    const confirmPasswordInput = page.locator('#confirm-password');
    await newPasswordInput.fill('Secure123!');
    console.log('Filled new password input with Secure123!');
    await confirmPasswordInput.fill('Secure456!');
    console.log('Filled confirm password input with Secure456!');

    // Verify error message for mismatched passwords
    const mismatchError = page.getByText('Passwords do not match.');
    await expect(mismatchError).toBeVisible({ timeout: 10000 });

    // Verify submit button is disabled
    const submitButton = page.getByRole('button', { name: 'Reset Password' });
    await expect(submitButton).toBeDisabled({ timeout: 10000 });
    console.log('Submit button is disabled due to mismatched passwords');
  });

  test('should show server-side error for invalid password', async ({ page, context }) => {
    // Mock Supabase updateUser API call to return an error
    await context.route(
      (url) => url.href.includes('/auth/v1/user'),
      async (route) => {
        console.log('Mocking Supabase updateUser request - error for URL:', route.request().url());
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Password should be at least 6 characters' }),
        });
      }
    );

    // Navigate to reset password page with a mock code
    await page.goto(
      'http://localhost:3000/public/reset-password?code=mock_code&type=recovery',
      { timeout: 30000 }
    );
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    // Verify page loaded by checking the heading
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 10000 });

    // Fill in the password fields with matching passwords that fail server-side validation
    const newPasswordInput = page.locator('#new-password');
    const confirmPasswordInput = page.locator('#confirm-password');
    await newPasswordInput.fill('pass'); // Too short for Supabase policy
    console.log('Filled new password input with pass');
    await confirmPasswordInput.fill('pass');
    console.log('Filled confirm password input with pass');

    // Verify submit button is enabled
    const submitButton = page.getByRole('button', { name: 'Reset Password' });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });

    // Submit the form
    console.log('Submitting reset password form');
    await submitButton.click();

    // Verify server-side error message
    const errorMessage = page.getByText('Password should be at least 6 characters');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Verify no success message
    const successMessage = page.getByText('Password reset successful! You can now log in with your new password.');
    await expect(successMessage).not.toBeVisible({ timeout: 5000 });
    console.log('Server-side error message displayed successfully');
  });

  test('should show error for auth session missing', async ({ page, context }) => {
    // Mock Supabase updateUser API call to return an "Auth session missing!" error
    await context.route(
      (url) => url.href.includes('/auth/v1/user'),
      async (route) => {
        console.log('Mocking Supabase updateUser request - auth session missing for URL:', route.request().url());
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Auth session missing!' }),
        });
      }
    );

    // Navigate to reset password page with a mock code
    await page.goto(
      'http://localhost:3000/public/reset-password?code=mock_code&type=recovery',
      { timeout: 30000 }
    );
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    // Verify page loaded by checking the heading
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 10000 });

    // Fill in the password fields with matching passwords
    const newPasswordInput = page.locator('#new-password');
    const confirmPasswordInput = page.locator('#confirm-password');
    await newPasswordInput.fill('Secure123!');
    console.log('Filled new password input with Secure123!');
    await confirmPasswordInput.fill('Secure123!');
    console.log('Filled confirm password input with Secure123!');

    // Verify submit button is enabled
    const submitButton = page.getByRole('button', { name: 'Reset Password' });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });

    // Submit the form
    console.log('Submitting reset password form');
    await submitButton.click();

    // Verify auth session missing error message
    const errorMessage = page.getByText('Auth session missing!');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Verify no success message
    const successMessage = page.getByText('Password reset successful! You can now log in with your new password.');
    await expect(successMessage).not.toBeVisible({ timeout: 5000 });
    console.log('Auth session missing error message displayed successfully');
  });
});