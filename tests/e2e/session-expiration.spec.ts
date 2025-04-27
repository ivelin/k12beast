// File path: tests/e2e/session-expiration.spec.ts
// Tests session expiration handling, ensuring users are prompted to log back in

import { test } from './fixtures';
import { expect } from '@playwright/test';

test.describe('Session Expiration', () => {
  const mockSessionId = 'mock-session-id';

  test('should show session expired modal when session expires', async ({ page, login, context }) => {
    // Log in the user using the fixture
    await login({ page, context });

    // Mock /api/tutor to return 401, simulating session expiration
    await context.route('**/api/tutor', async (route) => {
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
    await expect(modal.getByText('Your session has expired. Please log back in to continue.')).toBeVisible();

    // Click the "Close" button in the error modal
    await modal.getByRole('button', { name: 'Close' }).click();

    // Wait for redirect to /public/login after clicking "Close"
    await page.waitForURL(/\/public\/login/, { timeout: 10000 });
    await expect(page).toHaveURL('http://localhost:3000/public/login');
  });
});