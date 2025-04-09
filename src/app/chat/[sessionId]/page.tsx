"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2, PenSquare } from "lucide-react";
import { toast } from "sonner";
import { ChatContainer, ChatMessages, ChatForm } from "@/components/ui/chat";
import { MessageList } from "@/components/ui/message-list";
import { MessageInput } from "@/components/ui/message-input";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useAppStore from "@/store";
import QuizSection from "../QuizSection";
import React from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  renderAs?: "markdown" | "html";
  experimental_attachments?: { name: string; url: string }[];
}

interface Session {
  id: string;
  problem: string | null;
  images: string[] | null;
  lesson?: string;
  messages: Message[];
}

export default function ChatPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = React.use(params);
  const store = useAppStore();
  const {
    step,
    messages,
    imageUrls,
    quiz,
    loading,
    quizAnswer,
    quizFeedback,
    hasSubmittedProblem,
    sessionId: storeSessionId,
    setStep,
    handleExamplesRequest,
    handleQuizSubmit,
    handleValidate,
    handleSubmit: storeHandleSubmit,
    append: storeAppend,
    addMessage,
    reset,
    set,
  } = store;

  const [localProblem, setLocalProblem] = useState<string>("");
  const [localImages, setLocalImages] = useState<File[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSession() {
      if (sessionId === "new") {
        reset();
        setLocalProblem("");
        setLocalImages([]);
        setIsLoadingSession(false);
        return;
      }

      try {
        const token = document.cookie
          .split("; ")
          .find(row => row.startsWith("supabase-auth-token="))
          ?.split("=")[1];

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/session/${sessionId}`, {
          method: "GET",
          headers,
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch session");
        }

        const data = await res.json();
        const fetchedSession: Session = data.session;

        const updatedMessages: Message[] = [];
        if (fetchedSession.problem || (fetchedSession.images && fetchedSession.images.length > 0)) {
          updatedMessages.push({
            role: "user",
            content: fetchedSession.problem || "Image-based problem",
            renderAs: "markdown",
            experimental_attachments: fetchedSession.images?.map((url, index) => ({
              name: `Image ${index + 1}`,
              url,
            })),
          });
        }
        updatedMessages.push(...(fetchedSession.messages || []));
        const hasLessonInMessages = updatedMessages.some(msg => msg.role === "assistant");
        if (!hasLessonInMessages && fetchedSession.lesson) {
          updatedMessages.push({
            role: "assistant",
            content: fetchedSession.lesson,
            renderAs: "html",
          });
        }
        set({
          sessionId: fetchedSession.id,
          problem: fetchedSession.problem || "",
          imageUrls: fetchedSession.images || [],
          messages: updatedMessages,
          hasSubmittedProblem: true,
          step: updatedMessages.some(msg => msg.role === "assistant") ? "lesson" : "problem",
        });
        setLocalProblem(fetchedSession.problem || "");
        setLocalImages([]);

        if (!updatedMessages.some(msg => msg.role === "assistant") && fetchedSession.problem) {
          await storeHandleSubmit(fetchedSession.problem, fetchedSession.images || [], []);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Error loading session");
        }
      } finally {
        setIsLoadingSession(false);
      }
    }

    loadSession();
    return () => controller.abort();
  }, [sessionId, set, reset, storeHandleSubmit]);

  useEffect(() => {
    if (storeSessionId) {
      const origin = window.location.origin;
      setShareableLink(`${origin}/session/${storeSessionId}`);
    } else {
      setShareableLink(null);
    }
  }, [storeSessionId]);

  const handleSuggestionAction = (action: string) => {
    switch (action) {
      case "Request Example":
        handleExamplesRequest();
        break;
      case "Take a Quiz":
        handleQuizSubmit();
        break;
      default:
        break;
    }
  };

  const handleShare = async () => {
    if (!shareableLink) {
      alert("No active session to share.");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "K12Beast Session",
          text: "Check out my tutoring session on K12Beast!",
          url: shareableLink,
        });
      } catch (err) {
        console.error("Error sharing:", err);
        setIsShareModalOpen(true);
      }
    } else {
      setIsShareModalOpen(true);
    }
  };

  const handleCopyLink = async () => {
    if (shareableLink) {
      try {
        await navigator.clipboard.writeText(shareableLink);
        toast.success("Link copied to clipboard!");
        setIsShareModalOpen(false);
      } catch (err) {
        console.error("Error copying link:", err);
        toast.error("Failed to copy link to clipboard.");
      }
    }
  };

  const handleSubmit = async (problem: string, imageUrls: string[]) => {
    await storeHandleSubmit(problem, imageUrls, localImages);
  };

  const append = async (message: { role: string; content: string }, imageUrls: string[]) => {
    await storeAppend(message, imageUrls, localImages);
  };

  const handleNewChat = () => {
    reset();
    setLocalProblem("");
    setLocalImages([]);
    setStep("problem");
    window.location.href = "/chat/new";
  };

  const filteredMessages = messages.map((message) => {
    if (
      message.role === "assistant" &&
      message.content.startsWith("<strong>Quiz:</strong>") &&
      step === "quizzes" &&
      !quizFeedback
    ) {
      const problemEndIndex = message.content.indexOf("<ul>");
      if (problemEndIndex !== -1) {
        return {
          ...message,
          content: message.content.substring(0, problemEndIndex),
        };
      }
    }
    return message;
  });

  if (isLoadingSession) {
    return <div className="container mx-auto p-4">Loading session, please wait...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <p>{error}</p>
        <Link href="/history">
          <Button variant="outline" className="mt-4">
            Back to History
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col relative">
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col">
        <div className="flex justify-end items-center mb-4">
          <div className="flex space-x-2">
            <Button
              onClick={handleNewChat}
              className="bg-muted text-foreground rounded-md p-3 shadow-lg hover:bg-muted/90"
              aria-label="New chat"
            >
              <PenSquare className="h-5 w-5" />
            </Button>
            {hasSubmittedProblem && (
              <Button
                onClick={handleShare}
                className="bg-muted text-foreground rounded-md p-3 shadow-lg hover:bg-muted/90"
                aria-label="Share session"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
        <ChatContainer className="flex-1">
          <ChatMessages className="flex flex-col items-start">
            <MessageList messages={filteredMessages} isTyping={loading} />
          </ChatMessages>
          {step === "problem" && !hasSubmittedProblem && (
            <PromptSuggestions
              className="mb-8"
              label="Try these prompts ✨"
              append={(message) => append(message, imageUrls)}
              suggestions={[
                "Explain step-by-step how to solve this math problem: if x * x + 9 = 25, what is x?",
                "Problem: Room 1 is at 18'C. Room 2 is at 22'C. Which direction will heat flow?.",
                "Problem: Simplify 3(4x + 6z). I think the answer is: 12x+19z",
                "Help me prepare for 6th grade STAAR tests: math, science, ELR."
              ]}
            />
          )}
          {(step === "lesson" || step === "examples") && (
            <PromptSuggestions
              className="mb-8"
              label="What would you like to do next?"
              append={(message) => handleSuggestionAction(message.content)}
              suggestions={["Request Example", "Take a Quiz"]}
            />
          )}
          {step === "problem" && !hasSubmittedProblem && (
            <ChatForm
              className="mt-auto"
              isPending={loading}
              handleSubmit={(e) => {
                e.preventDefault();
                handleSubmit(localProblem, imageUrls);
              }}
            >
              {({ files, setFiles }) => (
                <MessageInput
                  value={localProblem}
                  onChange={(e) => setLocalProblem(e.target.value)}
                  allowAttachments={true}
                  files={localImages}
                  setFiles={setLocalImages}
                  isGenerating={loading}
                  placeholder="Ask k12beast AI..."
                />
              )}
            </ChatForm>
          )}
        </ChatContainer>
        {step === "quizzes" && quiz && !quizFeedback && (
          <QuizSection onQuizUpdate={() => {}} />
        )}
      </div>

      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Session</DialogTitle>
          </DialogHeader>
          <p>Copy this link to share your session:</p>
          <input
            type="text"
            value={shareableLink || ""}
            readOnly
            className="w-full p-2 border rounded"
          />
          <Button onClick={handleCopyLink}>
            Copy Link
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}