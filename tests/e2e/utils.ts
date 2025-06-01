// tests/e2e/utils.ts
// Reusable utility functions for E2E tests

import { Page } from "@playwright/test";

// Login utility function that can be used in both fixtures and global setup
export async function loginUser(page: Page) {
  const testUserEmail = process.env.TEST_USER_EMAIL;
  const testUserPassword = process.env.TEST_USER_PASSWORD;

  if (!testUserEmail) {
    throw new Error('TEST_USER_EMAIL environment variable is not set. Please provide the email for the test user in .env.local.');
  }
  if (!testUserPassword) {
    throw new Error('TEST_USER_PASSWORD environment variable is not set. Please provide the password for the test user in .env.local.');
  }

  // Check if already logged in (redirected to /chat/new)
  await page.goto("http://localhost:3000/public/login", { timeout: 30000 });
  const currentUrl = page.url();
  if (currentUrl.includes("/chat/new")) {
    console.log("User is already logged in (redirected to /chat/new). Skipping login.");
    return;
  }

  // Ensure the page has fully loaded
  await page.waitForLoadState("load");

  // Wait for the email input to be visible
  const emailInput = page.locator('#email');
  await emailInput.waitFor({ state: "visible", timeout: 30000 });

  // Wait for the password input to be visible
  const passwordInput = page.locator('#password');
  await passwordInput.waitFor({ state: "visible", timeout: 30000 });

  // Fill in the login form
  await emailInput.fill(testUserEmail);
  await passwordInput.fill(testUserPassword);

  // Log the form state before submission, redacting sensitive information
  console.log("Form state before submission:", {
    email: "[REDACTED]", // Redact email to avoid exposure in logs
    password: "[REDACTED]", // Redact password to avoid exposure in logs
  });

  // Submit the login form
  await page.click('button[type="submit"]');

  // Wait for redirect to /chat/new
  try {
    console.log("Waiting for redirect to /chat/new...");
    await page.waitForURL("http://localhost:3000/chat/new", { timeout: 60000, waitUntil: "domcontentloaded" });
    console.log("Redirect to /chat/new successful.");
  } catch (error) {
    // Check for login error message
    const errorMessage = await page.locator('text=Invalid email or password').textContent({ timeout: 5000 }).catch(() => null);
    if (errorMessage) {
      throw new Error(`Login failed: ${errorMessage}. Please check TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.local.`);
    }

    // Log additional context for debugging without sensitive information
    console.log('Current URL after login attempt:', page.url());
    console.log('Cookies after login attempt (count):', (await page.context().cookies()).length);
    console.log('Page content after login attempt:', await page.content().catch(e => `Failed to get page content: ${e.message}`));
    throw new Error(`Failed to redirect to /chat/new/: ${(error as Error).message}`);
  }

  // Verify authentication by checking for the presence of the auth token cookie
  const cookies = await page.context().cookies();
  const authTokenCookie = cookies.find(cookie => cookie.name === 'supabase-auth-token');
  if (!authTokenCookie) {
    throw new Error("Supabase auth token cookie not set after login");
  }
}