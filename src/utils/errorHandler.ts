import { NextResponse } from "next/server";

/**
 * Handles API errors with detailed logging and user-friendly responses.
 * @param error - The error object from the API call.
 * @param routeName - The route name for logging context.
 * @param request - Optional request object for additional context.
 * @returns A NextResponse with appropriate status and message.
 */
export function handleApiError(
  error: any,
  routeName: string,
  request?: Request
): NextResponse {
  const errorDetails = {
    message: error.message || "Unknown error",
    stack: error.stack?.slice(0, 200), // Limit stack trace length
    method: request?.method,
    url: request?.url,
    headers: request ? Object.fromEntries(request.headers.entries()) : undefined,
  };
  console.error(`Error in ${routeName} route:`, errorDetails);

  // Authentication errors
  if (error.message.includes("Authentication failed") || 
      error.message.includes("Invalid token")) {
    return NextResponse.json(
      { error: "Please log in again to continue." },
      { status: 401 }
    );
  }

  // Network errors
  if (error.code === "ECONNREFUSED" || error.code === "ENETUNREACH") {
    return NextResponse.json(
      { error: "Network issue. Please check your connection and try again." },
      { status: 503 }
    );
  }

  // Supabase-specific errors (e.g., from migrations or API calls)
  if (error.message.includes("Supabase")) {
    return NextResponse.json(
      { error: "Database error. Please try again later." },
      { status: 500 }
    );
  }

  // Validation errors
  if (error.message.includes("Missing") || error.message.includes("Invalid")) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  // Generic fallback
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}