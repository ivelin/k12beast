// File path: src/utils/xaiClient.ts
// Handles requests to xAI API for generating educational content, including React Flow and Plotly diagrams.
// Updated to ensure all flow charts use vertically oriented nodes and edges for better alignment in a vertically scrolling chat interface.

import OpenAI from "openai";
import { validateRequestInputs } from "./xaiUtils";
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

  console.log("sendXAIRequest inputs:", { problem, images });
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
      - Respond in a conversational style as if speaking directly with a K12 student using emojis.
      - Use the provided chat history to understand the student's progress, including past lessons, examples, quiz results, and interactions.
      - Infer the student's approximate age, grade level, and skill level (beginner, intermediate, advanced) from the chat history.
      - Adapt your response based on this chat history—e.g., avoid repeating examples or quiz problems already given, and adjust difficulty based on performance trends.
      - If the chat history includes quiz responses, adjust the difficulty: provide more challenging problems if the student answered correctly, or simpler problems if they answered incorrectly.

    2. **Response Format**:
      - Always return a raw JSON object as a string strictly formatted for JSON.parse() with the response fields specified in the user prompt.
      - Do not include any additional text before or after the JSON object.
      - Do not wrap the JSON in Markdown code blocks (e.g., no \`\`\`json).
      - Ensure the response is a single, valid JSON object with no trailing commas or syntax errors.
      - For text fields in the JSON response follow these guidelines:
        - Use safe HTML formatting for text content (e.g., <p>, <ul>, <li>, <strong>, <em>).
        - No <script> tags or inline JavaScript.
        - Do not use Markdown formatting (e.g., no \`\`\` or \`**\`).
        - Use emojis as appropriate to enhance engagement.
        - For math formulas, chemistry equations, and other scientific notations, use MathML syntax within <math></math> tags.
        - Include charts and diagrams in a "charts" array with the following structure:
          - Each chart/diagram must be mobile device friendly and optimized for vertical scrolling.
          - Each chart has:
            - "id": Unique string identifier (e.g., "chart1").
            - "format": "plotly" for Plotly charts or "reactflow" for React Flow diagrams.
            - "config": For Plotly, an object with "data" (array of traces) and "layout" (layout options); for React Flow, an object with "nodes" (array of nodes) and "edges" (array of edges).
          - For all React Flow diagrams (including flowcharts and sequence diagrams), keep it simple and use vertically aligned nodes to represent steps or actors, and edges to represent transitions or interactions.
          - Example React Flow diagram with title (vertical orientation):
              {
                "id": "diagram1",
                "format": "reactflow",
                "title": "Figure 1: Making a PB&J Sandwich",
                "config": {
                  "nodes": [
                    { "id": "A", "data": { "label": "Get Bread" }, "position": { "x": 0, "y": 0 } },
                    { "id": "B", "data": { "label": "Spread Peanut Butter" }, "position": { "x": 0, "y": 100 } },
                    { "id": "C", "data": { "label": "Spread Jelly" }, "position": { "x": 0, "y": 200 } },
                    { "id": "D", "data": { "label": "Combine Slices" }, "position": { "x": 0, "y": 300 } }
                  ],
                  "edges": [
                    { "id": "eA-B", "source": "A", "target": "B", "label": "Step 1" },
                    { "id": "eB-C", "source": "B", "target": "C", "label": "Step 2" },
                    { "id": "eC-D", "source": "C", "target": "D", "label": "Step 3" }
                  ]
                }
              }
          - Example Plotly chart with title:
            {
              "id": "chart3",
              "format": "plotly",
              "title": "Figure 3: Distance vs. Time",
              "config": {
                "data": [
                  {
                    "x": ["0s", "1s", "2s", "3s", "4s", "5s"],
                    "y": [0, 10, 20, 30, 40, 50],
                    "type": "scatter",
                    "mode": "lines",
                    "name": "Distance (m)",
                    "line": { "color": "blue" }
                  }
                ],
                "layout": {
                  "xaxis": { "title": "Time (s)" },
                  "yaxis": { "title": "Distance (m)" }
                }
              }
            }
        - Use charts/diagrams when relevant (e.g., flowcharts for processes, graphs for data, sequence diagrams for interactions).
        - Reference charts and diagrams in text via IDs (e.g., "See Figure 1", "Reference Figure 2").
        - Ensure chart and diagram IDs are unique and sequential within the chat session.
        - Do not reference images, charts, or formulas outside this immediate prompt and response.
        - Ensure all quotes are properly escaped (e.g., \") and avoid raw control characters (e.g., no unescaped newlines, tabs, or other control characters except within quoted strings).
    3. **School Tests Alignment**:
      - Align with standardized school test formats, including technology-enhanced items (e.g., graphs, equations).
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
      content: `Verify and ensure that the response content is a string in a valid JSON format starting with { and ending with }.
      It must be able to pass JSON.parse() without any errors.
      The JSON object must follow strictly the fields in the following guidelines and examples:
      ${responseFormat}`,
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
      console.log("xAI API response sanitized content object:", rawContent);

      const content: XAIResponse = JSON.parse(rawContent);
      console.log("xAI API response JSON parsed content object:", content);

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