// tests/server/tutor-route.spec.ts
import { NextRequest } from 'next/server';

// Mock xaiClient using the abstracted mock
jest.mock('../../src/utils/xaiClient', () => jest.requireActual('../../tests/server/mocks/xaiClient'));

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
  it('should create a session and return a lesson', async () => {
    // Mock NextRequest with x-session-id header
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

    // Call the POST function directly
    const response = await POST(mockRequest);

    // Assertions
    expect(response.status).toBe(200);
    const responseText = await response.text();
    expect(responseText).toBe('<p>The answer to your question is simple: 4!</p>');
    expect(response.headers.get('x-session-id')).toBe('mock-session-id');
    expect(jest.requireMock('../../src/supabase/serverClient').from).toHaveBeenCalledWith('sessions');
    expect(jest.requireMock('../../src/supabase/serverClient').insert).toHaveBeenCalledWith(
      expect.objectContaining({
        problem: 'What is 2 + 2?',
        user_id: 'test-user-id',
      })
    );
  });
});