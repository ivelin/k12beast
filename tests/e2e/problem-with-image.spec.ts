// tests/e2e/problem-with-image.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Problem Submission with Image', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat/new');
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 5000 });
    await page.waitForSelector('button[aria-label="Attach a file"]');
  });

  test('should submit a problem with multiple images and see lesson', async ({ page }) => {
    test.setTimeout(5000);

    await page.route('**/api/upload-image', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          files: [
            { name: 'test1.jpg', url: 'http://mockurl.com/test1.jpg' },
            { name: 'test2.jpg', url: 'http://mockurl.com/test2.jpg' },
          ],
        }),
      });
    });

    await page.route('**/api/tutor', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'x-session-id': 'mock-session-id' },
        body: '<p>Lesson based on your images: test1.jpg and test2.jpg!</p>',
      });
    });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button[aria-label="Attach a file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      { name: 'test1.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('mock image 1') },
      { name: 'test2.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('mock image 2') },
    ]);

    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'Solve this: [images]');
    await page.click('button[aria-label="Send message"]');
    await expect(page.getByText('Solve this: [images]')).toBeVisible();
    await expect(page.getByText('Lesson based on your images: test1.jpg and test2.jpg!')).toBeVisible();
  });

  test('should handle oversized image upload failure', async ({ page }) => {
    test.setTimeout(5000);

    await page.route('**/api/upload-image', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Some files exceed the 5MB size limit' }),
      });
    });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button[aria-label="Attach a file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'oversized.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(6 * 1024 * 1024), // 6MB to exceed 5MB limit
    });

    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'Solve this: [image]');
    await page.click('button[aria-label="Send message"]');
    await expect(page.getByText('Some files exceed the 5MB size limit')).toBeVisible();
  });
});