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
    const mockRequest = {
      headers: new Headers({ 'x-session-id': 'mock-session-id' }),
      json: jest.fn().mockResolvedValue({ problem: 'What is 2 + 2?', images: [] }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      problem: 'Example problem',
      solution: [{ title: 'Step 1', content: 'Do this' }],
    });
    expect(jest.requireMock('../../src/supabase/serverClient').from).toHaveBeenCalledWith('sessions');
  });

  it('should return 200 even if no token is provided (no auth enforced)', async () => {
    const mockRequest = {
      headers: new Headers({ 'x-session-id': 'mock-session-id' }), // No Authorization header
      json: jest.fn().mockResolvedValue({ problem: 'What is 2 + 2?', images: [] }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(200); // Reflects current route behavior
  });

  it('should handle xAI API failure', async () => {
    const { sendXAIRequest } = jest.requireMock('../../src/utils/xaiClient');
    sendXAIRequest.mockImplementationOnce((options) => {
      return Promise.reject(new Error('xAI API failed'));
    });

    const mockRequest = {
      headers: new Headers({ 'x-session-id': 'mock-session-id' }),
      json: jest.fn().mockResolvedValue({ problem: 'What is 2 + 2?', images: [] }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(500);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ error: 'xAI API failed' });
  });
});