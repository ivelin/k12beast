// File path: tests/e2e/session-expiration.spec.ts
// Tests session expiration behavior for authenticated users

import { test, expect } from './fixtures'; // Import extended test with login fixture

test.describe('Session Expiration', () => {
  test('should show session expired modal when session expires', async ({ page, login }) => {
    // Log in the user using the fixture
    await login();

    // Mock the /api/tutor endpoint to return 401 Unauthorized, simulating session expiration
    await page.route('**/api/tutor', async (route) => {
      console.log('Mocking API request for /api/tutor with 401 Unauthorized');
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized',
          terminateSession: true,
        }),
      });
    });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Act: Create a new chat session to trigger the 401 response
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'What is 2 + 2?');
    await page.click('button[aria-label="Send message"]');

    // Wait for the error modal to appear using a role-based selector
    await page.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 15000 });

    // Verify the modal contains the expected title and error message
    const modal = page.locator('div[role="dialog"]');
    await expect(modal.getByText('Oops!')).toBeVisible();
    await expect(modal.getByText('Unauthorized')).toBeVisible();

    // Click the "Start New Chat" button in the error modal
    await modal.getByRole('button', { name: 'Start New Chat' }).click();

    // Wait for redirect to /chat/new after clicking "Start New Chat"
    await page.waitForURL(/\/chat\/new/, { timeout: 10000 });

    // Optionally, add further assertions if additional modals or redirects occur
  });
});