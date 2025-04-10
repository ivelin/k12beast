// src/app/layout.tsx
"use client";

import { SpeedInsights } from "@vercel/speed-insights/next"
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { useRouter, usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Initial auth check - user:", user);
      setIsLoggedIn(!!user);
      setIsAuthChecked(true);
      if (user && (pathname === "/" || pathname === "/login" || pathname === "/signup")) {
        router.push("/chat");
      }
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change - event:", event, "session:", session);
      setIsLoggedIn(!!session?.user);
      setIsAuthChecked(true);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  const handleAuth = async () => {
    setIsLoggingIn(true);
    try {
      if (isLoggedIn) {
        await supabase.auth.signOut();
        document.cookie = "supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        setIsLoggedIn(false);
        router.push("/");
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "email",
          options: { redirectTo: "http://localhost:3000/chat" },
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert(isLoggedIn ? "Failed to logout. Please try again." : "Failed to initiate login. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuthChecked) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <div className="flex items-center justify-center h-screen">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    );
  }

  console.log("Rendering nav - pathname:", pathname, "isLoggedIn:", isLoggedIn);

  const isChatPage = pathname.startsWith("/chat");

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <nav className="flex items-center justify-between p-4 bg-muted">
            <div className="text-lg font-bold">K12Beast</div>
            <div className="flex space-x-4">
              {!isLoggedIn && (
                <Link href="/" className={`hover:underline ${pathname === "/" ? "text-muted-foreground cursor-default" : ""}`}>
                  Home
                </Link>
              )}
              {isLoggedIn && pathname !== "/" && pathname !== "/login" && pathname !== "/signup" && (
                <>
                  <Link
                    href="/chat/new"
                    prefetch={false} // Disable prefetching
                    className={`hover:underline ${isChatPage ? "text-muted-foreground cursor-default" : ""}`}
                    onClick={(e) => isChatPage && e.preventDefault()}
                  >
                    Chat
                  </Link>
                  <Link
                    href="/history"
                    className={`hover:underline ${pathname === "/history" ? "text-muted-foreground cursor-default" : ""}`}
                    onClick={(e) => pathname === "/history" && e.preventDefault()}
                  >
                    History
                  </Link>
                </>
              )}
              {pathname !== "/" && pathname !== "/login" && pathname !== "/signup" && (
                <button
                  onClick={handleAuth}
                  disabled={isLoggingIn}
                  className="flex items-center px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isLoggedIn ? "Logging out..." : "Logging in..."}
                    </>
                  ) : isLoggedIn ? (
                    "Logout"
                  ) : (
                    "Login"
                  )}
                </button>
              )}
            </div>
          </nav>
          <main className="p-4">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}