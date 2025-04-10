// src/supabase/serverClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (typeof window !== "undefined") {
  throw new Error("Security violation: Server-side Supabase client used in browser.");
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

export default supabase;