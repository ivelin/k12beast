// File path: tests/e2e/session-network-errors.spec.ts
// Tests network error handling for session-related flows in K12Beast

import { test, expect } from './fixtures';
import { mockSessionId } from './fixtures';

test.describe('Session Network Error Handling', () => {
  test('should handle 504 Gateway Timeout with HTML response for /api/upload-image', async ({ page, login, context }) => {
    // Collect console logs and errors
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      console.log('Console log:', msg.text());
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });
    page.on('pageerror', (error) => {
      console.error('Page error:', error);
    });

    // Log network requests and responses for debugging
    page.on('request', request => console.log('Request:', request.url()));
    page.on('response', response => console.log('Response:', response.url(), response.status()));

    // Log in the user using the fixture
    await login({ page, context });

    // Mock /api/upload-image to return a 504 response with HTML content
    await context.route('**/api/upload-image', async (route) => {
      console.log('Mocking /api/upload-image with 504 Gateway Timeout');
      return route.fulfill({
        status: 504,
        contentType: 'text/html',
        body: '<html><body>504 Gateway Timeout</body></html>',
      });
    });

    // Mock /api/tutor as a fallback to prevent unintended failures
    await context.route('**/api/tutor', async (route) => {
      console.log('Mocking /api/tutor with 504 Gateway Timeout (fallback)');
      return route.fulfill({
        status: 504,
        contentType: 'text/html',
        body: '<html><body>504 Gateway Timeout</body></html>',
      });
    });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Wait for the page to be fully loaded and ensure the input is visible
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible({ timeout: 30000 });

    // Submit a problem with an image
    await input.fill('What is 2 + 2?');

    // Simulate file upload by clicking the attach button and setting files
    const fileUploadButton = page.getByLabel('Attach a file');
    await expect(fileUploadButton).toBeVisible({ timeout: 30000 });
    await fileUploadButton.click();

    // Simulate the file selection
    await page.evaluate(() => {
      const file = new File(['mock image content'], 'test-image.png', { type: 'image/png' });
      window.__testFiles = [file]; // Store files globally for submission
    });

    const sendButton = page.getByRole('button', { name: 'Send' });
    await expect(sendButton).toBeEnabled({ timeout: 30000 });
    await sendButton.click();

    // Verify the error message appears in the chat
    await expect(page.getByText(/Oops! We couldn't reach the server/i)).toBeVisible({ timeout: 15000 });

    // Optional: Verify console logs if applicable
    // Adjust based on actual console output; remove if not critical
    if (consoleLogs.length > 0) {
      console.log('Console logs captured:', consoleLogs);
      expect(consoleLogs.some(log => log.includes('504'))).toBe(true);
    }
  });

  test('should handle 504 Gateway Timeout with HTML response for /api/tutor', async ({ page, login, context }) => {
    // Collect console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      console.log('Console log:', msg.text());
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });

    // Log in the user using the fixture
    await login({ page, context });

    // Mock /api/tutor to return a 504 response with HTML content
    await context.route('**/api/tutor', async (route) => {
      console.log('Simulating 504 Gateway Timeout for /api/tutor');
      return route.fulfill({
        status: 504,
        contentType: 'text/html',
        body: '<html><body>504 Gateway Timeout</body></html>',
      });
    });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Wait for the page to be fully loaded and ensure the input is visible
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible({ timeout: 30000 });

    // Submit a problem without images
    await input.fill('What is 2 + 2?');

    const sendButton = page.getByRole('button', { name: 'Send' });
    await expect(sendButton).toBeEnabled({ timeout: 30000 });
    await sendButton.click();

    // Verify the error message appears in the chat
    await expect(page.getByText(/Oops! We couldn't reach the server/i)).toBeVisible({ timeout: 10000 });

    // Optional: Verify console logs if applicable
    if (consoleLogs.length > 0) {
      console.log('Console logs captured:', consoleLogs);
      expect(consoleLogs.some(log => log.includes('504'))).toBe(true);
    }
  });

  test('should handle 200 response with invalid JSON for /api/tutor', async ({ page, login, context }) => {
    // Collect console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      console.log('Console log:', msg.text());
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });

    // Log in the user using the fixture
    await login({ page, context });

    // Mock /api/tutor to return a 200 response with invalid JSON (HTML content)
    await context.route('**/api/tutor', async (route) => {
      console.log('Simulating 200 response with invalid JSON for /api/tutor');
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>Invalid JSON Response</body></html>',
      });
    });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Wait for the page to be fully loaded and ensure the input is visible
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible({ timeout: 30000 });

    // Submit a problem without images
    await input.fill('What is 2 + 2?');

    const sendButton = page.getByRole('button', { name: 'Send' });
    await expect(sendButton).toBeEnabled({ timeout: 30000 });
    await sendButton.click();

    // Verify the error message appears in the chat
    await expect(page.getByText(/Oops! We couldn't reach the server/i)).toBeVisible({ timeout: 10000 });

    // Verify that a detailed error is logged to the console
    expect(consoleLogs.some(log => log.includes('Error') && log.includes('non-JSON response'))).toBe(true);
  });

  test('should handle retry after a network error', async ({ page, login, context }) => {
    // Collect console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      console.log('Console log:', msg.text());
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });

    let attemptCount = 0;

    // Log in the user using the fixture
    await login({ page, context });

    // Mock /api/tutor to fail on the first attempt and succeed on retry
    await context.route('**/api/tutor', async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        console.log('Simulating network failure for /api/tutor (attempt 1)');
        return route.fulfill({
          status: 504,
          contentType: 'text/html',
          body: '<html><body>504 Gateway Timeout</body></html>',
        });
      }
      console.log('Simulating successful response for /api/tutor (attempt 2)');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': mockSessionId },
        body: JSON.stringify({
          lesson: '<p>Lesson: Adding numbers. 2 + 2 = <math><mn>4</mn></math>.</p>',
          isK12: true,
        }),
      });
    });

    // Verify we are on /chat/new after login
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });

    // Wait for the page to be fully loaded and ensure the input is visible
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible({ timeout: 30000 });

    // Submit a problem without images
    await input.fill('What is 2 + 2?');

    const sendButton = page.getByRole('button', { name: 'Send' });
    await expect(sendButton).toBeEnabled({ timeout: 30000 });
    await sendButton.click();

    // Verify the error message appears in the chat
    await expect(page.getByText(/Oops! We couldn't reach the server/i)).toBeVisible({ timeout: 10000 });

    // Retry by resubmitting the problem
    await input.fill('What is 2 + 2?'); // Re-enter the problem
    await sendButton.click();

    // Verify the lesson appears after retry
    await expect(page.locator('.MathJax').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Lesson: Adding numbers. 2 + 2 = 4')).toBeVisible({ timeout: 10000 });

    // Optional: Verify console logs if applicable
    if (consoleLogs.length > 0) {
      console.log('Console logs captured:', consoleLogs);
      expect(consoleLogs.some(log => log.includes('504'))).toBe(true);
    }
  });
});