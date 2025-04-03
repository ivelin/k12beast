import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const sessionId = request.headers.get("x-session-id");
  const { sessionId: bodySessionId } = await request.json();

  try {
    if (!sessionId && !bodySessionId) {
      throw new Error("Session ID is required");
    }

    const id = sessionId || bodySessionId;

    const { error } = await supabase
      .from("sessions")
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to end session: ${error.message}`);
    }

    // Construct a fully qualified shareable link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const shareableLink = `${baseUrl}/session/${id}`;

    return NextResponse.json({ shareableLink });
  } catch (error) {
    console.error("Error ending session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to end session" },
      { status: 500 }
    );
  }
}