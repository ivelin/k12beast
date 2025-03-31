import { NextRequest, NextResponse } from "next/server";
import { callXAI } from "../../../utils/xai";
import { handleApiError } from "../../../utils/errorHandler";

export async function POST(req: NextRequest) {
  try {
    const { originalProblem, age, grade, skillLevel, performanceHistory } = await req.json();
    const correctCount = performanceHistory.filter(p => p.isCorrect).length;
    const totalAttempts = performanceHistory.length;
    const performanceSummary = totalAttempts > 0 ? `The student has answered ${correctCount} out of ${totalAttempts} questions correctly.` : 'No performance history yet.';

    // Construct the prompt for the AI model
    const prompt = `You are a highly professional K12 tutor. Generate an example problem similar to "${originalProblem}" for a student around ${age} years old in grade ${grade} with ${skillLevel} skill level. Consider the student's performance: ${performanceSummary}. If the student has been performing well, make the example slightly more challenging. If they have been struggling, provide a simpler example. Return JSON: {"problem": "Example problem text", "solution": [{"title": "Step 1", "content": "<p>Explanation...</p>"}, ...]}

Ensure the response is valid JSON without any additional text, whitespace, or formatting outside the JSON object. Do not wrap the JSON in code blocks (e.g., do not use triple backticks with json). Return only the JSON object.`;

    const systemMessage = "You are a K12 tutor. Provide educational content tailored to the student's inferred age, grade, and skill level. Always return valid JSON without extra formatting or code blocks.";

    // Call the xAI API using the utility function
    const parsedContent = await callXAI(prompt, systemMessage);

    return NextResponse.json(parsedContent);
  } catch (error) {
    return handleApiError(error, "examples");
  }
}