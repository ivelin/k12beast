// src/supabase/browserClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (typeof window !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Security violation: SUPABASE_SERVICE_ROLE_KEY is exposed in the browser.");
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;