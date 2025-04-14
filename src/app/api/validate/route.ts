// src/app/api/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "@/supabase/serverClient";
import { formatQuizFeedbackMessage } from "@/utils/quizUtils";

interface QuizFeedback {
  isCorrect: boolean;
  encouragement: string;
  solution: { title: string; content: string }[] | null;
  readiness: number;
  correctAnswer?: string; // Add correctAnswer to the response
}

interface Quiz {
  problem: string;
  answerFormat: string;
  options: string[];
  correctAnswer: string;
  solution: { title: string; content: string }[];
  difficulty: "easy" | "medium" | "hard";
  encouragementIfCorrect?: string;
  encouragementIfIncorrect?: string;
  encouragement?: string | null;
  readiness: { confidenceIfCorrect: number; confidenceIfIncorrect: number };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  renderAs?: "markdown" | "html";
  experimental_attachments?: { name: string; url: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, problem, answer } = await req.json();
    console.log("Validate request body:", { sessionId, problem, answer });

    if (!sessionId || !problem || !answer) {
      return NextResponse.json(
        { error: "Missing sessionId, problem, or answer in request" },
        { status: 400 }
      );
    }

    const { data: sessionData, error: fetchError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (fetchError || !sessionData) {
      console.error("Error fetching session:", fetchError?.message || "No session data");
      return NextResponse.json(
        { error: "Session not found. Please start a new chat session." },
        { status: 404 }
      );
    }

    console.log("Session data:", sessionData);

    const quizzes: Quiz[] = sessionData.quizzes || [];
    console.log("Looking for quiz with problem:", problem);
    const quiz = quizzes.find((q: Quiz) => q.problem === problem);

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found in session." },
        { status: 404 }
      );
    }

    const isCorrect = answer === quiz.correctAnswer;

    // Use AI-provided encouragement messages, with fallbacks for backward compatibility
    const encouragement = isCorrect
      ? quiz.encouragementIfCorrect || quiz.encouragement || "Great job! You got it right!"
      : quiz.encouragementIfIncorrect || quiz.encouragement || "Nice try! Let's review the correct answer.";

    // Select the single readiness value based on correctness
    const readiness = isCorrect
      ? quiz.readiness.confidenceIfCorrect
      : quiz.readiness.confidenceIfIncorrect;

    const feedback: QuizFeedback = {
      isCorrect,
      encouragement,
      solution: quiz.solution,
      readiness,
      correctAnswer: quiz.correctAnswer, // Include the correct answer in the response
    };

    // Use utility function to format the feedback message
    const feedbackMessage = formatQuizFeedbackMessage(quiz, answer, feedback);

    // Fetch the current messages and append the new ones
    const currentMessages: Message[] = sessionData.messages || [];
    const updatedMessages = [
      ...currentMessages,
      { role: "user", content: answer, renderAs: "markdown" },
      { role: "assistant", content: feedbackMessage, renderAs: "html" },
    ];

    // Update the session with the new messages
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Error updating session messages:", updateError.message);
      return NextResponse.json(
        { error: `Failed to update session messages: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(feedback, { status: 200 });
  } catch (err) {
    console.error("Error in /api/validate:", err);
    return NextResponse.json(
      { error: "Failed to validate quiz answer." },
      { status: 500 }
    );
  }
}