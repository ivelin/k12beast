// tests/server/validate-route.spec.ts
import { v4 as uuidv4 } from "uuid";
import { POST } from "../../src/app/api/validate/route";

// Mock Supabase
jest.mock('../../src/supabase/serverClient', () => {
  const mockSession = {
    id: 'mock-session-id',
    problem: "2+3",
    images: [],
    lesson: "Test lesson",
    examples: [],
    quizzes: [
      {
        problem: "How many cups of flour are in the mix now?",
        answerFormat: "multiple-choice",
        options: ["4 cups", "5 cups", "6 cups", "7 cups"],
        correctAnswer: "5 cups",
        solution: [
          { title: "Step 1", content: "Add the cups: 2 + 3." },
          { title: "Step 2", content: "The total is 5 cups." },
        ],
        difficulty: "easy",
        encouragement: "Great job!",
        readiness: { confidenceIfCorrect: 0.92, confidenceIfIncorrect: 0.75 },
      },
    ],
    messages: [
      { role: "user", content: "Take a Quiz", renderAs: "markdown" },
      {
        role: "assistant",
        content: "<p><strong>Quiz:</strong></p><p>How many cups of flour are in the mix now?</p>",
        renderAs: "html",
      },
    ],
    user_id: "test-user-id",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => ({
      data: mockSession,
      error: null,
    })),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  };
});

describe("/api/validate Route", () => {
  let sessionId: string;

  beforeEach(() => {
    sessionId = 'mock-session-id';
    jest.clearAllMocks();
  });

  test("should validate quiz answer and append messages to session", async () => {
    const requestBody = {
      sessionId,
      problem: "How many cups of flour are in the mix now?",
      answer: "5 cups",
    };

    const request = new Request("http://localhost:3000/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      isCorrect: true,
      commentary: "Great job! You got it right!",
      solution: [
        { title: "Step 1", content: "Add the cups: 2 + 3." },
        { title: "Step 2", content: "The total is 5 cups." },
      ],
      readiness: { confidenceIfCorrect: 0.92, confidenceIfIncorrect: 0.75 },
    });

    expect(jest.requireMock('../../src/supabase/serverClient').update)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: "5 cups",
              renderAs: "markdown",
            }),
            expect.objectContaining({
              role: "assistant",
              content: expect.stringContaining("Great job! You got it right!"),
              renderAs: "html",
            }),
          ]),
        })
      );
  });

  test("should handle incorrect quiz answer and append messages", async () => {
    const requestBody = {
      sessionId,
      problem: "How many cups of flour are in the mix now?",
      answer: "6 cups",
    };

    const request = new Request("http://localhost:3000/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      isCorrect: false,
      commentary: "Nice try! Let's go over the correct answer.",
      solution: [
        { title: "Step 1", content: "Add the cups: 2 + 3." },
        { title: "Step 2", content: "The total is 5 cups." },
      ],
      readiness: { confidenceIfCorrect: 0.92, confidenceIfIncorrect: 0.75 },
    });

    expect(jest.requireMock('../../src/supabase/serverClient').update)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: "6 cups",
              renderAs: "markdown",
            }),
            expect.objectContaining({
              role: "assistant",
              content: expect.stringContaining("Nice try! Let's go over the correct answer."),
              renderAs: "html",
            }),
          ]),
        })
      );
  });

  test("should return 404 if quiz not found", async () => {
    const requestBody = {
      sessionId,
      problem: "Non-existent quiz",
      answer: "5 cups",
    };

    const request = new Request("http://localhost:3000/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ error: "Quiz not found in session." });
  });
});