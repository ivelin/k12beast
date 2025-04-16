// src/app/public/session/[sessionId]/page.tsx
// File path: src/app/public/session/[sessionId]/page.tsx
// Renders a public session page with client-side data fetching and Supabase auth

"use client";

import { useEffect, useState } from "react";
import { use } from "react"; // Import React.use
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import supabase from '@/supabase/browserClient';
import { Button } from "@/components/ui/button";
import { ChatMessages } from "@/components/ui/chat";
import { MessageList } from "@/components/ui/message-list";
import ClientCloneButton from "./ClientCloneButton";
import FormattedTimestamp from "@/components/ui/formatted-timestamp";

// Define interfaces for TypeScript type safety
interface Message {
  role: "user" | "assistant";
  content: string;
  renderAs?: "markdown" | "html";
  experimental_attachments?: { name: string; url: string }[];
}

interface Session {
  problem: string | null;
  images: string[] | null;
  lesson: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

interface PublicSessionPageProps {
  params: Promise<{ sessionId: string }>; // Define params as a Promise
}

export default function PublicSessionPage({ params }: PublicSessionPageProps) {
  // Unwrap params using React.use
  const { sessionId } = use(params);

  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch session data and auth status client-side
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch session
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const sessionRes = await fetch(`${baseUrl}/api/session/${sessionId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!sessionRes.ok) {
          const errorData = await sessionRes.json();
          throw new Error(errorData.error || "Failed to fetch session");
        }

        const sessionData = await sessionRes.json();
        setSession(sessionData.session);

        // Check auth status using Supabase client
        const { data: authSessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Supabase auth error:", sessionError.message);
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(!!authSessionData.session);
        }
      } catch (err: any) {
        console.error("Fetch error:", err.message);
        setError(err.message || "Error loading session");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [sessionId]);

  // Build messages array
  const messages: Message[] = [];
  if (session) {
    if (session.problem || (session.images && session.images.length > 0)) {
      messages.push({
        role: "user",
        content: session.problem || "Image-based problem",
        renderAs: "markdown",
        experimental_attachments: session.images?.map((url, index) => ({
          name: `Image ${index + 1}`,
          url,
        })),
      });
    }

    messages.push({
      role: "assistant",
      content: session.lesson || "No lesson provided",
      renderAs: "html",
    });

    messages.push(...(session.messages || []));
  }

  // Render loading state
  if (loading) {
    return (
      <div className="container">
        <p>Loading session...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="container">
        <h1 className="text-2xl font-bold mb-6">Error</h1>
        <p>{error}</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  // Render session content
  return (
    <div className="container">
      <Link href="/">
        <Button variant="outline" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </Link>
      <h1 className="text-2xl font-bold mb-2">Shared Session</h1>
      {session && (
        <div className="text-sm text-muted-foreground mb-4">
          <p>
            Created: <FormattedTimestamp timestamp={session.created_at} format="full" />
          </p>
          <p>
            Last Updated: <FormattedTimestamp timestamp={session.updated_at} format="full" />
          </p>
        </div>
      )}
      {isAuthenticated ? (
        <ClientCloneButton sessionId={sessionId} />
      ) : (
        <div className="text-sm text-muted-foreground mb-4">
          <p>
            <Link
              href={`/public/login?redirectTo=${encodeURIComponent(`/public/session/${sessionId}`)}`}
              className="text-primary underline hover:text-primary-dark"
            >
              Log in
            </Link>{" "}
            to clone this session and continue working on it.
          </p>
        </div>
      )}
      <ChatMessages className="flex flex-col items-start">
        <MessageList messages={messages} />
      </ChatMessages>
    </div>
  );
}