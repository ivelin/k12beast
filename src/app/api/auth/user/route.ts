// File path: src/app/api/auth/user/route.ts
// API route to fetch user details from Supabase using an auth token
// Updated to add detailed logging for debugging token validation issues

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Initialize Supabase client with service role key (server-side only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  console.log(`API [${requestId}]: /api/auth/user called`);

  // Extract token from Authorization header
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  console.log(`API [${requestId}]: Token - ${token ? token.slice(0, 20) + '...' : 'none'}`);

  if (!token) {
    console.log(`API [${requestId}]: No token provided`);
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  try {
    // Log Supabase configuration (redacted for safety)
    console.log(`API [${requestId}]: Supabase URL - ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`API [${requestId}]: Service role key - ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set (last 5 chars: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.slice(-5) + ')' : 'missing'}`);

    // Validate token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log(`API [${requestId}]: Supabase getUser response - user: ${user ? user.id : 'none'}, error: ${error ? error.message : 'none'}`);

    if (error || !user) {
      console.log(`API [${requestId}]: Invalid or expired token`);
      return NextResponse.json({ error: error?.message || "Invalid or expired token" }, { status: 401 });
    }

    // Return user data
    console.log(`API [${requestId}]: User fetched - ${user.email || 'no email'}`);
    return NextResponse.json(user, { status: 200 });
  } catch (err) {
    // Enhanced error handling with detailed logging
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`API [${requestId}]: Error fetching user - ${error.message}, stack: ${error.stack}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}