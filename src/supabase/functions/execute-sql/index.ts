// Deno runtime is used for Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';

// Define the expected request body type
interface SqlRequest {
  sql_text: string;
}

// Initialize Supabase client with service role key for full permissions
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Handle CORS preflight requests
function handleOptions() {
  console.log('Handling OPTIONS request');
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Main handler for the edge function
serve(async (req) => {
  console.log('Received request:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.error('Method not allowed:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse the request body
    console.log('Parsing request body');
    const body: SqlRequest = await req.json();
    const { sql_text } = body;

    if (!sql_text) {
      console.error('Missing sql_text in request body');
      return new Response(JSON.stringify({ error: 'Missing sql_text in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Executing SQL:', sql_text);

    // Execute the SQL command using Supabase's `rpc` with the correct parameter name
    const { error } = await supabase.rpc('execute_sql', { sql_text: sql_text });

    if (error) {
      console.error('SQL execution failed:', JSON.stringify(error, null, 2));
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('SQL executed successfully');
    return new Response(JSON.stringify({ success: true, data: null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error in execute-sql Edge Function:', err.message, err.stack);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
