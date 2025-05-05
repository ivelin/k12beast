// File path: tests/e2e/chart-rendering.spec.ts
// Regression tests to ensure Plotly charts and React Flow diagrams fit within the message area without horizontal scrolling.
// Mocks /api/tutor to return various chart types, consistent with system prompt and UI expectations.
// Simplified selectors to reduce brittleness and removed excessive debug logging since tests are passing.

import { test, expect } from '@playwright/test';

test.describe('Chart and Diagram Rendering Regression Tests', () => {
  // Mock /api/tutor to return a lesson with various charts and diagrams
  test.beforeEach(async ({ context }) => {
    await context.route('**/api/tutor', async (route) => {
      const responseBody = {
        lesson: `
          <p>Here are examples of energy transformations with various charts! 📊</p>
          <p><strong>Figure 1</strong> shows a scatter plot of energy transformation stages.</p>
          <p><strong>Figure 2</strong> illustrates temperature change over time with a line chart.</p>
          <p><strong>Figure 3</strong> diagrams a simple process with 3 steps.</p>
          <p><strong>Figure 4</strong> shows a more complex process with 7 steps.</p>
          <p>Review these visuals to understand the concepts better! 🌟</p>
        `,
        isK12: true,
        charts: [
          {
            id: "chart1",
            format: "plotly",
            title: "Figure 1: Energy Transformation Stages",
            config: {
              data: [
                {
                  x: ["Food Intake", "Digestion", "Energy Use"],
                  y: [1, 2, 3],
                  type: "scatter",
                  mode: "markers",
                  name: "Energy Levels"
                }
              ],
              layout: { title: "Energy Transformation in Digestion" }
            }
          },
          {
            id: "chart2",
            format: "plotly",
            title: "Figure 2: Temperature Change Over Time",
            config: {
              data: [
                {
                  x: ["Start", "Mid", "End"],
                  y: [20, 50, 30],
                  type: "scatter",
                  mode: "lines",
                  name: "Temperature"
                }
              ],
              layout: { title: "Temperature Change Over Time" }
            }
          },
          {
            id: "chart3",
            format: "reactflow",
            title: "Figure 3: Simple Process with 3 Steps",
            config: {
              nodes: [
                { id: "A", data: { label: "Start" }, position: { x: 0, y: 0 } },
                { id: "B", data: { label: "Process" }, position: { x: 0, y: 100 } },
                { id: "C", data: { label: "End" }, position: { x: 0, y: 200 } }
              ],
              edges: [
                { id: "eA-B", source: "A", target: "B", label: "Step 1" },
                { id: "eB-C", source: "B", target: "C", label: "Step 2" }
              ]
            }
          },
          {
            id: "chart4",
            format: "reactflow",
            title: "Figure 4: Complex Process with 7 Steps",
            config: {
              nodes: [
                { id: "A", data: { label: "Step 1" }, position: { x: 0, y: 0 } },
                { id: "B", data: { label: "Step 2" }, position: { x: 0, y: 100 } },
                { id: "C", data: { label: "Step 3" }, position: { x: 0, y: 200 } },
                { id: "D", data: { label: "Step 4" }, position: { x: 0, y: 300 } },
                { id: "E", data: { label: "Step 5" }, position: { x: 0, y: 400 } },
                { id: "F", data: { label: "Step 6" }, position: { x: 0, y: 500 } },
                { id: "G", data: { label: "Step 7" }, position: { x: 0, y: 600 } }
              ],
              edges: [
                { id: "eA-B", source: "A", target: "B", label: "Next" },
                { id: "eB-C", source: "B", target: "C", label: "Next" },
                { id: "eC-D", source: "C", target: "D", label: "Next" },
                { id: "eD-E", source: "D", target: "E", label: "Next" },
                { id: "eE-F", source: "E", target: "F", label: "Next" },
                { id: "eF-G", source: "F", target: "G", label: "Next" }
              ]
            }
          }
        ]
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-session-id': 'mock-session-id' },
        body: JSON.stringify(responseBody),
      });
    });
  });

  // Test for mobile viewport
  test('charts and diagrams should fit within message area on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone-like size
    await page.goto('/chat/new'); // Global setup handles authentication

    // Verify the page loaded correctly
    await page.waitForSelector('textarea[placeholder="Ask k12beast AI..."]', { timeout: 10000 });

    // Submit the message
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'Explain energy transformation');
    await page.click('button[aria-label="Send message"]');

    // Wait for the assistant's message content to ensure DOMPurify has loaded and rendered
    await page.waitForSelector('text=Here are examples of energy transformations with various charts!', { timeout: 60000 });

    // Add a small delay to ensure React updates the DOM
    await page.waitForTimeout(5000);

    // Locate the message container by its content and then find its parent
    const messageContent = page.locator('text=Here are examples of energy transformations with various charts!');
    const message = messageContent.locator('xpath=ancestor::div[contains(@class, "group/message")]');
    const messageCount = await message.count();
    console.log(`Found ${messageCount} messages containing the expected content`);

    // Ensure at least one message is found
    expect(messageCount).toBeGreaterThan(0);

    // Wait for charts and diagrams to render with increased timeout
    await page.waitForSelector('.plotly-svg', { state: 'visible', timeout: 30000 });
    await page.waitForSelector('.react-flow .react-flow__edge', { state: 'visible', timeout: 30000 }); // Wait for the edges to ensure the diagram is rendered

    for (let i = 0; i < messageCount; i++) {
      const msg = message.nth(i);
      // Check Plotly charts
      const hasPlotly = await msg.locator('.plotly-svg').count() > 0;
      if (hasPlotly) {
        const chart = msg.locator('.plotly-svg').first();
        const messageWidth = await msg.evaluate(el => el.getBoundingClientRect().width);
        const chartWidth = await chart.evaluate(el => el.getBoundingClientRect().width);
        expect(chartWidth).toBeLessThanOrEqual(messageWidth); // Chart fits within message
      }
      // Check React Flow diagrams
      const hasReactFlow = await msg.locator('.react-flow').count() > 0;
      if (hasReactFlow) {
        const diagram = msg.locator('.react-flow').first();
        const messageWidth = await msg.evaluate(el => el.getBoundingClientRect().width);
        const diagramWidth = await diagram.evaluate(el => el.getBoundingClientRect().width);
        expect(diagramWidth).toBeLessThanOrEqual(messageWidth); // Diagram fits within message
      }
    }

    // Verify no horizontal scrolling in message list using a simpler selector
    const messageList = page.locator('.space-y-4.overflow-y-auto');
    const hasHorizontalScroll = await messageList.evaluate(el => el.scrollWidth > el.clientWidth);
    expect(hasHorizontalScroll).toBe(false);
  });

  // Test for desktop viewport
  test('charts and diagrams should fit within message area on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 }); // Typical desktop size
    await page.goto('/chat/new'); // Global setup handles authentication

    // Verify the page loaded correctly
    await page.waitForSelector('textarea[placeholder="Ask k12beast AI..."]', { timeout: 10000 });

    // Submit the message
    await page.fill('textarea[placeholder="Ask k12beast AI..."]', 'Explain energy transformation');
    await page.click('button[aria-label="Send message"]');

    // Wait for the assistant's message content to ensure DOMPurify has loaded and rendered
    await page.waitForSelector('text=Here are examples of energy transformations with various charts!', { timeout: 60000 });

    // Add a small delay to ensure React updates the DOM
    await page.waitForTimeout(5000);

    // Locate the message container by its content and then find its parent
    const messageContent = page.locator('text=Here are examples of energy transformations with various charts!');
    const message = messageContent.locator('xpath=ancestor::div[contains(@class, "group/message")]');
    const messageCount = await message.count();
    console.log(`Found ${messageCount} messages containing the expected content`);

    // Ensure at least one message is found
    expect(messageCount).toBeGreaterThan(0);

    // Wait for charts and diagrams to render with increased timeout
    await page.waitForSelector('.plotly-svg', { state: 'visible', timeout: 30000 });
    await page.waitForSelector('.react-flow .react-flow__edge', { state: 'visible', timeout: 30000 }); // Wait for the edges to ensure the diagram is rendered

    for (let i = 0; i < messageCount; i++) {
      const msg = message.nth(i);
      // Check Plotly charts
      const hasPlotly = await msg.locator('.plotly-svg').count() > 0;
      if (hasPlotly) {
        const chart = msg.locator('.plotly-svg').first();
        const messageWidth = await msg.evaluate(el => el.getBoundingClientRect().width);
        const chartWidth = await chart.evaluate(el => el.getBoundingClientRect().width);
        expect(chartWidth).toBeLessThanOrEqual(messageWidth); // Chart fits within message
      }
      // Check React Flow diagrams
      const hasReactFlow = await msg.locator('.react-flow').count() > 0;
      if (hasReactFlow) {
        const diagram = msg.locator('.react-flow').first();
        const messageWidth = await msg.evaluate(el => el.getBoundingClientRect().width);
        const diagramWidth = await diagram.evaluate(el => el.getBoundingClientRect().width);
        expect(diagramWidth).toBeLessThanOrEqual(messageWidth); // Diagram fits within message
      }
    }

    // Verify no horizontal scrolling in message list using a simpler selector
    const messageList = page.locator('.space-y-4.overflow-y-auto');
    const hasHorizontalScroll = await messageList.evaluate(el => el.scrollWidth > el.clientWidth);
    expect(hasHorizontalScroll).toBe(false);
  });
});