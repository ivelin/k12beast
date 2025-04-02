"use client";

import { useState, useEffect } from "react";
import supabase from "../supabase/browserClient";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for auth state changes for debugging
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      if (event === "SIGNED_IN" && session) {
        console.log("User signed in, session:", session);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        console.log("Attempting sign-up with email:", email);
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          console.error("Sign-up error:", error.message);
          throw error;
        }
        console.log("Sign-up successful");
        setMessage("Sign-up successful! Check your email to confirm.");
      } else {
        console.log("Attempting login with email:", email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          console.error("Login error:", error.message);
          throw error;
        }
        console.log("Login successful, session data:", data);
        // Store the session token in a cookie
        document.cookie = `supabase-auth-token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}; SameSite=Strict`;
        // Force a full page redirect to ensure middleware re-evaluates the session
        window.location.href = "/chat";
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setMessage(error.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-foreground">K12Beast</h1>
          <nav className="flex gap-4">
            <Link href="/chat" className="text-primary hover:underline">
              Chat
            </Link>
            <Link href="/history" className="text-primary hover:underline">
              History
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-card p-6 rounded-lg shadow-sm w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-foreground">
            {isSignUp ? "Sign Up for K12Beast" : "Login to K12Beast"}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                required
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </Label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                required
                disabled={loading}
              />
            </div>
            {message && <p className="text-destructive text-sm">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? "Signing Up..." : "Logging In..."}
                </>
              ) : (
                <>{isSignUp ? "Sign Up" : "Log In"}</>
              )}
            </Button>
          </form>
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={loading}
          >
            {isSignUp ? "Switch to Login" : "Switch to Sign Up"}
          </Button>
        </div>
      </div>
    </div>
  );
}