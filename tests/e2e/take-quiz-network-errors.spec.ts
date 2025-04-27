// File path: tests/e2e/take-quiz-network-errors.spec.ts
// Tests network error handling for "Take a Quiz" scenarios

import { test } from './fixtures';
import { expect } from '@playwright/test';

test.describe('Take a Quiz Network Error Handling', () => {
  let attemptCount = 0;

  test('should handle retryable network error during Take a Quiz', async ({ page, login, context }) => {
    attemptCount = 0;

    // Log in the user using the fixture
    await login({ page, context });

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

    // Mock /api/quiz to simulate a network failure on the first attempt and succeed on retry
    await context.route('**/api/quiz', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating network failure for /api/quiz request (attempt 1)');
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Service Unavailable',
          }),
        });
      }
      console.log('Simulating successful response for /api/quiz request (attempt 2)');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          problem: '<p>What is 3 + 3?</p>',
          answerFormat: 'multiple-choice',
          options: ['A: 4', 'B: 5', 'C: 6', 'D: 7'],
          correctAnswer: 'C',
          difficulty: 'easy',
        }),
      });
    });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Submit a message to start the session
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'What is 2 + 2?');
    await page.click('button[aria-label="Send message"]');

    // Verify the lesson appears
    await expect(page.locator('.MathJax').first()).toBeVisible({ timeout: 30000 });

    // Click "Take a Quiz" to trigger the network failure
    await page.getByRole('button', { name: 'Take a Quiz' }).click();

    // Verify the error message appears in the chat
    await expect(page.getByText(/couldn't reach the server/i)).toBeVisible({ timeout: 10000 });

    // Verify the "Take a Quiz" button remains enabled
    const takeQuizButton = page.getByRole('button', { name: 'Take a Quiz' });
    await expect(takeQuizButton).toBeVisible({ timeout: 5000 });

    // Retry by clicking "Take a Quiz" again
    await takeQuizButton.click();

    // Verify the quiz appears
    await expect(page.getByText('What is 3 + 3?')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('A: 4')).toBeVisible();
  });

  test('should handle 429 Too Many Requests error during Take a Quiz', async ({ page, login, context }) => {
    attemptCount = 0;

    // Log in the user using the fixture
    await login({ page, context });

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

    // Mock /api/quiz to simulate a 429 error on the first attempt and succeed on retry
    await context.route('**/api/quiz', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating 429 Too Many Requests for /api/quiz request (attempt 1)');
        return route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: '429 Too Many Requests',
          }),
        });
      }
      console.log('Simulating successful response for /api/quiz request (attempt 2)');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          problem: '<p>What is 3 + 3?</p>',
          answerFormat: 'multiple-choice',
          options: ['A: 4', 'B: 5', 'C: 6', 'D: 7'],
          correctAnswer: 'C',
          difficulty: 'easy',
        }),
      });
    });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Submit a message to start the session
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'What is 2 + 2?');
    await page.click('button[aria-label="Send message"]');

    // Verify the lesson appears
    await expect(page.locator('.MathJax').first()).toBeVisible({ timeout: 30000 });

    // Click "Take a Quiz" to trigger the 429 error
    await page.getByRole('button', { name: 'Take a Quiz' }).click();

    // Verify the error message appears in the chat
    await expect(page.getByText(/couldn't reach the server/i)).toBeVisible({ timeout: 10000 });

    // Verify the "Take a Quiz" button remains enabled
    const takeQuizButton = page.getByRole('button', { name: 'Take a Quiz' });
    await expect(takeQuizButton).toBeVisible({ timeout: 5000 });

    // Retry by clicking "Take a Quiz" again
    await takeQuizButton.click();

    // Verify the quiz appears
    await expect(page.getByText('What is 3 + 3?')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('A: 4')).toBeVisible();
  });
});