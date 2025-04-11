// tests/e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Page - Request Example', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/public/login');

    // Fill in the login form and submit
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to /chat/new
    await page.waitForURL(/\/chat\/new/, { timeout: 10000 });

    // Wait for the chat page to load (prompt suggestions should be visible)
    await page.waitForSelector('text=Try these prompts ✨', { timeout: 10000 });
  });

  test('should handle Request Example successfully', async ({ page }) => {
    // Mock the /api/tutor endpoint for the initial problem submission
    await page.route('**/api/tutor', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'x-session-id': 'mock-session-id' },
        body: '<p>Let’s dive into your test problem. What is the subject?</p>',
      });
    });

    // Mock the /api/examples endpoint to return a successful response with a delay
    await page.route('**/api/examples', (route) => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            problem: "Which action converts chemical energy to mechanical energy?",
            solution: [
              { title: "Step 1", content: "Identify chemical and mechanical energy." },
            ],
          }),
        });
      }, 500); // 500ms delay to simulate server response
    });

    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'Test problem');
    await page.click('button[aria-label="Send message"]');

    // Wait for the prompt suggestions to appear after problem submission
    await page.waitForSelector('text=What would you like to do next?');

    // Click "Request Example" and validate the user-facing outcome
    await page.click('text=Request Example');
    await page.waitForSelector('text=Request Example'); // User message
    await page.waitForSelector('text=Example:'); // Assistant response
    await page.waitForSelector('text=What would you like to do next?'); // Prompt suggestions reappear
  });

  test('should handle Request Example timeout', async ({ page }) => {
    // Mock the /api/tutor endpoint for the initial problem submission
    await page.route('**/api/tutor', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'x-session-id': 'mock-session-id' },
        body: '<p>Let’s dive into your test problem. What is the subject?</p>',
      });
    });

    // Mock the /api/examples endpoint to simulate a timeout error
    await page.route('**/api/examples', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({
          error: "Oops! The AI had a little glitch and was snoozing. Let's try again in a moment!",
        }),
      });
    });

    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'Test problem');
    await page.click('button[aria-label="Send message"]');
    await page.waitForSelector('text=What would you like to do next?');
    await page.click('text=Request Example');

    // Wait for the timeout error message and validate the final state
    await page.waitForSelector('text=Oops! The AI had a little glitch');
    await expect(page.locator('text=Oops! The AI had a little glitch')).toContainText("Oops! The AI had a little glitch and was snoozing. Let's try again in a moment!");
    await page.waitForSelector('text=What would you like to do next?');
  });
});