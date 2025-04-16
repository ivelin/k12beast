// File path: tests/server/session-clone-route.spec.ts
// Tests the session cloning API route to ensure proper initialization of session data

import { POST } from '@/app/api/session/clone/[sessionId]/route';
import { NextRequest } from 'next/server';

// Mock Supabase
jest.mock('@/supabase/serverClient', () => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: {
      id: 'mock-session-id',
      user_id: 'test-user-id',
      problem: 'What is 2 + 2?',
      images: [],
      lesson: '<p>Lesson: Adding numbers.</p>',
      messages: [],
      examples: [],
      quizzes: [],
      performanceHistory: null,
      notes: null,
      created_at: '2025-04-15T22:46:59.123Z',
      updated_at: '2025-04-15T22:46:59.123Z',
      cloned_from: null,
    },
    error: null,
  }),
  insert: jest.fn().mockReturnThis(),
}));

// Mock uuid to return a predictable session ID
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-new-session-id'),
}));

describe('POST /api/session/clone/[sessionId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clone a session and copy messages without modification', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/session/clone/mock-session-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'supabase-auth-token=mock-token', // Set the cookie via the Cookie header
      },
    });

    const response = await POST(mockRequest, { params: Promise.resolve({ sessionId: 'mock-session-id' }) });
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      sessionId: 'mock-new-session-id',
    });

    // Verify that the cloned session was inserted with the original messages (empty in this case)
    expect(jest.requireMock('@/supabase/serverClient').insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mock-new-session-id',
        problem: 'What is 2 + 2?',
        lesson: '<p>Lesson: Adding numbers.</p>',
        messages: [], // Messages are copied as-is (empty)
        cloned_from: 'mock-session-id',
        user_id: 'test-user-id',
      })
    );
  });

  it('should return 404 if the original session is not found', async () => {
    // Update the mock to return an error for this test
    jest.requireMock('@/supabase/serverClient').single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Session not found' },
    });

    const mockRequest = new NextRequest('http://localhost:3000/api/session/clone/mock-session-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'supabase-auth-token=mock-token', // Set the cookie via the Cookie header
      },
    });

    const response = await POST(mockRequest, { params: Promise.resolve({ sessionId: 'mock-session-id' }) });
    expect(response.status).toBe(404);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ error: 'Session not found.' });
  });
});