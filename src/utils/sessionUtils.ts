// File path: src/utils/sessionUtils.ts
// Utility functions for session-related logic, shared across components

import { Message } from "@/store/types";

// Interface for session data (simplified for message building)
interface SessionData {
  problem: string | null;
  images: string[] | null;
  lesson: string | null;
  messages: Message[] | null;
}

// Builds the messages array for rendering a session's chat history
export function buildSessionMessages(session: SessionData): Message[] {
  const messages: Message[] = [];

  // Add the problem as a user message if it exists
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

  // Add the lesson as an assistant message if it exists and isn't already in messages
  if (session.lesson && !messages.some(msg => msg.role === "assistant" && msg.content === session.lesson)) {
    messages.push({
      role: "assistant",
      content: session.lesson,
      renderAs: "html",
    });
  }

  // Append any existing messages from the session
  if (session.messages && session.messages.length > 0) {
    session.messages.forEach((msg) => {
      if (msg && typeof msg.content === "string") {
        messages.push(msg);
      } else {
        console.warn("Invalid message format from session:", msg);
      }
    });
  }

  return messages;
}