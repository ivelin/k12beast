// tests/e2e/example-flow.spec.ts
import { test, expect } from "@playwright/test";

// Test suite for the example request flow in the chat UI
test.describe("Example Flow E2E Test", () => {
  // Test the core user flow of submitting a problem and requesting an example
  test("should request and display an example after submitting a problem", async ({ page }) => {
    // Mock the tutor API to start a session
    await page.route("**/api/tutor", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        headers: { "x-session-id": "mock-session-id" },
        body: "<p>Lesson: Adding numbers.</p>",
      })
    );

    // Mock the examples API to return a standard example response
    await page.route("**/api/examples", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "x-session-id": "mock-session-id" },
        body: JSON.stringify({
          problem: "What is 3 + 3?",
          solution: [
            { title: "Step 1", content: "Add: 3 + 3." },
            { title: "Step 2", content: "Total is 6." },
          ],
        }),
      })
    );

    // Navigate to the chat page
    await page.goto("/chat/new");
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 5000 });

    // Submit a problem (critical user flow)
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', "Help me with 2+3");
    await page.click('button[aria-label="Send message"]');
    await expect(page.locator("text=Lesson: Adding numbers.")).toBeVisible({ timeout: 5000 });

    // Request an example (critical user flow)
    await page.waitForSelector('button:has-text("Request Example")', { timeout: 5000 });
    await page.click('button:has-text("Request Example")');
    await expect(page.locator("text=What is 3 + 3?")).toBeVisible({ timeout: 5000 });

    // Verify example solution steps display in the UI (critical user-facing check)
    await expect(page.locator("text=Step 1")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Add: 3 + 3.")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Step 2")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Total is 6.")).toBeVisible({ timeout: 5000 });
  });

  // Test handling of an example response with conversational text to ensure sanitization
  test("should handle example response with conversational prefix", async ({ page }) => {
    // Mock the tutor API to start a session
    await page.route("**/api/tutor", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        headers: { "x-session-id": "mock-session-id" },
        body: "<p>Lesson: Subtracting numbers.</p>",
      })
    );

    // Mock the examples API to simulate xAI response with conversational text
    await page.route("**/api/examples", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "x-session-id": "mock-session-id" },
        body: JSON.stringify({
          problem: "What is 5 - 2?",
          solution: [
            { title: "Step 1", content: "Subtract: 5 - 2." },
            { title: "Step 2", content: "Total is 3." },
          ],
        }),
      })
    );

    // Navigate to the chat page
    await page.goto("/chat/new");
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 5000 });

    // Submit a problem (critical user flow)
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', "Help me with 5-2");
    await page.click('button[aria-label="Send message"]');
    await expect(page.locator("text=Lesson: Subtracting numbers.")).toBeVisible({ timeout: 5000 });

    // Request an example (critical user flow)
    await page.waitForSelector('button:has-text("Request Example")', { timeout: 5000 });
    await page.click('button:has-text("Request Example")');
    await expect(page.locator("text=What is 5 - 2?")).toBeVisible({ timeout: 5000 });

    // Verify example solution steps display in the UI (critical user-facing check)
    await expect(page.locator("text=Step 1")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Subtract: 5 - 2.")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Step 2")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Total is 3.")).toBeVisible({ timeout: 5000 });
  });
});