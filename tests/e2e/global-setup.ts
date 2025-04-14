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
    throw new Error('TEST_USER_EMAIL environment variable is not set. Please provide the email for the test user.');
  }
  if (!testUserPassword) {
    throw new Error('TEST_USER_PASSWORD environment variable is not set. Please provide the password for the test user.');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Retry login up to 3 times
    let attempts = 3;
    while (attempts > 0) {
      try {
        // Navigate to the login page
        await page.goto('http://localhost:3000/public/login', { timeout: 10000 });

        // Fill in the login form
        await page.fill('#email', testUserEmail);
        await page.fill('#password', testUserPassword);
        await page.click('button[type="submit"]');

        // Wait for redirect to /chat/new
        await page.waitForURL(/\/chat\/new/, { timeout: 10000, waitUntil: "domcontentloaded" });
        break; // Success, exit retry loop
      } catch (error) {
        attempts--;
        if (attempts === 0) {
          // Check for error message on final failure
          const errorMessage = await page.locator('text=Invalid email or password').textContent({ timeout: 2000 }).catch(() => null);
          if (errorMessage) {
            throw new Error(`Login failed: ${errorMessage}. Verify TEST_USER_EMAIL and TEST_USER_PASSWORD.`);
          }
          throw new Error(`Login failed after 3 attempts: ${(error as Error).message}`);
        }
        console.warn(`Login attempt failed (${3 - attempts}/3): ${(error as Error).message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Save the authenticated state
    await page.context().storageState({ path: 'playwright/.auth/user.json' });

    await browser.close();
  } catch (error) {
    console.error("Global setup failed:", (error as Error).message);
    await browser.close();
    throw error;
  }
}

export default globalSetup;