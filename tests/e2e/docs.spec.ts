import { test, expect } from '@playwright/test';

test('Docs page loads and search works', async ({ page }) => {
  await page.goto('/public/docs/parents/introduction');
  await expect(page.locator('h1')).toContainText('Test Introduction');
  await page.fill('input[placeholder="Search documentation..."]', 'Test Introduction');
  const resultsList = page.locator('ul.bg-background');
  await expect(resultsList).toBeVisible();
  await expect(resultsList.locator('li')).toHaveText(/Introduction for Parents|Untitled Document/);
});