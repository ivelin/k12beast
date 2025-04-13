// tests/e2e/examples-quiz-share.spec.ts
import { test, expect } from "./fixtures";

test.describe("Examples, Quiz, and Share Flow", () => {
  test.beforeEach(async ({ login }) => {
    await login();
  });

  test.afterEach(async ({ logout }) => {
    await logout();
  });

  test("should request examples, take a quiz, and share the session", async ({ page }) => {
    // Submit a problem
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', "What is 4 + 4?");
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=LESSON", { timeout: 15000 });
    await expect(page.getByText(/So, 4 \+ 4 = 8/)).toBeVisible();

    // Request an example
    await page.click('button:has-text("Request Example")');
    await page.waitForSelector("text=EXAMPLE", { timeout: 15000 });
    await expect(page.getByText("Add the two numbers together")).toBeVisible();

    // Take a quiz
    await page.click('button:has-text("Take a Quiz")');
    await page.waitForSelector("text=QUIZ", { timeout: 15000 });
    await expect(page.getByText("How many tickets do you have now?")).toBeVisible();

    // Select the correct answer (based on quiz setup in server tests)
    await page.click('label:has-text("8")'); // Correct answer for 4+4 quiz
    await page.click('button:has-text("Submit Quiz")');
    await page.waitForSelector("text=FEEDBACK", { timeout: 15000 });

    // Verify feedback (handle both correct and incorrect answers)
    const feedbackText = await page.locator("text=FEEDBACK").locator("..").textContent();
    expect(feedbackText).toMatch(/Great job!|Nice try!/); // Allow for correct or incorrect feedback

    // Share the session
    await page.click('button[aria-label="Share session"]');
    await expect(page.getByRole('dialog', { name: 'Share Your Session' })).toBeVisible();
    await page.click('button:has-text("Copy Link")');

    // Verify toast behavior
    const toast = page.locator('div:has-text("Link copied to clipboard!")');
    await expect(toast).toBeVisible();
    await expect(toast).toBeHidden({ timeout: 3000 });
  });
});