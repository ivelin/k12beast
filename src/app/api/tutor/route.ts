import { NextRequest, NextResponse } from "next/server";
import { sendXAIRequest, handleXAIError } from "../../../utils/xai";
import supabase from "../../../supabase/serverClient";

const responseFormat = `If the prompt is K12-related, return a JSON object with the inferred age, grade, skill level, and the tutoring lesson. Structure: {"isK12": true, "age": "inferred age", "grade": "inferred grade", "skillLevel": "beginner|intermediate|advanced", "lesson": "<p>Lesson content...</p>"}. If not K12-related, return {"isK12": false, "error": "Prompt must be related to K12 education"}.`;

const defaultResponse = {
  isK12: true,
  age: "unknown",
  grade: "unknown",
  skillLevel: "unknown",
  lesson: "",
};

export async function POST(req: NextRequest) {
  try {
    const { problem, images } = await req.json();

    const content = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      defaultResponse,
      validateK12: true, // Enable K12 validation for the initial prompt
      maxTokens: 1000,
    });

    // Generate a session ID (we'll use this later in /api/quiz)
    const sessionId = req.headers.get("x-session-id") || null;
    if (sessionId) {
      // Update the session with the inferred age, grade, and skill level
      const { error } = await supabase
        .from("sessions")
        .update({
          inferredAge: content.age,
          inferredGrade: content.grade,
          inferredSkillLevel: content.skillLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        console.error("Error updating session with inferred data:", error.message);
      }
    }

    return NextResponse.json(content, { status: 200 });
  } catch (err) {
    return handleXAIError(err);
  }
}