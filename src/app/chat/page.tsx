// src/app/chat/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import ProblemSubmission from "./ProblemSubmission"; // Updated import path
import QuizSection from "./QuizSection"; // Updated import path
import SessionEnd from "./SessionEnd"; // Updated import path
import useAppStore from "../../store";
import Link from "next/link";

export default function ChatPage() { // Renamed function to ChatPage
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
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get("sessionId");
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl);
      setStep("quizzes");
    }
  }, [setSessionId, setStep]);

  useEffect(() => {
    if (submittedProblem && imageUrls && hasSubmittedProblem) {
      const problemContent = `
        <div>
          <p><strong>Problem:</strong> ${submittedProblem}</p>
          ${imageUrls.length > 0 ? `
            <div class="mt-2">
              <p><strong>Images:</strong></p>
              <div class="flex flex-wrap gap-2">
                ${imageUrls.map((url) => `
                  <img src="${url}" alt="Problem image" class="max-w-[150px] rounded" />
                `).join("")}
              </div>
            </div>
          ` : ""}
        </div>
      `;
      setMessages((prev) => {
        const hasProblemMessage = prev.some((msg) => msg.content.includes("Problem:"));
        if (!hasProblemMessage) {
          return [
            ...prev,
            { role: "user", content: problemContent },
          ];
        }
        return prev;
      });
    }
  }, [submittedProblem, imageUrls, hasSubmittedProblem]);

  useEffect(() => {
    if (lesson) {
      setMessages((prev) => {
        const hasLessonMessage = prev.some((msg) => msg.content === lesson);
        if (!hasLessonMessage) {
          return [
            ...prev,
            { role: "assistant", content: lesson },
          ];
        }
        return prev;
      });
    }
  }, [lesson]);

  useEffect(() => {
    if (examples) {
      const exampleContent = `
        <p><strong>Example Problem:</strong> ${examples.problem}</p>
        ${examples.solution.map((step) => `
          <div class="mt-2">
            <h4 class="font-semibold">${step.title}</h4>
            ${step.content}
          </div>
        `).join("")}
      `;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: exampleContent },
      ]);
    }
  }, [examples]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartNewSession = () => {
    reset();
    setMessages([]);
  };

  const handleGetExamples = async () => {
    await useAppStore.getState().handleExamplesRequest();
  };

  const handleTakeQuiz = async () => {
    await useAppStore.getState().handleQuizSubmit();
    setStep("quizzes");
  };

  const handleEndSession = async () => {
    await useAppStore.getState().handleEndSession();
  };

  const handleQuizUpdate = (update) => {
    if (update.type === "quiz") {
      setMessages((prev) => {
        const hasQuizMessage = prev.some((msg) => msg.content === `Quiz: ${update.content}`);
        if (!hasQuizMessage) {
          return [
            ...prev,
            { role: "assistant", content: `Quiz: ${update.content}` },
          ];
        }
        return prev;
      });
    } else if (update.type === "result") {
      setMessages((prev) => {
        const hasResultMessage = prev.some((msg) => msg.content === update.content);
        if (!hasResultMessage) {
          return [
            ...prev,
            { role: "user", content: `Answer: ${useAppStore.getState().quizAnswer}` },
            { role: "assistant", content: update.content },
          ];
        }
        return prev;
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-gray-800 text-white p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">K12Beast</h1>
          <div className="space-x-4">
            <Link href="/chat" className="hover:underline">Chat</Link> {/* Updated to /chat */}
            <Link href="/history" className="hover:underline">History</Link>
          </div>
        </div>
      </nav>
      <div className="flex-1 flex flex-col max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold">K12Beast Chat</h1>
          <button
            onClick={handleStartNewSession}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-700"
          >
            Start New Session
          </button>
        </div>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-100 rounded-lg"
        >
          {messages.length === 0 && !sessionEnded ? (
            <div className="text-center text-gray-500">
              Start a new session by submitting a problem below.
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index}>
                <div
                  className={`mb-4 p-3 rounded-lg shadow-sm break-words ${
                    msg.role === "user"
                      ? "bg-blue-200 ml-auto max-w-[80%]"
                      : "bg-white max-w-[80%]"
                  }`}
                >
                  <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                </div>
                {index < messages.length - 1 && (
                  <hr className="border-t border-gray-300 my-2" />
                )}
              </div>
            ))
          )}
          {quiz && step === "quizzes" && !sessionEnded && (
            <div className="mb-4 p-3 rounded-lg bg-white max-w-[80%] shadow-sm break-words">
              <QuizSection onQuizUpdate={handleQuizUpdate} />
            </div>
          )}
          {sessionEnded && (
            <div className="text-center">
              <p className="text-lg font-bold mb-2">Session Ended</p>
              <SessionEnd />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {!sessionEnded && (
          <div className="border-t pt-4">
            {useAppStore.getState().error && (
              <div className="text-red-500 mb-2">{useAppStore.getState().error}</div>
            )}
            {hasSubmittedProblem && (!quiz || step !== "quizzes") ? (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleGetExamples}
                  className="p-2 bg-blue-500 text-white rounded hover:bg-blue-700"
                  disabled={useAppStore.getState().loading}
                >
                  Get More Examples
                </button>
                <button
                  onClick={handleTakeQuiz}
                  className="p-2 bg-green-500 text-white rounded hover:bg-green-700"
                  disabled={useAppStore.getState().loading}
                >
                  Take a Quiz
                </button>
                <button
                  onClick={handleEndSession}
                  className="p-2 bg-red-500 text-white rounded hover:bg-red-700"
                  disabled={useAppStore.getState().loading}
                >
                  End Session
                </button>
              </div>
            ) : !hasSubmittedProblem ? (
              <ProblemSubmission />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}