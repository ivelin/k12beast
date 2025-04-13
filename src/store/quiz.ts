// src/store/quiz.ts
import { StateCreator } from "zustand";
import { toast } from "sonner";
import { AppState, Quiz, QuizFeedback, Message } from "./types";

export interface QuizState {
  quiz: Quiz | null;
  quizAnswer: string;
  quizFeedback: QuizFeedback | null;
  handleExamplesRequest: () => Promise<void>;
  handleQuizSubmit: () => Promise<void>;
  handleValidate: (answer: string, quiz: Quiz) => Promise<void>;
}

export const createQuizStore: StateCreator<AppState, [], [], QuizState> = (set, get) => ({
  quiz: null,
  quizAnswer: "",
  quizFeedback: null,
  handleExamplesRequest: async () => {
    const { problem, imageUrls, sessionId, addMessage, loading, sessionTerminated } = get();
    if (loading || sessionTerminated) return;
    set({ loading: true });
    try {
      addMessage({ role: "user", content: "Request Example", renderAs: "markdown" });
      const token = document.cookie.split("; ").find((row) => row.startsWith("supabase-auth-token="))?.split("=")[1];
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
          body: JSON.stringify({ problem, images: imageUrls }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Oops! Something went wrong while fetching an example. Let's try again!");
        }
        const data = await res.json();
        set({ examples: data, step: "examples" });
        addMessage({
          role: "assistant",
          content: `<p><strong>Example:</strong> ${data.problem}</p><p><strong>Solution:</strong></p><ul>${data.solution
            .map((s: any) => `<li><strong>${s.title}:</strong> ${s.content}</li>`)
            .join("")}</ul>`,
          renderAs: "html",
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error("Oops! The AI had a little glitch and was snoozing. Let's try again in a moment!");
        }
        throw err;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Oops! Something went wrong while fetching an example. Let's try again!";
      console.error("Error in handleExamplesRequest:", err);
      set({ error: errorMsg, showErrorPopup: true });
    } finally {
      set({ loading: false });
    }
  },
  handleQuizSubmit: async () => {
    const { problem, imageUrls, sessionId, addMessage, loading, sessionTerminated } = get();
    if (loading || sessionTerminated) return;
    set({ loading: true, step: "quizzes" });
    try {
      if (!sessionId) throw new Error("No active session. Please start a new chat session.");
      addMessage({ role: "user", content: "Take a Quiz", renderAs: "markdown" });
      const token = document.cookie.split("; ").find((row) => row.startsWith("supabase-auth-token="))?.split("=")[1];
      if (!token) throw new Error("Failed to fetch quiz: Authentication required.");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-session-id": sessionId,
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers,
        body: JSON.stringify({ problem, images: imageUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch quiz. Please try again.");
      set({ quiz: data, quizAnswer: "", quizFeedback: null });
      addMessage({
        role: "assistant",
        content: `<p><strong>Quiz:</strong></p><p>${data.problem}</p>`,
        renderAs: "html",
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch quiz. Please try again.";
      console.error("Error in handleQuizSubmit:", err);
      set({ error: errorMsg, showErrorPopup: true });
    } finally {
      set({ loading: false });
    }
  },
  handleValidate: async (answer, quiz) => {
    const { sessionId, addMessage, loading, sessionTerminated } = get();
    if (loading || sessionTerminated) return;
    set({ loading: true });
    try {
      const token = document.cookie.split("; ").find((row) => row.startsWith("supabase-auth-token="))?.split("=")[1];
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
      const isCorrect = data.isCorrect;
      const readiness = data.readiness;
      const readinessPercentage = Math.round(readiness * 100);
      const encouragement = data.encouragement;
      addMessage({
        role: "assistant",
        content: `<p><strong>Feedback:</strong></p><p><strong>Your Answer:</strong> ${answer}</p><p>${encouragement}</p>${
          data.solution
            ? `<p>${data.solution.map((s) => `<strong>${s.title}:</strong> ${s.content}`).join("</p><p>")}</p>`
            : ""
        }<p><strong>Options:</strong></p><ul>${quiz.options
          .map((o) => `<li>${o}${o === answer ? " (Your answer)" : ""}${o === quiz.correctAnswer ? " (Correct answer)" : ""}</li>`)
          .join("")}</ul><p><strong>Test Readiness:</strong></p><div class="readiness-container"><div class="readiness-bar" style="width: ${readinessPercentage}%"></div></div><p>${readinessPercentage}%</p>`,
        renderAs: "html",
      });
      set({ quizAnswer: answer, quizFeedback: data });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to validate quiz answer. Please try again.";
      console.error("Error in handleValidate:", err);
      set({ error: errorMsg, showErrorPopup: true });
    } finally {
      set({ loading: false });
    }
  },
});