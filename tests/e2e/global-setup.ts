// File path: tests/e2e/global-setup.ts
// Global setup to authenticate a user and save the state for E2E tests

import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'node:fs';
import * as dotenv from 'dotenv';
import { loginUser } from './utils';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function globalSetup(config: FullConfig) {
  // Validate required environment variables
  if (!process.env.TEST_USER_EMAIL) {
    throw new Error('TEST_USER_EMAIL environment variable is not set. Please provide the email for the test user.');
  }
  if (!process.env.TEST_USER_PASSWORD) {
    throw new Error('TEST_USER_PASSWORD environment variable is not set. Please provide the password for the test user.');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set. Please provide the Supabase URL.');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set. Please provide the Supabase anon key.');
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Retry login up to 3 times
    let attempts = 3;
    while (attempts > 0) {
      try {
        // Use the login utility function to perform the login
        await loginUser(page, context);
        break; // Success, exit retry loop
      } catch (error) {
        attempts--;
        if (attempts === 0) {
          throw new Error(`Login failed after 3 attempts: ${(error as Error).message}`);
        }
        console.warn(`Login attempt failed (${3 - attempts}/3): ${(error as Error).message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Save the authenticated state
    await context.storageState({ path: 'playwright/.auth/user.json' });

    await browser.close();
  } catch (error) {
    console.error("Global setup failed:", (error as Error).message);
    await browser.close();
    throw error;
  }
}

export default globalSetup;