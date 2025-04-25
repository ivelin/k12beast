// File path: tests/e2e/history-page.spec.ts
// Tests the history page functionality for authenticated users

import { test, expect } from './fixtures'; // Import extended test with login fixture

test.describe('History Page', () => {
  test('should display a session in history after creating it', async ({ page, login }) => {
    // Log in the user using the fixture
    await login();

    // Mock the /api/tutor endpoint
    await page.route('**/api/tutor', async (route) => {
      console.log('Mocking API request for /api/tutor');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          lesson: '<p>The answer to your question is simple: 4!</p>',
          isK12: true,
        }),
      });
    });

    // Mock the /api/history endpoint
    await page.route('**/api/history**', async (route) => {
      console.log('Mocking API request for /api/history');
      return route.fulfill({
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

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Act: Create a new chat session
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'What is 2 + 2?');
    await page.click('button[aria-label="Send message"]');

    // Check for error dialog
    const errorDialog = page.getByText('Unexpected token');
    await expect(errorDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Error dialog detected: Unexpected token');
      throw new Error('Failed to process chat message due to invalid JSON response');
    });

    // Verify user message and assistant response
    await expect(page.getByText('What is 2 + 2?')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('The answer to your question is simple: 4!')).toBeVisible({ timeout: 30000 });

    // Act: Navigate to history page
    await page.click('a[href="/history"]');

    // Assert: Session appears in history
    await expect(page.getByText('What is 2 + 2?')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Last Updated: 4/10/2025')).toBeVisible({ timeout: 30000 });
  });
});