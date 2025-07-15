// File path: src/utils/xaiClient.ts
// Handles requests to xAI API for generating educational content, including React Flow and Plotly diagrams.
// Ensures strict MathML syntax for <msup> tags to prevent rendering errors.
// Updated to ensure all flow charts use vertically oriented nodes and edges for better alignment in a vertically scrolling chat interface.
// Enhanced retry logic for 504 Gateway Timeout errors with improved logging for Vercel production deployments.
// Modified to return HTTP error code in default response for failed requests.
// Added mobile optimization guidelines for Plotly charts.
// Updated to remove chart title from Plotly layout to avoid duplication in UI.
// Added stricter criteria for including charts to ensure they enhance understanding for K-12 students.
// Refactored to enforce structured JSON responses from Grok 4 by strengthening the system prompt, increasing retries, simplifying sanitizer to avoid brittle regex, and logging raw responses.
// Retained full original MathML and chart guidelines/examples to preserve useful features and prevent potential regressions in response formatting.

import OpenAI from "openai";
import { validateRequestInputs } from "./xaiUtils";
import { ChartConfig } from "@/store/types";

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
  timeout: 30000,
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

// Strengthened system prompt for strict JSON compliance, retaining full original details
const SYSTEM_PROMPT_BASE = `
You are a K12 tutor. Assist with educational queries related to K12 subjects.
Follow these guidelines:

1. **Content Generation**:
  - Detect the natural language of the user input problem text and images and respond entirely in the same language.
  - Respond in a conversational style as if speaking directly with a K12 student using emojis.
  - Use the provided chat history to understand the student's progress, including past lessons, examples, quiz results, and interactions.
  - Infer the student's approximate age, grade level, and skill level (beginner, intermediate, advanced) from the chat history.
  - Adapt your response based on this chat history—e.g., avoid repeating examples or quiz problems already given, and adjust difficulty based on performance trends.
  - If the chat history includes quiz responses, adjust the difficulty: provide more challenging problems if the student answered correctly, or simpler problems if they answered incorrectly.
  - Try to keep the response length within 500 tokens most of the time. In exceptional cases, you can go up to 1000 tokens.

2. **Response Format**:
  - ALWAYS RETURN ONLY A SINGLE VALID JSON OBJECT STRING. NOTHING ELSE. NO TEXT BEFORE OR AFTER.
  - The JSON must start with { and end with }, with no extra characters, newlines outside strings, or syntax errors.
  - It MUST pass JSON.parse() without errors—test it mentally before outputting.
  - Do not wrap in Markdown, code blocks, or any formatting. No \`\`\`json or similar.
  - Escape all quotes properly inside strings (e.g., \\" for double quotes).
  - Avoid unescaped control characters (newlines, tabs) except in quoted strings where needed.
  - For text fields: Use safe HTML (e.g., <p>, <ul>), no <script>, no Markdown.
  - Use emojis sparingly in text.
  - For math formulas, chemistry equations, and other scientific notations, use MathML syntax within <math></math> tags.
    - MathML Syntax Guidelines:
          - Always use proper strictly standard compliant MathML elements for mathematical operations.
          - For fractions (division), use <mfrac> to represent the numerator and denominator, e.g., <math><mfrac><mi>x</mi><mn>2</mn></mfrac></math> for ( \frac{x}{2} ).
          - Do not use text nodes like '/' or '*' directly between elements to represent operations; instead, use <mfrac> for division, <mo>×</mo> for multiplication, <msup> for exponents, etc.
          - For exponents, use <msup> with exactly two children: the base and the exponent. Example: <math><msup><mi>e</mi><mn>3</mn></msup></math> for ( e^3 ).
          - If the base of an exponent is a complex expression (e.g., a product like ( e^3 \times d )), wrap it in an <mrow> tag, e.g., <math><msup><mrow><msup><mi>e</mi><mn>3</mn></msup><mo>×</mo><mi>d</mi></mrow><mn>2</mn></msup></math> for ( (e^3 \times d)^2 ).
          - Ensure all MathML is well-formed and will render correctly in MathJax without errors (e.g., no "Unexpected text node" or "Wrong number of children for 'msup' node" errors).
  - When relevant, use charts and diagrams with the following structure:
    - Always include charts and diagrams in a "charts" array in the JSON response.
    - Only include charts or diagrams if they provide significant educational value and directly enhance the student's understanding of the concept being taught. Follow these criteria:
      - **When to Include Charts**:
        - Use charts for problems involving data visualization (e.g., plotting functions, comparing quantities, showing trends like distance vs. time).
        - Use diagrams for processes or relationships (e.g., flowcharts for problem-solving steps, geometric diagrams for geometry problems).
      - **When NOT to Include Charts**:
        - Avoid charts that are redundant or do not add new insight (e.g., a bar chart showing the exponents in an expression unless it helps visualize a pattern).
    - Each chart/diagram must be mobile device friendly and optimized for vertical scrolling.
    - Each chart/diagram drawing should correspond to a specific reference in the text.
    - Each chart/diagram should plot figures, shapes, and functions that represent accurately any formulas, equations, or data mentioned in the text.
    - Text labels and titles should be in plain text, concise, and readable on small screens without any formatting (no HTML, no Markdown in chart and diagram labels).
    - Reference charts and diagrams in text via IDs (e.g., "See Figure 1", "Reference Figure 2").
    - Do not include HTML tags for charts and diagrams in the text.
    - Ensure chart and diagram IDs are unique and sequential within the chat session.
    - Do not reference images, charts, or formulas outside this immediate prompt and response.
    - Each chart has:
      - "id": Unique string identifier (e.g., "chart1").
      - "format": "plotly" for Plotly charts or "reactflow" for React Flow diagrams.
      - "title": A string representing the chart title (e.g., "Figure 1: Distance vs. Time"), which will be rendered separately in the UI.
      - "config": For Plotly, an object with "data" (array of traces) and "layout" (layout options); for React Flow, an object with "nodes" (array of nodes) and "edges" (array of edges).
    - For all React Flow diagrams (including flowcharts and sequence diagrams):
      - Keep it simple and use vertically aligned nodes to represent steps or actors, and edges to represent transitions or interactions.
      - Make sure the edges have clearly visible direction arrows to indicate the flow of the process.
    - For all Plotly charts:
      - Optimize for mobile devices:
        - Use simple chart types (e.g., scatter, bar, line) and avoid complex shapes unless necessary.
        - Ensure the chart fits within a 600px width for mobile screens.
        - Minimize data points to improve rendering performance (e.g., fewer than 100 points for scatter plots).
      - Do not include the chart title in the "layout" object, as the title is already provided in the "title" field and will be rendered separately in the UI.
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
    - Example Plotly chart with title (appropriate use case for a chart):
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
            "font": { "size": 14 },
            "xaxis": { "title": "Time (s)", "tickfont": { "size": 12 } },
            "yaxis": { "title": "Distance (m)", "tickfont": { "size": 12 } }
          }
        }
      }
    - Example Plotly chart with complex functions (appropriate use case for a chart):
      {
        "id": "chart4",
        "format": "plotly",
        "title": "Figure 4: Polynomial Function",
        "config": {
          "data": [
            {
              "id": "polynomial",
              "type": "scatter",
              "mode": "lines",
              "x": [
                // Generated using numpy.linspace(-5, 5, 100)
                -5.0, -4.899, ..., 4.899, 5.0
              ],
              "y": [
                // Generated using 0.01*x**3 - 0.1*x**2 + 0.5*x
                -2.250, -2.096, ..., 2.096, 2.250
              ],
              "name": "Cubic Polynomial",
              "line": {"color": "orange", "width": 2}
            }
          ],
          "layout": {
            "shapes": [
              {
                "id": "polygon",
                "type": "path",
                "path": "M -2,0 L 0,1 L 2,0 L 0,-1 Z", // Triangle-like polygon
                "line": {"color": "blue", "width": 2},
                "fillcolor": "rgba(0, 0, 255, 0.2)"
              }
            ],
            "font": { "size": 14 },
            "xaxis": {"title": "X", "range": [-6, 6], "tickfont": { "size": 12 }},
            "yaxis": {"title": "Y", "range": [-3, 3], "tickfont": { "size": 12 }},
            "showlegend": true
          }
        }
      }
  - Ensure all quotes are properly escaped (e.g., \") and avoid raw control characters (e.g., no unescaped newlines, tabs, or other control characters except within quoted strings).
3. **School Tests Alignment**:
  - Align with standardized school test formats, including technology-enhanced items (e.g., graphs, equations).
  - Use examples and visualizations relevant to grades K-12.
`;

