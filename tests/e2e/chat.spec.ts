// File path: tests/e2e/chat.spec.ts
// Tests the chat page functionality for authenticated users

import { test, expect } from './fixtures';

test.describe('Chat Page - Request Example', () => {
  test('should handle Request Example successfully', async ({ page, login }) => {
    // Log in the user using the fixture
    await login();

    // Mock /api/tutor to return a valid JSON response
    await page.context().route('**/api/tutor', async (route) => {
      console.log('Mocking API request for /api/tutor');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          lesson: "<p>Let's do some practice: 3 + 5 = <math><mn>8</mn></math>.</p>",
          isK12: true,
        }),
      });
    });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Verify chat input is visible
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible({ timeout: 30000 });

    // Fill and submit the chat message
    await input.fill('Test problem');
    await page.click('button[aria-label="Send message"]');

    // Check for error dialog
    const errorDialog = page.getByText('Unexpected token');
    await expect(errorDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Error dialog detected: Unexpected token');
      throw new Error('Failed to process chat message due to invalid JSON response');
    });

    // Wait for the assistant's response and the "What would you like to do next?" message
    await page.waitForSelector('text=What would you like to do next?', { timeout: 30000 });

    // Click "Request Example" and verify the action
    await page.click('text=Request Example');
    await page.waitForSelector('text=Request Example', { timeout: 30000 });
  });
});