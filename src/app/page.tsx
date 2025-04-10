// /app/page.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-foreground mb-4">Welcome to K12Beast</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Your ultimate study companion for K12 education. Chat with our AI, take quizzes, and track your progress to excel in your studies!
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/public/login" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Get Started
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/public/signup" className="text-foreground hover:bg-muted">
              Sign Up
            </Link>
          </Button>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-foreground mb-2">AI Tutor</h3>
            <p className="text-muted-foreground">
              Get instant help with your studies through AI chat.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-foreground mb-2">Personalized Quizzes</h3>
            <p className="text-muted-foreground">
              Test your knowledge with fun quizzes.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-foreground mb-2">Stay in Top Shape</h3>
            <p className="text-muted-foreground">
              Monitor your readiness for school tests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}