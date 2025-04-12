// tests/e2e/session-sharing.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Session Sharing', () => {
  test('should share a session and allow an unauthenticated user to view it', async ({ page, context }) => {
    test.setTimeout(30000);

    // Mock /api/tutor for the authenticated page
    await page.route('**/api/tutor', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'x-session-id': 'mock-session-id' },
        body: '<p>Let’s learn about addition!</p>',
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

    // Act: Share the session
    await page.click('button[aria-label="Share session"]');
    const shareInput = page.locator('input[value*="/public/session/"]');
    await expect(shareInput).toBeVisible();
    const shareLink = await shareInput.inputValue();
    expect(shareLink).toContain('/public/session/mock-session-id');

    // Act: Open the shared link as an unauthenticated user
    const newPage = await context.newPage();

    // Mock /api/session for the new page context
    await newPage.route('**/api/session/mock-session-id', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: 'mock-session-id',
            problem: 'Teach me addition',
            images: [],
            lesson: '<p>Let’s learn about addition!</p>',
            messages: [
              { role: 'user', content: 'Teach me addition', renderAs: 'markdown' },
              { role: 'assistant', content: '<p>Let’s learn about addition!</p>', renderAs: 'html' },
            ],
            user_id: null, // Ensure public access
          },
        }),
      });
    });

    await newPage.goto(shareLink);

    // Check for error message and fail if present
    const errorMessage = newPage.locator('text=Failed to fetch session');
    if (await errorMessage.isVisible()) {
      throw new Error('Shared session failed to load: Failed to fetch session');
    }

    await expect(newPage.locator('h1')).toContainText('Shared Session', { timeout: 10000 });
    // Focus on user-visible text without structural dependency
    await expect(newPage.locator('text=Teach me addition').first()).toBeVisible({ timeout: 10000 });
    await expect(newPage.locator('text=Let’s learn about addition!').first()).toBeVisible({ timeout: 10000 });
  });
});