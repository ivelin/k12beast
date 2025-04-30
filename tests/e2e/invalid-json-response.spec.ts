// File path: tests/e2e/invalid-json-response.spec.ts
// Tests handling of invalid JSON responses from API requests in the UI

import { test, expect } from '@playwright/test';
import { loginUser } from './utils';

test.describe('Invalid JSON Response Handling', () => {
  let attemptCount = 0;

  test('should handle invalid JSON response as a retryable network error', async ({ page, context }) => {
    attemptCount = 0;

    // Log in the user using the utility function
    await loginUser(page, context);

    // Mock /api/tutor to return an invalid JSON response (504 with plain text) on the first attempt,
    // and a valid response on the second attempt
    await context.route('**/api/tutor', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating 504 Gateway Timeout with invalid JSON response (attempt 1)');
        return route.fulfill({
          status: 504,
          contentType: 'text/plain',
          body: '<html><body>Gateway Timeout</body></html>', // Invalid JSON
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

    // Submit a message to trigger the network error
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible({ timeout: 30000 });
    await input.fill('What is 2 + 2?');
    const sendButton = page.getByRole('button', { name: 'Send message' });
    await expect(sendButton).toBeEnabled({ timeout: 30000 });
    await sendButton.click();

    // Verify the retryable error message appears in the chat
    const errorMessage = page.getByText(/Oops! We couldn't reach the server/i);
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Verify the input field remains available for retry
    await expect(input).toBeVisible({ timeout: 5000 });

    // Retry by resubmitting the same message
    await input.fill('What is 2 + 2?');
    await sendButton.click();

    // Verify the lesson appears after retry
    await expect(page.locator('.MathJax').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Lesson: Adding numbers. 2 + 2 = 4')).toBeVisible({ timeout: 10000 });

    // Ensure no duplicate messages are displayed
    const userMessages = page.getByText('What is 2 + 2?');
    await expect(userMessages).toHaveCount(2, { timeout: 30000 }); // Two submissions
    const assistantMessages = page.getByText('Lesson: Adding numbers. 2 + 2 = 4');
    await expect(assistantMessages).toHaveCount(1, { timeout: 30000 }); // One successful response
  });
});