// File path: tests/e2e/mathml-rendering.spec.ts
// Tests MathML rendering in the chat interface using MathJax

import { test, expect } from './fixtures';

test.describe('MathML Rendering', () => {
  test('should render MathML content in the chat response', async ({ page, login }) => {
    // Log in the user using the fixture
    await login();

    // Mock /api/tutor to return a response with MathML content
    await page.context().route('**/api/tutor', async (route) => {
      console.log('Mocking API request for /api/tutor with MathML content');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          lesson: `
            <p>The derivative of \( x^2 \) with respect to \( x \) is calculated as follows:</p>
            <p>\\( \\frac{d}{dx}(x^2) = 2x \\)</p>
            <p>In MathML, this is represented as:</p>
            <math>
              <mfrac>
                <mi>d</mi>
                <mrow>
                  <mi>d</mi>
                  <mi>x</mi>
                </mrow>
              </mfrac>
              <mo>(</mo>
              <msup>
                <mi>x</mi>
                <mn>2</mn>
              </msup>
              <mo>)</mo>
              <mo>=</mo>
              <mn>2</mn>
              <mi>x</mi>
            </math>
          `,
          isK12: true,
        }),
      });
    });

    // Navigate to the chat page
    await page.goto('/chat/new');
    await expect(page).toHaveURL(/\/chat\/new/);

    // Locate and use the chat input
    const input = page.getByPlaceholder('Ask k12beast AI...');
    await expect(input).toBeVisible();
    await input.fill('What is the derivative of x²?');
    await page.click('button[aria-label="Send message"]');

    // Wait for the assistant's chat message containing the response to appear
    await page.waitForSelector('div.group\\/message#assistant', { timeout: 10000 });

    // Verify the lesson text is present in the assistant's message
    await expect(page.locator('div.group\\/message#assistant')).toContainText('The derivative of');

    // Wait for MathJax to render the MathML content
    await page.waitForFunction(() => {
      const mathElement = document.querySelector('math');
      return mathElement && document.querySelector('.MathJax');
    }, { timeout: 15000 });

    // Verify the MathML element is present
    const mathElement = page.locator('math');
    await expect(mathElement).toBeVisible();

    // Verify the rendered MathJax output is visible
    const mathjaxOutput = page.locator('.MathJax');
    await expect(mathjaxOutput).toBeVisible();

    // Verify specific MathML elements (e.g., mfrac for the derivative notation)
    const mfracElement = mathElement.locator('mfrac');
    await expect(mfracElement).toBeVisible();
  });
});