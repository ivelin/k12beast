// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
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

  // Allow all /public/* routes to bypass auth
  if (pathname.startsWith("/public")) {
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
  console.log(`Middleware [${requestId}]: Token from cookie -`, token || "none");

  if (!token) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
      console.log(`Middleware [${requestId}]: Token from Authorization -`, token);
    }
  }

  let user = null;
  if (token) {
    try {
      const res = await fetch(`${request.nextUrl.origin}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Middleware [${requestId}]: Auth API status -`, res.status);
      if (res.ok) {
        user = await res.json();
        console.log(`Middleware [${requestId}]: User fetched -`, user.email || "no email");
      } else if (res.status === 401) {
        console.log(`Middleware [${requestId}]: 401 Unauthorized, redirect to /public/login`);
        const loginUrl = new URL("/public/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        const response = NextResponse.redirect(loginUrl);
        response.headers.set("x-request-id", requestId);
        return response;
      } else {
        console.log(`Middleware [${requestId}]: Auth API failed -`, res.statusText);
        user = null;
      }
    } catch (error) {
      console.error(`Middleware [${requestId}]: Auth fetch error -`, error.message);
      user = null;
    }
  } else {
    console.log(`Middleware [${requestId}]: No token found in cookie or header`);
  }

  console.log(`Middleware [${requestId}]: Pathname - ${pathname}, User -`, !!user);
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
  matcher: ["/", "/chat/:path*", "/history", "/session/:path*", "/public/:path*", "/api/upload-image", "/logout"],
};