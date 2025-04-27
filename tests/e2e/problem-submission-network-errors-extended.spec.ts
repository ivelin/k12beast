// File path: tests/e2e/problem-submission-network-errors-extended.spec.ts
// Tests additional network error scenarios for problem submission to prevent regressions

import { test } from './fixtures';
import { expect } from '@playwright/test';

test.describe('Extended Problem Submission Network Error Handling', () => {
  let attemptCount = 0;

  test('should handle timeout errors with manual retry', async ({ page, login, context }) => {
    attemptCount = 0;

    // Log in the user using the fixture
    await login({ page, context });

    // Mock /api/tutor to simulate a timeout on the first attempt and succeed on retry
    await context.route('**/api/tutor', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating timeout for /api/tutor request (attempt 1)');
        // Simulate a timeout by aborting the request after 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return route.abort('timedout');
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

    // Act: Submit a message to trigger the timeout
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

  test('should handle 429 Too Many Requests errors with manual retry', async ({ page, login, context }) => {
    attemptCount = 0;

    // Log in the user using the fixture
    await login({ page, context });

    // Mock /api/tutor to simulate a 429 error on the first attempt and succeed on retry
    await context.route('**/api/tutor', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating 429 Too Many Requests for /api/tutor request (attempt 1)');
        return route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: '429 Too Many Requests',
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

    // Act: Submit a message to trigger the 429 error
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

  test('should handle 408 Request Timeout errors with manual retry', async ({ page, login, context }) => {
    attemptCount = 0;

    // Log in the user using the fixture
    await login({ page, context });

    // Mock /api/tutor to simulate a 408 error on the first attempt and succeed on retry
    await context.route('**/api/tutor', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating 408 Request Timeout for /api/tutor request (attempt 1)');
        return route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({
            error: '408 Request Timeout',
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

    // Act: Submit a message to trigger the 408 error
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

  test('should handle 502 Bad Gateway errors with manual retry', async ({ page, login, context }) => {
    attemptCount = 0;

    // Log in the user using the fixture
    await login({ page, context });

    // Mock /api/tutor to simulate a 502 error on the first attempt and succeed on retry
    await context.route('**/api/tutor', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating 502 Bad Gateway for /api/tutor request (attempt 1)');
        return route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({
            error: '502 Bad Gateway',
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

    // Act: Submit a message to trigger the 502 error
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
});