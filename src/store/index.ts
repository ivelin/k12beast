// src/store/index.ts
import { create } from 'zustand';
import { toast } from 'sonner';

type Step = "problem" | "lesson" | "examples" | "quizzes" | "end";
interface AppState {
  step: Step;
  sessionId: string | null;
  problem: string;
  images: File[];
  imageUrls: string[];
  lesson: string | null;
  examples: any;
  quiz: any;
  error: string | null;
  loading: boolean;
  quizAnswer: string;
  quizFeedback: any;
  messages: Array<{ role: "user" | "assistant"; content: string; renderAs?: "markdown" | "html"; experimental_attachments?: { name: string; url: string }[] }>;
  hasSubmittedProblem: boolean;
  set: (updates: Partial<AppState>) => void;
  setStep: (step: Step) => void;
  addMessage: (message: { role: string; content: string; renderAs?: "markdown" | "html"; experimental_attachments?: { name: string; url: string }[] }) => void;
  handleSubmit: (problem: string, imageUrls: string[], images: File[]) => Promise<void>;
  handleExamplesRequest: () => Promise<void>;
  handleQuizSubmit: () => Promise<void>;
  handleValidate: (answer: string, quiz: any) => Promise<void>;
  append: (message: { role: string; content: string }, imageUrls: string[], images: File[]) => Promise<void>;
  reset: () => void;
}

