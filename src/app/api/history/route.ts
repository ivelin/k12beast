// src/app/api/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "@/supabase/serverClient";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  // Get the Authorization token from the request headers
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  // Verify the token and get the user
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Fetch sessions filtered by the authenticated user's ID
    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("id, problem, images, created_at, updated_at")
      .eq("user_id", user.id) // Filter by user_id
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, end);

    if (error) {
      console.error("Error fetching sessions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("Unexpected error in history route:", err);
    return NextResponse.json({ error: "Unexpected error fetching sessions" }, { status: 500 });
  }
}