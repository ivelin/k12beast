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
  chatHistory?: { role: string; content: string }[];
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

  const chatHistoryText = chatHistory.length > 0
    ? `Chat History:\n${chatHistory.map(msg =>
      `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n")}`
    : "No chat history available.";

  const prompt = `Original Input Problem (if provided): "${problem || 'No text provided'}"

${chatHistoryText}

${responseFormat}

Use the provided chat history to understand the student's progress, including past lessons, examples,
quiz results, and interactions. Infer the student's approximate age, grade level, and skill level
(beginner, intermediate, advanced) from the chat history. Adapt your response based on this history—e.g.,
avoid repeating examples or quiz problems already given, and adjust difficulty based on performance trends.
If the chat history includes quiz responses, adjust the difficulty: provide more challenging content if the
student answered correctly, or simpler content if they answered incorrectly.`;

  const systemMessage = `You are a K12 tutor. Assist with educational queries related to K12 subjects.
Respond only to valid K12 queries using the chat history for context. 
Respond in a conversational style as if you are speaking directly with a K12 student.
Return a raw JSON object
(formatted for JSON.parse()) with response fields in 
a string with plain text or minimal HTML formatting (use only <p>, <strong>, <ul>, <li> tags, no attributes or scripts). 
Ensure all quotes are escaped (e.g., \") and no raw control characters are included.
Do not wrap the JSON in Markdown code blocks (e.g., no \`\`\`json).
`;

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

      let content: XAIResponse;
      content = JSON.parse(rawContent);

      console.log("xAI API response content object:", content);

      return content;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.warn(`xAI request failed (attempt ${attempt}/${maxRetries}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error("Failed to get a response after maximum retries");
}