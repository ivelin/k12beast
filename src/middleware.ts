import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    // Use the token to authenticate the user
    const { data: { user: fetchedUser }, error } = await supabase.auth.getUser(token);
    console.log("Middleware: User fetched with token -", fetchedUser, "Error -", error);
    if (fetchedUser) {
      user = fetchedUser;
    }
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