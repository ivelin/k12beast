// File path: tests/e2e/layout-centering.spec.ts
// Regression tests to ensure the chat area is centered on desktop and full-width on mobile.
// Focuses on user-critical layout behavior without testing brittle implementation details.
// Tests both live chat and public session pages to verify consistency.
// Added checks for user and assistant message alignment (right and left, respectively).
// Updated expected width to match project's custom max-w-5xl value of 1024px.
// Added waitFor to ensure messages are rendered before checking alignment.

import { test, expect } from './fixtures';

// Viewport sizes for testing
const desktopViewport = { width: 1440, height: 900 }; // Desktop (above sm breakpoint)
const mobileViewport = { width: 375, height: 667 };   // Mobile (below sm breakpoint)

// Mock session data for consistency
async function mockSessionData(page, sessionId) {
  await page.route(`**/api/session/${sessionId}`, async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        session: {
          id: sessionId,
          problem: "Test problem",
          messages: [
            { role: "user", content: "Hi", created_at: new Date().toISOString() },
            { role: "assistant", content: "Hello!", created_at: new Date().toISOString() },
          ],
        },
      }),
    });
  });
}

test.describe('Chat Layout Tests', () => {
  test.describe('Live Chat Page (Authenticated)', () => {
    test('Centered on desktop with proper message alignment', async ({ page, login }) => {
      await login();
      await page.setViewportSize(desktopViewport);

      const sessionId = 'test-session-123';
      await mockSessionData(page, sessionId);
      await page.goto(`/chat/${sessionId}`);

      const chatContainer = page.locator('main > div');
      await expect(chatContainer).toBeVisible();

      const containerBox = await chatContainer.boundingBox();
      expect(containerBox.width).toBeGreaterThanOrEqual(1004); // Approx max-w-5xl (1024px - 20px tolerance)
      expect(containerBox.width).toBeLessThanOrEqual(1044);    // 1024px + 20px tolerance
      const leftMargin = containerBox.x;
      const rightMargin = desktopViewport.width - (containerBox.x + containerBox.width);
      expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(10); // Centered

      // Wait for messages to be rendered
      const userMessage = page.locator('[id="user"]').first();
      const assistantMessage = page.locator('[id="assistant"]').first();
      await expect(userMessage).toBeVisible({ timeout: 20000 });
      await expect(assistantMessage).toBeVisible({ timeout: 20000 });

      const userMessageBox = await userMessage.boundingBox();
      const userMessageRightEdge = userMessageBox.x + userMessageBox.width;
      const containerRightEdge = containerBox.x + containerBox.width;
      expect(containerRightEdge - userMessageRightEdge).toBeLessThan(20); // User message on the right

      const assistantMessageBox = await assistantMessage.boundingBox();
      const assistantMessageLeftEdge = assistantMessageBox.x;
      const containerLeftEdge = containerBox.x;
      expect(assistantMessageLeftEdge - containerLeftEdge).toBeLessThan(20); // Assistant message on the left
    });

    test('Full-width on mobile with proper message alignment', async ({ page, login }) => {
      await login();
      await page.setViewportSize(mobileViewport);
      const sessionId = 'test-session-123';
      await mockSessionData(page, sessionId);
      await page.goto(`/chat/${sessionId}`);

      const chatContainer = page.locator('main > div');
      await expect(chatContainer).toBeVisible();
      const containerBox = await chatContainer.boundingBox();
      expect(containerBox.width).toBeGreaterThanOrEqual(mobileViewport.width - 20); // Full-width minus padding

      // Wait for messages to be rendered
      const userMessage = page.locator('[id="user"]').first();
      const assistantMessage = page.locator('[id="assistant"]').first();
      await expect(userMessage).toBeVisible({ timeout: 20000 });
      await expect(assistantMessage).toBeVisible({ timeout: 20000 });

      const userMessageBox = await userMessage.boundingBox();
      const userMessageRightEdge = userMessageBox.x + userMessageBox.width;
      const containerRightEdge = containerBox.x + containerBox.width;
      expect(containerRightEdge - userMessageRightEdge).toBeLessThan(20);

      const assistantMessageBox = await assistantMessage.boundingBox();
      const assistantMessageLeftEdge = assistantMessageBox.x;
      const containerLeftEdge = containerBox.x;
      expect(assistantMessageLeftEdge - containerLeftEdge).toBeLessThan(20);
    });
  });

  test.describe('Public Session Page (No Auth)', () => {
    test('Centered on desktop with proper message alignment', async ({ page }) => {
      await page.setViewportSize(desktopViewport);

      const sessionId = 'public-session-456';
      await mockSessionData(page, sessionId);
      await page.goto(`/public/session/${sessionId}`);

      const chatContainer = page.locator('main > div');
      await expect(chatContainer).toBeVisible();

      const containerBox = await chatContainer.boundingBox();
      expect(containerBox.width).toBeGreaterThanOrEqual(1004); // Approx max-w-5xl (1024px - 20px tolerance)
      expect(containerBox.width).toBeLessThanOrEqual(1044);    // 1024px + 20px tolerance
      const leftMargin = containerBox.x;
      const rightMargin = desktopViewport.width - (containerBox.x + containerBox.width);
      expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(10);

      // Wait for messages to be rendered
      const userMessage = page.locator('[id="user"]').first();
      const assistantMessage = page.locator('[id="assistant"]').first();
      await expect(userMessage).toBeVisible({ timeout: 20000 });
      await expect(assistantMessage).toBeVisible({ timeout: 20000 });

      const userMessageBox = await userMessage.boundingBox();
      const userMessageRightEdge = userMessageBox.x + userMessageBox.width;
      const containerRightEdge = containerBox.x + containerBox.width;
      expect(containerRightEdge - userMessageRightEdge).toBeLessThan(20);

      const assistantMessageBox = await assistantMessage.boundingBox();
      const assistantMessageLeftEdge = assistantMessageBox.x;
      const containerLeftEdge = containerBox.x;
      expect(assistantMessageLeftEdge - containerLeftEdge).toBeLessThan(20);
    });

    test('Full-width on mobile with proper message alignment', async ({ page }) => {
      await page.setViewportSize(mobileViewport);
      const sessionId = 'public-session-456';
      await mockSessionData(page, sessionId);
      await page.goto(`/public/session/${sessionId}`);

      const chatContainer = page.locator('main > div');
      await expect(chatContainer).toBeVisible();
      const containerBox = await chatContainer.boundingBox();
      expect(containerBox.width).toBeGreaterThanOrEqual(mobileViewport.width - 20);

      // Wait for messages to be rendered
      const userMessage = page.locator('[id="user"]').first();
      const assistantMessage = page.locator('[id="assistant"]').first();
      await expect(userMessage).toBeVisible({ timeout: 20000 });
      await expect(assistantMessage).toBeVisible({ timeout: 20000 });

      const userMessageBox = await userMessage.boundingBox();
      const userMessageRightEdge = userMessageBox.x + userMessageBox.width;
      const containerRightEdge = containerBox.x + containerBox.width;
      expect(containerRightEdge - userMessageRightEdge).toBeLessThan(20);

      const assistantMessageBox = await assistantMessage.boundingBox();
      const assistantMessageLeftEdge = assistantMessageBox.x;
      const containerLeftEdge = containerBox.x;
      expect(assistantMessageLeftEdge - containerLeftEdge).toBeLessThan(20);
    });
  });
});