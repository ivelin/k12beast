import OpenAI from "openai";
import { NextResponse } from "next/server";

// Configure the OpenAI client for xAI
const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

/**
 * Calls the xAI API with the given prompt and system message, handling response extraction and cleaning.
 * @param prompt - The user prompt to send to the API.
 * @param systemMessage - The system message to set the AI's role and behavior.
 * @returns The parsed JSON response from the API.
 */
export async function callXAI(prompt: string, systemMessage: string) {
  const modelName = process.env.XAI_MODEL_NAME;
  if (!modelName) {
    throw new Error("xAI model name is not configured");
  }

  try {
    // Call the xAI API
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Log the full response for debugging
    console.log("Full xAI API response:", JSON.stringify(response, null, 2));

    // Extract the content (xAI uses the OpenAI-compatible structure)
    const content = response.choices && response.choices[0]?.message?.content;

    if (!content) {
      console.error("No content found in xAI API response:", response);
      throw new Error("No content returned from xAI API");
    }

    console.log("Raw content:", content); // Log raw content for debugging

    // Clean the response to remove potential formatting
    let cleanedContent = content.trim();
    // Remove Markdown code block markers if present
    cleanedContent = cleanedContent.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    // Remove any additional whitespace or newlines
    cleanedContent = cleanedContent.replace(/\n\s*/g, "").replace(/\r/g, "");

    // Parse the cleaned content
    let parsedContent;
    try {
      parsedContent = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Invalid JSON from xAI API:", cleanedContent);
      throw new Error("Invalid response format from xAI API");
    }

    return parsedContent;
  } catch (error) {
    console.error("Error processing xAI request:", error);
    throw error;
  }
}