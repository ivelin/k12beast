// src/app/api/tutor/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendXAIRequest } from "../../../utils/xaiClient";
import supabase from "../../../supabase/serverClient";
import { v4 as uuidv4 } from "uuid";

const responseFormat = `Return a JSON object with the tutoring lesson based on the provided chat history
and original input problem or image. The response must include an evaluation of the student's problem and
proposed solution (if provided), followed by a personalized lesson. Structure: {"isK12": true, "lesson":"..."}. 
If no proposed solution is provided, the evaluation section should explain the problem's context and what the student needs to learn.
Encourage the student to requet more examples and quizzes when ready. Do not quiz them yet.
If not K12-related, return {"isK12": false, "error": "Prompt must be related to K12 education"}.`;

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

    console.log("tutor/route xAI API response content object:", content);
    console.log("tutor/route xAI API response content object content.isK12:", content.isK12);
    console.log("tutor/route xAI API response content object content.isK12:", content["isK12"]);
    console.log("Type of content:", typeof content);
    console.log("Content keys:", Object.keys(content));

    if (content.isK12) {
      const lessonContent = content.lesson;
      const { data, error } = await supabase
        .from("sessions")
        .update({
          problem: problem || null,
          images: images || null,
          lesson: lessonContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) {
        console.error("Error updating session with lesson:", error.message);
        return NextResponse.json(
          { error: "Failed to update session" },
          { status: 500 }
        );
      }
      console.log("Session updated with lesson for ID:", sessionId,
        "Updated data:", data);

      return new NextResponse(lessonContent, {
        status: 200,
        headers: { "x-session-id": sessionId },
      });
    } else {
      return NextResponse.json(
        { error: content.error || "Prompt must be related to K12 education" },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("Unexpected error in tutor route:", err);
    return NextResponse.json(
      { error: err.message || "Unexpected error in tutor route" },
      { status: 500 }
    );
  }
}