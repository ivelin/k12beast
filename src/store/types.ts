// src/store/types.ts
export type Step = "problem" | "lesson" | "examples" | "quizzes" | "end";

export interface Quiz {
  problem: string;
  answerFormat: string;
  options: string[];
  correctAnswer?: string;
  difficulty: string;
  encouragementIfCorrect?: string;
  encouragementIfIncorrect?: string;
  readiness?: { confidenceIfCorrect: number; confidenceIfIncorrect: number };
}

export interface Example {
  problem: string;
  solution: { title: string; content: string }[];
}

export interface QuizFeedback {
  isCorrect: boolean;
  encouragement: string;
  solution: { title: string; content: string }[] | null;
  readiness: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  renderAs?: "markdown" | "html";
  experimental_attachments?: { name: string; url: string }[];
}

export interface AppState {
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