import { NextRequest, NextResponse } from "next/server";
import supabase from "../../../supabase/serverClient";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, problem, answer, isCorrect, commentary } = await req.json();

    if (!sessionId || !problem || !answer || isCorrect === undefined || !commentary) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch the existing session data
    const { data: session, error: fetchError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (fetchError) {
      console.error("Error fetching session from Supabase:", fetchError);
      return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Find the quiz in the session to get the solution
    const quiz = session.quizzes?.find((q) => q.problem === problem);
    if (!quiz) {
      console.error("Quiz not found in session:", problem);
      return NextResponse.json({ error: "Quiz not found in session" }, { status: 404 });
    }

    console.log("Quiz data from session:", quiz);

    // Append the new quiz result to the existing quizzes array
    const updatedQuizzes = [
      ...(session.quizzes || []),
      { problem, answer, isCorrect, commentary },
    ];

    // Update the performance history
    const updatedPerformanceHistory = [
      ...(session.performanceHistory || []),
      { isCorrect },
    ];

    // Update the session in Supabase
    const { data, error } = await supabase
      .from("sessions")
      .update({
        quizzes: updatedQuizzes,
        performanceHistory: updatedPerformanceHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating session in Supabase:", error);
      return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
    }

    console.log("Session updated successfully:", data);

    // Provide a default solution if none exists
    const solutionToReturn = quiz.solution || [
      { title: "Step 1", content: "<p>No solution available.</p>" },
      { title: "Step 2", content: "<p>Please try another quiz to continue learning.</p>" },
    ];

    // Return the validation result, including the solution if the answer is incorrect
    return NextResponse.json({
      success: true,
      sessionId,
      isCorrect,
      commentary,
      solution: isCorrect ? null : solutionToReturn, // Only reveal solution if incorrect
    }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in validate route:", err);
    return NextResponse.json({ error: "Unexpected error validating quiz" }, { status: 500 });
  }
}