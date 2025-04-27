// File path: src/app/chat/[sessionId]/page.tsx
// Renders the live chat page for both new and existing sessions, ensuring consistent message rendering.
// Updated to fix "set is not a function" error by accessing set dynamically in async operations.

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
import { Message, Quiz, Session } from "@/store/types";
import QuizSection from "../QuizSection";
import React from "react";
import { buildSessionMessages, injectChatScripts } from "@/utils/sessionUtils";
import { ErrorDialogs } from "@/components/ui/ErrorDialogs";
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
    error,
    errorType,
    sessionTerminated,
    showErrorPopup,
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
    let isMounted = true; // Track if component is mounted
    const controller = new AbortController();

    async function loadSession() {
      // Reset state synchronously before async operation
      if (!isMounted) return;
      useAppStore.setState({ error: null, errorType: null, showErrorPopup: false });

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

        const updatedMessages = buildSessionMessages(fetchedSession);

        // Update state after async operation completes
        if (!isMounted) return;
        useAppStore.setState({
          sessionId: fetchedSession.id,
          problem: fetchedSession.problem || "",
          imageUrls: fetchedSession.images || [],
          messages: updatedMessages,
          hasSubmittedProblem: true,
          step: updatedMessages.some(msg => msg.role === "assistant") ? "lesson" : "problem",
          sessionTerminated: false,
          showErrorPopup: false,
          error: null,
          errorType: null,
          cloned_from: fetchedSession.cloned_from || null,
        });
        setLocalProblem(fetchedSession.problem || "");
        setLocalImages([]);

        if (!updatedMessages.some(msg => msg.role === "assistant") && fetchedSession.problem) {
          await storeHandleSubmit(fetchedSession.problem, fetchedSession.images || [], []);
        }
      } catch (err) {
        if (err.name !== "AbortError" && isMounted) {
          // Update error state after async failure
          useAppStore.setState({
            error: err.message || "Error loading session",
            errorType: "retryable",
            showErrorPopup: true,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingSession(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false; // Mark component as unmounted
      controller.abort();
    };
  }, [sessionId, reset, storeHandleSubmit]); // Removed set from dependencies

  useEffect(() => {
    if (storeSessionId) {
      const origin = window.location.origin;
      setShareableLink(`${origin}/public/session/${storeSessionId}`);
    } else {
      setShareableLink(null);
    }
  }, [storeSessionId]);

  // Debug log to verify error state
  useEffect(() => {
    if (showErrorPopup) {
      console.log("Error dialog should be visible:", { error, errorType, showErrorPopup });
    }
  }, [showErrorPopup, error, errorType]);

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
    await storeHandleSubmit(problem, imageUrls, localImages);
  };

  const append = async (message: Message, imageUrls: string[]) => {
    await storeAppend(message, imageUrls, localImages);
  };

  const handleNewChat = () => {
    reset();
    setLocalProblem("");
    setLocalImages([]);
    setStep("problem");
    window.location.href = "/chat/new";
  };

  const handleRetry = async () => {
    await retry(); // Trigger retry of the last failed operation
  };

  const handleClosePopup = () => {
    useAppStore.setState({ showErrorPopup: false, error: null, errorType: null });
  };

  if (isLoadingSession) {
    return <div className="container mx-auto p-4">Loading session, please wait...</div>;
  }

  return (
    <div className="container">
      {/* Chat Header */}
      {cloned_from && (
        <div className="text-sm text-muted-foreground mb-4">
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
      <div className="flex justify-end items-center mb-4">
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
        {!loading && step === "problem" && !hasSubmittedProblem && (
          <PromptSuggestions
            className="mb-8"
            label="Try these prompts ✨"
            append={(message) => append(message, imageUrls)}
            suggestions={[
              "Explain step-by-step how to solve this math problem: if x * x + 9 = 25, what is x?",
              "Problem: Room 1 is at 18'C. Room 2 is at 22'C. Which direction will heat flow?.",
              "Problem: Simplify 3(4x + 6z). I think the answer is: 12x+19z",
              "Help me prepare for 6th grade school tests: math, science, ELR."
            ]}
          />
        )}
        {!loading && (step === "lesson" || step === "examples") && !sessionTerminated && (
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

      <ErrorDialogs
        showErrorPopup={showErrorPopup}
        errorType={errorType}
        error={error}
        onRetry={handleRetry}
        onNewChat={handleNewChat}
        onClosePopup={handleClosePopup}
      />
      <ShareDialog
        isOpen={isShareModalOpen}
        shareableLink={shareableLink}
        onOpenChange={setIsShareModalOpen}
        onCopyLink={handleCopyLink}
      />
    </div>
  );
}