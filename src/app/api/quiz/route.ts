import { NextRequest, NextResponse } from "next/server";
import { sendXAIRequest, handleXAIError } from "../../../utils/xai";
import supabase from "../../../supabase/serverClient";
import { v4 as uuidv4 } from "uuid";

const responseFormat = `Return a JSON object with a new quiz problem based on the provided session history. The quiz must be related to the same topic as the original input problem or image (e.g., if the input is about heat transfer, the quiz must also be about heat transfer). Do not repeat problems from the session history (check the 'examples' and 'quizzes' arrays). Do not reference images in the problem text. The quiz must be a multiple-choice question with exactly four distinct and plausible options that test the student's understanding of the topic. Provide a brief context or scenario to make the problem engaging. Adjust the difficulty based on the student's performance history: if the student answered the last quiz correctly (check 'performanceHistory'), increase the difficulty slightly; if incorrectly, use a similar or easier difficulty. Include a step-by-step solution for the quiz problem, adapted to the student's inferred grade and skill level (beginner, intermediate, advanced) based on the session context, and provide more detailed explanations if the student answered the last quiz incorrectly. Structure: {"problem": "Quiz problem text", "answerFormat": "multiple-choice", "options": ["option1", "option2", "option3", "option4"], "correctAnswer": "correct option", "solution": [{"title": "Step 1", "content": "<p>Step content...</p>"}, ...], "difficulty": "easy|medium|hard", "encouragement": "Words of encouragement if the last quiz was answered correctly, otherwise null"}. Ensure all fields are present, especially the "solution" field with at least two steps.`;

const defaultResponse = {
  problem: "",
  answerFormat: "multiple-choice",
  options: [],
  correctAnswer: "",
  solution: [
    { title: "Step 1", content: "<p>No solution provided by the model.</p>" },
    { title: "Step 2", content: "<p>Please try another quiz.</p>" },
  ],
  difficulty: "medium",
  encouragement: null,
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
        .insert({ id: sessionId, created_at: new Date().toISOString() });

      if (error) {
        console.error("Error creating session:", error.message);
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
      }
      sessionHistory = { id: sessionId, created_at: new Date().toISOString() };
      console.log("Created new session for quiz:", sessionId);
    }

    const content = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      defaultResponse,
      maxTokens: 1000,
      sessionHistory,
    });

    console.log("Generated quiz:", content);

    // Ensure the solution is present; if not, use the default
    if (!content.solution || content.solution.length === 0) {
      console.warn("Model did not provide a solution; using default.");
      content.solution = defaultResponse.solution;
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
    };

    const updatedQuizzes = [...(sessionHistory.quizzes || []), quizToStore];
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        quizzes: updatedQuizzes,
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