// src/store/index.ts
import { create } from "zustand";
import { toast } from "sonner";

type Step = "problem" | "lesson" | "examples" | "quizzes" | "end";

export interface Quiz {
  problem: string;
  answerFormat: string;
  options: string[];
  correctAnswer?: string;
  difficulty: string;
  encouragement?: string | null;
  readiness?: { confidenceIfCorrect: number; confidenceIfIncorrect: number };
}

interface Example {
  problem: string;
  solution: { title: string; content: string }[];
}

interface QuizFeedback {
  isCorrect: boolean;
  commentary: string;
  solution: { title: string; content: string }[] | null;
  readiness: { confidenceIfCorrect: number; confidenceIfIncorrect: number };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  renderAs?: "markdown" | "html";
  experimental_attachments?: { name: string; url: string }[];
}

interface AppState {
  step: Step;
  sessionId: string | null;
  problem: string;
  images: File[];
  imageUrls: string[];
  lesson: string | null;
  examples: Example | null;
  quiz: Quiz | null;
  error: string | null;
  loading: boolean;
  quizAnswer: string;
  quizFeedback: QuizFeedback | null;
  messages: Message[];
  hasSubmittedProblem: boolean;
  sessionTerminated: boolean;
  showErrorPopup: boolean;
  set: (updates: Partial<AppState>) => void;
  setStep: (step: Step) => void;
  setError: (error: string | null) => void;
  addMessage: (message: Message) => void;
  handleSubmit: (problem: string, imageUrls: string[], images: File[]) => Promise<void>;
  handleExamplesRequest: () => Promise<void>;
  handleQuizSubmit: () => Promise<void>;
  handleValidate: (answer: string, quiz: Quiz) => Promise<void>;
  append: (message: Message, imageUrls: string[], images: File[]) => Promise<void>;
  reset: () => void;
}

const useAppStore = create<AppState>((set, get) => ({
  step: "problem",
  sessionId: null,
  problem: "",
  images: [],
  imageUrls: [],
  lesson: null,
  examples: null,
  quiz: null,
  error: null,
  loading: false,
  quizAnswer: "",
  quizFeedback: null,
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
    if (loading) {
      return; // Silently ignore duplicate requests
    }

    // Clear any previous error state
    set({ 
      loading: true, 
      problem, 
      imageUrls, 
      hasSubmittedProblem: true, 
      error: null, 
      showErrorPopup: false 
    });

    try {
      let uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("supabase-auth-token="))
          ?.split("=")[1];
        
        if (!token) {
          throw new Error("Failed to upload images: Authentication required.");
        }

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
      if (!token) {
        throw new Error("Failed to submit problem: Authentication required.");
      }

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
        // Check if the session should be terminated (e.g., non-K12 prompt)
        if (data.terminateSession) {
          set({
            error: data.error || "An error occurred",
            sessionTerminated: true,
            showErrorPopup: true,
            sessionId: null,
            step: "problem",
            lesson: null,
            examples: null,
            quiz: null,
            quizAnswer: "",
            quizFeedback: null,
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

      const lessonContent = await res.text(); // Response is now plain text (HTML)

      set({
        sessionId: res.headers.get("x-session-id") || sessionId,
        lesson: lessonContent,
        step: "lesson",
        sessionTerminated: false,
        showErrorPopup: false,
      });
      addMessage({ role: "assistant", content: lessonContent, renderAs: "html" });
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
        quiz: null,
        quizAnswer: "",
        quizFeedback: null,
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
  handleExamplesRequest: async () => {
    const { problem, imageUrls, sessionId, addMessage, loading, sessionTerminated } = get();
    if (loading || sessionTerminated) {
      return; // Prevent actions if session is terminated or loading
    }

    set({ loading: true });
    try {
      addMessage({ role: "user", content: "Request Example", renderAs: "markdown" });

      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];
      if (!token) {
        throw new Error("Failed to request examples: Authentication required.");
      }
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-session-id": sessionId || "",
        Authorization: `Bearer ${token}`,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000);

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

        const data = (await res.json()) as Example;

        set({ examples: data, step: "examples" });
        addMessage({
          role: "assistant",
          content: `<p><strong>Example:</strong> ${data.problem}</p><p><strong>Solution:</strong></p><ul>${data.solution
            .map((s) => `<li><strong>${s.title}:</strong> ${s.content}</li>`)
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
    if (loading || sessionTerminated) {
      return; // Prevent actions if session is terminated or loading
    }

    set({ loading: true, step: "quizzes" });
    try {
      if (!sessionId) {
        throw new Error("No active session. Please start a new chat session.");
      }

      addMessage({ role: "user", content: "Take a Quiz", renderAs: "markdown" });
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];
      if (!token) {
        throw new Error("Failed to fetch quiz: Authentication required.");
      }
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

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch quiz. Please try again.");
      }

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
    if (loading || sessionTerminated) {
      return; // Prevent actions if session is terminated or loading
    }

    set({ loading: true });
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];
      if (!token) {
        throw new Error("Failed to validate quiz: Authentication required.");
      }
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-session-id": sessionId || "",
        Authorization: `Bearer ${token}`,
      };

      // Add the user's quiz response as a chat message
      addMessage({
        role: "user",
        content: answer,
        renderAs: "markdown",
      });

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
      const readinessConfidence = isCorrect
        ? data.readiness.confidenceIfCorrect
        : data.readiness.confidenceIfIncorrect;
      const readinessPercentage = Math.round(readinessConfidence * 100);

      const motivationalMessage =
        readinessPercentage >= 90
          ? "You're doing amazing! You're very likely to ace your big test!"
          : readinessPercentage >= 70
          ? "Great progress! You're on track to do well on your big test. Keep practicing!"
          : readinessPercentage >= 50
          ? "You're making progress! Let's keep working to boost your confidence for the big test."
          : "Let's keep practicing! More effort will help you succeed on your big test.";

      // Add the feedback message
      addMessage({
        role: "assistant",
        content: `<p><strong>Feedback:</strong></p><p><strong>Your Answer:</strong> ${answer}</p><p>${
          data.commentary
        }</p>${
          data.solution
            ? `<p>${data.solution.map((s) => `<strong>${s.title}:</strong> ${s.content}`).join("</p><p>")}</p>`
            : ""
        }<p><strong>Options:</strong></p><ul>${quiz.options
          .map(
            (o) =>
              `<li>${o}${o === answer ? " (Your answer)" : ""}${
                o === quiz.correctAnswer ? " (Correct answer)" : ""
              }</li>`
          )
          .join("")}</ul><p><strong>Test Readiness:</strong></p><div class="readiness-container"><div class="readiness-bar" style="width: ${readinessPercentage}%"></div></div><p>${readinessPercentage}% - ${motivationalMessage}</p>`,
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
  append: async (msg, imageUrls, images) => {
    const { handleSubmit, loading, sessionTerminated } = get();
    if (loading || sessionTerminated) {
      return; // Prevent actions if session is terminated or loading
    }
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
      quiz: null,
      error: null,
      loading: false,
      quizAnswer: "",
      quizFeedback: null,
      messages: [],
      hasSubmittedProblem: false,
      sessionTerminated: false,
      showErrorPopup: false,
    }),
}));

export default useAppStore;