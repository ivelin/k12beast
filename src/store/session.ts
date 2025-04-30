// File path: src/store/session.ts
// Manages session-related state and actions for K12Beast, including problem submission and retries
// Updated to use sessionError and message bubbles for consistent error handling
// Added dispatch of supabase:auth event on session termination
// Updated to treat all 400+ and 500+ errors as retryable, except specific non-retryable cases
// Updated to treat "Failed to fetch" errors as retryable for timeouts
// Updated to handle invalid JSON responses as retryable network errors

import { StateCreator } from "zustand";
import { toast } from "sonner";
import { AppState, Step, Example, Message, Lesson } from "./types";

export interface SessionState {
  step: Step;
  sessionId: string | null;
  problem: string;
  images: File[];
  imageUrls: string[];
  lesson: string | null;
  examples: Example | null;
  sessionError: string | null; // Tracks session-related errors for UI display
  loading: boolean;
  messages: Message[];
  hasSubmittedProblem: boolean;
  sessionTerminated: boolean;
  lastFailedProblem: string | null;
  lastFailedImages: File[];
  set: (updates: Partial<SessionState>) => void;
  setStep: (step: Step) => void;
  addMessage: (message: Message) => void;
  handleSubmit: (problem: string, imageUrls: string[], images: File[]) => Promise<void>;
  append: (message: Message, imageUrls: string[], images: File[]) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

export const createSessionStore: StateCreator<AppState, [], [], SessionState> = (set, get) => ({
  step: "problem",
  sessionId: null,
  problem: "",
  images: [],
  imageUrls: [],
  lesson: null,
  examples: null,
  sessionError: null, // Initialize session error
  loading: false,
  messages: [],
  hasSubmittedProblem: false,
  sessionTerminated: false,
  lastFailedProblem: null,
  lastFailedImages: [],
  set: (updates) => set(updates),
  setStep: (step) => set({ step }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  handleSubmit: async (problem, imageUrls, images) => {
    const { sessionId, addMessage, loading } = get();
    if (loading) return;
    set({
      loading: true,
      problem,
      imageUrls,
      hasSubmittedProblem: true,
      sessionError: null, // Clear previous session error
      lastFailedProblem: problem,
      lastFailedImages: images,
    });
    try {
      let uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("supabase-auth-token="))
          ?.split("=")[1];
        if (!token) throw new Error("Failed to upload images: Authentication required.");
        const headers: HeadersInit = { Authorization: `Bearer ${token}` };
        const formData = new FormData();
        images.forEach((image) => formData.append("files", image));
        const uploadResponse = await fetch("/api/upload-image", {
          method: "POST",
          headers,
          body: formData,
        });
        if (!uploadResponse.ok) {
          const errorData = (await uploadResponse.json()) as { error: string };
          throw new Error(errorData.error || "Failed to upload images");
        }
        const uploadResult = (await uploadResponse.json()) as {
          success: boolean;
          files: { name: string; url: string }[];
        };
        uploadedImageUrls = uploadResult.files.map((file) => file.url);
        set({ imageUrls: uploadedImageUrls });
      }
      addMessage({
        role: "user",
        content: problem,
        renderAs: "markdown",
        experimental_attachments: uploadedImageUrls.map((i, idx) => ({
          name: images[idx]?.name || `Image ${idx + 1}`,
          url: uploadedImageUrls[idx],
        })),
      });
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];
      if (!token) throw new Error("Failed to submit problem: Authentication required.");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-session-id": sessionId || "",
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers,
        body: JSON.stringify({ problem, images: uploadedImageUrls }),
      });
      if (!res.ok) {
        let errorData: { error?: string; terminateSession?: boolean };
        try {
          errorData = await res.json();
        } catch (jsonError) {
          // If JSON parsing fails, treat as a retryable network error
          throw new Error(`Network error: Received status ${res.status} with invalid JSON response`);
        }
        if (errorData.terminateSession) {
          console.log("Session termination triggered, resetting state");
          set({
            sessionError: errorData.error || "An error occurred. Session terminated.",
            sessionTerminated: true,
            sessionId: null,
            step: "problem",
            lesson: null,
            examples: null,
            messages: [],
            hasSubmittedProblem: false,
            problem: "",
            imageUrls: [],
            images: [],
            lastFailedProblem: null,
            lastFailedImages: [],
          });
          addMessage({
            role: "assistant",
            content: errorData.error || "An error occurred. Session terminated.",
            renderAs: "markdown",
          });
          // Dispatch a supabase:auth event to trigger session expiration in layout.tsx
          window.dispatchEvent(
            new CustomEvent("supabase:auth", {
              detail: { event: "SIGNED_OUT", session: null },
            })
          );
          return;
        }
        throw new Error(errorData.error || `Failed to submit problem: HTTP ${res.status}`);
      }
      const lessonContent = (await res.json()) as Lesson;
      set({
        sessionId: res.headers.get("x-session-id") || sessionId,
        lesson: lessonContent.lesson,
        charts: lessonContent.charts,
        step: "lesson",
        sessionTerminated: false,
        sessionError: null, // Clear session error on success
        lastFailedProblem: null,
        lastFailedImages: [],
      });
      addMessage({
        role: "assistant",
        content: lessonContent.lesson,
        charts: lessonContent.charts,
        renderAs: "html",
      });
    } catch (err: unknown) {
      let errorMsg: string;
      let isRetryable = false;
      if (err instanceof Error) {
        // Treat all 400+ and 500+ errors, NetworkError, "Failed to fetch", and invalid JSON responses as retryable, except specific non-retryable cases
        if (
          (err.message.includes("NetworkError") ||
            err.message.includes("Failed to fetch") ||
            err.message.match(/^(4|5)\d{2}/) ||
            err.message.includes("Service Unavailable") ||
            err.message.includes("Too Many Requests") ||
            err.message.includes("invalid JSON response")) &&
          !err.message.includes("K12-related")
        ) {
          errorMsg = "Oops! We couldn't reach the server. Please try again in a few moments. If the issue persists, start a new chat.";
          isRetryable = true;
        } else {
          errorMsg = err.message; // Keep specific error messages for non-retryable errors
        }
      } else {
        errorMsg = "Oops! Something went wrong while starting your lesson. Please try again in a few moments. If the issue persists, start a new chat.";
        isRetryable = true;
      }
      console.error("Error in handleSubmit:", err);
      set({
        sessionError: isRetryable ? errorMsg : null, // Set sessionError for retryable errors
        sessionTerminated: !isRetryable, // Terminate session only for non-retryable errors
        hasSubmittedProblem: !isRetryable, // Keep hasSubmittedProblem false for retryable errors to show input
      });
      addMessage({
        role: "assistant",
        content: errorMsg,
        renderAs: "markdown",
      });
    } finally {
      set({ loading: false });
    }
  },
  append: async (msg, imageUrls, images) => {
    const { handleSubmit, loading, sessionTerminated } = get();
    if (loading || sessionTerminated) return;
    await handleSubmit(msg.content, imageUrls, images);
  },
  retry: async () => {
    const { lastFailedProblem, lastFailedImages, sessionError, handleSubmit } = get();
    if (lastFailedProblem === null || !sessionError) return; // Retry only if there's a sessionError (retryable)
    set({ sessionError: null });
    await handleSubmit(lastFailedProblem, [], lastFailedImages);
  },
  reset: () =>
    set({
      step: "problem",
      sessionId: null,
      problem: "",
      images: [],
      imageUrls: [],
      lesson: null,
      examples: null,
      sessionError: null,
      loading: false,
      messages: [],
      hasSubmittedProblem: false,
      sessionTerminated: false,
      lastFailedProblem: null,
      lastFailedImages: [],
    }),
});