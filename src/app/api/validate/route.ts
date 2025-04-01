import { NextRequest, NextResponse } from "next/server";
import supabase from "../../../supabase/serverClient"; // Server-side client with service role key

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

    // Append the new quiz result to the existing quizzes array
    const updatedQuizzes = [
      ...(session.quizzes || []),
      { problem, answer, isCorrect, commentary },
    ];

    // Update the performance history
    const updatedPerformanceHistory = {
      ...(session.performanceHistory || {}),
      isCorrect,
    };

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

    return NextResponse.json({ success: true, sessionId }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in validate route:", err);
    return NextResponse.json({ error: "Unexpected error validating quiz" }, { status: 500 });
  }
}