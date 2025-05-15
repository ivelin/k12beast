// File path: src/app/public/confirm-success/ConfirmSuccessClient.tsx
// Client component for K12Beast confirm success page, displaying account confirmation message

"use client";

import Link from "next/link";

export default function ConfirmSuccessClient() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="bg-card p-6 rounded-lg shadow-sm w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Account Confirmed!</h1>
        <p className="text-muted-foreground mb-4">
          Your K12Beast account has been successfully activated. You can now log in to start your learning journey.
        </p>
        <Link href="/public/login" className="text-primary hover:underline">
          Go to Login
        </Link>
      </div>
    </div>
  );
}