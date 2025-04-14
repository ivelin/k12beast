// tests/e2e/session-expiration.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Session Expiration", () => {
  test("should show session expired modal when session expires", async ({ page }) => {
    // Mock session fetch: first request succeeds, second fails with 401
    let requestCount = 0;
    await page.route("**/api/session/mock-session-id", (route, request) => {
      if (request.method() === "GET") {
        requestCount++;
        if (requestCount === 1) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              session: {
                id: "mock-session-id",
                problem: "Teach me addition",
                images: [],
                lesson: "<p>Let's learn about addition!</p>",
                messages: [],
              },
            }),
          });
        }
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Session expired" }),
        });
      }
      return route.continue();
    });

    // Start chat
    await page.goto("/chat/mock-session-id");

    // Trigger session expiration (critical user flow)
    await page.reload({ waitUntil: "domcontentloaded" });

    // Verify error modal (critical user-facing check)
    await expect(page.locator("text=Oops!")).toBeVisible({ timeout: 5000 });

    // Click "Start New Chat" and verify redirect (critical user flow)
    await page.click('button:has-text("Start New Chat")');
    await page.waitForURL(/\/public\/login/, { timeout: 5000 });
  });
});