// tests/server/mocks/xaiClient.ts
export const sendXAIRequest = jest.fn().mockImplementation((options) => {
  if (options.responseFormat.includes('example problem')) {
    // Check for a failure flag in options (for testing)
    if (options.testFailure) {
      return Promise.reject(new Error('xAI API failed'));
    }
    return Promise.resolve({
      problem: 'Example problem',
      solution: [{ title: 'Step 1', content: 'Do this' }],
    });
  }
  return Promise.resolve({
    isK12: true,
    lesson: '<p>The answer to your question is simple: 4!</p>',
  });
});

export const handleXAIError = jest.fn((error) => ({
  status: 500,
  json: { error: error instanceof Error ? error.message : 'Unexpected error' },
}));