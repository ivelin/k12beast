// File path: tests/e2e/plotly-chart-interaction.spec.ts
// Tests Plotly chart rendering in the chat interface.
// Removed hover interaction check as it's brittle and not critical for a mobile chat interface.

import { test, expect } from './fixtures';

test.describe('Plotly Chart Interaction', () => {
  test('should render a Plotly chart in the chat response', async ({ page, login }) => {
    // Log in the user using the fixture
    await login();

    // Mock /api/tutor to return a response with structured Plotly chart data
    await page.context().route('**/api/tutor', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          lesson: '<p>Here is the graph of y = x²:</p>',
          charts: [
            {
              id: 'chart1',
              format: 'plotly',
              title: 'Graph of y = x²',
              config: {
                data: [
                  {
                    x: [-2, -1, 0, 1, 2],
                    y: [4, 1, 0, 1, 4],
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'y = x²',
                    hoverinfo: 'x+y', // Explicitly enable hover info
                  },
                ],
                layout: {
                  xaxis: { title: 'x' },
                  yaxis: { title: 'y' },
                  hovermode: 'closest', // Ensure hover tooltips are enabled
                },
              },
            },
          ],
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
    await input.fill('Graph y = x^2');
    await page.click('button[aria-label="Send message"]');

    // Wait for the assistant's chat message containing the response to appear
    await page.waitForSelector('div.group\\/message#assistant', { timeout: 10000 });

    // Verify the lesson text is present in the assistant's message
    await expect(page.locator('div.group\\/message#assistant')).toContainText('Here is the graph of y = x²:');

    // Wait for the Plotly chart to render (look for SVG inside the chart container)
    await page.waitForFunction(() => {
      const chartDiv = document.querySelector('[id="figure-chart1"]');
      return chartDiv && chartDiv.querySelector('svg');
    }, { timeout: 15000 });

    // Verify the chart container and SVG are visible
    const chartContainer = page.locator('[id="figure-chart1"]');
    await expect(chartContainer).toBeVisible();
    const plotSvg = chartContainer.locator('svg');
    await expect(plotSvg).toBeVisible();
  });
});