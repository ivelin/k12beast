// File path: src/middleware.ts
// Middleware to handle authentication and public route access for K12Beast
// Uses /api/auth/user for token validation and treats /api/auth/* as public

import { NextResponse, NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

const recentRequests = new Set<string>();
const dedupeWindow = 100;

const getCookie = (name: string, cookies: string): string | null => {
  const value = `; ${cookies}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};

export async function middleware(request: NextRequest) {
  const requestId = uuidv4();
  const now = Date.now();

  if (process.env.NODE_ENV === "development") {
    for (const id of recentRequests) {
      const [urlPart, timestamp] = id.split("|");
      if (now - parseInt(timestamp) < dedupeWindow && request.url === urlPart) {
        console.log(`Middleware [${requestId}]: Skipped duplicate log for ${request.url}`);
        const response = NextResponse.next();
        response.headers.set("x-request-id", requestId);
        return response;
      }
    }
    recentRequests.add(`${request.url}|${now}`);
    if (recentRequests.size > 100) recentRequests.clear();
  }

  const pathname = request.nextUrl.pathname;

  // Allow all /public/* and /api/auth/* routes to bypass auth
  if (pathname.startsWith("/public") || pathname.startsWith("/api/auth")) {
    console.log(`Middleware [${requestId}]: Allowing public access to ${pathname}`);
    const response = NextResponse.next();
    response.headers.set("x-request-id", requestId);
    return response;
  }

  // Allow / and /confirm-success as public routes
  if (pathname === "/" || pathname === "/confirm-success") {
    console.log(`Middleware [${requestId}]: Allowing public access to ${pathname}`);
    const response = NextResponse.next();
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const cookies = request.headers.get("cookie") || "";
  let token = getCookie("supabase-auth-token", cookies);
  console.log(`Middleware [${requestId}]: Token from cookie - ${token ? token.slice(0, 20) + '...' : 'none'}`);

  if (!token) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
      console.log(`Middleware [${requestId}]: Token from Authorization - ${token.slice(0, 20) + '...'}`);
    }
  }

  let user = null;
  if (token) {
    try {
      // Validate token via /api/auth/user
      const res = await fetch(`${request.nextUrl.origin}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Middleware [${requestId}]: Auth API response - status: ${res.status}`);
      user = res.ok ? await res.json() : null;
      if (!res.ok) {
        console.log(`Middleware [${requestId}]: Auth API error - body: ${await res.text()}`);
      }
    } catch (error) {
      console.error(`Middleware [${requestId}]: Auth fetch error - ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.log(`Middleware [${requestId}]: No token found in cookie or header`);
  }

  console.log(`Middleware [${requestId}]: Pathname - ${pathname}, User - ${!!user}`);
  if (process.env.NODE_ENV === "development") {
    console.log(`Middleware [${requestId}]: Note - Duplicate GET logs may appear in dev mode due to Next.js`);
  }

  let response: NextResponse;
  if (!user && (pathname.startsWith("/chat") || pathname.startsWith("/history") || pathname.startsWith("/session") || pathname.startsWith("/api/upload-image"))) {
    console.log(`Middleware [${requestId}]: Unauth user on protected, redirect to /public/login`);
    const loginUrl = new URL("/public/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    response = NextResponse.redirect(loginUrl);
  } else if (!user && pathname === "/public/login" && request.nextUrl.search.includes("reauth")) {
    console.log(`Middleware [${requestId}]: Forcing reauth on /public/login`);
    response = NextResponse.next();
  } else if (!user && (pathname.startsWith("/chat") || pathname.startsWith("/history") || pathname.startsWith("/session"))) {
    const referer = request.headers.get("referer") || "";
    if (referer.includes("/public/login")) {
      console.log(`Middleware [${requestId}]: Mismatch detected, redirect to /public/login?reauth=true`);
      response = NextResponse.redirect(new URL("/public/login?reauth=true", request.url));
    } else {
      response = NextResponse.next();
    }
  } else {
    console.log(`Middleware [${requestId}]: Allowing access to ${pathname}`);
    response = NextResponse.next();
  }

  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/", "/chat/:path*", "/history", "/session/:path*", "/public/:path*", "/api/auth/:path*", "/api/upload-image", "/logout"],
};
