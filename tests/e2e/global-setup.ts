// tests/e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'node:fs';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function globalSetup(config: FullConfig) {
  const testUserPassword = process.env.TEST_USER_PASSWORD;
  if (!testUserPassword) {
    throw new Error('TEST_USER_PASSWORD environment variable is not set. Please provide the password for testuser@k12beast.com in .env.local.');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to the login page
  await page.goto('http://localhost:3000/public/login');

  // Wait for the loading spinner to disappear and the form to appear
  await page.waitForSelector('svg.lucide-loader-circle', { state: 'hidden', timeout: 30000 });
  await page.waitForSelector('#email', { state: 'visible', timeout: 30000 });

  // Debug: Log the page content to inspect the DOM
  // console.log('Page content after waiting for form:', await page.content());

  // Find login form elements
  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  const loginButton = page.locator('button[type="submit"]');

  // Verify elements exist and are visible
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await loginButton.waitFor({ state: 'visible', timeout: 10000 });

  // Fill in the login form
  await emailInput.fill('testuser@k12beast.com');
  await passwordInput.fill(testUserPassword);
  await loginButton.click();

  // Debug: Wait for redirect or error
  try {
    await page.waitForURL(/\/chat\/new/, { timeout: 30000 });
  } catch (error) {
    console.log('Current URL after login attempt:', page.url());
    console.log('Page content after login attempt:', await page.content());
    throw new Error(`Failed to redirect to /chat/new/: ${error.message}`);
  }

  // Save the authenticated state
  await page.context().storageState({ path: 'playwright/.auth/user.json' });

  // Clean up
  await browser.close();
}

export default globalSetup;