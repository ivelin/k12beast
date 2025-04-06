import { NextResponse } from "next/server";
import supabase from "../../../supabase/serverClient";

export async function POST(request: Request) {
  const { sessionId } = await request.json();
  const sessionHeaderId = request.headers.get("x-session-id");

  if (!sessionId || sessionId !== sessionHeaderId) {
    return NextResponse.json({ error: "Invalid or missing session ID" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to end session" }, { status: 500 });
  }

  const shareableLink = `/session/${sessionId}`;
  return NextResponse.json({ shareableLink });
}