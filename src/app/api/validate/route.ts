// src/app/api/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "@/supabase/serverClient";

interface QuizFeedback {
  isCorrect: boolean;
  commentary: string;
  solution: { title: string; content: string }[] | null;
  readiness: { confidenceIfCorrect: number; confidenceIfIncorrect: number };
}

interface Quiz {
  problem: string;
  answerFormat: string;
  options: string[];
  correctAnswer: string;
  solution: { title: string; content: string }[];
  difficulty: "easy" | "medium" | "hard";
  encouragement: string | null;
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
    const commentary = isCorrect
      ? "Great job! You got it right!"
      : "Nice try! Let's go over the correct answer.";

    const readinessConfidence = isCorrect
      ? quiz.readiness.confidenceIfCorrect
      : quiz.readiness.confidenceIfIncorrect;
    const readinessPercentage = Math.round(readinessConfidence * 100);

    const motivationalMessage =
      readinessPercentage >= 90
        ? "You're doing amazing! You're very likely to ace your big test!"
        : readinessPercentage >= 70
        ? "Great progress! You're on track to do well on your big test. Keep practicing!"
        : readinessPercentage >= 50
        ? "You're making progress! Let's keep working to boost your confidence for the big test."
        : "Let's keep practicing! More effort will help you succeed on your big test.";

    const feedbackMessage = `<p><strong>Feedback:</strong></p><p><strong>Your Answer:</strong> ${answer}</p><p>${commentary}</p>${
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
      .join("")}</ul><p><strong>Test Readiness:</strong></p><div class="readiness-container"><div class="readiness-bar" style="width: ${readinessPercentage}%"></div></div><p>${readinessPercentage}% - ${motivationalMessage}</p>`;

    const feedback: QuizFeedback = {
      isCorrect,
      commentary,
      solution: quiz.solution,
      readiness: quiz.readiness,
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