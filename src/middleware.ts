// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Utility to get a cookie by name
const getCookie = (name: string, cookies: string): string | null => {
  const value = `; ${cookies}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};

export async function middleware(request: NextRequest) {
  const token = getCookie("supabase-auth-token", request.headers.get("cookie") || "");
  console.log("Middleware: Token from cookie -", token);

  let user = null;
  if (token) {
    const res = await fetch(`${request.nextUrl.origin}/api/auth/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      user = await res.json();
    }
    console.log("Middleware: User fetched from API -", user);
  } else {
    console.log("Middleware: No token found, user is not authenticated");
  }

  const pathname = request.nextUrl.pathname;
  console.log(`Middleware: Pathname - ${pathname}, User -`, user);

  // Redirect authenticated users from / to /chat
  if (user && pathname === "/") {
    console.log("Middleware: Authenticated user on /, redirecting to /chat");
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // Redirect unauthenticated users from protected routes to /
  if (!user && (pathname.startsWith("/chat") || pathname.startsWith("/history") || pathname.startsWith("/session"))) {
    console.log("Middleware: Unauthenticated user on protected route, redirecting to /");
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/chat", "/history", "/session/:path*"],
};