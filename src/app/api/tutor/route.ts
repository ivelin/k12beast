// File path: src/app/api/tutor/route.ts
// Handles POST requests to evaluate a problem and create a new tutoring session if K12-related.
// Returns the xAI lessonResponse directly with a 200 status.

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
  4. Encourage the user to request more examples and quizzes when ready, but do not provide a quiz in this response.
  5. Structure for K12-related problems: 
      {
        "isK12": true,
        "lesson": "<p>Looks like...</p><p>To help, see Figure 1 to visualize, and refer to Figure 2 to... The formula is <math>...</math>...</p><p>If you feel comfortable with this...</p>",
        "charts": [
          {
            "id": "chart1",
            "config": {...},
          },
          {
            "id": "chart2",
            "config": {...}
          }
        ]
      }    
  6. Ensure the "lesson" field is a single HTML string with no nested JSON objects.
  `;

// Handles POST requests to evaluate a problem and create a new tutoring session if K12-related
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

    // Send request to xAI API to evaluate the problem
    const lessonResponse = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      sessionId,
      defaultResponse: { isK12: true, lesson: "No lesson generated." },
      chatHistory: [],
    });

    console.log("tutor lesson response:", lessonResponse); // Log the full response for debugging

    // Check if the response is valid
    if (!lessonResponse) {
      console.error("No lesson returned from xAI API");
      return NextResponse.json(
        { error: "Ooops! The AI may be snoozing. Let's try again in a few moments." },
        { status: 500 }
      );
    }

    // If the problem is K12-related, create and update the session
    if (lessonResponse.isK12) {
      // Check if the response has a lesson
      if (!lessonResponse.lesson) {
        console.error("No lesson returned from xAI API");
        return NextResponse.json(
          { error: "Ooops! No lesson content returned. The AI may be snoozing. Let's try again in a few moments." },
          { status: 500 }
        );
      }

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
    }

    // Return the xAI response (whether K12 or non-K12) with a 200 status
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