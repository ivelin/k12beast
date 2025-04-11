// tests/e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Page - Request Example', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/chat/new');
    await page.waitForURL(/\/chat\/new/);
    await page.waitForSelector('text=Try these prompts ✨');
  });

  test('should handle Request Example successfully', async ({ page }) => {
    await page.route('**/api/tutor', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'x-session-id': 'mock-session-id' },
        body: '<p>Let’s dive into your test problem. What is the subject?</p>',
      });
    });

    await page.route('**/api/examples', (route) => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            problem: "Which action converts chemical energy to mechanical energy?",
            solution: [{ title: "Step 1", content: "Identify chemical and mechanical energy." }],
          }),
        });
      }, 500);
    });

    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'Test problem');
    await page.click('button[aria-label="Send message"]');
    await page.waitForSelector('text=What would you like to do next?');

    await page.click('text=Request Example');
    await page.waitForSelector('text=Request Example');
    await page.waitForSelector('text=Example:');
    await page.waitForSelector('text=What would you like to do next?');
  });

  test('should handle Request Example timeout', async ({ page }) => {
    await page.route('**/api/tutor', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'x-session-id': 'mock-session-id' },
        body: '<p>Let’s dive into your test problem. What is the subject?</p>',
      });
    });

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

    await page.waitForSelector('text=Oops! The AI had a little glitch');
    await expect(page.locator('text=Oops! The AI had a little glitch')).toContainText("Oops! The AI had a little glitch and was snoozing. Let's try again in a moment!");
    await page.waitForSelector('text=What would you like to do next?');
  });
});