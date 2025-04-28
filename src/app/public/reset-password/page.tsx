// File path: src/app/public/reset-password/page.tsx
// Handles Supabase password reset flow using a code parameter
// Includes password confirmation field with matching validation and eye icon to toggle visibility

"use client";

import { useState, useEffect } from "react";
import supabase from "../../../supabase/browserClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({ empty: "", mismatch: "" });
  const [codeValid, setCodeValid] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validate the presence of a reset code in the URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const type = urlParams.get("type");

    console.log('Reset Code:', code);
    console.log('Type:', type);

    if (!code || type !== "recovery") {
      setMessage("Invalid or expired reset link. Please request a new one.");
      return;
    }

    setCodeValid(true);
  }, []);

  // Validate form and update error messages in real-time
  useEffect(() => {
    const errors = { empty: "", mismatch: "" };
    if (!newPassword.trim() || !confirmPassword.trim()) {
      errors.empty = "Both password fields must be filled.";
    }
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.mismatch = "Passwords do not match.";
    }
    setFormErrors(errors);
  }, [newPassword, confirmPassword]);

  // Form is valid if passwords are non-empty, match, and code is present
  const isFormValid = !formErrors.empty && !formErrors.mismatch && codeValid;

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

    // Validate password confirmation (redundant but kept for safety)
    if (trimmedPassword !== confirmPassword.trim()) {
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });
      if (error) {
        setMessage(error.message || "Failed to reset password. Please try again.");
        setLoading(false);
        return;
      }
      if (!data.user) {
        setMessage("Failed to update password: No user data returned. Please try again.");
        setLoading(false);
        return;
      }
      setMessage("Password reset successful! You can now log in with your new password.");
      setLoading(false);
      setTimeout(() => (window.location.href = "/public/login"), 2000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      setMessage(error.message || "An error occurred during password reset. Please try again.");
      setLoading(false);
    }
  };

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
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 pr-10"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Eye className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirm-password" className="block text-sm font-medium text-foreground">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 pr-10"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Eye className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          {formErrors.empty && (
            <p className="text-sm text-destructive">{formErrors.empty}</p>
          )}
          {formErrors.mismatch && (
            <p className="text-sm text-destructive">{formErrors.mismatch}</p>
          )}
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