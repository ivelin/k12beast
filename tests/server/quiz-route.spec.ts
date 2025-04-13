import { POST } from "@/app/api/quiz/route";
import { NextRequest } from "next/server";

// Mock xaiClient
jest.mock("@/utils/xaiClient", () => jest.requireActual("./mocks/xaiClient"));

// Mock Supabase
jest.mock("@/supabase/serverClient", () => ({
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

describe("POST /api/quiz", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a quiz and update the session", async () => {
    const mockRequest = {
      headers: new Headers({ "x-session-id": "mock-session-id" }),
      json: jest.fn().mockResolvedValue({ problem: "What is 2 + 2?", images: [] }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      problem: "What is 3 + 3?",
      answerFormat: "multiple-choice",
      options: ["4", "5", "6", "7"],
      difficulty: "easy",
    });

    expect(jest.requireMock("@/supabase/serverClient").from).toHaveBeenCalledWith("sessions");
    expect(jest.requireMock("@/supabase/serverClient").update).toHaveBeenCalledWith(
      expect.objectContaining({
        quizzes: expect.arrayContaining([
          expect.objectContaining({
            problem: "What is 3 + 3?",
            correctAnswer: "6",
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
    jest.requireMock("@/supabase/serverClient").single.mockResolvedValueOnce({
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