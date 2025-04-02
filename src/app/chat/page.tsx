"use client";

import { useEffect, useState, useRef } from "react";
import useAppStore from "../../store";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Chat } from "@/components/ui/chat"; // Import Chat from chat.tsx
import { MessageList } from "@/components/ui/message-list"; // Import MessageList (was ListChat)
import { MessageInput } from "@/components/ui/message-input"; // Import MessageInput (was InputMessage)

export default function ChatPage() {
  const {
    problem,
    submittedProblem,
    imageUrls,
    lesson,
    examples,
    quiz,
    step,
    shareableLink,
    sessionEnded,
    reset,
    setStep,
    setSessionId,
    setSubmittedProblem,
    hasSubmittedProblem,
  } = useAppStore();

  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  // Handle session ID from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get("sessionId");
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl);
      setStep("quizzes");
    }
  }, [setSessionId, setStep]);

  // Add user-submitted problem to messages
  useEffect(() => {
    if (submittedProblem && imageUrls && hasSubmittedProblem) {
      const problemContent = {
        role: "user",
        content: submittedProblem,
        images: imageUrls,
      };
      setMessages((prev) => {
        const hasProblemMessage = prev.some((msg) => msg.content === submittedProblem);
        if (!hasProblemMessage) {
          return [...prev, problemContent];
        }
        return prev;
      });
    }
  }, [submittedProblem, imageUrls, hasSubmittedProblem]);

  // Add lesson to messages
  useEffect(() => {
    if (lesson) {
      setMessages((prev) => {
        const hasLessonMessage = prev.some((msg) => msg.content === lesson);
        if (!hasLessonMessage) {
          return [...prev, { role: "assistant", content: lesson }];
        }
        return prev;
      });
    }
  }, [lesson]);

  // Add examples to messages
  useEffect(() => {
    if (examples) {
      const exampleContent = {
        role: "assistant",
        content: `**Example Problem:** ${examples.problem}\n\n${examples.solution
          .map((step) => `**${step.title}**\n${step.content}`)
          .join("\n\n")}`,
      };
      setMessages((prev) => [...prev, exampleContent]);
    }
  }, [examples]);

  // Auto-scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset session
  const handleStartNewSession = () => {
    reset();
    setMessages([]);
  };

  // Handle message submission
  const handleSendMessage = async (message, files) => {
    if (!message && (!files || files.length === 0)) return;

    // Simulate file upload if files are present
    if (files && files.length > 0) {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      try {
        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to upload images");
        }

        const newImageUrls = data.files.map((file) => file.url);
        useAppStore.setState({
          imageUrls: newImageUrls,
          submittedProblem: message || "Image-based problem",
          hasSubmittedProblem: true,
        });
      } catch (err) {
        useAppStore.setState({ error: err.message || "Failed to upload images. Please try again." });
      }
    } else {
      // Handle text-only submission
      useAppStore.setState({
        submittedProblem: message,
        imageUrls: [],
        hasSubmittedProblem: true,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="p-4">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <h1 className="text-lg font-bold">K12Beast</h1>
          <div className="space-x-4">
            <Link href="/chat">Chat</Link>
            <Link href="/history">History</Link>
          </div>
        </div>
      </nav>
      <div className="flex-1 flex flex-col max-w-xl mx-auto p-4 sm:p-6">
        <div className="flex justify-end mb-4">
          <Button onClick={handleStartNewSession} className="h-9 px-3 text-sm">
            Start New Session
          </Button>
        </div>
        <MessageList
          messages={messages}
          isTyping={false}
          messageOptions={() => ({ actions: null })}
        >
          {messages.length === 0 ? (
            <div className="text-center text-[var(--text-secondary)]">
              Enter a problem below to start a new session
            </div>
          ) : (
            <Chat messages={messages} />
          )}
        </MessageList>
        <MessageInput
          placeholder="Enter a problem or attach an image"
          onSend={handleSendMessage}
          disabled={useAppStore.getState().loading}
          allowAttachments
        />
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}