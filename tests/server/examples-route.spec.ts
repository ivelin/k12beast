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
  it('should return an example and update the session', async () => {
    // Mock NextRequest
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
});