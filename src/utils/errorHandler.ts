import { NextResponse } from "next/server";

/**
 * Handles API errors and returns an appropriate HTTP response.
 * @param error - The error object caught from the API call.
 * @param routeName - The name of the route for logging purposes.
 * @returns A NextResponse object with the appropriate status code and error message.
 */
export function handleApiError(error: any, routeName: string): NextResponse {
  console.error(`Error in ${routeName} route:`, error);

  // Check for authentication errors
  if (error.message.includes("Authentication failed")) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // Fallback for other errors
  return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
}