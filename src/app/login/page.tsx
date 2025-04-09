// src/app/login/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import supabase from "../../supabase/browserClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      if (event === "SIGNED_IN" && session) {
        console.log("User signed in, session:", session);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [router]);

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

    checkAutofill();
    const timer = setTimeout(checkAutofill, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log("Email state updated:", email);
    console.log("Password state updated:", password);
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

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
          options: {
            emailRedirectTo: "http://localhost:3000/confirm-success",
          },          
        });
        if (error) {
          // Removed console.error since the error is handled
          if (error.message.includes("already registered")) {
            setMessage("This email is already registered. Please log in or use a different email.");
          } else if (error.message.includes("For security purposes, you can only request this after")) {
            setMessage("You’ve recently tried signing up with this email. Please wait a moment before trying again.");
          } else {
            setMessage(error.message || "An error occurred during sign-up. Please try again.");
          }
          setLoading(false);
          return;
        }
        console.log("Sign-up successful");
        setMessage("Sign-up successful! Please check your email to confirm your account before logging in.");
        setLoading(false);
      } else {
        console.log("Attempting login with email:", trimmedEmail);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        if (error) {
          // Removed console.error since the error is handled
          if (error.message === "Email not confirmed") {
            setMessage("Please confirm your email address. Check your inbox for a confirmation link.");
          } else if (error.message === "Invalid login credentials") {
            setMessage("Invalid email or password. Please try again.");
          } else {
            setMessage(error.message || "An error occurred during login. Please try again.");
          }
          setLoading(false);
          return;
        }
        console.log("Login successful, session data:", data);
        document.cookie = `supabase-auth-token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}; SameSite=Strict`;
        router.push("/chat");
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      setMessage(error.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
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
          {message && (
            <p className={`text-sm ${message.includes("successful") ? "text-green-500" : "text-destructive"}`}>
              {message}
            </p>
          )}
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
  );
}