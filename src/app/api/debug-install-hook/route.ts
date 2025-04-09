// src/app/api/debug-install-hook/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Silently handle the request without logging in production
  return new NextResponse(null, { status: 204 });
}