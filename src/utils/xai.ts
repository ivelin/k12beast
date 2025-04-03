import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

interface XAIResponse {
  isK12?: boolean;
  error?: string;
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
  sessionHistory?: any;
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
 * @param options - The request options including problem, images, response format, default response, max tokens, and session history.
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
    sessionHistory = null,
    validateK12 = false,
  } = options;

  validateRequestInputs(problem, images);

  const sessionContext = sessionHistory
    ? `Session History: ${JSON.stringify(sessionHistory, null, 2)}`
    : "No session history available.";

  const prompt = `You are a highly professional K12 tutor. Your role is to assist students with educational queries related to K12 subjects. Use the provided session history to understand the student's progress, including past lessons, examples, quiz results, and performance trends. Infer the student's approximate age, grade level, and skill level (beginner, intermediate, advanced) from the session context. Adapt your response based on this history—e.g., avoid repeating examples or quiz problems already given (check the 'examples' and 'quizzes' arrays in the session history), and adjust difficulty based on performance trends (simpler content for struggling students, more challenging for those excelling).

Original Input Problem (if provided): "${problem || 'No text provided'}"

${sessionContext}

${responseFormat}

Ensure the response is valid JSON without any additional text, whitespace, or formatting outside the JSON object. Do not wrap the JSON in code blocks (e.g., do not use triple backticks with json). Return only the JSON object.`;

  const systemMessage = "You are a K12 tutor. Validate inputs and respond only to valid K12 queries using the session history for context. Always return valid JSON without extra formatting or code blocks.";

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

  if (images && images.length > 0) {
    messages.push({
      role: "user",
      content: images.map((url: string) => ({
        type: "image_url",
        image_url: { url },
      })),
    });
  }

  // Log the full request payload
  console.log("Full xAI API request:", JSON.stringify({
    model: process.env.XAI_MODEL_NAME || "grok-2-vision-1212",
    messages,
    max_tokens: maxTokens,
  }, null, 2));

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

  // Try to parse the content as JSON, fixing unescaped backslashes
  try {
    // Replace unescaped backslashes with escaped ones (e.g., \( -> \\()
    rawContent = rawContent.replace(/\\(?![\\"])/g, "\\\\");
    content = JSON.parse(rawContent);
  } catch (err) {
    // If parsing fails, treat the content as plain text and return a fallback response
    console.warn("xAI API response is not valid JSON, treating as plain text:", rawContent);
    content = {
      ...defaultResponse,
      lesson: `<p>${rawContent.replace(/\n/g, "<br>")}</p>`, // Preserve the raw content as the lesson
    };
  }

  if (validateK12 && content.isK12 === false) {
    throw new Error(content.error || "Prompt must be related to K12 education");
  }

  return content;
}