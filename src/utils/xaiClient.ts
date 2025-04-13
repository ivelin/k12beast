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
  difficulty?: "easy" | "medium" | "hard";
  encouragement?: string | null;
}

interface XAIRequestOptions {
  problem?: string;
  images?: string[];
  responseFormat: string;
  defaultResponse: XAIResponse;
  maxTokens?: number;
  chatHistory?: { role: string; content: string; renderAs?: "markdown" | "html" }[];
}

function sanitizeResponse(rawContent: string): string {
  return rawContent
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F](?=(?:(?:[^"]*"){2})*[^"]*$)/g, "")
    .trim();
}

export async function sendXAIRequest(options: XAIRequestOptions): Promise<XAIResponse> {
  const {
    problem,
    images,
    responseFormat,
    defaultResponse,
    maxTokens = 1000,
    chatHistory = [],
  } = options;

  validateRequestInputs(problem, images);

  const chatHistoryText = chatHistory.length > 0
    ? `Chat History:\n${chatHistory.map(msg =>
        `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n")}`
    : "No chat history available.";

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a K12 tutor. Assist with educational queries related to K12 subjects.
Respond in a conversational style as if you are speaking directly with a K12 student.
Use the provided chat history to understand the student's progress, including past lessons, examples, quiz results, and interactions. Infer the student's approximate age, grade level, and skill level (beginner, intermediate, advanced) from the chat history. Adapt your response based on this history—e.g., avoid repeating examples or quiz problems already given (as specified in the chat history), and adjust difficulty based on performance trends. If the chat history includes quiz responses, adjust the difficulty: provide more challenging content if the student answered correctly, or simpler content if they answered incorrectly.
Respond in the natural language used in the original input problem text and images.
Return a raw JSON object (formatted for JSON.parse()) with the response fields specified in the user prompt.
Use plain text or minimal HTML formatting (only <p>, <strong>, <ul>, <li> tags, no attributes or scripts) for any HTML content.
Ensure all quotes are properly escaped (e.g., \") and avoid raw control characters (e.g., no unescaped newlines, tabs, or other control characters except within quoted strings).
Do not wrap the JSON in Markdown code blocks (e.g., no \`\`\`json).
Ensure the response is a single, valid JSON object with no trailing commas or syntax errors.`,
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
      content: images.map((url) => ({
        type: "image_url" as const,
        image_url: { url },
      })) as OpenAI.ChatCompletionMessageParam["content"],
    });
  }

  const requestPayload = {
    model: process.env.XAI_MODEL_NAME || "grok-2-vision-1212",
    messages,
    max_tokens: maxTokens,
  };
  console.log("Full xAI API request:", JSON.stringify(requestPayload, null, 2));

  const maxRetries = 3;
  let rawContent: string | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create(requestPayload);
      console.log("Full xAI API response:", JSON.stringify(response, null, 2));

      rawContent = response.choices[0].message.content.trim();
      rawContent = sanitizeResponse(rawContent);

      const content: XAIResponse = JSON.parse(rawContent);
      console.log("xAI API response content object:", content);

      return content;
    } catch (error: unknown) {
      console.warn(`xAI request failed (attempt ${attempt}/${maxRetries}):`, (error as Error).message);
      if (attempt === maxRetries) {
        console.error("Final attempt failed. Raw response:", rawContent ?? "No response");
        console.error("Returning default response with error message.");
        return {
          ...defaultResponse,
          lesson: defaultResponse.lesson
            ? `${defaultResponse.lesson} Failed to parse API response after ${maxRetries} attempts due to invalid JSON characters.`
            : `Failed to parse API response after ${maxRetries} attempts due to invalid JSON characters.`,
        };
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return defaultResponse;
}

export { handleXAIError } from "./xaiUtils";