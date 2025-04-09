// src/app/api/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "@/supabase/serverClient";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const lastUpdatedAt = searchParams.get("lastUpdatedAt") || null;
  const lastId = searchParams.get("lastId") || null;

  console.log(`API: Fetching sessions for page ${page}, lastUpdatedAt: ${lastUpdatedAt}, lastId: ${lastId}`);

  let query = supabase
    .from("sessions")
    .select("id, problem, images, created_at, updated_at")
    .order("updated_at", { ascending: false, nullsLast: true })
    .order("id", { ascending: false })
    .limit(pageSize);

  if (page > 1 && lastUpdatedAt && lastId) {
    // Fetch sessions where updated_at < lastUpdatedAt OR (updated_at = lastUpdatedAt AND id < lastId)
    query = query
      .or(
        `updated_at.lt.${lastUpdatedAt},and(updated_at.eq.${lastUpdatedAt},id.lt.${lastId})`
      );
  }

  const { data: sessions, error } = await query;

  if (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`API: Fetched sessions for page ${page}:`, JSON.stringify(sessions, null, 2));
  console.log(`API: Fetched session IDs for page ${page}:`, sessions.map(s => s.id));

  return NextResponse.json({ sessions });
}