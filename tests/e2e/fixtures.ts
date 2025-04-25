// File path: tests/e2e/fixtures.ts
// Extends Playwright test with login/logout fixtures for consistent authentication

import { test as base, Page, BrowserContext } from "@playwright/test";
import * as dotenv from 'dotenv';
import { loginUser } from './utils';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Extend the base test to include login/logout fixtures
export const test = base.extend<{
  login: () => Promise<void>;
  logout: () => Promise<void>;
  context: BrowserContext;
}>({
  context: async ({ browser }, use) => {
    // Provides a BrowserContext for the test; does not manage pages directly
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    });
    await use(context);
    // Cleanup: Clear cookies and local storage, but do not close the context
    await context.clearCookies();
    await context.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  },

  page: async ({ context }, use) => {
    // Provides a single Page within the provided BrowserContext
    const page = await context.newPage();
    await use(page);
    // Lifecycle is managed by the test or Playwright test runner
  },

  login: async ({ page, context }, use) => {
    const loginFn = async () => {
      // Use the utility function to perform the login
      await loginUser(page, context);
    };

    await use(loginFn);
  },

  logout: async ({ page }, use) => {
    const logoutFn = async () => {
      // Ensure the page is valid
      if (!page) {
        throw new Error('Page object is not provided to logout fixture');
      }

      console.log("Navigating to /logout...");
      await page.goto("http://localhost:3000/logout", { timeout: 30000 });

      // Verify logout confirmation message
      console.log("Verifying logout confirmation message...");
      await page.locator('text=You have been successfully logged out.').waitFor({ state: 'visible', timeout: 30000 });
      console.log("page URL:", await page.url());

      // Stay on the /logout page, do not navigate to /public/login
      console.log("Remaining on /logout page after logout.");
    };

    await use(logoutFn);
  },
});