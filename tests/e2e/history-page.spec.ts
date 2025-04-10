// tests/e2e/history-page.spec.ts
import { test, expect } from '@playwright/test';

test.describe('History Page', () => {
  test('should display a session in history after creating it', async ({ page }) => {
    // Mock the /api/tutor endpoint
    await page.route('**/api/tutor', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'x-session-id': 'mock-session-id' },
        body: '<p>The answer to your question is simple: 4!</p>',
      });
    });

    // Mock the /api/history endpoint
    await page.route('**/api/history**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            {
              id: 'mock-session-id',
              problem: 'What is 2 + 2?',
              images: [],
              created_at: '2025-04-10T12:00:00Z',
              updated_at: '2025-04-10T12:01:00Z',
            },
          ],
        }),
      });
    });

    // Arrange: Log in
    await page.goto('/public/login');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/chat/);

    // Act: Create a new chat session
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'What is 2 + 2?');
    await page.click('button[aria-label="Send message"]');
    await expect(page.locator('text=What is 2 + 2?')).toBeVisible();
    await expect(page.locator('text=The answer to your question is simple: 4!')).toBeVisible();

    // Act: Navigate to history page
    await page.click('a[href="/history"]');

    // Assert: Session appears in history
    await expect(page.locator('text=What is 2 + 2?')).toBeVisible();
    await expect(page.locator('text=Last Updated: 4/10/2025')).toBeVisible();
  });
});