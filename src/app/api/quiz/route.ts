// src/app/api/quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendXAIRequest } from "@/utils/xaiClient";
import { handleXAIError } from "@/utils/xaiUtils";
import supabase from "../../../supabase/serverClient";
import { ChartConfig } from "@/store/types";
import { formatQuizProblemMessage } from "@/utils/quizUtils";

// Define the expected response structure from the xAI API
interface QuizResponse {
  charts: ChartConfig[];
  problem: string;
  answerFormat: string;
  options: string[];
  correctAnswer: string;
  solution: { title: string; content: string }[];
  difficulty: "easy" | "medium" | "hard";
  encouragementIfCorrect: string;
  encouragementIfIncorrect: string;
  readiness: { confidenceIfCorrect: number; confidenceIfIncorrect: number };
}

const responseFormat = `Return a valid JSON object with a new quiz problem related to the same topic as the original k12 input problem prompt by the user. 
  Follow these gudelines:
  1. The quiz must be a multiple-choice question with exactly four distinct and plausible options that test the student's understanding of the topic. 
    - Each option should be labeled with a letter (A, B, C, D) and should be concise.
  2. Provide a brief context or scenario to make the problem engaging. 
  3. Do not repeat problems from the session history. 
  4. Additionally, assess the student's readiness for an end-of-semester test based on their overall performance in the chat history, considering quiz performance (correctness, consistency, and difficulty), 
  engagement with lessons and examples (e.g., fewer example requests might indicate mastery), 
  and inferred skill level and progress (e.g., improvement over time). 
  5. Provide two alternative encouragement messages using emojis, XP points, leveling up, etc.: 
  one for if the student answers correctly, 
  and another one for if they answer incorrectly. 
  6. Structure: 
        {
          "problem": "<p>Here's an example problem:</p><p> ... uses the formula <math>...</math> .... Take a look at Chart 1, which shows... Chart 2 shows ...</p>", 
          "solution": [
              {
                "title": "Step 1", "content": "Step content with optional MathJax formulas and references to existing charts 1, 2 or even new 3, 4 ..."
              },
              {"title": "Step N", "content": "Step content..."}
              ], 
          "charts": [
            {
              "id": "chart1",
              "config": {...}
            },
            {
              "id": "chart2",
              "config": {}
            }
          ],
        "answerFormat": "multiple-choice", 
        "options": ["A: option A with possible formulas and reference to charts from the example problem statement", "B: option B", "C: option C", "D: option D"], 
        "correctAnswer": "single letter correct option (A, B, C or D)", 
        "difficulty": "easy|medium|hard", 
        "encouragementIfCorrect": "Gamified message of if correct ", 
        "encouragementIfIncorrect": "Gamified message if incorrect using emojis, XP points, leveling up, etc.",
        "readiness": {"confidenceIfCorrect": 0.92, "confidenceIfIncorrect": 0.75}
        }.

  7. The "options" fields must be a single character (A, B, C, D) followed by a colon and the option text.
  8. The "correctAnswer" field must be a single character (A, B, C, D) indicating the correct option.
  9. The "difficulty" field should be one of "easy", "medium", or "hard" based on the complexity of the problem.
  10. The "encouragementIfCorrect" and "encouragementIfIncorrect" fields should be strings that provide positive reinforcement for correct answers and constructive feedback for incorrect answers.
  11. The "confidenceIfCorrect" and "confidenceIfIncorrect" fields should be numbers between 0 and 1 indicating the AI's confidence that the student would achieve at least a 95% success rate on an end-of-semester test without AI assistance, depending on whether they answer this quiz correctly or incorrectly. 
  12. Ensure all fields are present, especially the "solution" field with at least two steps.
    - The "solution" field must have at least two steps, each with a title and content.
    - When the solution references charts, it should reference them exaclty as they are referenced in the example problem statement. Not via relative direction like "the chart above" or "the chart below".
  13. If the AI fails to generate a valid quiz, return a default response with a problem, answerFormat, options, correctAnswer, solution, difficulty, encouragementIfCorrect, encouragementIfIncorrect, and readiness fields.
  `;

// Default response if the AI fails to generate a valid quiz
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
  encouragementIfCorrect: "Great job! Keep it up!",
  encouragementIfIncorrect: "Nice try! Let's review and try again.",
  readiness: { confidenceIfCorrect: 0.5, confidenceIfIncorrect: 0.4 },
};

