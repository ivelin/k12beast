import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const sessionId = request.headers.get("x-session-id");
  const { problem, answer } = await request.json();

  try {
    if (!sessionId) {
      throw new Error("Session ID is required");
    }
    if (!problem || !answer) {
      throw new Error("Problem and answer are required");
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError) {
      throw new Error(`Failed to fetch session: ${sessionError.message}`);
    }

    console.log("Session data:", session);
    console.log("Looking for quiz with problem:", problem);

    const quiz = session.quizzes?.find((q: any) => q.problem.trim() === problem.trim());
    if (!quiz) {
      console.error("Quiz not found in session. Available quizzes:", session.quizzes);
      throw new Error("Quiz not found in session");
    }

    console.log("Quiz data from session:", quiz);

    const isCorrect = answer === quiz.correctAnswer;
    const commentary = isCorrect
      ? "<p>Great job! You got it right!</p>"
      : `<p>Not quite. The correct answer is ${quiz.correctAnswer}.</p>`;

    const updatedQuizzes = [
      ...session.quizzes.filter((q: any) => q.problem !== problem),
      { ...quiz, answer, isCorrect, commentary },
    ];

    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        quizzes: updatedQuizzes,
        performanceHistory: [
          ...(session.performanceHistory || []),
          { isCorrect },
        ],
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) {
      throw new Error(`Failed to update session: ${updateError.message}`);
    }

    const { data: updatedSession, error: fetchError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch updated session: ${fetchError.message}`);
    }

    console.log("Session updated successfully:", updatedSession);

    return NextResponse.json({
      isCorrect,
      commentary,
      solution: isCorrect ? null : quiz.solution, // Only send solution if the answer is incorrect
    });
  } catch (error) {
    console.error("Error validating quiz:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate quiz" },
      { status: 400 }
    );
  }
}