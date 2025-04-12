import { config } from 'dotenv';
import { existsSync } from 'fs';

// Only load .env.local if it exists (e.g., in local development)
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
}

// Verify required environment variables
const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
requiredVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}. Ensure it's set in your environment or CI secrets.`);
  }
});