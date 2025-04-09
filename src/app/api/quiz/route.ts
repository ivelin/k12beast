// src/app/api/quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendXAIRequest } from "@/utils/xaiClient";
import { handleXAIError } from "@/utils/xaiUtils";
import supabase from "../../../supabase/serverClient";
import { v4 as uuidv4 } from "uuid";

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

const defaultResponse = {
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

    const content = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      defaultResponse,
      maxTokens: 1000,
      chatHistory: sessionHistory?.messages || [],
    });

    console.log("Generated quiz:", content);

    // Handle unexpected response format
    let formattedContent = content;
    if (content.response && (!content.problem || !content.options || !content.correctAnswer)) {
      console.warn("xAI returned unexpected format with 'response' field:", content.response);
      // Attempt to parse the response field into quiz structure
      const responseText = content.response;
      const problemMatch = responseText.match(/<p><strong>Problem:<\/strong>(.*?)(?=<p><strong>Options:<\/strong>|$)/is);
      const optionsMatch = responseText.match(/<p><strong>Options:<\/strong><\/p>\s*<ul>(.*?)(?=<\/ul>|$)/is);
      const correctAnswerMatch = responseText.match(/<p><strong>Correct Answer:<\/strong>\s*(.*?)(?=<p|$)/is);

      if (problemMatch && optionsMatch && correctAnswerMatch) {
        const problemText = problemMatch[1].trim();
        const optionsItems = optionsMatch[1].match(/<li>(.*?)(?=<\/li>|$)/gi) || [];
        const options = optionsItems.map((item: string) => {
          const match = item.match(/<li>(.*?)(?=<\/li>|$)/i);
          return match ? match[1].trim() : null;
        }).filter(Boolean);
        const correctAnswer = correctAnswerMatch[1].trim();

        formattedContent = {
          problem: problemText,
          answerFormat: "multiple-choice",
          options: options.length === 4 ? options : defaultResponse.options,
          correctAnswer: correctAnswer || defaultResponse.correctAnswer,
          solution: defaultResponse.solution, // Use default since we can't parse solution
          difficulty: "medium",
          encouragement: null,
          readiness: { confidenceIfCorrect: 0.5, confidenceIfIncorrect: 0.4 },
        };
      } else {
        console.error("Could not parse quiz from response:", responseText);
        formattedContent = defaultResponse;
      }
    }

    // Ensure the solution is present; if not, use the default
    if (!formattedContent.solution || formattedContent.solution.length === 0) {
      console.warn("Model did not provide a solution; using default.");
      formattedContent.solution = defaultResponse.solution;
    }

    // Validate the formatted content
    if (
      !formattedContent.problem ||
      !formattedContent.answerFormat ||
      !formattedContent.options ||
      formattedContent.options.length !== 4 ||
      !formattedContent.correctAnswer ||
      !formattedContent.solution ||
      !Array.isArray(formattedContent.solution) ||
      !formattedContent.difficulty ||
      !formattedContent.readiness ||
      typeof formattedContent.readiness.confidenceIfCorrect !== "number" ||
      typeof formattedContent.readiness.confidenceIfIncorrect !== "number"
    ) {
      console.error("Invalid quiz format after parsing:", formattedContent);
      formattedContent = defaultResponse;
    }

    // Store the quiz in the session without the solution (to prevent client-side access)
    const quizToStore = {
      problem: formattedContent.problem,
      answerFormat: formattedContent.answerFormat,
      options: formattedContent.options,
      correctAnswer: formattedContent.correctAnswer,
      solution: formattedContent.solution, // Store the solution server-side
      difficulty: formattedContent.difficulty,
      encouragement: formattedContent.encouragement,
      readiness: formattedContent.readiness,
    };

    const updatedQuizzes = [...(sessionHistory.quizzes || []), quizToStore];
    const updatedMessages = [
      ...(sessionHistory?.messages || []),
      {
        role: "assistant",
        content: `<strong>Quiz:</strong><br>${formattedContent.problem}<br><ul>${formattedContent.options.map((o: string) => `<li>${o}</li>`).join("")}</ul>`,
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
        problem: formattedContent.problem,
        answerFormat: formattedContent.answerFormat,
        options: formattedContent.options,
        correctAnswer: formattedContent.correctAnswer,
        difficulty: formattedContent.difficulty,
        encouragement: formattedContent.encouragement,
        readiness: formattedContent.readiness,
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