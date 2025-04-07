// src/app/api/validate/route.ts
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

    // Determine the readiness confidence based on whether the answer is correct
    const readinessConfidence = isCorrect
      ? quiz.readiness.confidenceIfCorrect
      : quiz.readiness.confidenceIfIncorrect;
    const readinessPercentage = Math.round(readinessConfidence * 100);

    // Add a motivational message based on the readiness confidence
    let motivationalMessage = "";
    if (readinessPercentage >= 90) {
      motivationalMessage = "You're doing amazing! You're very likely to ace your big test!";
    } else if (readinessPercentage >= 70) {
      motivationalMessage = "Great progress! You're on track to do well on your big test. Keep practicing!";
    } else if (readinessPercentage >= 50) {
      motivationalMessage = "You're making progress! Let's keep working to boost your confidence for the big test.";
    } else {
      motivationalMessage = "Let's keep practicing! More effort will help you succeed on your big test.";
    }

    const updatedQuizzes = [
      ...session.quizzes.filter((q: any) => q.problem !== problem),
      { ...quiz, answer, isCorrect, commentary },
    ];

    // Append the feedback to the messages array, including readiness
    const updatedMessages = [
      ...(session.messages || []),
      {
        role: "assistant",
        content: `<strong>Feedback:</strong><br><strong>Your Answer:</strong> ${answer}<br>${commentary}${isCorrect ? "" : `<br><br>${quiz.solution.map((s: any) => `<strong>${s.title}:</strong> ${s.content}`).join("<br><br>")}`}<br><br><strong>Options:</strong><br><ul>${quiz.options.map((o: string) => `<li>${o}${o === answer ? " (Your answer)" : ""}${o === quiz.correctAnswer ? " (Correct answer)" : ""}</li>`).join("")}</ul><br><br><strong>Test Readiness:</strong><br><div class="readiness-container"><div class="readiness-bar" style="width: ${readinessPercentage}%"></div></div><p>${readinessPercentage}% - ${motivationalMessage}</p>`,
        renderAs: "html",
      },
    ];

    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        quizzes: updatedQuizzes,
        messages: updatedMessages,
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