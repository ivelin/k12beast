// File path: tests/e2e/problem-submission-network-errors.spec.ts
// Tests network error handling for problem submission scenarios

import { test } from './fixtures';
import { expect } from '@playwright/test';

test.describe('Problem Submission Network Error Handling', () => {
  let attemptCount = 0;

  test('should handle retryable network errors with manual retry', async ({ page, login, context }) => {
    attemptCount = 0;

    // Log in the user using the fixture
    await login({ page, context });

    // Mock /api/tutor to simulate a network failure on the first attempt and succeed on retry
    await context.route('**/api/tutor', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating network failure for /api/tutor request (attempt 1)');
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: '503 Service Unavailable',
          }),
        });
      }
      console.log('Simulating successful response for /api/tutor request (attempt 2)');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          lesson: '<p>Lesson: Adding numbers. 2 + 2 = <math><mn>4</mn></math>.</p>',
          isK12: true,
        }),
      });
    });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Act: Submit a message to trigger the network failure
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'What is 2 + 2?');
    await page.click('button[aria-label="Send message"]');

    // Verify the error message appears in the chat
    await expect(page.getByText(/couldn't reach the server/i)).toBeVisible({ timeout: 10000 });

    // Verify the prompt input controls remain enabled
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).not.toBeDisabled({ timeout: 5000 });

    // Retry by resubmitting the same message
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'What is 2 + 2?');
    await page.click('button[aria-label="Send message"]');

    // Verify the successful response appears in the chat
    await expect(page.locator('.MathJax').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Lesson: Adding numbers. 2 + 2 = 4')).toBeVisible();
  });

  test('should handle non-retryable errors by forcing a new chat', async ({ page, login, context }) => {
    // Log in the user using the fixture
    await login({ page, context });

    // Mock /api/tutor to simulate a non-retryable error (non-K12 content)
    await context.route('**/api/tutor', async (route) => {
      console.log('Simulating non-retryable error for /api/tutor request');
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'This does not appear to be K12-related input.',
          terminateSession: false, // Avoid triggering session expiration
        }),
      });
    });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Act: Submit a message to trigger the non-retryable error
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'What is the capital of France?');
    await page.click('button[aria-label="Send message"]');

    // Verify the error message appears in the chat
    await expect(page.getByText(/K12-related/i)).toBeVisible({ timeout: 10000 });

    // Verify the prompt input controls are not present (session terminated)
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).not.toBeVisible({ timeout: 5000 });

    // Click the "New Chat" button to start a new session
    await page.click('button[aria-label="New chat"]');

    // Wait for redirect to /chat/new
    await page.waitForURL(/\/chat\/new/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/chat\/new/);

    // Verify the chat is reset (no previous messages)
    await expect(page.getByText('What is the capital of France?')).not.toBeVisible();
    await expect(page.getByText(/K12-related/i)).not.toBeVisible();

    // Verify the prompt input controls are re-enabled
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).not.toBeDisabled({ timeout: 5000 });
  });
});