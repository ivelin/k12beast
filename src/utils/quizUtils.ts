// src/utils/quizUtils.ts
import { Quiz, QuizFeedback } from "@/store/types";

// Formats the quiz feedback message as HTML for consistent rendering
export function formatQuizFeedbackMessage(
  quiz: Quiz,
  answer: string,
  feedback: QuizFeedback
): string {
  // Debugging logs to inspect types and values
  console.log("formatQuizFeedbackMessage: quiz.options:", quiz.options, "types:", quiz.options.map(o => typeof o));
  console.log("formatQuizFeedbackMessage: quiz.correctAnswer:", quiz.correctAnswer, "type:", typeof quiz.correctAnswer);
  console.log("formatQuizFeedbackMessage: answer:", answer, "type:", typeof answer);

  const readinessPercentage = Math.round(feedback.readiness * 100);
  const solutionHtml = feedback.solution
    ? feedback.solution
        .map((s) => `<strong>${s.title}:</strong> ${s.content}`)
        .join("</p><p>")
    : "";
  const optionsHtml = quiz.options
    .map((o) => {
      // Convert both to strings to ensure consistent comparison
      const optionStr = String(o);
      const correctAnswerStr = String(quiz.correctAnswer);
      const answerStr = String(answer);

      const isCorrect = optionStr === correctAnswerStr;
      const isUserAnswer = optionStr === answerStr;
      
      // Debugging comparison results
      console.log(`formatQuizFeedbackMessage: Comparing option "${optionStr}" (type: ${typeof optionStr}) with correctAnswer "${correctAnswerStr}" (type: ${typeof correctAnswerStr}) - isCorrect: ${isCorrect}`);
      console.log(`formatQuizFeedbackMessage: Comparing option "${optionStr}" (type: ${typeof optionStr}) with answer "${answerStr}" (type: ${typeof answerStr}) - isUserAnswer: ${isUserAnswer}`);

      const classNames = [
        isCorrect ? "correct-answer" : "",
        isUserAnswer ? "user-answer" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<li class="${classNames}">${o}${
        isUserAnswer ? ' <span class="answer-tag">(Your answer)</span>' : ""
      }${
        isCorrect ? ' <span class="correct-tag">(Correct answer)</span>' : ""
      }</li>`;
    })
    .join("");

  return `<p><strong>Feedback:</strong></p><p><strong>Your Answer:</strong> ${answer}</p><p>${feedback.encouragement}</p>${
    solutionHtml ? `<p>${solutionHtml}</p>` : ""
  }<p><strong>Options:</strong></p><ul>${optionsHtml}</ul><p><strong>Test Readiness:</strong></p><div class="readiness-container"><div class="readiness-bar" style="width: ${readinessPercentage}%"></div></div><p>${readinessPercentage}%</p>`;
}