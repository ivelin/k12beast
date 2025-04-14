// tests/e2e/quiz-validate-readiness.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Quiz Validation Readiness Feedback", () => {
  test("should display single readiness value and encouragement for correct and incorrect answers", async ({ page }) => {
    // Mock /api/tutor to start a session
    await page.route("**/api/tutor", (route) => {
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        headers: { "x-session-id": "mock-session-id" },
        body: "<p>Lesson: Adding numbers combines their values.</p>",
      });
    });

    // Mock /api/quiz to return a quiz
    await page.route("**/api/quiz", (route) => {
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

    // Mock /api/validate for correct answer
    await page.route("**/api/validate", (route, request) => {
      const body = JSON.parse(request.postData() || "{}");
      if (body.answer === "5") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            isCorrect: true,
            encouragement: "Well done! You nailed it!",
            solution: [
              { title: "Step 1", content: "Add the numbers: 2 + 3." },
              { title: "Step 2", content: "The total is 5." },
            ],
            readiness: 0.92, // Single readiness value
          }),
        });
      } else if (body.answer === "4") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            isCorrect: false,
            encouragement: "Good effort! Let's try another one.",
            solution: [
              { title: "Step 1", content: "Add the numbers: 2 + 3." },
              { title: "Step 2", content: "The total is 5." },
            ],
            readiness: 0.75, // Single readiness value
          }),
        });
      }
    });

    // Navigate to chat page
    await page.goto("/chat/new");
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 5000 });
    await page.waitForSelector('textarea[placeholder="Ask k12beast AI..."]');

    // Submit a problem to start a session
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', "Help me with 2+3");
    await page.click('button[aria-label="Send message"]');
    await expect(page.locator("text=Lesson: Adding numbers combines their values.")).toBeVisible({ timeout: 5000 });

    // Request a quiz
    await page.click('button:has-text("Take a Quiz")');
    await expect(page.locator("text=What is 2 + 3?")).toBeVisible({ timeout: 5000 });

    // Test Case 1: Submit correct answer
    await page.click('label:has-text("5")');
    await page.click('button:has-text("Submit Quiz")');

    // Verify correct answer feedback
    await expect(page.locator("text=Well done! You nailed it!")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Test Readiness:")).toBeVisible();
    await expect(page.locator("text=92%")).toBeVisible();

    // Verify absence of hardcoded motivational messages
    await expect(page.locator("text=You're doing amazing")).not.toBeVisible();
    await expect(page.locator("text=Great progress")).not.toBeVisible();

    // Start a new session for incorrect answer test
    await page.click('button[aria-label="New chat"]');
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', "Help me with 2+3");
    await page.click('button[aria-label="Send message"]');
    await expect(page.locator("text=Lesson: Adding numbers combines their values.")).toBeVisible({ timeout: 5000 });

    // Request a quiz again
    await page.click('button:has-text("Take a Quiz")');
    await expect(page.locator("text=What is 2 + 3?")).toBeVisible({ timeout: 5000 });

    // Test Case 2: Submit incorrect answer
    await page.click('label:has-text("4")');
    await page.click('button:has-text("Submit Quiz")');

    // Verify incorrect answer feedback
    await expect(page.locator("text=Good effort! Let's try another one.")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Test Readiness:")).toBeVisible();
    await expect(page.locator("text=75%")).toBeVisible();

    // Verify absence of hardcoded motivational messages
    await expect(page.locator("text=You're making progress")).not.toBeVisible();
    await expect(page.locator("text=Let's keep practicing")).not.toBeVisible();
  });
});