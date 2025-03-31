import { NextRequest, NextResponse } from "next/server";
import { callXAI } from "../../../utils/xai";
import { handleApiError } from "../../../utils/errorHandler";

export async function POST(req: NextRequest) {
  try {
    const { studentAnswer, quizProblem, correctAnswer, age, grade, skillLevel, performanceHistory } = await req.json();
    const correctCount = performanceHistory.filter(p => p.isCorrect).length;
    const totalAttempts = performanceHistory.length;
    const performanceSummary = totalAttempts > 0 ? `The student has answered ${correctCount} out of ${totalAttempts} questions correctly.` : 'No performance history yet.';

    // Construct the prompt for the AI model
    const prompt = `You are a highly professional K12 tutor. Validate the student’s answer "${studentAnswer}" for the problem "${quizProblem}" with correct answer "${correctAnswer}". Provide feedback suitable for a student around ${age} years old in grade ${grade} with ${skillLevel} skill level. Consider the student's overall performance: ${performanceSummary}. If the student has been struggling, offer more encouragement and simpler explanations. If they have been doing well, provide more advanced feedback. Return JSON: {"isCorrect": true/false, "commentary": "<p>Feedback...</p>"}

Ensure the response is valid JSON without any additional text, whitespace, or formatting outside the JSON object. Do not wrap the JSON in code blocks (e.g., do not use triple backticks with json). Return only the JSON object.`;

    const systemMessage = "You are a K12 tutor. Provide educational feedback tailored to the student's inferred age, grade, and skill level. Always return valid JSON without extra formatting or code blocks.";

    // Call the xAI API using the utility function
    const parsedContent = await callXAI(prompt, systemMessage);

    return NextResponse.json(parsedContent);
  } catch (error) {
    return handleApiError(error, "validate");
  }
}