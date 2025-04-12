import { test, expect } from '@playwright/test';

test.describe('Session Expiration', () => {
  test('should show session expired modal when session expires', async ({ page }) => {
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
    await expect(page.locator('text=What is 3 + 3?')).toBeVisible();

    // Simulate session expiration by clearing the auth token cookie
    await page.context().clearCookies();

    // Trigger the onAuthStateChange event to simulate a SIGNED_OUT event
    await page.evaluate(() => {
      // Simulate the Supabase auth state change event
      const event = new CustomEvent('supabase:auth', {
        detail: { event: 'SIGNED_OUT', session: null },
      });
      window.dispatchEvent(event);
    });

    // Add a short delay to ensure the UI updates
    await page.waitForTimeout(500); // Wait 500ms for the modal to render

    // Assert: Session expiration modal appears
    await expect(page.locator('text=Your session has expired. Please log back in to continue.')).toBeVisible({ timeout: 10000 });

    // Assert: Logout text is no longer present, and Login text appears
    await expect(page.locator('text=Logout')).not.toBeVisible();
    await expect(page.locator('text=Login')).toBeVisible();

    // Act: Click "Log In" and verify redirect
    await page.click('button:has-text("Log In")');
    await expect(page).toHaveURL(/\/public\/login/, { timeout: 10000 });
  });
});