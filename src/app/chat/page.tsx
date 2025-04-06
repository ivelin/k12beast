// src/app/chat/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChatContainer, ChatMessages, ChatForm } from "@/components/ui/chat";
import { MessageList } from "@/components/ui/message-list";
import { MessageInput } from "@/components/ui/message-input";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import useAppStore from "@/store";
import SessionEnd from "./SessionEnd";
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
    setStep,
    setProblem,
    setImages,
    handleExamplesRequest,
    handleQuizSubmit,
    handleValidate,
    handleEndSession,
    handleSubmit,
    append,
    addMessage,
  } = useAppStore();

  useEffect(() => {
    if (step === "problem" && !hasSubmittedProblem) {
      useAppStore.getState().reset();
    }
  }, [step, hasSubmittedProblem]);

  useEffect(() => {
    console.log("ChatPage messages:", messages);
    console.log("ChatPage loading:", loading);
  }, [messages, loading]);

  const handleSuggestionAction = (action: string) => {
    switch (action) {
      case "Another Example":
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

  const handleQuizUpdate = (update: { type: string; content: string }) => {
    if (update.type === "result") {
      addMessage({
        role: "assistant",
        content: update.content,
        renderAs: "html",
      });
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col">
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
              suggestions={["Another Example", "Take a Quiz", "End Session"]}
            />
          )}
          {(step === "problem" || step === "lesson") && (
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
                  placeholder={
                    step === "problem"
                      ? "Ask k12beast AI..."
                      : "Ask a follow-up question..."
                  }
                />
              )}
            </ChatForm>
          )}
        </ChatContainer>
        {step === "quizzes" && quiz && !quizFeedback && (
          <QuizSection onQuizUpdate={handleQuizUpdate} />
        )}
        {step === "share" && <SessionEnd />}
      </div>
    </div>
  );
}