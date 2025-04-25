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

    // Inject a script to mock date formatting for consistency
    await page.addInitScript(() => {
      // Override Date.toLocaleDateString to return a consistent format (M/D/YYYY)
      const originalToLocaleDateString = Date.prototype.toLocaleDateString;
      Date.prototype.toLocaleDateString = function (...args) {
        const date = new Date(this);
        const month = date.getUTCMonth() + 1; // No leading zero
        const day = date.getUTCDate(); // No leading zero
        const year = date.getUTCFullYear();
        return `${month}/${day}/${year}`; // Format as M/D/YYYY (e.g., "4/10/2025")
      };

      // Override Date.toLocaleString to include time in a consistent format
      const originalToLocaleString = Date.prototype.toLocaleString;
      Date.prototype.toLocaleString = function (...args) {
        const date = new Date(this);
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const year = date.getUTCFullYear();
        const hours = date.getUTCHours() % 12 || 12; // Convert to 12-hour format
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const period = date.getUTCHours() >= 12 ? 'PM' : 'AM';
        return `${month}/${day}/${year}, ${hours}:${minutes} ${period}`; // Format as M/D/YYYY, H:MM AM/PM (e.g., "4/10/2025, 7:01 AM")
      };
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
    // Match the mocked date format with time (M/D/YYYY, H:MM AM/PM)
    await expect(page.getByText(/Last Updated: 4\/10\/2025, 7:01 AM/)).toBeVisible({ timeout: 30000 });
  });
});