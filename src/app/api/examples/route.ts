import { NextRequest, NextResponse } from "next/server";
import { sendXAIRequest, handleXAIError } from "../../../utils/xai";
import supabase from "../../../supabase/serverClient";

const responseFormat = `Return a JSON object with the problem and a solution array. Structure: {"problem": "problem text", "solution": [{"title": "Step 1", "content": "<p>Step content...</p>"}, ...]}.`;

const defaultResponse = {
  problem: "Example Problem",
  solution: [
    {
      title: "Step 1",
      content: "",
    },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const { problem, images } = await req.json();

    // Retrieve the session to get the inferred age, grade, skill level, and performance history
    const sessionId = req.headers.get("x-session-id") || null;
    let inferredAge = "unknown";
    let inferredGrade = "unknown";
    let inferredSkillLevel = "beginner";
    let performanceHistory: { isCorrect: boolean }[] = [];

    if (sessionId) {
      const { data: session, error } = await supabase
        .from("sessions")
        .select("inferredAge, inferredGrade, inferredSkillLevel, performanceHistory")
        .eq("id", sessionId)
        .single();

      if (error) {
        console.error("Error fetching session:", error.message);
      } else if (session) {
        inferredAge = session.inferredAge || inferredAge;
        inferredGrade = session.inferredGrade || inferredGrade;
        inferredSkillLevel = session.inferredSkillLevel || inferredSkillLevel;
        performanceHistory = session.performanceHistory || performanceHistory;
      }
    }

    const content = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      defaultResponse,
      validateK12: false, // Disable K12 validation since the prompt was already validated
      maxTokens: 1000,
      inferredAge,
      inferredGrade,
      inferredSkillLevel,
      performanceHistory,
    });

    return NextResponse.json(content, { status: 200 });
  } catch (err) {
    return handleXAIError(err);
  }
}