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

    // Handle unexpected response format
    let formattedContent = content;
    if (content.response && (!content.problem || !content.solution)) {
      console.warn("xAI returned unexpected format with 'response' field:", content.response);
      // Attempt to parse the response field into problem and solution
      const responseText = content.response;
      const problemMatch = responseText.match(/<p><strong>Problem:<\/strong>(.*?)(?=<p><strong>Solution:<\/strong>|$)/is);
      const solutionMatch = responseText.match(/<p><strong>Solution:<\/strong><\/p>\s*<ul>(.*?)(?=<\/ul>|$)/is);

      if (problemMatch && solutionMatch) {
        const problemText = problemMatch[1].trim();
        const solutionItems = solutionMatch[1].match(/<li><strong>(.*?):<\/strong>\s*(.*?)(?=<\/li>|$)/gi) || [];
        const solution = solutionItems.map((item: string) => {
          const match = item.match(/<li><strong>(.*?):<\/strong>\s*(.*?)(?=<\/li>|$)/i);
          return match ? { title: match[1], content: match[2].trim() } : null;
        }).filter(Boolean);

        formattedContent = {
          problem: problemText,
          solution: solution.length > 0 ? solution : [{ title: "Step 1", content: "No solution steps provided." }],
        };
      } else {
        console.error("Could not parse problem and solution from response:", responseText);
        formattedContent = {
          problem: "Unable to generate example due to API response format.",
          solution: [{ title: "Error", content: "The AI response was not in the expected format. Please try again." }],
        };
      }
    }

    // Validate the formatted content
    if (!formattedContent.problem || !formattedContent.solution || !Array.isArray(formattedContent.solution)) {
      throw new Error("Invalid xAI response format: Expected 'problem' and 'solution' fields with 'solution' as an array");
    }

    if (sessionId) {
      const updatedExamples = [
        ...(sessionHistory?.examples || []),
        { problem: formattedContent.problem, solution: formattedContent.solution },
      ];
      const updatedMessages = [
        ...(sessionHistory?.messages || []),
        {
          role: "assistant",
          content: `<p><strong>Example:</strong> ${formattedContent.problem}</p><p><strong>Solution:</strong></p><ul>${formattedContent.solution.map((s: any) => `<li><strong>${s.title}:</strong> ${s.content}</li>`).join("")}</ul>`,
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
        console.log("Session updated with new example:", formattedContent.problem);
      }
    }

    return NextResponse.json(formattedContent, { status: 200 });
  } catch (err) {
    return handleXAIError(err);
  }
}