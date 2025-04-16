// src/supabase/browserClient.ts
// Initializes the Supabase client for browser-side operations

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Prevent service role key exposure in the browser
if (typeof window !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Security violation: SUPABASE_SERVICE_ROLE_KEY is exposed in the browser."
  );
}

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

// Initialize Supabase client with cookie options for cross-site compatibility
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    cookieOptions: {
      name: "sb",
      secure: true, // Required for SameSite=None
      sameSite: "None", // Allow cookies in cross-site contexts (e.g., Vercel preview)
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  },
});

export default supabase;