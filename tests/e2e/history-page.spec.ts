// File path: tests/e2e/history-page.spec.ts
// Tests the history page functionality for displaying user sessions

import { test, expect } from './fixtures';

test.describe('History Page', () => {
  test('should display a session in history after creating it', async ({ page, login }, testInfo) => {
    // Increase timeout to 30,000ms to handle delays
    testInfo.setTimeout(30000);

    // Log in the user using the fixture
    await login();

    // Mock the /api/tutor endpoint to return a successful response
    await page.context().route('**/api/tutor', async (route) => {
      console.log('Mocking API request for /api/tutor');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'x-session-id': 'mock-session-id',
          'Authorization': 'Bearer mock-token',
        },
        body: JSON.stringify({
          lesson: '<p>2 + 2 equals 4!</p>',
          isK12: true,
        }),
      });
    });

    // Mock the /api/history endpoint with precise URL matching and logging
    await page.context().route(
      url => url.pathname === '/api/history',
      async (route) => {
        console.log('Mocking API request for /api/history:', route.request().url());
        const mockResponse = {
          sessions: [
            {
              id: 'mock-session-id',
              problem: 'What is 2 + 2?',
              updated_at: '2025-04-10T07:01:00Z',
            },
          ],
        };
        console.log('Mock /api/history response:', JSON.stringify(mockResponse));
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponse),
        });
      }
    );

    // Navigate to the chat page and submit a problem
    await page.goto('/chat/new');
    await expect(page).toHaveURL(/\/chat\/new/);

    // Check for "Session Expired" modal and handle it if present
    const sessionExpiredModal = page.getByText('Session Expired');
    if (await sessionExpiredModal.isVisible({ timeout: 5000 })) {
      console.log('Session Expired modal detected, logging in again...');
      await page.click('button:has-text("Log In")');
      await login(); // Re-run the login fixture
      await page.goto('/chat/new');
      await expect(page).toHaveURL(/\/chat\/new/);
    }

    // Fill and submit a chat message
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible();
    await input.fill('What is 2 + 2?');
    await expect(page.locator('button[aria-label="Send message"]')).toBeEnabled();
    await page.click('button[aria-label="Send message"]');

    // Verify the user message and assistant response appear in the chat
    await expect(page.getByText('What is 2 + 2?')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('2 + 2 equals 4!')).toBeVisible({ timeout: 30000 });

    // Navigate to the history page
    await page.goto('/history');
    await expect(page).toHaveURL(/\/history/);

    // Verify the session is displayed in the history list
    await expect(page.getByText('What is 2 + 2?')).toBeVisible({ timeout: 30000 });
  });

  test('should display multiple sessions in history', async ({ page, login }, testInfo) => {
    testInfo.setTimeout(30000);

    // Log in the user using the fixture
    await login();

    // Mock the /api/history endpoint with multiple sessions
    await page.context().route(
      url => url.pathname === '/api/history',
      async (route) => {
        console.log('Mocking API request for /api/history with multiple sessions:', route.request().url());
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessions: [
              {
                id: 'session-1',
                problem: 'Math Problem',
                updated_at: '2025-04-10T07:01:00Z',
              },
              {
                id: 'session-2',
                problem: 'Science Question',
                updated_at: '2025-04-11T08:02:00Z',
              },
              {
                id: 'session-3',
                problem: 'History Query',
                updated_at: '2025-04-12T09:03:00Z',
              },
            ],
          }),
        });
      }
    );

    // Navigate to the history page
    await page.goto('/history');
    await expect(page).toHaveURL(/\/history/);

    // Verify each mocked session is displayed
    await expect(page.getByText('Math Problem')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Science Question')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('History Query')).toBeVisible({ timeout: 30000 });
  });

  test('should display another set of multiple sessions in history', async ({ page, login }, testInfo) => {
    testInfo.setTimeout(30000);

    // Log in the user using the fixture
    await login();

    // Mock the /api/history endpoint with a different set of sessions
    await page.context().route(
      url => url.pathname === '/api/history',
      async (route) => {
        console.log('Mocking API request for /api/history with another set of sessions:', route.request().url());
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessions: [
              {
                id: 'session-a',
                problem: 'Algebra Challenge',
                updated_at: '2025-05-01T10:00:00Z',
              },
              {
                id: 'session-b',
                problem: 'Biology Puzzle',
                updated_at: '2025-05-02T11:00:00Z',
              },
              {
                id: 'session-c',
                problem: 'Geography Quiz',
                updated_at: '2025-05-03T12:00:00Z',
              },
              {
                id: 'session-d',
                problem: 'Physics Problem',
                updated_at: '2025-05-04T13:00:00Z',
              },
            ],
          }),
        });
      }
    );

    // Navigate to the history page
    await page.goto('/history');
    await expect(page).toHaveURL(/\/history/);

    // Verify each mocked session is displayed
    await expect(page.getByText('Algebra Challenge')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Biology Puzzle')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Geography Quiz')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Physics Problem')).toBeVisible({ timeout: 30000 });
  });
});