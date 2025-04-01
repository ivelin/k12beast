import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware can be used for other purposes in the future
export async function middleware(request: NextRequest) {
  // Proceed to the requested route
  return NextResponse.next();
}

// Apply middleware to all routes
export const config = {
  matcher: ["/:path*"],
};