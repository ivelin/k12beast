"use client";

import { useEffect, useState } from "react";
import { Chat } from "@/components/ui/chat";
import useAppStore from "@/store";
import Link from "next/link";
import { cn } from "@/utils";

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
        <div className="flex-1 bg-card border border-input rounded-lg shadow-sm p-4">
          <Chat
            messages={messages}
            handleSubmit={handleSubmit}
            input={problem}
            handleInputChange={(e) => setProblem(e.target.value)}
            isGenerating={loading}
            setMessages={setMessages}
            append={append}
            suggestions={[
              "Enter a problem (e.g., Simplify 12(3y + x)) or attach an image",
            ]}
            allowAttachments={true}
            files={images}
            setFiles={(files) => setImages(files || [])}
          />
        </div>
        {hasSubmittedProblem && (
          <div className="flex gap-2 justify-center py-4">
            <button
              onClick={handleExamplesRequest}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
              disabled={loading}
            >
              Request Example
            </button>
            <button
              onClick={handleQuizSubmit}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
              disabled={loading}
            >
              Take a Quiz
            </button>
            <button
              onClick={() => useAppStore.getState().handleEndSession()}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
              disabled={loading}
            >
              End Session
            </button>
            {step === "quizzes" && quiz && !quizFeedback && (
              <button
                onClick={() => handleValidate(quizAnswer, quiz)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                disabled={loading || !quizAnswer}
              >
                Submit Quiz
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}