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

function stripHtmlTags(text: string): string {
  const htmlTagRegex = /<\/?[^>]+(>|$)/g;
  if (htmlTagRegex.test(text)) {
    console.warn("HTML tags detected in AI response, stripping them:", text);
  }
  return text.replace(htmlTagRegex, "");
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

  const systemMessage = `You are a highly professional K12 tutor. Your role is to assist students with
educational queries related to K12 subjects. Validate inputs and respond only to valid K12 queries using
the chat history for context.

Always return valid JSON with responses in pure Markdown format (e.g., use **bold**, *italic*, - for lists).
Do not include any HTML tags (e.g., <p>, <strong>), JavaScript, extra formatting, or code blocks. Use
Markdown syntax for all formatting (e.g., **bold** instead of <strong>bold</strong>). For paragraph breaks,
use double newlines to separate paragraphs. Do not escape newlines (e.g., do not use \\n or \\n\\n; use
actual newlines instead). Ensure the response contains only the JSON object with the Markdown content in the
appropriate field (e.g., {"lesson": "Line 1\n\nLine 2"}), without additional text, whitespace, or formatting
outside the JSON object. Do not wrap the JSON in code blocks (e.g., do not use triple backticks with json).`;

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
          lesson: stripHtmlTags(rawContent),
        };
      }

      if (content.lesson) content.lesson = stripHtmlTags(content.lesson);
      if (content.error) content.error = stripHtmlTags(content.error);
      if (content.problem) content.problem = stripHtmlTags(content.problem);
      if (content.solution) {
        content.solution = content.solution.map(step => ({
          ...step,
          title: stripHtmlTags(step.title),
          content: stripHtmlTags(step.content),
        }));
      }
      if (content.options) {
        content.options = content.options.map(option => stripHtmlTags(option));
      }
      if (content.correctAnswer) content.correctAnswer = stripHtmlTags(content.correctAnswer);

      if (validateK12 && content.isK12 === false) {
        throw new Error(content.error || "Prompt must be related to K12 education");
      }

      return content;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.warn(`xAI request failed (attempt ${attempt}/${maxRetries}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}