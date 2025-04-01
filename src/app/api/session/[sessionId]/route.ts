import { NextRequest, NextResponse } from "next/server";
import supabase from "../../../../supabase/browserClient";

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", params.sessionId)
      .single();

    if (error) {
      console.error("Error fetching session from Supabase:", error);
      return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session: data }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in session route:", err);
    return NextResponse.json({ error: "Unexpected error fetching session" }, { status: 500 });
  }
}