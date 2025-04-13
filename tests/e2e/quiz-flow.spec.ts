// tests/e2e/quiz-flow.spec.ts
import { test } from "./fixtures";

test.describe("Quiz Flow E2E Test", () => {
  test.beforeEach(async ({ login }) => {
    await login();
  });

  test.afterEach(async ({ logout }) => {
    await logout();
  });

  test("should complete quiz flow", async ({ page }) => {
    // Mock tutor response
    await page.route('**/api/tutor', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'x-session-id': 'mock-session-id' },
        body: '<p><strong>Evaluation:</strong> 2 + 3 = 5.</p><p><strong>Lesson:</strong> Adding numbers combines their values.</p>',
      });
    });

    // Mock quiz response
    await page.route('**/api/quiz', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          problem: 'What is the sum of 2 and 3?',
          answerFormat: 'multiple-choice',
          options: ['3', '4', '5', '6'],
          difficulty: 'easy',
        }),
      });
    });

    // Mock validate response
    await page.route('**/api/validate', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isCorrect: true,
          commentary: 'Great job! You got it right!',
          solution: [
            { title: 'Step 1', content: 'Add the numbers: 2 + 3.' },
            { title: 'Step 2', content: 'The total is 5.' },
          ],
          readiness: { confidenceIfCorrect: 0.92, confidenceIfIncorrect: 0.75 },
        }),
      });
    });

    // Step 1: Submit a K12 problem
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'Help me with 2+3');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Evaluation', { timeout: 15000 });

    // Step 2: Request an example (optional for flow, but kept for realism)
    await page.click('button:has-text("Request Example")');
    await page.waitForSelector('text=What would you like to do next?', { timeout: 15000 });

    // Step 3: Take a quiz
    await page.click('button:has-text("Take a Quiz")');
    await page.waitForSelector('text=Quiz', { timeout: 15000 });

    // Step 4: Submit a quiz answer
    await page.click('label:has-text("5")');
    await page.click('button:has-text("Submit Quiz")');
    await page.waitForSelector('text=Feedback', { timeout: 15000 });
  });
});