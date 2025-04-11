// tests/e2e/examples-quiz-share.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Examples, Quiz, and Share Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/tutor', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'x-session-id': 'mock-session-id' },
        body: '<p>Here’s your lesson on 2 + 2!</p>',
      });
    });

    await page.goto('/chat/new');
    await page.waitForURL(/\/chat\/new/);
    await page.waitForSelector('textarea[placeholder="Ask k12beast AI..."]');
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'What is 2 + 2?');
    await page.waitForSelector('button[aria-label="Send message"]', { state: 'visible' });
    await page.click('button[aria-label="Send message"]');
    await expect(page.getByText('Here’s your lesson on 2 + 2!')).toBeVisible();
  });

  test('should request examples, take a quiz, and share the session', async ({ page }) => {
    await page.route('**/api/examples', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          problem: 'What is 3 + 3?',
          solution: [{ title: 'Step 1', content: 'Add 3 and 3.' }],
        }),
      });
    });

    await page.route('**/api/quiz', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          problem: 'What is 4 + 4?',
          answerFormat: 'multiple-choice',
          options: ['6', '7', '8', '9'],
          correctAnswer: '8',
          difficulty: 'easy',
          encouragement: null,
          readiness: { confidenceIfCorrect: 0.5, confidenceIfIncorrect: 0.4 },
        }),
      });
    });

    await page.route('**/api/validate', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isCorrect: true,
          commentary: 'Great job!',
          solution: null,
        }),
      });
    });

    // Wait for the heading to ensure the tutor response is fully rendered
    await page.waitForSelector('h2:has-text("What would you like to do next?")', { state: 'visible' });
    const requestExampleButton = page.getByText('Request Example', { exact: true });
    await requestExampleButton.waitFor({ state: 'visible' });
    await requestExampleButton.click();

    await expect(page.getByText('What is 3 + 3?')).toBeVisible();
    await expect(page.getByText('Add 3 and 3.')).toBeVisible();

    // Wait for the "Take a Quiz" button to be visible before clicking
    const takeQuizButton = page.getByText('Take a Quiz', { exact: true });
    await takeQuizButton.waitFor({ state: 'visible' });
    await takeQuizButton.click();

    await expect(page.getByText('What is 4 + 4?')).toBeVisible();
    await page.check('input[value="8"]');
    await page.click('button:text("Submit Quiz")');
    await expect(page.getByText('Great job!')).toBeVisible();

    await page.click('button[aria-label="Share session"]');
    await expect(page.getByRole('dialog', { name: 'Share Your Session' })).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveValue(/\/public\/session\/mock-session-id$/);
    await page.click('button:text("Copy Link")');
  });
});