// File path: tests/e2e/login-and-create-session.spec.ts
// Tests user login and session creation functionality

import { test, expect } from './fixtures'; // Import extended test with login fixture

test.describe('User Login and Session Creation', () => {
  test('should log in and create a new chat session', async ({ page, login }) => {
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

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });
    await expect(page.getByText('K12Beast')).toBeVisible({ timeout: 30000 }); // Nav bar check

    // Act: Create a new chat session
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'What is 2 + 2?');
    await page.click('button[aria-label="Send message"]');

    // Check for error dialog
    const errorDialog = page.getByText('Unexpected token');
    await expect(errorDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Error dialog detected: Unexpected token');
      throw new Error('Failed to process chat message due to invalid JSON response');
    });

    // Assert: Chat session is created and mock response appears
    await expect(page.getByText('What is 2 + 2?')).toBeVisible({ timeout: 30000 }); // User message
    await expect(page.getByText('The answer to your question is simple: 4!')).toBeVisible({ timeout: 30000 }); // Mocked assistant response
    await expect(page.getByRole('button', { name: 'Share session' })).toBeVisible({ timeout: 30000 }); // Session persisted (indirectly)
  });
});