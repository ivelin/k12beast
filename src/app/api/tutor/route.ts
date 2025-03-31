import { NextRequest, NextResponse } from "next/server";
import { callXAI } from "../../../utils/xai";
import { handleApiError } from "../../../utils/errorHandler";

export async function POST(req: NextRequest) {
  try {
    const { text, images } = await req.json();

    // Construct the prompt to infer student details and provide a broad lesson

    // If the input is not a valid K12 educational query or contains unsafe content, respond with {"isValid": false, "message": "This does not seem like a valid K12 educational query. Please try asking a different question related to your studies."}.
    // 
    // Otherwise, return a JSON object with the inferred age, grade, skill level, and the tutoring lesson. Structure: {"age": "inferred age", "grade": "inferred grade", "skillLevel": "beginner|intermediate|advanced", "lesson": "<p>Lesson content...</p>"}
    

    const prompt = `You are a highly professional K12 tutor. Your role is to assist students with educational queries related to K12 subjects. Based on the following input, infer the student's approximate age, grade level, and skill level (beginner, intermediate, advanced). Then, provide a broad, self-guided tutoring lesson that explains the subject area of the problem in a way that is easy to follow and calibrated to the student's inferred age and skill level. The lesson should encourage the student to ask for more details, examples, or quizzes as needed.

Input: "${text || 'No text provided'}" with images: [${images ? images.join(", ") : 'No images provided'}]

Return a JSON object with the inferred age, grade, skill level, and the tutoring lesson. Structure: {"age": "inferred age", "grade": "inferred grade", "skillLevel": "beginner|intermediate|advanced", "lesson": "<p>Lesson content...</p>"}

Ensure the response is valid JSON without any additional text, whitespace, or formatting outside the JSON object. Do not wrap the JSON in code blocks (e.g., do not use triple backticks with json). Return only the JSON object.`;

    const systemMessage = "You are a K12 tutor. Validate inputs and respond only to valid K12 queries. Always return valid JSON without extra formatting or code blocks.";

    // Call the xAI API using the utility function
    const parsedContent = await callXAI(prompt, systemMessage);

    if (parsedContent.isValid === false) {
      return NextResponse.json({ error: parsedContent.message }, { status: 400 });
    }

    return NextResponse.json(parsedContent);
  } catch (error) {
    return handleApiError(error, "tutor");
  }
}