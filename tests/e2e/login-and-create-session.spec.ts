// tests/e2e/login-and-create-session.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Login and Session Creation', () => {
  test('should log in and create a new chat session', async ({ page }) => {
    // Mock the /api/tutor endpoint
    await page.route('**/api/tutor', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'x-session-id': 'mock-session-id' },
        body: '<p>The answer to your question is simple: 4!</p>',
      });
    });

    // Arrange: Navigate to login page
    await page.goto('/public/login');

    // Act: Fill in login form and submit
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Assert: User is redirected to chat page
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.locator('text=K12Beast')).toBeVisible(); // Nav bar check

    // Act: Create a new chat session
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'What is 2 + 2?');
    await page.click('button[aria-label="Send message"]');

    // Assert: Chat session is created and mock response appears
    await expect(page.locator('text=What is 2 + 2?')).toBeVisible(); // User message
    await expect(page.locator('text=The answer to your question is simple: 4!')).toBeVisible(); // Mocked assistant response
    await expect(page.locator('button[aria-label="Share session"]')).toBeVisible(); // Session persisted (indirectly)
  });
});