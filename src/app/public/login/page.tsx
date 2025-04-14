// src/app/public/login/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import supabase from "../../../supabase/browserClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Utility to debounce a function
const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

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

    // Run once after a short delay to catch autofill
    const timer = setTimeout(checkAutofill, 500);
    return () => clearTimeout(timer);
  }, [email, password]);

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
      console.error("Validation failed: Email or password is empty", { email: trimmedEmail, password: trimmedPassword });
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
          options: { emailRedirectTo: `${window.location.origin}/public/confirm-success` },
        });
        if (error) {
          if (error.message.includes("already registered")) {
            setMessage("This email is already registered. Please log in or use a different email.");
          } else if (error.message.includes("For security purposes")) {
            setMessage("You’ve recently tried signing up. Please wait a moment.");
          } else {
            setMessage(error.message || "Sign-up error. Please try again.");
          }
          setLoading(false);
          return;
        }
        console.log("Sign-up successful");
        setMessage("Sign-up successful! Check email.");
        setLoading(false);
      } else {
        console.log("Attempting login with email:", trimmedEmail);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        if (error) {
          if (error.message === "Email not confirmed") {
            setMessage("Please confirm your email address.");
          } else if (error.message === "Invalid login credentials") {
            setMessage("Invalid email or password.");
          } else {
            setMessage(error.message || "Login error. Please try again.");
          }
          setLoading(false);
          return;
        }
        console.log("Login successful, session data:", data);
        document.cookie = `supabase-auth-token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}; SameSite=Lax`;
        setLoading(false);
        window.location.href = "/chat/new"; // Redirect to /chat/new
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      setMessage(error.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetMessage("");

    const trimmedResetEmail = resetEmail.trim();
    if (!trimmedResetEmail) {
      setResetMessage("Please enter your email.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedResetEmail, {
        redirectTo: `${window.location.origin}/public/reset-password`,
      });
      if (error) {
        setResetMessage(error.message || "Failed to send reset email. Please try again.");
        setLoading(false);
        return;
      }
      setResetMessage("Password reset email sent! Please check your inbox.");
      setLoading(false);
      setTimeout(() => setIsResetDialogOpen(false), 2000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      setResetMessage(error.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Debounced handler for opening the reset dialog
  const debouncedOpenResetDialog = debounce(() => {
    setIsResetDialogOpen(true);
  }, 300);

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;
  const isResetFormValid = resetEmail.trim().length > 0;

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
            {!isSignUp && (
              <button
                type="button"
                onClick={debouncedOpenResetDialog}
                className="text-sm text-primary hover:underline mt-2"
                disabled={loading}
              >
                Forgot Password?
              </button>
            )}
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

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Your Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="reset-email" className="block text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                type="email"
                id="reset-email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="mt-1"
                required
                disabled={loading}
              />
            </div>
            {resetMessage && (
              <p className={`text-sm ${resetMessage.includes("sent") ? "text-green-500" : "text-destructive"}`}>
                {resetMessage}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading || !isResetFormValid}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Email"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}