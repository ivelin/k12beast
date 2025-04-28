// File path: tests/e2e/problem-with-image.spec.ts
// Tests problem submission with image functionality for authenticated users

import { test, expect } from './fixtures';

test.describe('Problem Submission with Image', () => {
  test.beforeEach(async ({ page, login }) => {
    // Log in the user using the fixture
    await login();

    // Navigate to the chat page
    await page.goto('/chat/new');
    await expect(page).toHaveURL(/\/chat\/new/, { timeout: 30000 });
    await page.waitForSelector('button[aria-label="Attach a file"]', { timeout: 30000 });
  });

  test('should submit a problem with multiple images and see lesson', async ({ page }) => {
    test.setTimeout(30000);

    // Mock /api/upload-image
    await page.route('**/api/upload-image', async (route) => {
      console.log('Mocking API request for /api/upload-image');
      return route.fulfill({
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

    // Mock /api/tutor
    await page.route('**/api/tutor', async (route) => {
      console.log('Mocking API request for /api/tutor');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          lesson: '<p>Lesson based on your images: test1.jpg and test2.jpg!</p>',
          isK12: true,
        }),
      });
    });

    // Trigger file chooser and upload files
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 30000 });
    await page.click('button[aria-label="Attach a file"]');
    await page.waitForTimeout(500); // Small delay to ensure file chooser is ready
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      { name: 'test1.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('mock image 1') },
      { name: 'test2.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('mock image 2') },
    ], { timeout: 30000 });

    // Verify file previews
    await expect(page.getByText('test1.jpg')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('test2.jpg')).toBeVisible({ timeout: 30000 });

    // Submit the problem
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'Solve this: [images]');
    await page.click('button[aria-label="Send message"]');

    // Check for error dialog
    const errorDialog = page.getByText('Unexpected token');
    await expect(errorDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Error dialog detected: Unexpected token');
      throw new Error('Failed to process chat message due to invalid JSON response');
    });

    // Verify submission and lesson
    await expect(page.getByText('Solve this: [images]')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Lesson based on your images: test1.jpg and test2.jpg!')).toBeVisible({ timeout: 30000 });
  });

  test('should submit a problem with image only and see lesson', async ({ page }) => {
    test.setTimeout(30000);

    // Mock /api/upload-image
    await page.route('**/api/upload-image', async (route) => {
      console.log('Mocking API request for /api/upload-image');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          files: [
            { name: 'test-image.jpg', url: 'http://mockurl.com/test-image.jpg' },
          ],
        }),
      });
    });

    // Mock /api/tutor
    await page.route('**/api/tutor', async (route) => {
      console.log('Mocking API request for /api/tutor');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          lesson: '<p>Lesson based on your image: test-image.jpg!</p>',
          isK12: true,
        }),
      });
    });

    // Trigger file chooser and upload file
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 30000 });
    await page.click('button[aria-label="Attach a file"]');
    await page.waitForTimeout(500);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      { name: 'test-image.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('mock image') },
    ], { timeout: 30000 });

    // Verify image preview appears
    await expect(page.getByText('test-image.jpg')).toBeVisible({ timeout: 30000 });

    // Submit the form without text
    await page.click('button[aria-label="Send message"]');

    // Check for error dialog
    const errorDialog = page.getByText('Unexpected token');
    await expect(errorDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Error dialog detected: Unexpected token');
      throw new Error('Failed to process chat message due to invalid JSON response');
    });

    // Verify lesson appears
    await expect(page.getByText('Lesson based on your image: test-image.jpg!')).toBeVisible({ timeout: 30000 });
  });

  test('should handle oversized image upload failure', async ({ page }) => {
    test.setTimeout(30000);

    // Mock /api/upload-image to simulate oversized file error
    await page.route('**/api/upload-image', async (route) => {
      console.log('Mocking API request for /api/upload-image (oversized file)');
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Some files exceed the 5MB size limit' }),
      });
    });

    // Trigger file chooser and upload oversized file
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 30000 });
    await page.click('button[aria-label="Attach a file"]');
    await page.waitForTimeout(500);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'oversized.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(6 * 1024 * 1024), // 6MB to exceed 5MB limit
    }, { timeout: 30000 });

    // Ensure chat input is loaded
    await page.waitForSelector('textarea[placeholder="Ask k12beast AI..."]', { timeout: 30000 });

    // Submit the problem
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'Solve this: [image]');
    await page.click('button[aria-label="Send message"]');

    // Verify error message
    await expect(page.getByText('Some files exceed the 5MB size limit')).toBeVisible({ timeout: 30000 });
  });

  test('should allow photo library upload and show preview on mobile', async ({ page }) => {
    test.setTimeout(30000);

    // Simulate mobile device (iPhone-like viewport)
    await page.setViewportSize({ width: 375, height: 667 });

    // Trigger file chooser and upload file
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 30000 });
    await page.click('button[aria-label="Attach a file"]');
    await page.waitForTimeout(500);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'gallery-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock gallery photo'),
    }, { timeout: 30000 });

    // Verify file preview appears with the correct file name
    await expect(page.getByText('gallery-photo.jpg')).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Remove attachment' })).toBeVisible({ timeout: 30000 });
  });

  test('should trigger camera and gallery options for attachment', async ({ page }) => {
    test.setTimeout(30000);

    // Simulate mobile device
    await page.setViewportSize({ width: 375, height: 667 });

    // Trigger file chooser
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 30000 });
    await page.click('button[aria-label="Attach a file"]');
    await page.waitForTimeout(500);
    const fileChooser = await fileChooserPromise;

    // Verify file chooser is triggered (simulates iOS prompt for camera/gallery)
    expect(fileChooser).toBeTruthy();

    // Select a file to simulate gallery choice
    await fileChooser.setFiles({
      name: 'selected-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock selected photo'),
    }, { timeout: 30000 });

    // Verify file preview with the correct file name
    await expect(page.getByText('selected-photo.jpg')).toBeVisible({ timeout: 30000 });
  });

  test('should display and remove file preview before submission', async ({ page }) => {
    test.setTimeout(30000);

    // Trigger file chooser and upload file
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 30000 });
    await page.click('button[aria-label="Attach a file"]');
    await page.waitForTimeout(500);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock test photo'),
    }, { timeout: 30000 });

    // Verify file preview with the correct file name
    await expect(page.getByText('test-photo.jpg')).toBeVisible({ timeout: 30000 });

    // Remove file
    await page.click('button[aria-label="Remove attachment"]');

    // Verify file preview is gone
    await expect(page.getByText('test-photo.jpg')).not.toBeVisible({ timeout: 30000 });
  });
});