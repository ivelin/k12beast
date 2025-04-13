// tests/e2e/quiz-flow.spec.ts
import { test, expect } from "./fixtures";

test.describe("Quiz Flow E2E Test", () => {
  test.beforeEach(async ({ login }) => {
    await login();
  });

  test.afterEach(async ({ logout }) => {
    await logout();
  });

  test("should complete quiz flow, persist messages, and handle toast on live and shared session pages", async ({ page }) => {
    // Step 1: Submit a K12 problem
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', "Help me with 2+3");
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=EVALUATION", { timeout: 15000 });
    expect(await page.isVisible("text=So, 2 + 3 = 5.")).toBeTruthy();

    // Step 2: Request an example
    await page.click('button:has-text("Request Example")');
    await page.waitForSelector("text=EXAMPLE", { timeout: 15000 });
    expect(await page.isVisible("text=Add the two numbers together")).toBeTruthy();

    // Step 3: Take a quiz
    await page.click('button:has-text("Take a Quiz")');
    await page.waitForSelector("text=QUIZ", { timeout: 15000 });
    expect(await page.isVisible("text=How many cups of flour are in the mix now?")).toBeTruthy();

    // Step 4: Submit a quiz answer
    await page.click('label:has-text("5 cups")'); // Correct answer based on quiz setup
    await page.click('button:has-text("Submit Quiz")');
    await page.waitForSelector("text=FEEDBACK", { timeout: 15000 });

    // Verify quiz response and feedback are rendered
    expect(await page.isVisible("text=5 cups")).toBeTruthy(); // User response
    expect(await page.isVisible("text=Great job! You got it right!")).toBeTruthy(); // Feedback
    expect(await page.isVisible("text=TEST READINESS")).toBeTruthy();

    // Step 5: Share the session and verify toast behavior
    await page.click('button[aria-label="Share session"]');
    await page.waitForSelector('input[value*="public/session"]');
    await page.click('button:has-text("Copy Link")');

    // Verify toast appears in top-right and disappears after 2 seconds
    const toast = page.locator('div:has-text("Link copied to clipboard!")');
    await expect(toast).toBeVisible();
    const toastBox = await toast.boundingBox();
    expect(toastBox?.x).toBeGreaterThan(page.viewportSize()!.width - 300); // Approximate top-right position
    expect(toastBox?.y).toBeLessThan(100); // Approximate top position
    await expect(toast).toBeHidden({ timeout: 3000 }); // Should disappear within 3 seconds (allowing buffer)

    // Click "Copy Link" again to verify no stacking
    await page.click('button:has-text("Copy Link")');
    await expect(toast).toBeVisible();
    const toastCount = await page.locator('div:has-text("Link copied to clipboard!")').count();
    expect(toastCount).toBe(1); // Only one toast should be visible
    await expect(toast).toBeHidden({ timeout: 3000 });

    // Step 6: Open the shared session page and verify message history
    const shareableLink = await page.locator('input[value*="public/session"]').inputValue();
    await page.goto(shareableLink);
    await page.waitForSelector("text=EVALUATION", { timeout: 15000 });

    // Verify full message history on shared session page
    expect(await page.isVisible("text=So, 2 + 3 = 5.")).toBeTruthy();
    expect(await page.isVisible("text=EXAMPLE")).toBeTruthy();
    expect(await page.isVisible("text=Add the two numbers together")).toBeTruthy();
    expect(await page.isVisible("text=QUIZ")).toBeTruthy();
    expect(await page.isVisible("text=How many cups of flour are in the mix now?")).toBeTruthy();
    expect(await page.isVisible("text=5 cups")).toBeTruthy(); // User response
    expect(await page.isVisible("text=Great job! You got it right!")).toBeTruthy(); // Feedback
    expect(await page.isVisible("text=TEST READINESS")).toBeTruthy();

    // Step 7: Verify toast behavior on shared session page
    await page.click('button[aria-label="Share session"]');
    await page.waitForSelector('input[value*="public/session"]');
    await page.click('button:has-text("Copy Link")');
    await expect(toast).toBeVisible();
    await expect(toast).toBeHidden({ timeout: 3000 });
    await page.click('button:has-text("Copy Link")');
    await expect(toast).toBeVisible();
    expect(await page.locator('div:has-text("Link copied to clipboard!")').count()).toBe(1);
    await expect(toast).toBeHidden({ timeout: 3000 });
  });
});