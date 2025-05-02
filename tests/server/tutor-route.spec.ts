// tests/server/tutor-route.spec.ts
// Tests the /api/tutor route for creating tutoring sessions and handling errors

import { NextRequest } from 'next/server';

// Mock xaiClient to simulate xAI API responses
jest.mock('../../src/utils/xaiClient', () => jest.requireActual('./mocks/xaiClient'));

// Mock Supabase to simulate database interactions
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

// Dynamically import the route handler
let POST: any;
beforeAll(async () => {
  const module = await import('../../src/app/api/tutor/route');
  POST = module.POST;
});

describe('POST /api/tutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a session and return a lesson for K12-related problem', async () => {
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

  it('should return 400 with error for non-K12-related problem', async () => {
    // Mock xaiClient to return a non-K12 response
    const { sendXAIRequest } = jest.requireMock('../../src/utils/xaiClient');
    sendXAIRequest.mockImplementationOnce(() =>
      Promise.resolve({
        isK12: false,
        error: 'This question is not related to K12 education.',
      })
    );

    // Mock NextRequest
    const mockRequest = {
      headers: new Headers({
        Authorization: 'Bearer mock-token',
        'x-session-id': 'mock-session-id',
      }),
      json: jest.fn().mockResolvedValue({
        problem: 'What is the stock market?',
        images: [],
      }),
    } as unknown as NextRequest;

    // Call the POST function
    const response = await POST(mockRequest);

    // Assertions
    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      error: 'This question is not related to K12 education.',
      terminateSession: true,
    });
    // Verify that no session was created
    expect(jest.requireMock('../../src/supabase/serverClient').upsert).not.toHaveBeenCalled();
    expect(jest.requireMock('../../src/supabase/serverClient').update).not.toHaveBeenCalled();
  });

  it('should return 500 with error for K12-related problem with missing lesson', async () => {
    // Mock xaiClient to return a K12 response with no lesson
    const { sendXAIRequest } = jest.requireMock('../../src/utils/xaiClient');
    sendXAIRequest.mockImplementationOnce(() =>
      Promise.resolve({
        isK12: true,
        lesson: '',
        charts: [],
      })
    );

    // Mock NextRequest
    const mockRequest = {
      headers: new Headers({
        Authorization: 'Bearer mock-token',
        'x-session-id': 'mock-session-id',
      }),
      json: jest.fn().mockResolvedValue({
        problem: 'What is 3 + 3?',
        images: [],
      }),
    } as unknown as NextRequest;

    // Call the POST function
    const response = await POST(mockRequest);

    // Assertions
    expect(response.status).toBe(500);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      error: 'Ooops! No lesson content returned. The AI may be snoozing. Let\'s try again in a few moments.',
    });
    // Verify that no session was created
    expect(jest.requireMock('../../src/supabase/serverClient').upsert).not.toHaveBeenCalled();
    expect(jest.requireMock('../../src/supabase/serverClient').update).not.toHaveBeenCalled();
  });
});