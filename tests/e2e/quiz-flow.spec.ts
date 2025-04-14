// tests/e2e/quiz-flow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Quiz Flow E2E Test", () => {
  test("should complete quiz flow", async ({ page }) => {
    // Mock APIs
    await page.route("**/api/tutor", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        headers: { "x-session-id": "mock-session-id" },
        body: "<p>Lesson: Adding numbers.</p>",
      })
    );
    await page.route("**/api/quiz", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "x-session-id": "mock-session-id" },
        body: JSON.stringify({
          problem: "What is 2 + 3?",
          answerFormat: "multiple-choice",
          options: ["3", "4", "5", "6"],
          difficulty: "easy",
        }),
      })
    );
    await page.route("**/api/validate", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isCorrect: true,
          encouragement: "Well done! You nailed it!",
          solution: [
            { title: "Step 1", content: "Add: 2 + 3." },
            { title: "Step 2", content: "Total is 5." },
          ],
          readiness: 0.92,
        }),
      })
    );

    // Start chat
    await page.goto("/chat/new");

    // Submit problem (critical user flow)
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', "Help me with 2+3");
    await page.click('button[aria-label="Send message"]');

    // Request quiz (critical user flow)
    await page.click('button:has-text("Take a Quiz")');
    await expect(page.locator("text=What is 2 + 3?")).toBeVisible({ timeout: 5000 });

    // Submit correct answer (critical user flow)
    await page.click('label:has-text("5")');
    await page.click('button:has-text("Submit Quiz")');

    // Verify quiz feedback (critical user-facing check)
    await expect(page.locator("text=Well done! You nailed it!")).toBeVisible({ timeout: 5000 });
  });
});