import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

interface XAIResponse {
  isK12?: boolean;
  error?: string;
  age?: string;
  grade?: string;
  skillLevel?: string;
  lesson?: string;
  problem?: string;
  solution?: { title: string; content: string }[];
  answerFormat?: string;
  options?: string[];
  correctAnswer?: string;
}

interface XAIRequestOptions {
  problem?: string;
  images?: string[];
  responseFormat: string;
  defaultResponse: XAIResponse;
  maxTokens?: number;
  inferredAge?: string;
  inferredGrade?: string;
  inferredSkillLevel?: string;
  performanceHistory?: { isCorrect: boolean }[];
  validateK12?: boolean;
}

/**
 * Validates the request inputs for xAI API calls.
 * @param problem - The text prompt provided by the user.
 * @param images - The array of image URLs provided by the user.
 * @throws Error if the inputs are invalid.
 */
function validateRequestInputs(problem?: string, images?: string[]) {
  if (!problem && (!images || images.length === 0)) {
    throw new Error("Missing problem or images");
  }
}

/**
 * Handles errors from xAI API responses, returning an appropriate NextResponse.
 * @param error - The error object or message.
 * @returns A NextResponse with the appropriate status code and error message.
 */
export function handleXAIError(error: any) {
  console.error("Error in xAI request:", error.message);
  return NextResponse.json(
    { error: error.message || "Unexpected error in xAI request" },
    { status: error.message === "Prompt must be related to K12 education" ? 400 : 500 }
  );
}

/**
 * Sends a request to the xAI API to validate if the prompt is K12-related (if enabled) and provide the requested content.
 * @param options - The request options including problem, images, response format, default response, max tokens, and student context.
 * @returns The parsed xAI API response as a JSON object.
 * @throws Error if the prompt is not K12-related (when validation is enabled) or if the request fails.
 */
export async function sendXAIRequest(options: XAIRequestOptions): Promise<XAIResponse> {
  const {
    problem,
    images,
    responseFormat,
    defaultResponse,
    maxTokens = 1000,
    inferredAge = "unknown",
    inferredGrade = "unknown",
    inferredSkillLevel = "beginner",
    performanceHistory = [],
    validateK12 = false,
  } = options;

  // Validate inputs
  validateRequestInputs(problem, images);

  // Calculate the student's performance trend based on history
  const correctAnswers = performanceHistory.filter((entry) => entry.isCorrect).length;
  const totalAttempts = performanceHistory.length;
  const successRate = totalAttempts > 0 ? correctAnswers / totalAttempts : 0;
  const performanceTrend =
    totalAttempts === 0
      ? "No performance history available."
      : successRate >= 0.75
      ? "The student is performing well, answering most questions correctly."
      : successRate >= 0.5
      ? "The student is performing moderately, with some correct and incorrect answers."
      : "The student is struggling, answering most questions incorrectly.";

  // Construct the prompt for the xAI API
  const prompt = `You are a highly professional K12 tutor. Your role is to assist students with educational queries related to K12 subjects. Based on the following input, infer the student's approximate age, grade level, and skill level (beginner, intermediate, advanced) as needed, and provide the requested content. For examples and quizzes, adjust the difficulty based on the student's skill level (${inferredSkillLevel}) and performance trend: ${performanceTrend}. If the student is struggling, provide simpler content with more detailed explanations or more obvious correct answers. If the student is performing well, provide more challenging content within the same grade level (${inferredGrade}).

Input: "${problem || 'No text provided'}"

${responseFormat}

Ensure the response is valid JSON without any additional text, whitespace, or formatting outside the JSON object. Do not wrap the JSON in code blocks (e.g., do not use triple backticks with json). Return only the JSON object.`;

  const systemMessage = "You are a K12 tutor. Validate inputs and respond only to valid K12 queries. Always return valid JSON without extra formatting or code blocks.";

  const messages: any[] = [
    {
      role: "system",
      content: systemMessage,
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  // Add images as a separate message entry if provided
  if (images && images.length > 0) {
    messages.push({
      role: "user",
      content: images.map((url: string) => ({
        type: "image_url",
        image_url: { url },
      })),
    });
  }

  const response = await openai.chat.completions.create({
    model: process.env.XAI_MODEL_NAME || "grok-2-vision-1212",
    messages,
    max_tokens: maxTokens,
  });

  console.log("Full xAI API response:", JSON.stringify(response, null, 2));

  let content: XAIResponse;
  let rawContent = response.choices[0].message.content;

  // Strip code block markers if present (e.g., ```json\n...\n```)
  const codeBlockRegex = /^```json\n([\s\S]*?)\n```$/;
  const match = rawContent.match(codeBlockRegex);
  if (match) {
    rawContent = match[1].trim();
  }

  // Try to parse the content as JSON
  try {
    content = JSON.parse(rawContent);
  } catch (err) {
    // If parsing fails, treat the content as plain text and return the default response
    console.warn("xAI API response is not valid JSON, treating as plain text:", rawContent);
    content = {
      ...defaultResponse,
      lesson: defaultResponse.lesson ? `<p>${rawContent.replace(/\n/g, "<br>")}</p>` : undefined,
      problem: defaultResponse.problem || rawContent,
    };
  }

  if (validateK12 && content.isK12 === false) {
    throw new Error(content.error || "Prompt must be related to K12 education");
  }

  return content;
}