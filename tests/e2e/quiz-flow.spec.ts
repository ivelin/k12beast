import { test, expect } from '@playwright/test';

test.describe('Quiz Flow', () => {
  test('should take a quiz and receive feedback', async ({ page }) => {
    test.setTimeout(30000);

    // Mock /api/tutor
    await page.route('**/api/tutor', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'x-session-id': 'mock-session-id' },
        body: '<p>Let’s learn about addition!</p>',
      });
    });

    // Mock /api/quiz
    await page.route('**/api/quiz', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          problem: 'What is 3 + 3?',
          answerFormat: 'multiple-choice',
          options: ['4', '5', '6', '7'],
          correctAnswer: '6',
          difficulty: 'easy',
          encouragement: null,
          readiness: { confidenceIfCorrect: 0.8, confidenceIfIncorrect: 0.6 },
        }),
      });
    });

    // Mock /api/validate without content field
    await page.route('**/api/validate', (route) => {
      const requestBody = JSON.parse(route.request().postData() || '{}');
      const isCorrect = requestBody.answer === '6';
      const feedbackHtml = isCorrect
        ? '<p>Great job!</p>'
        : '<p>Not quite. The answer is 6.</p><br><br><strong>Step 1:</strong> Add 3 and 3 to get 6.';
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isCorrect,
          commentary: feedbackHtml,
          solution: isCorrect ? null : [{ title: 'Step 1', content: 'Add 3 and 3 to get 6.' }],
        }),
      });
    });

    // Start at /chat/new (post-login via global setup)
    await page.goto('/chat/new');
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 15000 });
    await page.waitForSelector('textarea[placeholder="Ask k12beast AI..."]');

    // Act: Start a session
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'Teach me addition');
    await page.click('button[aria-label="Send message"]');
    await expect(page.locator('text=Let’s learn about addition!')).toBeVisible({ timeout: 10000 });

    // Act: Request a quiz
    const quizButton = page.locator('button', { hasText: 'Take a Quiz' });
    await quizButton.click();

    // Wait for the quiz message to appear and validate content
    await expect(page.locator('text=Quiz:')).toBeVisible();
    await expect(page.locator('text=What is 3 + 3?')).toBeVisible();

    // Find the quiz message paragraph and ensure options are not listed there
    const quizParagraph = page.locator('p:has-text("What is 3 + 3?")');
    const quizParagraphText = await quizParagraph.innerText();
    expect(quizParagraphText).not.toContain('4');
    expect(quizParagraphText).not.toContain('5');
    expect(quizParagraphText).not.toContain('6');
    expect(quizParagraphText).not.toContain('7');

    // Assert: Quiz options are rendered as radio buttons in QuizSection
    const radioButtons = await page.$$("input[type='radio'][name='quiz-answer']");
    expect(radioButtons.length).toBe(4); // Ensure exactly 4 options are rendered
    const optionLabels = await page.$$eval("input[type='radio'][name='quiz-answer'] + label", (labels) =>
      labels.map((label) => label.textContent?.trim())
    );
    expect(optionLabels).toEqual(['4', '5', '6', '7']); // Verify the options match the mocked data

    // Act: Submit correct answer
    await page.check('input[value="6"]');
    await page.click('button:text("Submit Quiz")');

    // Assert: Full feedback appears, focus on user-critical visuals
    await expect(page.locator('text=Great job!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=80% - Great progress!')).toBeVisible({ timeout: 10000 });
  });
});