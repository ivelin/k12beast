"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { useRouter, usePathname } from "next/navigation";
import supabase from '@/supabase/browserClient';
import useAppStore from '@/store';

// Modal component for session expiration
const SessionExpiredModal = ({ onLogin }: { onLogin: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
      <h2 className="text-xl font-semibold mb-4">Session Expired</h2>
      <p className="mb-4">Your session has expired. Please log back in to continue.</p>
      <button
        onClick={onLogin}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Log In
      </button>
    </div>
  </div>
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const reset = useAppStore((state) => state.reset);

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const isSessionValid = !error && data.session;
      setIsLoggedIn(isSessionValid);
      setIsAuthChecked(true);
      if (!isSessionValid && (pathname.startsWith("/chat") || pathname.startsWith("/history") || pathname.startsWith("/session"))) {
        console.log("Initial session check failed, setting session expired");
        setSessionExpired(true);
      }
    };

    checkSession();

    const handleAuthStateChange = (event: string, session: any) => {
      console.log("Auth state change - event:", event, "session:", session);
      const isSessionValid = !!session?.user;
      setIsLoggedIn(isSessionValid);
      setIsAuthChecked(true);
      if (!isSessionValid && (pathname.startsWith("/chat") || pathname.startsWith("/history") || pathname.startsWith("/session"))) {
        console.log("Auth state changed to logged out, setting session expired");
        setSessionExpired(true);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    const customAuthListener = (event: Event) => {
      if (process.env.NODE_ENV !== 'test') return; // Ignore in non-test environments
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.event) {
        handleAuthStateChange(customEvent.detail.event, customEvent.detail.session);
      }
    };
    window.addEventListener('supabase:auth', customAuthListener);

    // Periodic session check every 5 minutes
    const interval = setInterval(async () => {
      if (pathname.startsWith("/public") || pathname === "/" || pathname === "/confirm-success") return; // Skip for public routes

      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        console.log("Periodic session check failed, setting session expired");
        setSessionExpired(true);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Cleanup on unmount
    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('supabase:auth', customAuthListener);
      clearInterval(interval);
    };
  }, [pathname]);

  const handleAuth = async () => {
    setIsLoggingIn(true);
    try {
      if (isLoggedIn) {
        await supabase.auth.signOut();
        document.cookie = "supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        setIsLoggedIn(false);
        setSessionExpired(false); // Reset session expired state on logout
        router.push("/");
      } else {
        router.push("/public/login");
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert(isLoggedIn ? "Failed to logout. Please try again." : "Failed to initiate login. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginRedirect = () => {
    reset(); // Clear app state
    setSessionExpired(false); // Hide modal
    router.push("/public/login");
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
            <div className="flex space-x-2 sm:space-x-4">
              {!isLoggedIn && (
                <Link href="/" className={`hover:underline text-sm sm:text-base ${pathname === "/" ? "text-muted-foreground cursor-default" : ""}`}>
                  Home
                </Link>
              )}
              {isLoggedIn && pathname !== "/" && !pathname.startsWith("/public") && (
                <>
                  <Link
                    href="/chat/new"
                    prefetch={false}
                    className={`hover:underline text-sm sm:text-base ${isChatPage ? "text-muted-foreground cursor-default" : ""}`}
                    onClick={(e) => isChatPage && e.preventDefault()}
                  >
                    Chat
                  </Link>
                  <Link
                    href="/history"
                    className={`hover:underline text-sm sm:text-base ${pathname === "/history" ? "text-muted-foreground cursor-default" : ""}`}
                    onClick={(e) => pathname === "/history" && e.preventDefault()}
                  >
                    History
                  </Link>
                </>
              )}
              {pathname !== "/" && !pathname.startsWith("/public") && (
                <button
                  onClick={handleAuth}
                  disabled={isLoggingIn || sessionExpired}
                  className="flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm sm:text-base"
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
          {sessionExpired && <SessionExpiredModal onLogin={handleLoginRedirect} />}
          <Toaster />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}