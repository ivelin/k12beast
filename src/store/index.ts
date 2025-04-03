import { create } from 'zustand';

interface AppState {
  step: "problem" | "lesson" | "examples" | "quizzes" | "end"; // Added "examples"
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
      set({ step: "examples" }); // Transition to examples step
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
      set({ quizAnswer: '', quizIsCorrect: null, quizCommentary: '', quizFeedback: null });
    } catch (err) {
      setError(err.message || "Failed to fetch quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  },
  handleValidate: async (answer: string, quiz: any) => {
    const { sessionId, setError, setLoading } = get();
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
    }),
}));

export default useAppStore;