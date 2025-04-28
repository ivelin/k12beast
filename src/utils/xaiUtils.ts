// src/utils/xaiUtils.ts
import { NextResponse } from "next/server";

export function validateRequestInputs(problem?: string, images?: string[]) {
  console.log("validateRequestInputs inputs:", { problem, images }); // Log inputs for debugging
  if (!problem && (!images || images.length === 0)) {
    throw new Error(`Missing problem or images: \n problem: ${problem}, \n images: ${images}`);
  }
}

export function handleXAIError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Unexpected error in xAI request";
  console.error("Error in xAI request:", message);
  return NextResponse.json(
    { error: message },
    { status: message === "Prompt must be related to K12 education" ? 400 : 500 }
  );
}