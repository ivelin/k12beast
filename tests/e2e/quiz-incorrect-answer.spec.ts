// tests/e2e/quiz-incorrect-answer.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Quiz Incorrect Answer Feedback", () => {
  test("should show encouragement and readiness for incorrect answer", async ({ page }) => {
    // Mock APIs
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
      console.log("Mocking /api/validate with readiness: 0.75");
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isCorrect: false,
          encouragement: "Good effort! Let's try another one.",
          solution: [
            { title: "Step 1", content: "Add: 2 + 3." },
            { title: "Step 2", content: "Total is 5." },
          ],
          readiness: 0.75,
        }),
      });
    });

    // Start chat
    await page.goto("/chat/new");
    await page.waitForURL(/\/chat\/new/, { timeout: 5000 });
    await page.waitForSelector('textarea[placeholder="Ask k12beast AI..."]', { timeout: 5000 });

    // Submit problem
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', "Help me with 2+3");
    await page.click('button[aria-label="Send message"]');
    await expect(page.locator("text=Lesson: Adding numbers.")).toBeVisible({ timeout: 5000 });

    // Request quiz
    await page.click('button:has-text("Take a Quiz")');
    await expect(page.locator("text=What is 2 + 3?")).toBeVisible({ timeout: 5000 });

    // Submit incorrect answer
    await page.click('label:has-text("4")');
    await page.click('button:has-text("Submit Quiz")');

    // Verify critical feedback
    await expect(page.locator("text=Good effort! Let's try another one.")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Test Readiness:")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=75%")).toBeVisible({ timeout: 5000 });
  });
});