// File path: src/store/session.ts
// Manages session-related state and actions for K12Beast, including problem submission and retries
// Updated to handle non-K12 responses by terminating the session and providing a clear call-to-action
// Improved error handling to avoid misinterpreting non-401 errors as session expirations
// Added handling for image-only submissions by providing a default problem text

import { StateCreator } from "zustand";
import { AppState, Step, Example, Message, Lesson } from "./types";

export interface SessionState {
  step: Step;
  sessionId: string | null;
  problem: string;
  images: File[];
  imageUrls: string[];
  lesson: string | null;
  examples: Example | null;
  sessionError: string | null;
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
  sessionError: null,
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

    // Handle image-only submissions by providing a default problem text
    const effectiveProblem = problem.trim() || "Please explain the concept shown in the attached image.";

    set({
      loading: true,
      problem: effectiveProblem,
      imageUrls,
      hasSubmittedProblem: true,
      sessionError: null,
      lastFailedProblem: effectiveProblem,
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

        // Validate content-type before parsing
        const uploadContentType = uploadResponse.headers.get("content-type");
        if (!uploadContentType || !uploadContentType.includes("application/json")) {
          throw new Error("Received non-JSON response from the server during image upload.");
        }

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
        content: effectiveProblem,
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
        body: JSON.stringify({ problem: effectiveProblem, images: uploadedImageUrls }),
      });

      // Validate content-type before parsing (for both success and error cases)
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from the server during problem submission.");
      }

      if (!res.ok) {
        let errorData: { error?: string; terminateSession?: boolean };
        try {
          errorData = await res.json();
        } catch (jsonError) {
          throw new Error(`Network error: Received status ${res.status} with invalid JSON response`);
        }
        if (res.status === 401 || errorData.terminateSession) {
          console.log("Session termination triggered, resetting state");
          set({
            sessionError: errorData.error || "Your session has expired. Please log back in to continue.",
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
            content: errorData.error || "Your session has expired. Please log back in to continue.",
            renderAs: "markdown",
          });
          window.dispatchEvent(
            new CustomEvent("supabase:auth", {
              detail: { event: "SIGNED_OUT", session: null },
            })
          );
          return;
        }
        throw new Error(errorData.error || `Failed to submit problem: HTTP ${res.status}`);
      }

      const responseData = await res.json();

      // Check if the response indicates a non-K12 prompt
      if (!responseData.isK12) {
        set({
          sessionTerminated: true,
          sessionError: responseData.error,
          step: "problem",
          lesson: null,
          examples: null,
          lastFailedProblem: null,
          lastFailedImages: [],
        });
        addMessage({
          role: "assistant",
          content: `
            <p>🤔 ${responseData.error}</p>
            <p>Please start a new chat and try a K12-related problem, like a math or science question! 📚</p>
          `,
          renderAs: "html",
        });
        return;
      }

      // Handle successful K12-related response
      const lessonContent = responseData as Lesson;
      set({
        sessionId: res.headers.get("x-session-id") || sessionId,
        lesson: lessonContent.lesson,
        charts: lessonContent.charts,
        step: "lesson",
        sessionTerminated: false,
        sessionError: null,
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
        if (
          (err.message.includes("NetworkError") ||
            err.message.includes("Failed to fetch") ||
            err.message.match(/^(4|5)\d{2}/) ||
            err.message.includes("Service Unavailable") ||
            err.message.includes("Too Many Requests") ||
            err.message.includes("invalid JSON response") ||
            err.message.includes("non-JSON response")) &&
          !err.message.includes("K12-related")
        ) {
          errorMsg = "Oops! We couldn't reach the server. Please try again in a few moments. If the issue persists, start a new chat.";
          isRetryable = true;
        } else {
          errorMsg = err.message;
        }
      } else {
        errorMsg = "Oops! Something went wrong while starting your lesson. Please try again in a few moments. If the issue persists, start a new chat.";
        isRetryable = true;
      }
      console.error("Error in handleSubmit:", err);
      set({
        sessionError: isRetryable ? errorMsg : null,
        sessionTerminated: !isRetryable,
        hasSubmittedProblem: !isRetryable,
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
    if (lastFailedProblem === null || !sessionError) return;
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