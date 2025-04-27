// tests/e2e/examples-quiz-share.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Examples and Quiz Flow E2E Test", () => {
  test("should request example and complete quiz", async ({ page, context }) => {
    // Mock APIs
    await page.route("**/api/tutor", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "x-session-id": "mock-session-id" },
        body: JSON.stringify({
          lesson: "<p>Lesson: Adding numbers. 2 + 3 = <math><mn>5</mn></math>.</p>",
          isK12: true,
        }),
      })
    );
    await page.route("**/api/examples", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          problem: "Example: 1 + 1",
          solution: [
            { title: "Step 1", content: "Add: 1 + 1." },
            { title: "Step 2", content: "Total is 2." },
          ],
        }),
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
          options: ["A: 3", "B: 4", "C: 5", "D: 6"],
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
    await page.waitForURL(/\/chat\/new/, { timeout: 5000 });
    await page.waitForSelector('textarea[placeholder="Ask k12beast AI..."]', { timeout: 5000 });

    // Submit problem
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', "Help me with 2+3");
    await page.click('button[aria-label="Send message"]');
    await expect(page.locator("text=Lesson: Adding numbers.")).toBeVisible({ timeout: 5000 });

    // Request example
    await page.click('button:has-text("Request Example")');
    await expect(page.locator("text=Example: 1 + 1")).toBeVisible({ timeout: 5000 });

    // Request quiz
    await page.click('button:has-text("Take a Quiz")');
    await expect(page.locator("text=What is 2 + 3?")).toBeVisible({ timeout: 5000 });

    // Submit correct answer
    await page.click('label:has-text("C")');
    await page.click('button:has-text("Submit Quiz")');

    // Verify quiz feedback
    await expect(page.locator("text=Well done! You nailed it!")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Test Readiness:")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=92%")).toBeVisible({ timeout: 5000 });
  });
});