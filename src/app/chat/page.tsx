"use client";

import { useEffect, useState } from "react";
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
    submittedProblem,
    images,
    imageUrls,
    lesson,
    examples,
    quiz,
    error,
    loading,
    quizAnswer,
    quizIsCorrect,
    quizCommentary,
    quizFeedback,
    hasSubmittedProblem,
    setStep,
    setProblem,
    setImages,
    setImageUrls,
    setLesson,
    setExamples,
    setQuiz,
    setError,
    setLoading,
    handleExamplesRequest,
    handleQuizSubmit,
    handleValidate,
    handleEndSession,
    reset,
  } = useAppStore();

  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const newMessages: any[] = [];
    if (submittedProblem) {
      newMessages.push({ role: "user", content: submittedProblem });
    }
    if (lesson) {
      newMessages.push({ role: "assistant", content: lesson });
    }
    if (examples) {
      newMessages.push({
        role: "assistant",
        content: `<p><strong>New Example:</strong></p><p><strong>Problem:</strong> ${examples.problem}</p>${examples.solution.map((step: any) => `<p><strong>${step.title}:</strong> ${step.content}</p>`).join("")}`,
      });
    }
    if (quiz) {
      newMessages.push({
        role: "assistant",
        content: `<p><strong>Quiz:</strong></p><p>${quiz.problem}</p><ul>${quiz.options.map((option: string) => `<li><input type="radio" name="quiz" value="${option}" ${quizAnswer === option ? "checked" : ""} onChange={(e) => useAppStore.setState({ quizAnswer: e.target.value })} /> ${option}</li>`).join("")}</ul>`,
      });
      if (quizFeedback) {
        newMessages.push({
          role: "assistant",
          content: `<p><strong>Feedback:</strong></p>${quizCommentary}${quizFeedback.solution ? quizFeedback.solution.map((step: any) => `<p><strong>${step.title}:</strong> ${step.content}</p>`).join("") : ""}`,
        });
      }
    }
    if (error) {
      newMessages.push({ role: "assistant", content: `<p class="text-destructive">${error}</p>` });
    }
    setMessages(newMessages);
  }, [submittedProblem, lesson, examples, quiz, quizAnswer, quizFeedback, quizCommentary, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem) {
      setError("Please enter a problem.");
      return;
    }
    setLoading(true);
    setMessages([...messages, { role: "user", content: problem }]);
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": useAppStore.getState().sessionId || "",
        },
        body: JSON.stringify({ problem, images: imageUrls }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch tutor lesson");
      const newSessionId = response.headers.get("x-session-id");
      if (newSessionId) useAppStore.setState({ sessionId: newSessionId });
      setLesson(data.lesson);
      setStep("examples");
    } catch (err) {
      setError(err.message || "Failed to fetch tutor lesson.");
    } finally {
      setLoading(false);
    }
  };

  const append = async (message: { role: string; content: string }) => {
    setProblem(message.content);
    setMessages([...messages, message]);
    setLoading(true);
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": useAppStore.getState().sessionId || "",
        },
        body: JSON.stringify({ problem: message.content, images: imageUrls }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch tutor lesson");
      const newSessionId = response.headers.get("x-session-id");
      if (newSessionId) useAppStore.setState({ sessionId: newSessionId });
      setLesson(data.lesson);
      setStep("examples");
    } catch (err) {
      setError(err.message || "Failed to fetch tutor lesson.");
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen flex flex-col">
      {/* Header/Navigation Bar */}
      <header className="bg-card shadow-sm">
        <div className="max-w-3xl mx-auto w-full px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">K12Beast</h1>
          <nav className="flex gap-4">
            <Link href="/" className="text-primary hover:underline">
              Home
            </Link>
            <Link href="/chat" className="text-primary hover:underline">
              Chat
            </Link>
            <Link href="/history" className="text-primary hover:underline">
              History
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col">
        <ChatContainer className="flex-1 bg-card border border-input rounded-lg shadow-sm p-4">
          {(step === "problem" && !hasSubmittedProblem) && (
            <PromptSuggestions
              label="Try these prompts"
              append={append}
              suggestions={[
                "What is the weather in San Francisco?",
                "Explain step-by-step how to solve this math problem: if x * x + 9 = 25, what is x?",
                "Design a simple algorithm to find the longest palindrome in a string.",
              ]}
            />
          )}
          {(step === "lesson" || step === "examples") && (
            <PromptSuggestions
              label="What would you like to do next?"
              append={(message) => handleSuggestionAction(message.content)}
              suggestions={["Request Example", "Take a Quiz", "End Session"]}
            />
          )}
          <ChatMessages>
            <MessageList messages={messages} isTyping={loading} />
          </ChatMessages>
          {(step === "problem" && !hasSubmittedProblem) && (
            <ChatForm
              className="mt-auto"
              isPending={loading}
              handleSubmit={handleSubmit}
            >
              {({ files, setFiles }) => (
                <MessageInput
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  allowAttachments={true}
                  files={images}
                  setFiles={(files) => setImages(files || [])}
                  isGenerating={loading}
                  placeholder="Ask AI..."
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