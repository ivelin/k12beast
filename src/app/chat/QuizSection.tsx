"use client";

import { useEffect, useState } from "react";
import useAppStore from "../../store";

export default function QuizSection({ onQuizUpdate }) {
  const {
    step,
    sessionId,
    quiz,
    setStep,
    setError,
    handleQuizSubmit,
    handleValidate,
  } = useAppStore();

  const [hasFetchedQuiz, setHasFetchedQuiz] = useState(false);

  const answer = useAppStore((state) => state.quizAnswer);
  const setAnswer = (value) => useAppStore.setState({ quizAnswer: value });
  const isCorrect = useAppStore((state) => state.quizIsCorrect);
  const setIsCorrect = (value) => useAppStore.setState({ quizIsCorrect: value });
  const commentary = useAppStore((state) => state.quizCommentary);
  const setCommentary = (value) => useAppStore.setState({ quizCommentary: value });
  const feedback = useAppStore((state) => state.quizFeedback);
  const setFeedback = (value) => useAppStore.setState({ quizFeedback: value });

  useEffect(() => {
    if (step === "quizzes" && !quiz && !hasFetchedQuiz) {
      setHasFetchedQuiz(true);
      handleQuizSubmit();
    }
  }, [step, quiz, hasFetchedQuiz, handleQuizSubmit]);

  useEffect(() => {
    if (quiz) {
      onQuizUpdate({ type: "quiz", content: quiz.problem });
    }
  }, [quiz, onQuizUpdate]);

  const handleSubmitAnswer = async () => {
    try {
      await handleValidate(answer, quiz);
      // Directly call onQuizUpdate after handleValidate to ensure the result is displayed
      const updatedFeedback = useAppStore.getState().quizFeedback;
      if (updatedFeedback) {
        const resultContent = `
          <p><strong>Your Answer:</strong> ${answer}</p>
          <p><strong>Result:</strong> ${updatedFeedback.isCorrect ? "Correct" : "Incorrect"}</p>
          ${updatedFeedback.commentary}
          ${quiz.encouragement && updatedFeedback.isCorrect ? `
            <p class="text-green-500 italic mt-2">${quiz.encouragement}</p>
          ` : ""}
          ${updatedFeedback.solution && !updatedFeedback.isCorrect ? `
            <div class="mt-2 p-2 bg-gray-50 rounded">
              <h4 class="font-semibold">Solution</h4>
              ${updatedFeedback.solution.map((step) => `
                <div class="mt-1">
                  <h5 class="font-medium">${step.title}</h5>
                  ${step.content}
                </div>
              `).join("")}
            </div>
          ` : ""}
        `;
        onQuizUpdate({ type: "result", content: resultContent });
        setStep("end");
      } else {
        console.error("No feedback received after validation");
        setError("Failed to validate quiz answer. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting quiz answer:", err);
      setError(err.message || "Failed to submit quiz answer. Please try again.");
    }
  };

  if (step !== "quizzes" || !quiz) return null;

  return (
    <div className="mb-4">
      {useAppStore.getState().loading && (
        <div className="text-blue-500">Loading... Please wait.</div>
      )}
      {useAppStore.getState().error && (
        <div className="text-red-500">{useAppStore.getState().error}</div>
      )}
      {quiz.answerFormat === "multiple-choice" && quiz.options && (
        <div>
          {quiz.options.map((option, index) => (
            <div key={index} className="my-2">
              <input
                type="radio"
                id={`option-${index}`}
                name="quiz-answer"
                value={option}
                checked={answer === option}
                onChange={(e) => setAnswer(e.target.value)}
                className="mr-2"
                disabled={useAppStore.getState().loading}
              />
              <label
                htmlFor={`option-${index}`}
                className={answer === option ? "text-blue-500 font-bold" : ""}
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={handleSubmitAnswer}
        disabled={!answer || useAppStore.getState().loading}
        className="mt-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        Submit Answer
      </button>
    </div>
  );
}