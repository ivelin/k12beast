// File path: tests/server/mocks/xaiClient.ts
// Mock xAI client for server-side tests, supporting rich formatting features

import { jest } from '@jest/globals';

export const sendXAIRequest = jest.fn().mockImplementation((options) => {
  console.log("xAI request responseFormat:", options.responseFormat);

  if (options.responseFormat.includes("Return a JSON object with a new example problem")) {
    if (options.testFailure) {
      return Promise.resolve({
        status: 503,
        json: {
          lesson: "<p>Unable to generate example at this time.</p>",
          error: "Failed after 3 attempts due to network error: Gateway Timeout",
        },
      });
    }
    return Promise.resolve({
      problem: "Example problem",
      solution: [{ title: "Step 1", content: "Do this" }],
    });
  }

  if (options.responseFormat.includes("Return a valid JSON object with a new quiz problem")) {
    if (options.testFailure) {
      return Promise.resolve({
        status: 503,
        json: {
          lesson: "<p>Unable to generate quiz at this time.</p>",
          error: "Failed to parse API response after 3 attempts due to invalid JSON format or network error: Gateway Timeout",
        },
      });
    }
    return Promise.resolve({
      problem: "<p>Solve this math problem: What is 3 + 3? Use the formula <math>3 + 3 = ?</math>. Take a look at Figure 1, which shows the addition process.</p>",
      solution: [
        { title: "Step 1", content: "Add the numbers: 3 + 3." },
        { title: "Step 2", content: "The total is 6, as shown in Figure 1." },
      ],
      charts: [
        {
          id: "chart1",
          config: {
            type: "scatter",
            data: [{ x: [3], y: [3], mode: "markers", name: "Point (3,3)" }],
            layout: { title: "Figure 1: Addition Visualization" },
          },
        },
      ],
      answerFormat: "multiple-choice",
      options: ["A: 4", "B: 5", "C: 6", "D: 7"],
      correctAnswer: "C",
      difficulty: "easy",
      encouragementIfCorrect: "Great job! 🎉 You earned 50 XP!",
      encouragementIfIncorrect: "Nice try! 😊 Review Figure 1 and try again for 10 XP!",
      readiness: { confidenceIfCorrect: 0.92, confidenceIfIncorrect: 0.75 },
    });
  }

  if (options.responseFormat.includes("Return a JSON object with the tutoring lesson")) {
    return Promise.resolve({
      isK12: true,
      lesson: "<p>The answer to your question is simple: 4!</p>",
    });
  }

  console.warn("Unrecognized responseFormat:", options.responseFormat);
  return Promise.resolve({
    isK12: true,
    lesson: "<p>Default response for unrecognized format.</p>",
  });
});

export const handleXAIError = jest.fn((error) => ({
  status: 500,
  json: { error: error instanceof Error ? error.message : "Unexpected error" },
}));