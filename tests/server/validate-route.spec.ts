// tests/server/validate-route.spec.ts
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { POST } from "../../src/app/api/validate/route";

const supabase = createClient(
  process.env.SUPABASE_URL || "http://localhost:54321",
  process.env.SUPABASE_ANON_KEY || "anon-key"
);

describe("/api/validate Route", () => {
  let sessionId: string;

  beforeEach(async () => {
    sessionId = uuidv4();

    // Set up a test session with a quiz
    await supabase.from("sessions").insert({
      id: sessionId,
      problem: "2+3",
      images: [],
      lesson: "Test lesson",
      examples: [],
      quizzes: [
        {
          problem: "How many cups of flour are in the mix now?",
          answerFormat: "multiple-choice",
          options: ["4 cups", "5 cups", "6 cups", "7 cups"],
          correctAnswer: "5 cups",
          solution: [
            { title: "Step 1", content: "Add the cups: 2 + 3." },
            { title: "Step 2", content: "The total is 5 cups." },
          ],
          difficulty: "easy",
          encouragement: "Great job!",
          readiness: { confidenceIfCorrect: 0.92, confidenceIfIncorrect: 0.75 },
        },
      ],
      messages: [
        { role: "user", content: "Take a Quiz", renderAs: "markdown" },
        {
          role: "assistant",
          content: "<p><strong>Quiz:</strong></p><p>How many cups of flour are in the mix now?</p>",
          renderAs: "html",
        },
      ],
      user_id: "test-user-id",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  afterEach(async () => {
    // Clean up the test session
    await supabase.from("sessions").delete().eq("id", sessionId);
  });

  test("should validate quiz answer and append messages to session", async () => {
    const requestBody = {
      sessionId,
      problem: "How many cups of flour are in the mix now?",
      answer: "5 cups",
    };

    const request = new Request("http://localhost:3000/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseBody = await response.json();

    // Verify the response
    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      isCorrect: true,
      commentary: "Great job! You got it right!",
      solution: [
        { title: "Step 1", content: "Add the cups: 2 + 3." },
        { title: "Step 2", content: "The total is 5 cups." },
      ],
      readiness: { confidenceIfCorrect: 0.92, confidenceIfIncorrect: 0.75 },
    });

    // Verify that messages were appended to the session
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("messages")
      .eq("id", sessionId)
      .single();

    expect(sessionData?.messages).toHaveLength(4); // Original 2 messages + user response + feedback
    expect(sessionData?.messages[2]).toEqual({
      role: "user",
      content: "5 cups",
      renderAs: "markdown",
    });
    expect(sessionData?.messages[3].role).toBe("assistant");
    expect(sessionData?.messages[3].content).toContain("Great job! You got it right!");
    expect(sessionData?.messages[3].content).toContain("TEST READINESS");
    expect(sessionData?.messages[3].renderAs).toBe("html");
  });

  test("should handle incorrect quiz answer and append messages", async () => {
    const requestBody = {
      sessionId,
      problem: "How many cups of flour are in the mix now?",
      answer: "6 cups",
    };

    const request = new Request("http://localhost:3000/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseBody = await response.json();

    // Verify the response
    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      isCorrect: false,
      commentary: "Nice try! Let's go over the correct answer.",
      solution: [
        { title: "Step 1", content: "Add the cups: 2 + 3." },
        { title: "Step 2", content: "The total is 5 cups." },
      ],
      readiness: { confidenceIfCorrect: 0.92, confidenceIfIncorrect: 0.75 },
    });

    // Verify that messages were appended to the session
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("messages")
      .eq("id", sessionId)
      .single();

    expect(sessionData?.messages).toHaveLength(4);
    expect(sessionData?.messages[2]).toEqual({
      role: "user",
      content: "6 cups",
      renderAs: "markdown",
    });
    expect(sessionData?.messages[3].role).toBe("assistant");
    expect(sessionData?.messages[3].content).toContain("Nice try! Let's go over the correct answer.");
    expect(sessionData?.messages[3].content).toContain("TEST READINESS");
    expect(sessionData?.messages[3].renderAs).toBe("html");
  });

  test("should return 404 if quiz not found", async () => {
    const requestBody = {
      sessionId,
      problem: "Non-existent quiz",
      answer: "5 cups",
    };

    const request = new Request("http://localhost:3000/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ error: "Quiz not found in session." });
  });
});