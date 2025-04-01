import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { sendXAIRequest, handleXAIError } from "../../../utils/xai";
import supabase from "../../../supabase/serverClient";

const responseFormat = `Return a JSON object with the quiz question details. Structure: {"problem": "quiz question", "answerFormat": "multipleChoice", "options": ["option1", "option2", "option3", "option4"], "correctAnswer": "correct option"}.`;

const defaultResponse = {
  problem: "",
  answerFormat: "multipleChoice",
  options: ["Option 1", "Option 2", "Option 3", "Option 4"],
  correctAnswer: "Option 1",
};

export async function POST(req: NextRequest) {
  try {
    const { problem, images } = await req.json();

    // Retrieve the session to get the inferred age, grade, skill level, and performance history
    const sessionId = req.headers.get("x-session-id") || uuidv4();
    let inferredAge = "unknown";
    let inferredGrade = "unknown";
    let inferredSkillLevel = "beginner";
    let performanceHistory: { isCorrect: boolean }[] = [];

    const { data: session, error: fetchError } = await supabase
      .from("sessions")
      .select("inferredAge, inferredGrade, inferredSkillLevel, performanceHistory")
      .eq("id", sessionId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching session:", fetchError.message);
    } else if (session) {
      inferredAge = session.inferredAge || inferredAge;
      inferredGrade = session.inferredGrade || inferredGrade;
      inferredSkillLevel = session.inferredSkillLevel || inferredSkillLevel;
      performanceHistory = session.performanceHistory || performanceHistory;
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

    // Save the initial session data to Supabase if it doesn't exist
    const { data, error } = await supabase
      .from("sessions")
      .upsert({
        id: sessionId,
        lesson: problem,
        examples: images || null,
        quizzes: [],
        performanceHistory: performanceHistory || [],
        completed: false,
        completed_at: null,
        updated_at: new Date().toISOString(),
        inferredAge,
        inferredGrade,
        inferredSkillLevel,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving session to Supabase:", error.message);
      return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
    }

    console.log("Session created/updated successfully:", data);

    const response = NextResponse.json({ success: true, sessionId, problem: content.problem }, { status: 200 });
    response.headers.set("x-session-id", sessionId);
    return response;
  } catch (err) {
    return handleXAIError(err);
  }
}