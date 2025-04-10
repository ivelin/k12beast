// /app/public/signup/page.tsx
"use client";

import { useState } from "react";
import supabase from "../../../supabase/browserClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setMessage("");
    setLoading(true);
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setMessage("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/chat`,
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

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

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
            <Input
              type="password"
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              required
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleSignUp}
            className="w-full"
            disabled={loading || !isFormValid}
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