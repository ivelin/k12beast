import { NextRequest, NextResponse } from "next/server";
import { sendXAIRequest, handleXAIError } from "../../../utils/xaiClient";
import supabase from "../../../supabase/serverClient";

const responseFormat = `Return a JSON object with a new example problem and its solution, related to the same topic as the original input problem or image (e.g., if the input is about heat transfer, the example must also be about heat transfer). 
  Structure: {"problem": "Example problem text", "solution": [{"title": "Step 1", "content": "Step content..."}, ...]}. 
  Do not repeat problems from the session history or the original input problem. 
  Do not reference images in the response unless explicitly provided in the current request.`;

const defaultResponse = {
  problem: "",
  solution: [],
};

export async function POST(req: NextRequest) {
  try {
    const { problem, images } = await req.json();
    const sessionId = req.headers.get("x-session-id") || null;

    console.log("Examples request body:", { problem, images });
    console.log("Examples session ID from header:", sessionId);

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
    } else {
      console.warn("No sessionId provided in request headers");
    }

    const content = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      defaultResponse,
      maxTokens: 1000,
      sessionHistory,
    });

    if (sessionId) {
      const updatedExamples = [
        ...(sessionHistory?.examples || []),
        { problem: content.problem, solution: content.solution },
      ];
      const { error } = await supabase
        .from("sessions")
        .update({
          examples: updatedExamples,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        console.error("Error updating session with examples:", error.message);
      } else {
        console.log("Session updated with new example:", content.problem);
      }
    }

    return NextResponse.json(content, { status: 200 });
  } catch (err) {
    return handleXAIError(err);
  }
}