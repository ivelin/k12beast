// File path: jest.setup.ts
// Jest setup file for server-side tests
// Simplified to focus on environment variable setup

import { config } from 'dotenv';
import { existsSync } from 'fs';

// Load environment variables from .env.local if it exists (e.g., in local development)
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
}

// Set mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";
process.env.XAI_API_KEY = "mock-xai-api-key";
process.env.XAI_MODEL_NAME = "grok-2-vision-1212";

// Verify required environment variables
const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'XAI_API_KEY'];
requiredVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}. Ensure it's set in your environment or CI secrets.`);
  }
});