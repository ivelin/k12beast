// tests/server/mocks/xaiClient.ts
export const sendXAIRequest = jest.fn().mockResolvedValue({
    isK12: true,
    lesson: '<p>The answer to your question is simple: 4!</p>',
  });
  
  export const handleXAIError = jest.fn((error) => ({
    status: 500,
    json: { error: error instanceof Error ? error.message : 'Unexpected error' },
  }));