import { NextRequest, NextResponse } from "next/server";
import supabase from "../../../supabase/serverClient";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // Mark the session as completed in Supabase
    const { data, error } = await supabase
      .from("sessions")
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating session in Supabase:", error.message);
      return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    console.log("Session marked as completed successfully:", data);

    // Generate the shareable link
    const shareableLink = `/session/${sessionId}`;

    return NextResponse.json({ success: true, shareableLink }, { status: 200 });
  } catch (err) {
    console.error("Error in end-session route:", err.message); // Log only the error message
    return NextResponse.json({ error: "Unexpected error ending session" }, { status: 500 });
  }
}