"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

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

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkUser();
  }, []);

  const handleAuth = async () => {
    setIsLoggingIn(true);
    try {
      if (isLoggedIn) {
        await supabase.auth.signOut();
        setIsLoggedIn(false);
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
      if (!isLoggedIn) {
        // Re-check user after login attempt (OAuth redirect handles session)
        const { data: { user } } = await supabase.auth.getUser();
        setIsLoggedIn(!!user);
      }
    }
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <nav className="flex items-center justify-between p-4 bg-muted">
            <div className="text-lg font-bold">K12Beast</div>
            <div className="flex space-x-4">
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <Link href="/chat" className="hover:underline">
                Chat
              </Link>
              <Link href="/history" className="hover:underline">
                History
              </Link>
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
            </div>
          </nav>
          <main className="p-4">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}