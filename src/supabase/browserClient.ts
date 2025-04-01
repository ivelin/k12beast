import { createClient } from "@supabase/supabase-js";

// Browser-side Supabase client (uses anon key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Runtime check to ensure the service role key is not used in the browser
if (typeof window !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Security violation: SUPABASE_SERVICE_ROLE_KEY is exposed in the browser. This key must only be used in server-side code.");
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;