// Handles POST requests to generate a new quiz for an existing session
// Sessions are created only when a user submits a new problem via /api/tutor
// Quiz requests must include a valid sessionId tied to a problem submission
export async function POST(req: NextRequest) {
  try {
    const sessionId = req.headers.get("x-session-id");

    console.log("Quiz session ID from header:", sessionId);

    // Require a valid sessionId; do not create a new session
    // Sessions are tied to a user's problem submission and must exist
    if (!sessionId) {
      console.error("Missing sessionId in quiz request");
      return NextResponse.json(
        { error: "A valid session is required to request a quiz. Please start a new chat session." },
        { status: 400 }
      );
    }

    // Fetch the existing session to retrieve problem, images, quizzes, and messages
    const { data: sessionHistory, error: fetchError } = await supabase
      .from("sessions")
      .select("problem, images, quizzes, messages")
      .eq("id", sessionId)
      .single();

    if (fetchError || !sessionHistory) {
      console.error("Error fetching session or session not found:", fetchError?.message || "No session data");
      return NextResponse.json(
        { error: "Session not found. Please start a new chat session." },
        { status: 404 }
      );
    }

    console.log("Fetched session history for quiz:", sessionHistory);

    const problem = sessionHistory.problem;
    const images = sessionHistory.images;

    // Request a new quiz from the xAI API
    let content = await sendXAIRequest({
      problem: problem,
      images: images,
      responseFormat,
      defaultResponse,
      maxTokens: 1000,
      chatHistory: sessionHistory.messages || [],
    }) as QuizResponse;

    console.log("Generated quiz:", content);

    // Ensure solution is present; fallback to default if missing
    if (!content.solution || content.solution.length === 0) {
      console.error("AI model did not provide a solution.");
      return NextResponse.json(
        { error: "AI model did not provide a solution." },
        { status: 500 }
      );    
    }

    // Validate the quiz format to ensure all required fields are present
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
      typeof content.readiness.confidenceIfIncorrect !== "number" ||
      !content.encouragementIfCorrect ||
      !content.encouragementIfIncorrect
    ) {
      console.error("Invalid quiz format:", content);
      return NextResponse.json(
        { error: "AI model returned invalid quiz response format." },
        { status: 500 }
      );    
    }

    // Store the full quiz data server-side, including sensitive fields
    // Sensitive fields (correctAnswer, solution, encouragementIfCorrect, encouragementIfIncorrect, readiness) are
    // retained in the session but not sent to the client until validation
    // via /api/validate
    const quizToStore = {
      problem: content.problem,
      charts: content.charts || [],
      answerFormat: content.answerFormat,
      options: content.options,
      correctAnswer: content.correctAnswer,
      solution: content.solution,
      difficulty: content.difficulty,
      encouragementIfCorrect: content.encouragementIfCorrect,
      encouragementIfIncorrect: content.encouragementIfIncorrect,
      readiness: content.readiness,
    };

    // Ensure messages and quizzes are arrays, even if null or corrupted
    const currentMessages = Array.isArray(sessionHistory.messages) ? sessionHistory.messages : [];
    const currentQuizzes = Array.isArray(sessionHistory.quizzes) ? sessionHistory.quizzes : [];

    // Append the user's quiz prompt and the quiz problem in a single update
    // Ensures messages and quizzes remain arrays, tied to the original problem's session
    const userQuizPrompt = { role: "user", content: "Take a Quiz" };
    const quizProblemStatement: string = formatQuizProblemMessage(content);
    const quizProblem = {
      role: "assistant",
      content: quizProblemStatement,
      charts: content.charts || [],
      renderAs: "html",
    };
    const { data: updateResult, error: updateError } = await supabase
      .from("sessions")
      .update({
        messages: [...currentMessages, userQuizPrompt, quizProblem],
        quizzes: [...currentQuizzes, quizToStore],
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select("id")
      .single();

    if (updateError || !updateResult) {
      console.error("Error updating session with quiz and message:", updateError?.message || "No update result");
      return NextResponse.json(
        { error: "Failed to update session with quiz." },
        { status: 500 }
      );
    }

    // Return only the quiz question data to the client
    // Excludes correctAnswer, solution, encouragementIfCorrect, encouragementIfIncorrect, and readiness to prevent
    // leaking sensitive information before the student submits their answer
    // These fields are returned only after validation via /api/validate
    return NextResponse.json(content, { status: 200, headers: { "x-session-id": sessionId }, });

    // return NextResponse.json(
    //   {
    //     problem: content.problem,
    //     charts: content.charts || [],
    //     answerFormat: content.answerFormat,
    //     options: content.options,
    //     difficulty: content.difficulty,
    //   },
    //   {
    //     status: 200,
    //     headers: { "x-session-id": sessionId },
    //   }
    // );
  } catch (err) {
    return handleXAIError(err);
  }
}