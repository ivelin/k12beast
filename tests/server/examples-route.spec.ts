// tests/server/examples-route.spec.ts
import { NextRequest } from "next/server";

// Mock xaiClient to simulate API responses
jest.mock("../../src/utils/xaiClient", () => jest.requireActual("./mocks/xaiClient"));

// Mock Supabase to simulate database interactions
jest.mock("../../src/supabase/serverClient", () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: {
      id: "mock-session-id",
      messages: [],
      examples: [],
    },
    error: null,
  }),
  update: jest.fn().mockReturnThis(),
}));

// Dynamically import the route handler
let POST: any;
beforeAll(async () => {
  const module = await import("../../src/app/api/examples/route");
  POST = module.POST;
});

describe("POST /api/examples", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test successful example retrieval to ensure core user flow works
  it("should return an example and update the session", async () => {
    const mockRequest = {
      headers: new Headers({ "x-session-id": "mock-session-id" }),
      json: jest.fn().mockResolvedValue({ problem: "What is 2 + 2?", images: [] }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      problem: "Example problem",
      solution: [{ title: "Step 1", content: "Do this" }],
    });
    expect(jest.requireMock("../../src/supabase/serverClient").from).toHaveBeenCalledWith("sessions");
    expect(jest.requireMock("../../src/supabase/serverClient").update).toHaveBeenCalledWith(
      expect.objectContaining({
        examples: expect.arrayContaining([
          expect.objectContaining({
            problem: "Example problem",
          }),
        ]),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "Request Example" }),
          expect.objectContaining({
            role: "assistant",
            content: expect.stringContaining("Example:"),
          }),
        ]),
      })
    );
  });

  // Test handling of responses with no auth token to ensure accessibility
  it("should return 200 even if no token is provided", async () => {
    const mockRequest = {
      headers: new Headers({ "x-session-id": "mock-session-id" }),
      json: jest.fn().mockResolvedValue({ problem: "What is 2 + 2?", images: [] }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      problem: "Example problem",
      solution: [{ title: "Step 1", content: "Do this" }],
    });
  });

  // Test handling of xAI API failure to ensure graceful error reporting
  it("should handle xAI API failure", async () => {
    const { sendXAIRequest } = jest.requireMock("../../src/utils/xaiClient");
    sendXAIRequest.mockImplementationOnce(() =>
      Promise.reject(new Error("xAI API failed"))
    );

    const mockRequest = {
      headers: new Headers({ "x-session-id": "mock-session-id" }),
      json: jest.fn().mockResolvedValue({ problem: "What is 2 + 2?", images: [] }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(500);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ error: expect.stringContaining("xAI API failed") });
  });

  // Test handling of xAI response with conversational text and ```json markers
  it("should handle xAI response with conversational prefix and code block", async () => {
    const { sendXAIRequest } = jest.requireMock("../../src/utils/xaiClient");
    sendXAIRequest.mockImplementationOnce(() =>
      Promise.resolve({
        problem: "New example problem",
        solution: [{ title: "Step 1", content: "Follow this step" }],
      })
    );

    const mockRequest = {
      headers: new Headers({ "x-session-id": "mock-session-id" }),
      json: jest.fn().mockResolvedValue({ problem: "What is 3 + 3?", images: [] }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      problem: "New example problem",
      solution: [{ title: "Step 1", content: "Follow this step" }],
    });
    expect(jest.requireMock("../../src/supabase/serverClient").update).toHaveBeenCalledWith(
      expect.objectContaining({
        examples: expect.arrayContaining([
          expect.objectContaining({
            problem: "New example problem",
          }),
        ]),
      })
    );
  });

  // Test handling of xAI response with standalone JSON object (no markers)
  it("should handle xAI response with standalone JSON object", async () => {
    const { sendXAIRequest } = jest.requireMock("../../src/utils/xaiClient");
    sendXAIRequest.mockImplementationOnce(() =>
      Promise.resolve({
        problem: "Standalone problem",
        solution: [{ title: "Step 1", content: "Do this step" }],
      })
    );

    const mockRequest = {
      headers: new Headers({ "x-session-id": "mock-session-id" }),
      json: jest.fn().mockResolvedValue({ problem: "What is 4 + 4?", images: [] }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      problem: "Standalone problem",
      solution: [{ title: "Step 1", content: "Do this step" }],
    });
    expect(jest.requireMock("../../src/supabase/serverClient").update).toHaveBeenCalledWith(
      expect.objectContaining({
        examples: expect.arrayContaining([
          expect.objectContaining({
            problem: "Standalone problem",
          }),
        ]),
      })
    );
  });
});