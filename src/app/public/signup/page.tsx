// File path: src/app/public/signup/page.tsx
// Handles sign-up flow with Supabase Auth
// Includes eye icon to toggle password visibility
// No client-side email or password validation

"use client";

import { useState } from "react";
import supabase from "../../../supabase/browserClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async () => {
    setMessage("");
    setLoading(true);
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    try {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/public/confirm-success`,
        },
      });
      if (error) {
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
      setMessage("Sign-up successful! Please check your email to confirm your account before logging in.");
      setLoading(false);
    } catch (error: any) {
      console.error("Authentication error:", error);
      setMessage(error.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="bg-card p-6 rounded-lg shadow-sm w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Sign Up for K12Beast</h1>
        {message && (
          <p className={`text-sm ${message.includes("successful") ? "text-green-500" : "text-destructive"} mb-4`}>
            {message}
          </p>
        )}
        <div className="space-y-4">
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </Label>
            <Input
              type="email"
              id="email"
              placeholder="Email"
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
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 pr-10"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Eye className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          <Button
            onClick={handleSignUp}
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing Up...
              </>
            ) : (
              "Sign Up"
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => window.location.href = "/public/login"}
            disabled={loading}
          >
            Switch to Login
          </Button>
        </div>
      </div>
    </div>
  );
}