// tests/e2e/fixtures.ts
import { test as base, Page } from "@playwright/test";
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Extend the base test to include login/logout fixtures
export const test = base.extend<{
  login: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  login: async ({ page }, use) => {
    const testUserEmail = process.env.TEST_USER_EMAIL;
    const testUserPassword = process.env.TEST_USER_PASSWORD;

    if (!testUserEmail) {
      throw new Error('TEST_USER_EMAIL environment variable is not set. Please provide the email for the test user in .env.local.');
    }
    if (!testUserPassword) {
      throw new Error('TEST_USER_PASSWORD environment variable is not set. Please provide the password for the test user in .env.local.');
    }

    const loginFn = async () => {
      // Navigate to the login page
      await page.goto("http://localhost:3000/public/login", { timeout: 30000 });

      // Check if already logged in (redirected to /chat/new)
      const currentUrl = page.url();
      if (currentUrl.includes("/chat/new")) {
        console.log("User is already logged in (redirected to /chat/new). Skipping login.");
        return; // User is already authenticated, no need to log in again
      }

      // Ensure the page has fully loaded
      await page.waitForLoadState("load");

      // Wait for the email input to be visible
      const emailInput = page.locator('#email');
      try {
        await emailInput.waitFor({ state: "visible", timeout: 30000 });
      } catch (error) {
        console.log("Email input not found. Current URL:", page.url());
        console.log("Page content:", await page.content());
        throw new Error("Email input not found on login page");
      }

      // Fill in the login form
      await emailInput.fill(testUserEmail);
      await page.fill('input[name="password"]', testUserPassword);
      await page.click('button[type="submit"]');

      // Wait for redirect to /chat/new/
      try {
        await page.waitForURL("http://localhost:3000/chat/new", { timeout: 30000 });
      } catch (error) {
        // Check for login error message
        const errorMessage = await page.locator('text=Invalid email or password').textContent({ timeout: 5000 }).catch(() => null);
        if (errorMessage) {
          throw new Error(`Login failed: ${errorMessage}. Please check TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.local.`);
        }

        // If no error message, log the page state and throw the original error
        console.log('Current URL after login attempt:', page.url());
        console.log('Page content after login attempt:', await page.content());
        throw new Error(`Failed to redirect to /chat/new/: ${error.message}`);
      }

      // Save the authenticated state
      await page.context().storageState({ path: "playwright/.auth/user.json" });
    };

    await use(loginFn);
  },

  logout: async ({ page }, use) => {
    const logoutFn = async () => {
      await page.goto("http://localhost:3000/logout", { timeout: 30000 });
      try {
        await page.waitForURL("http://localhost:3000/public/login", { timeout: 30000 });
      } catch (error) {
        console.log("Logout redirect failed. Current URL:", page.url());
        console.log("Page content:", await page.content());
        // Fallback: Navigate to /public/login manually if redirect fails
        await page.goto("http://localhost:3000/public/login", { timeout: 30000 });
      }
      // Ensure the page has fully loaded
      await page.waitForLoadState("load");
    };

    await use(logoutFn);
  },
});

export { expect } from "@playwright/test";