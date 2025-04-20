/* src/app/api/tutor/route.ts
 * Handles POST requests to create a new tutoring session when a user submits a problem.
 * Returns a JSON response with the lesson HTML and charts for rendering.
 */

import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import supabase from "@/supabase/serverClient";
import { sendXAIRequest } from "@/utils/xaiClient";
import { handleApiError } from "@/utils/errorHandler";

const responseFormat = `Return a JSON object with the tutoring lesson based on the provided chat history and original input problem or image. 
  If the problem is not related to K12 education, return {"isK12": false, "error": "..."}. Otherwise, proceed as follows:
  1. If there are multiple problems detected:
    - pick the first one and ignore the rest
    - inform the user that currently each chat session focuses on one problem but multiple problem support may be available in the future.
  2. For K12-related problems, evaluate the student's problem and proposed solution (if provided), followed by a personalized lesson plan, 
    all combined into a single HTML string with safe formatting. 
  3. If no proposed solution is provided, the evaluation section should explain the problem's context and what the student needs to learn. 
  4. Encourage the student to request more examples and quizzes when ready, but do not provide a quiz in this response.
  5. Structure for K12-related problems: 
    {
      "isK12": true, 
      "lesson": "<p>[evaluation text]</p><p>[lesson text]</p><p>If you feel comfortable...</p>",
      "charts": [
        {
          "id": "chart1",
          "config": {...}
        },
        ...
      ]
    }

{
  "isK12": true,
  "lesson": "<p>Since you're preparing for 6th grade tests in math...which is a great way to learn how money can grow over time. 🌟 ... understand the difference between simple and compound interest... Suppose you save $100 in a bank account that earns 5% interest per year, compounded annually... step by step. To help, see Chart 1 to visualize how your money grows each year, and refer to Chart 2 to compare simple interest vs. compound interest... The formula is <span class=\"math-tex\" data-math-type=\"display\">A = P(1 + r)^n</span>, where <span class=\"math-tex\" data-math-type=\"inline\">P</span> is your starting amount ($100), ... Check Chart 2 to see how compound interest (blue line) grows faster than simple interest (green line).</p><p><canvas id=\"chart1\"></canvas><br><canvas id=\"chart2\"></canvas></p><p>If you feel comfortable with this...</p>",
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
  ]
}    
    
    - Ensure the "lesson" field is a single HTML string with no nested JSON objects.`;

// Handles POST requests to create a new tutoring session when a user submits a problem
// Only creates a session if the problem is K12-related; otherwise, returns an error
export async function POST(request: Request) {
  try {
    const { problem, images } = await request.json();
    const sessionId = request.headers.get("x-session-id") || uuidv4();

    // Get the Authorization token from the request headers
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    console.log("Received problem:", { problem, images, userId: user.id, sessionId });

    // Send request to xAI API to check if the problem is K12-related before creating a session
    const lessonResponse = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      sessionId,
      defaultResponse: { isK12: true, lesson: "No lesson generated." },
      maxTokens: 1000,
      chatHistory: [],
    });

    console.log("tutor lesson response:", lessonResponse);  // Log the full response for debugging

    // Check if the response is valid
    if (!lessonResponse || !lessonResponse.lesson) {
      console.error("No lesson returned from xAI API");
      return NextResponse.json(
        { error: "Failed to generate lesson: No lesson content returned" },
        { status: 500 }
      );
    }

    // Check if the response is K12-related
    if (!lessonResponse.isK12) {
      console.log("Prompt is not K12-related:", lessonResponse.error);
      return NextResponse.json(
        {
          error: lessonResponse.error || "This question doesn’t seem to be about school stuff for kids. Let’s try something like a math problem or a science question instead!",
          terminateSession: true,
        },
        { status: 400 }
      );
    }

    // If the problem is K12-related, proceed to create the session
    console.log("Creating session for K12 problem:", { problem, images, userId: user.id, sessionId });

    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .upsert({
        id: sessionId,
        problem,
        images,
        lesson: null,
        examples: null,
        quizzes: null,
        performanceHistory: null,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
      .select()
      .single();

    if (sessionError || !sessionData) {
      console.error("Error creating or updating session:", sessionError?.message || "No session data returned");
      return NextResponse.json(
        { error: `Failed to create or update session: ${sessionError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    console.log("Session upserted successfully:", sessionData);

    // Update the session with the lesson content
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ lesson: JSON.stringify(lessonResponse), updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Error updating session with lesson:", updateError.message);
      return NextResponse.json(
        { error: `Failed to update session with lesson: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Return the full JSON response with lesson and charts
    return NextResponse.json(
      lessonResponse,
      {
        status: 200,
        headers: {
          "x-session-id": sessionId,
        },
      }
    );
  } catch (error) {
    return handleApiError(error, "/api/tutor");
  }
}