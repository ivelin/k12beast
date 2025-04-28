// File path: tests/e2e/quiz-answer-network-errors.spec.ts
// Tests network error handling for quiz answer submission scenarios

import { test } from './fixtures';
import { expect } from '@playwright/test';

test.describe('Quiz Answer Network Error Handling', () => {
  let attemptCount = 0;

  test('should handle retryable network error during quiz answer submission', async ({ page, login, context }) => {
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

    // Mock /api/quiz to return a successful quiz
    await context.route('**/api/quiz', async (route) => {
      console.log('Simulating successful response for /api/quiz request');
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

    // Mock /api/validate to simulate a network failure on the first attempt and succeed on retry
    await context.route('**/api/validate', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating network failure for /api/validate request (attempt 1)');
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Service Unavailable',
          }),
        });
      }
      console.log('Simulating successful response for /api/validate request (attempt 2)');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isCorrect: true,
          encouragement: 'Great job!',
          solution: [
            { title: 'Step 1', content: 'Add the numbers: 3 + 3.' },
            { title: 'Step 2', content: 'The total is 6.' },
          ],
          readiness: 0.92,
          correctAnswer: 'C',
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

    // Click "Take a Quiz" to start the quiz
    await page.getByText('Take a Quiz').click();

    // Verify the quiz appears
    await expect(page.getByText('What is 3 + 3?')).toBeVisible({ timeout: 10000 });

    // Select the answer "C" by clicking the radio button and wait for the submit button to be enabled
    await page.getByRole('radio', { name: 'C' }).click();
    const submitButton = page.getByText('SUBMIT QUIZ');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });

    // Submit the quiz to trigger the network failure
    await submitButton.click();

    // Verify the error message appears in the chat
    await expect(page.getByText(/couldn't reach the server/i)).toBeVisible({ timeout: 10000 });

    // Verify the quiz answer submission controls remain enabled
    await expect(submitButton).toBeVisible({ timeout: 5000 });

    // Retry by submitting the answer again
    await page.getByRole('radio', { name: 'C' }).click();
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Verify the successful feedback appears in the chat
    await expect(page.getByText('Great job!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Step 1: Add the numbers: 3 + 3.')).toBeVisible();
  });

  test('should handle 429 Too Many Requests error during quiz answer submission', async ({ page, login, context }) => {
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

    // Mock /api/quiz to return a successful quiz
    await context.route('**/api/quiz', async (route) => {
      console.log('Simulating successful response for /api/quiz request');
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

    // Mock /api/validate to simulate a 429 error on the first attempt and succeed on retry
    await context.route('**/api/validate', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating 429 Too Many Requests for /api/validate request (attempt 1)');
        return route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: '429 Too Many Requests',
          }),
        });
      }
      console.log('Simulating successful response for /api/validate request (attempt 2)');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isCorrect: true,
          encouragement: 'Great job!',
          solution: [
            { title: 'Step 1', content: 'Add the numbers: 3 + 3.' },
            { title: 'Step 2', content: 'The total is 6.' },
          ],
          readiness: 0.92,
          correctAnswer: 'C',
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

    // Click "Take a Quiz" to start the quiz
    await page.getByText('Take a Quiz').click();

    // Verify the quiz appears
    await expect(page.getByText('What is 3 + 3?')).toBeVisible({ timeout: 10000 });

    // Select the answer "C" by clicking the radio button and wait for the submit button to be enabled
    await page.getByRole('radio', { name: 'C' }).click();
    const submitButton = page.getByText('SUBMIT QUIZ');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });

    // Submit the quiz to trigger the 429 error
    await submitButton.click();

    // Verify the error message appears in the chat
    await expect(page.getByText(/couldn't reach the server/i)).toBeVisible({ timeout: 10000 });

    // Verify the quiz answer submission controls remain enabled
    await expect(submitButton).toBeVisible({ timeout: 5000 });

    // Retry by submitting the answer again
    await page.getByRole('radio', { name: 'C' }).click();
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Verify the successful feedback appears in the chat
    await expect(page.getByText('Great job!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Step 1: Add the numbers: 3 + 3.')).toBeVisible();
  });
});