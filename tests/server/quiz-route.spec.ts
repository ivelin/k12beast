// File path: tests/server/quiz-route.spec.ts
import { NextRequest } from "next/server";

jest.mock("../../src/utils/xaiClient", () => jest.requireActual("./mocks/xaiClient"));

jest.mock("../../src/supabase/serverClient", () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: {
      id: "mock-session-id",
      user_id: "test-user-id",
      problem: "What is 2 + 2?",
      images: [],
      messages: [],
      quizzes: [],
      created_at: "2025-04-13T16:34:33.276Z",
      updated_at: "2025-04-13T16:34:33.276Z",
    },
    error: null,
  }),
  update: jest.fn().mockReturnThis(),
}));

let POST: any;
beforeAll(async () => {
  const module = await import("../../src/app/api/quiz/route");
  POST = module.POST;
});

describe("POST /api/quiz", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a quiz and update the session", async () => {
    const mockRequest = {
      headers: new Headers({ "x-session-id": "mock-session-id" }),
      json: jest.fn().mockResolvedValue({ responseFormat: "quiz problem"}),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual(
      expect.objectContaining({
        problem: expect.stringContaining("What is 3 + 3?"),
        answerFormat: "multiple-choice",
        options: ["A: 4", "B: 5", "C: 6", "D: 7"],
        difficulty: "easy",
        charts: expect.arrayContaining([
          expect.objectContaining({
            id: "chart1",
            config: expect.any(Object),
          }),
        ]),
      })
    );

    expect(jest.requireMock("../../src/supabase/serverClient").from).toHaveBeenCalledWith("sessions");
    expect(jest.requireMock("../../src/supabase/serverClient").update).toHaveBeenCalledWith(
      expect.objectContaining({
        quizzes: expect.arrayContaining([
          expect.objectContaining({
            problem: expect.stringContaining("What is 3 + 3?"),
            correctAnswer: "C",
            charts: expect.any(Array),
          }),
        ]),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "Take a Quiz" }),
          expect.objectContaining({
            role: "assistant",
            content: expect.stringContaining("Quiz:"),
          }),
        ]),
      })
    );
  });

  it("should return 400 if session ID is missing", async () => {
    const mockRequest = {
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ problem: "What is 2 + 2?", images: [] }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      error: "A valid session is required to request a quiz. Please start a new chat session.",
    });
  });

  it("should handle session fetch errors", async () => {
    jest.requireMock("../../src/supabase/serverClient").single.mockResolvedValueOnce({
      data: null,
      error: { message: "Database error" },
    });

    const mockRequest = {
      headers: new Headers({ "x-session-id": "mock-session-id" }),
      json: jest.fn().mockResolvedValue({ problem: "What is 2 + 2?", images: [] }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(404);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      error: "Session not found. Please start a new chat session.",
    });
  });
});