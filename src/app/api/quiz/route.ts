import { NextRequest, NextResponse } from "next/server";
import { sendXAIRequest, handleXAIError } from "../../../utils/xai";
import supabase from "../../../supabase/serverClient";
import { v4 as uuidv4 } from "uuid";

const responseFormat = `Return a JSON object with a new quiz problem based on the provided session history. The quiz must be related to the same topic as the original input problem or image (e.g., if the input is about heat transfer, the quiz must also be about heat transfer). Do not repeat problems from the session history (check the 'examples' and 'quizzes' arrays). Do not reference images in the problem text. The quiz must be a multiple-choice question with exactly four options. Structure: {"problem": "Quiz problem text", "answerFormat": "multiple-choice", "options": ["option1", "option2", "option3", "option4"], "correctAnswer": "correct option"}.`;

const defaultResponse = {
  problem: "",
  answerFormat: "multiple-choice",
  options: [],
  correctAnswer: "",
};

export async function POST(req: NextRequest) {
  try {
    const { problem, images } = await req.json();
    let sessionId = req.headers.get("x-session-id");

    // Fetch or create session
    let sessionHistory = null;
    if (sessionId) {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error) {
        console.error("Error fetching session:", error.message);
      } else if (data) {
        sessionHistory = data;
      }
    }

    if (!sessionId || !sessionHistory) {
      sessionId = uuidv4();
      const { error } = await supabase
        .from("sessions")
        .insert({ id: sessionId, created_at: new Date().toISOString() });

      if (error) {
        console.error("Error creating session:", error.message);
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
      }
      sessionHistory = { id: sessionId, created_at: new Date().toISOString() };
    }

    const content = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      defaultResponse,
      maxTokens: 1000,
      sessionHistory,
    });

    return NextResponse.json(content, {
      status: 200,
      headers: { "x-session-id": sessionId },
    });
  } catch (err) {
    return handleXAIError(err);
  }
}