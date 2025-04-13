// src/app/api/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "@/supabase/serverClient";

interface QuizFeedback {
  isCorrect: boolean;
  encouragement: string;
  solution: { title: string; content: string }[] | null;
  readiness: number; // Single readiness value based on answer correctness
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
    const readinessPercentage = Math.round(readiness * 100);

    const feedbackMessage = `<p><strong>Feedback:</strong></p><p><strong>Your Answer:</strong> ${answer}</p><p>${encouragement}</p>${
      quiz.solution
        ? `<p>${quiz.solution.map((s) => `<strong>${s.title}:</strong> ${s.content}`).join("</p><p>")}</p>`
        : ""
    }<p><strong>Options:</strong></p><ul>${quiz.options
      .map(
        (o) =>
          `<li>${o}${o === answer ? " (Your answer)" : ""}${
            o === quiz.correctAnswer ? " (Correct answer)" : ""
          }</li>`
      )
      .join("")}</ul><p><strong>Test Readiness:</strong></p><div class="readiness-container"><div class="readiness-bar" style="width: ${readinessPercentage}%"></div></div><p>${readinessPercentage}%</p>`;

    const feedback: QuizFeedback = {
      isCorrect,
      encouragement,
      solution: quiz.solution,
      readiness, // Return only the selected readiness value
    };

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