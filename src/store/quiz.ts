// File path: src/store/quiz.ts
// Manages quiz-related state and actions for K12Beast, including example and quiz requests
// Updated to clear validationError on successful quiz validation

import { StateCreator } from "zustand";
import { toast } from "sonner";
import { AppState, Quiz, QuizFeedback, Message } from "./types";
import { formatQuizFeedbackMessage } from "@/utils/quizUtils";
import { formatQuizProblemMessage } from "@/utils/quizUtils";

export interface QuizState {
  quiz: Quiz | null;
  quizAnswer: string;
  quizFeedback: QuizFeedback | null;
  correctAnswer: string | null; // Tracks the correct answer for quiz feedback
  validationError: string | null; // Tracks validation error message for UI display
  handleExamplesRequest: () => Promise<void>;
  handleQuizSubmit: () => Promise<void>;
  handleValidate: (answer: string, quiz: Quiz) => Promise<void>;
}

export const createQuizStore: StateCreator<AppState, [], [], QuizState> = (set, get) => ({
  quiz: null,
  quizAnswer: "",
  quizFeedback: null,
  correctAnswer: null, // Initialize correctAnswer
  validationError: null, // Initialize validation error message
  handleExamplesRequest: async () => {
    const { problem, imageUrls, sessionId, addMessage, loading, sessionTerminated } = get();
    if (loading || sessionTerminated) return;
    set({ loading: true });
    try {
      addMessage({ role: "user", content: "Request Example", renderAs: "markdown" });
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];
      if (!token) throw new Error("Failed to request examples: Authentication required.");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-session-id": sessionId || "",
        Authorization: `Bearer ${token}`,
      };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch("/api/examples", {
          method: "POST",
          headers,
          body: JSON.stringify({ problem, images: imageUrls }), // Include problem and images
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.error || "Oops! Something went wrong while fetching an example. Let's try again!"
          );
        }
        const data = await res.json();
        if (!data || !data.problem) {
          throw new Error("No example response returned from xAI API");
        }

        set({ examples: data, step: "examples" });
        addMessage({
          role: "assistant",
          content: `<p><strong>Example:</strong> ${data.problem}</p><p><strong>Solution:</strong></p><ul>${data.solution
            .map((s: any) => `<li><strong>${s.title}:</strong> ${s.content}</li>`)
            .join("")}</ul>`,
          charts: data.charts,
          renderAs: "html",
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error("Oops! The request timed out. Please check your connection and try again!");
        }
        // Handle network errors explicitly
        if (err instanceof TypeError && err.message.includes("NetworkError")) {
          throw new Error(
            "Oops! We couldn't reach the server. Please check your internet connection and try again in a few moments."
          );
        }
        throw err; // Rethrow other errors
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Oops! Something went wrong while fetching an example. Please try again in a few moments.";
      console.error("Error in handleExamplesRequest:", err);
      // Add error as a message bubble instead of showing a dialog
      addMessage({
        role: "assistant",
        content: errorMsg,
        renderAs: "markdown",
      });
    } finally {
      set({ loading: false });
    }
  },
  handleQuizSubmit: async () => {
    const { problem, imageUrls, sessionId, addMessage, loading, sessionTerminated } = get();
    if (loading || sessionTerminated) return;
    set({ loading: true, step: "quizzes", validationError: null }); // Clear validation error on new quiz request
    try {
      if (!sessionId) throw new Error("No active session. Please start a new chat session.");
      addMessage({ role: "user", content: "Take a Quiz", renderAs: "markdown" });
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];
      if (!token) throw new Error("Failed to fetch quiz: Authentication required.");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-session-id": sessionId,
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers,
        body: "",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch quiz. Please try again.");
      set({ quiz: data, quizAnswer: "", quizFeedback: null, correctAnswer: null }); // Reset correctAnswer
      const quizHtml = formatQuizProblemMessage(data);
      addMessage({
        role: "assistant",
        content: quizHtml,
        charts: data.charts,
        renderAs: "html",
      });
    } catch (err: unknown) {
      let errorMsg: string;
      if (err instanceof Error) {
        if (err.message.includes("NetworkError")) {
          errorMsg = "Oops! We couldn't reach the server. Please check your internet connection and try again in a few moments.";
        } else {
          errorMsg = err.message; // Keep specific error messages for non-network errors
        }
      } else {
        errorMsg = "Oops! Something went wrong while fetching a quiz. Please try again in a few moments.";
      }
      console.error("Error in handleQuizSubmit:", err);
      // Add error as a message bubble and revert step to allow further actions
      addMessage({
        role: "assistant",
        content: errorMsg,
        renderAs: "markdown",
      });
      set({ step: "lesson", quiz: null }); // Revert to lesson step and clear quiz state
    } finally {
      set({ loading: false });
    }
  },
  handleValidate: async (answer, quiz) => {
    const { sessionId, addMessage, loading, sessionTerminated } = get();
    if (loading || sessionTerminated) return;
    set({ loading: true, validationError: null }); // Clear previous validation error
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];
      if (!token) throw new Error("Failed to validate quiz: Authentication required.");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-session-id": sessionId || "",
        Authorization: `Bearer ${token}`,
      };
      addMessage({ role: "user", content: answer, renderAs: "markdown" });
      const res = await fetch("/api/validate", {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, problem: quiz.problem, answer }),
      });
      const data = (await res.json()) as QuizFeedback;
      if (!res.ok) {
        const errorMsg = (data as any).error || "Failed to validate quiz";
        throw new Error(errorMsg);
      }
      // Update the quiz with the correct answer from the validate response
      const updatedQuiz = { ...quiz, correctAnswer: data.correctAnswer };
      addMessage({
        role: "assistant",
        content: formatQuizFeedbackMessage(updatedQuiz, answer, data),
        charts: data.charts,
        renderAs: "html",
      });
      set({
        quizAnswer: answer,
        quizFeedback: data,
        correctAnswer: data.correctAnswer,
        validationError: null, // Clear validation error on successful validation
      }); // Store correctAnswer and clear validation error
    } catch (err: unknown) {
      let errorMsg: string;
      if (err instanceof Error) {
        if (err.message.includes("NetworkError")) {
          errorMsg = "Oops! We couldn't reach the server. Please check your internet connection and try again in a few moments.";
        } else {
          errorMsg = err.message; // Keep specific error messages for non-network errors
        }
      } else {
        errorMsg = "Oops! Something went wrong while validating your quiz answer. Please try again in a few moments.";
      }
      console.error("Error in handleValidate:", err);
      // Add error as a message bubble and set validation error for UI
      addMessage({
        role: "assistant",
        content: errorMsg,
        renderAs: "markdown",
      });
      set({ validationError: errorMsg }); // Set validation error for UI display
    } finally {
      set({ loading: false });
    }
  },
});