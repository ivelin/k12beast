// src/app/api/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "@/supabase/serverClient";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, problem, images, created_at, updated_at")
    .order("updated_at", { ascending: false, nullsLast: true })
    .order("id", { ascending: false })
    .range(start, end);

  if (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions });
}