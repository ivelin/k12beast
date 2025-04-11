// tests/e2e/problem-with-image.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Problem Submission with Image', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat/new');
    await page.waitForURL(/\/chat\/new/);
    await page.waitForSelector('button[aria-label="Attach a file"]');
  });

  test('should submit a problem with an image and see lesson', async ({ page }) => {
    await page.route('**/api/upload-image', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, files: [{ name: 'test.jpg', url: 'http://mockurl.com/test.jpg' }] }),
      });
    });

    await page.route('**/api/tutor', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'x-session-id': 'mock-session-id' },
        body: '<p>Lesson based on your image!</p>',
      });
    });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button[aria-label="Attach a file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock image data'),
    });

    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'Solve this: [image]');
    await page.click('button[aria-label="Send message"]');
    await expect(page.getByText('Solve this: [image]')).toBeVisible();
    await expect(page.getByText('Lesson based on your image!')).toBeVisible();
  });
});