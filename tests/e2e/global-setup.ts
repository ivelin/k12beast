// tests/e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'node:fs';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function globalSetup(config: FullConfig) {
  const testUserEmail = process.env.TEST_USER_EMAIL;
  const testUserPassword = process.env.TEST_USER_PASSWORD;

  if (!testUserEmail) {
    throw new Error('TEST_USER_EMAIL environment variable is not set. Please provide the email for the test user in .env.local.');
  }
  if (!testUserPassword) {
    throw new Error('TEST_USER_PASSWORD environment variable is not set. Please provide the password for the test user in .env.local.');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the login page
    await page.goto('http://localhost:3000/public/login', { timeout: 5000 });

    // Fill in the login form (critical check)
    await page.fill('#email', testUserEmail);
    await page.fill('#password', testUserPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to /chat/new (updated app behavior)
    await page.waitForURL(/\/chat\/new/, { timeout: 5000, waitUntil: "domcontentloaded" });

    // Save the authenticated state
    await page.context().storageState({ path: 'playwright/.auth/user.json' });

    await browser.close();
  } catch (error) {
    console.error("Global setup failed:", error);
    await browser.close();
    throw error;
  }
}

export default globalSetup;