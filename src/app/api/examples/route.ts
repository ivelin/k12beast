// src/app/api/examples/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "../../../supabase/serverClient";
import { sendXAIRequest } from "../../../utils/xaiClient";
import { handleXAIError } from "../../../utils/xaiUtils";
import { ChartConfig } from "@/store/types";

// Define the expected response structure
interface ExampleResponse {
  charts: ChartConfig[];
  problem: string;
  solution: { title: string; content: string }[];
}

const responseFormat = `Return a JSON object with a new example problem and its solution, related to the same topic as the original input problem. 
  Structure: 
  {
    "problem": "<p>Here's an example problem: You save $100 in a bank account that earns 5% interest per year, compounded annually. The bank uses the formula <span class=\"math-tex\" data-math-type=\"inline\">A = P(1 + r)^n</span> to calculate your balance, where <span class=\"math-tex\" data-math-type=\"inline\">P</span> is the starting amount, <span class=\"math-tex\" data-math-type=\"inline\">r</span> is the interest rate, and <span class=\"math-tex\" data-math-type=\"inline\">n</span> is the number of years. How much money will you have after 2 years? To get a sense of how your savings might grow, take a look at Chart 1, which shows an example of compound interest growth over 3 years for a different amount. Chart 2 shows how compound interest compares to simple interest for that same example, helping you see why compound interest can be more powerful.</p><p><canvas id=\"chart1\"></canvas><br><canvas id=\"chart2\"></canvas></p>", 
    "solution": [
          {
            "title": "Step 1", "content": "Step content with optional MathJax formulas and references to existing charts 1, 2 or even new 3, 4 ..."
          },
          {"title": "Step N", "content": "Step content..."}
          ], 
    "charts": [
      {
        "id": "chart1",
        "config": {
          "type": "line",
          "data": {
            "labels": ["Year 0", "Year 1", "Year 2"],
            "datasets": [{
              "label": "Balance ($)",
              "data": [100, 105, 110.25],
              "borderColor": "blue",
              "fill": false,
              "tension": 0.1
            }]
          },
          "options": {
            "plugins": {
              "title": {
                "display": true,
                "text": "Chart 1"
              }
            },
            "scales": {
              "x": { "title": { "display": true, "text": "Time" } },
              "y": { "title": { "display": true, "text": "Balance ($)" } }
            }
          }
        }
      },
      {
        "id": "chart2",
        "config": {...}
      }
  ]}
 
  - Do not repeat problems from the session history or the original input problem. 
  - Ensure the problem and solution steps are concise and appropriate for the student's inferred skill level.  
  `;

const defaultResponse: ExampleResponse = {
  problem: "",
  solution: [],
  charts: [],
};

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.headers.get("x-session-id") || null;

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

    const problem = sessionHistory.problem;
    const images =  sessionHistory.images || [];

    const content = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      defaultResponse,
      maxTokens: 1000,
      chatHistory: sessionHistory?.messages || [], // Changed to chatHistory to match xaiClient.ts
    }) as ExampleResponse;

    // Validate the response
    if (!content.problem || !content.solution || !Array.isArray(content.solution)) {
      throw new Error("Invalid xAI response format: Expected 'problem' and 'solution' fields with 'solution' as an array");
    }

    if (sessionId) {
      const updatedExamples = [
        ...(sessionHistory?.examples || []),
        { problem: content.problem, solution: content.solution, charts: content.charts },
      ];
      const updatedMessages = [
        ...(sessionHistory?.messages || []),
        {
          role: "assistant",
          content: `<p><strong>Example:</strong> ${content.problem}</p><p><strong>Solution:</strong></p><ul>${content.solution.map((s) => `<li><strong>${s.title}:</strong> ${s.content}</li>`).join("")}</ul>`,
          charts: content.charts,
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