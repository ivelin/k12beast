// File path: tests/e2e/non-k12-prompt.spec.ts
// Tests the behavior when a non-K12 prompt is submitted, ensuring proper error messaging and UI state
// Updated to mock /api/session/* for robustness

import { test, expect } from './fixtures';

test.describe('Non-K12 Prompt Handling', () => {
  test.beforeEach(async ({ page, login, context }) => {
    // Ensure no lingering mocks from other tests
    await page.unroute('**/api/tutor');
    await page.unroute('**/api/auth/user');
    await page.unroute('**/api/session/*');

    // Mock /api/auth/user to return immediately
    await page.route('**/api/auth/user', async (route) => {
      console.log('Mocking /api/auth/user to return authenticated user');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          email: 'testuser@k12beast.com',
        }),
      });
    });

    // Mock /api/session/* to return an empty response (since we're on /chat/new)
    await page.route('**/api/session/*', async (route) => {
      console.log('Mocking /api/session/* to return empty response');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ session: null }),
      });
    });

    // Log in the user and navigate to /chat/new to reset state
    await login({ page, context });
    await page.goto('/chat/new');
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Wait for the page to finish loading by checking for the prompt suggestions
    await expect(page.locator('text=Try these prompts ✨')).toBeVisible({ timeout: 30000 });
    console.log('Page fully loaded with prompt suggestions visible');

    // Wait for any remaining network requests to complete
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log('Network idle state reached');

    // Ensure no loading indicators are present (indicating loading: false)
    await expect(page.locator('text=Loading session, please wait...')).not.toBeVisible({ timeout: 5000 });
    console.log('No loading indicators present');
  });

  test.afterEach(async ({ page }) => {
    // Clean up route mocks after each test
    await page.unroute('**/api/tutor');
    await page.unroute('**/api/auth/user');
    await page.unroute('**/api/session/*');
  });

  test('should display error message and terminate session for non-K12 prompt', async ({ page, context }) => {
    // Mock /api/tutor using page.route to scope the mock to this page
    await page.route('**/api/tutor', async (route) => {
      console.log('Simulating non-K12 response for /api/tutor request');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          isK12: false,
          error: "The input 'How are you?' is not related to K12 education.",
        }),
      });
    });

    // Verify chat input is visible
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible({ timeout: 30000 });
    console.log('Chat input is visible');

    // Fill the chat input
    await input.fill('How are you?');
    console.log('Filled chat input with: How are you?');

    // Verify the input value to ensure canSubmit is true
    const inputValue = await input.inputValue();
    console.log('Chat input value:', inputValue);
    expect(inputValue).toBe('How are you?');

    // Verify the "Send message" button is visible and enabled
    const sendButton = page.locator('button[aria-label="Send message"]');
    await expect(sendButton).toBeVisible({ timeout: 10000 }).catch(async () => {
      console.log('Send message button not found. Current page HTML:');
      console.log(await page.content());
      throw new Error('Send message button not found on the page');
    });
    await expect(sendButton).toBeEnabled({ timeout: 10000 }).catch(async () => {
      console.log('Send message button is disabled. Current page HTML:');
      console.log(await page.content());
      throw new Error('Send message button is disabled');
    });
    console.log('Send message button is visible and enabled');

    // Submit the chat message
    await sendButton.click();
    console.log('Clicked Send message button');

    // Verify the error message appears in the chat
    await expect(page.getByText('🤔 The input \'How are you?\' is not related to K12 education.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Please start a new chat and try a K12-related problem, like a math or science question! 📚')).toBeVisible({ timeout: 10000 });

    // Verify the message input and prompt suggestions are hidden
    await expect(page.locator('textarea[placeholder="Ask k12beast AI..."]')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Try these prompts ✨')).not.toBeVisible({ timeout: 5000 });

    // Verify the "New Chat" button is visible and functional
    const newChatButton = page.locator('button[aria-label="New chat"]');
    await expect(newChatButton).toBeVisible({ timeout: 5000 });

    // Click the "New Chat" button and verify navigation to /chat/new
    await newChatButton.click();
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Verify the chat history is cleared and message input is visible again
    await expect(page.locator('text=How are you?')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('Ask k12beast AI...')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=Try these prompts ✨')).toBeVisible({ timeout: 5000 });
  });
});