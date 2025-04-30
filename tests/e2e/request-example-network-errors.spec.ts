// File path: tests/e2e/request-example-network-errors.spec.ts
// Tests network error handling for "Request Example" scenarios

import { test } from './fixtures';
import { expect } from '@playwright/test';

test.describe('Request Example Network Error Handling', () => {
  let attemptCount = 0;

  test('should handle retryable network error during Request Example', async ({ page, login, context }) => {
    attemptCount = 0;

    // Log in the user using the fixture
    await login({ page, context });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Mock /api/tutor to return a successful response initially
    await context.route('**/api/tutor', async (route) => {
      console.log('Simulating successful response for /api/tutor request');
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

    // Wait for the chat input to be visible, accounting for client-side rendering
    console.log('Waiting for chat input to be visible');
    const chatInput = page.locator('textarea[placeholder="Ask k12beast AI..."]');
    await chatInput.waitFor({ state: 'visible', timeout: 30000 }).catch(async (error) => {
      console.log('Page URL:', page.url());
      console.log('Page content:', await page.content());
      throw error;
    });

    // Submit a message to start the session
    console.log('Filling chat input with: What is 2 + 2?');
    await chatInput.fill('What is 2 + 2?');
    await page.click('button[aria-label="Send message"]');

    // Verify the lesson appears
    await expect(page.locator('.MathJax').first()).toBeVisible({ timeout: 30000 });

    // Mock /api/examples to simulate a network failure on the first attempt and succeed on retry
    await context.route('**/api/examples', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating network failure for /api/examples request (attempt 1)');
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Service Unavailable',
          }),
        });
      }
      console.log('Simulating successful response for /api/examples request (attempt 2)');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          problem: 'Example problem',
          solution: [{ title: 'Step 1', content: 'Do this' }],
        }),
      });
    });

    // Click "Request Example" to trigger the network failure
    await page.getByRole('button', { name: 'Request Example' }).click();

    // Verify the error message appears in the chat
    await expect(page.getByText(/couldn't reach the server/i)).toBeVisible({ timeout: 10000 });

    // Verify the "Request Example" button remains enabled
    const requestExampleButton = page.getByRole('button', { name: 'Request Example' });
    await expect(requestExampleButton).toBeVisible({ timeout: 5000 });

    // Retry by clicking "Request Example" again
    await requestExampleButton.click();

    // Verify the example appears
    await expect(page.getByText('Example problem')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Step 1')).toBeVisible();
  });

  test('should handle 429 Too Many Requests error during Request Example', async ({ page, login, context }) => {
    attemptCount = 0;

    // Log in the user using the fixture
    await login({ page, context });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Mock /api/tutor to return a successful response initially
    await context.route('**/api/tutor', async (route) => {
      console.log('Simulating successful response for /api/tutor request');
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

    // Wait for the chat input to be visible, accounting for client-side rendering
    console.log('Waiting for chat input to be visible');
    const chatInput = page.locator('textarea[placeholder="Ask k12beast AI..."]');
    await chatInput.waitFor({ state: 'visible', timeout: 30000 }).catch(async (error) => {
      console.log('Page URL:', page.url());
      console.log('Page content:', await page.content());
      throw error;
    });

    // Submit a message to start the session
    console.log('Filling chat input with: What is 2 + 2?');
    await chatInput.fill('What is 2 + 2?');
    await page.click('button[aria-label="Send message"]');

    // Verify the lesson appears
    await expect(page.locator('.MathJax').first()).toBeVisible({ timeout: 30000 });

    // Mock /api/examples to simulate a 429 error on the first attempt and succeed on retry
    await context.route('**/api/examples', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating 429 Too Many Requests for /api/examples request (attempt 1)');
        return route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: '429 Too Many Requests',
          }),
        });
      }
      console.log('Simulating successful response for /api/examples request (attempt 2)');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          problem: 'Example problem',
          solution: [{ title: 'Step 1', content: 'Do this' }],
        }),
      });
    });

    // Click "Request Example" to trigger the 429 error
    await page.getByRole('button', { name: 'Request Example' }).click();

    // Verify the error message appears in the chat
    await expect(page.getByText(/couldn't reach the server/i)).toBeVisible({ timeout: 10000 });

    // Verify the "Request Example" button remains enabled
    const requestExampleButton = page.getByRole('button', { name: 'Request Example' });
    await expect(requestExampleButton).toBeVisible({ timeout: 5000 });

    // Retry by clicking "Request Example" again
    await requestExampleButton.click();

    // Verify the example appears
    await expect(page.getByText('Example problem')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Step 1')).toBeVisible();
  });
});