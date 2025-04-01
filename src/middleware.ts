import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This middleware is currently a placeholder.
// It will be extended with request-processing logic (e.g., authentication) in the future.
export async function middleware(request: NextRequest) {
  // Currently, it just passes the request to the next handler.
  return NextResponse.next();
}

// Apply to all routes (adjust matcher as needed when adding logic)
export const config = {
  matcher: ["/:path*"],
};