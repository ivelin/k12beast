// src/utils/errorHandler.ts
import { NextResponse } from "next/server";

export function handleApiError(
  error: unknown,
  routeName: string,
  request?: Request
): NextResponse {
  const errorDetails = {
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack?.slice(0, 200) : undefined,
    method: request?.method,
    url: request?.url,
    headers: request ? Object.fromEntries(request.headers.entries()) : undefined,
  };
  console.error(`Error in ${routeName} route:`, errorDetails);

  if (error instanceof Error) {
    if (error.message.includes("Authentication failed") || error.message.includes("Invalid token")) {
      return NextResponse.json({ error: "Please log in again to continue." }, { status: 401 });
    }
    if (error.message.includes("ECONNREFUSED") || error.message.includes("ENETUNREACH")) {
      return NextResponse.json({ error: "Network issue. Please check your connection." }, { status: 503 });
    }
    if (error.message.includes("Supabase")) {
      return NextResponse.json({ error: "Database error. Please try again later." }, { status: 500 });
    }
    if (error.message.includes("Missing") || error.message.includes("Invalid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}