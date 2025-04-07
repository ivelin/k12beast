// src/app/session/[sessionId]/page.tsx
import { ChatContainer, ChatMessages } from "@/components/ui/chat";
import { MessageList } from "@/components/ui/message-list";

async function fetchSession(sessionId: string) {
  const res = await fetch(`http://localhost:3000/api/session/${sessionId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store", // Ensure fresh data
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to fetch session");
  }

  const data = await res.json();
  return data.session; // The API route returns { session: data }
}

export default async function SessionDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const params = await paramsPromise; // Await params to access sessionId
  const session = await fetchSession(params.sessionId);

  return (
    <div className="container">
      <h1 className="text-2xl font-bold mb-6">Session Details</h1>
      <div className="space-y-4">
        <p><strong>Lesson:</strong> {session.lesson || "No lesson provided"}</p>
        <ChatContainer className="flex-1">
          <ChatMessages className="flex flex-col items-start">
            <MessageList messages={session.messages || []} />
          </ChatMessages>
        </ChatContainer>
      </div>
    </div>
  );
}