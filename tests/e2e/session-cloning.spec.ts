// tests/e2e/session-cloning.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Session Cloning Flows', () => {
  const originalSessionId = 'mock-session-id';
  const newSessionId = 'mock-new-session-id';

  test.beforeEach(async ({ context }) => {
    // Mock /api/auth/user to control authentication state
    let isAuthenticated = true;
    await context.route('**/api/auth/user', (route, request) => {
      if (request.method() === 'GET') {
        if (isAuthenticated) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              email: 'testuser@k12beast.com',
            }),
          });
        }
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not authenticated' }),
        });
      }
      return route.continue();
    });

    // Mock /api/session/[sessionId] for the original session
    await context.route(`**/api/session/${originalSessionId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: originalSessionId,
            problem: 'Test session for cloning',
            images: [],
            lesson: '<p>Mock lesson content</p>',
            messages: [],
            created_at: '2025-04-15T22:46:59.123Z',
            updated_at: '2025-04-15T22:46:59.123Z',
          },
        }),
      })
    );

    // Mock /api/session/clone/[sessionId] for cloning
    await context.route(`**/api/session/clone/${originalSessionId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: newSessionId,
        }),
      })
    );

    // Mock /api/session/[newSessionId] for the cloned session
    await context.route(`**/api/session/${newSessionId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: newSessionId,
            problem: 'Test session for cloning',
            images: [],
            lesson: '<p>Mock lesson content</p>',
            messages: [],
            created_at: '2025-04-15T22:46:59.123Z',
            updated_at: '2025-04-15T22:46:59.123Z',
            cloned_from: originalSessionId,
          },
        }),
      })
    );

    // Mock /api/tutor for session creation in non-cloned test
    await context.route('**/api/tutor', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { "x-session-id": "mock-non-cloned-session-id" },
        body: "<p>Lesson: Adding numbers.</p>",
      })
    );

    // Mock /api/session/[sessionId] for the non-cloned session
    await context.route('**/api/session/mock-non-cloned-session-id', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: 'mock-non-cloned-session-id',
            problem: 'What is 2 + 2 in math?',
            images: [],
            lesson: '<p>Lesson: Adding numbers.</p>',
            messages: [],
            created_at: '2025-04-15T22:46:59.123Z',
            updated_at: '2025-04-15T22:46:59.123Z',
            cloned_from: null,
          },
        }),
      })
    );
  });

  test('Unauthenticated user clones a session', async ({ page, context }) => {
    // Mock unauthenticated state
    await context.route('**/api/auth/user', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not authenticated' }),
      })
    );

    // Visit the public session page
    await page.goto(`/public/session/${originalSessionId}`);
    await page.waitForLoadState('domcontentloaded');

    // Verify "Log in to clone" message
    await expect(page.getByText("Log in to clone this session and continue working on it.")).toBeVisible({ timeout: 10000 });

    // Click "Log in" link
    await page.getByText("Log in").click();
    await page.waitForURL(/\/public\/login\?redirectTo=/);

    // Mock authenticated state after login
    await context.route('**/api/auth/user', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          email: 'testuser@k12beast.com',
        }),
      })
    );

    // Should redirect back to public session page after login (handled by globalSetup storageState)
    await page.goto(`/public/session/${originalSessionId}`);
    await page.waitForLoadState('domcontentloaded');

    // Verify "Clone" button is now visible
    await expect(page.getByRole("button", { name: "Clone" })).toBeVisible({ timeout: 10000 });

    // Click "Clone" button
    await page.getByRole("button", { name: "Clone" }).click();

    // Verify redirect to live chat page
    await page.waitForURL(`/chat/${newSessionId}`);

    // Verify the cloned session label
    await expect(page.getByText("This session was cloned from a shared session.")).toBeVisible();

    // Verify the link to the original session
    const link = page.getByRole("link", { name: "a shared session" });
    await expect(link).toHaveAttribute("href", `/public/session/${originalSessionId}`);
  });

  test('Authenticated user clones a session', async ({ page }) => {
    // Navigate to the public session page
    await page.goto(`/public/session/${originalSessionId}`);
    await page.waitForLoadState('domcontentloaded');

    // Verify "Clone" button is visible immediately
    await expect(page.getByRole("button", { name: "Clone" })).toBeVisible({ timeout: 10000 });

    // Click "Clone" button
    await page.getByRole("button", { name: "Clone" }).click();

    // Verify redirect to live chat page
    await page.waitForURL(`/chat/${newSessionId}`);

    // Verify the cloned session label
    await expect(page.getByText("This session was cloned from a shared session.")).toBeVisible();

    // Verify the link to the original session
    const link = page.getByRole("link", { name: "a shared session" });
    await expect(link).toHaveAttribute("href", `/public/session/${originalSessionId}`);
  });

  test('Non-cloned session does not show cloned label', async ({ page }) => {
    // Create a new session directly (not cloned)
    await page.goto('/chat/new');
    await page.waitForLoadState('domcontentloaded');

    await page.getByPlaceholder("Ask k12beast AI...").fill("What is 2 + 2 in math?");
    await page.getByRole("button", { name: "Send message" }).click();

    // Verify redirect to live chat page
    await page.waitForURL(/\/chat\/mock-non-cloned-session-id/);

    // Verify the cloned session label does NOT appear
    await expect(page.getByText("This session was cloned from a shared session.")).not.toBeVisible();
  });
});