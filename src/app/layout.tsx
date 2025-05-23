// File path: src/app/layout.tsx
// Root layout for K12Beast, including navigation with Feedback, Open Source, and Docs links on home page.
// Updated to redact sensitive information in logs and use ErrorDialogs for session expiration.
// Reduced padding on mobile to maximize message and chart width.
// Centered the chat area on desktop screens by adding a container with max-w-5xl mx-auto.
// Added dropdown menu for home page links in mobile mode to save space.

"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from '@vercel/analytics/next';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";
import { Github, Loader2, Menu } from "lucide-react";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { useRouter, usePathname } from "next/navigation";
import supabase from "@/supabase/browserClient";
import useAppStore from "@/store";
import { ErrorDialogs } from "@/components/ui/ErrorDialogs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const reset = useAppStore((state) => state.reset);

  // Utility function to redact sensitive information from session object
  const redactSession = (session: any) => {
    if (!session) return null;
    return {
      ...session,
      access_token: '[REDACTED]',
      refresh_token: '[REDACTED]',
      user: session.user
        ? {
            ...session.user,
            email: '[REDACTED]',
            user_metadata: session.user.user_metadata
              ? {
                  ...session.user.user_metadata,
                  email: '[REDACTED]',
                }
              : null,
          }
        : null,
    };
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const isSessionValid = !error && data.session;
      setIsLoggedIn(isSessionValid);
      setIsAuthChecked(true);
      if (
        !isSessionValid &&
        (pathname.startsWith("/chat") ||
          pathname.startsWith("/history") ||
          pathname.startsWith("/session"))
      ) {
        console.log("Initial session check failed, setting session expired");
        setSessionExpired(true);
      }
    };

    checkSession();

    const handleAuthStateChange = (event: string, session: any) => {
      const redactedSession = redactSession(session);
      console.log("Auth state change - event:", event, "session:", redactedSession);
      const isSessionValid = !!session?.user;
      setIsLoggedIn(isSessionValid);
      setIsAuthChecked(true);
      if (
        !isSessionValid &&
        (pathname.startsWith("/chat") ||
          pathname.startsWith("/history") ||
          pathname.startsWith("/session"))
      ) {
        console.log("Auth state changed to logged out, setting session expired");
        setSessionExpired(true);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    const customAuthListener = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.event) {
        handleAuthStateChange(customEvent.detail.event, customEvent.detail.session);
      }
    };
    window.addEventListener("supabase:auth", customAuthListener);

    // Periodic session check every 5 minutes
    const interval = setInterval(async () => {
      if (pathname.startsWith("/public") || pathname === "/" || pathname === "/confirm-success")
        return; // Skip for public routes

      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        console.log("Periodic session check failed, setting session expired");
        setSessionExpired(true);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Cleanup on unmount
    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener("supabase:auth", customAuthListener);
      clearInterval(interval);
    };
  }, [pathname]);

  const handleAuth = async () => {
    setIsLoggingIn(true);
    try {
      if (isLoggedIn) {
        // Redirect to the /logout page instead of handling logout here
        router.push("/logout");
      } else {
        router.push("/public/login");
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert(isLoggedIn ? "Failed to initiate logout. Please try again." : "Failed to initiate login. Please try again.");
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
          <Analytics />
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
            <div className="text-lg font-bold">
              <Link href="/">K12Beast</Link>
            </div>
            <div className="flex space-x-2 sm:space-x-4 items-center">
              {pathname === "/" && (
                <>
                  {/* On desktop (sm and above), show links inline */}
                  <div className="hidden sm:flex space-x-4 items-center">
                    <Link
                      href="/public/docs"
                      className="hover:underline text-sm sm:text-base"
                    >
                      Docs
                    </Link>
                    <Link
                      href="https://github.com/ivelin/k12beast/issues/new"
                      className="hover:underline text-sm sm:text-base"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Feedback
                    </Link>
                    <Link
                      href="https://github.com/ivelin/k12beast"
                      className="flex items-center hover:underline text-sm sm:text-base"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="h-4 w-4 mr-1" />
                      Open Source
                    </Link>
                  </div>
                  {/* On mobile, show a dropdown menu */}
                  <div className="sm:hidden">
                    <Collapsible
                      open={isMobileMenuOpen}
                      onOpenChange={setIsMobileMenuOpen}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          className="flex items-center p-2 rounded-md hover:bg-muted-foreground/20"
                          aria-label="Toggle menu"
                        >
                          <Menu className="h-5 w-5" />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="absolute right-4 mt-2 w-48 bg-background border border-border rounded-md shadow-lg z-50">
                        <div className="flex flex-col p-2 space-y-2">
                          <Link
                            href="/public/docs"
                            className="hover:underline text-sm p-2 rounded-md hover:bg-muted"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Docs
                          </Link>
                          <Link
                            href="https://github.com/ivelin/k12beast/issues/new"
                            className="hover:underline text-sm p-2 rounded-md hover:bg-muted"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Feedback
                          </Link>
                          <Link
                            href="https://github.com/ivelin/k12beast"
                            className="flex items-center hover:underline text-sm p-2 rounded-md hover:bg-muted"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Github className="h-4 w-4 mr-1" />
                            Open Source
                          </Link>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </>
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
                    className={`hover:underline text-sm sm:text-base ${pathname === "history" ? "text-muted-foreground cursor-default" : ""}`}
                    onClick={(e) => pathname === "history" && e.preventDefault()}
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
          {/* Reduced padding on mobile to maximize content width */}
          <main className="p-2 sm:p-4">
            {/* Center the chat area on desktop with max-w-5xl, full width on mobile */}
            <div className="w-full sm:max-w-5xl sm:mx-auto">
              {children}
            </div>
          </main>
          {/* Use ErrorDialogs for session expiration with sessionExpired type */}
          <ErrorDialogs
            showErrorPopup={sessionExpired}
            errorType="sessionExpired"
            error="Your session has expired. Please log back in to continue."
            onClosePopup={handleLoginRedirect}
          />
          <Toaster
            position="top-center"
            duration={2000}
            closeButton={false}
            toastOptions={{
              style: {
                zIndex: 1000,
              },
            }}
          />
          <SpeedInsights />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}