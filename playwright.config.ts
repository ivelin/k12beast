// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', // Where tests will live
  fullyParallel: true, // Run tests in parallel
  forbidOnly: !!process.env.CI, // Fail CI if `test.only` is used
  retries: process.env.CI ? 2 : 0, // Retry failing tests in CI
  workers: process.env.CI ? 2 : undefined, // Limit workers in CI
  reporter: 'html', // Generate HTML report
  use: {
    baseURL: 'http://localhost:3000', // Default Next.js dev server
    trace: 'on-first-retry', // Record traces on first retry
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add more browsers if needed (e.g., firefox, webkit)
  ],
  webServer: {
    command: 'npm run dev', // Start Next.js dev server
    url: 'http://localhost:3000',
    timeout: 120 * 1000, // Give it time to start
    reuseExistingServer: !process.env.CI, // Reuse server locally
  },
});