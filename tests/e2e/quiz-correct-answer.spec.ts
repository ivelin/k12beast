// File path: tests/e2e/quiz-correct-answer.spec.ts
// Tests quiz correct answer feedback for authenticated users

import { test, expect } from "./fixtures";

test.describe("Quiz Correct Answer Feedback", () => {
  test("should show encouragement and readiness for correct answer", async ({ page, login }) => {
    // Log in the user using the fixture
    await login();

    // Mock APIs
    await page.route("**/api/tutor", (route) => {
      console.log("Mocking /api/tutor");
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "x-session-id": "mock-session-id" },
        body: JSON.stringify({
          lesson: "<p>Lesson: Adding numbers.</p>",
          isK12: true,
        }),
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
          options: ["A: 3", "B: 4", "C:5", "D:6"],
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
    await page.waitForURL(/\/chat\/new/, { timeout: 30000 });
    await page.waitForSelector('textarea[placeholder="Ask k12beast AI..."]', { timeout: 30000 });

    // Submit problem
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', "Help me with 2+3");
    await page.click('button[aria-label="Send message"]');

    // Check for error dialog
    const errorDialog = page.getByText('Unexpected token');
    await expect(errorDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Error dialog detected: Unexpected token');
      throw new Error('Failed to process chat message due to invalid JSON response');
    });

    // Verify assistant response
    await expect(page.getByText("Lesson: Adding numbers.")).toBeVisible({ timeout: 30000 });

    // Request quiz
    await page.click('button:has-text("Take a Quiz")');
    await expect(page.getByText("What is 2 + 3?")).toBeVisible({ timeout: 30000 });

    // Debug: Log available quiz options
    console.log("Available quiz options:");
    const options = await page.locator('label').allTextContents();
    console.log(options);

    // Submit correct answer
    // Locate the option "5" and determine its index in the options list
    const optionElements = page.locator('ul li');
    const optionCount = await optionElements.count();
    let optionIndex = -1;
    for (let i = 0; i < optionCount; i++) {
      const optionText = await optionElements.nth(i).textContent();
      if (optionText.includes("C")) {
        optionIndex = i;
        break;
      }
    }
    if (optionIndex === -1) {
      throw new Error("Option '5' not found in quiz options");
    }

    // Map the index to the corresponding radio button (A=0, B=1, C=2, etc.)
    const radioButton = page.locator(`input[type="radio"][value="${String.fromCharCode(65 + optionIndex)}"]`);
    await expect(radioButton).toBeVisible({ timeout: 30000 });
    await radioButton.click({ timeout: 30000 });

    // Verify "Submit Quiz" button is enabled
    const submitButton = page.locator('button:has-text("Submit Quiz")');
    await expect(submitButton).toBeEnabled({ timeout: 30000 });

    // Submit the quiz
    await submitButton.click({ timeout: 30000 });

    // Verify critical feedback
    await expect(page.getByText("Well done! You nailed it!")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Test Readiness:")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("92%")).toBeVisible({ timeout: 30000 });
  });
});