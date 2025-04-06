import { NextRequest, NextResponse } from "next/server";
import { sendXAIRequest, handleXAIError } from "../../../utils/xaiClient";
import supabase from "../../../supabase/serverClient";
import { v4 as uuidv4 } from "uuid";

const responseFormat = `Return a JSON object with the tutoring lesson based on the provided chat history
and original input problem or image. The response must include an evaluation of the student's problem and
proposed solution (if provided), followed by a personalized lesson. Structure: {"isK12": true, "lesson":
"**Evaluation:** Evaluation comments...\n\n**Lesson:** Lesson content..."}. Use pure Markdown for formatting
(e.g., **bold**, *italic*, - for lists). Do not include HTML tags (e.g., <p>, <strong>). Use double newlines
for paragraph breaks. If no proposed solution is provided, the evaluation section should explain the
problem's context and what the student needs to learn. If not K12-related, return {"isK12": false, "error":
"Prompt must be related to K12 education"}.`;

const defaultResponse = {
  isK12: true,
  lesson: "",
};

export async function POST(req: NextRequest) {
  try {
    const { problem, images } = await req.json();
    let sessionId = req.headers.get("x-session-id");

    console.log("Tutor request body:", { problem, images });
    console.log("Tutor session ID from header:", sessionId);

    // Fetch or create session
    let sessionHistory = null;
    if (sessionId) {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error) {
        console.error("Error fetching session from Supabase:", error.message);
      } else if (data) {
        sessionHistory = data;
        console.log("Fetched session history:", sessionHistory);
      } else {
        console.warn("No session found for ID:", sessionId);
      }
    }

    if (!sessionId || !sessionHistory) {
      sessionId = uuidv4();
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          id: sessionId,
          problem: problem || null,
          images: images || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating session:", error.message);
        return NextResponse.json(
          { error: "Failed to create session" },
          { status: 500 }
        );
      }
      sessionHistory = data;
      console.log("Created new session:", sessionId, "Data:", sessionHistory);
    }

    const content = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      defaultResponse,
      validateK12: true,
      maxTokens: 1000,
      chatHistory: sessionHistory?.messages || [],
    });

    if (content.isK12) {
      const { data, error } = await supabase
        .from("sessions")
        .update({
          problem: problem || null,
          images: images || null,
          lesson: content.lesson,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) {
        console.error("Error updating session with lesson:", error.message);
      } else {
        console.log("Session updated with lesson for ID:", sessionId,
          "Updated data:", data);
      }
    }

    return NextResponse.json(content, {
      status: 200,
      headers: { "x-session-id": sessionId },
    });
  } catch (err) {
    console.error("Unexpected error in tutor route:", err);
    return handleXAIError(err);
  }
}