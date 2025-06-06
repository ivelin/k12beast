// File path: src/app/chat/[sessionId]/page.tsx
// Renders the live chat page for both new and existing sessions, ensuring consistent message rendering
// Updated to handle session termination by hiding input and prompt suggestions
// Removed container class and adjusted padding to maximize content width on mobile
// Fixed append function naming conflict in PromptSuggestions to resolve ReferenceError
// Fixed user input prompt passing to ensure problem is a string, not an object

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2, PenSquare } from "lucide-react";
import { toast } from "sonner";
import { ChatContainer, ChatMessages, ChatForm } from "@/components/ui/chat";
import { MessageList } from "@/components/ui/message-list";
import { MessageInput } from "@/components/ui/message-input";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { Button } from "@/components/ui/button";
import useAppStore from "@/store";
import { Message, Session } from "@/store/types";
import QuizSection from "../QuizSection";
import React from "react";
import { buildSessionMessages, injectChatScripts } from "@/utils/sessionUtils";
import { ShareDialog } from "@/components/ui/ShareDialog";

export default function ChatPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = React.use(params);
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
    sessionError,
    validationError, // Still access validationError, but not displayed
    sessionTerminated,
    cloned_from,
    setStep,
    handleExamplesRequest,
    handleQuizSubmit,
    handleValidate,
    handleSubmit: storeHandleSubmit,
    append: storeAppend,
    addMessage,
    retry,
    reset,
  } = useAppStore();

  const [localProblem, setLocalProblem] = useState<string>("");
  const [localImages, setLocalImages] = useState<File[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Inject MathJax scripts once per page
  useEffect(() => {
    injectChatScripts();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadSession() {
      if (!isMounted) return;
      useAppStore.setState({ sessionError: null });

      if (sessionId === "new") {
        if (!isMounted) return;
        reset();
        setLocalProblem("");
        setLocalImages([]);
        setIsLoadingSession(false);
        return;
      }

      try {
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("supabase-auth-token="))
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

        const updatedMessages = buildSessionMessages(fetchedSession);

        if (!isMounted) return;
        useAppStore.setState({
          sessionId: fetchedSession.id,
          problem: fetchedSession.problem || "",
          imageUrls: fetchedSession.images || [],
          messages: updatedMessages,
          hasSubmittedProblem: true,
          step: updatedMessages.some((msg) => msg.role === "assistant") ? "lesson" : "problem",
          sessionTerminated: false,
          sessionError: null,
          cloned_from: fetchedSession.cloned_from || null,
        });
        setLocalProblem(fetchedSession.problem || "");
        setLocalImages([]);

        if (!updatedMessages.some((msg) => msg.role === "assistant") && fetchedSession.problem) {
          await storeHandleSubmit(fetchedSession.problem, fetchedSession.images || [], []);
        }
      } catch (err) {
        if (err.name !== "AbortError" && isMounted) {
          console.error("Error loading session:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSession(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [sessionId, reset, storeHandleSubmit]);

  useEffect(() => {
    if (storeSessionId) {
      const origin = window.location.origin;
      setShareableLink(`${origin}/public/session/${storeSessionId}`);
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
        toast.dismiss();
        await navigator.clipboard.writeText(shareableLink);
        toast.success("Link copied to clipboard!", { duration: 2000 });
        setIsShareModalOpen(false);
      } catch (err) {
        console.error("Error copying link:", err);
        toast.dismiss();
        toast.error("Failed to copy link to clipboard.", { duration: 2000 });
      }
    }
  };

  const handleSubmit = async (problem: string, imageUrls: string[]) => {
    if (step === "quizzes") return;
    // Ensure problem is a string and pass it directly to storeHandleSubmit
    await storeHandleSubmit(problem, imageUrls, localImages);
  };

  const handleAppend = async (message: Message, imageUrls: string[]) => {
    if (step === "quizzes") return;
    await storeAppend(message, imageUrls, localImages);

  };

  const handleNewChat = () => {
    reset();
    setLocalProblem("");
    setLocalImages([]);
    setStep("problem");
    window.location.href = "/chat/new";
  };

  if (isLoadingSession) {
    return <div className="p-4">Loading session, please wait...</div>;
  }

  return (
    <div className="w-full"> {/* Removed container class, using w-full to maximize width */}
      {/* Chat Header */}
      {cloned_from && (
        <div className="text-sm text-muted-foreground mb-4 px-2">
          <p>
            This session was cloned from{" "}
            <Link
              href={`/public/session/${cloned_from}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary-dark"
            >
              a shared session
            </Link>.
          </p>
        </div>
      )}
      <div className="flex justify-end items-center mb-4 px-2">
        <div className="flex space-x-2">
          <div className="relative group">
            <Button
              onClick={handleNewChat}
              className="bg-muted text-foreground rounded-md p-3 shadow-lg hover:bg-muted/90"
              aria-label="New chat"
            >
              <PenSquare className="h-5 w-5" />
            </Button>
            <span className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-background text-foreground text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity sm:hidden">
              New Chat
            </span>
            <span className="hidden sm:block absolute top-12 left-1/2 transform -translate-x-1/2 bg-background text-foreground text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
              New Chat
            </span>
          </div>
          {hasSubmittedProblem && !sessionTerminated && (
            <div className="relative group">
              <Button
                onClick={handleShare}
                className="bg-muted text-foreground rounded-md p-3 shadow-lg hover:bg-muted/90"
                aria-label="Share session"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              <span className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-background text-foreground text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity sm:hidden">
                Share
              </span>
              <span className="hidden sm:block absolute top-12 left-1/2 transform -translate-x-1/2 bg-background text-foreground text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                Share Session
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chat Content */}
      <ChatContainer className="flex-1">
        <ChatMessages className="flex flex-col items-start">
          <MessageList messages={messages} isTyping={loading} />
        </ChatMessages>

        {!loading && step === "problem" && !hasSubmittedProblem && !sessionTerminated && (
          <PromptSuggestions
            className="mb-8 px-2"
            label="Try these prompts ✨"
            append={(message) => handleAppend(message, imageUrls)} // Pass the message string directly
            suggestions={[
              "Explain step-by-step how to solve this math problem: if x * x + 9 = 25, what is x?",
              "Problem: Room 1 is at 18'C. Room 2 is at 22'C. Which direction will heat flow?.",
              "Problem: Simplify 3(4x + 6z). I think the answer is: 12x+19z",
              "Help me prepare for 6th grade school tests: math, science, ELR.",
            ]}
            disabled={loading || step === "quizzes"}
          />
        )}
        {!loading && (step === "lesson" || step === "examples") && !sessionTerminated && (
          <PromptSuggestions
            className="mb-8 px-2"
            label="What would you like to do next?"
            append={(message) => handleSuggestionAction(message.content)}
            suggestions={["Request Example", "Take a Quiz"]}
            disabled={loading || step === "quizzes"}
          />
        )}
        {step === "problem" && !hasSubmittedProblem && !sessionTerminated && (
          <ChatForm
            className="mt-auto px-2"
            isPending={loading}
            handleSubmit={(e) => {
              e.preventDefault();
              handleSubmit(localProblem, imageUrls);
            }}
          >
            {({ files, setFiles }) => (
              <MessageInput
                value={localProblem}
                onChange={(e) => setLocalProblem(e.target.value)} // Ensure localProblem updates with user input
                allowAttachments={true}
                files={localImages}
                setFiles={setLocalImages}
                isGenerating={loading || step === "quizzes"}
                placeholder="Ask k12beast AI..."
              />
            )}
          </ChatForm>
        )}
      </ChatContainer>
      {step === "quizzes" && quiz && !quizFeedback && <QuizSection />}
      <ShareDialog
        isOpen={isShareModalOpen}
        shareableLink={shareableLink}
        onOpenChange={setIsShareModalOpen}
        onCopyLink={handleCopyLink}
      />
    </div>
  );
}