const useAppStore = create<AppState>((set, get) => ({
  step: 'problem',
  sessionId: null,
  problem: '',
  images: [],
  imageUrls: [],
  lesson: null,
  examples: null,
  quiz: null,
  error: null,
  loading: false,
  quizAnswer: '',
  quizFeedback: null,
  messages: [],
  hasSubmittedProblem: false,
  set: (updates) => set(updates),
  setStep: (step) => set({ step }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  handleSubmit: async (problem, imageUrls, images) => {
    const { sessionId, addMessage } = get();
    set({ loading: true, problem, imageUrls, hasSubmittedProblem: true });

    try {
      // Upload images to Supabase Storage if there are any
      let uploadedImageUrls: string[] = [];
      if (images && images.length > 0) {
        const formData = new FormData();
        images.forEach((image) => {
          formData.append("files", image);
        });

        const token = document.cookie
          .split("; ")
          .find(row => row.startsWith("supabase-auth-token="))
          ?.split("=")[1];
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const uploadResponse = await fetch("/api/upload-image", {
          method: "POST",
          headers,
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Failed to upload images");
        }

        const uploadResult = await uploadResponse.json();
        uploadedImageUrls = uploadResult.files.map((file: { name: string; url: string }) => file.url);
        set({ imageUrls: uploadedImageUrls });
      }

      // Add the user message with attached images (using Supabase URLs) to the chat history
      addMessage({
        role: "user",
        content: problem,
        renderAs: "markdown",
        experimental_attachments: uploadedImageUrls.map((url, index) => ({
          name: images[index]?.name || `Image ${index + 1}`,
          url,
        })),
      });

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-session-id": sessionId || "",
      };
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/tutor", {
        method: "POST",
        headers,
        body: JSON.stringify({ problem, images: uploadedImageUrls }),
      });

      const lessonContent = await res.text();

      set({
        sessionId: res.headers.get("x-session-id") || sessionId,
        lesson: lessonContent,
        step: "lesson",
      });
      addMessage({ role: "assistant", content: lessonContent, renderAs: "html" });
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      const errorMsg = err.message || "Failed to fetch lesson";
      set({ error: errorMsg });
      toast.error(errorMsg);
    } finally {
      set({ loading: false });
    }
  },
  handleExamplesRequest: async () => {
    const { problem, imageUrls, sessionId, addMessage } = get();
    set({ loading: true });
    try {
      addMessage({ role: "user", content: "Request Example", renderAs: "markdown" });
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-session-id": sessionId || "",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/examples", {
        method: "POST",
        headers,
        body: JSON.stringify({ problem, images: imageUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch examples");
      set({ examples: data, step: "examples" });
      addMessage({
        role: "assistant",
        content: `<p><strong>Example:</strong> ${data.problem}</p><p><strong>Solution:</strong></p><ul>${data.solution.map((s: any) => `<li><strong>${s.title}:</strong> ${s.content}</li>`).join("")}</ul>`,
        renderAs: "html",
      });
    } catch (err) {
      set({ error: err.message || "Failed to fetch examples" });
    } finally {
      set({ loading: false });
    }
  },
  handleQuizSubmit: async () => {
    const { problem, imageUrls, sessionId, addMessage } = get();
    set({ loading: true, step: "quizzes" });
    try {
      addMessage({ role: "user", content: "Take a Quiz", renderAs: "markdown" });
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-session-id": sessionId || "",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers,
        body: JSON.stringify({ problem, images: imageUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch quiz");
      set({ quiz: data, quizAnswer: '', quizFeedback: null });
      addMessage({
        role: "assistant",
        content: `<p><strong>Quiz:</strong></p><p>${data.problem}</p><ul>${data.options.map((o: string) => `<li>${o}</li>`).join("")}</ul>`,
        renderAs: "html",
      });
    } catch (err) {
      set({ error: err.message || "Failed to fetch quiz" });
    } finally {
      set({ loading: false });
    }
  },
  handleValidate: async (answer, quiz) => {
    const { sessionId, addMessage } = get();
    set({ loading: true });
    try {
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("supabase-auth-token="))
        ?.split("=")[1];
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-session-id": sessionId || "",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/validate", {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, problem: quiz.problem, answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to validate quiz");

      const isCorrect = answer === quiz.correctAnswer;
      const readinessConfidence = isCorrect
        ? quiz.readiness.confidenceIfCorrect
        : quiz.readiness.confidenceIfIncorrect;
      const readinessPercentage = Math.round(readinessConfidence * 100);

      let motivationalMessage = "";
      if (readinessPercentage >= 90) {
        motivationalMessage = "You're doing amazing! You're very likely to ace your big test!";
      } else if (readinessPercentage >= 70) {
        motivationalMessage = "Great progress! You're on track to do well on your big test. Keep practicing!";
      } else if (readinessPercentage >= 50) {
        motivationalMessage = "You're making progress! Let's keep working to boost your confidence for the big test.";
      } else {
        motivationalMessage = "Let's keep practicing! More effort will help you succeed on your big test.";
      }

      set({ quizAnswer: answer, quizFeedback: data });
      addMessage({
        role: "assistant",
        content: `<p><strong>Feedback:</strong></p><p><strong>Your Answer:</strong> ${answer}</p><p>${data.commentary}</p>${data.solution ? `<p>${data.solution.map((s: any) => `<strong>${s.title}:</strong> ${s.content}`).join("</p><p>")}</p>` : ""}<p><strong>Options:</strong></p><ul>${quiz.options.map((o: string) => `<li>${o}${o === answer ? " (Your answer)" : ""}${o === quiz.correctAnswer ? " (Correct answer)" : ""}</li>`).join("")}</ul><p><strong>Test Readiness:</strong></p><div class="readiness-container"><div class="readiness-bar" style="width: ${readinessPercentage}%"></div></div><p>${readinessPercentage}% - ${motivationalMessage}</p>`,
        renderAs: "html",
      });
    } catch (err) {
      set({ error: err.message || "Failed to validate quiz" });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
  append: async (msg, imageUrls, images) => {
    const { handleSubmit } = get();
    await handleSubmit(msg.content, imageUrls, images);
  },
  reset: () => set({
    step: 'problem', sessionId: null, problem: '', images: [], imageUrls: [],
    lesson: null, examples: null, quiz: null, error: null,
    loading: false, quizAnswer: '', quizFeedback: null, messages: [],
    hasSubmittedProblem: false,
  }),
}));

export default useAppStore;