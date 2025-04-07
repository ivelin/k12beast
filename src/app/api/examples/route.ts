// src/app/api/examples/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "../../../supabase/serverClient";
import { sendXAIRequest } from "../../../utils/xaiClient";
import { handleXAIError } from "../../../utils/xaiUtils";

const responseFormat = `Return a JSON object with a new example problem and its solution, related to the same topic as the original input problem. Structure: {"problem": "Example problem text", "solution": [{"title": "Step 1", "content": "Step content..."}, ...]}. Do not repeat problems from the session history or the original input problem. Do not reference images unless provided in the current request. Ensure the problem and solution steps are concise and appropriate for the student's inferred skill level.`;

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

    // Update the session with the user's request for an example
    if (sessionId && sessionHistory) {
      const updatedMessages = [
        ...(sessionHistory.messages || []),
        { role: "user", content: "Request Example" },
      ];
      const { error } = await supabase
        .from("sessions")
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        console.error("Error updating session with messages:", error.message);
      }
      sessionHistory.messages = updatedMessages;
    }

    const content = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      defaultResponse,
      maxTokens: 1000,
      chatHistory: sessionHistory?.messages || [],
    });

    // Validate the xAI response
    if (!content.problem || !content.solution || !Array.isArray(content.solution)) {
      throw new Error("Invalid xAI response format: Expected 'problem' and 'solution' fields with 'solution' as an array");
    }

    if (sessionId) {
      const updatedExamples = [
        ...(sessionHistory?.examples || []),
        { problem: content.problem, solution: content.solution },
      ];
      // Append the assistant's response to the messages array
      const updatedMessages = [
        ...(sessionHistory?.messages || []),
        {
          role: "assistant",
          content: `<p><strong>Example:</strong> ${content.problem}</p><p><strong>Solution:</strong></p><ul>${content.solution.map((s: any) => `<li><strong>${s.title}:</strong> ${s.content}</li>`).join("")}</ul>`,
          renderAs: "html",
        },
      ];
      const { error } = await supabase
        .from("sessions")
        .update({
          examples: updatedExamples,
          messages: updatedMessages,
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