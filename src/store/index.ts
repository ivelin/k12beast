// src/store/index.ts
import { create } from 'zustand';

interface AppState {
  step: "problem" | "lesson" | "examples" | "quizzes" | "end";
  sessionId: string | null;
  problem: string;
  submittedProblem: string | null;
  images: File[];
  imageUrls: string[];
  lesson: string | null;
  examples: any;
  quiz: any;
  shareableLink: string | null;
  error: string | null;
  loading: boolean;
  quizAnswer: string;
  quizIsCorrect: boolean | null;
  quizCommentary: string;
  quizFeedback: any;
  hasSubmittedProblem: boolean;
  sessionEnded: boolean;
  messages: any[]; // Add messages to the store
  setStep: (step: string) => void;
  setSessionId: (sessionId: string | null) => void;
  setProblem: (problem: string) => void;
  setSubmittedProblem: (problem: string | null) => void;
  setImages: (images: File[]) => void;
  setImageUrls: (imageUrls: string[]) => void;
  setLesson: (lesson: string | null) => void;
  setExamples: (examples: any) => void;
  setQuiz: (quiz: any) => void;
  setShareableLink: (shareableLink: string | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setHasSubmittedProblem: (hasSubmitted: boolean) => void;
  setSessionEnded: (ended: boolean) => void;
  addMessage: (message: { role: string; content: string }) => void; // Action to add a message
  handleExamplesRequest: () => Promise<void>;
  handleQuizSubmit: () => Promise<void>;
  handleValidate: (answer: string, quiz: any) => Promise<void>;
  handleEndSession: () => Promise<void>;
  handleSubmit: (problem: string, imageUrls: string[]) => Promise<void>; // New action for submission
  append: (message: { role: string; content: string }, imageUrls: string[]) => Promise<void>; // New action for appending
  reset: () => void;
}

const useAppStore = create<AppState>((set, get) => ({
  step: 'problem',
  sessionId: null,
  problem: '',
  submittedProblem: null,
  images: [],
  imageUrls: [],
  lesson: null,
  examples: null,
  quiz: null,
  shareableLink: null,
  error: null,
  loading: false,
  quizAnswer: '',
  quizIsCorrect: null,
  quizCommentary: '',
  quizFeedback: null,
  hasSubmittedProblem: false,
  sessionEnded: false,
  messages: [], // Initialize messages in the store
  setStep: (step) => set({ step }),
  setSessionId: (sessionId) => set({ sessionId }),
  setProblem: (problem) => set({ problem }),
  setSubmittedProblem: (problem) => set({ submittedProblem: problem }),
  setImages: (images) => set({ images }),
  setImageUrls: (imageUrls) => set({ imageUrls }),
  setLesson: (lesson) => set({ lesson, hasSubmittedProblem: true }),
  setExamples: (examples) => set({ examples }),
  setQuiz: (quiz) => set({ quiz }),
  setShareableLink: (shareableLink) => set({ shareableLink }),
  setError: (error) => set({ error }),
  setLoading: (loading) => set({ loading }),
  setHasSubmittedProblem: (hasSubmitted) => set({ hasSubmittedProblem: hasSubmitted }),
  setSessionEnded: (ended) => set({ sessionEnded: ended }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  handleExamplesRequest: async () => {
    const { problem, imageUrls, sessionId, setExamples, setError, setLoading, addMessage } = get();
    try {
      if (!problem && imageUrls.length === 0) {
        throw new Error("Please enter a problem or upload an image.");
      }
      setLoading(true);
      const response = await fetch("/api/examples", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "",
        },
        body: JSON.stringify({ problem, images: imageUrls }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch examples");
      }
      setExamples(data);
      addMessage({
        role: "assistant",
        content: `**New Example:**\n\n**Problem:** ${data.problem}\n\n${data.solution
          .map((step: any) => `**${step.title}:** ${step.content}`)
          .join("\n\n")}`,
      });
      set({ step: "examples" });
    } catch (err) {
      setError(err.message || "Failed to fetch examples. Please try again.");
    } finally {
      setLoading(false);
    }
  },
  handleQuizSubmit: async () => {
    const { problem, imageUrls, sessionId, setQuiz, setError, setLoading, addMessage } = get();
    try {
      if (!problem && imageUrls.length === 0) {
        throw new Error("Please enter a problem or upload an image before requesting a quizz.");
      }
      setLoading(true);
      set({ step: "quizzes" });
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "",
        },
        body: JSON.stringify({ problem, images: imageUrls }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch quiz");
      }
      setQuiz(data);
      addMessage({
        role: "assistant",
        content: `**Quiz:**\n\n${data.problem}\n\n${data.options
          .map((option: string) => `- [ ] ${option}`)
          .join("\n")}`,
      });
      set({ quizAnswer: '', quizIsCorrect: null, quizCommentary: '', quizFeedback: null });
    } catch (err) {
      setError(err.message || "Failed to fetch quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  },
  handleValidate: async (answer: string, quiz: any) => {
    const { sessionId, setError, setLoading, addMessage } = get();
    try {
      if (!answer) {
        throw new Error("Please select an option before validating.");
      }
      if (!sessionId) {
        throw new Error("Session ID is missing.");
      }
      if (!quiz || !quiz.problem) {
        throw new Error("Quiz problem is missing.");
      }
      setLoading(true);
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          sessionId,
          problem: quiz.problem,
          answer,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("Validation failed with response:", data);
        throw new Error(data.error || "Failed to validate quiz");
      }
      set({
        quizIsCorrect: data.isCorrect,
        quizCommentary: data.commentary,
        quizFeedback: {
          isCorrect: data.isCorrect,
          commentary: data.commentary,
          solution: data.solution || null,
        },
      });
      addMessage({
        role: "assistant",
        content: `**Feedback:**\n\n${data.commentary}${
          data.solution
            ? `\n\n${data.solution
                .map((step: any) => `**${step.title}:** ${step.content}`)
                .join("\n\n")}`
            : ""
        }`,
      });
    } catch (err) {
      console.error("Error in handleValidate:", err);
      setError(err.message || "Failed to validate quiz. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  },
  handleEndSession: async () => {
    const { sessionId, setShareableLink, setError, setSessionEnded } = get();
    try {
      if (!sessionId) {
        throw new Error("Session ID is missing.");
      }
      const response = await fetch("/api/end-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to end session");
      }
      setShareableLink(data.shareableLink);
      setSessionEnded(true);
    } catch (err) {
      setError("Failed to end session. Please try again.");
    }
  },
  handleSubmit: async (problem: string, imageUrls: string[]) => {
    const { sessionId, setLesson, setStep, setError, setLoading, setSubmittedProblem, addMessage } = get();
    try {
      if (!problem) {
        throw new Error("Please enter a problem.");
      }
      setLoading(true);
      setSubmittedProblem(problem);
      addMessage({ role: "user", content: problem });
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "",
        },
        body: JSON.stringify({ problem, images: imageUrls }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch tutor lesson");
      const newSessionId = response.headers.get("x-session-id");
      if (newSessionId) set({ sessionId: newSessionId });
      let lessonContent = data.lesson;
      try {
        const parsed = JSON.parse(data.lesson);
        if (parsed.isK12 && parsed.lesson) {
          lessonContent = parsed.lesson;
        } else {
          throw new Error("Invalid lesson format");
        }
      } catch (err) {
        console.warn("Failed to parse lesson JSON, using raw content:", data.lesson);
      }
      setLesson(data.lesson);
      addMessage({ role: "assistant", content: lessonContent });
      setStep("examples");
    } catch (err) {
      setError(err.message || "Failed to fetch tutor lesson.");
    } finally {
      setLoading(false);
    }
  },
  append: async (message: { role: string; content: string }, imageUrls: string[]) => {
    const { setProblem, setSubmittedProblem, setLesson, setStep, setError, setLoading, addMessage } = get();
    setProblem(message.content);
    setSubmittedProblem(message.content);
    addMessage(message);
    setLoading(true);
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": get().sessionId || "",
        },
        body: JSON.stringify({ problem: message.content, images: imageUrls }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch tutor lesson");
      const newSessionId = response.headers.get("x-session-id");
      if (newSessionId) set({ sessionId: newSessionId });
      let lessonContent = data.lesson;
      try {
        const parsed = JSON.parse(data.lesson);
        if (parsed.isK12 && parsed.lesson) {
          lessonContent = parsed.lesson;
        } else {
          throw new Error("Invalid lesson format");
        }
      } catch (err) {
        console.warn("Failed to parse lesson JSON, using raw content:", data.lesson);
      }
      setLesson(data.lesson);
      addMessage({ role: "assistant", content: lessonContent });
      setStep("examples");
    } catch (err) {
      setError(err.message || "Failed to fetch tutor lesson.");
    } finally {
      setLoading(false);
    }
  },
  reset: () =>
    set({
      step: 'problem',
      sessionId: null,
      problem: '',
      submittedProblem: null,
      images: [],
      imageUrls: [],
      lesson: null,
      examples: null,
      quiz: null,
      shareableLink: null,
      error: null,
      loading: false,
      quizAnswer: '',
      quizIsCorrect: null,
      quizCommentary: '',
      quizFeedback: null,
      hasSubmittedProblem: false,
      sessionEnded: false,
      messages: [], // Reset messages
    }),
}));

export default useAppStore;