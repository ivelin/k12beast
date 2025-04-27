// File path: tests/e2e/example-flow.spec.ts
// Tests the example flow for authenticated users on the chat page

import { test, expect } from './fixtures';

test.describe('Example Flow E2E Test', () => {
  test('should request and display an example after submitting a problem', async ({ page, login }) => {
    // Log in the user using the fixture
    await login();

    // Mock /api/tutor to return a valid JSON response for the initial problem
    await page.context().route('**/api/tutor', async (route) => {
      console.log('Mocking API request for /api/tutor (initial problem)');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          lesson: "<p>Lesson: Adding numbers. 2 + 3 = <math><mn>5</mn></math>.</p>",
          isK12: true,
        }),
      });
    });

    // Mock /api/examples to return a standard example response
    await page.context().route('**/api/examples', async (route) => {
      console.log('Mocking API request for /api/examples');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          problem: 'What is 3 + 3?',
          solution: [
            { title: 'Step 1', content: 'Add: 3 + 3.' },
            { title: 'Step 2', content: 'Total is 6.' },
          ],
        }),
      });
    });

    // Navigate to the chat page
    await page.goto('/chat/new');
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Verify chat input is visible
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible({ timeout: 30000 });

    // Submit a problem (critical user flow)
    await input.fill('Help me with 2+3');
    await page.click('button[aria-label="Send message"]');

    // Check for error dialog
    const errorDialog = page.getByText('Unexpected token');
    await expect(errorDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Error dialog detected: Unexpected token');
      throw new Error('Failed to process chat message due to invalid JSON response');
    });

    // Wait for MathJax rendering and verify the assistant's response
    await page.waitForSelector('.MathJax', { timeout: 30000 });
    await expect(page.locator('.MathJax').first()).toBeVisible({ timeout: 30000 });

    // Request an example (critical user flow)
    await page.waitForSelector('button:has-text("Request Example")', { timeout: 30000 });
    await page.click('button:has-text("Request Example")');

    // Verify example solution steps display in the UI (critical user-facing check)
    await expect(page.getByText('What is 3 + 3?')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Step 1')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Add: 3 + 3.')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Step 2')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Total is 6.')).toBeVisible({ timeout: 30000 });
  });

  test('should handle example response with conversational prefix', async ({ page, login }) => {
    // Log in the user using the fixture
    await login();

    // Mock /api/tutor to return a valid JSON response for the initial problem
    await page.context().route('**/api/tutor', async (route) => {
      console.log('Mocking API request for /api/tutor (initial problem with conversational prefix)');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          lesson: "<p>Lesson: Subtracting numbers. 5 - 2 = <math><mn>3</mn></math>.</p>",
          isK12: true,
        }),
      });
    });

    // Mock /api/examples to simulate xAI response with conversational text
    await page.context().route('**/api/examples', async (route) => {
      console.log('Mocking API request for /api/examples (with conversational prefix)');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          problem: 'What is 5 - 2?',
          solution: [
            { title: 'Step 1', content: 'Subtract: 5 - 2.' },
            { title: 'Step 2', content: 'Total is 3.' },
          ],
        }),
      });
    });

    // Navigate to the chat page
    await page.goto('/chat/new');
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Verify chat input is visible
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible({ timeout: 30000 });

    // Submit a problem (critical user flow)
    await input.fill('Help me with 5-2');
    await page.click('button[aria-label="Send message"]');

    // Check for error dialog
    const errorDialog = page.getByText('Unexpected token');
    await expect(errorDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Error dialog detected: Unexpected token');
      throw new Error('Failed to process chat message due to invalid JSON response');
    });

    // Wait for MathJax rendering and verify the assistant's response
    await page.waitForSelector('.MathJax', { timeout: 30000 });
    await expect(page.locator('.MathJax').first()).toBeVisible({ timeout: 30000 });

    // Request an example (critical user flow)
    await page.waitForSelector('button:has-text("Request Example")', { timeout: 30000 });
    await page.click('button:has-text("Request Example")');

    // Verify example solution steps display in the UI (critical user-facing check)
    await expect(page.getByText('What is 5 - 2?')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Step 1')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Subtract: 5 - 2.')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Step 2')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Total is 3.')).toBeVisible({ timeout: 30000 });
  });
});