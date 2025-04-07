// src/app/chat/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { ChatContainer, ChatMessages, ChatForm } from "@/components/ui/chat";
import { MessageList } from "@/components/ui/message-list";
import { MessageInput } from "@/components/ui/message-input";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useAppStore from "@/store";
import QuizSection from "./QuizSection";

export default function ChatPage() {
  const {
    step,
    problem,
    messages,
    images,
    imageUrls,
    quiz,
    loading,
    quizAnswer,
    quizFeedback,
    hasSubmittedProblem,
    sessionId,
    setStep,
    setProblem,
    setImages,
    handleExamplesRequest,
    handleQuizSubmit,
    handleValidate,
    handleSubmit,
    append,
    addMessage,
  } = useAppStore();

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);

  useEffect(() => {
    if (step === "problem" && !hasSubmittedProblem) {
      useAppStore.getState().reset();
    }
  }, [step, hasSubmittedProblem]);

  useEffect(() => {
    console.log("ChatPage messages:", messages);
    console.log("ChatPage loading:", loading);
  }, [messages, loading]);

  useEffect(() => {
    if (sessionId) {
      const origin = window.location.origin;
      setShareableLink(`${origin}/session/${sessionId}`);
    } else {
      setShareableLink(null);
    }
  }, [sessionId]);

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
        console.log("Triggering toast.success for copy link");
        toast.success("Link copied to clipboard!");
        setIsShareModalOpen(false); // Close the modal on success
      } catch (err) {
        console.error("Error copying link:", err);
        console.log("Triggering toast.error for copy link failure");
        toast.error("Failed to copy link to clipboard.");
      }
    }
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

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col relative">
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col">
        <ChatContainer className="flex-1">
          <ChatMessages className="flex flex-col items-start">
            <MessageList messages={filteredMessages} isTyping={loading} />
          </ChatMessages>
          {(step === "problem" && !hasSubmittedProblem) && (
            <PromptSuggestions
              className="mb-8"
              label="Try these prompts ✨"
              append={(message) => append(message, imageUrls)}
              suggestions={[
                "Explain step-by-step how to solve this math problem: if x * x + 9 = 25, what is x?",
                "Problem: Room 1 is at 18'C. Room 2 is at 22'C. Which direction will heat flow?.",
                "Problem: Simplify 3(4x + 6z). I think the answer is: 12x+19z",
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
          {(step === "problem" && !hasSubmittedProblem) && (
            <ChatForm
              className="mt-auto"
              isPending={loading}
              handleSubmit={(e) => {
                e.preventDefault();
                handleSubmit(problem, imageUrls);
              }}
            >
              {({ files, setFiles }) => (
                <MessageInput
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  allowAttachments={true}
                  files={images}
                  setFiles={(files) => setImages(files || [])}
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

      {hasSubmittedProblem && (
        <Button
          onClick={handleShare}
          className="fixed top-16 right-4 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 z-50"
          aria-label="Share session"
        >
          <Share2 className="h-5 w-5" />
        </Button>
      )}

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