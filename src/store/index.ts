// src/store/index.ts
import { create } from 'zustand';

interface AppState {
  step: string;
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
  quizIsCorrect: boolean | null;
  quizCommentary: string;
  quizSolution: any;
  quizFeedback: any;
  setStep: (step: string) => void;
  setSessionId: (sessionId: string | null) => void;
  setProblem: (problem: string) => void;
  setImages: (images: File[]) => void;
  setImageUrls: (imageUrls: string[]) => void;
  setLesson: (lesson: string | null) => void;
  setExamples: (examples: any) => void;
  setQuiz: (quiz: any) => void;
  setShareableLink: (shareableLink: string | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  handleExamplesRequest: () => Promise<void>;
  handleQuizSubmit: () => Promise<void>;
  handleValidate: (answer: string, quiz: any) => Promise<void>;
  handleEndSession: () => Promise<void>;
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
  quizIsCorrect: null,
  quizCommentary: '',
  quizSolution: null,
  quizFeedback: null,
  setStep: (step) => set({ step }),
  setSessionId: (sessionId) => set({ sessionId }),
  setProblem: (problem) => set({ problem }),
  setImages: (images) => set({ images }),
  setImageUrls: (imageUrls) => set({ imageUrls }),
  setLesson: (lesson) => set({ lesson }),
  setExamples: (examples) => set({ examples }),
  setQuiz: (quiz) => set({ quiz }),
  setShareableLink: (shareableLink) => set({ shareableLink }),
  setError: (error) => set({ error }),
  setLoading: (loading) => set({ loading }),
  handleExamplesRequest: async () => {
    const { problem, imageUrls, sessionId, setExamples, setError, setLoading } = get();
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
    } catch (err) {
      setError(err.message || "Failed to fetch examples. Please try again.");
    } finally {
      setLoading(false);
    }
  },
  handleQuizSubmit: async () => {
    const { problem, imageUrls, sessionId, setQuiz, setError, setLoading } = get();
    try {
      if (!problem && imageUrls.length === 0) {
        throw new Error("Please enter a problem or upload an image before requesting a quiz.");
      }
      setLoading(true);
      set({ step: "quizzes" }); // Ensure step is set to "quizzes"
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
      set({ quizAnswer: '', quizIsCorrect: null, quizCommentary: '', quizSolution: null, quizFeedback: null });
    } catch (err) {
      setError(err.message || "Failed to fetch quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  },
  handleValidate: async (answer: string, quiz: any) => {
    const { sessionId, setStep, setError, setLoading } = get();
    try {
      if (!answer) {
        throw new Error("Please select an option before validating.");
      }
      setLoading(true);
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "",
        },
        body: JSON.stringify({
          sessionId,
          problem: quiz.problem,
          answer,
          isCorrect: answer === quiz.correctAnswer,
          commentary: answer === quiz.correctAnswer
            ? "<p>Great job! You got it right!</p>"
            : `<p>Not quite. The correct answer is ${quiz.correctAnswer}.</p>`,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to validate quiz");
      }
      set({
        quizIsCorrect: data.isCorrect,
        quizCommentary: data.commentary,
        quizSolution: data.solution,
        quizFeedback: { isCorrect: data.isCorrect, commentary: data.commentary },
      });
      setStep("end");
    } catch (err) {
      setError(err.message || "Failed to validate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  },
  handleEndSession: async () => {
    const { sessionId, setShareableLink, setError } = get();
    try {
      const response = await fetch("/api/end-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "",
        },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to end session");
      }
      setShareableLink(data.shareableLink);
    } catch (err) {
      setError("Failed to end session. Please try again.");
    }
  },
  reset: () =>
    set({
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
      quizIsCorrect: null,
      quizCommentary: '',
      quizSolution: null,
      quizFeedback: null,
    }),
}));

export default useAppStore;