// File path: tests/e2e/react-flow-diagram.spec.ts
// Tests React Flow diagram rendering in the chat interface

import { test, expect } from './fixtures';

test.describe('React Flow Diagram Rendering', () => {
  test('should render a React Flow diagram in the chat response', async ({ page, login }) => {
    // Log in the user using the fixture
    await login();

    // Mock /api/tutor to return a response with a React Flow diagram
    await page.context().route('**/api/tutor', async (route) => {
      console.log('Mocking API request for /api/tutor with React Flow diagram');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify({
          lesson: '<p>Here is a flowChart of below the water cycle (see Figure 1):</p>',
          charts: [
            {
              id: 'diagram1',
              format: 'reactflow',
              title: 'Figure 1: The Water Cycle',
              config: {
                nodes: [
                  { id: 'A', data: { label: 'Evaporation' }, position: { x: 0, y: 0 } },
                  { id: 'B', data: { label: 'Condensation' }, position: { x: 0, y: 100 } },
                  { id: 'C', data: { label: 'Precipitation' }, position: { x: 0, y: 200 } },
                  { id: 'D', data: { label: 'Runoff' }, position: { x: 0, y: 300 } },
                  { id: 'E', data: { label: 'Back to Ocean' }, position: { x: 0, y: 400 } },
                ],
                edges: [
                  { id: 'eA-B', source: 'A', target: 'B', label: 'Step 1' },
                  { id: 'eB-C', source: 'B', target: 'C', label: 'Step 2' },
                  { id: 'eC-D', source: 'C', target: 'D', label: 'Step 3' },
                  { id: 'eD-E', source: 'D', target: 'E', label: 'Step 4' },
                ],
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
    await input.fill('Explain the water cycle with a flowchart');
    await page.click('button[aria-label="Send message"]');

    // Wait for the assistant's chat message containing the response to appear
    await page.waitForSelector('div.group\\/message#assistant', { timeout: 10000 });

    // Verify the lesson text is present in the assistant's message
    await expect(page.locator('div.group\\/message#assistant')).toContainText(/Here is a flow[Cc]hart of.*the water cycle/i);

    // Wait for the React Flow diagram to render (look for nodes and edges)
    await page.waitForFunction(() => {
      const diagramContainer = document.querySelector('[id="figure-diagram1"]');
      return diagramContainer && 
             document.querySelector('.react-flow__node') && 
             document.querySelector('.react-flow__edge');
    }, { timeout: 15000 });

    // Verify the diagram container is visible
    const diagramContainer = page.locator('[id="figure-diagram1"]');
    await expect(diagramContainer).toBeVisible();

    // Verify the nodes are rendered (e.g., check for the "Evaporation" node)
    const evaporationNode = page.locator('.react-flow__node:has-text("Evaporation")');
    await expect(evaporationNode).toBeVisible();

    // Verify the edges are rendered (e.g., check for an edge with label "Step 1")
    const edgeLabel = page.locator('.react-flow__edge:has-text("Step 1")');
    await expect(edgeLabel).toBeVisible();
  });
});