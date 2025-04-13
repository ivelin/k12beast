// tests/server/quiz-route.spec.ts
import { NextRequest } from 'next/server';

// Mock xaiClient using the abstracted mock
jest.mock('../../src/utils/xaiClient', () => jest.requireActual('./mocks/xaiClient'));

// Mock Supabase
jest.mock('../../src/supabase/serverClient', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: {
      id: 'mock-session-id',
      messages: [],
      quizzes: [],
    },
    error: null,
  }),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
}));

// Dynamically import the route
let POST: any;
beforeAll(async () => {
  const module = await import('../../src/app/api/quiz/route');
  POST = module.POST;
});

describe('POST /api/quiz', () => {
  it('should return a quiz and update the session', async () => {
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

    // Mock xaiClient for quiz response
    const { sendXAIRequest } = jest.requireMock('../../src/utils/xaiClient');
    sendXAIRequest.mockResolvedValue({
      problem: 'What is 3 + 3?',
      answerFormat: 'multiple-choice',
      options: ['4', '5', '6', '7'],
      correctAnswer: '6',
      difficulty: 'easy',
      encouragement: null,
      readiness: { confidenceIfCorrect: 0.5, confidenceIfIncorrect: 0.4 },
    });

    // Call the POST function
    const response = await POST(mockRequest);

    // Assertions
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      problem: 'What is 3 + 3?',
      answerFormat: 'multiple-choice',
      options: ['4', '5', '6', '7'],
      difficulty: 'easy',
    });
    expect(response.headers.get('x-session-id')).toBe('mock-session-id');
    expect(jest.requireMock('../../src/supabase/serverClient').from)
      .toHaveBeenCalledWith('sessions');
    expect(jest.requireMock('../../src/supabase/serverClient').update)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          quizzes: expect.arrayContaining([
            expect.objectContaining({
              problem: 'What is 3 + 3?',
              correctAnswer: '6',
            }),
          ]),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Take a Quiz',
            }),
            expect.objectContaining({
              role: 'assistant',
              content: expect.stringContaining('What is 3 + 3?'),
            }),
          ]),
        })
      );
  });
});
