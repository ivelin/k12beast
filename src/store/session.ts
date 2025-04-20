// src/store/session.ts
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
  error: string | null;
  loading: boolean;
  messages: Message[];
  hasSubmittedProblem: boolean;
  sessionTerminated: boolean;
  showErrorPopup: boolean;
  set: (updates: Partial<SessionState>) => void;
  setStep: (step: Step) => void;
  setError: (error: string | null) => void;
  addMessage: (message: Message) => void;
  handleSubmit: (problem: string, imageUrls: string[], images: File[]) => Promise<void>;
  append: (message: Message, imageUrls: string[], images: File[]) => Promise<void>;
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
  error: null,
  loading: false,
  messages: [],
  hasSubmittedProblem: false,
  sessionTerminated: false,
  showErrorPopup: false,
  set: (updates) => set(updates),
  setStep: (step) => set({ step }),
  setError: (error) => set({ error }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  handleSubmit: async (problem, imageUrls, images) => {
    const { sessionId, addMessage, loading } = get();
    if (loading) return;
    set({ loading: true, problem, imageUrls, hasSubmittedProblem: true, error: null, showErrorPopup: false });
    try {
      let uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        const token = document.cookie.split("; ").find((row) => row.startsWith("supabase-auth-token="))?.split("=")[1];
        if (!token) throw new Error("Failed to upload images: Authentication required.");
        const headers: HeadersInit = { Authorization: `Bearer ${token}` };
        const formData = new FormData();
        images.forEach((image) => formData.append("files", image));
        const uploadResponse = await fetch("/api/upload-image", { method: "POST", headers, body: formData });
        if (!uploadResponse.ok) {
          const errorData = (await uploadResponse.json()) as { error: string };
          throw new Error(errorData.error || "Failed to upload images");
        }
        const uploadResult = (await uploadResponse.json()) as { success: boolean; files: { name: string; url: string }[] };
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
      const token = document.cookie.split("; ").find((row) => row.startsWith("supabase-auth-token="))?.split("=")[1];
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
        const data = await res.json();
        if (data.terminateSession) {
          set({
            error: data.error || "An error occurred",
            sessionTerminated: true,
            showErrorPopup: true,
            sessionId: null,
            step: "problem",
            lesson: null,
            examples: null,
            messages: [],
            hasSubmittedProblem: false,
            problem: "",
            imageUrls: [],
            images: [],
          });
          return;
        }
        throw new Error(data.error || "Failed to submit problem");
      }
      const lessonContent = await res.json() as Lesson;
      set({
        sessionId: res.headers.get("x-session-id") || sessionId,
        lesson: lessonContent.lesson,
        charts: lessonContent.charts,
        step: "lesson",
        sessionTerminated: false,
        showErrorPopup: false,
      });
      addMessage({ 
        role: "assistant", 
        content: lessonContent.lesson, 
        charts: lessonContent.charts, 
        renderAs: "html" 
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Oops! Something went wrong while starting your lesson. Let's try again!";
      console.error("Error in handleSubmit:", err);
      set({
        error: errorMsg,
        showErrorPopup: true,
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
  reset: () =>
    set({
      step: "problem",
      sessionId: null,
      problem: "",
      images: [],
      imageUrls: [],
      lesson: null,
      examples: null,
      error: null,
      loading: false,
      messages: [],
      hasSubmittedProblem: false,
      sessionTerminated: false,
      showErrorPopup: false,
    }),
});