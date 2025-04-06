// src/app/chat/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChatContainer, ChatMessages, ChatForm } from "@/components/ui/chat";
import { MessageList } from "@/components/ui/message-list";
import { MessageInput } from "@/components/ui/message-input";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import useAppStore from "@/store";

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
    setStep,
    setProblem,
    setImages,
    handleExamplesRequest,
    handleQuizSubmit,
    handleValidate,
    handleEndSession,
    handleSubmit,
    append,
  } = useAppStore();

  useEffect(() => {
    // Reset state if we're starting a new chat session
    if (step === "problem" && !hasSubmittedProblem) {
      useAppStore.getState().reset();
    }
  }, [step, hasSubmittedProblem]);

  const handleSuggestionAction = (action: string) => {
    switch (action) {
      case "Request Example":
        handleExamplesRequest();
        break;
      case "Take a Quiz":
        handleQuizSubmit();
        break;
      case "End Session":
        handleEndSession();
        break;
      default:
        break;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Main Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col">
        <ChatContainer className="flex-1">
          <ChatMessages className="flex flex-col items-start">
            <MessageList messages={messages} isTyping={loading} />
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
              suggestions={["Request Example", "Take a Quiz", "End Session"]}
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
          <div className="flex gap-2 justify-center py-4">
            <button
              onClick={() => handleValidate(quizAnswer, quiz)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              disabled={loading || !quizAnswer}
            >
              Submit Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}