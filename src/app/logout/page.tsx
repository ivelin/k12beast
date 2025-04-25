// File path: src/app/logout/page.tsx
// Simple logout page that signs out the user and provides navigation links

"use client";

import { useEffect, useState } from "react";
import supabase from "@/supabase/browserClient";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Logout() {
  const [message, setMessage] = useState("Logging you out...");

  useEffect(() => {
    const signOut = async () => {
      try {
        // Sign out the user using Supabase
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("Logout error:", error);
          setMessage("Failed to log out. Please try again.");
          return;
        }

        // Clear the auth token cookie
        document.cookie =
          "supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure";

        // Update the message to confirm logout
        setMessage("You have been successfully logged out.");
      } catch (error) {
        console.error("Unexpected logout error:", error);
        setMessage("An unexpected error occurred during logout. Please try again.");
      }
    };

    signOut();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="bg-card p-6 rounded-lg shadow-sm w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Logout</h1>
        <p className="text-foreground mb-6">{message}</p>
        <div className="flex flex-col space-y-4">
          <Button asChild>
            <Link href="/public/login">Log In Again</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go to Home Page</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}