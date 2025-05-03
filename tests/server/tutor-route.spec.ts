// File path: tests/server/tutor-route.spec.ts
// Tests the tutor API route to ensure proper lesson generation and session updates
// Updated to include a test for non-K12 prompts

import { NextRequest } from 'next/server';

// Mock xaiClient
jest.mock('../../src/utils/xaiClient', () => jest.requireActual('./mocks/xaiClient'));

// Mock Supabase
jest.mock('../../src/supabase/serverClient', () => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
  },
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: { id: 'mock-session-id' },
    error: null,
  }),
}));

// Dynamically import the route
let POST: any;
beforeAll(async () => {
  const module = await import('../../src/app/api/tutor/route');
  POST = module.POST;
});

describe('POST /api/tutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a session and return a lesson for K12 prompt', async () => {
    // Mock NextRequest
    const mockRequest = {
      headers: new Headers({
        Authorization: 'Bearer mock-token',
        'x-session-id': 'mock-session-id',
      }),
      json: jest.fn().mockResolvedValue({
        problem: 'What is 2 + 2?',
        images: [],
      }),
    } as unknown as NextRequest;

    // Call the POST function
    const response = await POST(mockRequest);

    // Assertions
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody.isK12).toBe(true);
    expect(responseBody.lesson).toBe('<p>The answer to your question is simple: 4!</p>');
    expect(response.headers.get('x-session-id')).toBe('mock-session-id');
    expect(jest.requireMock('../../src/supabase/serverClient').upsert)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mock-session-id',
          problem: 'What is 2 + 2?',
          user_id: 'test-user-id',
        }),
        { onConflict: "id" }
      );
    expect(jest.requireMock('../../src/supabase/serverClient').update)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          lesson: JSON.stringify({
            isK12: true,
            lesson: '<p>The answer to your question is simple: 4!</p>',
          }),
          updated_at: expect.any(String),
        })
      );
  });

  it('should return non-K12 response without creating a session', async () => {
    // Mock xaiClient to return a non-K12 response
    const { sendXAIRequest } = jest.requireMock('../../src/utils/xaiClient');
    sendXAIRequest.mockImplementationOnce(() =>
      Promise.resolve({
        isK12: false,
        error: "The input 'How are you?' is not related to K12 education.",
      })
    );

    // Mock NextRequest
    const mockRequest = {
      headers: new Headers({
        Authorization: 'Bearer mock-token',
        'x-session-id': 'mock-session-id',
      }),
      json: jest.fn().mockResolvedValue({
        problem: 'How are you?',
        images: [],
      }),
    } as unknown as NextRequest;

    // Call the POST function
    const response = await POST(mockRequest);

    // Assertions
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      isK12: false,
      error: "The input 'How are you?' is not related to K12 education.",
    });
    expect(response.headers.get('x-session-id')).toBe('mock-session-id');
    // Verify no session was created
    expect(jest.requireMock('../../src/supabase/serverClient').upsert).not.toHaveBeenCalled();
    expect(jest.requireMock('../../src/supabase/serverClient').update).not.toHaveBeenCalled();
  });
});