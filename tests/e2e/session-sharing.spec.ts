// File path: tests/e2e/session-sharing.spec.ts
// Tests the session sharing flow for authenticated users and unauthenticated viewing

import { test } from './fixtures';
import { expect } from '@playwright/test';

test.describe('Session Sharing', () => {
  const mockSessionId = 'mock-session-id';
  const shareLink = `http://localhost:3000/public/session/${mockSessionId}`;

  test('should allow unauthenticated view of a shared session', async ({ context, page, logout }) => {
    // Ensure the context has no cookies or origins to start as unauthenticated
    await context.clearCookies();
    await context.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Use the logout fixture to ensure the user is unauthenticated
    await logout({ page });

    // Verify we are on the /logout page
    console.log("page URL after logout:", await page.url());
    await expect(page).toHaveURL("http://localhost:3000/logout", { timeout: 30000 });
    await expect(page.getByText("You have been successfully logged out.")).toBeVisible({ timeout: 30000 });

    // Verify the user is in an unauthenticated state by checking for the absence of the auth token cookie
    const cookies = await context.cookies();
    const authTokenCookie = cookies.find(cookie => cookie.name === 'supabase-auth-token');
    expect(authTokenCookie).toBeUndefined();
    console.log("Cookies after logout:", cookies);

    // Mock /api/session/[sessionId] for unauthenticated access
    await context.route(`**/api/session/${mockSessionId}`, async (route) => {
      console.log(`Mocking API request for /api/session/${mockSessionId} (unauthenticated)`);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: mockSessionId,
            problem: 'What is 2 + 2 in math?',
            images: [],
            lesson: '<p>Lesson: Adding numbers. 2 + 2 = <math><mn>4</mn></math>.</p>',
            messages: [
              { role: "user", content: "What is 2 + 2 in math?", renderAs: "markdown" },
              { role: "assistant", content: '<p>Lesson: Adding numbers. 2 + 2 = <math><mn>4</mn></math>.</p>', renderAs: "html" },
            ],
            created_at: '2025-04-15T22:46:59.123Z',
            updated_at: '2025-04-15T22:46:59.123Z',
            cloned_from: null,
            isPublic: true,
          },
        }),
      });
    });

    // Navigate to the shared link
    console.log(`Navigating to shared link: ${shareLink}`);
    await page.goto(shareLink);
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Check for error dialog
    const errorDialog = page.getByText('Session not found');
    await expect(errorDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Error dialog detected: Session not found');
      throw new Error('Failed to load shared session for unauthenticated user');
    });

    // Verify session content is visible
    await expect(page.locator('.MathJax').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('What is 2 + 2 in math?').first()).toBeVisible({ timeout: 30000 });

    // Verify the "Log in to clone" message is present (unauthenticated user cannot clone)
    await expect(page.getByText(/Log in to clone this session/i)).toBeVisible({ timeout: 30000 });

    // Verify the "Clone" button is not present
    await expect(page.getByRole('button', { name: /clone/i })).not.toBeVisible({ timeout: 30000 });

    // Clean up is handled by the fixture system
  });

  test('should share a session as an authenticated user', async ({ page, login, context }) => {
    // Log in the user using the fixture
    await login({ page, context });

    // Mock /api/tutor to create a session
    await context.route('**/api/tutor', async (route) => {
      console.log('Mocking API request for /api/tutor');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': mockSessionId },
        body: JSON.stringify({
          lesson: '<p>Lesson: Adding numbers. 2 + 2 = <math><mn>4</mn></math>.</p>',
          isK12: true,
        }),
      });
    });

    // Mock /api/session/[sessionId] for authenticated access
    await context.route(`**/api/session/${mockSessionId}`, async (route) => {
      console.log(`Mocking API request for /api/session/${mockSessionId}`);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: mockSessionId,
            problem: 'What is 2 + 2 in math?',
            images: [],
            lesson: '<p>Lesson: Adding numbers. 2 + 2 = <math><mn>4</mn></math>.</p>',
            messages: [
              { role: "user", content: "What is 2 + 2 in math?", renderAs: "markdown" },
              { role: "assistant", content: '<p>Lesson: Adding numbers. 2 + 2 = <math><mn>4</mn></math>.</p>', renderAs: "html" },
            ],
            created_at: '2025-04-15T22:46:59.123Z',
            updated_at: '2025-04-15T22:46:59.123Z',
            cloned_from: null,
            isPublic: true,
          },
        }),
      });
    });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Wait for the chat input to be visible, accounting for client-side rendering
    await page.waitForSelector('textarea[placeholder="Ask k12beast AI..."]', { timeout: 30000 });

    // Verify chat input is visible
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible({ timeout: 30000 });
    console.log('Filling chat input');
    await input.fill('What is 2 + 2 in math?');

    // Verify send button is enabled
    const sendButton = page.getByRole('button', { name: 'Send message' });
    await expect(sendButton).toBeEnabled({ timeout: 30000 });
    console.log('Submitting chat message');
    await sendButton.click();

    // Check for error dialog
    const errorDialog = page.getByText('Unexpected token');
    await expect(errorDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Error dialog detected: Unexpected token');
      throw new Error('Failed to process chat message due to invalid JSON response');
    });

    // Wait for MathJax rendering to confirm the session loaded
    console.log('Waiting for assistant response');
    await page.waitForSelector('.MathJax', { timeout: 30000 });
    await expect(page.locator('.MathJax').first()).toBeVisible({ timeout: 30000 });

    // Verify session content is visible (ensure no duplication)
    const userMessages = page.getByText('What is 2 + 2 in math?');
    await expect(userMessages).toHaveCount(1, { timeout: 30000 }); // Ensure no duplication
    await expect(userMessages.first()).toBeVisible({ timeout: 30000 });

    const assistantMessages = page.getByText('Lesson: Adding numbers. 2 + 2 = 4');
    await expect(assistantMessages).toHaveCount(1, { timeout: 30000 }); // Ensure no duplication
    await expect(assistantMessages.first()).toBeVisible({ timeout: 30000 });

    // Navigate to the session page manually since redirect does not occur
    console.log(`Navigating to /chat/${mockSessionId}`);
    await page.goto(`/chat/${mockSessionId}`);
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify session content is visible on the session page
    await expect(page.locator('.MathJax').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('What is 2 + 2 in math?').first()).toBeVisible({ timeout: 30000 });

    // Share session (critical user flow)
    console.log('Locating and clicking Share button');
    await page.waitForSelector('button[aria-label="Share session"]', { timeout: 30000 });
    await page.click('button[aria-label="Share session"]', { timeout: 30000 });
    const shareLinkResult = await page.locator('input[value*="/public/"]').getAttribute("value", { timeout: 5000 });
    expect(shareLinkResult).toContain(`/public/session/${mockSessionId}`);
  });
});