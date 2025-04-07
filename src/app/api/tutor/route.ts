// src/app/api/tutor/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "../../../supabase/serverClient";
import { sendXAIRequest } from "@/utils/xaiClient";

export async function POST(req: NextRequest) {
  try {
    const { problem, images } = await req.json();
    const sessionId = req.headers.get("x-session-id");

    let session;
    let chatHistory: { role: string; content: string; renderAs?: "markdown" | "html" }[] = [];

    if (sessionId) {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error || !data) {
        console.error("Error fetching session:", error?.message || "No data returned");
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      session = data;
      chatHistory = session.messages || [];
      console.log("Tutor session ID from header:", sessionId);
    } else {
      console.log("Creating new session with problem:", problem, "images:", images);
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          problem,
          images: images || [],
          messages: [{ role: "user", content: problem }],
        })
        .select()
        .single();

      if (error || !data) {
        console.error("Error creating session:", error?.message || "No data returned");
        throw new Error(`Failed to create session: ${error?.message || "Unknown error"}`);
      }

      session = data;
      chatHistory = session.messages || [];
      console.log("Created new session:", session.id, "Data:", session);
    }

    // Optimized response format instructions
    const responseFormat = `Return a JSON object with a tutoring lesson based on the chat history and original input problem. Structure: {"isK12": true, "lesson": "<p>Lesson content...</p>"}. The lesson should be a conversational explanation with minimal HTML formatting (e.g., <p>, <strong>, <ul>, <li>). Include an evaluation of the student's problem and proposed solution (if provided), or explain the problem's context and what the student needs to learn if no solution is provided. Encourage the student to request more examples and quizzes when ready, but do not quiz them yet. If not K12-related, return {"isK12": false, "error": "Prompt must be related to K12 education"}. Ensure the lesson is concise and appropriate for the student's inferred skill level.`;

    const xaiResponse = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      defaultResponse: { error: "Failed to create session" },
      chatHistory,
    });

    if (!xaiResponse.isK12) {
      return NextResponse.json({ error: xaiResponse.error || "Invalid K12 query" }, { status: 400 });
    }

    const updatedMessages = [
      ...chatHistory,
      { role: "assistant", content: xaiResponse.lesson, renderAs: "html" },
    ];

    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        lesson: xaiResponse.lesson,
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (updateError) {
      console.error("Error updating session:", updateError.message);
      throw new Error(`Failed to update session: ${updateError.message}`);
    }

    console.log("Session updated with lesson for ID:", session.id, "Updated data:", { lesson: xaiResponse.lesson });

    return NextResponse.json({ sessionId: session.id, messages: updatedMessages }, { status: 200 });
  } catch (error) {
    console.error("Error in /api/tutor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}