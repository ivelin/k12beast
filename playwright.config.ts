// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // E2E test configuration
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: 'html',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'on', // Enable screenshots for all tests
    video: 'on', // Enable video recording for all tests
    viewport: { width: 1280, height: 720 },
    storageState: 'playwright/.auth/user.json',
    actionTimeout: 10000, // Increase action timeout to 10 seconds
  },
  timeout: 20000, // Increase test timeout to 20 seconds
  expect: { timeout: 5000 }, // Increase expect timeout to 5 seconds
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add component testing project
    {
      name: 'component',
      testDir: './tests/component',
      testMatch: '*.spec.tsx', // Match component test files
      use: {
        // Configure Playwright Component Testing for React
        ctFramework: '@playwright/experimental-ct-react',
        ctViteConfig: {
          resolve: {
            alias: {
              '@': path.resolve(__dirname, './src'), // Match the alias from tsconfig.json
            },
          },
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  globalSetup: require.resolve('./tests/e2e/global-setup'),
});