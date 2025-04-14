// tests/server/mocks/xaiClient.ts

export const sendXAIRequest = jest.fn().mockImplementation((options) => {
  if (options.responseFormat.includes("example problem")) {
    // Check for a failure flag in options (for testing)
    if (options.testFailure) {
      return Promise.reject(new Error("xAI API failed"));
    }
    return Promise.resolve({
      problem: "Example problem",
      solution: [{ title: "Step 1", content: "Do this" }],
    });
  }
  if (options.responseFormat.includes("quiz problem")) {
    return Promise.resolve({
      problem: "What is 3 + 3?",
      answerFormat: "multiple-choice",
      options: ["4", "5", "6", "7"],
      correctAnswer: "6",
      difficulty: "easy",
      encouragementIfCorrect: "Great job!",
      encouragementIfIncorrect: "Nice try! Let's go over the correct answer.",
      solution: [
        { title: "Step 1", content: "Add: 3 + 3." },
        { title: "Step 2", content: "Total is 6." },
      ],
      readiness: { confidenceIfCorrect: 0.5, confidenceIfIncorrect: 0.4 },
    });
  }
  return Promise.resolve({
    isK12: true,
    lesson: "<p>The answer to your question is simple: 4!</p>",
  });
});

export const handleXAIError = jest.fn((error) => ({
  status: 500,
  json: { error: error instanceof Error ? error.message : "Unexpected error" },
}));