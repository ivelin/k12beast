import { POST } from "@/app/api/validate/route";
import { NextRequest } from "next/server";

// Mock Supabase
jest.mock("@/supabase/serverClient", () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: {
      id: "mock-session-id",
      user_id: "test-user-id",
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
            { title: "Step 2", content: "Total is 5 cups." },
          ],
          difficulty: "easy",
          encouragement: "Great job!",
          encouragementIfCorrect: "Great job!",
          encouragementIfIncorrect: "Nice try! Let's review the correct answer.",
          readiness: { confidenceIfCorrect: 0.92, confidenceIfIncorrect: 0.75 },
        },
      ],
      messages: [
        { role: "user", content: "Take a Quiz", renderAs: "markdown" },
        {
          role: "assistant",
          content: `<p><strong>Quiz:</strong></p><p>How many cups of flour are in the mix now?</p>`,
          renderAs: "html",
        },
      ],
      created_at: "2025-04-13T16:34:33.276Z",
      updated_at: "2025-04-13T16:34:33.276Z",
    },
    error: null,
  }),
  update: jest.fn().mockReturnThis(),
}));

describe("/api/validate Route", () => {
  const mockSessionId = "mock-session-id";
  const mockQuizProblem = "How many cups of flour are in the mix now?";
  const mockAnswerCorrect = "5 cups";
  const mockAnswerIncorrect = "6 cups";

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the session fetch error case for the specific test
    jest.requireMock("@/supabase/serverClient").single.mockImplementation(() => ({
      data: {
        id: "mock-session-id",
        user_id: "test-user-id",
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
              { title: "Step 2", content: "Total is 5 cups." },
            ],
            difficulty: "easy",
            encouragement: "Great job!",
            encouragementIfCorrect: "Great job!",
            encouragementIfIncorrect: "Nice try! Let's review the correct answer.",
            readiness: { confidenceIfCorrect: 0.92, confidenceIfIncorrect: 0.75 },
          },
        ],
        messages: [
          { role: "user", content: "Take a Quiz", renderAs: "markdown" },
          {
            role: "assistant",
            content: `<p><strong>Quiz:</strong></p><p>How many cups of flour are in the mix now?</p>`,
            renderAs: "html",
          },
        ],
        created_at: "2025-04-13T16:34:33.276Z",
        updated_at: "2025-04-13T16:34:33.276Z",
      },
      error: null,
    }));
  });

  it("should validate quiz answer and append messages to session", async () => {
    const request = new NextRequest("http://localhost:3000/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: mockSessionId,
        problem: mockQuizProblem,
        answer: mockAnswerCorrect,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      isCorrect: true,
      encouragement: "Great job!",
      solution: [
        { title: "Step 1", content: "Add the cups: 2 + 3." },
        { title: "Step 2", content: "Total is 5 cups." },
      ],
      readiness: 0.92,
    });

    expect(jest.requireMock("@/supabase/serverClient").from).toHaveBeenCalledWith("sessions");
    expect(jest.requireMock("@/supabase/serverClient").update).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: "user", content: "Take a Quiz", renderAs: "markdown" },
          {
            role: "assistant",
            content: `<p><strong>Quiz:</strong></p><p>${mockQuizProblem}</p>`,
            renderAs: "html",
          },
          { role: "user", content: mockAnswerCorrect, renderAs: "markdown" },
          {
            role: "assistant",
            content: `<p><strong>Feedback:</strong></p><p><strong>Your Answer:</strong> ${mockAnswerCorrect}</p><p>Great job!</p><p><strong>Step 1:</strong> Add the cups: 2 + 3.</p><p><strong>Step 2:</strong> Total is 5 cups.</p><p><strong>Options:</strong></p><ul><li>4 cups</li><li>5 cups (Your answer) (Correct answer)</li><li>6 cups</li><li>7 cups</li></ul><p><strong>Test Readiness:</strong></p><div class="readiness-container"><div class="readiness-bar" style="width: 92%"></div></div><p>92%</p>`,
            renderAs: "html",
          },
        ]),
        updated_at: expect.any(String), // Allow any timestamp value
      })
    );
  });

  it("should handle incorrect quiz answer and append messages", async () => {
    const request = new NextRequest("http://localhost:3000/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: mockSessionId,
        problem: mockQuizProblem,
        answer: mockAnswerIncorrect,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      isCorrect: false,
      encouragement: "Nice try! Let's review the correct answer.",
      solution: [
        { title: "Step 1", content: "Add the cups: 2 + 3." },
        { title: "Step 2", content: "Total is 5 cups." },
      ],
      readiness: 0.75,
    });

    expect(jest.requireMock("@/supabase/serverClient").from).toHaveBeenCalledWith("sessions");
    expect(jest.requireMock("@/supabase/serverClient").update).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: "user", content: "Take a Quiz", renderAs: "markdown" },
          {
            role: "assistant",
            content: `<p><strong>Quiz:</strong></p><p>${mockQuizProblem}</p>`,
            renderAs: "html",
          },
          { role: "user", content: mockAnswerIncorrect, renderAs: "markdown" },
          {
            role: "assistant",
            content: `<p><strong>Feedback:</strong></p><p><strong>Your Answer:</strong> ${mockAnswerIncorrect}</p><p>Nice try! Let's review the correct answer.</p><p><strong>Step 1:</strong> Add the cups: 2 + 3.</p><p><strong>Step 2:</strong> Total is 5 cups.</p><p><strong>Options:</strong></p><ul><li>4 cups</li><li>5 cups (Correct answer)</li><li>6 cups (Your answer)</li><li>7 cups</li></ul><p><strong>Test Readiness:</strong></p><div class="readiness-container"><div class="readiness-bar" style="width: 75%"></div></div><p>75%</p>`,
            renderAs: "html",
          },
        ]),
        updated_at: expect.any(String), // Allow any timestamp value
      })
    );
  });

  it("should return 400 if required fields are missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: mockSessionId,
        answer: "5 cups",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      error: "Missing sessionId, problem, or answer in request",
    });
  });

  it("should return 404 if quiz is not found", async () => {
    const request = new NextRequest("http://localhost:3000/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: mockSessionId,
        problem: "Non-existent quiz",
        answer: "5 cups",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ error: "Quiz not found in session." });
  });

  it("should handle session fetch errors", async () => {
    jest.requireMock("@/supabase/serverClient").single.mockImplementationOnce(() => ({
      data: null,
      error: { message: "Database error" },
    }));

    const request = new NextRequest("http://localhost:3000/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: mockSessionId,
        problem: mockQuizProblem,
        answer: "5 cups",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ error: "Session not found. Please start a new chat session." });
  });
});