// File path: tests/server/xaiClient.spec.ts
// Unit tests for xAI client utilities

import { jest } from '@jest/globals';

// Mock the xaiClient module to use the mock implementation
jest.mock("../../src/utils/xaiClient", () => jest.requireActual("./mocks/xaiClient"));

import { sendXAIRequest } from "../../src/utils/xaiClient";

describe("xAI Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return quiz response on success", async () => {
    const options = {
      problem: "What is 3 + 3?",
      responseFormat: "Return a valid JSON object with a new quiz problem",
      defaultResponse: { lesson: "<p>Unable to generate quiz at this time.</p>" },
    };

    const response = await sendXAIRequest(options);

    expect(response).toEqual({
      problem: expect.stringContaining("Solve this math problem: What is 3 + 3?"),
      solution: expect.arrayContaining([
        { title: "Step 1", content: "Add the numbers: 3 + 3." },
        { title: "Step 2", content: "The total is 6, as shown in Figure 1." },
      ]),
      charts: expect.arrayContaining([
        {
          id: "chart1",
          config: {
            type: "scatter",
            data: [{ x: [3], y: [3], mode: "markers", name: "Point (3,3)" }],
            layout: { title: "Figure 1: Addition Visualization" },
          },
        },
      ]),
      answerFormat: "multiple-choice",
      options: ["A: 4", "B: 5", "C: 6", "D: 7"],
      correctAnswer: "C",
      difficulty: "easy",
      encouragementIfCorrect: "Great job! 🎉 You earned 50 XP!",
      encouragementIfIncorrect: "Nice try! 😊 Review Figure 1 and try again for 10 XP!",
      readiness: { confidenceIfCorrect: 0.92, confidenceIfIncorrect: 0.75 },
    });
  });

  it("should return default response with HTTP error status on repeated 504 errors", async () => {
    const options = {
      problem: "What is 3 + 3?",
      responseFormat: "Return a valid JSON object with a new quiz problem",
      defaultResponse: { lesson: "<p>Unable to generate quiz at this time.</p>" },
      testFailure: true,
    };
  
    const response = await sendXAIRequest(options);
  
    expect(response).toEqual({
      status: 503,
      json: {
        lesson: "<p>Unable to generate quiz at this time.</p>",
        error: expect.stringContaining("Failed to parse API response after 3 attempts due to invalid JSON format or network error: Gateway Timeout"),
      },
    });
  }, 10000);
});