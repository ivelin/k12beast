import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (uses service role key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Runtime check to ensure this client is only used in server-side code
if (typeof window !== "undefined") {
  throw new Error("Security violation: Server-side Supabase client is being used in the browser. Use the browserClient instead.");
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env.local file.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default supabase;