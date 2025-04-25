// File path: tests/e2e/network-error-handling.spec.ts
// Tests network error handling in the chat interface with manual retry for retryable errors and forced new chat for non-retryable errors

import { test, expect } from './fixtures';

test.describe('Network Error Handling', () => {
  test('should handle retryable network errors with manual retry', async ({ page, login }) => {
    // Log in the user using the fixture
    await login();

    // Simulate a network failure by rejecting the /api/tutor request on the first attempt
    let attempt = 0;
    await page.context().route('**/api/tutor', async (route) => {
      attempt++;
      if (attempt === 1) {
        console.log('Simulating network failure for /api/tutor request (attempt 1)');
        return route.abort('failed'); // Simulate a network error on first attempt
      }
      console.log('Mocking successful /api/tutor request (attempt 2)');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          lesson: '<p>2 + 2 equals 4!</p>',
          isK12: true,
        }),
      });
    });

    // Navigate to the chat page
    await page.goto('/chat/new');
    await expect(page).toHaveURL(/\/chat\/new/);

    // Locate and use the chat input
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible();
    await input.fill('What is 2 + 2?'); // Text-only query, no image upload
    await page.click('button[aria-label="Send message"]');

    // Wait for the error popup to appear using role-based selector
    await page.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 10000 });

    // Verify the error message is visible in the popup
    const modal = page.locator('div[role="dialog"]');
    const errorMessage = modal.locator('p[id="error-description-retryable"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/error|failed|network/i);

    // Verify the "Retry" button is present and click it
    const retryButton = modal.locator('button:has-text("Retry")');
    await expect(retryButton).toBeVisible();
    await retryButton.click();

    // Verify the chat message appears after retry
    await page.waitForSelector('div.group\\/message#assistant', { timeout: 10000 });
    await expect(page.locator('div.group\\/message#assistant')).toContainText('2 + 2 equals 4!');
  });

  test('should handle non-retryable errors by forcing a new chat', async ({ page, login }) => {
    // Log in the user using the fixture
    await login();

    // Simulate a non-retryable error (e.g., non-K12-related input)
    await page.context().route('**/api/tutor', async (route) => {
      console.log('Simulating non-retryable error for /api/tutor request');
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: "Content must be K12-related. Please start a new chat.",
          terminateSession: true,
        }),
      });
    });

    // Navigate to the chat page
    await page.goto('/chat/new');
    await expect(page).toHaveURL(/\/chat\/new/);

    // Locate and use the chat input
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible();
    await input.fill('What is the capital of France?'); // Non-K12-related input
    await page.click('button[aria-label="Send message"]');

    // Wait for the error popup to appear using role-based selector
    await page.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 10000 });

    // Verify the error message is visible in the popup
    const modal = page.locator('div[role="dialog"]');
    const errorMessage = modal.locator('p[id="error-description-non-retryable"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/K12-related/i);

    // Verify the "Retry" button is NOT present
    const retryButton = modal.locator('button:has-text("Retry")');
    await expect(retryButton).not.toBeVisible();

    // Verify the "Start New Chat" button is present and click it
    const startNewChatButton = modal.locator('button:has-text("Start New Chat")');
    await expect(startNewChatButton).toBeVisible();
    await startNewChatButton.click();

    // Verify the user is redirected to a new chat session
    await page.waitForURL(/\/chat\/new/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/chat\/new/);

    // Verify the chat input is available again
    await expect(input).toBeVisible();
  });
});