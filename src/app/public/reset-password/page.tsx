// src/app/public/reset-password/page.tsx
"use client";

import { useState } from "react";
import supabase from "../../../supabase/browserClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const trimmedPassword = newPassword.trim();
    if (!trimmedPassword) {
      setMessage("Please enter a new password.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });
      if (error) {
        setMessage(error.message || "Failed to reset password. Please try again.");
        setLoading(false);
        return;
      }
      setMessage("Password reset successful! You can now log in with your new password.");
      setLoading(false);
      setTimeout(() => (window.location.href = "/public/login"), 2000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      setMessage(error.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const isFormValid = newPassword.trim().length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="bg-card p-6 rounded-lg shadow-sm w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Reset Password</h1>
        <p className="text-muted-foreground mb-6">
          Enter your new password below to reset it.
        </p>
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div>
            <Label htmlFor="new-password" className="block text-sm font-medium text-foreground">
              New Password
            </Label>
            <Input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}