import { NextResponse } from "next/server";

export function validateRequestInputs(problem?: string, images?: string[]) {
  if (!problem && (!images || images.length === 0)) {
    throw new Error("Missing problem or images");
  }
}

export function handleXAIError(error: any) {
  console.error("Error in xAI request:", error.message);
  return NextResponse.json(
    { error: error.message || "Unexpected error in xAI request" },
    { status: error.message === "Prompt must be related to K12 education" ? 400 : 500 }
  );
}