// File path: tests/e2e/forgot-password.spec.ts
// Tests the "Forgot Password" flow, mocking Supabase resetPasswordForEmail via network interception
// Verifies dialog opening, form submission, success message, invalid email handling via browser validation, and rate limit handling

import { test, expect } from '@playwright/test';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Retrieve Supabase URL from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
}

test.describe('Forgot Password Flow', () => {
  test('should open reset dialog, submit valid email, and show success message', async ({
    page,
    context,
  }) => {
    // Log all requests to debug the Supabase endpoint
    page.on('request', (request) => {
      console.log('Request to:', request.url());
    });

    // Mock Supabase resetPasswordForEmail API call to return success
    await context.route(
      (url) => url.href.includes('/auth/v1/recover'),
      async (route) => {
        console.log('Mocking Supabase resetPasswordForEmail request - success for URL:', route.request().url());
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      }
    );

    // Navigate to login page (no login needed for forgot password)
    await page.goto('http://localhost:3000/public/login', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    // Verify login page is loaded
    await expect(page.getByText('Login to K12Beast')).toBeVisible({ timeout: 10000 });

    // Click "Forgot Password?" button
    const forgotPasswordButton = page.getByRole('button', { name: 'Forgot Password?' });
    await expect(forgotPasswordButton).toBeVisible({ timeout: 10000 });
    console.log('Clicking Forgot Password button');
    await forgotPasswordButton.click();

    // Verify reset password dialog opens
    const dialog = page.getByRole('dialog', { name: 'Reset Your Password' });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Fill in the reset email form with a valid email
    const resetEmailInput = dialog.locator('#reset-email');
    await expect(resetEmailInput).toBeVisible({ timeout: 10000 });
    await resetEmailInput.fill('testuser@example.com');
    console.log('Filled reset email input with testuser@example.com');

    // Verify submit button is enabled
    const submitButton = dialog.getByRole('button', { name: 'Send Reset Email' });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });

    // Submit the form
    console.log('Submitting reset password form');
    await submitButton.click();

    // Verify success message appears
    const successMessage = dialog.getByText('Password reset email sent! Please check your inbox.');
    await expect(successMessage).toBeVisible({ timeout: 10000 });

    // Verify no error messages
    const errorMessage = dialog.getByText(/Too many reset attempts/i);
    await expect(errorMessage).not.toBeVisible({ timeout: 5000 });

    // Verify dialog closes automatically after 2 seconds
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    console.log('Reset dialog closed successfully');
  });

  test('should prevent submission for invalid reset email via browser validation', async ({ page, context }) => {
    // Log all requests to ensure no Supabase request is made
    let supabaseRequestMade = false;
    page.on('request', (request) => {
      if (request.url().includes('/auth/v1/recover')) {
        supabaseRequestMade = true;
      }
      console.log('Request to:', request.url());
    });

    // Navigate to login page
    await page.goto('http://localhost:3000/public/login', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    // Verify login page is loaded
    await expect(page.getByText('Login to K12Beast')).toBeVisible({ timeout: 10000 });

    // Click "Forgot Password?" button
    const forgotPasswordButton = page.getByRole('button', { name: 'Forgot Password?' });
    await expect(forgotPasswordButton).toBeVisible({ timeout: 10000 });
    console.log('Clicking Forgot Password button');
    await forgotPasswordButton.click();

    // Verify reset password dialog opens
    const dialog = page.getByRole('dialog', { name: 'Reset Your Password' });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Fill in the reset email form with an invalid email
    const resetEmailInput = dialog.locator('#reset-email');
    await expect(resetEmailInput).toBeVisible({ timeout: 10000 });
    await resetEmailInput.fill('invalid');
    console.log('Filled reset email input with invalid');

    // Verify submit button is enabled
    const submitButton = dialog.getByRole('button', { name: 'Send Reset Email' });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });

    // Attempt to submit the form
    console.log('Attempting to submit reset password form with invalid email');
    await submitButton.click();

    // Verify browser validation prevents submission (no Supabase request made)
    await page.waitForTimeout(1000); // Wait to ensure no request is made
    expect(supabaseRequestMade).toBe(false);
    console.log('No Supabase request made due to browser validation');

    // Verify the browser validation message (check the input's validationMessage)
    const validationMessage = await resetEmailInput.evaluate((input) => (input as HTMLInputElement).validationMessage);
    expect(validationMessage).toContain("Please include an '@' in the email address");
    console.log('Browser validation message displayed:', validationMessage);

    // Verify no success message (since form submission was prevented)
    const successMessage = dialog.getByText('Password reset email sent! Please check your inbox.');
    await expect(successMessage).not.toBeVisible({ timeout: 5000 });

    // Verify dialog remains open
    await expect(dialog).toBeVisible({ timeout: 5000 });
    console.log('Reset dialog remains open after browser validation');
  });

  test('should handle rate limit error when submitting reset email', async ({ page, context }) => {
    // Log all requests to debug the Supabase endpoint
    page.on('request', (request) => {
      console.log('Request to:', request.url());
    });

    // Mock Supabase resetPasswordForEmail API call to return a rate limit error
    await context.route(
      (url) => url.href.includes('/auth/v1/recover'),
      async (route) => {
        console.log('Mocking Supabase resetPasswordForEmail request - rate limit error for URL:', route.request().url());
        return route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'email rate limit exceeded' }),
        });
      }
    );

    // Navigate to login page
    await page.goto('http://localhost:3000/public/login', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    // Verify login page is loaded
    await expect(page.getByText('Login to K12Beast')).toBeVisible({ timeout: 10000 });

    // Click "Forgot Password?" button
    const forgotPasswordButton = page.getByRole('button', { name: 'Forgot Password?' });
    await expect(forgotPasswordButton).toBeVisible({ timeout: 10000 });
    console.log('Clicking Forgot Password button');
    await forgotPasswordButton.click();

    // Verify reset password dialog opens
    const dialog = page.getByRole('dialog', { name: 'Reset Your Password' });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Fill in the reset email form with a valid email
    const resetEmailInput = dialog.locator('#reset-email');
    await expect(resetEmailInput).toBeVisible({ timeout: 10000 });
    await resetEmailInput.fill('testuser@example.com');
    console.log('Filled reset email input with testuser@example.com');

    // Verify submit button is enabled
    const submitButton = dialog.getByRole('button', { name: 'Send Reset Email' });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });

    // Submit the form
    console.log('Submitting reset password form');
    await submitButton.click();

    // Verify rate limit error message appears (user-friendly message from UI)
    const errorMessage = dialog.getByText('Too many reset attempts. Please wait a few minutes and try again.');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Verify no success message
    const successMessage = dialog.getByText('Password reset email sent! Please check your inbox.');
    await expect(successMessage).not.toBeVisible({ timeout: 5000 });

    // Verify dialog remains open
    await expect(dialog).toBeVisible({ timeout: 5000 });
    console.log('Reset dialog remains open after rate limit error');
  });
});