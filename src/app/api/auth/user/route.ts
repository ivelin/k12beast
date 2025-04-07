// src/app/api/auth/user/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "../../../../supabase/serverClient";

export async function GET(req: NextRequest) {
  try {
    // Extract the JWT token from the Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing or invalid Authorization header:", authHeader, "Request URL:", req.url);
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token received in /api/auth/user:", token);

    // Use the token to authenticate the user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log("Error fetching user or user not found:", error?.message || "No user", "Token:", token);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("User fetched successfully:", user.id);
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Error in /api/auth/user:", error.message, "Request URL:", req.url);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}