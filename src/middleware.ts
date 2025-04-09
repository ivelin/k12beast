import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import supabase from "./supabase/serverClient";

const getCookie = (name: string, cookies: string): string | null => {
  const value = `; ${cookies}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};

export async function middleware(request: NextRequest) {
  let user = null;
  const token = request.nextUrl.searchParams.get("token") ||
                request.headers.get("Authorization")?.replace("Bearer ", "") ||
                getCookie("supabase-auth-token", request.headers.get("cookie") || "");
  console.log("Middleware: Token from request -", token || "null");

  if (token) {
    const { data: { user: fetchedUser }, error } = await supabase.auth.getUser(token);
    if (!error && fetchedUser) {
      user = fetchedUser;
    }
    console.log("Middleware: User from Supabase -", user || "null", "Error -", error?.message || "none");
  } else {
    console.log("Middleware: No token found in request");
  }

  const pathname = request.nextUrl.pathname;
  console.log(`Middleware: Pathname - ${pathname}, User -`, user || "null");

  if (user && pathname === "/") {
    console.log("Middleware: Authenticated user on /, redirecting to /chat");
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  if (!user && (pathname.startsWith("/chat") || pathname.startsWith("/history") || pathname.startsWith("/session"))) {
    console.log("Middleware: Unauthenticated user on protected route, redirecting to /");
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/chat", "/history", "/session/:path*"],
};