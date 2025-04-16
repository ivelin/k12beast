// src/app/public/session/[sessionId]/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
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

async function fetchSession(sessionId: string): Promise<Session> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/session/${sessionId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to fetch session");
  }

  const data = await res.json();
  return data.session;
}

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("supabase-auth-token")?.value;

  if (!authToken) {
    return false;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/auth/user`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });

  return res.ok;
}

export default async function PublicSessionPage({
  params: paramsPromise,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const params = await paramsPromise;
  const { sessionId } = params;

  // Fetch session data server-side
  let session: Session | null = null;
  let error: string | null = null;
  try {
    session = await fetchSession(sessionId);
  } catch (err: any) {
    error = err.message || "Error loading session";
  }

  // Check authentication server-side
  const isAuthenticated = await checkAuth();

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