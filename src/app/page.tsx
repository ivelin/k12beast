// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  // Refs to access DOM input elements
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Validate the token on page load
    const validateToken = async () => {
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];

      if (token) {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
          console.log("Invalid or expired token found, clearing cookie:", error?.message);
          document.cookie = "supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
        } else {
          console.log("Valid token found, redirecting to /chat");
          router.push("/chat");
        }
      }
    };

    validateToken();

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
  }, [router]);

  // Detect autofill by checking DOM values
  useEffect(() => {
    const checkAutofill = () => {
      if (emailInputRef.current && emailInputRef.current.value && !email) {
        console.log("Autofill detected for email:", emailInputRef.current.value);
        setEmail(emailInputRef.current.value);
      }
      if (passwordInputRef.current && passwordInputRef.current.value && !password) {
        console.log("Autofill detected for password:", passwordInputRef.current.value);
        setPassword(passwordInputRef.current.value);
      }
    };

    // Check immediately and after a short delay to catch late autofill
    checkAutofill();
    const timer = setTimeout(checkAutofill, 500);

    return () => clearTimeout(timer);
  }, []);

  // Log state changes for debugging
  useEffect(() => {
    console.log("Email state updated:", email);
    console.log("Password state updated:", password);
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Trim inputs to handle whitespace
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // Validate email and password
    if (!trimmedEmail || !trimmedPassword) {
      console.error("Validation failed: Email or password is empty after trimming", { email: trimmedEmail, password: trimmedPassword });
      setMessage("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        console.log("Attempting sign-up with email:", trimmedEmail);
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        if (error) {
          console.error("Sign-up error:", error.message);
          throw error;
        }
        console.log("Sign-up successful");
        setMessage("Sign-up successful! Check your email to confirm.");
      } else {
        console.log("Attempting login with email:", trimmedEmail);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        if (error) {
          console.error("Login error:", error.message);
          throw error;
        }
        console.log("Login successful, session data:", data);
        // Store the session token in a cookie
        document.cookie = `supabase-auth-token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}; SameSite=Strict`;
        // Use client-side redirect
        router.push("/chat");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setMessage(error.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Trimmed values for button disabled logic
  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

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
                onInput={(e) => setEmail(e.currentTarget.value)}
                ref={emailInputRef}
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
                onInput={(e) => setPassword(e.currentTarget.value)}
                ref={passwordInputRef}
                className="mt-1"
                required
                disabled={loading}
              />
            </div>
            {message && <p className="text-destructive text-sm">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading || !isFormValid}>
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