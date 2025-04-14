// tests/e2e/quiz-validate-readiness.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Quiz Validation Readiness Feedback", () => {
  // Helper function to set up a new chat session and request a quiz
  const setupChatAndQuiz = async (page: any) => {
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
          correctAnswer: "5",
        }),
      });
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
  };

  // Helper function to mock /api/validate with a specific readiness value
  const mockValidateRoute = (page: any, answer: string, readiness: number, isCorrect: boolean) => {
    return page.route("**/api/validate", (route, request) => {
      const body = JSON.parse(request.postData() || "{}");
      if (body.answer === answer) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            isCorrect,
            encouragement: isCorrect ? "Well done! You nailed it!" : "Good effort! Let's try another one.",
            solution: [
              { title: "Step 1", content: "Add the numbers: 2 + 3." },
              { title: "Step 2", content: "The total is 5." },
            ],
            readiness,
            correctAnswer: "5",
          }),
        });
      } else {
        route.continue();
      }
    });
  };

  test("should display readiness progress bar at 15% with red color", async ({ page }) => {
    await setupChatAndQuiz(page);
    await mockValidateRoute(page, "4", 0.15, false); // Incorrect answer, 15% readiness
    await page.click('label:has-text("4")');
    await page.click('button:has-text("Submit Quiz")');
    await expect(page.locator("text=Good effort! Let's try another one.")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Test Readiness:")).toBeVisible();
    await expect(page.locator("text=15%")).toBeVisible();
    const progressBar = page.locator(".readiness-bar");
    await expect(progressBar).toBeVisible({ timeout: 5000 });
    const style = await progressBar.getAttribute("style");
    expect(style).toContain("width: 15%");
    const backgroundColor = await progressBar.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(backgroundColor).toBe("rgb(244, 67, 54)"); // #f44336 (red)
    await expect(page.locator("text=You're making progress")).not.toBeVisible();
    await expect(page.locator("text=Let's keep practicing")).not.toBeVisible();
  });

  test("should display readiness progress bar at 45% with orange color", async ({ page }) => {
    await setupChatAndQuiz(page);
    await mockValidateRoute(page, "4", 0.45, false); // Incorrect answer, 45% readiness
    await page.click('label:has-text("4")');
    await page.click('button:has-text("Submit Quiz")');
    await expect(page.locator("text=Good effort! Let's try another one.")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Test Readiness:")).toBeVisible();
    await expect(page.locator("text=45%")).toBeVisible();
    const progressBar = page.locator(".readiness-bar");
    await expect(progressBar).toBeVisible({ timeout: 5000 });
    const style = await progressBar.getAttribute("style");
    expect(style).toContain("width: 45%");
    const backgroundColor = await progressBar.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(backgroundColor).toBe("rgb(255, 152, 0)"); // #ff9800 (orange)
    await expect(page.locator("text=You're making progress")).not.toBeVisible();
    await expect(page.locator("text=Let's keep practicing")).not.toBeVisible();
  });

  test("should display readiness progress bar at 65% with yellow color", async ({ page }) => {
    await setupChatAndQuiz(page);
    await mockValidateRoute(page, "4", 0.65, false); // Incorrect answer, 65% readiness
    await page.click('label:has-text("4")');
    await page.click('button:has-text("Submit Quiz")');
    await expect(page.locator("text=Good effort! Let's try another one.")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Test Readiness:")).toBeVisible();
    await expect(page.locator("text=65%")).toBeVisible();
    const progressBar = page.locator(".readiness-bar");
    await expect(progressBar).toBeVisible({ timeout: 5000 });
    const style = await progressBar.getAttribute("style");
    expect(style).toContain("width: 65%");
    const backgroundColor = await progressBar.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(backgroundColor).toBe("rgb(255, 235, 59)"); // #ffeb3b (yellow)
    await expect(page.locator("text=You're making progress")).not.toBeVisible();
    await expect(page.locator("text=Let's keep practicing")).not.toBeVisible();
  });

  test("should display readiness progress bar at 85% with yellow-green color", async ({ page }) => {
    await setupChatAndQuiz(page);
    await mockValidateRoute(page, "5", 0.85, true); // Correct answer, 85% readiness
    await page.click('label:has-text("5")');
    await page.click('button:has-text("Submit Quiz")');
    await expect(page.locator("text=Well done! You nailed it!")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Test Readiness:")).toBeVisible();
    await expect(page.locator("text=85%")).toBeVisible();
    const progressBar = page.locator(".readiness-bar");
    await expect(progressBar).toBeVisible({ timeout: 5000 });
    const style = await progressBar.getAttribute("style");
    expect(style).toContain("width: 85%");
    const backgroundColor = await progressBar.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(backgroundColor).toBe("rgb(205, 220, 57)"); // #cddc39 (yellow-green)
    await expect(page.locator("text=You're doing amazing")).not.toBeVisible();
    await expect(page.locator("text=Great progress")).not.toBeVisible();
  });

  test("should display readiness progress bar at 92% with green color", async ({ page }) => {
    await setupChatAndQuiz(page);
    await mockValidateRoute(page, "5", 0.92, true); // Correct answer, 92% readiness
    await page.click('label:has-text("5")');
    await page.click('button:has-text("Submit Quiz")');
    await expect(page.locator("text=Well done! You nailed it!")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Test Readiness:")).toBeVisible();
    await expect(page.locator("text=92%")).toBeVisible();
    const progressBar = page.locator(".readiness-bar");
    await expect(progressBar).toBeVisible({ timeout: 5000 });
    const style = await progressBar.getAttribute("style");
    expect(style).toContain("width: 92%");
    const backgroundColor = await progressBar.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(backgroundColor).toBe("rgb(76, 175, 80)"); // #4caf50 (green)
    await expect(page.locator("text=You're doing amazing")).not.toBeVisible();
    await expect(page.locator("text=Great progress")).not.toBeVisible();
  });
});