// src/store/index.ts
import { create } from 'zustand';

type Step = "problem" | "lesson" | "examples" | "quizzes" | "end" | "share";
interface AppState {
  step: Step;
  sessionId: string | null;
  problem: string;
  images: File[];
  imageUrls: string[];
  lesson: string | null;
  examples: any;
  quiz: any;
  shareableLink: string | null;
  error: string | null;
  loading: boolean;
  quizAnswer: string;
  quizFeedback: any;
  messages: Array<{ role: "user" | "assistant"; content: string; renderAs?: "markdown" | "html" }>;
  set: (updates: Partial<AppState>) => void;
  setStep: (step: Step) => void;
  addMessage: (message: { role: string; content: string; renderAs?: "markdown" | "html" }) => void;
  handleSubmit: (problem: string, imageUrls: string[]) => Promise<void>;
  handleExamplesRequest: () => Promise<void>;
  handleQuizSubmit: () => Promise<void>;
  handleValidate: (answer: string, quiz: any) => Promise<void>;
  handleEndSession: () => Promise<void>;
  append: (message: { role: string; content: string }, imageUrls: string[]) => Promise<void>;
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
  shareableLink: null,
  error: null,
  loading: false,
  quizAnswer: '',
  quizFeedback: null,
  messages: [],
  set: (updates) => set(updates),
  setStep: (step) => set({ step }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  handleSubmit: async (problem, imageUrls) => {
    const { sessionId, addMessage } = get();
    set({ loading: true, problem, imageUrls });
    try {
      addMessage({ role: "user", content: problem });
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId || "" },
        body: JSON.stringify({ problem, images: imageUrls }),
      });

      // Extract the content string from the nested structure
      const contentString = await res.text();

      // Update the state with the lesson content and proceed to the lesson step
      set({
        sessionId: res.headers.get("x-session-id") || sessionId,
        lesson: contentString,
        step: "lesson",
      });
      addMessage({ role: "assistant", content: contentString, renderAs: "html" });
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      set({ error: err.message || "Failed to fetch lesson" });
    } finally {
      set({ loading: false });
    }
  },
  handleExamplesRequest: async () => {
    const { problem, imageUrls, sessionId, addMessage } = get();
    set({ loading: true });
    try {
      addMessage({ role: "user", content: "Request Example" });
      const res = await fetch("/api/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId || "" },
        body: JSON.stringify({ problem, images: imageUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch examples");
      set({ examples: data, step: "examples" });
      addMessage({
        role: "assistant",
        content: `**Example:**\n\n${data.problem}\n\n${data.solution.map((s: any) => `**${s.title}:** ${s.content}`).join("\n\n")}`,
      });
    } catch (err) {
      set({ error: err.message || "Failed to fetch examples" });
    } finally {
      set({ loading: false });
    }
  },
  handleQuizSubmit: async () => {
    const { problem, imageUrls, sessionId, messages, addMessage } = get();
    set({ loading: true, step: "quizzes" });
    try {
      addMessage({ role: "user", content: "Take a Quiz" });
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId || "" },
        body: JSON.stringify({ problem, images: imageUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch quiz");
      set({ quiz: data, quizAnswer: '', quizFeedback: null });
      addMessage({
        role: "assistant",
        content: `<strong>Quiz:</strong><br>${data.problem}<br><ul>${data.options.map((o: string) => `<li>${o}</li>`).join("")}</ul>`,
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
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId || "" },
        body: JSON.stringify({ sessionId, problem: quiz.problem, answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to validate quiz");
      set({ quizAnswer: answer, quizFeedback: data });
      // Since QuizSection will add the feedback message via onQuizUpdate, we can skip adding it here
      // But for consistency, we'll ensure any fallback message is rendered as HTML
      addMessage({
        role: "assistant",
        content: `<strong>Feedback:</strong><br>${data.commentary}${data.solution ? `<br><br>${data.solution.map((s: any) => `<strong>${s.title}:</strong> ${s.content}`).join("<br><br>")}` : ""}`,
        renderAs: "html",
      });
    } catch (err) {
      set({ error: err.message || "Failed to validate quiz" });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
  handleEndSession: async () => {
    const { sessionId, addMessage } = get();
    try {
      addMessage({ role: "user", content: "End Session" });
      const res = await fetch("/api/end-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId || "" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to end session");
      set({ shareableLink: data.shareableLink, step: "share" });
      addMessage({ role: "assistant", content: "**Session Ended:** Saved." });
    } catch (err) {
      set({ error: "Failed to end session" });
    }
  },
  append: async (msg, imageUrls) => {
    const { handleSubmit } = get();
    await handleSubmit(msg.content, imageUrls);
  },
  reset: () => set({
    step: 'problem', sessionId: null, problem: '', images: [], imageUrls: [],
    lesson: null, examples: null, quiz: null, shareableLink: null, error: null,
    loading: false, quizAnswer: '', quizFeedback: null, messages: [],
  }),
}));

export default useAppStore;