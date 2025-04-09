// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "../supabase/browserClient";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();

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
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-foreground mb-4">Welcome to K12Beast</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Your ultimate study companion for K12 education. Chat with our AI, take quizzes, and track your progress to excel in your studies!
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/login" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Get Started
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/signup" className="text-foreground hover:bg-muted">
              Sign Up
            </Link>
          </Button>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-foreground mb-2">AI-Powered Chat</h3>
            <p className="text-muted-foreground">
              Get instant help with your studies through our intelligent AI chat.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-foreground mb-2">Interactive Quizzes</h3>
            <p className="text-muted-foreground">
              Test your knowledge with fun and engaging quizzes tailored for K12.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-foreground mb-2">Track Progress</h3>
            <p className="text-muted-foreground">
              Monitor your learning journey and see your improvement over time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}