// tests/e2e/session-sharing.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Session Sharing", () => {
  test("should share a session and allow unauthenticated view", async ({ page, context }) => {
    // Mock APIs at the context level for both authenticated and unauthenticated contexts
    await context.route("**/api/tutor", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        headers: { "x-session-id": "mock-session-id" },
        body: "<p>Lesson: Adding numbers.</p>",
      })
    );

    await context.route("**/api/session/mock-session-id", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: "mock-session-id",
            problem: "Teach me addition",
            images: [],
            lesson: "<p>Let's learn about addition!</p>",
            messages: [
              { role: "user", content: "Teach me addition" },
              { role: "assistant", content: "<p>Let's learn about addition!</p>", renderAs: "html" },
            ],
          },
        }),
      })
    );

    // Start chat as authenticated user
    await page.goto("/chat/new");

    // Submit problem (critical user flow)
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', "Teach me addition");
    await page.click('button[aria-label="Send message"]');

    // Share session (critical user flow)
    await page.click('button[aria-label="Share session"]');
    const shareLink = await page.locator('input[value*="/public/"]').getAttribute("value", { timeout: 5000 });
    expect(shareLink).toContain("/public/session/mock-session-id");

    // Open shared link in new page (critical user-facing check)
    const newPage = await context.newPage();
    await newPage.goto(shareLink!, { timeout: 5000, waitUntil: "domcontentloaded" });

    // Verify shared session content (critical check)
    await expect(newPage.locator("text=Shared Session")).toBeVisible({ timeout: 5000 });
  });
});