// src/utils/xaiClient.ts
import OpenAI from "openai";
import { validateRequestInputs } from "./xaiUtils";

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
  readiness?: { confidenceIfCorrect: number; confidenceIfIncorrect: number };
}

interface XAIRequestOptions {
  problem?: string;
  images?: string[];
  responseFormat: string;
  defaultResponse: XAIResponse;
  maxTokens?: number;
  validateK12?: boolean;
  chatHistory?: { role: string; content: string; renderAs?: "markdown" | "html" }[];
}

function sanitizeResponse(rawContent: string): string {
  // Remove control characters (except \n, \r, \t) that are not within quoted strings
  const sanitized = rawContent
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F](?=(?:(?:[^"]*"){2})*[^"]*$)/g, "") // Remove control characters outside quotes
    .trim();
  return sanitized;
}

export async function sendXAIRequest(options: XAIRequestOptions): Promise<XAIResponse> {
  const {
    problem,
    images,
    responseFormat,
    defaultResponse,
    maxTokens = 1000,
    validateK12 = false,
    chatHistory = [],
  } = options;

  validateRequestInputs(problem, images);

  // Format the chat history
  const chatHistoryText = chatHistory.length > 0
    ? `Chat History:\n${chatHistory.map(msg =>
      `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n")}`
    : "No chat history available.";

  const messages: any[] = [
    {
      role: "system",
      content: `You are a K12 tutor. Assist with educational queries related to K12 subjects.
Respond only to valid K12 queries using the chat history for context.
Respond in a conversational style as if you are speaking directly with a K12 student.
Return a raw JSON object (formatted for JSON.parse()) with response fields in a string with plain text or minimal HTML formatting (use only <p>, <strong>, <ul>, <li> tags, no attributes or scripts).
Ensure all quotes are properly escaped (e.g., \") and avoid raw control characters (e.g., no unescaped newlines, tabs, or other control characters except within quoted strings).
Do not wrap the JSON in Markdown code blocks (e.g., no \`\`\`json).
Ensure the response is a single, valid JSON object with no trailing commas or syntax errors.`,
    },
    {
      role: "user",
      content: `Instructions: Use the provided chat history to understand the student's progress, including past lessons, examples, quiz results, and interactions. Infer the student's approximate age, grade level, and skill level (beginner, intermediate, advanced) from the chat history. Adapt your response based on this history—e.g., avoid repeating examples or quiz problems already given (as specified in the chat history), and adjust difficulty based on performance trends. If the chat history includes quiz responses, adjust the difficulty: provide more challenging content if the student answered correctly, or simpler content if they answered incorrectly.`,
    },
    {
      role: "user",
      content: `Original Input Problem (if provided): "${problem || 'No text provided'}"`,
    },
    {
      role: "user",
      content: chatHistoryText,
    },
    {
      role: "user",
      content: responseFormat,
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

  const requestPayload = {
    model: process.env.XAI_MODEL_NAME || "grok-2-vision-1212",
    messages,
    max_tokens: maxTokens,
  };
  console.log("Full xAI API request:", JSON.stringify(requestPayload, null, 2));

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create(requestPayload);
      console.log("Full xAI API response:", JSON.stringify(response, null, 2));

      let rawContent = response.choices[0].message.content.trim();

      // Sanitize the response to remove invalid control characters
      rawContent = sanitizeResponse(rawContent);

      let content: XAIResponse;
      content = JSON.parse(rawContent);

      console.log("xAI API response content object:", content);

      return content;
    } catch (error) {
      console.warn(`xAI request failed (attempt ${attempt}/${maxRetries}):`, error.message);
      if (attempt === maxRetries) {
        console.error("Final attempt failed. Raw response:", rawContent);
        console.error("Returning default response with error message.");
        return {
          ...defaultResponse,
          lesson: defaultResponse.lesson ? `${defaultResponse.lesson} Failed to parse API response after ${maxRetries} attempts due to invalid JSON characters.`
            : `Failed to parse API response after ${maxRetries} attempts due to invalid JSON characters.`,
        };
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return defaultResponse;
}

export { handleXAIError } from "./xaiUtils"; // Re-export for convenience