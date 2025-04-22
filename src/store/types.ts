// File path: src/store/types.ts
// Type definitions for K12Beast state, including sessions, messages, quizzes, and charts.
// Updated to support React Flow configurations instead of Mermaid.

import { MessageElement } from "@/components/ui/chat-message";

export type Step = "problem" | "lesson" | "examples" | "quizzes" | "end";

// Configuration for charts (React Flow or Plotly) used in messages, quizzes, and sessions
export interface ChartConfig {
  id: string;
  format: "plotly" | "reactflow"; // Chart type: Plotly or React Flow
  config: PlotlyConfig | ReactFlowConfig; // Plotly: data/layout; React Flow: nodes/edges
}

// Plotly-specific configuration
export interface PlotlyConfig {
  data: PlotlyData[]; // Plotly traces
  layout: PlotlyLayout; // Plotly layout options
}

export interface PlotlyData {
  x: (number | string)[];
  y: (number | string)[];
  type: string;
  mode?: string;
  name?: string;
  line?: { color?: string };
  marker?: { color?: string };
  fill?: string;
}

export interface PlotlyLayout {
  width?: number;
  height?: number;
  title?: { text: string };
  xaxis?: { title?: string };
  yaxis?: { title?: string };
  margin?: { t?: number; b?: number; l?: number; r?: number };
  showlegend?: boolean;
}

// React Flow-specific configuration
export interface ReactFlowConfig {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

export interface ReactFlowNode {
  id: string;
  data: { label: string };
  position: { x: number; y: number };
  style?: { [key: string]: string }; // Optional style for nodes (e.g., title node styling)
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Quiz {
  problem: string;
  answerFormat: string;
  options: string[];
  correctAnswer?: string;
  difficulty: string;
  encouragementIfCorrect?: string;
  encouragementIfIncorrect?: string;
  readiness?: { confidenceIfCorrect: number; confidenceIfIncorrect: number };
  charts?: ChartConfig[]; // Supports React Flow/Plotly diagrams
}

export interface Example {
  problem: string;
  solution: { title: string; content: string }[];
}

export interface QuizFeedback {
  charts: ChartConfig[];
  isCorrect: boolean;
  encouragement: string;
  solution: { title: string; content: string }[] | null;
  readiness: number;
  correctAnswer?: string;
}

export interface Message {
  id?: string;
  role: "user" | "assistant" | (string & {});
  content: string;
  createdAt?: Date;
  renderAs?: "markdown" | "html";
  charts?: ChartConfig[]; // Supports React Flow/Plotly diagrams
}

export interface AppState {
  step: Step;
  sessionId: string | null;
  problem: string;
  images: File[];
  imageUrls: string[];
  lesson: string | null;
  charts: ChartConfig[];
  examples: Example | null;
  quiz: Quiz | null;
  error: string | null;
  loading: boolean;
  quizAnswer: string;
  correctAnswer: string | null;
  quizFeedback: QuizFeedback | null;
  messages: Message[];
  cloned_from?: string | null;
  hasSubmittedProblem: boolean;
  sessionTerminated: boolean;
  showErrorPopup: boolean;
  set: (updates: Partial<AppState>) => void;
  setStep: (step: Step) => void;
  setError: (error: string | null) => void;
  addMessage: (message: MessageElement) => void;
  handleSubmit: (problem: string, imageUrls: string[], images: File[]) => Promise<void>;
  handleExamplesRequest: () => Promise<void>;
  handleQuizSubmit: () => Promise<void>;
  handleValidate: (answer: string, quiz: Quiz) => Promise<void>;
  append: (message: Message, imageUrls: string[], images: File[]) => Promise<void>;
  reset: () => void;
}

// Session data stored in Supabase
export interface Session {
  id: string;
  problem?: string;
  images?: string[];
  lesson?: string | null;
  examples?: Example[] | null;
  quizzes?: Quiz[] | null;
  performanceHistory?: { correct: number; total: number } | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  responseFormat?: string;
  messages?: Message[];
  cloned_from?: string | null;
  charts?: ChartConfig[]; // Supports React Flow/Plotly diagrams
}

// Lesson data with optional charts
export interface Lesson {
  lesson: string;
  charts?: ChartConfig[];
}
