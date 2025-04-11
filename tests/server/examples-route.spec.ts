// tests/server/examples-route.spec.ts
import { NextRequest } from 'next/server';

// Mock xaiClient using the abstracted mock
jest.mock('../../src/utils/xaiClient', () => jest.requireActual('../../tests/server/mocks/xaiClient'));

// Mock Supabase
jest.mock('../../src/supabase/serverClient', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: {
      id: 'mock-session-id',
      user_id: 'user123',
      problem: 'What is 2 + 2?',
      images: [],
      messages: [],
      examples: [],
    },
    error: null,
  }),
  update: jest.fn().mockReturnThis(),
}));

// Dynamically import the route
let POST: any;
beforeAll(async () => {
  const module = await import('../../src/app/api/examples/route');
  POST = module.POST;
});

describe('POST /api/examples', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an example and update the session', async () => {
    // Mock NextRequest with authentication token
    const mockRequest = {
      headers: new Headers({
        'x-session-id': 'mock-session-id',
        'Authorization': 'Bearer token123',
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
    expect(responseBody).toEqual({
      problem: 'Example problem',
      solution: [{ title: 'Step 1', content: 'Do this' }],
    });
    expect(jest.requireMock('../../src/supabase/serverClient').from).toHaveBeenCalledWith('sessions');
    expect(jest.requireMock('../../src/supabase/serverClient').update).toHaveBeenCalledWith(
      expect.objectContaining({
        examples: expect.arrayContaining([
          { problem: 'Example problem', solution: [{ title: 'Step 1', content: 'Do this' }] },
        ]),
      })
    );
  });

  it('should return 401 if no token is provided', async () => {
    // Mock NextRequest without authentication token
    const mockRequest = {
      headers: new Headers({
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
    expect(response.status).toBe(401);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ error: "No token provided" });
  });

  it('should handle xAI API failure', async () => {
    // Mock Supabase auth and session fetch
    jest.requireMock('../../src/supabase/serverClient').single.mockResolvedValue({
      data: {
        id: 'mock-session-id',
        user_id: 'user123',
        problem: 'What is 2 + 2?',
        images: [],
        messages: [],
        examples: [],
      },
      error: null,
    });

    // Mock xAI API failure
    jest.requireMock('../../src/utils/xaiClient').sendXAIRequest.mockRejectedValue(new Error('xAI API failed'));

    // Mock NextRequest
    const mockRequest = {
      headers: new Headers({
        'x-session-id': 'mock-session-id',
        'Authorization': 'Bearer token123',
      }),
      json: jest.fn().mockResolvedValue({
        problem: 'What is 2 + 2?',
        images: [],
      }),
    } as unknown as NextRequest;

    // Call the POST function
    const response = await POST(mockRequest);

    // Assertions
    expect(response.status).toBe(500);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ error: "Failed to fetch examples" });
  });
});