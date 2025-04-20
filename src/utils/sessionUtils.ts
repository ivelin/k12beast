// File path: src/utils/sessionUtils.ts
// Utility functions for session-related logic, shared across components

import { MessageElement } from "@/components/ui/chat-message";
import { Session } from "@/store/types";

// Builds the messages array for rendering a session's chat history
export function buildSessionMessages(session: Session): MessageElement[] {
  const messages: MessageElement[] = [];

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
    let lessonContent = "";
    let lessonCharts = [];
    try {
      const lessonObject = JSON.parse(session.lesson);
      lessonContent = lessonObject.content;
      lessonCharts = lessonObject.charts || [];
    } catch (e) {
      console.debug("Failed to parse lesson content as JSON. Falling back to plain text content:", e);
      lessonContent = session.lesson;
    }    
    messages.push({
      role: "assistant",
      content: lessonContent,
      charts: lessonCharts,
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