import { NextRequest, NextResponse } from "next/server";
import { sendXAIRequest } from "@/utils/xaiClient";
import { handleXAIError } from "@/utils/xaiUtils";
import supabase from "../../../supabase/serverClient";
import { v4 as uuidv4 } from "uuid";

// Define the expected response structure
interface QuizResponse {
  problem: string;
  answerFormat: string;
  options: string[];
  correctAnswer: string;
  solution: { title: string; content: string }[];
  difficulty: "easy" | "medium" | "hard";
  encouragement: string | null;
  readiness: { confidenceIfCorrect: number; confidenceIfIncorrect: number };
}

const responseFormat = `Return a JSON object with a new quiz problem related to the same topic as the
original input problem (e.g., if the input is about heat transfer, the quiz must also be about heat
transfer). The quiz must be a multiple-choice question with exactly four distinct and plausible options
that test the student's understanding of the topic. Provide a brief context or scenario to make the
problem engaging. Do not repeat problems from the session history. Do not reference images in the
problem text. Additionally, assess the student's readiness for an end-of-semester test based on their
overall performance in the chat history, considering quiz performance (correctness, consistency, and
difficulty), engagement with lessons and examples (e.g., fewer example requests might indicate mastery),
and inferred skill level and progress (e.g., improvement over time). Provide two confidence levels: one
if the student answers this quiz correctly, and one if they answer incorrectly. Structure: {"problem":
"Quiz problem text", "answerFormat": "multiple-choice", "options": ["option1", "option2", "option3",
"option4"], "correctAnswer": "correct option", "solution": [{"title": "Step 1", "content": "Step
content in Markdown"}, ...], "difficulty": "easy|medium|hard", "encouragement": "Words of encouragement
if the last quiz was answered correctly, otherwise null", "readiness": {"confidenceIfCorrect": 0.92,
"confidenceIfIncorrect": 0.75}}. The "confidenceIfCorrect" and "confidenceIfIncorrect" fields should be
numbers between 0 and 1 indicating the AI's confidence that the student would achieve at least a 95%
success rate on an end-of-semester test without AI assistance, depending on whether they answer this quiz
correctly or incorrectly. Ensure all fields are present, especially the "solution" field with at least
two steps.`;

const defaultResponse: QuizResponse = {
  problem: "Unable to generate quiz due to API response format.",
  answerFormat: "multiple-choice",
  options: ["Option 1", "Option 2", "Option 3", "Option 4"],
  correctAnswer: "Option 1",
  solution: [
    { title: "Step 1", content: "The AI response was not in the expected format." },
    { title: "Step 2", content: "Please try requesting another quiz." },
  ],
  difficulty: "easy",
  encouragement: null,
  readiness: { confidenceIfCorrect: 0.5, confidenceIfIncorrect: 0.4 },
};

export async function POST(req: NextRequest) {
  try {
    const { problem, images } = await req.json();
    let sessionId = req.headers.get("x-session-id");

    console.log("Quiz request body:", { problem, images });
    console.log("Quiz session ID from header:", sessionId);

    // Fetch or create session
    let sessionHistory = null;
    if (sessionId) {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error) {
        console.error("Error fetching session:", error.message);
      } else if (data) {
        sessionHistory = data;
        console.log("Fetched session history for quiz:", sessionHistory);
      }
    }

    if (!sessionId || !sessionHistory) {
      sessionId = uuidv4();
      const { error } = await supabase
        .from("sessions")
        .insert({
          id: sessionId,
          messages: [{ role: "user", content: "Take a Quiz" }],
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Error creating session:", error.message);
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
      }
      sessionHistory = { id: sessionId, created_at: new Date().toISOString(), messages: [{ role: "user", content: "Take a Quiz" }] };
      console.log("Created new session for quiz:", sessionId);
    } else {
      // Update the session with the user's request for a quiz
      const updatedMessages = [
        ...(sessionHistory.messages || []),
        { role: "user", content: "Take a Quiz" },
      ];
      const { error } = await supabase
        .from("sessions")
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        console.error("Error updating session with messages:", error.message);
      }
      sessionHistory.messages = updatedMessages;
    }

    let content = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      defaultResponse,
      maxTokens: 1000,
      chatHistory: sessionHistory?.messages || [],
    }) as QuizResponse;

    console.log("Generated quiz:", content);

    // Ensure the solution is present; if not, use the default
    if (!content.solution || content.solution.length === 0) {
      console.warn("Model did not provide a solution; using default.");
      content.solution = defaultResponse.solution;
    }

    // Validate the formatted content
    if (
      !content.problem ||
      !content.answerFormat ||
      !content.options ||
      content.options.length !== 4 ||
      !content.correctAnswer ||
      !content.solution ||
      !Array.isArray(content.solution) ||
      !content.difficulty ||
      !content.readiness ||
      typeof content.readiness.confidenceIfCorrect !== "number" ||
      typeof content.readiness.confidenceIfIncorrect !== "number"
    ) {
      console.error("Invalid quiz format:", content);
      content = defaultResponse;
    }

    // Store the quiz in the session without the solution (to prevent client-side access)
    const quizToStore = {
      problem: content.problem,
      answerFormat: content.answerFormat,
      options: content.options,
      correctAnswer: content.correctAnswer,
      solution: content.solution, // Store the solution server-side
      difficulty: content.difficulty,
      encouragement: content.encouragement,
      readiness: content.readiness,
    };

    const updatedQuizzes = [...(sessionHistory.quizzes || []), quizToStore];
    const updatedMessages = [
      ...(sessionHistory?.messages || []),
      {
        role: "assistant",
        content: `<strong>Quiz:</strong><br>${content.problem}<br><ul>${content.options.map((o: string) => `<li>${o}</li>`).join("")}</ul>`,
        renderAs: "html",
      },
    ];
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        quizzes: updatedQuizzes,
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Error updating session with quiz:", updateError.message);
    }

    // Return the quiz to the client without the solution
    return NextResponse.json(
      {
        problem: content.problem,
        answerFormat: content.answerFormat,
        options: content.options,
        correctAnswer: content.correctAnswer,
        difficulty: content.difficulty,
        encouragement: content.encouragement,
        readiness: content.readiness,
      },
      {
        status: 200,
        headers: { "x-session-id": sessionId },
      }
    );
  } catch (err) {
    return handleXAIError(err);
  }
}