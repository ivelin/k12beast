/* src/utils/xaiClient.ts
 * Handles requests to xAI API for generating educational content.
 */

import OpenAI from "openai";
import { validateRequestInputs } from "./xaiUtils";
import { ChartConfiguration } from "chart.js";
import { ChartConfig } from "@/store/types";
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
  charts?: ChartConfig[]; 
  answerFormat?: string;
  options?: string[];
  correctAnswer?: string;
  readiness?: { confidenceIfCorrect: number; confidenceIfIncorrect: number };
  difficulty?: "easy" | "medium" | "hard";
  encouragement?: string | null;
  encouragementIfCorrect?: string;
  encouragementIfIncorrect?: string;
  }

interface XAIRequestOptions {
  problem?: string;
  images?: string[];
  responseFormat: string;
  defaultResponse: XAIResponse;
  maxTokens?: number;
  chatHistory?: { role: string; content: string; renderAs?: "markdown" | "html" }[];
  sessionId?: string;
  userId?: string;
}

// Sanitize raw API response to extract valid JSON, removing invalid characters and extraneous text
function sanitizeResponse(rawContent: string): string {
  // Remove control characters outside quotes
  let cleaned = rawContent.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F](?=(?:(?:[^"]*"){2})*[^"]*$)/g,
    ""
  );

  // Extract content between ```json and ```, or the first valid JSON object if no markers
  const jsonMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/) || cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[1] || jsonMatch[0];
  }

  return cleaned.trim();
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

  console.log("sendXAIRequest inputs:", { problem, images }); // Log inputs for debugging
  validateRequestInputs(problem, images);

  const chatHistoryText =
    chatHistory.length > 0
      ? `Chat History:\n${chatHistory
          .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n")}`
      : "No chat history available.";

  const systemResponse = `You are a K12 tutor. Assist with educational queries related to K12 subjects.
      Follow these guidelines:

      1. **Content Generation**:
        - Detect the natural language of the user input problem text and images and respond entirely in the same language.
        - Respond in a conversational style as if you are speaking directly with a K12 student using emojis.
        - Use the provided chat history to understand the student's progress, including past lessons, examples, quiz results, and interactions. 
        - Infer the student's approximate age, grade level, and skill level (beginner, intermediate, advanced) from the chat history. 
        - Adapt your response based on this chat history—e.g., avoid repeating examples or quiz problems already given (as specified in the chat history), and adjust difficulty based on performance trends. 
        - If the chat history includes quiz responses, adjust the difficulty: provide more challenging content if the student answered correctly, or simpler content if they answered incorrectly.

      2. **Response Format**:
        - Always return a raw JSON object (formatted for JSON.parse()) with the response fields specified in the user prompt.
        - Do not wrap the JSON in Markdown code blocks (e.g., no \`\`\`json).
        - Ensure the response is a single, valid JSON object with no trailing commas or syntax errors.
        - For text content fields in the JSON response follow these guidelines:
          - Use safe HTML formatting for text content. No script tags or inline JavaScript.
          - Use emojis as appropriate to enhance engagement.
          - Use charts, graphs, formulas and other visual aids to enhance explanations when appropriate.
          - For math formulas, chemistry equations, and other scientific notations, use MathML syntax <math>...</math>.
          - For charts and graphs (e.g., bar charts, line graphs, geometry shapes) use Chart.js compatible code as follows:
            - Include a <canvas> tag in the HTML content with a unique id (e.g., <canvas id="chart1"></canvas>). 
            - Do not include <script> tags or inline JavaScript in the HTML. Instead, provide the Chart.js configuration in a separate "charts" field in the outer JSON response structure.
            - Ensure all charts labels are in the same language as the problem using plain and safe text format.
          - Reference charts and diagrams in the response via numeric IDs (e.g., "See Chart 1" or "Refer to Diagram 2") and provide the corresponding <canvas> tag in the HTML content.
          - Do not reference images, charts, diagrams and formulas outside of this immediate prompt and response.
          - Ensure all quotes are properly escaped (e.g., \") and avoid raw control characters (e.g., no unescaped newlines, tabs, or other control characters except within quoted strings).

      3. **School Tests Alignment**:
        - Align content with standardized school test formats, including technology-enhanced items (e.g., graphs, equations).
        - Use examples and visualizations relevant to grades K-12.
    `;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemResponse,
    },
    {
      role: "user",
      content: `Original Input Problem (if provided): "${problem || "No text provided"}"`,
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
      console.warn(
        `xAI request failed (attempt ${attempt}/${maxRetries}):`,
        (error as Error).message
      );
      if (attempt === maxRetries) {
        console.error("Final attempt failed. Raw response:", rawContent ?? "No response");
        console.error("Returning default response with error message.");
        return {
          ...defaultResponse,
          lesson: defaultResponse.lesson
            ? `${defaultResponse.lesson} Failed to parse API response after ${maxRetries} attempts due to invalid JSON format.`
            : `Failed to parse API response after ${maxRetries} attempts due to invalid JSON format.`,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return defaultResponse;
}

export { handleXAIError } from "./xaiUtils";