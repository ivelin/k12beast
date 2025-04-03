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

  const requestPayload = {
    model: process.env.XAI_MODEL_NAME || "grok-2-vision-1212",
    messages,
    max_tokens: maxTokens,
  };
  console.log("Full xAI API request:", JSON.stringify(requestPayload, null, 2));

  // Retry logic: up to 3 attempts with 1-second delay
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create(requestPayload);
      console.log("Full xAI API response:", JSON.stringify(response, null, 2));

      let content: XAIResponse;
      let rawContent = response.choices[0].message.content;

      const codeBlockRegex = /^```json\n([\s\S]*?)\n```$/;
      const match = rawContent.match(codeBlockRegex);
      if (match) {
        rawContent = match[1].trim();
      }

      try {
        rawContent = rawContent.replace(/\\(?![\\"])/g, "\\\\");
        content = JSON.parse(rawContent);
      } catch (err) {
        console.warn("xAI API response is not valid JSON, treating as plain text:", rawContent);
        content = {
          ...defaultResponse,
          lesson: `<p>${rawContent.replace(/\n/g, "<br>")}</p>`,
        };
      }

      if (validateK12 && content.isK12 === false) {
        throw new Error(content.error || "Prompt must be related to K12 education");
      }

      return content;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.warn(`xAI request failed (attempt ${attempt}/${maxRetries}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
    }
  }
}