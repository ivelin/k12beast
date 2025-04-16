// src/app/api/session/clone/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "../../../../../supabase/serverClient";
import { v4 as uuidv4 } from "uuid";

// Handle POST request to clone a session
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Get authenticated user
    const authToken = req.cookies.get("supabase-auth-token")?.value;
    if (!authToken) {
      return NextResponse.json(
        { error: "You must be logged in to clone a session." },
        { status: 401 }
      );
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(authToken);
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Invalid or expired authentication token." },
        { status: 401 }
      );
    }
    const userId = userData.user.id;

    // Fetch original session
    const { data: originalSession, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !originalSession) {
      console.error("Error fetching session to clone:", sessionError);
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    // Create new session data
    const newSessionId = uuidv4();
    const newSession = {
      id: newSessionId,
      user_id: userId,
      problem: originalSession.problem,
      images: originalSession.images,
      lesson: originalSession.lesson,
      examples: originalSession.examples,
      quizzes: originalSession.quizzes,
      messages: originalSession.messages,
      completed: originalSession.completed,
      notes: originalSession.notes,
      cloned_from: originalSession.id, // Reference original session
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert new session
    const { error: insertError } = await supabase
      .from("sessions")
      .insert(newSession);

    if (insertError) {
      console.error("Error cloning session:", insertError);
      return NextResponse.json(
        { error: "Failed to clone session." },
        { status: 500 }
      );
    }

    // Return new session ID
    return NextResponse.json(
      { sessionId: newSessionId },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error cloning session:", err);
    return NextResponse.json(
      { error: "Unexpected error cloning session." },
      { status: 500 }
    );
  }
}