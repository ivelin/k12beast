// tests/e2e/quiz-correct-answer.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Quiz Correct Answer Feedback V3", () => {
  test("should show encouragement and readiness for correct answer", async ({ page }) => {
    // Mock APIs with increased timeouts and logging
    await page.route("**/api/tutor", (route) => {
      console.log("Mocking /api/tutor");
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        headers: { "x-session-id": "mock-session-id" },
        body: "<p>Lesson: Adding numbers.</p>",
      });
    });
    await page.route("**/api/quiz", (route) => {
      console.log("Mocking /api/quiz");
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
      });
    });
    await page.route("**/api/validate", (route) => {
      console.log("Mocking /api/validate with readiness: 0.92");
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
      });
    });

    // Start chat
    await page.goto("/chat/new");
    await page.waitForURL(/\/chat\/new/, { timeout: 15000 });
    await page.waitForSelector('textarea[placeholder="Ask k12beast AI..."]', { timeout: 15000 });

    // Submit problem
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', "Help me with 2+3");
    await page.click('button[aria-label="Send message"]');
    await expect(page.locator("text=Lesson: Adding numbers.")).toBeVisible({ timeout: 15000 });

    // Request quiz
    await page.click('button:has-text("Take a Quiz")');
    await expect(page.locator("text=What is 2 + 3?")).toBeVisible({ timeout: 15000 });

    // Submit correct answer
    await page.click('label:has-text("5")');
    await page.click('button:has-text("Submit Quiz")');

    // Verify critical feedback
    await expect(page.locator("text=Well done! You nailed it!")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Test Readiness:")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=92%")).toBeVisible({ timeout: 15000 });
  });
});