// Simplified sanitizer to avoid brittle regex: trim, extract core JSON block by finding braces
function sanitizeResponse(rawContent: string): string {
  let cleaned = rawContent.trim();
  // Remove common wrappers like ```json ... ```
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7).trim();
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3).trim();
  }
  // Find the first { and last } to extract the JSON object
  const startIndex = cleaned.indexOf('{');
  const endIndex = cleaned.lastIndexOf('}') + 1;
  if (startIndex >= 0 && endIndex > startIndex) {
    cleaned = cleaned.substring(startIndex, endIndex);
  }
  // Basic fix for trailing commas: remove comma before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  return cleaned;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendXAIRequest(options: XAIRequestOptions): Promise<
  XAIResponse | { status: number; json: XAIResponse }
> {
  const {
    problem,
    images,
    responseFormat,
    defaultResponse,
    maxTokens = 10000, // support up to 10000 tokens conservatively in case the AI response exceeds the limit in the prompt instructions
    chatHistory = [],
    sessionId,
    userId,
  } = options;
  console.log("sendXAIRequest inputs:", { problem, images, sessionId, userId });
  validateRequestInputs(problem, images);

  const chatHistoryText = chatHistory.length > 0
    ? `Chat History:\n${chatHistory.map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n")}`
    : "No chat history available.";

  const messages: OpenAI.Chat.CompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT_BASE },
    { role: "user", content: `Original Input Problem (if provided): "${problem || "No text provided"}"` },
    { role: "user", content: chatHistoryText },
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
      content: images.map((url) => ({ type: "image_url", image_url: { url } })),
    } as any); // Type assertion for multi-modal content
  }

  const requestPayload = {
    model: process.env.XAI_MODEL_NAME || "grok-4-latest",
    messages,
    max_tokens: maxTokens,
  };
  console.log("Full xAI API request:", JSON.stringify(requestPayload, null, 2));

  const maxRetries = 5; // Increased for Grok 4
  const retryableStatusCodes = [504]; // Retry specifically for Gateway Timeout
  let rawContent: string | undefined;
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create(requestPayload);
      console.log("Full xAI API response:", JSON.stringify(response, null, 2));

      rawContent = response.choices[0].message.content.trim();
      console.log("xAI API raw response content:", rawContent);

      const sanitized = sanitizeResponse(rawContent);
      console.log("xAI API sanitized content:", sanitized);

      const content: XAIResponse = JSON.parse(sanitized);
      console.log("xAI API parsed content:", content);

      return content;
    } catch (error: any) {
      lastError = error;
      const isRetryable = retryableStatusCodes.includes(error.status);
      const backoff = Math.pow(2, attempt - 1) * 1000;  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      console.warn(
        `xAI request failed (attempt ${attempt}/${maxRetries}): ${error.message}. ` +
        `Status: ${error.status || "unknown"}. ` +
        `${isRetryable ? `Retrying after ${backoff}ms...` : "Not retryable."}`
      );

      if (isRetryable && attempt < maxRetries) {
        await sleep(backoff);
        continue;
      }

      console.error("Final attempt failed. Raw response:", rawContent ?? "No response");
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        stack: error.stack,
      });
      console.error("Returning default response with HTTP error status.");
      const errorMessage = lastError.message || "Unknown error";
      return {
        status: 503, // Service Unavailable due to network error with xAI API
        json: {
          ...defaultResponse,
          error: defaultResponse.error
            ? `${defaultResponse.error} Failed to parse API response after ${maxRetries} attempts due to invalid JSON format or network error: ${errorMessage}`
            : `Failed to parse API response after ${maxRetries} attempts due to invalid JSON format or network error: ${errorMessage}`,
        },
      };
    }
  }

  console.error("All attempts failed. Returning default response with HTTP error status.");
  const finalErrorMessage = lastError?.message || "Unknown error";
  return {
    status: 503, // Service Unavailable due to network error with xAI API
    json: {
      ...defaultResponse,
      error: defaultResponse.error
        ? `${defaultResponse.error} Failed after ${maxRetries} attempts due to network error: ${finalErrorMessage}`
        : `Failed after ${maxRetries} attempts due to network error: ${finalErrorMessage}`,
    },
  };
}

export { handleXAIError } from "./xaiUtils";